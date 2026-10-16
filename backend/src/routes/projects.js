const router = require('express').Router();
const { ProjectSite, Task, Milestone, ProjectPhoto, ClientUpdate, StockEntry, DailyReport, WeeklyReport } = require('../models');
const { can, scoped, assertProject, redact } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');
const { withPct, summarize, recomputeProgress } = require('../services/progress');
const { stockSummary } = require('../services/stock');
const { createPhoto } = require('../services/records');

const BASIC = ['siteName', 'locationCity', 'description', 'currentPhase', 'startDate', 'endDate', 'status', 'plannedWorkers', 'client'];
const FIN = ['budgetXAF', 'spentXAF'];
const TASK = ['name', 'category', 'phase', 'subcontractor', 'unit', 'totalQty', 'cumulativeQty', 'weeklyQty', 'weight', 'milestoneId', 'weeklyTargetPct', 'reportedPct', 'delayReason', 'observation', 'clientVisible'];
const PORTAL = ['progress', 'timeline', 'photos', 'videos', 'reports', 'statistics'];
const MILE = ['name', 'description', 'plannedStart', 'plannedDate', 'actualStart', 'actualEnd', 'status', 'order', 'clientVisible'];
const pick = (b, keys) => Object.fromEntries(keys.filter((k) => b[k] !== undefined).map((k) => [k, b[k] === '' ? null : b[k]]));
const view = can('VIEW_PROGRESS', 'VIEW_DASHBOARD');

router.get('/', view, wrap(async (req, res) => {
  const sites = await ProjectSite.find({ tenantId: req.user.tenantId, ...scoped(req, '_id') }).sort({ startDate: 1 }).populate(own(req, 'client', 'name')).lean();
  res.json(sites.map((s) => redact(req, s)));
}));

router.post('/', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  const data = { ...pick(req.body, BASIC), ...(req.has('MANAGE_PROJECT_FINANCIALS') ? { ...pick(req.body, FIN), financialsUpdatedBy: req.user.id, financialsUpdatedAt: new Date() } : {}) };
  res.status(201).json(redact(req, await ProjectSite.create({ ...data, tenantId: req.user.tenantId })));
}));

router.get('/:id', view, wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id); const t = req.user.tenantId;
  const project = await ProjectSite.findOne({ _id: id, tenantId: t }).populate(own(req, 'client', 'name country')).populate(own(req, 'financialsUpdatedBy', 'name'));
  if (!project) throw httpError(404, 'Project not found');
  const [tasks, milestones, photos, updates] = await Promise.all([
    Task.find({ tenantId: t, siteId: id }).sort({ category: 1, createdAt: 1 }).lean(),
    Milestone.find({ tenantId: t, siteId: id }).sort({ order: 1, plannedDate: 1 }).lean(),
    ProjectPhoto.find({ tenantId: t, siteId: id }).sort({ takenAt: -1 }).limit(12).populate(own(req, 'uploadedBy')).lean(),
    ClientUpdate.find({ tenantId: t, siteId: id }).sort({ createdAt: -1 }).limit(5).populate(own(req, 'publishedBy')).lean(),
  ]);
  const s = summarize(tasks);
  res.json({
    project: redact(req, project), tasks: tasks.map(withPct), categories: s.categories, photos, updates, milestones,
    stats: { ...s.stats, milestonesDone: milestones.filter((m) => m.status === 'Completed').length, milestonesTotal: milestones.length },
  });
}));

router.patch('/:id', can('MANAGE_PROJECTS', 'MANAGE_PROJECT_FINANCIALS', 'MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  const set = req.has('MANAGE_PROJECTS') ? pick(req.body, BASIC) : {};
  if (req.body.portal) {
    if (!req.has('MANAGE_CLIENT_PORTAL')) throw httpError(403, 'Only the Director controls what the client sees');
    PORTAL.forEach((k) => { if (typeof req.body.portal[k] === 'boolean') set[`portal.${k}`] = req.body.portal[k]; });
  }
  if (!req.has('MANAGE_PROJECTS') && Object.keys(pick(req.body, BASIC)).length) throw httpError(403, 'You do not have permission to change project records');
  if (FIN.some((k) => req.body[k] !== undefined)) {
    if (!req.has('MANAGE_PROJECT_FINANCIALS')) throw httpError(403, 'You do not have permission to change financial data');
    const cur = await ProjectSite.findOne({ _id: id, tenantId: req.user.tenantId }).select('spentSource');
    if (req.body.spentXAF !== undefined && cur?.spentSource === 'expenses') throw httpError(409, 'Spent is calculated from the expense records. Add or correct an expense instead.');
    Object.assign(set, pick(req.body, FIN), { financialsUpdatedBy: req.user.id, financialsUpdatedAt: new Date() });
  }
  const p = await ProjectSite.findOneAndUpdate({ _id: id, tenantId: req.user.tenantId }, set, { new: true, runValidators: true });
  if (!p) throw httpError(404, 'Project not found');
  res.json(redact(req, p));
}));

// Tasks
router.post('/:id/tasks', can('MANAGE_TASKS'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  const task = await Task.create({ ...pick(req.body, TASK), tenantId: req.user.tenantId, siteId: id });
  await recomputeProgress(req.user.tenantId, id);
  res.status(201).json(withPct(task));
}));
router.patch('/:id/tasks/:tid', can('MANAGE_TASKS', 'MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const { id, tid } = req.params; assertProject(req, id);
  const set = pick(req.body, req.has('MANAGE_TASKS') ? TASK : ['clientVisible']);
  if ('reportedPct' in set) { if (set.reportedPct !== null && !(Number(set.reportedPct) >= 0 && Number(set.reportedPct) <= 100)) throw httpError(400, 'A percentage must be between 0 and 100'); Object.assign(set, { reportedBy: req.user.id, reportedAt: new Date() }); }
  const task = await Task.findOneAndUpdate({ _id: tid, tenantId: req.user.tenantId, siteId: id }, set, { new: true, runValidators: true });
  if (!task) throw httpError(404, 'Task not found');
  await recomputeProgress(req.user.tenantId, id);
  res.json(withPct(task));
}));
router.delete('/:id/tasks/:tid', can('MANAGE_TASKS'), wrap(async (req, res) => {
  const { id, tid } = req.params; assertProject(req, id);
  await Task.deleteOne({ _id: tid, tenantId: req.user.tenantId, siteId: id });
  await recomputeProgress(req.user.tenantId, id);
  res.json({ ok: true });
}));

// Milestones (the timeline)
router.post('/:id/milestones', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  res.status(201).json(await Milestone.create({ ...pick(req.body, MILE), tenantId: req.user.tenantId, siteId: id }));
}));
router.patch('/:id/milestones/:mid', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  const { id, mid } = req.params; assertProject(req, id);
  const set = pick(req.body, MILE), cur = await Milestone.findOne({ _id: mid, tenantId: req.user.tenantId, siteId: id });
  if (!cur) throw httpError(404, 'Milestone not found');
  // Actual dates follow the status unless someone types them in.
  if (set.status && set.status !== cur.status) {
    if (set.status === 'InProgress' && !cur.actualStart && !('actualStart' in set)) set.actualStart = new Date();
    if (set.status === 'Completed') { if (!cur.actualEnd && !('actualEnd' in set)) set.actualEnd = new Date(); if (!cur.actualStart && !('actualStart' in set)) set.actualStart = new Date(); }
    if (set.status !== 'Completed' && !('actualEnd' in set)) set.actualEnd = null;
  }
  const m = await Milestone.findOneAndUpdate({ _id: mid, tenantId: req.user.tenantId, siteId: id }, set, { new: true, runValidators: true });
  if (!m) throw httpError(404, 'Milestone not found');
  res.json(m);
}));
// Everything the system knows about one construction stage, gathered from the tasks linked to it. Nothing is copied: media and reports stay where they were recorded.
router.get('/:id/milestones/:mid/detail', view, wrap(async (req, res) => {
  const { id, mid } = req.params, t = req.user.tenantId; assertProject(req, id);
  const stage = await Milestone.findOne({ _id: mid, tenantId: t, siteId: id }).lean();
  if (!stage) throw httpError(404, 'Stage not found');
  const tasks = await Task.find({ tenantId: t, siteId: id, milestoneId: mid }).sort({ category: 1, createdAt: 1 }).lean();
  const ids = tasks.map((x) => x._id), idStr = new Set(ids.map(String));
  const s = summarize(tasks);
  const [reports, photos, weekly] = await Promise.all([
    ids.length ? DailyReport.find({ tenantId: t, siteId: id, 'workPerformed.taskId': { $in: ids } }).sort({ date: -1 }).limit(60).populate(own(req, 'submittedBy')).lean() : [],
    ids.length ? ProjectPhoto.find({ tenantId: t, siteId: id, taskId: { $in: ids } }).sort({ takenAt: -1 }).limit(60).lean() : [],
    ids.length ? WeeklyReport.find({ tenantId: t, siteId: id, 'rows.taskId': { $in: ids } }).sort({ weekStart: -1 }).limit(20).lean() : [],
  ]);
  const used = {}, difficulties = [], seen = new Set(), media = [];
  const dReports = reports.map((r) => {
    (r.materialsUsed || []).forEach((m) => { used[m.materialType] = (used[m.materialType] || 0) + m.quantity; });
    (r.difficulties || []).forEach((d) => difficulties.push({ date: r.date, issue: d.issue, solution: d.solution }));
    (r.media || []).forEach((m) => { if (!seen.has(String(m._id))) { seen.add(String(m._id)); media.push({ _id: m._id, url: m.url, kind: m.kind, caption: m.caption, date: r.date }); } });
    return { _id: r._id, date: r.date, submittedBy: r.submittedBy, work: (r.workPerformed || []).filter((w) => w.taskId && idStr.has(String(w.taskId))) };
  });
  photos.forEach((p) => { if (!seen.has(String(p._id))) { seen.add(String(p._id)); media.push({ _id: p._id, url: p.url, kind: 'photo', caption: p.caption, date: p.takenAt }); } });
  const now = new Date(), late = stage.plannedDate && new Date(stage.plannedDate) < now && stage.status !== 'Completed';
  res.json({
    stage: { ...stage, plannedEnd: stage.plannedDate },
    completionPct: tasks.length ? s.overall : null, stats: s.stats,
    tasks: tasks.map((x) => ({ ...withPct(x), status: pctOfStatus(x) })),
    planned: { totalQty: tasks.length, note: 'Quantities are per task; units differ, so they are not added together.' },
    reports: dReports, weeklyReports: weekly.map((w) => ({ _id: w._id, weekStart: w.weekStart, status: w.status, rows: w.rows.filter((r) => idStr.has(String(r.taskId))) })),
    media, materialsUsed: Object.entries(used).map(([materialType, quantity]) => ({ materialType, quantity })), difficulties,
    delays: { stageLate: !!late, tasksBehindTarget: tasks.filter((x) => x.weeklyTargetPct != null && withPct(x).progressPct < x.weeklyTargetPct).map((x) => ({ name: x.name, progressPct: withPct(x).progressPct, target: x.weeklyTargetPct, reason: x.delayReason })) },
    outstanding: tasks.filter((x) => withPct(x).progressPct < 100).map((x) => ({ name: x.name, unit: x.unit, remaining: Math.max(0, x.totalQty - x.cumulativeQty), progressPct: withPct(x).progressPct })),
  });
}));
const pctOfStatus = (t) => { const p = withPct(t).progressPct; return p >= 100 ? 'Completed' : p > 0 ? 'InProgress' : 'NotStarted'; };

router.delete('/:id/milestones/:mid', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  const { id, mid } = req.params; assertProject(req, id);
  await Milestone.deleteOne({ _id: mid, tenantId: req.user.tenantId, siteId: id });
  res.json({ ok: true });
}));

// Photos: uploaded by the team, shown to the client only after someone approves them
router.get('/:id/photos', view, wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  res.json(await ProjectPhoto.find({ tenantId: req.user.tenantId, siteId: id }).sort({ takenAt: -1 }).limit(120).populate(own(req, 'uploadedBy')).populate(own(req, 'taskId', 'name')).lean());
}));
router.post('/:id/photos', can('UPLOAD_EVIDENCE'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  res.status(201).json(await createPhoto({ tenantId: req.user.tenantId, userId: req.user.id, siteId: id, data: req.body }));
}));
router.patch('/:id/photos/:pid', can('MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const { id, pid } = req.params; assertProject(req, id);
  const p = await ProjectPhoto.findOneAndUpdate({ _id: pid, tenantId: req.user.tenantId, siteId: id }, pick(req.body, ['clientVisible', 'caption']), { new: true });
  if (!p) throw httpError(404, 'Photo not found');
  res.json(p);
}));

// Messages shown on the client's portal
router.post('/:id/updates', can('MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  if (!req.body.message || !String(req.body.message).trim()) throw httpError(400, 'Write a message first');
  res.status(201).json(await ClientUpdate.create({ tenantId: req.user.tenantId, siteId: id, message: String(req.body.message).trim(), publishedBy: req.user.id }));
}));

// Stock: opening + incoming - outgoing = closing
router.get('/:id/stock', can('VIEW_STOCK'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  res.json({ summary: await stockSummary(req.user.tenantId, id), recent: await StockEntry.find({ tenantId: req.user.tenantId, siteId: id }).sort({ date: -1, createdAt: -1 }).limit(30).lean() });
}));
router.post('/:id/stock', can('MANAGE_DELIVERIES', 'MANAGE_PROJECTS'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  const { materialType, kind, quantity, party } = req.body;
  if (!materialType || !['opening', 'in', 'out'].includes(kind) || !(Number(quantity) >= 0)) throw httpError(400, 'materialType, kind and quantity are required');
  res.status(201).json(await StockEntry.create({ tenantId: req.user.tenantId, siteId: id, materialType, kind, quantity: Number(quantity), party, source: 'manual' }));
}));
module.exports = router;
