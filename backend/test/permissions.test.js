const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_ROLES, PERMISSIONS } = require('../src/permissions');
const has = (role, p) => DEFAULT_ROLES[role].permissions.includes(p);

test('every default permission is a known permission', () => {
  for (const [role, def] of Object.entries(DEFAULT_ROLES)) for (const p of def.permissions) assert.ok(PERMISSIONS.includes(p), `${role}: ${p}`);
});
test('foreman cannot see assets, expenses, finances, projects admin or the dashboard', () => {
  ['VIEW_ASSETS', 'MANAGE_ASSETS', 'VIEW_EXPENSES', 'MANAGE_EXPENSES', 'VIEW_PROJECT_FINANCIALS', 'MANAGE_PROJECTS', 'VIEW_DASHBOARD', 'VIEW_ALL_PROJECTS', 'MANAGE_USERS', 'VIEW_TRANSFERS', 'MANAGE_TRANSFERS', 'APPROVE_ATTENDANCE', 'APPROVE_REQUESTS'].forEach((p) => assert.equal(has('foreman', p), false, p));
});
test('foreman keeps the field permissions', () => {
  ['MANAGE_ATTENDANCE', 'MANAGE_WORKFORCE', 'MANAGE_DELIVERIES', 'SUBMIT_REPORTS', 'SUBMIT_WEEKLY_REPORTS', 'UPLOAD_EVIDENCE', 'VIEW_PROGRESS'].forEach((p) => assert.equal(has('foreman', p), true, p));
});
test('engineer views broadly but cannot create or edit projects, tasks or finances', () => {
  ['MANAGE_PROJECTS', 'MANAGE_TASKS', 'MANAGE_PROJECT_FINANCIALS', 'VIEW_PROJECT_FINANCIALS', 'MANAGE_ASSETS', 'MANAGE_USERS', 'MANAGE_CLIENT_PORTAL'].forEach((p) => assert.equal(has('engineer', p), false, p));
  ['VIEW_PROGRESS', 'VIEW_REPORTS', 'VIEW_MATERIALS', 'VIEW_ATTENDANCE', 'VIEW_ASSETS', 'MANAGE_TRANSFERS', 'MANAGE_WEEKLY_REPORTS'].forEach((p) => assert.equal(has('engineer', p), true, p));
});
test('viewing assets never implies editing them', () => {
  for (const role of Object.keys(DEFAULT_ROLES)) if (has(role, 'MANAGE_ASSETS')) assert.equal(has(role, 'VIEW_ASSETS'), true);
  assert.equal(has('secretary', 'VIEW_ASSETS'), true); assert.equal(has('secretary', 'MANAGE_ASSETS'), false);
  assert.equal(has('director', 'MANAGE_ASSETS'), true);
});
test('secretary records expenses but cannot delete them, edit budgets or manage users', () => {
  assert.equal(has('secretary', 'MANAGE_EXPENSES'), true);
  ['DELETE_EXPENSES', 'MANAGE_PROJECT_FINANCIALS', 'MANAGE_USERS', 'MANAGE_CLIENT_PORTAL', 'MANAGE_PROJECTS'].forEach((p) => assert.equal(has('secretary', p), false, p));
});
test('client only has the client portal', () => assert.deepEqual(DEFAULT_ROLES.client.permissions, ['VIEW_CLIENT_PORTAL']));
