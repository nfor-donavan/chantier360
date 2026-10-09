const mongoose = require('mongoose');
const tenantScope = require('../plugins/tenantScope');
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });
const scoped = (name, schema) => { schema.plugin(tenantScope); return mongoose.model(name, schema); };
const partialUnique = (schema) => schema.index({ tenantId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

const Tenant = mongoose.model('Tenant', new Schema({
  companyName: { type: String, required: true }, officeAddress: String, isActive: { type: Boolean, default: true },
}, { timestamps: true }));

const roleSchema = new Schema({ key: { type: String, required: true }, label: String, permissions: [String] }, { timestamps: true });
roleSchema.index({ tenantId: 1, key: 1 }, { unique: true });
const Role = scoped('Role', roleSchema);

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true },         // key of a Role
  title: String,
  projectIds: [ref('ProjectSite')],               // projects this person can see (ignored with VIEW_ALL_PROJECTS)
  client: ref('Client'),                          // for client users
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const User = scoped('User', userSchema);

const Client = scoped('Client', new Schema({ name: { type: String, required: true }, contactName: String, email: String, country: String }, { timestamps: true }));

// A "project" and its site are one record for now.
const siteSchema = new Schema({
  siteName: { type: String, required: true },
  locationCity: { type: String, required: true },
  description: String,
  client: ref('Client'),
  currentPhase: String,
  budgetXAF: { type: Number, min: 0 },
  spentXAF: { type: Number, default: 0, min: 0 },
  financialsUpdatedBy: ref('User'),
  financialsUpdatedAt: Date,
  progressPct: { type: Number, default: 0, min: 0, max: 100 }, // recalculated from tasks whenever they change
  plannedWorkers: { type: Number, default: 0 },
  startDate: { type: Date, required: true },
  endDate: Date,
  status: { type: String, enum: ['Planning', 'Active', 'Suspended', 'Completed'], default: 'Active' },
}, { timestamps: true });
const ProjectSite = scoped('ProjectSite', siteSchema);

const Task = scoped('Task', new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true },
  name: { type: String, required: true }, category: { type: String, default: 'General' }, phase: String, subcontractor: String, unit: { type: String, default: 'u' },
  totalQty: { type: Number, required: true, min: 0 }, cumulativeQty: { type: Number, default: 0, min: 0 },
  weeklyQty: { type: Number, default: 0, min: 0 }, weekKey: String,
  weight: { type: Number, default: 1, min: 0 }, weeklyTargetPct: Number, delayReason: String, observation: String, clientVisible: { type: Boolean, default: true },
}, { timestamps: true }));

const Milestone = scoped('Milestone', new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true },
  name: { type: String, required: true }, plannedDate: Date, order: { type: Number, default: 0 },
  status: { type: String, enum: ['Completed', 'InProgress', 'Upcoming'], default: 'Upcoming' }, clientVisible: { type: Boolean, default: true },
}, { timestamps: true }));

const photoSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, taskId: ref('Task'), clientId: String,
  url: { type: String, required: true }, caption: String, takenAt: { type: Date, default: Date.now },
  uploadedBy: ref('User'), clientVisible: { type: Boolean, default: false },
}, { timestamps: true });
partialUnique(photoSchema);
const ProjectPhoto = scoped('ProjectPhoto', photoSchema);

const ClientUpdate = scoped('ClientUpdate', new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, message: { type: String, required: true }, publishedBy: ref('User'),
}, { timestamps: true }));

const WorkforceCategory = scoped('WorkforceCategory', new Schema({ name: { type: String, required: true }, order: { type: Number, default: 0 } }));

const stockSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, materialType: { type: String, required: true },
  kind: { type: String, enum: ['opening', 'in', 'out'], required: true }, quantity: { type: Number, required: true, min: 0 },
  source: { type: String, enum: ['delivery', 'report', 'manual'], default: 'manual' }, party: String, refId: String, date: { type: Date, default: Date.now },
}, { timestamps: true });
const StockEntry = scoped('StockEntry', stockSchema);

const materialSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, clientId: String, orderId: ref('PurchaseOrder'),
  materialType: { type: String, required: true },
  quantityOrdered: { type: Number, required: true, min: 0 }, quantityReceived: { type: Number, required: true, min: 0 },
  shortfall: { type: Number, default: 0 }, flagged: { type: Boolean, default: false },
  supplierName: String, deliveryNotePhotoUrl: String, loggedBy: ref('User'),
}, { timestamps: true });
partialUnique(materialSchema);
materialSchema.index({ tenantId: 1, siteId: 1, createdAt: -1 });
const MaterialLog = scoped('MaterialLog', materialSchema);

const orderSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, materialType: { type: String, required: true }, supplierName: String,
  quantityOrdered: { type: Number, required: true, min: 1 }, status: { type: String, enum: ['Open', 'Received'], default: 'Open' },
}, { timestamps: true });
const PurchaseOrder = scoped('PurchaseOrder', orderSchema);

// Attendance records who was present, not what they are paid. Pay is a separate concern.
const attendanceSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, clientId: String, date: { type: Date, default: Date.now },
  totalWorkersPresent: { type: Number, required: true, min: 0 }, expectedWorkers: { type: Number, default: 0 },
  breakdown: [new Schema({ category: String, count: { type: Number, min: 0 } }, { _id: false })],
  siteGroupPhotoUrl: String, flagged: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending_HQ_Approval', 'Approved', 'Rejected'], default: 'Pending_HQ_Approval' },
  loggedBy: ref('User'), decidedBy: ref('User'), decidedAt: Date,
}, { timestamps: true });
partialUnique(attendanceSchema);
attendanceSchema.index({ tenantId: 1, siteId: 1, date: -1 });
const AttendanceLog = scoped('AttendanceLog', attendanceSchema);

const reportSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, clientId: String, date: { type: Date, default: Date.now },
  submittedBy: ref('User'), objectives: String, tomorrowPlan: String, observations: String, ordersNote: String,
  siteCash: { opening: Number, expenses: Number },
  stockMovements: [new Schema({ materialType: String, kind: { type: String, enum: ['in', 'out'] }, quantity: Number, party: String }, { _id: false })],
  workPerformed: [new Schema({ taskId: ref('Task'), taskName: String, quantity: Number, unit: String, note: String }, { _id: false })],
  materialsUsed: [new Schema({ materialType: String, quantity: Number }, { _id: false })],
  workforce: [new Schema({ category: String, count: Number }, { _id: false })],
  difficulties: [new Schema({ issue: String, solution: String }, { _id: false })],
  photoUrls: [String],
}, { timestamps: true });
partialUnique(reportSchema);
reportSchema.index({ tenantId: 1, siteId: 1, date: -1 });
const DailyReport = scoped('DailyReport', reportSchema);

const requestSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true }, materialType: { type: String, required: true }, quantity: { type: Number, required: true, min: 1 },
  estimateXAF: { type: Number, default: 0 }, requestedBy: ref('User'),
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, decidedBy: ref('User'), decidedAt: Date,
}, { timestamps: true });
const MaterialRequest = scoped('MaterialRequest', requestSchema);

const alertSchema = new Schema({
  siteId: ref('ProjectSite'), kind: { type: String, required: true }, severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  message: { type: String, required: true }, messageFr: String, refId: { type: String, required: true },
  acknowledged: { type: Boolean, default: false }, acknowledgedBy: ref('User'), acknowledgedAt: Date,
}, { timestamps: true });
alertSchema.index({ tenantId: 1, kind: 1, refId: 1 }, { unique: true });
alertSchema.index({ tenantId: 1, acknowledged: 1, createdAt: -1 });
const Alert = scoped('Alert', alertSchema);

module.exports = { Tenant, Role, User, Client, ProjectSite, Task, Milestone, ProjectPhoto, ClientUpdate, WorkforceCategory, StockEntry, PurchaseOrder, MaterialLog, AttendanceLog, DailyReport, MaterialRequest, Alert };
