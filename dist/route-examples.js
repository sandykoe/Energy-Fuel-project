export const ROUTE_EXAMPLES = [
  { id: 'short-haul', route: ['SIN','CGK','SIN'], aircraft: 'narrowbody', initialFuelT: 4, priceMode: 'research', title: 'examples.shortTitle', description: 'examples.shortDescription' },
  { id: 'gulf-india', route: ['DXB','DEL','DXB'], aircraft: 'narrowbody', initialFuelT: 4, priceMode: 'research', title: 'examples.gulfTitle', description: 'examples.gulfDescription' },
  { id: 'small-spread', route: ['ICN','NRT','ICN'], aircraft: 'narrowbody', initialFuelT: 4, priceMode: 'research', title: 'examples.smallTitle', description: 'examples.smallDescription' },
  { id: 'supply-interruption', route: ['HKG','MNL','SIN','HKG'], aircraft: 'narrowbody', initialFuelT: 4, priceMode: 'research', unavailable: 'MNL', title: 'examples.supplyTitle', description: 'examples.supplyDescription' },
  { id: 'mixed-length', route: ['DXB','SIN','CGK','SIN','DXB'], aircraft: 'widebody', initialFuelT: 8, priceMode: 'research', title: 'examples.mixedTitle', description: 'examples.mixedDescription' },
  { id: 'global', route: ['SIN','DXB','LHR','JFK','LAX'], aircraft: 'widebody', initialFuelT: 0, priceMode: 'demo', title: 'Global route', description: 'examples.globalDescription' },
  { id: 'eastasia', route: ['PVG','ICN','HND','PVG'], aircraft: 'widebody', initialFuelT: 0, priceMode: 'demo', title: 'East Asia route', description: 'examples.eastDescription' },
];
