const { User } = require('../models');
const { scoped } = require('../middleware/auth');
const { httpError } = require('../utils/http');
const { audit } = require('./audit');
const { nextState, PENDING } = require('./approvalRules');

// Applies one decision. The update is conditional on the status we read, so two people acting at once cannot both succeed,
// and the original approval stays in the history when it is later revoked.
async function applyDecision({ Model, kind, req, id, action, body = {}, guard }) {
  const tenantId = req.user.tenantId;
  const doc = await Model.findOne({ _id: id, tenantId, ...scoped(req) });
  if (!doc) throw httpError(404, 'Record not found');
  const { to } = nextState(kind, doc.status, action, { expectedStatus: body.expectedStatus, reason: body.reason });
  if (guard) await guard(doc, action);
  const me = await User.findOne({ _id: req.user.id, tenantId }).select('name').lean();
  const entry = { action, by: req.user.id, byName: me?.name, at: new Date(), reason: body.reason ? String(body.reason).trim() : undefined, fromStatus: doc.status, toStatus: to };
  const revoke = action === 'revoke';
  const upd = await Model.findOneAndUpdate({ _id: id, tenantId, status: doc.status }, { $set: { status: to, decidedBy: revoke ? null : req.user.id, decidedAt: revoke ? null : new Date() }, $push: { approvalHistory: entry } }, { new: true });
  if (!upd) throw httpError(409, 'This record was changed by someone else. Reload and try again.');
  await audit(tenantId, req.user.id, Model.modelName, id, action, upd.siteId, entry);
  return upd;
}
module.exports = { nextState, applyDecision, PENDING };
