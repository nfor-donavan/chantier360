const router = require('express').Router();
const { ProjectSite, Task, Milestone, ProjectPhoto, ClientUpdate, Client, DailyReport, WeeklyReport } = require('../models');
const { can } = require('../middleware/auth');
const { summarize, withPct } = require('../services/progress');
const { httpError, wrap } = require('../utils/http');

// The client portal is deny-by-default. Each section needs two things: the Director switched it on for this project,
// and the individual item was released. Anything not listed here (budgets, expenses, wages, workforce, stock,
// subcontractors, internal notes) is never returned, whatever is stored on the project.
router.use(can('VIEW_CLIENT_PORTAL'));
const ids = (req) => req.user.projectIds;

router.get('/projects', wrap(async (req, res) => {
  const list = await ProjectSite.find({ tenantId: req.user.tenantId, _id: { $in: ids(req) } }).select('siteName locationCity status currentPhase endDate progressPct portal').lean();
  res.json(list.map((p) => ({ _id: p._id, siteName: p.siteName, locationCity: p.locationCity, status: p.status,
    ...(p.portal?.progress && { progressPct: p.progressPct }), ...(p.portal?.timeline && { currentPhase: p.currentPhase, endDate: p.endDate }) })));
}));

router.get('/projects/:id', wrap(async (req, res) => {
  const { id } = req.params, t = req.user.tenantId;
  if (!ids(req).includes(String(id))) throw httpError(403, 'This project is not shared with you');
  const p = await ProjectSite.findOne({ _id: id, tenantId: t }).select('siteName locationCity description startDate endDate status currentPhase progressPct client portal').lean();
  if (!p) throw httpError(404, 'Project not found');
  const on = { progress: !!p.portal?.progress, timeline: !!p.portal?.timeline, photos: !!p.portal?.photos, videos: !!p.portal?.videos, reports: !!p.portal?.reports, statistics: !!p.portal?.statistics };
  const client = p.client ? await Client.findOne({ _id: p.client, tenantId: t }).select('name').lean() : null;
  const out = { project: { name: p.siteName, location: p.locationCity, description: p.description, status: p.status, client: client?.name }, sections: on };
  if (on.progress || on.statistics) {
    const tasks = await Task.find({ tenantId: t, siteId: id, clientVisible: true }).sort({ category: 1, createdAt: 1 }).lean();
    const s = summarize(tasks);
    if (on.progress) { out.project.progressPct = p.progressPct; out.categories = s.categories; out.tasks = tasks.map(withPct).map((x) => ({ name: x.name, category: x.category, unit: x.unit, progressPct: x.progressPct })); }
    if (on.statistics) { const ms = await Milestone.find({ tenantId: t, siteId: id, clientVisible: true }).lean(); out.stats = { ...s.stats, milestonesDone: ms.filter((m) => m.status === 'Completed').length, milestonesTotal: ms.length }; }
  }
  if (on.timeline) {
    Object.assign(out.project, { startDate: p.startDate, endDate: p.endDate, currentPhase: p.currentPhase });
    out.milestones = (await Milestone.find({ tenantId: t, siteId: id, clientVisible: true }).sort({ order: 1, plannedDate: 1 }).lean()).map((m) => ({ name: m.name, status: m.status, plannedDate: m.plannedDate }));
  }
  if (on.photos || on.videos) {
    const reports = await DailyReport.find({ tenantId: t, siteId: id, 'media.clientVisible': true }).select('date media').lean();
    const media = reports.flatMap((r) => r.media.filter((m) => m.clientVisible).map((m) => ({ url: m.url, kind: m.kind, caption: m.caption, takenAt: r.date })));
    const photos = on.photos ? [...(await ProjectPhoto.find({ tenantId: t, siteId: id, clientVisible: true }).lean()).map((x) => ({ url: x.url, kind: 'photo', caption: x.caption, takenAt: x.takenAt })), ...media.filter((m) => m.kind === 'photo')] : [];
    out.photos = photos.sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt)).slice(0, 80);
    if (on.videos) out.videos = media.filter((m) => m.kind === 'video').sort((a, b) => new Date(b.takenAt) - new Date(a.takenAt));
  }
  if (on.reports) {
    const [d, w] = await Promise.all([
      DailyReport.find({ tenantId: t, siteId: id, clientVisible: true }).sort({ date: -1 }).limit(30).lean(),
      WeeklyReport.find({ tenantId: t, siteId: id, clientVisible: true, status: 'locked' }).sort({ weekStart: -1 }).limit(12).lean(),
    ]);
    out.dailyReports = d.map((r) => ({ date: r.date, tomorrowPlan: r.tomorrowPlan, work: (r.workPerformed || []).map((x) => ({ name: x.taskName, quantity: x.quantity, unit: x.unit, progressPct: x.progressPct })),
      media: (r.media || []).filter((m) => m.clientVisible && ((m.kind === 'photo' && on.photos) || (m.kind === 'video' && on.videos))).map((m) => ({ url: m.url, kind: m.kind, caption: m.caption })) }));
    out.weeklyReports = w.map((r) => ({ weekStart: r.weekStart, weekEnd: r.weekEnd, rows: r.rows.map((x) => ({ name: x.name, unit: x.unit, totalQty: x.totalQty, cumulativeQty: x.cumulativeQty, weeklyQty: x.weeklyQty, progressPct: x.progressPct, plannedPct: x.plannedPct })) }));
  }
  out.updates = (await ClientUpdate.find({ tenantId: t, siteId: id }).sort({ createdAt: -1 }).limit(10).lean()).map((u) => ({ message: u.message, date: u.createdAt })); // published on purpose by the Director
  res.json(out);
}));
module.exports = router;
