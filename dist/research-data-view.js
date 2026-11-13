import { RESEARCH_PRICES, researchCalibration } from './research-prices.js';
import { AIRPORT_SETS, airportsInSet } from './airport-sets.js';
import { t, getLanguage } from './i18n.js?v=20261113-integrated';

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = value => value.toLocaleString(getLanguage() === 'zh' ? 'zh-CN' : 'en-GB', {minimumFractionDigits:3,maximumFractionDigits:3});
let airportSet = 'all', selected = 'SIN';

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
  const row = RESEARCH_PRICES.airports.find(item => item.code === selected);
  if (!row) { $('#research-airport-detail').innerHTML = ''; return; }
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
  const codes = new Set(airportsInSet(airportSet).map(row=>row.code));
  const search = $('#research-airport-search').value.toLowerCase().trim();
  const rows = RESEARCH_PRICES.airports.filter(row=>codes.has(row.code) && `${row.code} ${row.name} ${row.country}`.toLowerCase().includes(search));
  if (!rows.some(row=>row.code===selected)) selected = rows[0]?.code;
  $('#research-price-rows').innerHTML = rows.length ? rows.map(row=>`<tr><td><button type="button" data-research-airport="${row.code}" aria-pressed="${selected===row.code}">${row.code}</button><small>${esc(row.name)}</small></td>${['low','base','high'].map(key=>`<td>${number(row[key])}</td>`).join('')}<td>${evidence(row)}</td></tr>`).join('') : `<tr><td colspan="5">${t('data.noMatches')}</td></tr>`;
  $('#research-count').textContent = t('airports.count', {count:codes.size,priced:rows.length});
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
  document.addEventListener('scenariodatachange', event=>{const next=event.detail.airportSet||'all';if(next!==airportSet){airportSet=next;render();}});
  document.addEventListener('languagechange',render);
}
