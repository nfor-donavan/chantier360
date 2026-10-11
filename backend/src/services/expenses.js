const { Expense, ProjectSite } = require('../models');
// When a project has expense records, "spent" is their total, so the budget figures can never disagree with the records.
async function recomputeSpent(tenantId, siteId) {
  const list = await Expense.find({ tenantId, siteId }).select('amountXAF').lean();
  if (list.length) await ProjectSite.updateOne({ _id: siteId, tenantId }, { spentXAF: list.reduce((a, e) => a + e.amountXAF, 0), spentSource: 'expenses' });
  else await ProjectSite.updateOne({ _id: siteId, tenantId }, { spentSource: 'manual' });
}
module.exports = { recomputeSpent };
