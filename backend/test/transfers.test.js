const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRef, filterOf, balanceOf, validateTransfer, entriesFor } = require('../src/services/transferRules');
const { summarize } = require('../src/services/stockMath');
const fails = (fn, status) => assert.throws(fn, (e) => e.status === status);

test('locations are parsed and invalid ones refused', () => {
  assert.deepEqual(parseRef('loc:abc'), { kind: 'loc', id: 'abc' }); assert.deepEqual(parseRef('site:123'), { kind: 'site', id: '123' });
  ['', 'abc', 'x:1', 'loc:'].forEach((v) => fails(() => parseRef(v), 400));
  assert.deepEqual(filterOf({ kind: 'site', id: '9' }), { siteId: '9', locationId: null });
});
test('a valid transfer passes and returns the quantity', () => assert.equal(validateTransfer({ from: { kind: 'loc', id: 'a' }, to: { kind: 'site', id: 'b' }, quantity: '40', materialType: 'Cement', available: 100 }), 40));
test('an invalid transfer is refused before anything is written', () => {
  const ok = { from: { kind: 'loc', id: 'a' }, to: { kind: 'site', id: 'b' }, quantity: 10, materialType: 'Cement', available: 100 };
  fails(() => validateTransfer({ ...ok, quantity: 0 }), 400); fails(() => validateTransfer({ ...ok, quantity: -5 }), 400); fails(() => validateTransfer({ ...ok, quantity: 'abc' }), 400);
  fails(() => validateTransfer({ ...ok, materialType: ' ' }), 400); fails(() => validateTransfer({ ...ok, to: ok.from }), 400);
  fails(() => validateTransfer({ ...ok, quantity: 101 }), 409);
});
test('a transfer can use all the stock but not one unit more', () => { assert.equal(validateTransfer({ from: { kind: 'loc', id: 'a' }, to: { kind: 'loc', id: 'b' }, quantity: 100, materialType: 'Cement', available: 100 }), 100); });
test('a transfer writes one exit and one entry, marked as a transfer', () => {
  const e = entriesFor({ tenantId: 't', materialType: 'Cement', quantity: 40, from: { kind: 'loc', id: 'wh' }, to: { kind: 'site', id: 'p1' }, fromName: 'Warehouse', toName: 'Project', date: new Date(), refId: 'm1' });
  assert.equal(e.length, 2); assert.equal(e[0].kind, 'out'); assert.equal(e[1].kind, 'in');
  assert.ok(e.every((x) => x.source === 'transfer' && x.quantity === 40 && x.refId === 'm1'));
  assert.equal(e[0].locationId, 'wh'); assert.equal(e[1].siteId, 'p1');
});
test('source decreases and destination increases by exactly the quantity, and the company total is unchanged', () => {
  const wh = [{ materialType: 'Cement', kind: 'opening', quantity: 800 }], site = [{ materialType: 'Cement', kind: 'in', quantity: 300, source: 'delivery' }];
  const [out, inn] = entriesFor({ tenantId: 't', materialType: 'Cement', quantity: 100, from: { kind: 'loc', id: 'wh' }, to: { kind: 'site', id: 'p1' }, fromName: 'W', toName: 'P', date: new Date(), refId: 'm1' });
  const w2 = [...wh, out], s2 = [...site, inn];
  assert.equal(summarize(w2)[0].closing, 700); assert.equal(summarize(s2)[0].closing, 400);
  assert.equal(summarize(w2)[0].closing + summarize(s2)[0].closing, summarize(wh)[0].closing + summarize(site)[0].closing);
});
test('a transfer is never counted as a purchase or a delivery', () => {
  const s = summarize([{ materialType: 'Cement', kind: 'in', quantity: 100, source: 'transfer' }, { materialType: 'Cement', kind: 'in', quantity: 50, source: 'delivery' }])[0];
  assert.equal(s.incoming, 50); assert.equal(s.transferIn, 100); assert.equal(s.closing, 150);
});
test('balances never go negative when the rules are followed', () => {
  let rows = [{ materialType: 'Cement', kind: 'opening', quantity: 100 }];
  for (const q of [60, 40]) { validateTransfer({ from: { kind: 'loc', id: 'a' }, to: { kind: 'loc', id: 'b' }, quantity: q, materialType: 'Cement', available: balanceOf(rows) }); rows = [...rows, { kind: 'out', quantity: q }]; }
  assert.equal(balanceOf(rows), 0);
  fails(() => validateTransfer({ from: { kind: 'loc', id: 'a' }, to: { kind: 'loc', id: 'b' }, quantity: 1, materialType: 'Cement', available: balanceOf(rows) }), 409);
});
