const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../stock-core.js');
const root = path.join(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const english = fs.readFileSync(path.join(root, 'README.en.md'), 'utf8');

test('README images exist, are PNGs and are all referenced', () => {
  for (const [readme, directory] of [[fs.readFileSync(path.join(root,'README.md'),'utf8'),'assets'], [english,'assets/en']]) {
  const images = [...readme.matchAll(/!\[[^\]]*\]\((assets\/[^)]+)\)/g)].map(m => m[1]);
  assert.equal(images.length, 3);
  for (const name of images) {
    const data = fs.readFileSync(path.join(root, name));
    assert.equal(data.subarray(1,4).toString(), 'PNG');
    assert.ok(data.length <= 300 * 1024);
  }
  for (const name of fs.readdirSync(path.join(root,directory)).filter(n=>n.endsWith('.png'))) {
    assert.ok(images.includes(directory + '/' + name), name);
  }
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
  const actions = require('../stock-actions.js');
  const state = { items: [{...item(6,'bottle',day),volumeMl:2000}], family, alertMonths:2 };
  assert.equal(actions.shopping(state,2000,day).bottles,36);
  assert.equal(actions.shopping(state,500,day).bottles,144);
  assert.equal(core.waterVolume(actions.consume(state,0,1).items[0]),10);
  for (const text of [readme,english]) {
    const compact = text.replace(/[ ,]/g,'');
    for (const value of ['84L','47600kcal','72L','12.5L','600kcal','2000mL','500mL']) assert.ok(compact.includes(value), value);
    assert.match(text,/\b36(?:本| bottles)/);
    assert.match(text,/\b144(?:本| bottles)/);
    assert.match(text,/meta.ver: 3/);
    assert.match(text,/volumeMl/);
  }
});

test('documentation links, structure and limitations agree with the implementation', () => {
  for (const file of ['README.md','README.en.md','TECHNICAL.md','CLAUDE.md']) {
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

test('English README preserves all heading levels, order, tables and source links', () => {
  const headings = text => [...text.matchAll(/^(#{1,3}) (.+)$/gm)].map(m=>[m[1],m[2]]);
  const ja=headings(readme), en=headings(english);
  assert.equal(ja.length,29); assert.equal(en.length,29);
  assert.deepEqual(ja.map(x=>x[0]),en.map(x=>x[0]));
  const order=['Demo','Screenshots','Main features','Purpose and limitations','Checking stock rotation','Numerical stock checks',
    'Household-based planning','Disaster education','Browser storage','Long-term planning','Intended users','Use cases',
    'Uses specific to this tool','Reviewing longer-term stock','Stock rotation for a family of four','A community preparedness workshop',
    'Tabs','Expiry statuses and rules','Storage and JSON backups','Basic emergency supplies','Ethical dilemmas and action guidelines',
    'Technical specifications','Developer information','Related knowledge','Educational uses','Directory structure','License','About this tool'];
  order.forEach((title,i)=>assert.ok(en[i+1][1].endsWith(title), title));
  const tableRows=text=>text.split(/\r?\n/).filter(line=>line.startsWith('|'));
  assert.equal(tableRows(readme).length,tableRows(english).length);
  // Compare Markdown link targets, not Japanese-only metadata or link labels.
  const urls=text=>[...new Set([...text.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map(m=>m[1]))].sort();
  assert.deepEqual(urls(readme),urls(english));
  assert.ok(english.startsWith('English · [日本語](README.md)'));
  assert.doesNotMatch(english.split('\n').slice(1).join('\n'),/[\u3040-\u30ff\u3400-\u9fff]/);
  assert.match(english,/not encrypted/);
  assert.match(english,/does not guarantee food safety/);
  assert.match(english,/not a recommendation/);
});
