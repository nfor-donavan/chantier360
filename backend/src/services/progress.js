const { Task, ProjectSite } = require('../models');

const pctOf = (t) => (t.totalQty > 0 ? Math.min(100, (t.cumulativeQty / t.totalQty) * 100) : 0);
const round1 = (n) => Math.round(n * 10) / 10;
const withPct = (t) => ({ ...(t.toObject ? t.toObject() : t), progressPct: round1(pctOf(t)) });

function weighted(list) {
  const w = list.reduce((a, t) => a + (t.weight ?? 1), 0);
  return w > 0 ? list.reduce((a, t) => a + pctOf(t) * (t.weight ?? 1), 0) / w : 0;
}
function summarize(tasks) {
  const cats = {};
  tasks.forEach((t) => { (cats[t.category || 'General'] ||= []).push(t); });
  return {
    overall: round1(weighted(tasks)),
    categories: Object.entries(cats).map(([category, list]) => ({ category, progressPct: round1(weighted(list)), tasks: list.length })),
    stats: {
      tasksTotal: tasks.length,
      completed: tasks.filter((t) => pctOf(t) >= 100).length,
      inProgress: tasks.filter((t) => pctOf(t) > 0 && pctOf(t) < 100).length,
      notStarted: tasks.filter((t) => pctOf(t) === 0).length,
    },
  };
}
// Overall project progress is always derived from the tasks, never typed in by hand.
async function recomputeProgress(tenantId, siteId) {
  const tasks = await Task.find({ tenantId, siteId }).lean();
  if (!tasks.length) return null;
  const s = summarize(tasks);
  await ProjectSite.updateOne({ _id: siteId, tenantId }, { progressPct: s.overall });
  return s.overall;
}
const weekKey = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day); const y = t.getUTCFullYear();
  return `${y}-W${String(Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7)).padStart(2, '0')}`;
};
module.exports = { pctOf, withPct, summarize, recomputeProgress, weekKey, round1 };
