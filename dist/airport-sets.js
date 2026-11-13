import { airportData } from './global-airports.js';
import { AIRPORT_DIRECTORY } from './airport-directory.js';
import { RESEARCH_PRICES } from './research-prices.js';

const researchCodes = new Set(RESEARCH_PRICES.airports.map(row => row.code));
const legacyCodes = new Set(AIRPORT_DIRECTORY.airports.map(row => row.iata));
// build_global_geography.py retains the original navigation sample first.
const globalCodes = new Set(airportData.slice(0, 67).map(row => row.code));
export const AIRPORT_SETS = [
  { id: 'all', label: 'airports.all', includes: () => true },
  { id: 'research', label: 'airports.research', includes: airport => researchCodes.has(airport.code) },
  { id: 'legacy', label: 'airports.legacy', includes: airport => legacyCodes.has(airport.code) },
  { id: 'global-sample', label: 'airports.sample', includes: airport => globalCodes.has(airport.code) },
  ...['AS', 'EU', 'NA', 'SA', 'AF', 'OC'].map(continent => ({ id: continent, label: `airports.${continent}`, includes: airport => airport.continent === continent })),
];
export function airportsInSet(id = 'all') {
  const subset = AIRPORT_SETS.find(item => item.id === id);
  if (!subset) throw new RangeError('Unknown airport set.');
  return airportData.filter(subset.includes);
}
export function visibleAirports(id, retainedCodes = []) {
  const codes = new Set([...airportsInSet(id).map(row => row.code), ...retainedCodes]);
  return airportData.filter(row => codes.has(row.code));
}
