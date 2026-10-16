const { StockEntry, MaterialMovement, ProjectSite, StorageLocation } = require('../models');
const { httpError } = require('../utils/http');
const { parseRef, filterOf, balanceOf, validateTransfer, entriesFor } = require('./transferRules');

async function describe(tenantId, ref) {
  const doc = ref.kind === 'site' ? await ProjectSite.findOne({ _id: ref.id, tenantId }).select('siteName') : await StorageLocation.findOne({ _id: ref.id, tenantId, active: true }).select('name');
  if (!doc) throw httpError(404, 'Location not found');
  return { ...ref, name: ref.kind === 'site' ? doc.siteName : doc.name };
}
const balanceAt = async (tenantId, ref, materialType) => balanceOf(await StockEntry.find({ tenantId, materialType, ...filterOf(ref) }).lean());

async function createTransfer({ tenantId, userId, data }) {
  const from = parseRef(data.from), to = parseRef(data.to);
  if (data.clientId) { const prev = await MaterialMovement.findOne({ tenantId, clientId: data.clientId }); if (prev) return prev; } // the same request sent twice
  const [src, dst] = [await describe(tenantId, from), await describe(tenantId, to)];
  const material = String(data.materialType || '').trim();
  const available = await balanceAt(tenantId, from, material);
  const quantity = validateTransfer({ from, to, quantity: data.quantity, materialType: material, available });
  const date = data.date ? new Date(data.date) : new Date();
  if (Number.isNaN(+date)) throw httpError(400, 'Invalid date');
  const mv = await MaterialMovement.create({ tenantId, clientId: data.clientId, materialType: material, quantity, unit: data.unit, from: src, to: dst, date, reason: data.reason, reference: data.reference, evidenceUrl: data.evidenceUrl, createdBy: userId });
  const entries = await StockEntry.create(entriesFor({ tenantId, materialType: material, quantity, from, to, fromName: src.name, toName: dst.name, date, refId: String(mv._id) }));
  // Two transfers racing for the same stock: re-check after writing and undo this one if the source went negative.
  if ((await balanceAt(tenantId, from, material)) < 0) {
    await StockEntry.deleteMany({ tenantId, _id: { $in: entries.map((e) => e._id) } }); await MaterialMovement.deleteOne({ _id: mv._id, tenantId });
    throw httpError(409, 'The stock changed while saving. Check the balance and try again.');
  }
  return mv;
}
module.exports = { parseRef, filterOf, balanceOf, validateTransfer, balanceAt, createTransfer };
