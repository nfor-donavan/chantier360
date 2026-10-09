const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Tenant, ProjectSite, Role } = require('../models');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again in a few minutes.' } });

async function describe(user) {
  const tenant = await Tenant.findById(user.tenantId);
  const role = await Role.findOne({ tenantId: user.tenantId, key: user.role }).lean();
  const permissions = role ? role.permissions : [];
  const all = permissions.includes('VIEW_ALL_PROJECTS');
  const projects = await ProjectSite.find({ tenantId: user.tenantId, ...(all ? {} : { _id: { $in: user.projectIds || [] } }) }).select('siteName locationCity plannedWorkers').lean();
  const first = projects[0];
  return {
    id: user._id, name: user.name, email: user.email, role: user.role, roleLabel: role?.label || user.role, title: user.title, permissions,
    tenant: tenant && { id: tenant._id, companyName: tenant.companyName },
    projects: projects.map((p) => ({ id: p._id, siteName: p.siteName, locationCity: p.locationCity })),
    site: first && { id: first._id, siteName: first.siteName, locationCity: first.locationCity, plannedWorkers: first.plannedWorkers }, // used by the foreman app
  };
}

router.post('/login', limiter, wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw httpError(400, 'Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).setOptions({ skipTenant: true }); // lookup happens before the tenant is known
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, 'Email or password is incorrect');
  const tenant = await Tenant.findById(user.tenantId);
  if (!tenant || !tenant.isActive) throw httpError(403, 'This company account is not active');
  const token = jwt.sign({ sub: user.id, tenantId: String(user.tenantId) }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token, user: await describe(user) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, tenantId: req.user.tenantId });
  res.json({ user: await describe(user) });
}));
module.exports = router;
