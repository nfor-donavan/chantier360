const router = require('express').Router();
const { AttendanceLog, WeeklyReport } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createAttendance } = require('../services/records');
const { applyDecision } = require('../services/approvals');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

router.get('/', can('VIEW_ATTENDANCE', 'APPROVE_ATTENDANCE'), wrap(async (req, res) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const filter = { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }), ...(req.query.status && { status: req.query.status }) };
  res.json(await AttendanceLog.find(filter).sort({ date: -1 }).limit(200).populate(own(req, 'loggedBy')).populate(own(req, 'siteId', 'siteName')).populate(own(req, 'decidedBy')));
}));
router.post('/', can('MANAGE_ATTENDANCE'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  res.status(201).json(await createAttendance({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { ...req.body, status: undefined } })); // approval is the office's decision only
}));

// Revoking is refused once a locked weekly report covers the day, because that report already used the attendance.
const guard = (req) => async (doc, action) => {
  if (action !== 'revoke') return;
  const w = await WeeklyReport.findOne({ tenantId: req.user.tenantId, siteId: doc.siteId, status: 'locked', weekStart: { $gt: new Date(+doc.date - 7 * 864e5), $lte: doc.date } });
  if (w) throw httpError(409, 'A locked weekly report already covers this day. Ask the Director to unlock that weekly report first.');
};
const decide = (action) => wrap(async (req, res) => {
  const doc = await applyDecision({ Model: AttendanceLog, kind: 'attendance', req, id: req.params.id, action, body: req.body || {}, guard: guard(req) });
  res.json(doc);
});
router.post('/:id/approve', can('APPROVE_ATTENDANCE'), decide('approve'));
router.post('/:id/reject', can('APPROVE_ATTENDANCE'), decide('reject'));
router.post('/:id/revoke', can('APPROVE_ATTENDANCE'), decide('revoke'));
// Older clients: same rules, always from Pending.
router.patch('/:id', can('APPROVE_ATTENDANCE'), wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) throw httpError(400, 'status must be Approved or Rejected');
  res.json(await applyDecision({ Model: AttendanceLog, kind: 'attendance', req, id: req.params.id, action: status === 'Approved' ? 'approve' : 'reject', body: { expectedStatus: 'Pending_HQ_Approval' } }));
}));
module.exports = router;
