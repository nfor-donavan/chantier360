const router = require('express').Router();
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
  res.json({
    sites: { total: sites.length, active: sites.filter((s) => s.status === 'Active').length },
    budgetXAF: sites.reduce((a, s) => a + s.budgetXAF, 0),
    spentXAF: sites.reduce((a, s) => a + s.spentXAF, 0),
    openAlerts, highAlerts, pendingApprovals: pendingAttendance + pendingRequests, pendingAttendance, pendingRequests, flaggedDeliveriesThisWeek: flaggedThisWeek,
  });
}));
module.exports = router;
