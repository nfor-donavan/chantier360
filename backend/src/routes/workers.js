const router = require('express').Router();
const { Worker } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createWorker, updateWorker, removeWorker } = require('../services/records');
const { httpError, wrap } = require('../utils/http');

router.get('/', can('VIEW_ATTENDANCE', 'MANAGE_WORKFORCE'), wrap(async (req, res) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const filter = { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }), ...(req.query.includeInactive !== 'true' && { active: true }) };
  res.json(await Worker.find(filter).sort({ category: 1, name: 1 }).populate('siteId', 'siteName').lean());
}));
router.post('/', can('MANAGE_WORKFORCE'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  res.status(201).json(await createWorker({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: req.body }));
}));
const byId = async (req) => { const w = await Worker.findOne({ _id: req.params.id, tenantId: req.user.tenantId }); if (!w) throw httpError(404, 'Worker not found'); assertProject(req, w.siteId); return w; };
router.patch('/:id', can('MANAGE_WORKFORCE'), wrap(async (req, res) => {
  const w = await byId(req);
  res.json(await updateWorker({ tenantId: req.user.tenantId, siteId: w.siteId, data: { ...req.body, uid: w.uid } }));
}));
router.delete('/:id', can('MANAGE_WORKFORCE'), wrap(async (req, res) => { // marks the worker inactive; attendance history is untouched
  const w = await byId(req);
  res.json(await removeWorker({ tenantId: req.user.tenantId, userId: req.user.id, siteId: w.siteId, data: { uid: w.uid } }));
}));
module.exports = router;
