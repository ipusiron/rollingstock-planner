const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../stock-core.js');
const S = require('../stock-store.js');
const M = require('../messages.js');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
test('review and date selectors cover the complete core enums with bilingual labels', () => {
  const html = read('index.html');
  for (const [id, values] of [['reviewFilter', C.REVIEW_FILTERS], ['expiryType', C.EXPIRY_TYPES], ['actionExpiryType', C.EXPIRY_TYPES]]) {
    const block = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'))[1];
    assert.deepEqual([...block.matchAll(/value="([^"]+)"/g)].map(m => m[1]), values);
    for (const [, text] of block.matchAll(/<option[^>]*>([^<]+)</g)) {
      const key = Object.keys(M.ja).find(k => M.ja[k] === text);
      assert.ok(key && M.en[key], text);
    }
    assert.match(html, new RegExp('<label for="' + id + '">'));
  }
  assert.match(html, /id="reviewCount" role="status"/);
});
test('invalid imported date types cannot overwrite the current saved data', () => {
  const map = new Map();
  const storage = {getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v)};
  const store = S.create(() => storage); store.load(); store.save(C.initial());
  const before = map.get(S.KEY);
  for (const expiryType of [null, 'safe', '<svg onload=alert(1)>']) {
    assert.throws(() => store.save({...C.initial(), items:[{name:'x',category:'food',quantity:1,expiry:'',expiryType}]}, true));
    assert.equal(map.get(S.KEY), before);
  }
});
