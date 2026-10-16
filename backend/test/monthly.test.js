const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMonthly, buildAnnual } = require('../src/services/monthly');
const D = (s) => new Date(s);
const expenses = [
  { siteId: 's1', date: D('2026-03-31T23:59:59Z'), amountXAF: 1000, category: 'Materials' },
  { siteId: 's1', date: D('2026-04-01T00:00:00Z'), amountXAF: 2000, category: 'Materials' },
  { siteId: 's1', date: D('2026-04-15T10:00:00Z'), amountXAF: 500, category: 'Labour' },
  { siteId: 's2', date: D('2026-06-10T10:00:00Z'), amountXAF: 700, category: 'Transport' },
  { siteId: 's1', date: D('2025-12-31T10:00:00Z'), amountXAF: 9999, category: 'Materials' }, // another year
];
const base = { expenses, financial: true, sites: [{ _id: 's1', siteName: 'A' }, { _id: 's2', siteName: 'B' }] };

test('monthly expenses use UTC month boundaries and never count a record twice', () => {
  const mar = buildMonthly(base, 2026, 3), apr = buildMonthly(base, 2026, 4);
  assert.equal(mar.expenses.monthTotal, 1000); assert.equal(apr.expenses.monthTotal, 2500);
  assert.equal(apr.expenses.monthCount, 2); // the 31 March record belongs to March
});
test('year to date is cumulative and excludes other years and later months', () => {
  assert.equal(buildMonthly(base, 2026, 3).expenses.ytdTotal, 1000);
  assert.equal(buildMonthly(base, 2026, 4).expenses.ytdTotal, 3500);
  assert.equal(buildMonthly(base, 2026, 6).expenses.ytdTotal, 4200);
});
test('categories add up to the month and year totals', () => {
  const a = buildMonthly(base, 2026, 4).expenses;
  assert.equal(a.byCategory.reduce((x, c) => x + c.month, 0), a.monthTotal); assert.equal(a.byCategory.reduce((x, c) => x + c.ytd, 0), a.ytdTotal);
  assert.equal(a.byProject.reduce((x, c) => x + c.ytd, 0), a.ytdTotal);
});
test('a month with no expense records says so instead of showing zero', () => {
  const m = buildMonthly(base, 2026, 5);
  assert.equal(m.expenses.monthTotal, 0); assert.ok(m.limitations.includes('no_expense_records'));
  const a = buildAnnual(base, 2026); assert.equal(a.months[4].expenses, null); assert.equal(a.months[4].expenseRecords, 0);
});
test('annual totals reconcile with the twelve months and with the raw records', () => {
  const a = buildAnnual(base, 2026);
  assert.equal(a.months.length, 12);
  assert.equal(a.totals.expenses, 4200); assert.equal(a.totals.independentCheck, 4200); assert.equal(a.totals.reconciled, true);
  assert.equal(a.months.reduce((x, m) => x + (m.expenses || 0), 0), a.totals.expenses);
});
test('annual cumulative figure matches the monthly year-to-date for every month', () => {
  const a = buildAnnual(base, 2026);
  for (let m = 1; m <= 12; m++) assert.equal(a.months[m - 1].ytdExpenses, buildMonthly(base, 2026, m).expenses.ytdTotal);
});
test('people without financial access get no expense figures, only a notice', () => {
  const m = buildMonthly({ ...base, financial: false, expenses: [] }, 2026, 4);
  assert.equal(m.expenses, undefined); assert.ok(m.limitations.includes('financial_hidden'));
  assert.equal(buildAnnual({ ...base, financial: false, expenses: [] }, 2026).months[3].expenses, null);
});
test('work, workforce and deliveries are aggregated from the stored records', () => {
  const data = { ...base,
    daily: [{ date: D('2026-04-02T08:00:00Z'), workPerformed: [{ taskId: 't1', taskName: 'Walls', unit: 'm2', quantity: 10 }], materialsUsed: [{ materialType: 'Cement', quantity: 5 }], difficulties: [{ issue: 'Rain' }] },
      { date: D('2026-04-03T08:00:00Z'), workPerformed: [{ taskId: 't1', taskName: 'Walls', unit: 'm2', quantity: 5 }], materialsUsed: [{ materialType: 'Cement', quantity: 3 }] }],
    attendance: [{ date: D('2026-04-02T08:00:00Z'), totalWorkersPresent: 30, breakdown: [{ category: 'Workers', count: 30 }] }, { date: D('2026-04-03T08:00:00Z'), totalWorkersPresent: 40, breakdown: [{ category: 'Workers', count: 40 }] }],
    deliveries: [{ deliveryDate: D('2026-04-05T08:00:00Z'), materialType: 'Cement', quantityReceived: 100, flagged: true }, { deliveryDate: D('2026-05-05T08:00:00Z'), materialType: 'Cement', quantityReceived: 50 }],
    tasks: [{ _id: 't1', progressPct: 55 }] };
  const m = buildMonthly(data, 2026, 4);
  assert.equal(m.work.reportsCount, 2); assert.equal(m.work.tasks[0].quantity, 15); assert.equal(m.work.tasks[0].progressNow, 55);
  assert.equal(m.workforce.averagePerDay, 35); assert.equal(m.workforce.peak, 40);
  assert.equal(m.deliveries.count, 1); assert.equal(m.deliveries.flagged, 1);
  assert.deepEqual(m.materialsUsed, [{ materialType: 'Cement', quantity: 8 }]); assert.equal(m.difficulties.length, 1);
});
test('month-end progress is only reported when a weekly report exists, never guessed', () => {
  assert.equal(buildMonthly(base, 2026, 4).progressAtMonthEnd, null);
  const w = [{ weekStart: D('2026-04-20T00:00:00Z'), rows: [{ name: 'Walls', progressPct: 50 }] }, { weekStart: D('2026-04-27T00:00:00Z'), rows: [{ name: 'Walls', progressPct: 60 }] }];
  assert.equal(buildMonthly({ ...base, weekly: w }, 2026, 4).progressAtMonthEnd.rows[0].progressPct, 60);
  assert.equal(buildAnnual({ ...base, weekly: w }, 2026).months[3].progressAtMonthEnd, 60);
});
