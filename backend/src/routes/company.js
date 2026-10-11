const router = require('express').Router();
const { Tenant } = require('../models');
const { can } = require('../middleware/auth');
const { httpError, wrap } = require('../utils/http');

const view = (t) => ({ companyName: t.companyName, logoUrl: t.logo || null });
router.get('/', wrap(async (req, res) => { res.json(view(await Tenant.findById(req.user.tenantId))); }));

// The company name and logo appear in the header, on printed reports, in the client portal and on the foreman app.
router.patch('/', can('MANAGE_COMPANY'), wrap(async (req, res) => {
  const set = {};
  if (req.body.companyName !== undefined) {
    const name = String(req.body.companyName).trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 80) throw httpError(400, 'Enter the company name (2 to 80 characters)');
    set.companyName = name;
  }
  if (req.body.logoUrl !== undefined) {
    if (req.body.logoUrl === null || req.body.logoUrl === '') set.logo = null;
    else {
      const l = String(req.body.logoUrl);
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(l)) throw httpError(400, 'The logo must be a PNG, JPG or WebP image');
      if (l.length > 600000) throw httpError(400, 'The logo is too large. Use an image under about 400 KB.');
      set.logo = l;
    }
  }
  const t = await Tenant.findByIdAndUpdate(req.user.tenantId, set, { new: true });
  res.json(view(t));
}));
module.exports = router;
