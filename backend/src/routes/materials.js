const router = require('express').Router();
const { MaterialLog, MaterialRequest, PurchaseOrder } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createMaterialLog, updateMaterialLog, deleteMaterialLog } = require('../services/records');
const { applyDecision } = require('../services/approvals');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

const where = (req) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  return { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }) };
};

router.get('/logs', can('VIEW_MATERIALS'), wrap(async (req, res) => {
  const filter = { ...where(req), ...(req.query.flagged === 'true' && { flagged: true }) };
  res.json(await MaterialLog.find(filter).sort({ createdAt: -1 }).limit(200).populate(own(req, 'loggedBy')).populate(own(req, 'siteId', 'siteName')));
}));
router.post('/logs', can('MANAGE_DELIVERIES'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  res.status(201).json(await createMaterialLog({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: req.body }));
}));

const owned = async (req) => {
  const log = await MaterialLog.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).select('siteId');
  if (!log) throw httpError(404, 'Delivery not found');
  assertProject(req, log.siteId);
  return log.siteId;
};
router.patch('/logs/:id', can('MANAGE_DELIVERIES'), wrap(async (req, res) => {
  const siteId = await owned(req);
  res.json(await updateMaterialLog({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { ...req.body, logId: req.params.id } }));
}));
router.delete('/logs/:id', can('MANAGE_DELIVERIES'), wrap(async (req, res) => {
  const siteId = await owned(req);
  res.json(await deleteMaterialLog({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { logId: req.params.id } }));
}));

// Purchase orders: what HQ has ordered. Foremen deliver against these.
router.get('/orders', can('VIEW_MATERIALS', 'MANAGE_DELIVERIES'), wrap(async (req, res) => {
  res.json(await PurchaseOrder.find({ ...where(req), status: req.query.status || 'Open' }).sort({ createdAt: -1 }));
}));
router.post('/orders', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  const { siteId, materialType, supplierName, quantityOrdered } = req.body;
  assertProject(req, siteId);
  res.status(201).json(await PurchaseOrder.create({ tenantId: req.user.tenantId, siteId, materialType, supplierName, quantityOrdered }));
}));

// Material requests
router.get('/requests', can('VIEW_MATERIALS'), wrap(async (req, res) => {
  const list = await MaterialRequest.find({ ...where(req), ...(req.query.status && { status: req.query.status }) }).sort({ createdAt: -1 }).populate(own(req, 'requestedBy')).populate(own(req, 'siteId', 'siteName')).populate(own(req, 'decidedBy')).lean();
  res.json(req.has('VIEW_PROJECT_FINANCIALS') ? list : list.map(({ estimateXAF, ...r }) => r));
}));
router.post('/requests', can('MANAGE_DELIVERIES'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  const { materialType, quantity, estimateXAF } = req.body;
  res.status(201).json(await MaterialRequest.create({ tenantId: req.user.tenantId, siteId, materialType, quantity, estimateXAF, requestedBy: req.user.id }));
}));
// Nothing else happens when a request is approved (no purchase order is created from it), so revoking it only reverses its status.
const decide = (action) => wrap(async (req, res) => { res.json(await applyDecision({ Model: MaterialRequest, kind: 'request', req, id: req.params.id, action, body: req.body || {} })); });
router.post('/requests/:id/approve', can('APPROVE_REQUESTS'), decide('approve'));
router.post('/requests/:id/reject', can('APPROVE_REQUESTS'), decide('reject'));
router.post('/requests/:id/revoke', can('APPROVE_REQUESTS'), decide('revoke'));
router.patch('/requests/:id', can('APPROVE_REQUESTS'), wrap(async (req, res) => { // older clients
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) throw httpError(400, 'status must be Approved or Rejected');
  res.json(await applyDecision({ Model: MaterialRequest, kind: 'request', req, id: req.params.id, action: status === 'Approved' ? 'approve' : 'reject', body: { expectedStatus: 'Pending' } }));
}));
module.exports = router;
