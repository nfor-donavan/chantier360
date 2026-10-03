const router = require('express').Router();
const own = require('../utils/populate');
const { Alert } = require('../models');
const { requireHQ } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');

router.get('/', requireHQ, wrap(async (req, res) => {
  const filter = { tenantId: req.user.tenantId, ...(req.query.open === 'true' && { acknowledged: false }) };
  res.json(await Alert.find(filter).sort({ createdAt: -1 }).limit(200).populate(own(req, 'siteId', 'siteName locationCity')));
}));
router.patch('/:id/acknowledge', requireHQ, wrap(async (req, res) => {
  const a = await Alert.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, { acknowledged: true, acknowledgedBy: req.user.id, acknowledgedAt: new Date() }, { new: true });
  if (!a) throw httpError(404, 'Alert not found');
  res.json(a);
}));
module.exports = router;
