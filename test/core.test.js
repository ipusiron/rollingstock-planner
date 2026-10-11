const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../stock-core.js');
const day = '2026-10-12';
const item = (overrides = {}) => C.validateItem({ name: 'example', category: 'water', quantity: 12,
  unit: 'L', expiry: '2027-01-01', kcal: null, createdAt: 1, ...overrides });

test('water units and category are both required', () => {
  assert.equal(C.waterVolume(item({ quantity: 500, unit: 'mL' })), 0.5);
  assert.equal(C.waterVolume(item({ category: 'daily' })), null);
  assert.equal(C.waterVolume(item({ unit: '本' })), null);
  assert.equal(C.waterVolume(item({ unit: 'ℓ' })), 12);
});
test('pet food is not human food', () => {
  assert.equal(C.totals([item({ category: 'pet-food', kcal: 1000 })], day).kcal, 0);
});
test('inventory remains recorded, expired and undated stock is not planned', () => {
  const t = C.totals([item({ expiry: '2020-01-01' }), item({ expiry: '' }), item({ expiry: day })], day);
  assert.equal(t.waterL, 36); assert.equal(t.plannedWaterL, 12);
  assert.equal(t.expired, 1); assert.equal(t.undated, 1);
});
test('unknown units and missing calories are counted, zero stock ignored', () => {
  const t = C.totals([item({ unit: '本' }), item({ category: 'food' }), item({ quantity: 0, expiry: '' })], day);
  assert.equal(t.unknownWater, 1); assert.equal(t.unknownKcal, 1); assert.equal(t.undated, 0);
});
for (const bad of ['Infinity', Infinity, NaN, -1, 1000001, '1x', true, {}, []]) {
  test(`invalid quantity rejected: ${String(bad)}`, () => assert.throws(() => item({ quantity: bad })));
}
for (const bad of ['2026-02-31', '2026-02-29', '2026-13-01', '2026-00-01', '2026-1-01', '0000-01-01']) {
  test(`invalid calendar date rejected: ${bad}`, () => assert.equal(C.dateNumber(bad), null));
}
test('leap years and calendar days including DST boundaries', () => {
  assert.notEqual(C.dateNumber('2024-02-29'), null);
  assert.equal(C.dateNumber('2026-03-09') - C.dateNumber('2026-03-08'), 1);
  assert.equal(C.dateNumber('2026-11-02') - C.dateNumber('2026-11-01'), 1);
  assert.equal(C.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(C.addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(C.addMonths('2026-12-31', 2), '2027-02-28');
});
test('all statuses and 14-day inclusive boundary', () => {
  const values = ['2026-10-11', day, '2026-10-26', '2026-10-27', '2026-12-13', ''];
  assert.deepEqual(values.map(expiry => C.expiryStatus(item({ expiry }), day)), ['expired','today','near','near','later','unknown']);
  const a = C.alerts(values.map(expiry => item({ expiry })), day);
  assert.deepEqual(a.rolling.map(i => i.expiry), [day, '2026-10-26']);
  assert.equal(C.alerts([item({ category: 'medicine', expiry: day }), item({ quantity: 0, expiry: day })], day).rolling.length, 0);
});
test('new water plan and adjustable calorie estimates', () => {
  const family = { ...C.defaults(), adults: 2, children: 2 };
  assert.equal(C.needs(family).needWater, 84);
  assert.equal(C.needs(family).needKcal, 47600);
  assert.equal(C.needs({ ...family, childKcal: 1800 }).needKcal, 53200);
});
test('pet water unknown is not silently treated as zero', () => {
  assert.equal(C.needs({ ...C.defaults(), dogs: 1 }).needWater, null);
  assert.equal(C.needs({ ...C.defaults(), dogs: 1, dogWater: 1 }).needWater, 28);
});
test('no target, over target, and rounding do not produce false achievement', () => {
  assert.deepEqual(C.metric(10, 0), { ratio: null, shortage: null, met: null });
  assert.equal(C.metric(99.99, 100).met, false);
  assert.equal(C.metric(200, 100).ratio, 200);
  assert.equal(C.metric(200, 100).shortage, 0);
});
test('strict family limits, no truncation or silent removal', () => {
  for (const adults of [-1, 101, 1.5, '1x']) assert.throws(() => C.validateFamily({ ...C.defaults(), adults }));
  assert.throws(() => C.validateState({ ...C.initial(), items: [item(), null] }));
  assert.throws(() => C.validateState({ ...C.initial(), items: Array(5001).fill(item()) }));
  assert.throws(() => item({ name: 'a'.repeat(201) }));
});
test('legacy family gets explicit planning defaults; import versions enforced', () => {
  const data = C.validateState({ items: [], family: { adults: 1, children: 0, seniors: 0, dogs: 1, cats: 0, days: 7 }, alertMonths: 2 });
  assert.equal(data.family.dogWater, null);
  assert.equal(data.family.waterPerPerson, 3);
  assert.throws(() => C.validateState({ ...data, meta: { app: 'another', ver: 1 } }));
  assert.throws(() => C.validateState({ ...data, meta: { app: 'rollingstock-planner', ver: 99 } }));
});
