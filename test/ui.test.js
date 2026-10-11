const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
test('runtime scripts are local and category data is not a mixed-unit chart', () => {
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js = fs.readFileSync(path.join(root,'script.js'),'utf8');
  assert.doesNotMatch(html, /<script[^>]+src=["']https?:/);
  assert.doesNotMatch(js, /new Chart\(/);
  assert.match(js, /it\.category === category && it\.quantity > 0/);
  assert.match(html, /id="stockLimits"/);
});
test('only the storage adapter writes stock data', () => {
  const js = fs.readFileSync(path.join(root,'script.js'),'utf8');
  const calls = js.match(/localStorage\.setItem\([^;]+/g);
  assert.equal(calls.length, 1);
  assert.match(calls[0], /LS_THEME/);
  assert.doesNotMatch(js, /avgCoverage|overallGrade|generateExpertAnalysis/);
});
