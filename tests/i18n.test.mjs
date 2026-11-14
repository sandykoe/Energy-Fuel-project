import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const source = `<!doctype html><html lang="en"><head><title>Fuel Atlas</title></head><body>
<div role="group" aria-label="Interface language"><button id="language-zh" data-language="zh">中文</button><button id="language-en" data-language="en">English</button></div>
<section class="workspace-panel"><h1>Build your fuel plan</h1><p id="status">Choose airports to generate your plan.</p>
<label id="compound">My quotations <span id="count">2</span><input id="price" value="950" aria-label="Origin fuel price" placeholder="Origin fuel price"></label>
<p id="a">Aviation fuel planning</p><p id="b">DATA EXPLORER / AVIATION</p>
<p id="explicit" data-i18n="How it works">How it works</p></section></body></html>`;

async function mount(t, stored, { blockedStorage = false } = {}) {
  const { document, window } = parseHTML(source);
  const before = new Map();
  for (const [name, value] of Object.entries({ document, window, CustomEvent: window.CustomEvent })) {
    before.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, writable: true, configurable: true });
  }
  const writes = [], storage = new Map(stored ? [['fuel-atlas-language', stored]] : []);
  window.localStorage = { getItem: key => { if (blockedStorage) throw new Error('blocked'); return storage.get(key); }, setItem: (key, value) => { if (blockedStorage) throw new Error('blocked'); writes.push([key, value]); storage.set(key, value); } };
  const api = await import('../dist/i18n.js?v=20261113-bilingual');
  api.initI18n(document);
  t.after(() => {
    for (const [name, descriptor] of before) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  return { api, document, window, writes, storage, $: selector => document.querySelector(selector) };
}

test('English is the default and switching language preserves nested controls and their values', async t => {
  const { $, api, document, writes } = await mount(t);
  assert.equal(document.documentElement.lang, 'en');
  assert.equal($('h1').textContent, 'Build your fuel plan');
  assert.equal($('#language-en').getAttribute('aria-pressed'), 'true');
  assert.equal(writes.length, 0, 'initial render does not persist unrelated state');
  const input = $('#price'), count = $('#count');
  input.value = '1234.5';
  let changed = 0;
  document.addEventListener('languagechange', () => changed++);
  api.setLanguage('zh');
  assert.equal(document.documentElement.lang, 'zh-CN');
  assert.equal($('h1').textContent, '建立你的燃油方案');
  assert.equal($('#price'), input);
  assert.equal(input.value, '1234.5');
  assert.equal($('#count'), count);
  assert.equal(count.textContent, '2');
  assert.equal(input.getAttribute('placeholder'), '出发地燃油价格');
  assert.equal(input.getAttribute('aria-label'), '出发地燃油价格');
  api.setLanguage('en');
  assert.equal(input.getAttribute('placeholder'), 'Origin fuel price');
  assert.equal($('#price'), input);
  assert.equal(changed, 2);
  assert.deepEqual(writes, [['fuel-atlas-language', 'zh'], ['fuel-atlas-language', 'en']]);
});

test('round trips preserve contextual English when different labels share a Chinese translation', async t => {
  const { $, api } = await mount(t, 'zh');
  assert.equal($('#a').textContent, '航空燃油规划');
  assert.equal($('#b').textContent, '航空燃油规划');
  for (let i = 0; i < 3; i++) {
    api.setLanguage('en');
    assert.equal($('#a').textContent, 'Aviation fuel planning');
    assert.equal($('#b').textContent, 'DATA EXPLORER / AVIATION');
    assert.equal($('#explicit').textContent, 'How it works');
    api.setLanguage('zh');
  }
});

test('saved English preference is restored while new dynamic text uses the active locale', async t => {
  const { $, api, document } = await mount(t, 'en');
  assert.equal(api.getLanguage(), 'en');
  assert.equal(document.documentElement.lang, 'en');
  api.setLanguage('zh');
  $('#status').textContent = 'Pause';
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal($('#status').textContent, '暂停');
  api.setLanguage('en');
  assert.equal($('#status').textContent, 'Pause', 'a changed status never restores the previous message');
  assert.equal(api.t('Quantity {{value}}', { value: 0 }), 'Quantity 0');
});

test('translation supports disabled storage and does not replace script or machine-readable text', async t => {
  const { api, document } = await mount(t, undefined, { blockedStorage:true });
  assert.equal(document.documentElement.lang, 'en');
  api.setLanguage('zh');
  const fragment = document.createElement('div');
  fragment.innerHTML = '<pre>Fuel data</pre><script type="application/json">{"label":"Fuel data"}</script><span data-no-i18n>Fuel data</span><span>Fuel data</span>';
  document.body.append(fragment);
  api.translateTree(fragment);
  assert.equal(fragment.querySelector('pre').textContent, 'Fuel data');
  assert.equal(fragment.querySelector('script').textContent, '{"label":"Fuel data"}');
  assert.equal(fragment.querySelector('[data-no-i18n]').textContent, 'Fuel data');
  assert.equal(fragment.lastElementChild.textContent, '航油数据');
  assert.doesNotThrow(() => api.setLanguage('en'));
  assert.throws(() => api.setLanguage('unsupported'), /Unsupported/);
});

test('an explicit Chinese preference is restored', async t => {
  const chinese = await mount(t, 'zh');
  assert.equal(chinese.document.documentElement.lang, 'zh-CN');
  assert.equal(chinese.$('h1').textContent, '建立你的燃油方案');
});

test('an unknown stored locale falls back to English', async t => {
  const fallback = await mount(t, 'unsupported');
  assert.equal(fallback.document.documentElement.lang, 'en');
  assert.equal(fallback.$('h1').textContent, 'Build your fuel plan');
});
