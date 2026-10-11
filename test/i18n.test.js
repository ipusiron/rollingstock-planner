const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const messages = require('../messages.js');
test('Japanese and English messages have matching keys and parameters', () => {
  assert.deepEqual(Object.keys(messages.ja), Object.keys(messages.en));
  for (const key of Object.keys(messages.ja)) {
    assert.ok(messages.ja[key] && messages.en[key], key);
    assert.deepEqual((messages.ja[key].match(/\{\w+\}/g) || []).sort(), (messages.en[key].match(/\{\w+\}/g) || []).sort(), key);
    assert.doesNotMatch(messages.en[key], /[\u3040-\u30ff\u3400-\u9fff\uff01-\uff60]/, key);
  }
});
test('dynamic interface strings are dictionary based', () => {
  const source = fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*/g, '');
  assert.doesNotMatch(source, /[\u3040-\u30ff\u3400-\u9fff]/);
  for (const [,key] of source.matchAll(/\bt\('([^']+)'/g)) assert.ok(messages.ja[key],key);
});
test('language priority, substitution and unavailable preference storage', () => {
  const button = {};
  const document = { documentElement: {}, createTreeWalker: () => ({ nextNode: () => null }), querySelectorAll: () => [],
    getElementById: () => button, dispatchEvent() {} };
  button.addEventListener = () => {};
  const context = { StockMessages: messages, document, NodeFilter: { SHOW_TEXT: 4 }, URLSearchParams,
    location: { search: '?lang=en' }, navigator: { language: 'ja-JP' }, Event: function(){},
    localStorage: { getItem(){ throw Error('blocked'); }, setItem(){ throw Error('blocked'); } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../i18n.js'),'utf8'), context);
  const i18n = context.StockI18n;
  assert.equal(document.documentElement.lang, 'en');
  assert.equal(i18n.choose('ja','en','en-US'), 'ja');
  assert.equal(i18n.choose('bad','ja','en-US'), 'ja');
  assert.equal(i18n.choose(null,null,'ja-JP'), 'ja');
  assert.equal(i18n.choose(null,null,'fr-FR'), 'en');
  assert.equal(i18n.t('deleteConfirm',{ name: '{count}<test>' }), 'Delete "{count}<test>"?');
  i18n.setLanguage('ja');
  assert.equal(document.documentElement.lang,'ja');
});
