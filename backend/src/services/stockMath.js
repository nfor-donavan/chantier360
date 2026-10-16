// Closing stock = opening + deliveries/entries + transfers in - exits - transfers out, per material.
// Transfers between locations are kept in their own columns so they are never mistaken for purchases.
function summarize(rows) {
  const m = {};
  rows.forEach((r) => {
    const x = (m[r.materialType] ||= { materialType: r.materialType, opening: 0, incoming: 0, transferIn: 0, outgoing: 0, transferOut: 0 });
    if (r.kind === 'opening') x.opening += r.quantity;
    else if (r.source === 'transfer') x[r.kind === 'in' ? 'transferIn' : 'transferOut'] += r.quantity;
    else x[r.kind === 'in' ? 'incoming' : 'outgoing'] += r.quantity;
  });
  return Object.values(m).map((x) => ({ ...x, closing: x.opening + x.incoming + x.transferIn - x.outgoing - x.transferOut })).sort((a, b) => a.materialType.localeCompare(b.materialType));
}
module.exports = { summarize };
