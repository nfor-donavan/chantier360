const router = require('express').Router();
const mongoose = require('mongoose');
const { ProjectSite, Alert, AttendanceLog, MaterialRequest, MaterialLog, DailyReport, ProjectPhoto } = require('../models');
const { can, scoped } = require('../middleware/auth');
const { wrap } = require('../utils/http');
const own = require('../utils/populate');

// One endpoint, shaped by what the caller is allowed to see. Sections they may not see are simply absent.
router.get('/', can('VIEW_DASHBOARD'), wrap(async (req, res) => {
  const t = req.user.tenantId, sc = scoped(req), now = new Date(), weekAgo = new Date(Date.now() - 7 * 864e5);
  const fin = req.has('VIEW_PROJECT_FINANCIALS');
  const sites = await ProjectSite.find({ tenantId: t, ...scoped(req, '_id') }).sort({ startDate: 1 }).lean();
  const siteName = Object.fromEntries(sites.map((s) => [String(s._id), s.siteName]));
  const expected = (s) => (s.endDate && s.startDate ? Math.min(100, Math.max(0, ((now - new Date(s.startDate)) / (new Date(s.endDate) - new Date(s.startDate))) * 100)) : null);

  const out = {
    projects: sites.map((s) => ({ id: s._id, siteName: s.siteName, locationCity: s.locationCity, status: s.status, progressPct: s.progressPct, currentPhase: s.currentPhase, startDate: s.startDate, endDate: s.endDate, ...(fin && { budgetXAF: s.budgetXAF, spentXAF: s.spentXAF }) })),
    counts: { total: sites.length, active: sites.filter((s) => s.status === 'Active').length, completed: sites.filter((s) => s.status === 'Completed').length },
    delayed: sites.filter((s) => s.status === 'Active' && expected(s) != null && s.progressPct < expected(s) - 15).map((s) => ({ id: s._id, siteName: s.siteName, progressPct: s.progressPct, expectedPct: Math.round(expected(s)) })),
    upcoming: sites.filter((s) => s.status !== 'Completed' && s.endDate && new Date(s.endDate) > now && new Date(s.endDate) - now < 60 * 864e5).map((s) => ({ id: s._id, siteName: s.siteName, endDate: s.endDate, progressPct: s.progressPct })),
  };
  if (fin) out.financials = { budgetXAF: sites.reduce((a, s) => a + (s.budgetXAF || 0), 0), spentXAF: sites.reduce((a, s) => a + (s.spentXAF || 0), 0) };

  if (req.has('VIEW_ALERTS')) {
    out.alerts = {
      open: await Alert.countDocuments({ tenantId: t, ...sc, acknowledged: false }),
      high: await Alert.countDocuments({ tenantId: t, ...sc, acknowledged: false, severity: 'High' }),
      top: await Alert.find({ tenantId: t, ...sc, acknowledged: false }).sort({ createdAt: -1 }).limit(4).populate(own(req, 'siteId', 'siteName')).lean(),
    };
  }
  out.pending = {
    attendance: req.has('APPROVE_ATTENDANCE') ? await AttendanceLog.countDocuments({ tenantId: t, ...sc, status: 'Pending_HQ_Approval' }) : 0,
    requests: req.has('APPROVE_REQUESTS') ? await MaterialRequest.countDocuments({ tenantId: t, ...sc, status: 'Pending' }) : 0,
  };
  if (req.has('VIEW_MATERIALS')) {
    const match = { tenantId: new mongoose.Types.ObjectId(t), createdAt: { $gte: new Date(Date.now() - 56 * 864e5) }, ...(req.allProjects ? {} : { siteId: { $in: req.user.projectIds.map((i) => new mongoose.Types.ObjectId(i)) } }) };
    const weekly = await MaterialLog.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%G-W%V', date: '$createdAt' } }, shortUnits: { $sum: '$shortfall' } } }, { $sort: { _id: 1 } }]);
    out.weeklyShortfall = weekly.map((w) => ({ week: w._id, shortUnits: w.shortUnits }));
    out.deliveries = {
      flaggedThisWeek: await MaterialLog.countDocuments({ tenantId: t, ...sc, flagged: true, createdAt: { $gte: weekAgo } }),
      thisWeek: await MaterialLog.countDocuments({ tenantId: t, ...sc, createdAt: { $gte: weekAgo } }),
      latest: (await MaterialLog.find({ tenantId: t, ...sc }).sort({ createdAt: -1 }).limit(6).lean()).map((l) => ({ ...l, siteName: siteName[String(l.siteId)] })),
    };
  }
  if (req.has('VIEW_ATTENDANCE')) {
    const logs = await AttendanceLog.find({ tenantId: t, ...sc, date: { $gte: new Date(Date.now() - 7 * 864e5) } }).sort({ date: -1 }).limit(80).lean();
    const latest = {}; logs.forEach((l) => { latest[String(l.siteId)] ||= l; });
    out.workforce = { latestTotal: Object.values(latest).reduce((a, l) => a + l.totalWorkersPresent, 0), sitesReporting: Object.keys(latest).length };
  }
  if (req.has('VIEW_REPORTS')) out.recentReports = await DailyReport.find({ tenantId: t, ...sc }).sort({ date: -1 }).limit(4).populate(own(req, 'submittedBy')).populate(own(req, 'siteId', 'siteName')).select('date siteId submittedBy difficulties').lean();
  if (req.has('VIEW_PROGRESS')) out.recentPhotos = (await ProjectPhoto.find({ tenantId: t, ...sc }).sort({ takenAt: -1 }).limit(6).lean()).map((p) => ({ ...p, siteName: siteName[String(p.siteId)] }));
  res.json(out);
}));
module.exports = router;
