const { httpError } = require('../utils/http');

const parseRef = (s) => { const [kind, id] = String(s || '').split(':'); if (!['site', 'loc'].includes(kind) || !id) throw httpError(400, 'Choose a valid location'); return { kind, id }; };
const filterOf = (ref) => (ref.kind === 'site' ? { siteId: ref.id, locationId: null } : { locationId: ref.id });
const balanceOf = (rows) => rows.reduce((a, r) => a + (r.kind === 'out' ? -r.quantity : r.quantity), 0); // opening and in add, out subtracts

// Pure rules, tested without a database.
function validateTransfer({ from, to, quantity, materialType, available }) {
  if (!materialType || !String(materialType).trim()) throw httpError(400, 'Choose the material');
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) throw httpError(400, 'The quantity must be more than 0');
  if (from && to && from.kind === to.kind && String(from.id) === String(to.id)) throw httpError(400, 'The source and the destination must be different');
  if (available !== undefined && q > available) throw httpError(409, `Not enough stock at the source: ${available} available, ${q} requested.`);
  return q;
}
// A transfer is always exactly one exit at the source and one entry at the destination, marked as a transfer (never a purchase).
const entriesFor = ({ tenantId, materialType, quantity, from, to, fromName, toName, date, refId }) => {
  const base = { tenantId, materialType, quantity, source: 'transfer', refId, date };
  return [{ ...base, kind: 'out', party: toName, ...(from.kind === 'site' ? { siteId: from.id } : { locationId: from.id }) },
    { ...base, kind: 'in', party: fromName, ...(to.kind === 'site' ? { siteId: to.id } : { locationId: to.id }) }];
};
module.exports = { parseRef, filterOf, balanceOf, validateTransfer, entriesFor };
