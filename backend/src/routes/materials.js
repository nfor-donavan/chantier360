const router = require('express').Router();
const { MaterialLog, MaterialRequest } = require('../models');
const { requireHQ, isForeman } = require('../middleware/auth');
const { createMaterialLog } = require('../services/records');
const { httpError, wrap } = require('../utils/http');

const siteFilter = (req) => ({ tenantId: req.user.tenantId, ...(isForeman(req) ? { siteId: req.user.siteId } : req.query.siteId ? { siteId: req.query.siteId } : {}) });

// Deliveries
router.get('/logs', wrap(async (req, res) => {
  const filter = { ...siteFilter(req), ...(req.query.flagged === 'true' && { flagged: true }) };
  res.json(await MaterialLog.find(filter).sort({ createdAt: -1 }).limit(200).populate('loggedBy', 'name'));
}));
router.post('/logs', wrap(async (req, res) => {
  const siteId = isForeman(req) ? req.user.siteId : req.body.siteId;
  const doc = await createMaterialLog({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: req.body });
  res.status(201).json(doc);
}));

// Material requests
router.get('/requests', wrap(async (req, res) => {
  const filter = { ...siteFilter(req), ...(req.query.status && { status: req.query.status }) };
  res.json(await MaterialRequest.find(filter).sort({ createdAt: -1 }).populate('requestedBy', 'name'));
}));
router.post('/requests', wrap(async (req, res) => {
  const siteId = isForeman(req) ? req.user.siteId : req.body.siteId;
  const { materialType, quantity, estimateXAF } = req.body;
  res.status(201).json(await MaterialRequest.create({ tenantId: req.user.tenantId, siteId, materialType, quantity, estimateXAF, requestedBy: req.user.id }));
}));
router.patch('/requests/:id', requireHQ, wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) throw httpError(400, 'status must be Approved or Rejected');
  const doc = await MaterialRequest.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId, status: 'Pending' }, { status, decidedBy: req.user.id, decidedAt: new Date() }, { new: true });
  if (!doc) throw httpError(404, 'Pending request not found');
  res.json(doc);
}));
module.exports = router;
