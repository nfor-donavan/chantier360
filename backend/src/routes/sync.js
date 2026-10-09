const router = require('express').Router();
const { ProjectSite, Task, PurchaseOrder, WorkforceCategory } = require('../models');
const { can, pickProject } = require('../middleware/auth');
const { createMaterialLog, createAttendance, createReport, createPhoto } = require('../services/records');
const { stockSummary } = require('../services/stock');
const { withPct } = require('../services/progress');
const { wrap } = require('../utils/http');

// Everything a foreman's phone needs to work offline: orders, tasks, stock list and workforce categories.
router.get('/bootstrap', can('VIEW_PROGRESS'), wrap(async (req, res) => {
  const t = req.user.tenantId, siteId = pickProject(req, req.query.siteId);
  const [project, orders, tasks, categories] = await Promise.all([
    ProjectSite.findOne({ _id: siteId, tenantId: t }).select('siteName locationCity plannedWorkers').lean(),
    PurchaseOrder.find({ tenantId: t, siteId, status: 'Open' }).sort({ createdAt: -1 }).lean(),
    Task.find({ tenantId: t, siteId }).sort({ category: 1, createdAt: 1 }).lean(),
    WorkforceCategory.find({ tenantId: t }).sort({ order: 1 }).lean(),
  ]);
  const stock = req.has('VIEW_STOCK') ? (await stockSummary(t, siteId)).map((s) => ({ materialType: s.materialType, closing: s.closing })) : [];
  res.json({ project, orders, categories, stock,
    tasks: tasks.map(withPct).map((x) => ({ _id: x._id, name: x.name, category: x.category, subcontractor: x.subcontractor, unit: x.unit, totalQty: x.totalQty, cumulativeQty: x.cumulativeQty, progressPct: x.progressPct })) });
}));

// Receives everything a phone saved while offline. Each record carries a clientId, so resending a batch never duplicates.
const TYPES = [
  ['materialLogs', 'MANAGE_DELIVERIES', createMaterialLog],
  ['attendanceLogs', 'MANAGE_ATTENDANCE', createAttendance],
  ['reports', 'SUBMIT_REPORTS', createReport],
  ['photos', 'UPLOAD_EVIDENCE', createPhoto],
];
router.post('/', wrap(async (req, res) => {
  const out = {};
  for (const [key, perm, fn] of TYPES) {
    out[key] = [];
    for (const data of (req.body?.[key] || []).slice(0, 200)) {
      try {
        if (!req.has(perm)) throw Object.assign(new Error('Not allowed for your role'), { status: 403 });
        const siteId = pickProject(req, data.siteId);
        const doc = await fn({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { ...data, status: undefined }, createdAt: data.createdAt && new Date(data.createdAt) });
        out[key].push({ clientId: data.clientId, result: 'created', id: doc._id, flagged: !!doc.flagged });
      } catch (e) {
        out[key].push({ clientId: data.clientId, result: e.code === 11000 ? 'duplicate' : 'error', error: e.code === 11000 ? undefined : e.message });
      }
    }
  }
  res.json(out);
}));
module.exports = router;
