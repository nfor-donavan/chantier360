const { MaterialLog, AttendanceLog, ProjectSite, PurchaseOrder, StockEntry, DailyReport, ProjectPhoto, Task } = require('../models');
const { httpError } = require('../utils/http');
const discrepancy = require('./discrepancy');
const { recomputeProgress, weekKey } = require('./progress');

const num = (v, name) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw httpError(400, `${name} must be a number of 0 or more`); return n; };
const getSite = async (tenantId, siteId) => { const s = await ProjectSite.findOne({ _id: siteId, tenantId }); if (!s) throw httpError(404, 'Project not found'); return s; };

async function createMaterialLog({ tenantId, userId, siteId, data, createdAt }) {
  const site = await getSite(tenantId, siteId);
  let { materialType, supplierName, quantityOrdered } = data;
  let order = null;
  if (data.orderId) {
    // The ordered quantity always comes from HQ's purchase order, never from the phone.
    order = await PurchaseOrder.findOne({ _id: data.orderId, tenantId, siteId });
    if (!order) throw httpError(404, 'Purchase order not found for this project');
    ({ materialType, supplierName, quantityOrdered } = order);
  }
  if (!materialType) throw httpError(400, 'materialType is required');
  const ordered = num(quantityOrdered, 'quantityOrdered'), received = num(data.quantityReceived, 'quantityReceived');
  const doc = await MaterialLog.create({
    tenantId, siteId, loggedBy: userId, clientId: data.clientId, orderId: order?._id, materialType, supplierName,
    deliveryNotePhotoUrl: data.deliveryNotePhotoUrl, quantityOrdered: ordered, quantityReceived: received,
    shortfall: Math.max(0, ordered - received), flagged: received < ordered, ...(createdAt && { createdAt }),
  });
  if (order) await PurchaseOrder.updateOne({ _id: order._id, tenantId }, { status: 'Received' });
  await StockEntry.create({ tenantId, siteId, materialType, kind: 'in', quantity: received, source: 'delivery', refId: String(doc._id), date: createdAt || new Date() });
  await discrepancy.checkDelivery(doc, site);
  return doc;
}

async function createAttendance({ tenantId, userId, siteId, data, createdAt }) {
  const site = await getSite(tenantId, siteId);
  const breakdown = (Array.isArray(data.breakdown) ? data.breakdown : []).filter((b) => b && b.category).map((b) => ({ category: String(b.category), count: num(b.count, 'count') }));
  const present = data.totalWorkersPresent != null ? num(data.totalWorkersPresent, 'totalWorkersPresent') : breakdown.reduce((a, b) => a + b.count, 0);
  const doc = await AttendanceLog.create({
    tenantId, siteId, loggedBy: userId, clientId: data.clientId, date: data.date || createdAt || new Date(),
    totalWorkersPresent: present, expectedWorkers: site.plannedWorkers, breakdown, siteGroupPhotoUrl: data.siteGroupPhotoUrl,
    flagged: site.plannedWorkers > 0 && present > site.plannedWorkers * 1.1,
    ...(data.status && { status: data.status }), ...(createdAt && { createdAt }),
  });
  await discrepancy.checkAttendance(doc, site);
  return doc;
}

async function createPhoto({ tenantId, userId, siteId, data, createdAt }) {
  await getSite(tenantId, siteId);
  if (!data.url && !data.photoUrl) throw httpError(400, 'Photo is required');
  return ProjectPhoto.create({ tenantId, siteId, uploadedBy: userId, clientId: data.clientId, url: data.url || data.photoUrl, caption: data.caption,
    taskId: data.taskId || undefined, takenAt: data.takenAt || createdAt || new Date(), clientVisible: false });
}

// A daily report is the foreman's one submission. It also moves task progress and stock.
async function createReport({ tenantId, userId, siteId, data, createdAt, skipEffects }) {
  await getSite(tenantId, siteId);
  const date = data.date ? new Date(data.date) : createdAt || new Date();
  const work = (data.workPerformed || []).filter((w) => w && w.quantity > 0).map((w) => ({ taskId: w.taskId, taskName: w.taskName, quantity: num(w.quantity, 'quantity'), unit: w.unit, note: w.note }));
  const used = (data.materialsUsed || []).filter((m) => m && m.materialType && m.quantity > 0).map((m) => ({ materialType: m.materialType, quantity: num(m.quantity, 'quantity') }));
  const doc = await DailyReport.create({
    tenantId, siteId, submittedBy: userId, clientId: data.clientId, date, objectives: data.objectives, tomorrowPlan: data.tomorrowPlan, observations: data.observations, ordersNote: data.ordersNote,
    siteCash: data.siteCash && (data.siteCash.opening != null || data.siteCash.expenses != null) ? { opening: Number(data.siteCash.opening) || 0, expenses: Number(data.siteCash.expenses) || 0 } : undefined,
    workPerformed: work, materialsUsed: used,
    stockMovements: (data.stockMovements || []).filter((m) => m && m.materialType && m.quantity > 0 && ['in', 'out'].includes(m.kind)).map((m) => ({ materialType: m.materialType, kind: m.kind, quantity: num(m.quantity, 'quantity'), party: m.party })),
    workforce: (data.workforce || []).filter((w) => w && w.category && w.count > 0).map((w) => ({ category: w.category, count: num(w.count, 'count') })),
    difficulties: (data.difficulties || []).filter((d) => d && d.issue), photoUrls: (data.photoUrls || []).filter(Boolean), ...(createdAt && { createdAt }),
  });
  if (skipEffects) return doc;
  for (const w of work) {
    if (!w.taskId) continue;
    const task = await Task.findOne({ _id: w.taskId, tenantId, siteId });
    if (!task) continue;
    const wk = weekKey(date);
    if (task.weekKey !== wk) { task.weeklyQty = 0; task.weekKey = wk; }
    task.weeklyQty += w.quantity; task.cumulativeQty += w.quantity;
    await task.save();
  }
  if (work.length) await recomputeProgress(tenantId, siteId);
  // Equipment and materials "used" is a record only. Stock changes come from the explicit entries and exits.
  for (const m of doc.stockMovements) await StockEntry.create({ tenantId, siteId, materialType: m.materialType, kind: m.kind, quantity: m.quantity, party: m.party, source: 'report', refId: String(doc._id), date });
  for (const url of doc.photoUrls) await ProjectPhoto.create({ tenantId, siteId, uploadedBy: userId, url, caption: 'Daily report', takenAt: date, clientVisible: false });
  return doc;
}
module.exports = { createMaterialLog, createAttendance, createPhoto, createReport };
