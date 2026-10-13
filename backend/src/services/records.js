const crypto = require('crypto');
const { MaterialLog, AttendanceLog, ProjectSite, PurchaseOrder, StockEntry, DailyReport, ProjectPhoto, Task, Worker, WorkforceCategory, Alert } = require('../models');
const { httpError } = require('../utils/http');
const discrepancy = require('./discrepancy');
const { recomputeProgress, weekKey } = require('./progress');
const { stockSummary } = require('./stock');
const { audit } = require('./audit');
const { ensureWeek } = require('./weekly');

const num = (v, name) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw httpError(400, `${name} must be a number of 0 or more`); return n; };
const getSite = async (tenantId, siteId) => { const s = await ProjectSite.findOne({ _id: siteId, tenantId }); if (!s) throw httpError(404, 'Project not found'); return s; };
const nameKey = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const dayRange = (d) => { const a = new Date(d); a.setUTCHours(0, 0, 0, 0); return [a, new Date(+a + 864e5)]; };

// ---------- Workers: registering a worker is separate from recording attendance ----------
async function createWorker({ tenantId, userId, siteId, data }) {
  await getSite(tenantId, siteId);
  const name = String(data.name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) throw httpError(400, 'Enter the worker\'s full name');
  const category = String(data.category || '').trim();
  if (!category || !(await WorkforceCategory.findOne({ tenantId, name: category }))) throw httpError(400, 'Choose a workforce category');
  const uid = data.uid || crypto.randomUUID();
  const existing = await Worker.findOne({ tenantId, uid });
  if (existing) return existing; // the same request sent twice
  const dup = await Worker.findOne({ tenantId, siteId, nameKey: nameKey(name), active: true });
  if (dup) throw httpError(409, `${name} is already on this project's workforce`);
  return Worker.create({ tenantId, siteId, uid, name, nameKey: nameKey(name), category, phone: data.phone, createdBy: userId });
}
async function updateWorker({ tenantId, siteId, data }) {
  const w = await Worker.findOne({ tenantId, siteId, uid: data.uid });
  if (!w) throw httpError(404, 'Worker not found');
  if (data.name) {
    const name = String(data.name).trim().replace(/\s+/g, ' ');
    if (name.length < 2) throw httpError(400, 'Enter the worker\'s full name');
    if (w.active && (await Worker.findOne({ tenantId, siteId, nameKey: nameKey(name), active: true, uid: { $ne: w.uid } }))) throw httpError(409, `${name} is already on this project's workforce`);
    w.name = name; w.nameKey = nameKey(name);
  }
  if (data.category) { if (!(await WorkforceCategory.findOne({ tenantId, name: data.category }))) throw httpError(400, 'Unknown category'); w.category = data.category; }
  if (data.phone !== undefined) w.phone = data.phone;
  return w.save();
}
// Removing a worker only marks them inactive. Past attendance keeps the name it was recorded with.
async function removeWorker({ tenantId, userId, siteId, data }) {
  const w = await Worker.findOne({ tenantId, siteId, uid: data.uid });
  if (!w) throw httpError(404, 'Worker not found');
  if (!w.active) return w;
  w.active = false; w.removedAt = new Date(); w.removedBy = userId;
  await w.save();
  await audit(tenantId, userId, 'Worker', w.uid, 'remove', siteId, { name: w.name, category: w.category });
  return w;
}

// Categories are shared by the whole company. Adding one that already exists (ignoring case and accents) just returns the existing one.
async function createCategory({ tenantId, data }) {
  const name = String(data.name || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 40) throw httpError(400, 'Enter a category name (2 to 40 characters)');
  const list = await WorkforceCategory.find({ tenantId }).lean();
  const hit = list.find((c) => nameKey(c.name) === nameKey(name));
  if (hit) return hit;
  return WorkforceCategory.create({ tenantId, name, order: list.reduce((m, c) => Math.max(m, c.order || 0), 0) + 1 });
}

// ---------- Deliveries ----------
const assertStock = async (tenantId, siteId, material, extraOut = 0) => {
  const row = (await stockSummary(tenantId, siteId)).find((s) => s.materialType === material);
  if (row && row.closing - extraOut < 0) throw httpError(409, `Cannot apply this change: ${material} stock would drop below zero because some of it has already been used or has left the site.`);
};

async function createMaterialLog({ tenantId, userId, siteId, data, createdAt }) {
  const site = await getSite(tenantId, siteId);
  let { materialType, supplierName, quantityOrdered } = data;
  let order = null;
  if (data.orderId) {
    // The ordered quantity always comes from HQ's purchase order, never from the phone.
    order = await PurchaseOrder.findOne({ _id: data.orderId, tenantId, siteId });
    if (!order) throw httpError(404, 'Purchase order not found for this project');
    materialType = order.materialType; quantityOrdered = order.quantityOrdered;
    supplierName = String(data.supplierName || '').trim() || order.supplierName; // the company that actually delivered
  }
  supplierName = String(supplierName || '').trim();
  if (!materialType || !String(materialType).trim()) throw httpError(400, 'Describe the material');
  if (!supplierName) throw httpError(400, 'Enter the company, supplier or store that delivered');
  const received = num(data.quantityReceived, 'quantityReceived');
  const ordered = order ? num(quantityOrdered, 'quantityOrdered') : received; // an unplanned delivery has no order to compare with
  const date = data.deliveryDate ? new Date(data.deliveryDate) : createdAt || new Date();
  if (Number.isNaN(+date)) throw httpError(400, 'Invalid delivery date');
  const doc = await MaterialLog.create({
    tenantId, siteId, loggedBy: userId, clientId: data.clientId, orderId: order?._id, materialType: String(materialType).trim(), supplierName,
    unit: data.unit, notes: data.notes, deliveryDate: date, deliveryNotePhotoUrl: data.deliveryNotePhotoUrl,
    quantityOrdered: ordered, quantityReceived: received, shortfall: Math.max(0, ordered - received), flagged: received < ordered, ...(createdAt && { createdAt }),
  });
  if (order) await PurchaseOrder.updateOne({ _id: order._id, tenantId }, { status: 'Received' });
  await StockEntry.create({ tenantId, siteId, materialType: doc.materialType, kind: 'in', quantity: received, party: supplierName, source: 'delivery', refId: String(doc._id), date });
  await discrepancy.checkDelivery(doc, site);
  return doc;
}

// Editing a delivery corrects stock and alerts in the same step. If stock that was already used would go negative, it is refused.
async function updateMaterialLog({ tenantId, userId, siteId, data }) {
  const log = await MaterialLog.findOne({ _id: data.logId, tenantId });
  if (!log || String(log.siteId) !== String(siteId)) throw httpError(404, 'Delivery not found');
  const site = await getSite(tenantId, siteId), before = log.toObject();
  const entry = await StockEntry.findOne({ tenantId, refId: String(log._id), source: 'delivery' });
  const oldEntry = entry && entry.toObject();
  if (data.supplierName !== undefined) { const s = String(data.supplierName).trim(); if (!s) throw httpError(400, 'Enter the company, supplier or store that delivered'); log.supplierName = s; }
  if (data.unit !== undefined) log.unit = data.unit;
  if (data.notes !== undefined) log.notes = data.notes;
  if (data.deliveryNotePhotoUrl !== undefined) log.deliveryNotePhotoUrl = data.deliveryNotePhotoUrl;
  if (data.deliveryDate !== undefined) { const d = new Date(data.deliveryDate); if (Number.isNaN(+d)) throw httpError(400, 'Invalid delivery date'); log.deliveryDate = d; }
  if (data.materialType !== undefined && !log.orderId) { if (!String(data.materialType).trim()) throw httpError(400, 'Describe the material'); log.materialType = String(data.materialType).trim(); }
  if (data.quantityReceived !== undefined) log.quantityReceived = num(data.quantityReceived, 'quantityReceived');
  if (!log.orderId) log.quantityOrdered = log.quantityReceived;
  log.shortfall = Math.max(0, log.quantityOrdered - log.quantityReceived); log.flagged = log.quantityReceived < log.quantityOrdered;
  await log.save();
  if (entry) { entry.materialType = log.materialType; entry.quantity = log.quantityReceived; entry.date = log.deliveryDate; entry.party = log.supplierName; await entry.save(); }
  try {
    await assertStock(tenantId, siteId, log.materialType);
    if (before.materialType !== log.materialType) await assertStock(tenantId, siteId, before.materialType);
  } catch (e) { // put everything back
    log.set({ supplierName: before.supplierName, unit: before.unit, notes: before.notes, deliveryNotePhotoUrl: before.deliveryNotePhotoUrl, deliveryDate: before.deliveryDate, materialType: before.materialType, quantityReceived: before.quantityReceived, quantityOrdered: before.quantityOrdered, shortfall: before.shortfall, flagged: before.flagged }); await log.save();
    if (entry) { entry.set({ materialType: oldEntry.materialType, quantity: oldEntry.quantity, date: oldEntry.date, party: oldEntry.party }); await entry.save(); }
    throw e;
  }
  await Alert.deleteMany({ tenantId, refId: `mat:${log._id}` });
  await discrepancy.checkDelivery(log, site);
  await audit(tenantId, userId, 'MaterialLog', log._id, 'edit', siteId, { before, after: log.toObject() });
  return log;
}

async function deleteMaterialLog({ tenantId, userId, siteId, data }) {
  const log = await MaterialLog.findOne({ _id: data.logId, tenantId });
  if (!log || String(log.siteId) !== String(siteId)) throw httpError(404, 'Delivery not found');
  await assertStock(tenantId, siteId, log.materialType, log.quantityReceived);
  await StockEntry.deleteMany({ tenantId, refId: String(log._id), source: 'delivery' });
  await Alert.deleteMany({ tenantId, refId: `mat:${log._id}` });
  if (log.orderId && !(await MaterialLog.findOne({ tenantId, orderId: log.orderId, _id: { $ne: log._id } }))) await PurchaseOrder.updateOne({ _id: log.orderId, tenantId }, { status: 'Open' });
  await audit(tenantId, userId, 'MaterialLog', log._id, 'delete', siteId, log.toObject());
  await MaterialLog.deleteOne({ _id: log._id, tenantId });
  return { _id: log._id, deleted: true };
}

// ---------- Attendance ----------
async function createAttendance({ tenantId, userId, siteId, data, createdAt }) {
  const site = await getSite(tenantId, siteId);
  const date = data.date ? new Date(data.date) : createdAt || new Date();
  let workers = [], breakdown = [], present;
  if (Array.isArray(data.workers) && data.workers.length) {
    const uids = [...new Set(data.workers.map((w) => (typeof w === 'string' ? w : w.uid)))];
    const found = await Worker.find({ tenantId, siteId, uid: { $in: uids } }).lean();
    if (found.length !== uids.length) throw httpError(400, 'One of the selected workers is not registered on this project');
    const gone = found.find((w) => !w.active && w.removedAt && w.removedAt < date);
    if (gone) throw httpError(400, `${gone.name} was removed from the workforce before this date`);
    const [a, b] = dayRange(date);
    const clash = await AttendanceLog.findOne({ tenantId, siteId, date: { $gte: a, $lt: b }, status: { $ne: 'Rejected' }, 'workers.uid': { $in: uids } }).lean();
    if (clash) { const w = clash.workers.find((x) => uids.includes(x.uid)); throw httpError(409, `${w.name} is already recorded present on this day`); }
    workers = found.map((w) => ({ uid: w.uid, name: w.name, category: w.category }));
    const cats = {}; workers.forEach((w) => { cats[w.category] = (cats[w.category] || 0) + 1; });
    breakdown = Object.entries(cats).map(([category, count]) => ({ category, count }));
    present = workers.length;
  } else {
    breakdown = (Array.isArray(data.breakdown) ? data.breakdown : []).filter((b) => b && b.category).map((b) => ({ category: String(b.category), count: num(b.count, 'count') }));
    present = data.totalWorkersPresent != null ? num(data.totalWorkersPresent, 'totalWorkersPresent') : breakdown.reduce((a, b) => a + b.count, 0);
  }
  const doc = await AttendanceLog.create({
    tenantId, siteId, loggedBy: userId, clientId: data.clientId, date, totalWorkersPresent: present, expectedWorkers: site.plannedWorkers, breakdown, workers,
    siteGroupPhotoUrl: data.siteGroupPhotoUrl, flagged: site.plannedWorkers > 0 && present > site.plannedWorkers * 1.1,
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

// ---------- Daily report ----------
const pct = (v) => { if (v === '' || v == null) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0 || n > 100) throw httpError(400, 'A percentage must be between 0 and 100'); return n; };
const cleanMedia = (list, userId) => (list || []).filter((m) => m && m.url).map((m) => ({ url: m.url, kind: m.kind === 'video' ? 'video' : 'photo', mime: m.mime, size: m.size, caption: m.caption, uploadedBy: userId, clientVisible: false }));

async function createReport({ tenantId, userId, siteId, data, createdAt, skipEffects }) {
  await getSite(tenantId, siteId);
  const date = data.date ? new Date(data.date) : createdAt || new Date();
  const work = (data.workPerformed || []).filter((w) => w && (Number(w.quantity) > 0 || (w.progressPct !== '' && w.progressPct != null)))
    .map((w) => ({ taskId: w.taskId, taskName: w.taskName, quantity: w.quantity ? num(w.quantity, 'quantity') : 0, unit: w.unit, progressPct: pct(w.progressPct) ?? undefined, note: w.note }));
  const used = (data.materialsUsed || []).filter((m) => m && m.materialType && m.quantity > 0).map((m) => ({ materialType: m.materialType, quantity: num(m.quantity, 'quantity') }));
  const media = cleanMedia([...(data.media || []), ...(data.photoUrls || []).map((url) => ({ url, kind: 'photo' }))], userId);
  const doc = await DailyReport.create({
    tenantId, siteId, submittedBy: userId, clientId: data.clientId, date, objectives: data.objectives, tomorrowPlan: data.tomorrowPlan, observations: data.observations, ordersNote: data.ordersNote,
    siteCash: data.siteCash && (data.siteCash.opening != null || data.siteCash.expenses != null) ? { opening: Number(data.siteCash.opening) || 0, expenses: Number(data.siteCash.expenses) || 0 } : undefined,
    workPerformed: work, materialsUsed: used,
    stockMovements: (data.stockMovements || []).filter((m) => m && m.materialType && m.quantity > 0 && ['in', 'out'].includes(m.kind)).map((m) => ({ materialType: m.materialType, kind: m.kind, quantity: num(m.quantity, 'quantity'), party: m.party })),
    workforce: (data.workforce || []).filter((w) => w && w.category && w.count > 0).map((w) => ({ category: w.category, count: num(w.count, 'count') })),
    difficulties: (data.difficulties || []).filter((d) => d && d.issue), media, ...(createdAt && { createdAt }),
  });
  if (skipEffects) return doc;
  for (const w of work) {
    if (!w.taskId) continue;
    const task = await Task.findOne({ _id: w.taskId, tenantId, siteId });
    if (!task) continue;
    if (w.quantity > 0) {
      const wk = weekKey(date);
      if (task.weekKey !== wk) { task.weeklyQty = 0; task.weekKey = wk; }
      task.weeklyQty += w.quantity; task.cumulativeQty += w.quantity;
    }
    if (w.progressPct != null) { task.reportedPct = w.progressPct; task.reportedBy = userId; task.reportedAt = new Date(); } // saved exactly as entered
    await task.save();
  }
  if (work.length) await recomputeProgress(tenantId, siteId);
  // Equipment and materials "used" is a record only. Stock changes come from the explicit entries and exits.
  for (const m of doc.stockMovements) await StockEntry.create({ tenantId, siteId, materialType: m.materialType, kind: m.kind, quantity: m.quantity, party: m.party, source: 'report', refId: String(doc._id), date });
  await ensureWeek(tenantId, siteId, date, userId).catch(() => {}); // the weekly report builds and refreshes itself; a failure here never blocks the daily report
  return doc;
}
module.exports = { createCategory, createWorker, updateWorker, removeWorker, createMaterialLog, updateMaterialLog, deleteMaterialLog, createAttendance, createPhoto, createReport };
