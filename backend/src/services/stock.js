const { StockEntry } = require('../models');
const { summarize } = require('./stockMath');

// A project's own stock has no locationId. Warehouses and other locations are keyed by locationId.
async function stockSummary(tenantId, siteId) { return summarize(await StockEntry.find({ tenantId, siteId, locationId: null }).lean()); }
async function locationSummary(tenantId, locationId) { return summarize(await StockEntry.find({ tenantId, locationId }).lean()); }
module.exports = { stockSummary, locationSummary, summarize };
