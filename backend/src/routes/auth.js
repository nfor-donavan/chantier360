const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { User, Tenant, ProjectSite } = require('../models');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const { requireAuth } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many sign-in attempts. Try again in a few minutes.' } });

const publicUser = (u, tenant, site) => ({ id: u._id, name: u.name, email: u.email, role: u.role, title: u.title, tenant: tenant && { id: tenant._id, companyName: tenant.companyName }, site: site && { id: site._id, siteName: site.siteName, locationCity: site.locationCity, plannedWorkers: site.plannedWorkers, dailyRateXAF: site.dailyRateXAF } });

router.post('/login', limiter, wrap(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw httpError(400, 'Email and password are required');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).setOptions({ skipTenant: true }); // lookup happens before the tenant is known
  if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, 'Email or password is incorrect');
  const tenant = await Tenant.findById(user.tenantId);
  if (!tenant || !tenant.isActive) throw httpError(403, 'This company account is not active');
  const token = jwt.sign({ sub: user.id, tenantId: String(user.tenantId), role: user.role, siteId: user.siteId ? String(user.siteId) : undefined }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  const site = user.siteId ? await ProjectSite.findOne({ _id: user.siteId, tenantId: user.tenantId }) : null;
  res.json({ token, user: publicUser(user, tenant, site) });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await User.findOne({ _id: req.user.id, tenantId: req.user.tenantId });
  if (!user) throw httpError(401, 'Account no longer exists');
  const tenant = await Tenant.findById(user.tenantId);
  const site = user.siteId ? await ProjectSite.findOne({ _id: user.siteId, tenantId: user.tenantId }) : null;
  res.json({ user: publicUser(user, tenant, site) });
}));
module.exports = router;
