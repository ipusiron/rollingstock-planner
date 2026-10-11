const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../stock-core.js');
const A = require('../stock-actions.js');
const day = '2026-10-12';
const item = (extra = {}) => C.validateItem({ name: 'Example', category: 'food', quantity: 2,
  unit: 'can', expiry: '2027-01-01', kcal: 0, createdAt: 1, ...extra });

test('expiry types are explicit, optional and round-trip in all supported formats', () => {
  assert.equal(item().expiryType, undefined);
  for (const expiryType of C.EXPIRY_TYPES) for (const ver of [1, 2, 3, 4]) {
    const state = { ...C.initial(), meta: { app: 'rollingstock-planner', ver }, items: [item({ expiryType })] };
    assert.equal(C.validateState(JSON.parse(JSON.stringify(state))).items[0].expiryType, expiryType);
  }
  for (const expiryType of ['', null, 1, {}, 'BEST-BEFORE', '<img src=x>']) assert.throws(() => item({ expiryType }));
});
test('date type never makes expired or undated food count toward a plan', () => {
  for (const expiryType of C.EXPIRY_TYPES) {
    for (const expiry of ['', '2026-10-11']) assert.equal(C.totals([item({ expiryType, expiry, kcal: 100 })], day).plannedKcal, 0);
    assert.equal(C.totals([item({ expiryType, expiry: day, kcal: 100 })], day).plannedKcal, 200);
  }
});
test('replenishment merges only matching date AND type and preserves source and undo', () => {
  const before = { ...C.initial(), items: [item({ expiryType: 'best-before' })] };
  assert.equal(A.replenish(before, 0, 1, '2027-01-01', 'best-before').items[0].quantity, 3);
  for (const expiryType of ['use-by', 'expiration', 'unspecified']) {
    const after = A.replenish(before, 0, 1, '2027-01-01', expiryType);
    assert.equal(after.items.length, 2);
    assert.equal(after.items[1].expiryType, expiryType);
    assert.deepEqual(after.items[0], before.items[0]);
    assert.deepEqual(A.undo(after, { before, after: JSON.stringify(after) }), before);
  }
  assert.equal(A.replenish(before, 0, 1, '', 'best-before').items.length, 2);
  assert.equal(A.consume(before, 0, 1).items[0].expiryType, 'best-before');
  assert.throws(() => A.replenish(before, 0, 1, day, 'unsafe'));
});
test('review reasons distinguish missing data, dates and zero stock without altering records', () => {
  const rows = [item({ expiry: '', kcal: null }), item({ category: 'water', unit: 'box' }),
    item({ expiry: '2026-10-11', expiryType: 'use-by' }), item({ expiry: day, expiryType: 'best-before' }),
    item({ expiry: '2026-12-12', expiryType: 'best-before' }), item({ expiryType: 'expiration' }),
    item({ quantity: 0, expiry: '', kcal: null })];
  const before = JSON.stringify(rows);
  assert.deepEqual(C.reviewReasons(rows[0], day), ['undated', 'untyped', 'calories']);
  assert.deepEqual(C.reviewReasons(rows[1], day), ['untyped', 'volume']);
  const counts = C.REVIEW_FILTERS.map(filter => rows.filter(row => C.matchesReview(row, filter, day, 2)).length);
  assert.deepEqual(counts, [7, 5, 1, 2, 1, 2, 1, 1, 1]);
  assert.equal(JSON.stringify(rows), before);
  assert.throws(() => C.matchesReview(rows[0], 'bad', day));
  assert.equal(C.matchesReview(rows[4], 'near', day, 1), false);
});
test('review boundaries move with the calendar, not with expiry type', () => {
  const row = item({ expiry: '2026-10-12', expiryType: 'use-by' });
  assert.equal(C.matchesReview(row, 'near', '2026-10-12'), true);
  assert.equal(C.matchesReview(row, 'expired', '2026-10-13'), true);
  assert.equal(C.matchesReview(row, 'near', '2026-10-13'), false);
  assert.deepEqual(C.reviewReasons(item({ expiryType: 'best-before', kcal: 0 }), day), []);
});
