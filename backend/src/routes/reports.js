const router = require('express').Router();
const { DailyReport, WeeklyReport, ProjectSite } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createReport } = require('../services/records');
const { buildWeek, ensureWeek, monday } = require('../services/weekly');
const { audit } = require('../services/audit');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

const dateFilter = (q, field) => (q.from || q.to ? { [field]: { ...(q.from && { $gte: new Date(q.from) }), ...(q.to && { $lte: new Date(new Date(q.to).getTime() + 864e5 - 1) }) } } : {});
const redactCash = (req, r) => { if (!req.has('VIEW_PROJECT_FINANCIALS')) delete r.siteCash; return r; };

// ---------- Daily reports ----------
async function listDaily(req, res) {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const filter = { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }), ...dateFilter(req.query, 'date') };
  const list = await DailyReport.find(filter).sort({ date: -1 }).limit(200).populate(own(req, 'submittedBy')).populate(own(req, 'siteId', 'siteName locationCity')).lean();
  res.json(list.map((r) => redactCash(req, r)));
}
router.get('/daily', can('VIEW_REPORTS'), wrap(listDaily));
router.get('/', can('VIEW_REPORTS'), wrap(listDaily)); // older path
router.get('/daily/:id', can('VIEW_REPORTS'), wrap(async (req, res) => {
  const r = await DailyReport.findOne({ _id: req.params.id, tenantId: req.user.tenantId, ...scoped(req) }).populate(own(req, 'submittedBy')).populate(own(req, 'siteId', 'siteName locationCity')).populate(own(req, 'media.uploadedBy')).lean();
  if (!r) throw httpError(404, 'Report not found');
  res.json(redactCash(req, r));
}));
const submit = wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  res.status(201).json(await createReport({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: req.body }));
});
router.post('/daily', can('SUBMIT_REPORTS'), submit);
router.post('/', can('SUBMIT_REPORTS'), submit);

const daily = async (req) => { const r = await DailyReport.findOne({ _id: req.params.id, tenantId: req.user.tenantId }); if (!r) throw httpError(404, 'Report not found'); assertProject(req, r.siteId); return r; };
const KINDS = ['photo', 'video'];
router.post('/daily/:id/media', can('UPLOAD_EVIDENCE'), wrap(async (req, res) => {
  const r = await daily(req);
  const { url, kind, mime, size, caption } = req.body;
  if (!url || !KINDS.includes(kind)) throw httpError(400, 'A file and its type (photo or video) are required');
  r.media.push({ url, kind, mime, size, caption, uploadedBy: req.user.id, clientVisible: false });
  await r.save();
  res.status(201).json(r.media[r.media.length - 1]);
}));
router.patch('/daily/:id/media/:mid', can('UPLOAD_EVIDENCE', 'MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const r = await daily(req), m = r.media.id(req.params.mid);
  if (!m) throw httpError(404, 'File not found');
  if (req.body.clientVisible !== undefined) { if (!req.has('MANAGE_CLIENT_PORTAL')) throw httpError(403, 'Only the Director controls what the client sees'); m.clientVisible = !!req.body.clientVisible; }
  if (req.body.caption !== undefined) m.caption = req.body.caption;
  await r.save();
  res.json(m);
}));
router.delete('/daily/:id/media/:mid', can('UPLOAD_EVIDENCE', 'MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const r = await daily(req), m = r.media.id(req.params.mid);
  if (!m) throw httpError(404, 'File not found');
  if (String(m.uploadedBy) !== req.user.id && !req.has('MANAGE_CLIENT_PORTAL')) throw httpError(403, 'You can only remove files you added');
  await audit(req.user.tenantId, req.user.id, 'ReportMedia', m._id, 'delete', r.siteId, m.toObject());
  m.deleteOne(); await r.save();
  res.json({ ok: true });
}));
router.patch('/daily/:id', can('MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const r = await daily(req);
  r.clientVisible = !!req.body.clientVisible; await r.save();
  res.json({ _id: r._id, clientVisible: r.clientVisible });
}));

// ---------- Weekly reports ----------
const summarize = (w) => ({ _id: w._id, siteId: w.siteId, weekStart: w.weekStart, weekEnd: w.weekEnd, status: w.status, submitted: !!w.submittedAt, clientVisible: w.clientVisible, tasks: w.rows.length,
  avgProgress: w.rows.length ? Math.round((w.rows.reduce((a, r) => a + (r.progressPct || 0), 0) / w.rows.length) * 10) / 10 : 0, reportsCount: w.summary?.reportsCount || 0 });
router.get('/weekly', can('VIEW_REPORTS'), wrap(async (req, res) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const filter = { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }), ...dateFilter(req.query, 'weekStart') };
  const list = await WeeklyReport.find(filter).sort({ weekStart: -1 }).limit(100).populate(own(req, 'siteId', 'siteName locationCity')).lean();
  res.json(list.map(summarize));
}));
// The foreman's own weekly report: created automatically from the week's daily reports, refreshed each time he opens it.
router.get('/weekly/current', can('SUBMIT_WEEKLY_REPORTS', 'MANAGE_WEEKLY_REPORTS'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.query.siteId);
  res.json(await ensureWeek(req.user.tenantId, siteId, new Date(), req.user.id));
}));
router.get('/weekly/:id', can('VIEW_REPORTS', 'SUBMIT_WEEKLY_REPORTS'), wrap(async (req, res) => {
  const w = await WeeklyReport.findOne({ _id: req.params.id, tenantId: req.user.tenantId, ...scoped(req) }).populate(own(req, 'siteId', 'siteName locationCity')).populate(own(req, 'lockedBy')).populate(own(req, 'submittedBy')).lean();
  if (!w) throw httpError(404, 'Report not found');
  res.json(w);
}));
router.post('/weekly/generate', can('MANAGE_WEEKLY_REPORTS'), wrap(async (req, res) => {
  const siteId = assertProject(req, req.body.siteId);
  if (!(await ProjectSite.findOne({ _id: siteId, tenantId: req.user.tenantId }))) throw httpError(404, 'Project not found');
  const date = req.body.date ? new Date(req.body.date) : new Date();
  if (Number.isNaN(+date)) throw httpError(400, 'Invalid date');
  const weekStart = monday(date);
  const existing = await WeeklyReport.findOne({ tenantId: req.user.tenantId, siteId, weekStart });
  if (existing?.status === 'locked') throw httpError(409, 'This week is locked. Ask the Director to unlock it to refresh.');
  res.status(existing ? 200 : 201).json(await ensureWeek(req.user.tenantId, siteId, date, req.user.id));
}));
const weekly = async (req) => { const w = await WeeklyReport.findOne({ _id: req.params.id, tenantId: req.user.tenantId }); if (!w) throw httpError(404, 'Report not found'); assertProject(req, w.siteId); return w; };
router.patch('/weekly/:id', can('MANAGE_WEEKLY_REPORTS', 'SUBMIT_WEEKLY_REPORTS'), wrap(async (req, res) => {
  const w = await weekly(req);
  if (w.status === 'locked') throw httpError(409, 'This report is locked');
  if (!req.has('MANAGE_WEEKLY_REPORTS') && w.submittedAt) throw httpError(409, 'This report was already sent to the office');
  for (const r of req.body.rows || []) {
    const row = w.rows.find((x) => String(x.taskId) === String(r.taskId));
    if (!row) continue;
    if (r.plannedPct !== undefined) { const n = r.plannedPct === '' || r.plannedPct === null ? undefined : Number(r.plannedPct); if (n !== undefined && !(n >= 0 && n <= 100)) throw httpError(400, 'A percentage must be between 0 and 100'); row.plannedPct = n; }
    if (r.delayReason !== undefined) row.delayReason = r.delayReason;
    if (r.observation !== undefined) row.observation = r.observation;
  }
  if (req.body.objectives !== undefined) w.objectives = req.body.objectives;
  if (req.body.notes !== undefined) w.notes = req.body.notes;
  await w.save();
  res.json(w);
}));
router.post('/weekly/:id/submit', can('SUBMIT_WEEKLY_REPORTS'), wrap(async (req, res) => {
  const w = await weekly(req);
  if (w.status === 'locked') throw httpError(409, 'This report is locked');
  w.submittedBy = req.user.id; w.submittedAt = new Date(); await w.save();
  await audit(req.user.tenantId, req.user.id, 'WeeklyReport', w._id, 'submit', w.siteId, null);
  res.json(summarize(w));
}));
router.post('/weekly/:id/lock', can('MANAGE_WEEKLY_REPORTS'), wrap(async (req, res) => {
  const w = await weekly(req);
  w.status = 'locked'; w.lockedBy = req.user.id; w.lockedAt = new Date(); await w.save();
  await audit(req.user.tenantId, req.user.id, 'WeeklyReport', w._id, 'lock', w.siteId, null);
  res.json(summarize(w));
}));
router.post('/weekly/:id/unlock', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  const w = await weekly(req);
  w.status = 'draft'; w.clientVisible = false; w.submittedAt = undefined; w.submittedBy = undefined; await w.save();
  await audit(req.user.tenantId, req.user.id, 'WeeklyReport', w._id, 'unlock', w.siteId, null);
  res.json(summarize(w));
}));
router.patch('/weekly/:id/release', can('MANAGE_CLIENT_PORTAL'), wrap(async (req, res) => {
  const w = await weekly(req);
  if (req.body.clientVisible && w.status !== 'locked') throw httpError(409, 'Lock the report before releasing it to the client');
  w.clientVisible = !!req.body.clientVisible; await w.save();
  res.json(summarize(w));
}));
module.exports = router;
