const router = require('express').Router();
const { Expense, ProjectSite } = require('../models');
const { can, scoped, assertProject } = require('../middleware/auth');
const { recomputeSpent } = require('../services/expenses');
const { audit } = require('../services/audit');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

const CATEGORIES = ['Materials', 'Labour', 'Subcontractors', 'Equipment', 'Transport', 'Administration', 'Other'];
const clean = (b) => {
  const out = {};
  if (b.category !== undefined) { if (!CATEGORIES.includes(b.category)) throw httpError(400, 'Choose an expense category'); out.category = b.category; }
  if (b.description !== undefined) { if (!String(b.description).trim()) throw httpError(400, 'Describe the expense'); out.description = String(b.description).trim(); }
  if (b.amountXAF !== undefined) { const n = Number(b.amountXAF); if (!Number.isFinite(n) || n < 0) throw httpError(400, 'The amount must be a number of 0 or more'); out.amountXAF = n; }
  if (b.date !== undefined) { const d = new Date(b.date); if (Number.isNaN(+d)) throw httpError(400, 'Invalid date'); out.date = d; }
  ['payee', 'reference', 'receiptUrl'].forEach((k) => { if (b[k] !== undefined) out[k] = b[k]; });
  return out;
};

router.get('/', can('VIEW_EXPENSES'), wrap(async (req, res) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const t = req.user.tenantId;
  const filter = { tenantId: t, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }), ...(req.query.category && { category: req.query.category }),
    ...((req.query.from || req.query.to) && { date: { ...(req.query.from && { $gte: new Date(req.query.from) }), ...(req.query.to && { $lte: new Date(req.query.to) }) } }) };
  const [items, projects] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).limit(500).populate(own(req, 'siteId', 'siteName')).populate(own(req, 'enteredBy')).lean(),
    ProjectSite.find({ tenantId: t, ...scoped(req, '_id') }).select('siteName budgetXAF spentXAF spentSource').lean(),
  ]);
  const byCat = {}; items.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amountXAF; });
  res.json({ items, total: items.reduce((a, e) => a + e.amountXAF, 0), byCategory: Object.entries(byCat).map(([category, total]) => ({ category, total })), projects, categories: CATEGORIES });
}));
router.post('/', can('MANAGE_EXPENSES'), wrap(async (req, res) => {
  assertProject(req, req.body.siteId);
  if (!(await ProjectSite.findOne({ _id: req.body.siteId, tenantId: req.user.tenantId }))) throw httpError(404, 'Project not found');
  const data = clean({ date: new Date(), ...req.body });
  if (!data.category || !data.description || data.amountXAF == null) throw httpError(400, 'Category, description and amount are required');
  const e = await Expense.create({ ...data, tenantId: req.user.tenantId, siteId: req.body.siteId, enteredBy: req.user.id });
  await recomputeSpent(req.user.tenantId, req.body.siteId);
  res.status(201).json(e);
}));
router.patch('/:id', can('MANAGE_EXPENSES'), wrap(async (req, res) => {
  const e = await Expense.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!e) throw httpError(404, 'Expense not found');
  assertProject(req, e.siteId);
  const before = e.toObject();
  e.set({ ...clean(req.body), updatedBy: req.user.id }); await e.save();
  await recomputeSpent(req.user.tenantId, e.siteId);
  await audit(req.user.tenantId, req.user.id, 'Expense', e._id, 'edit', e.siteId, { before, after: e.toObject() });
  res.json(e);
}));
router.delete('/:id', can('DELETE_EXPENSES'), wrap(async (req, res) => {
  const e = await Expense.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  if (!e) throw httpError(404, 'Expense not found');
  assertProject(req, e.siteId);
  await audit(req.user.tenantId, req.user.id, 'Expense', e._id, 'delete', e.siteId, e.toObject());
  await Expense.deleteOne({ _id: e._id, tenantId: req.user.tenantId });
  await recomputeSpent(req.user.tenantId, e.siteId);
  res.json({ ok: true });
}));
module.exports = router;
