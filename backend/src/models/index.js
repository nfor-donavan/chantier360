const mongoose = require('mongoose');
const tenantScope = require('../plugins/tenantScope');
const { Schema } = mongoose;
const ref = (name) => ({ type: Schema.Types.ObjectId, ref: name });
const historySchema = new Schema({ action: String, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, at: { type: Date, default: Date.now }, reason: String, fromStatus: String, toStatus: String }, { _id: false }); // who approved, revoked or rejected, when and why
const scoped = (name, schema) => { schema.plugin(tenantScope); return mongoose.model(name, schema); };
const partialUnique = (schema) => schema.index({ tenantId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });

const Tenant = mongoose.model('Tenant', new Schema({
  companyName: { type: String, required: true }, officeAddress: String, isActive: { type: Boolean, default: true },
  logo: String, // small image stored as a data URL, so it survives redeploys without file storage
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
  spentSource: { type: String, enum: ['manual', 'expenses'], default: 'manual' }, // becomes 'expenses' once expense records exist
  portal: { progress: { type: Boolean, default: false }, timeline: { type: Boolean, default: false }, photos: { type: Boolean, default: false }, videos: { type: Boolean, default: false }, reports: { type: Boolean, default: false }, statistics: { type: Boolean, default: false } }, // what this project's client may see: everything is off until the Director releases it
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
  weight: { type: Number, default: 1, min: 0 }, milestoneId: ref('Milestone'), weeklyTargetPct: Number, reportedPct: { type: Number, min: 0, max: 100, default: null }, reportedBy: ref('User'), reportedAt: Date, delayReason: String, observation: String, clientVisible: { type: Boolean, default: true },
}, { timestamps: true }));

const Milestone = scoped('Milestone', new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true },
  name: { type: String, required: true }, description: String, plannedStart: Date, plannedDate: Date, actualStart: Date, actualEnd: Date, order: { type: Number, default: 0 },
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
  siteId: { ...ref('ProjectSite'), index: true }, locationId: ref('StorageLocation'), // a project's own stock has no locationId; a warehouse has no siteId
  materialType: { type: String, required: true },
  kind: { type: String, enum: ['opening', 'in', 'out'], required: true }, quantity: { type: Number, required: true, min: 0 },
  source: { type: String, enum: ['delivery', 'report', 'manual', 'transfer'], default: 'manual' }, party: String, refId: String, date: { type: Date, default: Date.now },
}, { timestamps: true });
const StockEntry = scoped('StockEntry', stockSchema);

const materialSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, clientId: String, orderId: ref('PurchaseOrder'),
  materialType: { type: String, required: true },
  quantityOrdered: { type: Number, required: true, min: 0 }, quantityReceived: { type: Number, required: true, min: 0 },
  shortfall: { type: Number, default: 0 }, flagged: { type: Boolean, default: false },
  supplierName: String, unit: String, deliveryDate: { type: Date, default: Date.now }, notes: String, deliveryNotePhotoUrl: String, loggedBy: ref('User'),
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
  workers: [new Schema({ uid: String, name: String, category: String }, { _id: false })], // names are copied in, so history survives a worker being removed
  siteGroupPhotoUrl: String, flagged: { type: Boolean, default: false },
  status: { type: String, enum: ['Pending_HQ_Approval', 'Approved', 'Rejected'], default: 'Pending_HQ_Approval' },
  loggedBy: ref('User'), decidedBy: ref('User'), decidedAt: Date, approvalHistory: [historySchema],
}, { timestamps: true });
partialUnique(attendanceSchema);
attendanceSchema.index({ tenantId: 1, siteId: 1, date: -1 });
const AttendanceLog = scoped('AttendanceLog', attendanceSchema);

const reportSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, clientId: String, date: { type: Date, default: Date.now },
  submittedBy: ref('User'), objectives: String, tomorrowPlan: String, observations: String, ordersNote: String,
  siteCash: { opening: Number, expenses: Number },
  stockMovements: [new Schema({ materialType: String, kind: { type: String, enum: ['in', 'out'] }, quantity: Number, party: String }, { _id: false })],
  workPerformed: [new Schema({ taskId: ref('Task'), taskName: String, quantity: Number, unit: String, progressPct: Number, note: String }, { _id: false })],
  materialsUsed: [new Schema({ materialType: String, quantity: Number }, { _id: false })],
  workforce: [new Schema({ category: String, count: Number }, { _id: false })],
  difficulties: [new Schema({ issue: String, solution: String }, { _id: false })],
  media: [new Schema({ url: { type: String, required: true }, kind: { type: String, enum: ['photo', 'video'], default: 'photo' }, mime: String, size: Number, caption: String, uploadedBy: ref('User'), uploadedAt: { type: Date, default: Date.now }, clientVisible: { type: Boolean, default: false } })],
  clientVisible: { type: Boolean, default: false }, // the Director decides whether the client sees this report
}, { timestamps: true });
partialUnique(reportSchema);
reportSchema.index({ tenantId: 1, siteId: 1, date: -1 });
const DailyReport = scoped('DailyReport', reportSchema);

const Worker = scoped('Worker', (() => {
  const w = new Schema({
    uid: { type: String, required: true }, siteId: { ...ref('ProjectSite'), required: true, index: true },
    name: { type: String, required: true, trim: true }, nameKey: { type: String, required: true }, category: { type: String, required: true }, phone: String,
    active: { type: Boolean, default: true }, removedAt: Date, removedBy: ref('User'), createdBy: ref('User'),
  }, { timestamps: true });
  w.index({ tenantId: 1, uid: 1 }, { unique: true });
  w.index({ tenantId: 1, siteId: 1, nameKey: 1 }, { unique: true, partialFilterExpression: { active: true } }); // no two active workers with the same name on a project
  return w;
})());

const weeklySchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, weekStart: { type: Date, required: true }, weekEnd: { type: Date, required: true },
  status: { type: String, enum: ['draft', 'locked'], default: 'draft' },
  rows: [new Schema({ taskId: ref('Task'), subcontractor: String, phase: String, category: String, name: String, unit: String, totalQty: Number, cumulativeQty: Number, weeklyQty: Number,
    progressPct: Number, calculatedPct: Number, reportedPct: Number, plannedPct: Number, delayReason: String, observation: String }, { _id: false })],
  summary: Schema.Types.Mixed, objectives: String, notes: String,
  createdBy: ref('User'), submittedBy: ref('User'), submittedAt: Date, lockedBy: ref('User'), lockedAt: Date, clientVisible: { type: Boolean, default: false },
}, { timestamps: true });
weeklySchema.index({ tenantId: 1, siteId: 1, weekStart: 1 }, { unique: true });
const WeeklyReport = scoped('WeeklyReport', weeklySchema);

const Expense = scoped('Expense', new Schema({
  siteId: { ...ref('ProjectSite'), required: true, index: true }, date: { type: Date, default: Date.now },
  category: { type: String, required: true }, description: { type: String, required: true }, amountXAF: { type: Number, required: true, min: 0 },
  payee: String, reference: String, receiptUrl: String, enteredBy: ref('User'), updatedBy: ref('User'),
}, { timestamps: true }));

// Places that hold company materials besides projects: warehouses and other storage. A project is also a location (referred to as site:<id>).
const StorageLocation = scoped('StorageLocation', new Schema({ name: { type: String, required: true }, type: { type: String, enum: ['warehouse', 'storage', 'other'], default: 'warehouse' }, address: String, active: { type: Boolean, default: true } }, { timestamps: true }));

// An internal transfer of materials. It writes one exit and one entry (source 'transfer') so stock moves exactly once.
const refSchema = new Schema({ kind: { type: String, enum: ['site', 'loc'], required: true }, id: { type: String, required: true }, name: String }, { _id: false });
const movementSchema = new Schema({
  clientId: String, materialType: { type: String, required: true }, quantity: { type: Number, required: true, min: 0 }, unit: String,
  from: { type: refSchema, required: true }, to: { type: refSchema, required: true }, date: { type: Date, default: Date.now },
  reason: String, reference: String, evidenceUrl: String, createdBy: ref('User'),
}, { timestamps: true });
movementSchema.index({ tenantId: 1, clientId: 1 }, { unique: true, partialFilterExpression: { clientId: { $type: 'string' } } });
const MaterialMovement = scoped('MaterialMovement', movementSchema);

// Reusable company assets (trucks, machinery, equipment). Consumable materials stay in stock, not here.
const Asset = scoped('Asset', new Schema({
  name: { type: String, required: true }, category: { type: String, required: true }, identifier: String, quantity: { type: Number, default: 1, min: 0 },
  status: { type: String, enum: ['Operational', 'In maintenance', 'Out of service', 'Retired'], default: 'Operational' }, condition: { type: String, enum: ['Good', 'Fair', 'Poor'], default: 'Good' },
  location: refSchema, locationNote: String, assignedSiteId: ref('ProjectSite'), ownership: String, acquiredOn: Date, notes: String,
  maintenance: [new Schema({ date: Date, note: String, by: ref('User'), byName: String })], createdBy: ref('User'), updatedBy: ref('User'),
}, { timestamps: true }));

// Record of corrections and deletions, so removing a record never leaves an unexplained gap.
const AuditLog = scoped('AuditLog', new Schema({
  entity: String, entityId: String, action: String, siteId: ref('ProjectSite'), by: ref('User'), snapshot: Schema.Types.Mixed, at: { type: Date, default: Date.now },
}));

const requestSchema = new Schema({
  siteId: { ...ref('ProjectSite'), required: true }, materialType: { type: String, required: true }, quantity: { type: Number, required: true, min: 1 },
  estimateXAF: { type: Number, default: 0 }, requestedBy: ref('User'),
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' }, decidedBy: ref('User'), decidedAt: Date, approvalHistory: [historySchema],
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

module.exports = { StorageLocation, MaterialMovement, Asset, Worker, WeeklyReport, Expense, AuditLog, Tenant, Role, User, Client, ProjectSite, Task, Milestone, ProjectPhoto, ClientUpdate, WorkforceCategory, StockEntry, PurchaseOrder, MaterialLog, AttendanceLog, DailyReport, MaterialRequest, Alert };
