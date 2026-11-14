import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';

test('airport set filters both ledgers, shows missing research prices and keeps coverage independent of search', async t => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const { document, window } = parseHTML(html);
  window.localStorage = { getItem: () => null, setItem() {} };
  const globals = new Map();
  for (const [key, value] of Object.entries({ document, window, CustomEvent:window.CustomEvent })) {
    globals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable:true, writable:true });
  }
  t.after(() => {
    for (const [key, descriptor] of globals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const $ = selector => document.querySelector(selector);
  let setValue = 'all';
  Object.defineProperty($('#data-airport-set'), 'value', {
    get: () => setValue, set: value => { setValue = value; }, configurable:true,
  });
  await import('../dist/data-view.js');
  const counts = () => [document.querySelectorAll('[data-research-airport]').length, document.querySelectorAll('[data-airport-detail]').length];
  const choose = value => {
    $('#data-airport-set').value = value;
    $('#data-airport-set').dispatchEvent(new window.Event('change', {bubbles:true}));
  };
  const search = value => {
    $('#research-airport-search').value = value;
    $('#research-airport-search').dispatchEvent(new window.Event('input', {bubbles:true}));
  };
  assert.equal(document.documentElement.lang, 'en');
  assert.equal($('#data-airport-set').value, 'research');
  assert.deepEqual(counts(), [50, 50]);
  assert.equal($('#research-dataset-title').textContent, 'Asia Top 50 · November 2026');
  assert.match($('#data-set-description').textContent, /2025 passenger traffic/);
  assert.match($('#data-set-price-coverage').textContent, /50 of these 50 airports/);
  assert.equal($('#research-coverage-note').hidden, false);
  choose('all');
  assert.deepEqual(counts(), [101, 101]);
  assert.equal($('#research-dataset-title').textContent, 'All available airports');
  assert.match($('#data-set-description').textContent, /full catalog combines/);
  assert.match($('#data-airport-set-summary').textContent, /101 airports · 50 with research prices · 51 without/);
  assert.equal($('#research-price-rows').textContent.split('Research price unavailable').length-1, 51);
  let emittedSet;
  document.addEventListener('airportsetchange', event => { emittedSet = event.detail.airportSet; });
  choose('research');
  assert.equal(emittedSet, 'research');
  assert.deepEqual(counts(), [50, 50]);
  assert.match($('#data-airport-set-summary').textContent, /50 airports · 50 with research prices · 0 without/);
  search('SIN');
  assert.deepEqual(counts(), [1, 50]);
  assert.match($('#research-count').textContent, /1.*50/);
  assert.match($('#data-airport-set-summary').textContent, /50 with research prices/);
  assert.match($('#research-airport-detail').textContent, /SIN/);
  search('');
  choose('EU');
  assert.deepEqual(counts(), [10, 10]);
  const missingRow = $('[data-research-airport="LHR"]').closest('tr');
  assert.deepEqual([...missingRow.querySelectorAll('td')].slice(1,4).map(cell => cell.textContent), ['—','—','—']);
  $('[data-research-airport="LHR"]').click();
  assert.match($('#research-airport-detail').textContent, /LHR.*Research price unavailable.*outside the Asia Top 50/s);
  assert.match($('#data-airport-set-summary').textContent, /10 airports · 0 with research prices · 10 without/);
  assert.equal($('#research-dataset-title').textContent, 'Europe');
  assert.match($('#data-set-description').textContent, /European airports/);
  assert.match($('#data-set-price-coverage').textContent, /None of these 10 airports/);
  assert.equal($('#research-coverage-note').hidden, true);
  search('not-an-airport');
  assert.deepEqual(counts(), [0, 10]);
  assert.equal($('#research-airport-detail').textContent, '');
  search('');
  document.dispatchEvent(new window.CustomEvent('scenariodatachange', {detail:{airportSet:'research'}}));
  assert.equal($('#data-airport-set').value, 'research');
  assert.deepEqual(counts(), [50, 50]);
  assert.equal($('#research-dataset-title').textContent, 'Asia Top 50 · November 2026');
  const { AIRPORT_SETS, airportsInSet } = await import('../dist/airport-sets.js');
  const { setLanguage, t:translate } = await import('../dist/i18n.js?v=20261113-integrated');
  for (const subset of AIRPORT_SETS) {
    choose(subset.id);
    assert.deepEqual(counts(), [airportsInSet(subset.id).length, airportsInSet(subset.id).length]);
    assert.match($('#data-set-intro').textContent, new RegExp(`${airportsInSet(subset.id).length} airports`));
    assert.notEqual(translate(subset.description), subset.description, `Missing description for ${subset.id}`);
    assert.equal($('#data-set-description').textContent, translate(subset.description));
    assert.equal($('#research-dataset-title').textContent, translate(subset.id === 'research' ? 'research.title' : subset.label));
  }
  setLanguage('zh');
  choose('EU');
  assert.match($('#data-airport-set-summary').textContent, /10 个机场 · 0 个有研究价格 · 10 个暂无研究价格/);
  assert.match($('#research-airport-detail').textContent, /暂无研究价格/);
  assert.equal($('#research-dataset-title').textContent, '欧洲');
  assert.match($('#data-set-description').textContent, /欧洲机场/);
  setLanguage('en');
  assert.equal($('#research-dataset-title').textContent, 'Europe');
  assert.match($('#data-set-description').textContent, /European airports/);
});
