const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Role, User, Client, WorkforceCategory, ProjectSite } = require('../models');
const { PERMISSIONS } = require('../permissions');
const { can, clearRoleCache } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');

// Roles and permissions (the access matrix)
router.get('/roles', can('MANAGE_USERS'), wrap(async (req, res) => {
  res.json({ permissions: PERMISSIONS, roles: await Role.find({ tenantId: req.user.tenantId }).select('key label permissions').lean() });
}));
router.put('/roles/:key', can('MANAGE_USERS'), wrap(async (req, res) => {
  const perms = [...new Set(req.body.permissions || [])];
  if (perms.some((p) => !PERMISSIONS.includes(p))) throw httpError(400, 'Unknown permission');
  if (req.params.key === 'director') ['MANAGE_USERS', 'VIEW_ALL_PROJECTS'].forEach((p) => { if (!perms.includes(p)) throw httpError(400, `The General Director must keep ${p}`); });
  const r = await Role.findOneAndUpdate({ tenantId: req.user.tenantId, key: req.params.key }, { permissions: perms }, { new: true });
  if (!r) throw httpError(404, 'Role not found');
  clearRoleCache();
  res.json(r);
}));

// Users
router.get('/users', can('MANAGE_USERS'), wrap(async (req, res) => {
  res.json(await User.find({ tenantId: req.user.tenantId }).select('-passwordHash').sort({ createdAt: 1 }).lean());
}));
router.post('/users', can('MANAGE_USERS'), wrap(async (req, res) => {
  const { name, email, password, role, projectIds, client, title } = req.body;
  if (!name || !email || !password || password.length < 6) throw httpError(400, 'Name, email and a password of at least 6 characters are required');
  if (!(await Role.findOne({ tenantId: req.user.tenantId, key: role }))) throw httpError(400, 'Unknown role');
  const ids = projectIds || [];
  if (ids.length && (await ProjectSite.countDocuments({ tenantId: req.user.tenantId, _id: { $in: ids } })) !== ids.length) throw httpError(400, 'Unknown project');
  const u = await User.create({ tenantId: req.user.tenantId, name, email, title, role, projectIds: ids, client: client || undefined, passwordHash: await bcrypt.hash(password, 10) });
  const { passwordHash, ...safe } = u.toObject();
  res.status(201).json(safe);
}));
router.patch('/users/:id', can('MANAGE_USERS'), wrap(async (req, res) => {
  if (req.params.id === req.user.id && (req.body.role !== undefined || req.body.isActive === false)) throw httpError(400, 'You cannot change your own role or deactivate yourself');
  const set = {};
  ['name', 'title', 'isActive', 'projectIds', 'client'].forEach((k) => { if (req.body[k] !== undefined) set[k] = req.body[k] === '' ? null : req.body[k]; });
  if (req.body.role) { if (!(await Role.findOne({ tenantId: req.user.tenantId, key: req.body.role }))) throw httpError(400, 'Unknown role'); set.role = req.body.role; }
  if (req.body.password) { if (req.body.password.length < 6) throw httpError(400, 'Password too short'); set.passwordHash = await bcrypt.hash(req.body.password, 10); }
  const u = await User.findOneAndUpdate({ _id: req.params.id, tenantId: req.user.tenantId }, set, { new: true }).select('-passwordHash');
  if (!u) throw httpError(404, 'User not found');
  res.json(u);
}));

// Workforce categories: configurable per company
router.get('/workforce-categories', wrap(async (req, res) => { res.json(await WorkforceCategory.find({ tenantId: req.user.tenantId }).sort({ order: 1 }).lean()); }));
router.post('/workforce-categories', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  if (!req.body.name) throw httpError(400, 'name is required');
  res.status(201).json(await WorkforceCategory.create({ tenantId: req.user.tenantId, name: req.body.name, order: req.body.order || 99 }));
}));
router.delete('/workforce-categories/:id', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  await WorkforceCategory.deleteOne({ _id: req.params.id, tenantId: req.user.tenantId });
  res.json({ ok: true });
}));

// Clients (the companies or people who own projects)
router.get('/clients', can('MANAGE_PROJECTS', 'MANAGE_CLIENT_PORTAL', 'MANAGE_USERS'), wrap(async (req, res) => { res.json(await Client.find({ tenantId: req.user.tenantId }).sort({ name: 1 }).lean()); }));
router.post('/clients', can('MANAGE_PROJECTS'), wrap(async (req, res) => {
  if (!req.body.name) throw httpError(400, 'name is required');
  res.status(201).json(await Client.create({ tenantId: req.user.tenantId, name: req.body.name, contactName: req.body.contactName, email: req.body.email, country: req.body.country }));
}));
module.exports = router;
