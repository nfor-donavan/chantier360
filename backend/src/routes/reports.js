const router = require('express').Router();
const { DailyReport } = require('../models');
const { can, scoped, assertProject, pickProject } = require('../middleware/auth');
const { createReport } = require('../services/records');
const { wrap } = require('../utils/http');
const own = require('../utils/populate');

router.get('/', can('VIEW_REPORTS'), wrap(async (req, res) => {
  if (req.query.siteId) assertProject(req, req.query.siteId);
  const filter = { tenantId: req.user.tenantId, ...scoped(req), ...(req.query.siteId && { siteId: req.query.siteId }) };
  const list = await DailyReport.find(filter).sort({ date: -1 }).limit(60).populate(own(req, 'submittedBy')).populate(own(req, 'siteId', 'siteName')).lean();
  res.json(req.has('VIEW_PROJECT_FINANCIALS') ? list : list.map(({ siteCash, ...r }) => r)); // site cash is financial
}));
router.post('/', can('SUBMIT_REPORTS'), wrap(async (req, res) => {
  const siteId = pickProject(req, req.body.siteId);
  res.status(201).json(await createReport({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: req.body }));
}));
module.exports = router;
