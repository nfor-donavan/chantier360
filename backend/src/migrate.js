// Safe to run more than once. Brings an existing database up to date with this version:
//  - adds the Secretary role and the new permissions to every company
//  - removes task editing from the Engineer role (engineers view, they do not change project data)
//  - converts old report photo lists into the new media list and backfills delivery dates
//  - rebuilds indexes
// The client portal is deny-by-default now, so existing projects show clients nothing until the Director releases it.
const mongoose = require('mongoose');
const { connect } = require('./db');
const M = require('./models');
const { DEFAULT_ROLES, PERMISSIONS } = require('./permissions');

(async () => {
  await connect();
  const tenants = await M.Tenant.find({});
  for (const t of tenants) {
    for (const [key, def] of Object.entries(DEFAULT_ROLES)) {
      const role = await M.Role.findOne({ tenantId: t._id, key });
      if (!role) { await M.Role.create({ tenantId: t._id, key, label: def.label, permissions: def.permissions }); console.log(`${t.companyName}: added role ${key}`); continue; }
      let perms = new Set(role.permissions);
      if (key === 'director') PERMISSIONS.filter((p) => DEFAULT_ROLES.director.permissions.includes(p)).forEach((p) => perms.add(p));
      if (key === 'foreman') { perms.add('MANAGE_WORKFORCE'); perms.add('SUBMIT_WEEKLY_REPORTS'); }
      if (key === 'engineer') { perms.add('MANAGE_WEEKLY_REPORTS'); perms.delete('MANAGE_TASKS'); ['VIEW_ASSETS', 'VIEW_TRANSFERS', 'MANAGE_TRANSFERS'].forEach((p) => perms.add(p)); }
      if (key === 'secretary') ['VIEW_ASSETS', 'VIEW_TRANSFERS'].forEach((p) => perms.add(p));
      await M.Role.updateOne({ _id: role._id, tenantId: t._id }, { permissions: [...perms] });
    }
  }
  const db = mongoose.connection;
  let n = 0;
  for await (const r of db.collection('dailyreports').find({ photoUrls: { $exists: true, $ne: [] }, $or: [{ media: { $exists: false } }, { media: { $size: 0 } }] })) {
    await db.collection('dailyreports').updateOne({ _id: r._id }, { $set: { media: r.photoUrls.map((url) => ({ url, kind: 'photo', clientVisible: false, uploadedAt: r.createdAt })) }, $unset: { photoUrls: '' } }); n++;
  }
  const dd = await db.collection('materiallogs').updateMany({ deliveryDate: { $exists: false } }, [{ $set: { deliveryDate: '$createdAt' } }]);
  console.log(`Reports converted: ${n}. Deliveries given a date: ${dd.modifiedCount}.`);
  for (const m of Object.values(M)) await m.syncIndexes();
  console.log('Migration complete.');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
