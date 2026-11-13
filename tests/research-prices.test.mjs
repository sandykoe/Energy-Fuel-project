import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RESEARCH_PRICES, researchPrice, researchProvenance, adverseResearchSpread } from '../dist/research-prices.js';
import { airportData } from '../dist/global-airports.js';
import { airportsInSet, visibleAirports } from '../dist/airport-sets.js';
import { ROUTE_EXAMPLES } from '../dist/route-examples.js';
import { deriveScenario } from '../dist/scenario-data.js';
import { buildIntegratedNetwork } from '../dist/integrated-data.js';
import { optimizeIntegratedRotation } from '../dist/integrated-optimizer.js';

const near = (actual, expected, tolerance=1e-8) => assert.ok(Math.abs(actual-expected)<tolerance, `${actual} != ${expected}`);
function exampleInput(example, priceCase='base') {
  const input=deriveScenario(example.route,example.aircraft);
  input.initialFuelT=example.initialFuelT;
  for(const leg of input.legs) {
    leg.priceUsdPerT=researchPrice(leg.from,priceCase);
    leg.maxUpliftT=leg.from===example.unavailable?0:120;
  }
  input.researchProvenance=researchProvenance(example.route,priceCase);
  input.supplyChain=buildIntegratedNetwork(input,{priceMode:'research'});
  return input;
}

test('research snapshot preserves evidence, dates and formula provenance with matching download', async()=>{
  assert.deepEqual(JSON.parse(await readFile(new URL('../dist/data/research-prices.json',import.meta.url))),RESEARCH_PRICES);
  assert.equal(RESEARCH_PRICES.airports.length,50);
  assert.equal(new Set(RESEARCH_PRICES.airports.map(row=>row.code)).size,50);
  assert.equal(RESEARCH_PRICES.observations.length,38);
  assert.equal(RESEARCH_PRICES.airports.filter(row=>row.group==='ASIA').length,30);
  assert.equal(RESEARCH_PRICES.planningMonth,'2026-11');
  assert.equal(RESEARCH_PRICES.source.sha256.length,64);
  assert.ok(RESEARCH_PRICES.formulas.Calibrations.C7);
  for(const row of RESEARCH_PRICES.airports) {
    assert.ok(row.low>0 && row.low<=row.base && row.base<=row.high);
    assert.ok(airportData.some(airport=>airport.code===row.code));
    near(researchPrice(row.code),row.base*1250);
  }
  assert.equal(researchPrice('LHR'),undefined);
  assert.throws(()=>researchPrice('SIN','optimistic'),/Unknown research/);
});

test('calibration values independently reconcile to the retained workbook inputs',()=>{
  const v=row=>RESEARCH_PRICES.inputs.find(input=>input.sourceRow===row).value;
  const sg=(v(11)+v(12))/2/v(9), gulf=v(15)/v(9), change=(v(15)-v(16))/v(9);
  const japan=sg+(v(18)-v(17))/v(9)+v(21)/v(22)/v(23)+v(24);
  const korea=sg+v(19)/100/v(10)-v(20)/v(9);
  const expected={
    ASIA:[sg,v(13),sg+v(33)], GULF:[gulf+v(43),gulf+v(32),gulf+v(44)],
    JAPAN:[japan-v(38),japan,japan+v(38)], KOREA:[korea-v(39),korea,korea+v(39)],
    TPE:[v(13)+v(25)/v(26)-v(37),v(13)+v(25)/v(26),v(13)+v(25)/v(26)+v(37)],
    DEL:[v(27)+change-v(40),v(27)+change,v(27)+change+v(40)],
    BOM:[v(28)+change-v(40),v(28)+change,v(28)+change+v(40)],
    INDIA_PEER:[(v(27)+v(28))/2+change-v(40),(v(27)+v(28))/2+change,(v(27)+v(28))/2+change+v(40)],
    CGK:[v(31)+v(13)-v(14)-v(41),v(31)+v(13)-v(14),v(31)+v(13)-v(14)+v(41)],
    TURKEY:[v(34)*v(35)/1000+v(36)-v(42),v(34)*v(35)/1000+v(36),v(34)*v(35)/1000+v(36)+v(42)],
  };
  for(const group of RESEARCH_PRICES.calibrations) {
    assert.ok(expected[group.group],group.group);
    ['low','base','high'].forEach((key,i)=>near(group[key],expected[group.group][i]));
  }
});

test('airport sets preserve both distinct top-fifty directories and selected route stops',()=>{
  assert.equal(airportsInSet('all').length,101);
  assert.equal(airportsInSet('research').length,50);
  assert.equal(airportsInSet('legacy').length,50);
  assert.equal(airportsInSet('global-sample').length,67);
  assert.equal(new Set(airportData.map(row=>row.code)).size,101);
  assert.ok(airportsInSet('legacy').some(row=>row.code==='KWE'));
  assert.ok(!airportsInSet('research').some(row=>row.code==='KWE'));
  assert.ok(airportsInSet('research').some(row=>row.code==='JED'));
  assert.ok(!airportsInSet('research').some(row=>row.code==='IST'));
  assert.equal(visibleAirports('research',['LHR','LHR']).length,51);
});

test('five research examples solve with price counted once and no fictional contract claims',()=>{
  const results=new Map();
  for(const example of ROUTE_EXAMPLES.filter(row=>row.priceMode==='research')) {
    const input=exampleInput(example);
    assert.equal(input.supplyChain.classification,'research_estimates_with_assumed_network');
    assert.equal(input.supplyChain.suppliers.length,0);
    assert.equal(input.supplyChain.routes.length,0);
    for(const airport of input.supplyChain.airports) {
      assert.equal(airport.intoPlaneUsdPerT+airport.taxAdjustmentUsdPerT+airport.holdingUsdPerTPerStage,0);
    }
    for(const offer of input.supplyChain.deliveredOffers) assert.equal(offer.provenance.classification,'research_estimate');
    const result=optimizeIntegratedRotation(input);
    assert.equal(result.feasible,true,example.id);
    near(result.totalCostUsd,result.legs.reduce((sum,leg,i)=>sum+leg.upliftT*input.legs[i].priceUsdPerT,0),1e-5);
    results.set(example.id,result);
  }
  assert.equal(results.size,5);
  assert.ok(results.get('short-haul').savingsPercent>9);
  assert.ok(results.get('gulf-india').savingsPercent>3);
  near(results.get('small-spread').savingsUsd,0);
  assert.equal(results.get('supply-interruption').baseline.feasible,false);
  assert.equal(results.get('supply-interruption').savingsUsd,null);
  assert.equal(results.get('supply-interruption').legs[1].upliftT,0);
  assert.ok(results.get('mixed-length').savingsPercent>1);
  const adverse=adverseResearchSpread(results.get('short-haul'));
  assert.ok(adverse.savingUsd<0);
  assert.equal(adverse.groups.filter(group=>group.group==='ASIA').length,1);
  assert.equal(adverseResearchSpread(results.get('supply-interruption')),null);
});

test('research mode refuses missing prices and cannot add synthetic fees',()=>{
  const input=exampleInput(ROUTE_EXAMPLES[0]);
  assert.throws(()=>buildIntegratedNetwork(input,{priceMode:'research',overrides:{airports:{SIN:{intoPlaneUsdPerT:20}}}}),/cannot add/);
  const missing=deriveScenario(['LHR','DXB'],'widebody');
  missing.legs[0].priceUsdPerT=researchPrice('LHR');
  assert.throws(()=>buildIntegratedNetwork(missing,{priceMode:'research'}),/price/);
});
