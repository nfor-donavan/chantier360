const { MaterialLog, AttendanceLog, ProjectSite } = require('../models');
const { httpError } = require('../utils/http');
const discrepancy = require('./discrepancy');

const num = (v, name) => { const n = Number(v); if (!Number.isFinite(n) || n < 0) throw httpError(400, `${name} must be a number of 0 or more`); return n; };

async function createMaterialLog({ tenantId, userId, siteId, data, createdAt }) {
  const site = await ProjectSite.findOne({ _id: siteId, tenantId });
  if (!site) throw httpError(404, 'Site not found');
  if (!data.materialType) throw httpError(400, 'materialType is required');
  const ordered = num(data.quantityOrdered, 'quantityOrdered'), received = num(data.quantityReceived, 'quantityReceived');
  const doc = await MaterialLog.create({
    tenantId, siteId, loggedBy: userId, clientId: data.clientId,
    materialType: data.materialType, supplierName: data.supplierName, deliveryNotePhotoUrl: data.deliveryNotePhotoUrl,
    quantityOrdered: ordered, quantityReceived: received,
    shortfall: Math.max(0, ordered - received), flagged: received < ordered,
    ...(createdAt && { createdAt }),
  });
  await discrepancy.checkDelivery(doc, site);
  return doc;
}

async function createAttendance({ tenantId, userId, siteId, data, createdAt }) {
  const site = await ProjectSite.findOne({ _id: siteId, tenantId });
  if (!site) throw httpError(404, 'Site not found');
  const present = num(data.totalWorkersPresent, 'totalWorkersPresent'), rate = num(data.ratePerWorkerXAF, 'ratePerWorkerXAF');
  const doc = await AttendanceLog.create({
    tenantId, siteId, loggedBy: userId, clientId: data.clientId,
    date: data.date || createdAt || new Date(), totalWorkersPresent: present, expectedWorkers: site.plannedWorkers,
    ratePerWorkerXAF: rate, totalPayoutXAF: present * rate, siteGroupPhotoUrl: data.siteGroupPhotoUrl,
    flagged: site.plannedWorkers > 0 && present > site.plannedWorkers * 1.1,
    ...(data.status && { status: data.status }), ...(createdAt && { createdAt }),
  });
  await discrepancy.checkAttendance(doc, site);
  return doc;
}

module.exports = { createMaterialLog, createAttendance };
