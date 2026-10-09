const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { Role, User } = require('../models');
const { httpError } = require('../utils/http');

const cache = new Map(); // "tenant:role" -> { perms, at }. Short-lived so role changes apply within seconds.
const clearRoleCache = () => cache.clear();
async function permsFor(tenantId, role) {
  const key = `${tenantId}:${role}`, hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5000) return hit.perms;
  const r = await Role.findOne({ tenantId, key: role }).lean();
  const perms = new Set(r ? r.permissions : []);
  cache.set(key, { perms, at: Date.now() });
  return perms;
}

// Identity comes from the signed token; role, permissions and project access are re-read from the database on every request.
async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw httpError(401, 'Sign in required');
    let p; try { p = jwt.verify(h.slice(7), JWT_SECRET); } catch { throw httpError(401, 'Session expired. Sign in again.'); }
    const u = await User.findOne({ _id: p.sub, tenantId: p.tenantId, isActive: true }).lean();
    if (!u) throw httpError(401, 'Account no longer active');
    req.user = { id: String(u._id), tenantId: String(u.tenantId), role: u.role, projectIds: (u.projectIds || []).map(String), client: u.client && String(u.client) };
    req.perms = await permsFor(req.user.tenantId, u.role);
    req.has = (perm) => req.perms.has(perm);
    req.allProjects = req.perms.has('VIEW_ALL_PROJECTS');
    next();
  } catch (e) { next(e); }
}

// can('A', 'B') passes when the user holds A or B.
const can = (...need) => (req, res, next) => (need.some((p) => req.perms.has(p)) ? next() : next(httpError(403, 'You do not have permission to do this')));

const scoped = (req, field = 'siteId') => (req.allProjects ? {} : { [field]: { $in: req.user.projectIds } });
const canAccessProject = (req, id) => req.allProjects || req.user.projectIds.includes(String(id));
function assertProject(req, id) { if (!canAccessProject(req, id)) throw httpError(403, 'You do not have access to this project'); return id; }
function pickProject(req, requested) {
  if (requested) return assertProject(req, requested);
  if (!req.allProjects && req.user.projectIds.length === 1) return req.user.projectIds[0];
  throw httpError(400, 'siteId is required');
}
// Financial fields are removed server-side for anyone without the financial permission.
const redact = (req, p) => {
  const o = p.toObject ? p.toObject() : { ...p };
  if (!req.has('VIEW_PROJECT_FINANCIALS')) ['budgetXAF', 'spentXAF', 'financialsUpdatedBy', 'financialsUpdatedAt'].forEach((k) => delete o[k]);
  return o;
};
module.exports = { requireAuth, can, scoped, canAccessProject, assertProject, pickProject, redact, clearRoleCache };
