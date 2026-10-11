// Every action in the platform is guarded by one of these. Roles are just named lists of permissions,
// stored per company, so the General Director can change them without code changes.
const PERMISSIONS = [
  'VIEW_ALL_PROJECTS', 'VIEW_DASHBOARD', 'VIEW_PROJECT_FINANCIALS', 'MANAGE_PROJECT_FINANCIALS', 'MANAGE_PROJECTS',
  'VIEW_PROGRESS', 'MANAGE_TASKS', 'VIEW_MATERIALS', 'MANAGE_DELIVERIES', 'APPROVE_REQUESTS', 'VIEW_STOCK',
  'VIEW_ATTENDANCE', 'MANAGE_ATTENDANCE', 'APPROVE_ATTENDANCE', 'VIEW_REPORTS', 'SUBMIT_REPORTS', 'UPLOAD_EVIDENCE',
  'VIEW_ALERTS', 'MANAGE_ALERTS', 'MANAGE_CLIENT_PORTAL', 'MANAGE_USERS', 'VIEW_CLIENT_PORTAL',
  'MANAGE_WORKFORCE', 'MANAGE_WEEKLY_REPORTS', 'VIEW_EXPENSES', 'MANAGE_EXPENSES', 'DELETE_EXPENSES', 'MANAGE_COMPANY',
];

const without = (list, ...drop) => list.filter((p) => !drop.includes(p));

const DEFAULT_ROLES = {
  director: { label: 'General Director', permissions: without(PERMISSIONS, 'VIEW_CLIENT_PORTAL', 'SUBMIT_REPORTS', 'MANAGE_DELIVERIES', 'MANAGE_ATTENDANCE', 'MANAGE_WORKFORCE') },
  // The engineer sees operations broadly but cannot create or change projects, tasks or finances.
  engineer: { label: 'Engineer', permissions: ['VIEW_DASHBOARD', 'VIEW_PROGRESS', 'VIEW_MATERIALS', 'VIEW_STOCK', 'VIEW_ATTENDANCE', 'APPROVE_ATTENDANCE', 'VIEW_REPORTS', 'MANAGE_WEEKLY_REPORTS', 'UPLOAD_EVIDENCE', 'VIEW_ALERTS'] },
  // The secretary reads budgets and records expenses. No deleting expenses, no editing project budgets, no users or client controls.
  secretary: { label: 'Secretary', permissions: ['VIEW_ALL_PROJECTS', 'VIEW_DASHBOARD', 'VIEW_PROJECT_FINANCIALS', 'VIEW_EXPENSES', 'MANAGE_EXPENSES', 'VIEW_PROGRESS', 'VIEW_MATERIALS', 'VIEW_STOCK', 'VIEW_ATTENDANCE', 'VIEW_REPORTS', 'VIEW_ALERTS'] },
  foreman: { label: 'Site Foreman', permissions: ['VIEW_PROGRESS', 'VIEW_MATERIALS', 'MANAGE_DELIVERIES', 'VIEW_STOCK', 'MANAGE_ATTENDANCE', 'MANAGE_WORKFORCE', 'SUBMIT_REPORTS', 'UPLOAD_EVIDENCE'] },
  client: { label: 'Client', permissions: ['VIEW_CLIENT_PORTAL'] },
};
module.exports = { PERMISSIONS, DEFAULT_ROLES };
