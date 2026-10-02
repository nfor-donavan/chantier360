const { Alert, MaterialLog } = require('../models');

const raise = (tenantId, siteId, kind, severity, message, refId) =>
  Alert.updateOne({ tenantId, kind, refId }, { $setOnInsert: { tenantId, siteId, kind, severity, message, refId } }, { upsert: true });

// Runs every time a delivery is saved or synced from a phone.
async function checkDelivery(log, site) {
  const ordered = log.quantityOrdered, received = log.quantityReceived;
  if (received < ordered) {
    const pct = ((ordered - received) / ordered) * 100;
    await raise(log.tenantId, log.siteId, 'Short delivery', pct >= 8 ? 'High' : 'Medium',
      `${log.materialType}: ${received} of ${ordered} received (${pct.toFixed(1)}% short)${log.supplierName ? ' from ' + log.supplierName : ''} at ${site.siteName}.`, `mat:${log._id}`);
    await checkSupplierPattern(log);
  } else if (received > ordered) {
    await raise(log.tenantId, log.siteId, 'Over-delivery', 'Low',
      `${log.materialType}: ${received} received against ${ordered} ordered at ${site.siteName}. Confirm with the supplier.`, `mat:${log._id}`);
  }
}

// Three or more short deliveries from one supplier in 30 days points to a pattern, not bad luck.
async function checkSupplierPattern(log) {
  if (!log.supplierName) return;
  const since = new Date(Date.now() - 30 * 864e5);
  const n = await MaterialLog.countDocuments({ tenantId: log.tenantId, supplierName: log.supplierName, flagged: true, createdAt: { $gte: since } });
  if (n >= 3) {
    const month = new Date().toISOString().slice(0, 7);
    await raise(log.tenantId, log.siteId, 'Repeat shortfall', 'High', `${log.supplierName} delivered short ${n} times in the last 30 days. Review this supplier.`, `sup:${log.supplierName}:${month}`);
  }
}

async function checkAttendance(log, site) {
  if (log.expectedWorkers > 0 && log.totalWorkersPresent > log.expectedWorkers * 1.1) {
    await raise(log.tenantId, log.siteId, 'Headcount anomaly', 'High',
      `${log.totalWorkersPresent} workers logged against ${log.expectedWorkers} planned at ${site.siteName}. Check the site photo before approving payroll.`, `att:${log._id}`);
  }
}

module.exports = { checkDelivery, checkAttendance };
