const { test } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../stock-core.js');
const S = require('../stock-store.js');
function storage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return { map, getItem: k => map.get(k) ?? null, setItem: (k,v) => map.set(k,v) };
}
test('new data writes once, atomically to one key', () => {
  const s = storage(), store = S.create(() => s);
  assert.deepEqual(store.load().data, C.initial());
  store.save(C.initial());
  assert.deepEqual([...s.map.keys()], [S.KEY]);
});

test('format 3 preserves explicit capacity and reads formats 1 and 2 without guessing', () => {
  for (const ver of [1,2,3]) {
    const seed={meta:{app:'rollingstock-planner',ver},...C.initial()};
    seed.items=[C.validateItem({name:'water',category:'water',unit:ver===3?'bottle':'L',quantity:6,expiry:'2099-01-01',...(ver===3?{volumeMl:2000}:{})})];
    const s=storage({[S.KEY]:JSON.stringify(seed)}), store=S.create(()=>s);
    const loaded=store.load(); assert.equal(loaded.problem,null);
    assert.equal(loaded.data.items[0].volumeMl,ver===3?2000:undefined);
    store.save(loaded.data);
    assert.equal(JSON.parse(s.getItem(S.KEY)).meta.ver,3);
    const again=S.create(()=>s).load();
    assert.deepEqual(again.data,loaded.data);
  }
});
test('legacy import preserves all legacy raw values and does not write on load', () => {
  const seed = { rsp_items: '[]', rsp_family: JSON.stringify(C.defaults()), rsp_alert_months: '3' };
  const s = storage(seed), store = S.create(() => s);
  const loaded = store.load(); assert.equal(loaded.legacy, true);
  assert.equal(s.map.size, 3); store.save(loaded.data);
  for (const [key, value] of Object.entries(seed)) assert.equal(s.getItem(key), value);
});
test('quota failure leaves persisted data and retry snapshot unchanged', () => {
  const s = storage(), store = S.create(() => s); store.load(); store.save(C.initial());
  const before = s.getItem(S.KEY), write = s.setItem;
  s.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => store.save({ ...C.initial(), alertMonths: 6 }));
  assert.equal(s.getItem(S.KEY), before);
  s.setItem = write; store.save({ ...C.initial(), alertMonths: 6 });
  assert.equal(JSON.parse(s.getItem(S.KEY)).alertMonths, 6);
});
test('blocked storage requires explicit temporary session', () => {
  const store = S.create(() => { throw new Error('SecurityError'); });
  assert.equal(store.load().problem, 'unavailable');
  assert.throws(() => store.save(C.initial()));
  store.useSession(); assert.deepEqual(store.save(C.initial()), C.initial());
});
test('corrupt current state never falls back to stale legacy and remains recoverable', () => {
  const s = storage({ [S.KEY]: '{broken', rsp_items: '[]' }), store = S.create(() => s);
  assert.equal(store.load().problem, 'corrupt');
  assert.equal(store.recovery().state, '{broken');
  assert.throws(() => store.save(C.initial()));
  assert.equal(s.getItem(S.KEY), '{broken');
  store.save(C.initial(), true); assert.equal(JSON.parse(s.getItem(S.KEY)).meta.ver, 3);
});
test('conflicting tab cannot overwrite another update, including legacy updates', () => {
  const s = storage(), first = S.create(() => s), second = S.create(() => s);
  first.load(); second.load(); first.save(C.initial());
  assert.throws(() => second.save(C.initial()), /conflict/);
  s.setItem('rsp_items', '[]'); assert.throws(() => first.save(C.initial()), /conflict/);
});
test('invalid imported row cannot replace any persisted state', () => {
  const s = storage(), store = S.create(() => s); store.load(); store.save(C.initial());
  const before = s.getItem(S.KEY);
  assert.throws(() => store.save({ ...C.initial(), items: [null] }, true));
  assert.equal(s.getItem(S.KEY), before);
});
