import { RESEARCH_PRICES } from './research-price-snapshot.js';
export { RESEARCH_PRICES };
export const RESEARCH_CASES = ['low', 'base', 'high'];
const records = new Map(RESEARCH_PRICES.airports.map(row => [row.code, row]));
const calibrations = new Map(RESEARCH_PRICES.calibrations.map(row => [row.group, row]));

export function researchRecord(code) { return records.get(code); }
export function researchCalibration(code) { return calibrations.get(records.get(code)?.group); }
export function researchPrice(code, priceCase = 'base') {
  if (!RESEARCH_CASES.includes(priceCase)) throw new RangeError('Unknown research price case.');
  const row = records.get(code);
  return row ? row[priceCase] * 1000 / RESEARCH_PRICES.densityKgPerL : undefined;
}
export function researchProvenance(codes, priceCase = 'base') {
  return {
    dataset: RESEARCH_PRICES.id, revision: RESEARCH_PRICES.revision,
    planningMonth: RESEARCH_PRICES.planningMonth, priceCase,
    classification: 'research_estimates', densityKgPerL: RESEARCH_PRICES.densityKgPerL,
    conversion: 'USD/L × 1000 / density kg/L = USD/metric tonne',
    source: RESEARCH_PRICES.source,
    boundary: 'Planning totals, not verified supplier quotations. Taxes and eligibility are not fully harmonized. No extra synthetic delivery fees. Aircraft and availability remain assumptions.',
    airports: [...new Set(codes)].map(code => ({ code, estimate: records.get(code) ?? null, calibration: researchCalibration(code) ?? null })),
  };
}

// Reprice the selected plan and its feasible reference without re-optimizing.
// Shared calibration groups move together: proxy ties must not become invented
// airport arbitrage. Benchmark anchors stay fixed, as in the workbook bands.
export function adverseResearchSpread(result) {
  if (!result?.feasible || !result.baseline?.feasible) return null;
  const delta = new Map();
  for (const [plan, sign] of [[result, 1], [result.baseline, -1]]) {
    for (const shipment of plan.supplyChain.shipments) {
      const record = records.get(shipment.airport);
      if (!record) return null;
      delta.set(record.group, (delta.get(record.group) || 0) + sign * shipment.quantityT);
    }
  }
  let savingUsd = 0;
  const groups = [];
  for (const [group, extraPurchasedT] of delta) {
    const priceCase = extraPurchasedT > 1e-8 ? 'high' : 'low';
    const priceUsdPerT = calibrations.get(group)[priceCase] * 1250;
    savingUsd -= extraPurchasedT * priceUsdPerT;
    groups.push({ group, priceCase, extraPurchasedT, priceUsdPerT });
  }
  return { savingUsd, groups, classification: 'fixed_plan_price_spread_stress',
    boundary: 'Selected plan and reference held fixed; each shared calibration group moves together within its Low/High band. Assumption stress, not a probability or a forecast.' };
}
