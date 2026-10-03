const router = require('express').Router();
const mongoose = require('mongoose');
const { ProjectSite, Alert, AttendanceLog, MaterialRequest, MaterialLog } = require('../models');
const { requireHQ } = require('../middleware/auth');
const { wrap } = require('../utils/http');

router.get('/', requireHQ, wrap(async (req, res) => {
  const tenantId = req.user.tenantId;
  const since = new Date(Date.now() - 7 * 864e5);
  const [sites, openAlerts, highAlerts, pendingAttendance, pendingRequests, flaggedThisWeek] = await Promise.all([
    ProjectSite.find({ tenantId }),
    Alert.countDocuments({ tenantId, acknowledged: false }),
    Alert.countDocuments({ tenantId, acknowledged: false, severity: 'High' }),
    AttendanceLog.countDocuments({ tenantId, status: 'Pending_HQ_Approval' }),
    MaterialRequest.countDocuments({ tenantId, status: 'Pending' }),
    MaterialLog.countDocuments({ tenantId, flagged: true, createdAt: { $gte: since } }),
  ]);
  const weekly = await MaterialLog.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), createdAt: { $gte: new Date(Date.now() - 56 * 864e5) } } },
    { $group: { _id: { $dateToString: { format: '%G-W%V', date: '$createdAt' } }, shortUnits: { $sum: '$shortfall' }, flaggedCount: { $sum: { $cond: ['$flagged', 1, 0] } } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({
    weeklyShortfall: weekly.map((w) => ({ week: w._id, shortUnits: w.shortUnits, flaggedCount: w.flaggedCount })),
    sites: { total: sites.length, active: sites.filter((s) => s.status === 'Active').length },
    budgetXAF: sites.reduce((a, s) => a + s.budgetXAF, 0),
    spentXAF: sites.reduce((a, s) => a + s.spentXAF, 0),
    openAlerts, highAlerts, pendingApprovals: pendingAttendance + pendingRequests, pendingAttendance, pendingRequests, flaggedDeliveriesThisWeek: flaggedThisWeek,
  });
}));
module.exports = router;
