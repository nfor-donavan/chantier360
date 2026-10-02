const router = require('express').Router();
const { ProjectSite } = require('../models');
const { requireHQ, isForeman } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');
const FIELDS = ['siteName', 'locationCity', 'budgetXAF', 'spentXAF', 'progressPct', 'plannedWorkers', 'startDate', 'endDate', 'status'];
const pick = (b) => Object.fromEntries(FIELDS.filter((k) => b[k] !== undefined).map((k) => [k, b[k]]));

router.get('/', wrap(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, ...(isForeman(req) && { _id: req.user.siteId }) };
  res.json(await ProjectSite.find(filter).sort({ startDate: 1 }));
}));
router.post('/', requireHQ, wrap(async (req, res) => {
  res.status(201).json(await ProjectSite.create({ ...pick(req.body), tenantId: req.user.tenantId }));
}));
router.patch('/:id', requireHQ, wrap(async (req, res) => {
  const site = await ProjectSite.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, pick(req.body), { new: true, runValidators: true });
  if (!site) throw httpError(404, 'Site not found');
  res.json(site);
}));
module.exports = router;
