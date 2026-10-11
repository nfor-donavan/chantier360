const { Task, DailyReport, AttendanceLog, MaterialLog, StockEntry } = require('../models');
const { pctOf, calcPct, round1 } = require('./progress');

const monday = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() - (day - 1)); return x; };
const range = (d) => { const a = monday(d); return [a, new Date(+a + 7 * 864e5)]; };

// The weekly report is assembled from live data (tasks and the week's daily reports). Manual fields entered earlier are kept.
async function buildWeek(tenantId, siteId, anyDateInWeek, existing = null) {
  const [a, b] = range(anyDateInWeek);
  const [tasks, reports, att, deliveries, moves] = await Promise.all([
    Task.find({ tenantId, siteId }).sort({ category: 1, createdAt: 1 }).lean(),
    DailyReport.find({ tenantId, siteId, date: { $gte: a, $lt: b } }).sort({ date: 1 }).lean(),
    AttendanceLog.find({ tenantId, siteId, date: { $gte: a, $lt: b }, status: { $ne: 'Rejected' } }).lean(),
    MaterialLog.find({ tenantId, siteId, deliveryDate: { $gte: a, $lt: b } }).lean(),
    StockEntry.find({ tenantId, siteId, date: { $gte: a, $lt: b } }).lean(),
  ]);
  const done = {};
  reports.forEach((r) => (r.workPerformed || []).forEach((w) => { if (w.taskId) done[String(w.taskId)] = (done[String(w.taskId)] || 0) + (w.quantity || 0); }));
  const prev = Object.fromEntries((existing?.rows || []).map((r) => [String(r.taskId), r]));
  const rows = tasks.map((t) => {
    const p = prev[String(t._id)];
    return {
      taskId: t._id, subcontractor: t.subcontractor, phase: t.phase, category: t.category, name: t.name, unit: t.unit, totalQty: t.totalQty, cumulativeQty: t.cumulativeQty,
      weeklyQty: round1(done[String(t._id)] || 0), progressPct: round1(pctOf(t)), calculatedPct: round1(calcPct(t)), reportedPct: t.reportedPct ?? undefined,
      plannedPct: p?.plannedPct ?? t.weeklyTargetPct, delayReason: p?.delayReason ?? t.delayReason, observation: p?.observation ?? t.observation,
    };
  });
  const perDay = {}; att.forEach((x) => { const k = x.date.toISOString().slice(0, 10); perDay[k] = (perDay[k] || 0) + x.totalWorkersPresent; });
  const days = Object.values(perDay);
  const stock = {}; moves.forEach((m) => { const s = (stock[m.materialType] ||= { materialType: m.materialType, in: 0, out: 0, opening: 0 }); if (m.kind === 'in') s.in += m.quantity; else if (m.kind === 'out') s.out += m.quantity; else s.opening += m.quantity; });
  const summary = {
    reportsCount: reports.length, daysReported: reports.map((r) => r.date),
    workforce: { daysRecorded: days.length, averagePerDay: days.length ? round1(days.reduce((x, y) => x + y, 0) / days.length) : 0, peak: days.length ? Math.max(...days) : 0 },
    deliveries: { count: deliveries.length, flagged: deliveries.filter((d) => d.flagged).length, items: deliveries.map((d) => ({ material: d.materialType, supplier: d.supplierName, ordered: d.quantityOrdered, received: d.quantityReceived, unit: d.unit })) },
    stockMovements: Object.values(stock),
    difficulties: reports.flatMap((r) => (r.difficulties || []).map((d) => ({ date: r.date, issue: d.issue, solution: d.solution }))),
    mediaCount: reports.reduce((n, r) => n + (r.media || []).length, 0),
  };
  return { weekStart: a, weekEnd: new Date(+b - 864e5), rows, summary };
}
module.exports = { buildWeek, monday };
