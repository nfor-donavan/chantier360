const router = require('express').Router();
const { AttendanceLog } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createAttendance } = require('../services/records');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

router.get('/', can('VIEW_ATTENDANCE', 'APPROVE_ATTENDANCE'), wrap(async (req, res) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const filter = { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }), ...(req.query.status && { status: req.query.status }) };
  res.json(await AttendanceLog.find(filter).sort({ date: -1 }).limit(200).populate(own(req, 'loggedBy')).populate(own(req, 'siteId', 'siteName')));
}));
router.post('/', can('MANAGE_ATTENDANCE'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  res.status(201).json(await createAttendance({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { ...req.body, status: undefined } })); // approval is HQ's decision only
}));
router.patch('/:id', can('APPROVE_ATTENDANCE'), wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) throw httpError(400, 'status must be Approved or Rejected');
  const doc = await AttendanceLog.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId, ...scoped(req) }, { status, decidedBy: req.user.id, decidedAt: new Date() }, { new: true });
  if (!doc) throw httpError(404, 'Attendance log not found');
  res.json(doc);
}));
module.exports = router;
