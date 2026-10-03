// Loads the demo company, accounts and records. Safe to re-run: it clears this database first.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGO_URI } = require('./config');
const M = require('./models');
const { createMaterialLog, createAttendance } = require('./services/records');

const d = (s) => new Date(s + 'T09:00:00Z');
(async () => {
  await mongoose.connect(MONGO_URI);
  for (const m of Object.values(M)) await m.deleteMany({}).setOptions({ skipTenant: true });
  const hash = await bcrypt.hash('demo1234', 10);

  const mac = await M.Tenant.create({ companyName: 'MAC Construction Co.', officeAddress: 'Bastos, Yaoundé' });
  const rival = await M.Tenant.create({ companyName: 'Demo Rival BTP', officeAddress: 'Akwa, Douala' });
  const tenantId = mac._id;

  const S = (siteName, locationCity, budget, spent, progress, planned, start, end, status, rate = 5000) =>
    ({ tenantId, siteName, locationCity, budgetXAF: budget, spentXAF: spent, progressPct: progress, plannedWorkers: planned, dailyRateXAF: rate, startDate: d(start), endDate: d(end), status });
  const [bastos, bonanjo, kribi, bamenda] = await M.ProjectSite.create([
    S('Bastos Residential Complex', 'Yaoundé', 1850000000, 1120000000, 62, 46, '2026-01-12', '2027-03-30', 'Active'),
    S('Bonanjo Office Tower', 'Douala', 4200000000, 2310000000, 54, 112, '2025-09-01', '2027-06-30', 'Active', 5500),
    S('Kribi Port Warehouse', 'Kribi', 960000000, 810000000, 83, 36, '2026-02-02', '2026-12-15', 'Active'),
    S('Bamenda Regional Clinic', 'Bamenda', 640000000, 120000000, 17, 14, '2026-08-10', '2027-08-30', 'Planning', 4500),
  ]);
  await M.ProjectSite.create(S('Garoua Road Bridge', 'Garoua', 1300000000, 410000000, 31, 0, '2026-03-01', '2027-04-30', 'Suspended'));

  const U = (name, email, role, title, siteId) => ({ tenantId, name, email, role, title, siteId, passwordHash: hash });
  const [ceo, ops, pm, fon, carine, nkeng, tamfu] = await M.User.create([
    U('Mballa Armand', 'ceo@mac-construction.cm', 'executive', 'Chief Executive'),
    U('Ngo Biyong Estelle', 'operations@mac-construction.cm', 'admin', 'Operations Director'),
    U('Tchakounte Rodrigue', 'pm@mac-construction.cm', 'project_manager', 'Project Manager'),
    U('Fon Emmanuel', 'foreman@mac-construction.cm', 'foreman', 'Site Foreman', bastos._id),
    U('Essomba Carine', 'carine@mac-construction.cm', 'foreman', 'Site Foreman', kribi._id),
    U('Nkeng Patrick', 'nkeng@mac-construction.cm', 'foreman', 'Site Foreman', bonanjo._id),
    U('Tamfu Gilbert', 'tamfu@mac-construction.cm', 'foreman', 'Site Foreman', bamenda._id),
  ]);

  const mats = [
    [bastos, fon, 'Dangote Cement (bags)', 600, 540, 'Cimencam Distribution', '2026-09-30'], [bonanjo, nkeng, 'Iron Rods 12mm (units)', 1200, 1200, 'Sotrafer SARL', '2026-09-30'],
    [kribi, carine, 'Gravel 15/25 (m³)', 80, 66, 'Carrières du Littoral', '2026-09-29'], [bastos, fon, 'Iron Rods 10mm (units)', 800, 800, 'Sotrafer SARL', '2026-09-29'],
    [bonanjo, nkeng, 'Dangote Cement (bags)', 1500, 1380, 'Cimencam Distribution', '2026-09-28'], [kribi, carine, 'Sand (m³)', 60, 60, 'Carrières du Littoral', '2026-09-27'],
    [bastos, fon, 'Hollow Blocks 15cm (units)', 4000, 3720, 'Briqueterie Mfoundi', '2026-09-26'], [bamenda, tamfu, 'Dangote Cement (bags)', 300, 300, 'Cimencam Distribution', '2026-09-25'],
    [bastos, fon, 'Dangote Cement (bags)', 500, 455, 'Cimencam Distribution', '2026-09-22'],
  ];
  for (const [site, u, materialType, o, r, supplierName, date] of mats)
    await createMaterialLog({ tenantId, userId: u._id, siteId: site._id, createdAt: d(date), data: { materialType, quantityOrdered: o, quantityReceived: r, supplierName } });

  const att = [
    [bastos, fon, 48, 5000, '2026-09-30', 'Pending_HQ_Approval'], [bonanjo, nkeng, 131, 5500, '2026-09-30', 'Pending_HQ_Approval'],
    [kribi, carine, 36, 5000, '2026-09-30', 'Pending_HQ_Approval'], [bamenda, tamfu, 14, 4500, '2026-09-30', 'Approved'],
    [bastos, fon, 45, 5000, '2026-09-29', 'Approved'], [bonanjo, nkeng, 109, 5500, '2026-09-29', 'Approved'],
  ];
  for (const [site, u, n, rate, date, status] of att)
    await createAttendance({ tenantId, userId: u._id, siteId: site._id, createdAt: d(date), data: { totalWorkersPresent: n, ratePerWorkerXAF: rate, status, date: d(date) } });

  const orders = [
    [bastos, 'Dangote Cement (bags)', 'Cimencam Distribution', 600], [bastos, 'Iron Rods 12mm (units)', 'Sotrafer SARL', 1200],
    [bastos, 'Hollow Blocks 15cm (units)', 'Briqueterie Mfoundi', 4000], [bastos, 'Sand (m³)', 'Carrières du Littoral', 40],
    [kribi, 'Gravel 15/25 (m³)', 'Carrières du Littoral', 80], [kribi, 'Dangote Cement (bags)', 'Cimencam Distribution', 700],
    [bonanjo, 'Iron Rods 16mm (units)', 'Sotrafer SARL', 900], [bamenda, 'Dangote Cement (bags)', 'Cimencam Distribution', 300],
  ];
  for (const [site, materialType, supplierName, quantityOrdered] of orders)
    await M.PurchaseOrder.create({ tenantId, siteId: site._id, materialType, supplierName, quantityOrdered });

  const reqs = [
    [bonanjo, nkeng, 'Dangote Cement (bags)', 2000, 13000000], [kribi, carine, 'Roofing sheets, 0.4mm (units)', 450, 8100000],
    [bastos, fon, 'Ceramic tiles 60x60 (m²)', 900, 11250000], [bamenda, tamfu, 'Iron Rods 12mm (units)', 600, 4500000],
  ];
  for (const [site, u, materialType, quantity, estimateXAF] of reqs)
    await M.MaterialRequest.create({ tenantId, siteId: site._id, materialType, quantity, estimateXAF, requestedBy: u._id });

  // Second company, to prove isolation: its users never see MAC's data.
  const akwa = await M.ProjectSite.create({ tenantId: rival._id, siteName: 'Akwa Commercial Centre', locationCity: 'Douala', budgetXAF: 900000000, spentXAF: 150000000, progressPct: 15, plannedWorkers: 30, startDate: d('2026-07-01'), status: 'Active' });
  await M.User.create({ tenantId: rival._id, name: 'Rival Director', email: 'director@rival-btp.cm', role: 'executive', title: 'Director', passwordHash: hash });
  await createMaterialLog({ tenantId: rival._id, siteId: akwa._id, data: { materialType: 'Dangote Cement (bags)', quantityOrdered: 100, quantityReceived: 90, supplierName: 'Local supplier' } });

  console.log('Seeded. Demo logins (password demo1234): ceo@mac-construction.cm, operations@mac-construction.cm, pm@mac-construction.cm, foreman@mac-construction.cm, carine@mac-construction.cm');
  console.log('Isolation check: director@rival-btp.cm');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
