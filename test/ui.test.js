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

test('CSP, initial theme and keyboard dialog safeguards remain present', () => {
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js = fs.readFileSync(path.join(root,'script.js'),'utf8');
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
  assert.ok(html.indexOf('theme-init.js') < html.indexOf('style.css'));
  assert.doesNotMatch(html, /http-equiv="X-(Frame-Options|Content-Type-Options)"/);
  assert.match(js, /setAttribute\('aria-selected'/);
  assert.match(js, /panel.hidden = !selected/);
  assert.match(js, /el.inert = true/);
  assert.match(js, /matches\(':popover-open'\)/);
  assert.match(js, /setInterval\(refreshDay, 60000\)/);
});

test('safety content does not promise food safety or disaster survival', () => {
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.doesNotMatch(html, /AI防災|専門家レベル|期限切れでも.*安全|冷蔵庫.*24時間/);
  assert.match(html, /消費期限/);
  assert.match(html, /fda.gov/);
  assert.match(html, /maff.go.jp/);
});
