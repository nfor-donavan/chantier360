const mongoose = require('mongoose');
// Adds tenantId to a schema and refuses any query that does not filter by it,
// so a forgotten filter can never leak one company's data to another.
module.exports = function tenantScope(schema) {
  schema.add({ tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true } });
  ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments'].forEach((op) => {
    schema.pre(op, function (next) {
      if (this.getOptions().skipTenant || (this.getFilter() && this.getFilter().tenantId)) return next();
      next(new Error(`Tenant scope missing on ${this.model.modelName}.${op}`));
    });
  });
};
