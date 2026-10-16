// Monthly and annual report calculations. Pure functions over stored records, so every figure can be traced to its records
// and the whole thing can be tested without a database. Months are UTC calendar months.
const Y = (d) => new Date(d).getUTCFullYear();
const M = (d) => new Date(d).getUTCMonth() + 1;
const r1 = (n) => Math.round(n * 10) / 10;
const add = (o, k, v) => { o[k] = (o[k] || 0) + (v || 0); };
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

function lastWeekly(weekly, year, month) {
  const list = weekly.filter((w) => Y(w.weekStart) === year && M(w.weekStart) === month).sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
  return list[list.length - 1] || null;
}
function workforceOf(attendance) {
  const perDay = {}, cats = {};
  attendance.forEach((a) => { add(perDay, dayKey(a.date), a.totalWorkersPresent); (a.breakdown || []).forEach((b) => add(cats, b.category, b.count)); });
  const days = Object.values(perDay);
  return { daysRecorded: days.length, averagePerDay: days.length ? r1(days.reduce((x, y) => x + y, 0) / days.length) : null, peak: days.length ? Math.max(...days) : null, personDaysByCategory: Object.entries(cats).map(([category, count]) => ({ category, count })) };
}

function buildMonthly(data, year, month) {
  const { expenses = [], daily = [], attendance = [], deliveries = [], stock = [], weekly = [], tasks = [], sites = [], financial = false } = data;
  const inMonth = (d) => Y(d) === year && M(d) === month, inYtd = (d) => Y(d) === year && M(d) <= month;
  const siteName = Object.fromEntries(sites.map((s) => [String(s._id), s.siteName]));
  const out = { period: { year, month }, financial, limitations: [] };

  if (financial) {
    const cat = {}, proj = {}; let mt = 0, yt = 0, mc = 0, yc = 0;
    for (const e of expenses) {
      if (!inYtd(e.date)) continue;
      yt += e.amountXAF; yc++;
      const c = (cat[e.category] ||= { category: e.category, month: 0, ytd: 0 }), p = (proj[String(e.siteId)] ||= { siteId: String(e.siteId), siteName: siteName[String(e.siteId)], month: 0, ytd: 0 });
      c.ytd += e.amountXAF; p.ytd += e.amountXAF;
      if (inMonth(e.date)) { mt += e.amountXAF; mc++; c.month += e.amountXAF; p.month += e.amountXAF; }
    }
    out.expenses = { monthTotal: mt, ytdTotal: yt, monthCount: mc, ytdCount: yc, byCategory: Object.values(cat), byProject: Object.values(proj) };
    if (mc === 0) out.limitations.push('no_expense_records'); // no records is not the same as zero spent
  } else out.limitations.push('financial_hidden');

  const dm = daily.filter((r) => inMonth(r.date)), work = {};
  dm.forEach((r) => (r.workPerformed || []).forEach((w) => {
    const k = String(w.taskId || w.taskName), x = (work[k] ||= { taskId: w.taskId ? String(w.taskId) : null, name: w.taskName, unit: w.unit, quantity: 0, reports: 0 });
    x.quantity += w.quantity || 0; x.reports++;
  }));
  const now = Object.fromEntries(tasks.map((t) => [String(t._id), t]));
  out.work = { reportsCount: dm.length, tasks: Object.values(work).map((w) => ({ ...w, quantity: r1(w.quantity), progressNow: w.taskId && now[w.taskId] ? r1(now[w.taskId].progressPct ?? 0) : null })) };
  if (!dm.length) out.limitations.push('no_daily_reports');

  const wk = lastWeekly(weekly, year, month);
  out.progressAtMonthEnd = wk ? { source: 'weekly_report', weekStart: wk.weekStart, rows: wk.rows.map((r) => ({ name: r.name, unit: r.unit, progressPct: r.progressPct })) } : null;
  if (!wk) out.limitations.push('no_progress_snapshot'); // progress history is only stored in weekly reports

  out.workforce = workforceOf(attendance.filter((a) => inMonth(a.date)));
  if (!out.workforce.daysRecorded) out.limitations.push('no_attendance');

  const dl = deliveries.filter((d) => inMonth(d.deliveryDate)), mats = {}, sup = {};
  dl.forEach((d) => { const m = (mats[d.materialType] ||= { materialType: d.materialType, unit: d.unit, received: 0, deliveries: 0 }); m.received += d.quantityReceived || 0; m.deliveries++; add(sup, d.supplierName || '-', 1); });
  out.deliveries = { count: dl.length, flagged: dl.filter((d) => d.flagged).length, byMaterial: Object.values(mats), bySupplier: Object.entries(sup).map(([supplier, count]) => ({ supplier, count })) };

  const mv = {};
  stock.filter((s) => inMonth(s.date) && s.kind !== 'opening').forEach((s) => {
    const x = (mv[s.materialType] ||= { materialType: s.materialType, in: 0, out: 0, transferIn: 0, transferOut: 0 });
    const k = s.source === 'transfer' ? (s.kind === 'in' ? 'transferIn' : 'transferOut') : s.kind === 'in' ? 'in' : 'out';
    x[k] += s.quantity;
  });
  out.stockMovements = Object.values(mv);

  const used = {}; dm.forEach((r) => (r.materialsUsed || []).forEach((m) => add(used, m.materialType, m.quantity)));
  out.materialsUsed = Object.entries(used).map(([materialType, quantity]) => ({ materialType, quantity }));
  out.difficulties = dm.flatMap((r) => (r.difficulties || []).map((d) => ({ date: r.date, issue: d.issue, solution: d.solution })));
  return out;
}

function buildAnnual(data, year) {
  const { expenses = [], daily = [], attendance = [], deliveries = [], weekly = [], financial = false } = data;
  const months = []; let cumulative = 0, sumMonths = 0;
  for (let m = 1; m <= 12; m++) {
    const ex = expenses.filter((e) => Y(e.date) === year && M(e.date) === m), total = ex.reduce((a, e) => a + e.amountXAF, 0);
    cumulative += total; sumMonths += total;
    const dm = daily.filter((r) => Y(r.date) === year && M(r.date) === m), dl = deliveries.filter((d) => Y(d.deliveryDate) === year && M(d.deliveryDate) === m);
    const wf = workforceOf(attendance.filter((a) => Y(a.date) === year && M(a.date) === m)), wk = lastWeekly(weekly, year, m);
    months.push({
      month: m, expenseRecords: financial ? ex.length : null, expenses: financial ? (ex.length ? total : null) : null, // null = no records, not zero
      ytdExpenses: financial ? cumulative : null, dailyReports: dm.length, averageWorkforce: wf.averagePerDay, deliveries: dl.length, flaggedDeliveries: dl.filter((d) => d.flagged).length,
      progressAtMonthEnd: wk && wk.rows.length ? r1(wk.rows.reduce((a, r) => a + (r.progressPct || 0), 0) / wk.rows.length) : null,
    });
  }
  const independent = expenses.filter((e) => Y(e.date) === year).reduce((a, e) => a + e.amountXAF, 0);
  return { year, financial, months, totals: financial ? { expenses: sumMonths, independentCheck: independent, reconciled: Math.abs(sumMonths - independent) < 0.5, dailyReports: months.reduce((a, m) => a + m.dailyReports, 0), deliveries: months.reduce((a, m) => a + m.deliveries, 0) } : { dailyReports: months.reduce((a, m) => a + m.dailyReports, 0), deliveries: months.reduce((a, m) => a + m.deliveries, 0) } };
}
module.exports = { buildMonthly, buildAnnual };
