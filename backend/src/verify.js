// Consistency check: confirms that the figures on dashboards agree with the saved records.
// Run it after changes (`npm run verify`). Exits with an error if any check fails.
const mongoose = require('mongoose');
const { connect } = require('./db');
const M = require('./models');
const { summarize } = require('./services/progress');

(async () => {
  await connect();
  let failures = 0;
  const check = (ok, label, detail = '') => { if (!ok) failures++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  ' + detail}`); };
  for (const t of await M.Tenant.find({})) {
    const tenantId = t._id; console.log(`\n== ${t.companyName}`);
    const sites = await M.ProjectSite.find({ tenantId }).lean();
    for (const s of sites) {
      const tasks = await M.Task.find({ tenantId, siteId: s._id }).lean();
      if (tasks.length) { const o = summarize(tasks).overall; check(Math.abs(o - s.progressPct) <= 0.15, `${s.siteName}: project progress equals the task average`, `stored ${s.progressPct}, tasks give ${o}`); }
      const ex = await M.Expense.find({ tenantId, siteId: s._id }).lean();
      if (ex.length) { const sum = ex.reduce((a, e) => a + e.amountXAF, 0); check(s.spentXAF === sum && s.spentSource === 'expenses', `${s.siteName}: spent equals the sum of expenses`, `stored ${s.spentXAF}, expenses ${sum}`); }
    }
    const logs = await M.MaterialLog.find({ tenantId }).lean(), entries = await M.StockEntry.find({ tenantId, source: 'delivery' }).lean();
    const byRef = {}; entries.forEach((e) => { (byRef[e.refId] ||= []).push(e); });
    const bad = logs.filter((l) => (byRef[String(l._id)] || []).length !== 1 || byRef[String(l._id)][0].quantity !== l.quantityReceived);
    check(bad.length === 0, 'every delivery has exactly one matching stock entry', `${bad.length} mismatched`);
    check(entries.every((e) => logs.some((l) => String(l._id) === e.refId)), 'no stock entry points at a deleted delivery');
    const moves = await M.MaterialMovement.find({ tenantId }).lean(), tEntries = await M.StockEntry.find({ tenantId, source: 'transfer' }).lean();
    check(moves.every((mv) => { const e = tEntries.filter((x) => x.refId === String(mv._id)); return e.length === 2 && e.filter((x) => x.kind === 'out').length === 1 && e.every((x) => x.quantity === mv.quantity); }), 'every transfer has exactly one exit and one entry of the same quantity');
    check(tEntries.every((e) => moves.some((mv) => String(mv._id) === e.refId)), 'no transfer entry without its movement');
    const locs = await M.StorageLocation.find({ tenantId }).lean(); let negative = 0;
    for (const l of locs) { const by = {}; (await M.StockEntry.find({ tenantId, locationId: l._id }).lean()).forEach((r) => { by[r.materialType] = (by[r.materialType] || 0) + (r.kind === 'out' ? -r.quantity : r.quantity); }); negative += Object.values(by).filter((v) => v < 0).length; }
    check(negative === 0, 'no location has negative stock', `${negative} negative balances`);
    const pos = await M.PurchaseOrder.find({ tenantId }).lean();
    check(pos.every((p) => (p.status === 'Received') === logs.some((l) => String(l.orderId) === String(p._id))), 'purchase order status matches its deliveries');
    check(logs.every((l) => l.shortfall === Math.max(0, l.quantityOrdered - l.quantityReceived) && l.flagged === (l.quantityReceived < l.quantityOrdered)), 'shortfall and flags match quantities');
    const att = await M.AttendanceLog.find({ tenantId, status: { $ne: 'Rejected' } }).lean(), seen = {}; let dup = 0, badSum = 0, orphan = 0;
    const uids = new Set((await M.Worker.find({ tenantId }).lean()).map((w) => w.uid));
    for (const a of att) {
      if (a.workers?.length) { if (a.workers.length !== a.totalWorkersPresent) badSum++; for (const w of a.workers) { const k = `${a.siteId}|${a.date.toISOString().slice(0, 10)}|${w.uid}`; if (seen[k]) dup++; seen[k] = 1; if (!uids.has(w.uid)) orphan++; } }
    }
    check(dup === 0, 'no worker is recorded present twice on the same day', `${dup} duplicates`);
    check(badSum === 0, 'attendance totals equal the number of named workers', `${badSum} logs`);
    check(orphan === 0, 'attendance only refers to registered workers', `${orphan}`);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
  await mongoose.disconnect(); process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
