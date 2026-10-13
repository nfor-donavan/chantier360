const router = require('express').Router();
const { ProjectSite, Task, PurchaseOrder, WorkforceCategory, Worker, MaterialLog, Tenant } = require('../models');
const { can, pickProject } = require('../middleware/auth');
const R = require('../services/records');
const { stockSummary } = require('../services/stock');
const { withPct } = require('../services/progress');
const { wrap } = require('../utils/http');

// Everything a foreman's phone needs to work offline: orders, tasks, stock list, workforce and recent deliveries.
router.get('/bootstrap', can('VIEW_PROGRESS'), wrap(async (req, res) => {
  const t = req.user.tenantId, siteId = pickProject(req, req.query.siteId);
  const [project, orders, tasks, categories, workers, deliveries] = await Promise.all([
    ProjectSite.findOne({ _id: siteId, tenantId: t }).select('siteName locationCity plannedWorkers').lean(),
    PurchaseOrder.find({ tenantId: t, siteId, status: 'Open' }).sort({ createdAt: -1 }).lean(),
    Task.find({ tenantId: t, siteId }).sort({ category: 1, createdAt: 1 }).lean(),
    WorkforceCategory.find({ tenantId: t }).sort({ order: 1 }).lean(),
    Worker.find({ tenantId: t, siteId, active: true }).sort({ category: 1, name: 1 }).select('uid name category').lean(),
    MaterialLog.find({ tenantId: t, siteId }).sort({ deliveryDate: -1, createdAt: -1 }).limit(40).lean(),
  ]);
  const tenant = await Tenant.findById(t).select('companyName logo').lean();
  const stock = req.has('VIEW_STOCK') ? (await stockSummary(t, siteId)).map((s) => ({ materialType: s.materialType, closing: s.closing })) : [];
  res.json({ company: tenant && { companyName: tenant.companyName, logoUrl: tenant.logo || null }, project, orders, categories, stock, workers,
    deliveries: deliveries.map((d) => ({ _id: d._id, materialType: d.materialType, supplierName: d.supplierName, unit: d.unit, quantityOrdered: d.quantityOrdered, quantityReceived: d.quantityReceived, deliveryDate: d.deliveryDate, notes: d.notes, orderId: d.orderId, flagged: d.flagged })),
    tasks: tasks.map(withPct).map((x) => ({ _id: x._id, name: x.name, category: x.category, subcontractor: x.subcontractor, unit: x.unit, totalQty: x.totalQty, cumulativeQty: x.cumulativeQty, progressPct: x.progressPct, calculatedPct: x.calculatedPct, reportedPct: x.reportedPct })) });
}));

// Receives everything a phone saved while offline. Every operation carries its own clientId, so resending a batch never repeats it.
// Order matters: workers are registered before attendance that refers to them, and deliveries are created before they are edited.
const OPS = [
  ['categories', 'MANAGE_WORKFORCE', R.createCategory],
  ['workers', 'MANAGE_WORKFORCE', R.createWorker],
  ['materialLogs', 'MANAGE_DELIVERIES', R.createMaterialLog],
  ['deliveryEdits', 'MANAGE_DELIVERIES', R.updateMaterialLog],
  ['deliveryDeletes', 'MANAGE_DELIVERIES', R.deleteMaterialLog],
  ['attendanceLogs', 'MANAGE_ATTENDANCE', R.createAttendance],
  ['workerRemovals', 'MANAGE_WORKFORCE', R.removeWorker],
  ['reports', 'SUBMIT_REPORTS', R.createReport],
  ['photos', 'UPLOAD_EVIDENCE', R.createPhoto],
];
router.post('/', wrap(async (req, res) => {
  const out = {};
  for (const [key, perm, fn] of OPS) {
    out[key] = [];
    for (const data of (req.body?.[key] || []).slice(0, 200)) {
      const clientId = data.clientId || data.uid;
      try {
        if (!req.has(perm)) throw Object.assign(new Error('Not allowed for your role'), { status: 403 });
        const siteId = pickProject(req, data.siteId);
        const doc = await fn({ tenantId: req.user.tenantId, userId: req.user.id, siteId, data: { ...data, status: undefined }, createdAt: data.createdAt && new Date(data.createdAt) });
        out[key].push({ clientId, result: 'created', id: doc._id, flagged: !!doc.flagged });
      } catch (e) {
        const already = e.code === 11000 || (key === 'deliveryDeletes' && e.status === 404) || (key === 'workerRemovals' && e.status === 404);
        out[key].push({ clientId, result: already ? 'duplicate' : 'error', error: already ? undefined : e.message });
      }
    }
  }
  res.json(out);
}));
module.exports = router;
