const test = require('node:test');
const assert = require('node:assert/strict');
const { nextState } = require('../src/services/approvalRules');
const fails = (fn, status) => assert.throws(fn, (e) => e.status === status);

test('approve a pending attendance record', () => assert.equal(nextState('attendance', 'Pending_HQ_Approval', 'approve').to, 'Approved'));
test('reject a pending request', () => assert.equal(nextState('request', 'Pending', 'reject').to, 'Rejected'));
test('approving twice is refused, not repeated', () => fails(() => nextState('attendance', 'Approved', 'approve'), 409));
test('a rejected record cannot be approved without being reopened', () => fails(() => nextState('request', 'Rejected', 'approve'), 409));
test('revoking an approval returns the record to pending and needs a reason', () => {
  assert.equal(nextState('attendance', 'Approved', 'revoke', { reason: 'Photo does not match the count' }).to, 'Pending_HQ_Approval');
  assert.equal(nextState('request', 'Approved', 'revoke', { reason: 'Budget changed' }).to, 'Pending');
  fails(() => nextState('attendance', 'Approved', 'revoke', { reason: '' }), 400);
  fails(() => nextState('attendance', 'Approved', 'revoke', { reason: 'ok' }), 400);
});
test('only an approved record can be revoked', () => { fails(() => nextState('attendance', 'Pending_HQ_Approval', 'revoke', { reason: 'mistake' }), 409); fails(() => nextState('request', 'Rejected', 'revoke', { reason: 'mistake' }), 409); });
test('a stale screen is detected through expectedStatus', () => {
  fails(() => nextState('attendance', 'Approved', 'approve', { expectedStatus: 'Pending_HQ_Approval' }), 409);
  fails(() => nextState('attendance', 'Approved', 'revoke', { expectedStatus: 'Pending_HQ_Approval', reason: 'mistake' }), 409);
});
test('unknown actions are rejected', () => fails(() => nextState('attendance', 'Pending_HQ_Approval', 'delete'), 400));
