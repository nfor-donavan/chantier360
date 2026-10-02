const router = require('express').Router();
const { createMaterialLog, createAttendance } = require('../services/records');
const { isForeman } = require('../middleware/auth');
const { wrap } = require('../utils/http');

// Receives everything a phone saved while offline. Each record carries a clientId,
// so sending the same batch twice never creates duplicates.
async function run(items = [], fn, req) {
  const out = [];
  for (const data of items.slice(0, 200)) {
    try {
      const siteId = isForeman(req) ? req.user.siteId : data.siteId;
      const doc = await fn({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { ...data, status: undefined }, createdAt: data.createdAt && new Date(data.createdAt) });
      out.push({ clientId: data.clientId, result: 'created', id: doc._id });
    } catch (e) {
      out.push({ clientId: data.clientId, result: e.code === 11000 ? 'duplicate' : 'error', error: e.code === 11000 ? undefined : e.message });
    }
  }
  return out;
}
router.post('/', wrap(async (req, res) => {
  const { materialLogs, attendanceLogs } = req.body || {};
  res.json({ materialLogs: await run(materialLogs, createMaterialLog, req), attendanceLogs: await run(attendanceLogs, createAttendance, req) });
}));
module.exports = router;
