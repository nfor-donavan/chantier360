const router = require('express').Router();
const { ProjectSite, Task, Milestone, ProjectPhoto, ClientUpdate, StockEntry } = require('../models');
const { can, scoped, assertProject, redact } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');
const { withPct, summarize, recomputeProgress } = require('../services/progress');
const { stockSummary } = require('../services/stock');
const { createPhoto } = require('../services/records');

const BASIC = ['siteName', 'locationCity', 'description', 'currentPhase', 'startDate', 'endDate', 'status', 'plannedWorkers', 'client'];
const FIN = ['budgetXAF', 'spentXAF'];
const TASK = ['name', 'category', 'phase', 'subcontractor', 'unit', 'totalQty', 'cumulativeQty', 'weeklyQty', 'weight', 'weeklyTargetPct', 'delayReason', 'observation', 'clientVisible'];
const MILE = ['name', 'plannedDate', 'status', 'order', 'clientVisible'];
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

router.patch('/:id', can('MANAGE_PROJECTS', 'MANAGE_PROJECT_FINANCIALS'), wrap(async (req, res) => {
  const { id } = req.params; assertProject(req, id);
  const set = req.has('MANAGE_PROJECTS') ? pick(req.body, BASIC) : {};
  if (FIN.some((k) => req.body[k] !== undefined)) {
    if (!req.has('MANAGE_PROJECT_FINANCIALS')) throw httpError(403, 'You do not have permission to change financial data');
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
  const task = await Task.findOneAndUpdate({ _id: tid, tenantId: req.user.tenantId, siteId: id }, pick(req.body, req.has('MANAGE_TASKS') ? TASK : ['clientVisible']), { new: true, runValidators: true });
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
  const m = await Milestone.findOneAndUpdate({ _id: mid, tenantId: req.user.tenantId, siteId: id }, pick(req.body, MILE), { new: true, runValidators: true });
  if (!m) throw httpError(404, 'Milestone not found');
  res.json(m);
}));
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
