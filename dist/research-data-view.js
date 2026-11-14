import { RESEARCH_PRICES, researchCalibration } from './research-prices.js';
import { AIRPORT_SETS, DEFAULT_AIRPORT_SET, airportsInSet } from './airport-sets.js';
import { airportLabel } from './airport-labels.js';
import { t, getLanguage } from './i18n.js?v=20261113-integrated';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => value.toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-GB', {minimumFractionDigits:3,maximumFractionDigits:3});
let airportSet = DEFAULT_AIRPORT_SET, selected = 'SIN';
const pricesByCode = new Map(RESEARCH_PRICES.airports.map(row => [row.code, row]));

function sources(value) {
  return String(value || '').split(/\s+/).flatMap(text => {
    try {
      const url = new URL(text);
      if (url.protocol !== 'https:' || url.username || url.password) return [];
      return [`<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(url.hostname)}</a>`];
    } catch { return []; }
  }).join(' · ');
}
function evidence(row) {
  return t(row.group === 'ASIA' || ['GULF','INDIA_PEER','TURKEY'].includes(row.group) ? 'research.proxy'
    : row.code === 'TPE' ? 'research.current' : ['DEL','BOM','CGK'].includes(row.code) ? 'research.posting' : 'research.calibrated');
}
function renderDetail() {
  const row = pricesByCode.get(selected);
  if (!row) {
    const airport = airportsInSet(airportSet).find(item => item.code === selected);
    $('#research-airport-detail').innerHTML = airport
      ? `<h3>${esc(airport.code)} · ${esc(airportLabel(airport, getLanguage()).name)}</h3><span class="data-badge">${t('research.missing')}</span><p>${t('research.missingDetail')}</p>`
      : '';
    return;
  }
  const calibration = researchCalibration(row.code);
  $('#research-airport-detail').innerHTML = `<h3>${esc(row.code)} · ${esc(row.name)}</h3><span class="data-badge">${evidence(row)}</span><h4>${t('research.method')}</h4>
    <p data-no-i18n>${esc(calibration.method)}</p><p class="data-equation" data-no-i18n>${esc(calibration.expression)}</p>
    <dl>${['low','base','high'].map(key=>`<div><dt>${t('research.'+key)}</dt><dd>${number(row[key])} USD/L · ${number(row[key]*1250)} USD/t</dd></div>`).join('')}</dl>
    <p data-no-i18n>${esc(calibration.caveats)}</p><p>${sources(calibration.sources)}</p>`;
}
function render() {
  if (!$('#research-price-rows')) return;
  $('#data-airport-set').innerHTML = AIRPORT_SETS.map(item=>`<option value="${item.id}" ${item.id===airportSet?'selected':''}>${esc(t(item.label))} (${airportsInSet(item.id).length})</option>`).join('');
  $('#data-airport-set').value = airportSet;
  const airports = airportsInSet(airportSet);
  const priced = airports.filter(airport => pricesByCode.has(airport.code)).length;
  const subset = AIRPORT_SETS.find(item => item.id === airportSet);
  const title = $('#research-dataset-title');
  const titleKey = airportSet === 'research' ? 'research.title' : subset.label;
  title.setAttribute('data-i18n', titleKey);
  title.textContent = t(titleKey);
  const description = $('#data-set-description');
  description.setAttribute('data-i18n', subset.description);
  description.textContent = t(subset.description);
  $('#data-set-intro').textContent = t('datasets.intro', {name:t(subset.label), count:airports.length});
  $('#data-set-price-coverage').textContent = t(priced ? 'datasets.priced' : 'datasets.unpriced', {count:airports.length, priced});
  $('#research-coverage-note').hidden = priced === 0;
  $('#data-airport-set-summary').textContent = t('airports.coverage', {count:airports.length, priced, missing:airports.length-priced});
  const search = $('#research-airport-search').value.toLowerCase().trim();
  const rows = airports.filter(airport => {
    const row = pricesByCode.get(airport.code);
    return [airport.code, airport.region, row?.name, row?.country, airportLabel(airport, 'en').name, airportLabel(airport, 'en').city, airportLabel(airport, 'zh').name, airport.city].join(' ').toLowerCase().includes(search);
  });
  if (!rows.some(row=>row.code===selected)) selected = rows[0]?.code;
  $('#research-price-rows').innerHTML = rows.length ? rows.map(airport => {
    const row = pricesByCode.get(airport.code);
    return `<tr><td><button type="button" data-research-airport="${airport.code}" aria-pressed="${selected===airport.code}">${airport.code}</button><small>${esc(row?.name || airportLabel(airport, getLanguage()).name)}</small></td>${['low','base','high'].map(key=>`<td>${row ? number(row[key]) : '—'}</td>`).join('')}<td>${row ? evidence(row) : t('research.missing')}</td></tr>`;
  }).join('') : `<tr><td colspan="5">${t('data.noMatches')}</td></tr>`;
  $('#research-count').textContent = t('data.count', {visible:rows.length,total:airports.length});
  renderDetail();
  $('#research-input-rows').innerHTML = RESEARCH_PRICES.inputs.map(row=>`<tr><th data-no-i18n>${esc(row.parameter)}</th><td>${esc(row.value)} ${esc(row.unit)}</td><td data-no-i18n>${esc(row.period)}</td><td>${sources(row.source)}<small data-no-i18n>${esc(row.caveat)}</small></td></tr>`).join('');
}
function downloadCsv() {
  const cell = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
  const rows = [['airport','planning_month','classification','low_usd_per_l','base_usd_per_l','high_usd_per_l','density_kg_per_l','group','evidence','method','caveats','source_urls'],
    ...RESEARCH_PRICES.airports.map(row=>{const c=researchCalibration(row.code);return [row.code,RESEARCH_PRICES.planningMonth,'research_estimate',row.low,row.base,row.high,0.8,row.group,row.evidence,c.method,c.caveats,c.sources];})];
  const url = URL.createObjectURL(new Blob([rows.map(row=>row.map(cell).join(',')).join('\r\n')], {type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download='fuel-atlas-research-prices-2026-11.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
if ($('#research-dataset')) {
  render();
  $('#research-airport-search').addEventListener('input', render);
  $('#data-airport-set').addEventListener('change', event=>{airportSet=event.target.value;render();document.dispatchEvent(new CustomEvent('airportsetchange',{detail:{airportSet}}));});
  $('#research-price-rows').addEventListener('click', event=>{const button=event.target.closest('[data-research-airport]');if(!button)return;selected=button.dataset.researchAirport;for(const b of $('#research-price-rows').querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));renderDetail();});
  $('#research-export-csv').addEventListener('click', downloadCsv);
  document.addEventListener('scenariodatachange', event=>{const next=event.detail.airportSet||DEFAULT_AIRPORT_SET;if(next!==airportSet){airportSet=next;render();}});
  document.addEventListener('languagechange',render);
}
