const router = require('express').Router();
const { MaterialMovement, ProjectSite, StorageLocation, StockEntry } = require('../models');
const { can, scoped, assertProject } = require('../middleware/auth');
const { createTransfer, parseRef, filterOf } = require('../services/transfers');
const { summarize } = require('../services/stock');
const { httpError, wrap } = require('../utils/http');
const own = require('../utils/populate');

// Everything a person can move stock between: their projects plus the company's warehouses and storage.
router.get('/locations', can('VIEW_TRANSFERS'), wrap(async (req, res) => {
  const t = req.user.tenantId;
  const [sites, locs] = await Promise.all([ProjectSite.find({ tenantId: t, ...scoped(req, '_id') }).select('siteName').sort({ siteName: 1 }).lean(), StorageLocation.find({ tenantId: t, active: true }).sort({ name: 1 }).lean()]);
  res.json({ locations: [...locs.map((l) => ({ ref: `loc:${l._id}`, id: l._id, name: l.name, type: l.type, address: l.address })), ...sites.map((s) => ({ ref: `site:${s._id}`, id: s._id, name: s.siteName, type: 'site' }))] });
}));
router.post('/locations', can('MANAGE_TRANSFERS'), wrap(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) throw httpError(400, 'Enter the location name');
  if (await StorageLocation.findOne({ tenantId: req.user.tenantId, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), active: true })) throw httpError(409, 'A location with this name already exists');
  res.status(201).json(await StorageLocation.create({ tenantId: req.user.tenantId, name, type: ['warehouse', 'storage', 'other'].includes(req.body.type) ? req.body.type : 'warehouse', address: req.body.address }));
}));

// Stock held at one location, per material.
router.get('/balance', can('VIEW_TRANSFERS'), wrap(async (req, res) => {
  const ref = parseRef(req.query.ref);
  if (ref.kind === 'site') assertProject(req, ref.id);
  res.json(summarize(await StockEntry.find({ tenantId: req.user.tenantId, ...filterOf(ref) }).lean()));
}));

router.get('/', can('VIEW_TRANSFERS'), wrap(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, ...(req.query.material && { materialType: req.query.material }), ...((req.query.from || req.query.to) && { date: { ...(req.query.from && { $gte: new Date(req.query.from) }), ...(req.query.to && { $lte: new Date(new Date(req.query.to).getTime() + 864e5 - 1) }) } }) };
  let list = await MaterialMovement.find(filter).sort({ date: -1, createdAt: -1 }).limit(300).populate(own(req, 'createdBy')).lean();
  if (!req.allProjects) { const ids = new Set(req.user.projectIds); list = list.filter((m) => [m.from, m.to].some((r) => r.kind === 'site' && ids.has(String(r.id)))); } // scoped users see transfers that touch their projects
  res.json(list);
}));
router.post('/', can('MANAGE_TRANSFERS'), wrap(async (req, res) => {
  [req.body.from, req.body.to].forEach((s) => { const r = parseRef(s); if (r.kind === 'site') assertProject(req, r.id); });
  res.status(201).json(await createTransfer({ tenantId: req.user.tenantId, userId: req.user.id, data: req.body }));
}));
module.exports = router;
