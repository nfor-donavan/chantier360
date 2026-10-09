const router = require('express').Router();
const { MaterialLog, MaterialRequest, PurchaseOrder } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createMaterialLog } = require('../services/records');
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
  const list = await MaterialRequest.find({ ...where(req), ...(req.query.status && { status: req.query.status }) }).sort({ createdAt: -1 }).populate(own(req, 'requestedBy')).populate(own(req, 'siteId', 'siteName')).lean();
  res.json(req.has('VIEW_PROJECT_FINANCIALS') ? list : list.map(({ estimateXAF, ...r }) => r));
}));
router.post('/requests', can('MANAGE_DELIVERIES'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  const { materialType, quantity, estimateXAF } = req.body;
  res.status(201).json(await MaterialRequest.create({ tenantId: req.user.tenantId, siteId, materialType, quantity, estimateXAF, requestedBy: req.user.id }));
}));
router.patch('/requests/:id', can('APPROVE_REQUESTS'), wrap(async (req, res) => {
  const { status } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) throw httpError(400, 'status must be Approved or Rejected');
  const doc = await MaterialRequest.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId, status: 'Pending', ...scoped(req) }, { status, decidedBy: req.user.id, decidedAt: new Date() }, { new: true });
  if (!doc) throw httpError(404, 'Pending request not found');
  res.json(doc);
}));
module.exports = router;
