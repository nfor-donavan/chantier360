const router = require('express').Router();
const { AttendanceLog } = require('../models');
const { requireHQ, isForeman } = require('../middleware/auth');
const { createAttendance } = require('../services/records');
const { httpError, wrap } = require('../utils/http');

router.get('/', wrap(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, ...(isForeman(req) ? { siteId: req.user.siteId } : req.query.siteId ? { siteId: req.query.siteId } : {}), ...(req.query.status && { status: req.query.status }) };
  res.json(await AttendanceLog.find(filter).sort({ date: -1 }).limit(200).populate('loggedBy', 'name'));
}));
router.post('/', wrap(async (req, res) => {
  const siteId = isForeman(req) ? req.user.siteId : req.body.siteId;
  const data = { ...req.body, status: undefined }; // status is decided by HQ only
  res.status(201).json(await createAttendance({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data }));
}));
router.patch('/:id', requireHQ, wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) throw httpError(400, 'status must be Approved or Rejected');
  const doc = await AttendanceLog.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, { status, decidedBy: req.user.id, decidedAt: new Date() }, { new: true });
  if (!doc) throw httpError(404, 'Attendance log not found');
  res.json(doc);
}));
module.exports = router;
