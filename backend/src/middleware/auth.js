const jwt = require('jsonwebtoken');
const { JWT_SECRET, HQ_ROLES } = require('../config');
const { httpError } = require('../utils/http');

// Tenant, role and site always come from the signed token, never from the request body.
function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return next(httpError(401, 'Sign in required'));
  try {
    const p = jwt.verify(h.slice(7), JWT_SECRET);
    req.user = { id: p.sub, tenantId: p.tenantId, role: p.role, siteId: p.siteId };
    next();
  } catch { next(httpError(401, 'Session expired. Sign in again.')); }
}
const requireHQ = (req, res, next) => (HQ_ROLES.includes(req.user.role) ? next() : next(httpError(403, 'This action is for head office staff')));
const isForeman = (req) => req.user.role === 'foreman';
module.exports = { requireAuth, requireHQ, isForeman };
