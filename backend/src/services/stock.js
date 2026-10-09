const { StockEntry } = require('../models');
// Closing stock = opening + incoming - outgoing, per material.
async function stockSummary(tenantId, siteId) {
  const rows = await StockEntry.find({ tenantId, siteId }).lean();
  const m = {};
  rows.forEach((r) => { const x = (m[r.materialType] ||= { materialType: r.materialType, opening: 0, incoming: 0, outgoing: 0 }); x[{ opening: 'opening', in: 'incoming', out: 'outgoing' }[r.kind]] += r.quantity; });
  return Object.values(m).map((x) => ({ ...x, closing: x.opening + x.incoming - x.outgoing })).sort((a, b) => a.materialType.localeCompare(b.materialType));
}
module.exports = { stockSummary };
