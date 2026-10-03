const { Alert, MaterialLog } = require('../models');

const raise = (tenantId, siteId, kind, severity, message, messageFr, refId) =>
  Alert.updateOne({ tenantId, kind, refId }, { $setOnInsert: { tenantId, siteId, kind, severity, message, messageFr, refId } }, { upsert: true });

// Runs every time a delivery is saved or synced from a phone.
async function checkDelivery(log, site) {
  const o = log.quantityOrdered, r = log.quantityReceived, name = log.materialType, sup = log.supplierName;
  if (r < o) {
    const pct = ((o - r) / o) * 100;
    await raise(log.tenantId, log.siteId, 'Short delivery', pct >= 8 ? 'High' : 'Medium',
      `${name}: ${r} of ${o} received (${pct.toFixed(1)}% short)${sup ? ' from ' + sup : ''} at ${site.siteName}.`,
      `${name} : ${r} reçus sur ${o} commandés (${pct.toFixed(1)} % de manque)${sup ? ' chez ' + sup : ''} sur ${site.siteName}.`, `mat:${log._id}`);
    await checkSupplierPattern(log);
  } else if (r > o) {
    await raise(log.tenantId, log.siteId, 'Over-delivery', 'Low',
      `${name}: ${r} received against ${o} ordered at ${site.siteName}. Confirm with the supplier.`,
      `${name} : ${r} reçus pour ${o} commandés sur ${site.siteName}. À confirmer avec le fournisseur.`, `mat:${log._id}`);
  }
}

// Three or more short deliveries from one supplier in 30 days points to a pattern, not bad luck.
async function checkSupplierPattern(log) {
  if (!log.supplierName) return;
  const since = new Date(Date.now() - 30 * 864e5);
  const n = await MaterialLog.countDocuments({ tenantId: log.tenantId, supplierName: log.supplierName, flagged: true, createdAt: { $gte: since } });
  if (n >= 3) {
    const month = new Date().toISOString().slice(0, 7);
    await raise(log.tenantId, log.siteId, 'Repeat shortfall', 'High',
      `${log.supplierName} delivered short ${n} times in the last 30 days. Review this supplier.`,
      `${log.supplierName} a livré en dessous de la commande ${n} fois en 30 jours. Réexaminer ce fournisseur.`, `sup:${log.supplierName}:${month}`);
  }
}

async function checkAttendance(log, site) {
  if (log.expectedWorkers > 0 && log.totalWorkersPresent > log.expectedWorkers * 1.1) {
    await raise(log.tenantId, log.siteId, 'Headcount anomaly', 'High',
      `${log.totalWorkersPresent} workers logged against ${log.expectedWorkers} planned at ${site.siteName}. Check the site photo before approving payroll.`,
      `${log.totalWorkersPresent} ouvriers déclarés pour ${log.expectedWorkers} prévus sur ${site.siteName}. Vérifier la photo avant d'approuver la paie.`, `att:${log._id}`);
  }
}
module.exports = { checkDelivery, checkAttendance };
