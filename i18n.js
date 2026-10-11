/* Bind only interface nodes present before application rendering. Never scan user data. */
(function (root) {
  'use strict';
  const messages = root.StockMessages;
  let language = 'ja';
  const bindings = [];
  const sourceKeys = new Map(Object.entries(messages.ja).map(([key, text]) => [text, key]));
  function choose(query, saved, browser) {
    return [query, saved].find(value => ['ja', 'en'].includes(value)) || (/^ja(?:-|$)/i.test(browser || '') ? 'ja' : 'en');
  }
  function t(key, values = {}) {
    const text = messages[language][key];
    if (text === undefined) throw new Error('Missing message: ' + key);
    return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? '{' + name + '}'));
  }
  function capture() {
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('script, style')) continue;
      const key = sourceKeys.get(node.textContent.trim());
      if (key) bindings.push({ node, key, prefix: node.textContent.match(/^\s*/)[0], suffix: node.textContent.match(/\s*$/)[0] });
    }
    for (const element of document.querySelectorAll('*')) {
      for (const attribute of ['aria-label', 'placeholder', 'data-tooltip', 'content', ...(element.closest('datalist') ? ['value'] : [])]) {
        const key = sourceKeys.get(element.getAttribute(attribute));
        if (key) bindings.push({ element, attribute, key });
      }
    }
  }
  function setLanguage(next, persist = true) {
    if (!['ja', 'en'].includes(next)) return;
    const old = language;
    // These status nodes contain only interface messages, never user-provided values.
    const statusKeys = new Map(Object.entries(messages[old]).map(([key, text]) => [text, key]));
    const statuses = Array.from(document.querySelectorAll('#operationStatus, #storageStatus, #itemError, #actionError, #shoppingStatus, #modalTitle, #actionTitle, #themeText'))
      .map(node => [node, statusKeys.get(node.textContent)]);
    language = next;
    document.documentElement.lang = next;
    for (const binding of bindings) {
      if (binding.node?.isConnected) binding.node.textContent = binding.prefix + t(binding.key) + binding.suffix;
      else if (binding.element?.isConnected) binding.element.setAttribute(binding.attribute, t(binding.key));
    }
    statuses.forEach(([node, key]) => { if (key) node.textContent = t(key); });
    const button = document.getElementById('languageToggle');
    button.textContent = next === 'ja' ? 'English' : '日本語';
    button.lang = next === 'ja' ? 'en' : 'ja';
    if (persist) { try { localStorage.setItem('rsp_language', next); } catch (_) { /* Optional preference. */ } }
    document.dispatchEvent(new Event('languagechange'));
  }
  let saved;
  try { saved = localStorage.getItem('rsp_language'); } catch (_) { /* Optional preference. */ }
  capture();
  setLanguage(choose(new URLSearchParams(location.search).get('lang'), saved, navigator.language), false);
  document.getElementById('languageToggle').addEventListener('click', () => setLanguage(language === 'ja' ? 'en' : 'ja'));
  root.StockI18n = { t, choose, setLanguage, locale: () => language === 'ja' ? 'ja-JP' : 'en-US' };
})(globalThis);
