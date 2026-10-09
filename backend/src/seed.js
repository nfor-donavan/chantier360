// Loads demo data for MAC Construction Co. Safe to re-run: it clears this database first.
// The centrepiece project (Maison des Avocats) mirrors the structure of the company's own site documents.
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MONGO_URI } = require('./config');
const M = require('./models');
const { DEFAULT_ROLES } = require('./permissions');
const { createMaterialLog, createAttendance, createReport } = require('./services/records');
const { recomputeProgress } = require('./services/progress');

const d = (s) => new Date(s + 'T09:00:00Z');
const svg = (title, sub, a, b) => 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520" viewBox="0 0 800 520"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><g fill="#ffffff" opacity=".18"><rect x="80" y="300" width="90" height="220"/><rect x="190" y="230" width="90" height="290"/><rect x="300" y="170" width="90" height="350"/><rect x="410" y="260" width="90" height="260"/></g><text x="40" y="70" font-family="Arial" font-size="38" font-weight="700" fill="#fff">${title}</text><text x="40" y="110" font-family="Arial" font-size="22" fill="#ffffffcc">${sub}</text><text x="40" y="490" font-family="Arial" font-size="16" fill="#ffffff99">Demo placeholder, replaced by real site photos</text></svg>`);

(async () => {
  await mongoose.connect(MONGO_URI);
  for (const m of Object.values(M)) await m.deleteMany({}).setOptions({ skipTenant: true });
  const hash = await bcrypt.hash('demo1234', 10);

  const mac = await M.Tenant.create({ companyName: 'MAC Construction Co.', officeAddress: 'Bastos, Yaoundé' });
  const rival = await M.Tenant.create({ companyName: 'Demo Rival BTP', officeAddress: 'Akwa, Douala' });
  const tenantId = mac._id;
  for (const t of [mac, rival]) await M.Role.insertMany(Object.entries(DEFAULT_ROLES).map(([key, r]) => ({ tenantId: t._id, key, label: r.label, permissions: r.permissions })));
  await M.WorkforceCategory.insertMany(['CT', 'CC', 'HSE', 'Stagiaires', 'Magasinière', "Chefs d'équipe", 'Techniciens ferrailleurs', 'Techniciens coffreurs', 'Manœuvres', 'Gardiens'].map((name, order) => ({ tenantId, name, order })));

  const client = await M.Client.create({ tenantId, name: 'Ordre des Avocats du Cameroun', contactName: 'Me Abena Claire', email: 'client@ordre-avocats.cm', country: 'Cameroon' });

  const S = (siteName, locationCity, budget, spent, progress, planned, start, end, status, extra = {}) =>
    ({ tenantId, siteName, locationCity, budgetXAF: budget, spentXAF: spent, progressPct: progress, plannedWorkers: planned, startDate: d(start), endDate: d(end), status, ...extra });
  const [maison, bastos, bonanjo, kribi, bamenda, garoua] = await M.ProjectSite.create([
    S('Maison des Avocats', 'Yaoundé', 4660000000, 3120000000, 0, 36, '2025-02-03', '2027-06-30', 'Active', { client: client._id, currentPhase: 'Structure SS-3 / SS-4', description: 'Bar association headquarters: basement levels, reinforced concrete structure and finishing.', financialsUpdatedAt: d('2026-09-28') }),
    S('Bastos Residential Complex', 'Yaoundé', 1850000000, 1120000000, 62, 46, '2026-01-12', '2027-03-30', 'Active', { currentPhase: 'Masonry' }),
    S('Bonanjo Office Tower', 'Douala', 4200000000, 2310000000, 54, 112, '2025-09-01', '2027-06-30', 'Active', { currentPhase: 'Floors 6 to 9' }),
    S('Kribi Port Warehouse', 'Kribi', 960000000, 810000000, 83, 36, '2026-02-02', '2026-12-15', 'Active', { currentPhase: 'Roofing and fit-out' }),
    S('Bamenda Regional Clinic', 'Bamenda', 640000000, 120000000, 17, 14, '2026-08-10', '2027-08-30', 'Planning', { currentPhase: 'Foundations' }),
    S('Garoua Road Bridge', 'Garoua', 1300000000, 410000000, 31, 0, '2026-03-01', '2027-04-30', 'Suspended', { currentPhase: 'On hold' }),
  ]);

  const U = (name, email, role, title, projectIds = [], extra = {}) => ({ tenantId, name, email, role, title, projectIds, passwordHash: hash, ...extra });
  const [ceo, eng, fon, carine, nkeng, , abena] = await M.User.create([
    U('Mballa Armand', 'ceo@mac-construction.cm', 'director', 'General Director'),
    U('Ngo Biyong Estelle', 'engineer@mac-construction.cm', 'engineer', 'Works Engineer', [maison._id, bastos._id]),
    U('Fon Emmanuel', 'foreman@mac-construction.cm', 'foreman', 'Site Foreman', [maison._id]),
    U('Essomba Carine', 'carine@mac-construction.cm', 'foreman', 'Site Foreman', [kribi._id]),
    U('Nkeng Patrick', 'nkeng@mac-construction.cm', 'foreman', 'Site Foreman', [bonanjo._id]),
    U('Tamfu Gilbert', 'tamfu@mac-construction.cm', 'foreman', 'Site Foreman', [bamenda._id]),
    U('Me Abena Claire', 'client@ordre-avocats.cm', 'client', 'Client representative', [maison._id], { client: client._id }),
  ]);
  await M.ProjectSite.updateOne({ _id: maison._id, tenantId }, { financialsUpdatedBy: ceo._id });

  // Maison des Avocats: tasks follow the company's weekly status table (subcontractor, unit, total, cumulative, weekly, rate).
  const T = (sub, category, name, unit, total, cum, wk = 0, target, reason) => ({ tenantId, siteId: maison._id, phase: 'SS-3', subcontractor: sub, category, name, unit, totalQty: total, cumulativeQty: cum, weeklyQty: wk, weeklyTargetPct: target, delayReason: reason, observation: 'RAS' });
  const FN = 'FERRAILLEUR NDEME', CA = 'Coffreur ALBERT', CO = 'Coffreur OTIS';
  const tasks = await M.Task.create([
    T(FN, 'Ferraillage', 'Ferraillage plancher SS-3 double nappe', 'm²', 621.38, 0),
    T(FN, 'Ferraillage', 'Ferraillage voiles du SS-3 double nappe', 'm²', 313.05, 311.87, 0, 100),
    T(FN, 'Ferraillage', 'Ferraillage des poteaux de 40*40cm', 'ml', 69.3, 69.3),
    T(FN, 'Ferraillage', 'Ferraillage des poteaux de 50*50cm', 'ml', 56.1, 56.1),
    T(FN, 'Ferraillage', 'Ferraillage des 03 escaliers du SS-3 / SS-4', 'forfait', 3, 1, 1),
    T(FN, 'Ferraillage', 'Ferraillage des poutres du SS-3 de 20*60cm', 'ml', 38.4, 12.32),
    T(CA, 'Coffrage', 'Coffrage plancher', 'm²', 621.38, 334),
    T(CO, 'Coffrage', 'Coffrage voiles', 'm²', 313.05, 252.56, 0, 100),
    T(CO, 'Coffrage', 'Coffrage poteaux de 40*40cm', 'ml', 68.3, 51.58, 10),
    T(CA, 'Coffrage', 'Coffrage poteaux de 50*50cm', 'ml', 54.1, 54.1),
    T(CO, 'Coffrage', 'Coffrage des 03 escaliers du SS-3 / SS-4', 'forfait', 3, 1),
    T(CA, 'Coffrage', 'Coffrage poutres de 20*60cm', 'ml', 38.4, 12.32),
    T('Équipe interne', 'Escaliers & ascenseur', "Escalier E1 du SS-4 (coffrage, ferraillage, coulage)", '%', 100, 55, 0, 100),
    T('Équipe interne', 'Escaliers & ascenseur', "Cage d'ascenseur SS-3", '%', 100, 66.67, 0, 100),
    T('Équipe interne', 'Escaliers & ascenseur', 'Escalier SS-3', '%', 100, 66.67, 0, 100),
    T('Équipe interne', 'Remblais & platelage', 'Remblais périphériques SS-2 bloc 02 et SS-4', '%', 100, 77, 0, 85, 'Pluie'),
    T('Équipe interne', 'Remblais & platelage', 'Platelage du PH SS-3', '%', 100, 23, 0, 50),
  ]);
  await recomputeProgress(tenantId, maison._id);
  const taskId = (frag) => tasks.find((x) => x.name.includes(frag))._id;

  // Simple task sets so the other projects also have a real breakdown.
  const quick = async (site, pcts) => {
    const names = [['Structure', 'Structural concrete', 'm³', 800], ['Masonry', 'Block walls', 'm²', 2400], ['Electrical', 'Cabling and boards', 'ml', 5000], ['Finishing', 'Tiling and paint', 'm²', 3200]];
    await M.Task.create(names.map(([category, name, unit, total], i) => ({ tenantId, siteId: site._id, category, name, unit, totalQty: total, cumulativeQty: Math.round((total * pcts[i]) / 100), subcontractor: 'Équipe interne' })));
    await recomputeProgress(tenantId, site._id);
  };
  await quick(bastos, [88, 70, 52, 38]); await quick(bonanjo, [75, 60, 40, 41]); await quick(kribi, [100, 92, 80, 60]); await quick(bamenda, [40, 10, 0, 0]); await quick(garoua, [60, 22, 0, 0]);

  await M.Milestone.create([
    ['Foundation (radier)', 'Completed', '2025-08-30'], ['Basement structure SS-4 to SS-3', 'InProgress', '2026-11-30'], ['Basement SS-2 to SS-1', 'Upcoming', '2027-01-31'],
    ['Superstructure', 'Upcoming', '2027-03-31'], ['Electrical and plumbing', 'Upcoming', '2027-05-15'], ['Finishing and handover', 'Upcoming', '2027-06-30'],
  ].map(([name, status, date], order) => ({ tenantId, siteId: maison._id, name, status, plannedDate: d(date), order })));

  await M.ProjectPhoto.create([
    ['Radier, block 03', 'Formwork complete', '2025-06-12', '#0F1E38', '#2B4C7E', true], ['Peripheral walls SS-4', 'Waterproofing applied', '2025-11-20', '#1B3A4B', '#2E7D6B', true],
    ['Walls SS-3', 'Rebar and formwork in progress', '2026-08-28', '#23395B', '#8A6D1E', true], ['Lift shaft SS-3', 'Rebar and formwork complete', '2026-08-31', '#2D3142', '#5B7DB1', true],
    ['Stair E1, SS-4', 'Awaiting concrete pour', '2026-09-02', '#3A2E39', '#B5803F', false], ['Floor slab SS-3', 'Formwork 54%', '2026-09-04', '#1F2A44', '#4D7C8A', false],
  ].map(([title, sub, date, a, b, vis]) => ({ tenantId, siteId: maison._id, url: svg(title, sub, a, b), caption: `${title}: ${sub}`, takenAt: d(date), uploadedBy: fon._id, clientVisible: vis })));
  await M.ClientUpdate.create([
    { tenantId, siteId: maison._id, publishedBy: ceo._id, message: 'Rebar work on the SS-3 walls is complete. Formwork on the walls stands at 81%.', createdAt: d('2026-09-04') },
    { tenantId, siteId: maison._id, publishedBy: ceo._id, message: 'Lift shaft and stair at SS-3 are ready for the concrete pour.', createdAt: d('2026-09-01') },
  ]);

  // Stock, as in the company's daily report: opening stock, entries and exits per item.
  const stock = (materialType, kind, quantity, party, date = '2026-08-31') => ({ tenantId, siteId: maison._id, materialType, kind, quantity, party, source: 'manual', date: d(date) });
  await M.StockEntry.create([
    ['Pioche', 8], ['Chignole', 1], ['Pelles rondes', 2], ['Pelles bêches', 12], ['Brouettes', 5], ['Massettes 5 kg', 2], ['Grandes meules', 2], ['Dewalt', 2], ['Décamètre', 1],
    ['Vibreurs', 3], ['Marteau piqueur', 1], ['Karcher', 1], ['Règles', 2], ['Ficelles maçon', 6], ['Disques à béton', 1], ['Harnais de sécurité', 2],
  ].map(([m, q]) => stock(m, 'opening', q, undefined, '2026-08-01')).concat([
    stock('Vibreurs', 'out', 3, 'Chantier'), stock('Ficelles maçon', 'in', 2, 'GES'), stock('Disques à couper', 'in', 2, 'GES'), stock('Disques à couper', 'out', 2, 'Chantier'),
  ]));

  const orders = [
    [maison, 'Dangote Cement (bags)', 'Cimencam Distribution', 600], [maison, 'Iron Rods 12mm (units)', 'Sotrafer SARL', 1200], [maison, 'Sand (m³)', 'Carrières du Littoral', 40],
    [bastos, 'Hollow Blocks 15cm (units)', 'Briqueterie Mfoundi', 4000], [kribi, 'Gravel 15/25 (m³)', 'Carrières du Littoral', 80], [kribi, 'Dangote Cement (bags)', 'Cimencam Distribution', 700],
    [bonanjo, 'Iron Rods 16mm (units)', 'Sotrafer SARL', 900], [bamenda, 'Dangote Cement (bags)', 'Cimencam Distribution', 300],
  ];
  for (const [s, materialType, supplierName, quantityOrdered] of orders) await M.PurchaseOrder.create({ tenantId, siteId: s._id, materialType, supplierName, quantityOrdered });

  const mats = [
    [maison, fon, 'Dangote Cement (bags)', 600, 540, 'Cimencam Distribution', '2026-09-30'], [bonanjo, nkeng, 'Iron Rods 12mm (units)', 1200, 1200, 'Sotrafer SARL', '2026-09-30'],
    [kribi, carine, 'Gravel 15/25 (m³)', 80, 66, 'Carrières du Littoral', '2026-09-29'], [maison, fon, 'Iron Rods 10mm (units)', 800, 800, 'Sotrafer SARL', '2026-09-29'],
    [bonanjo, nkeng, 'Dangote Cement (bags)', 1500, 1380, 'Cimencam Distribution', '2026-09-28'], [kribi, carine, 'Sand (m³)', 60, 60, 'Carrières du Littoral', '2026-09-27'],
    [maison, fon, 'Hollow Blocks 15cm (units)', 4000, 3720, 'Briqueterie Mfoundi', '2026-09-26'], [maison, fon, 'Dangote Cement (bags)', 500, 455, 'Cimencam Distribution', '2026-09-22'],
  ];
  for (const [s, u, materialType, o, r, supplierName, date] of mats) await createMaterialLog({ tenantId, userId: u._id, siteId: s._id, createdAt: d(date), data: { materialType, quantityOrdered: o, quantityReceived: r, supplierName } });

  const crew = { CT: 1, CC: 1, HSE: 1, Stagiaires: 4, Magasinière: 1, "Chefs d'équipe": 2, 'Techniciens ferrailleurs': 0, 'Techniciens coffreurs': 15, Manœuvres: 8, Gardiens: 2 };
  const bd = (o) => Object.entries(o).map(([category, count]) => ({ category, count }));
  const att = (site, u, n, date, status, breakdown) => createAttendance({ tenantId, userId: u._id, siteId: site._id, createdAt: d(date), data: { totalWorkersPresent: n, breakdown, status, date: d(date) } });
  await att(maison, fon, 35, '2026-09-30', 'Pending_HQ_Approval', bd(crew));
  await att(maison, fon, 45, '2026-09-29', 'Pending_HQ_Approval', bd({ ...crew, Manœuvres: 16, 'Techniciens coffreurs': 19 }));
  await att(maison, fon, 34, '2026-09-28', 'Approved', bd({ ...crew, Manœuvres: 7 }));
  await att(bonanjo, nkeng, 131, '2026-09-30', 'Pending_HQ_Approval'); await att(kribi, carine, 36, '2026-09-30', 'Pending_HQ_Approval');
  await att(bonanjo, nkeng, 109, '2026-09-29', 'Approved'); await att(bastos, nkeng, 45, '2026-09-29', 'Approved');

  // Reports mirror the company's daily report (31 Aug 2026). Effects are skipped because the task and stock figures above already include them.
  await createReport({ tenantId, userId: fon._id, siteId: maison._id, createdAt: d('2026-08-31'), skipEffects: true, data: {
    date: d('2026-08-31'), objectives: 'Weekly objectives: walls SS-3 100%, stair E1 100%, platelage PH SS-3 50%.',
    workPerformed: [
      { taskId: taskId('Ferraillage voiles'), taskName: 'Suite et fin ferraillage des voiles du SS-3 file O, file 2, file M', quantity: 180, unit: 'm²', note: '180 m² / 185 m² = 97.60%' },
      { taskId: taskId('Coffrage voiles'), taskName: 'Coffrage des voiles du SS-3 file O', quantity: 115, unit: 'm²', note: '115 m² / 119.12 m² = 96.54%' },
      { taskId: taskId('Remblais'), taskName: 'Remblais périphériques du SS-2 bloc 02 et SS-4', quantity: 77, unit: '%', note: 'Objectif hebdo 85%' },
      { taskId: taskId('Platelage'), taskName: 'Platelage du PH SS-3', quantity: 23, unit: '%', note: 'Coffrage 45%, ferraillage 1%' },
    ],
    materialsUsed: [['Harnais de sécurité', 2], ['Scies circulaires', 2], ['Pelles', 5], ['Brouettes', 6], ['Chignole', 1], ['Meules', 2], ['Règle métallique', 2], ['Poutrelles H20', 1], ['Bastings', 1]].map(([materialType, quantity]) => ({ materialType, quantity })),
    workforce: bd(crew).filter((w) => w.count > 0), difficulties: [], ordersNote: 'Voir bon de commande', siteCash: { opening: 30000, expenses: 0 },
    tomorrowPlan: 'Coffrage voile file M, file 2. Suite platelage du PH SS-3. Ferraillage du plancher haut SS-3.', observations: 'RAS',
  } });
  await createReport({ tenantId, userId: fon._id, siteId: maison._id, createdAt: d('2026-09-03'), skipEffects: true, data: {
    date: d('2026-09-03'), objectives: 'Finish coffrage poteaux 40*40.', workPerformed: [{ taskId: taskId('Coffrage poteaux de 40'), taskName: 'Coffrage poteaux de 40*40cm', quantity: 10, unit: 'ml' }],
    workforce: bd(crew).filter((w) => w.count > 0), difficulties: [{ issue: 'Rain stopped work for two hours', solution: 'Shifted the team to interior formwork' }], siteCash: { opening: 30000, expenses: 12500 },
    tomorrowPlan: 'Continue formwork of floor slab SS-3.',
  } });

  await M.MaterialRequest.create([
    [bonanjo, nkeng, 'Dangote Cement (bags)', 2000, 13000000], [kribi, carine, 'Roofing sheets, 0.4mm (units)', 450, 8100000],
    [maison, fon, 'Ceramic tiles 60x60 (m²)', 900, 11250000], [bamenda, null, 'Iron Rods 12mm (units)', 600, 4500000],
  ].map(([s, u, materialType, quantity, estimateXAF]) => ({ tenantId, siteId: s._id, materialType, quantity, estimateXAF, requestedBy: (u || ceo)._id })));

  // Second company, to prove isolation.
  const akwa = await M.ProjectSite.create({ tenantId: rival._id, siteName: 'Akwa Commercial Centre', locationCity: 'Douala', budgetXAF: 900000000, spentXAF: 150000000, progressPct: 15, plannedWorkers: 30, startDate: d('2026-07-01'), status: 'Active' });
  await M.User.create({ tenantId: rival._id, name: 'Rival Director', email: 'director@rival-btp.cm', role: 'director', title: 'Director', passwordHash: hash });
  await createMaterialLog({ tenantId: rival._id, siteId: akwa._id, data: { materialType: 'Dangote Cement (bags)', quantityOrdered: 100, quantityReceived: 90, supplierName: 'Local supplier' } });

  console.log('Seeded. Password for every demo account: demo1234');
  console.log('Web: ceo@mac-construction.cm (General Director), engineer@mac-construction.cm (Engineer), client@ordre-avocats.cm (Client)');
  console.log('Mobile: foreman@mac-construction.cm (Maison des Avocats), carine@mac-construction.cm (Kribi)');
  console.log('Isolation check: director@rival-btp.cm');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
