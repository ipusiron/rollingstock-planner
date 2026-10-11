const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../stock-core.js');
const root = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

test('README images exist, are PNGs and are all referenced', () => {
  const images = [...readme.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map(m => m[1]);
  assert.equal(images.length, 3);
  for (const name of images) {
    const data = fs.readFileSync(path.join(root, name));
    assert.equal(data.subarray(1,4).toString(), 'PNG');
    assert.ok(data.length <= 300 * 1024);
  }
  for (const name of fs.readdirSync(path.join(root,'assets')).filter(n=>n.endsWith('.png'))) {
    assert.ok(images.includes('assets/' + name), name);
  }
});

test('README example numbers are verified by the core', () => {
  const family = { ...core.defaults(), adults:2, children:2 };
  const item = (quantity, unit, expiry, category='water', kcal=null) => core.validateItem({
    name:'example',category,quantity,unit,expiry,kcal,createdAt:1
  });
  const day = '2026-10-12';
  const result = core.coverage([item(12,'L',day)],family,day);
  assert.equal(result.needs.needWater,84);
  assert.equal(result.needs.needKcal,47600);
  assert.equal(result.water.shortage,72);
  assert.match(readme,/水84L、人用食料47,600kcal/);
  assert.match(readme,/不足72L/);
  assert.equal(core.totals([item(500,'mL',day),item(12,'L',day)],day).plannedWaterL,12.5);
  assert.equal(core.totals([item(12,'L',day),item(12,'L','')],day).plannedWaterL,12);
  assert.equal(core.totals([item(2,'袋',day,'food',300),item(1,'袋',day,'pet-food',1000)],day).kcal,600);
});

test('documentation links, structure and limitations agree with the implementation', () => {
  for (const file of ['README.md','TECHNICAL.md','CLAUDE.md']) {
    const text = fs.readFileSync(path.join(root,file),'utf8');
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert.ok(fs.existsSync(path.resolve(root,target)), `${file}: ${target}`);
    }
    assert.doesNotMatch(text,/AI防災アドバイザー|専門家レベル|Chart\.js|48L|52,800/);
    assert.match(text,/rsp_state_v2|TECHNICAL\.md/);
  }
  assert.match(readme,/id: day096/);
  assert.match(readme,/page_id=42163/);
  assert.match(readme,/暗号化されず/);
  assert.match(readme,/計画への算入から外します/);
  assert.match(readme,/10MiB・5,000件/);
  for (const section of readme.split(/^#{1,6} /m)) {
    assert.ok((section.match(/\*\*[^*]+\*\*/g)||[]).length <= 2);
  }
});
