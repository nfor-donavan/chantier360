const router = require('express').Router();
const { Asset } = require('../models');
const { can } = require('../middleware/auth');
const { audit } = require('../services/audit');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

const CATEGORIES = ['Vehicle', 'Machinery', 'Equipment', 'Tool', 'Other'];
const FIELDS = ['name', 'category', 'identifier', 'quantity', 'status', 'condition', 'location', 'locationNote', 'assignedSiteId', 'ownership', 'acquiredOn', 'notes'];
const clean = (b) => {
  const o = {};
  FIELDS.forEach((k) => { if (b[k] !== undefined) o[k] = b[k] === '' ? null : b[k]; });
  if (o.name !== undefined && (!o.name || String(o.name).trim().length < 2)) throw httpError(400, 'Enter the asset name');
  if (o.category !== undefined && !CATEGORIES.includes(o.category)) throw httpError(400, 'Choose a category');
  if (o.quantity !== undefined && !(Number(o.quantity) >= 0)) throw httpError(400, 'The quantity must be 0 or more');
  if (o.location && !(['site', 'loc'].includes(o.location.kind) && o.location.id)) throw httpError(400, 'Invalid location');
  return o;
};

// Viewing and editing are separate permissions. Foremen have neither, so the register does not exist for them.
router.get('/', can('VIEW_ASSETS'), wrap(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, ...(req.query.category && { category: req.query.category }), ...(req.query.status && { status: req.query.status }), ...(req.query.siteId && { assignedSiteId: req.query.siteId }) };
  const items = await Asset.find(filter).sort({ category: 1, name: 1 }).populate(own(req, 'assignedSiteId', 'siteName')).lean();
  const by = {}; items.forEach((a) => { if (a.status !== 'Retired') by[a.category] = (by[a.category] || 0) + a.quantity; });
  res.json({ items, summary: Object.entries(by).map(([category, quantity]) => ({ category, quantity })), categories: CATEGORIES, canEdit: req.has('MANAGE_ASSETS') });
}));
router.post('/', can('MANAGE_ASSETS'), wrap(async (req, res) => {
  const data = clean(req.body);
  if (!data.name || !data.category) throw httpError(400, 'Name and category are required');
  res.status(201).json(await Asset.create({ ...data, tenantId: req.user.tenantId, createdBy: req.user.id }));
}));
router.patch('/:id', can('MANAGE_ASSETS'), wrap(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!a) throw httpError(404, 'Asset not found');
  const before = a.toObject(); a.set({ ...clean(req.body), updatedBy: req.user.id }); await a.save();
  await audit(req.user.tenantId, req.user.id, 'Asset', a._id, 'edit', undefined, { before, after: a.toObject() });
  res.json(a);
}));
router.post('/:id/maintenance', can('MANAGE_ASSETS'), wrap(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!a) throw httpError(404, 'Asset not found');
  if (!req.body.note || !String(req.body.note).trim()) throw httpError(400, 'Write the maintenance note');
  a.maintenance.push({ date: req.body.date ? new Date(req.body.date) : new Date(), note: String(req.body.note).trim(), by: req.user.id }); await a.save();
  res.status(201).json(a);
}));
router.delete('/:id', can('MANAGE_ASSETS'), wrap(async (req, res) => {
  const a = await Asset.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!a) throw httpError(404, 'Asset not found');
  await audit(req.user.tenantId, req.user.id, 'Asset', a._id, 'delete', undefined, a.toObject());
  await Asset.deleteOne({ _id: a._id, tenantId: req.user.tenantId });
  res.json({ ok: true });
}));
module.exports = router;
