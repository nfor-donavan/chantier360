const router = require('express').Router();
const { ProjectSite, Task, Milestone, ProjectPhoto, ClientUpdate, Client } = require('../models');
const { can } = require('../middleware/auth');
const { summarize, withPct } = require('../services/progress');
const { httpError, wrap } = require('../utils/http');

// The client portal returns an explicit whitelist of fields. Budgets, spending, wages, subcontractors,
// internal notes, reports and stock never appear here, whatever is stored on the project.
router.use(can('VIEW_CLIENT_PORTAL'));
const ids = (req) => req.user.projectIds;

router.get('/projects', wrap(async (req, res) => {
  const list = await ProjectSite.find({ tenantId: req.user.tenantId, _id: { $in: ids(req) } }).select('siteName locationCity startDate endDate status currentPhase progressPct').lean();
  res.json(list);
}));

router.get('/projects/:id', wrap(async (req, res) => {
  const { id } = req.params, t = req.user.tenantId;
  if (!ids(req).includes(String(id))) throw httpError(403, 'This project is not shared with you');
  const p = await ProjectSite.findOne({ _id: id, tenantId: t }).select('siteName locationCity description startDate endDate status currentPhase progressPct client').lean();
  if (!p) throw httpError(404, 'Project not found');
  const client = p.client ? await Client.findOne({ _id: p.client, tenantId: t }).select('name').lean() : null;
  const [tasks, milestones, photos, updates] = await Promise.all([
    Task.find({ tenantId: t, siteId: id, clientVisible: true }).sort({ category: 1, createdAt: 1 }).lean(),
    Milestone.find({ tenantId: t, siteId: id, clientVisible: true }).sort({ order: 1, plannedDate: 1 }).lean(),
    ProjectPhoto.find({ tenantId: t, siteId: id, clientVisible: true }).sort({ takenAt: -1 }).limit(60).lean(),
    ClientUpdate.find({ tenantId: t, siteId: id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  const s = summarize(tasks);
  res.json({
    project: { name: p.siteName, location: p.locationCity, description: p.description, startDate: p.startDate, endDate: p.endDate, status: p.status, currentPhase: p.currentPhase, progressPct: p.progressPct, client: client?.name },
    categories: s.categories,
    tasks: tasks.map(withPct).map((x) => ({ name: x.name, category: x.category, unit: x.unit, progressPct: x.progressPct })),
    milestones: milestones.map((m) => ({ name: m.name, status: m.status, plannedDate: m.plannedDate })),
    photos: photos.map((x) => ({ url: x.url, caption: x.caption, takenAt: x.takenAt })),
    updates: updates.map((u) => ({ message: u.message, date: u.createdAt })),
    stats: { ...s.stats, milestonesDone: milestones.filter((m) => m.status === 'Completed').length, milestonesTotal: milestones.length },
  });
}));
module.exports = router;
