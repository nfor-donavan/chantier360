// Populate options that keep the tenant guard satisfied and stay inside the caller's company.
module.exports = (req, path, select = 'name') => ({ path, select, match: { tenantId: req.user.tenantId } });
