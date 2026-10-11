const { AuditLog } = require('../models');
const audit = (tenantId, userId, entity, entityId, action, siteId, snapshot) =>
  AuditLog.create({ tenantId, by: userId, entity, entityId: String(entityId), action, siteId, snapshot: JSON.parse(JSON.stringify(snapshot ?? null)) });
module.exports = { audit };
