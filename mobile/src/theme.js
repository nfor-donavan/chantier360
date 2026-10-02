export const C = { navy: '#0F1E38', navy2: '#172B4D', yellow: '#F5B800', green: '#1FB36B', red: '#D64545', bg: '#F1F3F6', card: '#FFFFFF', line: '#E3E7EC', ink: '#14213A', mute: '#66728A' };
export const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
export const demoForemen = [
  { id: 'f1', name: 'Fon Emmanuel', email: 'foreman@mac-construction.cm', password: 'demo1234', site: 'Bastos Residential Complex', city: 'Yaoundé', rate: 5000 },
  { id: 'f2', name: 'Essomba Carine', email: 'carine@mac-construction.cm', password: 'demo1234', site: 'Kribi Port Warehouse', city: 'Kribi', rate: 5000 },
];
export const openOrders = [
  { id: 'o1', material: 'Dangote Cement (bags)', ordered: 600, supplier: 'Cimencam Distribution' },
  { id: 'o2', material: 'Iron Rods 12mm (units)', ordered: 1200, supplier: 'Sotrafer SARL' },
  { id: 'o3', material: 'Hollow Blocks 15cm (units)', ordered: 4000, supplier: 'Briqueterie Mfoundi' },
  { id: 'o4', material: 'Sand (m³)', ordered: 40, supplier: 'Carrières du Littoral' },
];
