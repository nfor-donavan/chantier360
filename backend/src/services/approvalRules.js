const { httpError } = require('../utils/http');
// The approval rules, kept pure so they can be tested without a database.
const PENDING = { attendance: 'Pending_HQ_Approval', request: 'Pending' };
const NEXT = { approve: 'Approved', reject: 'Rejected' };
function nextState(kind, current, action, { expectedStatus, reason } = {}) {
  if (!['approve', 'reject', 'revoke'].includes(action)) throw httpError(400, 'Unknown action');
  if (expectedStatus && expectedStatus !== current) throw httpError(409, 'This record was changed by someone else. Reload and try again.');
  if (action === 'revoke') {
    if (current !== 'Approved') throw httpError(409, 'Only an approved record can be revoked.');
    if (!reason || String(reason).trim().length < 3) throw httpError(400, 'Give a reason for revoking the approval.');
    return { to: PENDING[kind] };
  }
  if (current !== PENDING[kind]) throw httpError(409, current === 'Approved' || current === 'Rejected' ? `This record is already ${current.toLowerCase()}.` : 'This record cannot be decided now.');
  return { to: NEXT[action] };
}
module.exports = { nextState, PENDING };
