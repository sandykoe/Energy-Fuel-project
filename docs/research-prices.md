# Research prices and route examples

The Model offers three explicit price modes: generated assumptions, November
2026 research estimates, and imported supplier quotations. Research estimates
never satisfy the supplier quotation contract or silently fill missing prices.
They retain their November period regardless of the selected flight date.

The 50-airport workbook snapshot includes all three price cases, original
observations and dates, input definitions, source links, calibration recipes,
Excel formulas, traffic qualifications and a SHA-256 of the supplied workbook.
The files are `dist/data/research-prices.json` (download) and
`dist/research-price-snapshot.js` (offline browser input). Reimport with
`python3 scripts/import_research_prices.py /path/Asia_Top50_Jet_Fuel_Prices.xlsx`
using an environment with openpyxl. The importer reads the workbook without
modifying it and retains cached values; tests independently reconcile the ten
calibrations to their underlying inputs. Review a new period before replacing
the snapshot or its hard-coded period labels.

Prices are planning totals with incompletely harmonized tax and eligibility
terms. Convert USD/litre to USD/metric tonne using the workbook density
assumption of 0.8 kg/litre (multiply by 1,250). The joint optimizer uses its
direct local-price path and disables extra synthetic freight, service, tax and
holding charges. This does not certify those charges as zero. Network and
aircraft constraints remain explicit assumptions. Exported provenance calls
these `research_estimates_with_assumed_network`, never supplier quotes.

Low/Base/High calculations re-optimize the same route and supply constraints.
The adverse-spread check holds both chosen and reference fuel plans fixed,
aggregates purchased quantities by calibration group, and reprices each group
at the adverse end of its band. Shared proxy prices move together; commodity
anchors remain fixed as in the workbook. The result is an assumption stress,
not a probability, forecast or confidence interval. Savings are absent when
the reference is infeasible.

The airport picker contains the union of the original global sample (67), the
older East/Southeast Asia traffic directory (50, 2024) and the workbook's
geographic-Asia selection (50, reconstructed 2025 traffic): 101 unique airports.
The 34 added coordinates retain separate OurAirports snapshot provenance in
`src/geography/airport-extensions.json`. Neither the union nor the workbook is
presented as an official worldwide airport ranking. Regional subsets and both
Top 50 lists are selectable. Filtering preserves existing route stops and
solved results. Data tables show the chosen subset; exports include the complete
named dataset and the plan records its selected subset.

Five research presets explain short-haul tankering, price-versus-weight tradeoff,
uneconomic tankering, a fictional Manila supply interruption, and joint planning
across long and short sectors. Loading one resets committed and pending supply
edits, chooses its generic aircraft, initial fuel, research Base prices and
assumed per-visit caps. It does not calculate automatically. The two original
generated-price examples remain available in a separate dropdown group.

Local review: run `npm run build`, `npm run check`, and `npm test`, then serve
`dist` on localhost (`npm run dev`, default port 4173). The HTML is generated
from `src/workspace/index.template.html` and `dist/data-view/panel.html`; do not
edit `dist/index.html` directly. This working branch is intended for local
review before a merge or deployment.
