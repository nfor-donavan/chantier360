// Demo data for the Chantier360 prototype (all figures are fictional).
export const TODAY = new Date('2026-10-01');

export const tenant = { companyName: 'MAC Construction Co.', city: 'Yaoundé' };

export const demoAccounts = [
  { id: 'u1', name: 'Mballa Armand', role: 'Chief Executive', email: 'ceo@mac-construction.cm', password: 'demo1234', initials: 'MA' },
  { id: 'u2', name: 'Ngo Biyong Estelle', role: 'Operations Director', email: 'operations@mac-construction.cm', password: 'demo1234', initials: 'NE' },
  { id: 'u3', name: 'Tchakounte Rodrigue', role: 'Project Manager', email: 'pm@mac-construction.cm', password: 'demo1234', initials: 'TR' },
];

export const sites = [
  { id: 's1', name: 'Bastos Residential Complex', city: 'Yaoundé', budget: 1850000000, spent: 1120000000, progress: 62, start: '2026-01-12', end: '2027-03-30', status: 'Active', foreman: 'Fon Emmanuel', workers: 48 },
  { id: 's2', name: 'Bonanjo Office Tower', city: 'Douala', budget: 4200000000, spent: 2310000000, progress: 54, start: '2025-09-01', end: '2027-06-30', status: 'Active', foreman: 'Nkeng Patrick', workers: 112 },
  { id: 's3', name: 'Kribi Port Warehouse', city: 'Kribi', budget: 960000000, spent: 810000000, progress: 83, start: '2026-02-02', end: '2026-12-15', status: 'Active', foreman: 'Essomba Carine', workers: 36 },
  { id: 's4', name: 'Bamenda Regional Clinic', city: 'Bamenda', budget: 640000000, spent: 120000000, progress: 17, start: '2026-08-10', end: '2027-08-30', status: 'Planning', foreman: 'Tamfu Gilbert', workers: 14 },
  { id: 's5', name: 'Garoua Road Bridge', city: 'Garoua', budget: 1300000000, spent: 410000000, progress: 31, start: '2026-03-01', end: '2027-04-30', status: 'Suspended', foreman: 'Abdoulaye Moussa', workers: 0 },
];

export const deliveries = [
  { id: 'd1', siteId: 's1', material: 'Dangote Cement (bags)', ordered: 600, received: 540, supplier: 'Cimencam Distribution', loggedBy: 'Fon Emmanuel', date: '2026-09-30' },
  { id: 'd2', siteId: 's2', material: 'Iron Rods 12mm (units)', ordered: 1200, received: 1200, supplier: 'Sotrafer SARL', loggedBy: 'Nkeng Patrick', date: '2026-09-30' },
  { id: 'd3', siteId: 's3', material: 'Gravel 15/25 (m³)', ordered: 80, received: 66, supplier: 'Carrières du Littoral', loggedBy: 'Essomba Carine', date: '2026-09-29' },
  { id: 'd4', siteId: 's1', material: 'Iron Rods 10mm (units)', ordered: 800, received: 800, supplier: 'Sotrafer SARL', loggedBy: 'Fon Emmanuel', date: '2026-09-29' },
  { id: 'd5', siteId: 's2', material: 'Dangote Cement (bags)', ordered: 1500, received: 1380, supplier: 'Cimencam Distribution', loggedBy: 'Nkeng Patrick', date: '2026-09-28' },
  { id: 'd6', siteId: 's3', material: 'Sand (m³)', ordered: 60, received: 60, supplier: 'Carrières du Littoral', loggedBy: 'Essomba Carine', date: '2026-09-27' },
  { id: 'd7', siteId: 's1', material: 'Hollow Blocks 15cm (units)', ordered: 4000, received: 3720, supplier: 'Briqueterie Mfoundi', loggedBy: 'Fon Emmanuel', date: '2026-09-26' },
  { id: 'd8', siteId: 's4', material: 'Dangote Cement (bags)', ordered: 300, received: 300, supplier: 'Cimencam Distribution', loggedBy: 'Tamfu Gilbert', date: '2026-09-25' },
  { id: 'd9', siteId: 's2', material: 'Iron Rods 16mm (units)', ordered: 900, received: 900, supplier: 'Sotrafer SARL', loggedBy: 'Nkeng Patrick', date: '2026-09-24' },
  { id: 'd10', siteId: 's1', material: 'Dangote Cement (bags)', ordered: 500, received: 455, supplier: 'Cimencam Distribution', loggedBy: 'Fon Emmanuel', date: '2026-09-22' },
];

export const requests = [
  { id: 'r1', siteId: 's2', material: 'Dangote Cement (bags)', quantity: 2000, estimate: 13000000, requestedBy: 'Nkeng Patrick', date: '2026-09-30', status: 'Pending' },
  { id: 'r2', siteId: 's3', material: 'Roofing sheets, 0.4mm (units)', quantity: 450, estimate: 8100000, requestedBy: 'Essomba Carine', date: '2026-09-30', status: 'Pending' },
  { id: 'r3', siteId: 's1', material: 'Ceramic tiles 60x60 (m²)', quantity: 900, estimate: 11250000, requestedBy: 'Fon Emmanuel', date: '2026-09-29', status: 'Pending' },
  { id: 'r4', siteId: 's4', material: 'Iron Rods 12mm (units)', quantity: 600, estimate: 4500000, requestedBy: 'Tamfu Gilbert', date: '2026-09-28', status: 'Pending' },
];

export const attendance = [
  { id: 'a1', siteId: 's1', date: '2026-09-30', present: 48, expected: 46, rate: 5000, foreman: 'Fon Emmanuel', status: 'Pending' },
  { id: 'a2', siteId: 's2', date: '2026-09-30', present: 131, expected: 112, rate: 5500, foreman: 'Nkeng Patrick', status: 'Pending' },
  { id: 'a3', siteId: 's3', date: '2026-09-30', present: 36, expected: 36, rate: 5000, foreman: 'Essomba Carine', status: 'Pending' },
  { id: 'a4', siteId: 's4', date: '2026-09-30', present: 14, expected: 14, rate: 4500, foreman: 'Tamfu Gilbert', status: 'Approved' },
  { id: 'a5', siteId: 's1', date: '2026-09-29', present: 45, expected: 46, rate: 5000, foreman: 'Fon Emmanuel', status: 'Approved' },
  { id: 'a6', siteId: 's2', date: '2026-09-29', present: 109, expected: 112, rate: 5500, foreman: 'Nkeng Patrick', status: 'Approved' },
];

export const weeklyLoss = [
  { week: 'W36', loss: 1.9 }, { week: 'W37', loss: 3.4 }, { week: 'W38', loss: 2.6 },
  { week: 'W39', loss: 4.1 }, { week: 'W40', loss: 2.2 },
];

export const siteName = (id) => sites.find((s) => s.id === id)?.name ?? id;
export const shortfallPct = (d) => Math.max(0, ((d.ordered - d.received) / d.ordered) * 100);
export const fmtXAF = (n) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)} Md FCFA` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} M FCFA` : `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;
export const fmtDate = (s) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
