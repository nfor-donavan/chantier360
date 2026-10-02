const mongoose = require('mongoose');
const tenantScope = require('../plugins/tenantScope');
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });

const Tenant = mongoose.model('Tenant', new Schema({
  companyName: { type: String, required: true },
  officeAddress: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true }));

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['executive', 'admin', 'project_manager', 'foreman'], required: true },
  title: String,
  siteId: ref('ProjectSite'), // foremen are bound to one site
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
userSchema.plugin(tenantScope);
const User = mongoose.model('User', userSchema);

const siteSchema = new Schema({
  siteName: { type: String, required: true },
  locationCity: { type: String, required: true },
  budgetXAF: { type: Number, required: true, min: 0 },
  spentXAF: { type: Number, default: 0, min: 0 },
  progressPct: { type: Number, default: 0, min: 0, max: 100 },
  plannedWorkers: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: Date,
  status: { type: String, enum: ['Planning', 'Active', 'Suspended', 'Completed'], default: 'Active' },
}, { timestamps: true });
siteSchema.plugin(tenantScope);
const ProjectSite = mongoose.model('ProjectSite', siteSchema);

const materialSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true },
  clientId: String, // generated on the phone so retries never create duplicates
  materialType: { type: String, required: true },
  quantityOrdered: { type: Number, required: true, min: 0 },
  quantityReceived: { type: Number, required: true, min: 0 },
  shortfall: { type: Number, default: 0 },
  flagged: { type: Boolean, default: false },
  supplierName: String,
  deliveryNotePhotoUrl: String,
  loggedBy: ref('User'),
}, { timestamps: true });
materialSchema.plugin(tenantScope);
materialSchema.index({ tenantId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });
materialSchema.index({ tenantId: 1, siteId: 1, createdAt: -1 });
const MaterialLog = mongoose.model('MaterialLog', materialSchema);

const attendanceSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true },
  clientId: String,
  date: { type: Date, default: Date.now },
  totalWorkersPresent: { type: Number, required: true, min: 0 },
  expectedWorkers: { type: Number, default: 0 },
  ratePerWorkerXAF: { type: Number, required: true, min: 0 },
  totalPayoutXAF: { type: Number, required: true },
  siteGroupPhotoUrl: String,
  flagged: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending_HQ_Approval', 'Approved', 'Rejected'], default: 'Pending_HQ_Approval' },
  loggedBy: ref('User'),
  decidedBy: ref('User'),
  decidedAt: Date,
}, { timestamps: true });
attendanceSchema.plugin(tenantScope);
attendanceSchema.index({ tenantId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });
attendanceSchema.index({ tenantId: 1, siteId: 1, date: -1 });
const AttendanceLog = mongoose.model('AttendanceLog', attendanceSchema);

const requestSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true },
  materialType: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  estimateXAF: { type: Number, default: 0 },
  requestedBy: ref('User'),
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  decidedBy: ref('User'),
  decidedAt: Date,
}, { timestamps: true });
requestSchema.plugin(tenantScope);
const MaterialRequest = mongoose.model('MaterialRequest', requestSchema);

const alertSchema = new Schema({
  siteId: ref('ProjectSite'),
  kind: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  message: { type: String, required: true },
  refId: { type: String, required: true }, // what triggered it; keeps alerts unique
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: ref('User'),
  acknowledgedAt: Date,
}, { timestamps: true });
alertSchema.plugin(tenantScope);
alertSchema.index({ tenantId: 1, kind: 1, refId: 1 }, { unique: true });
alertSchema.index({ tenantId: 1, acknowledged: 1, createdAt: -1 });
const Alert = mongoose.model('Alert', alertSchema);

module.exports = { Tenant, User, ProjectSite, MaterialLog, AttendanceLog, MaterialRequest, Alert };
