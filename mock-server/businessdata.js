// Business context seeds: the base data the mandates stand on — what the
// company is, what it sells, to whom. Company-wide context (not persona-
// partitioned). Rows a counterpart has raised drift on carry the findingId
// of their thread, so base data links straight into the loop.

export const businessContextSeed = {
  fmcg: {
    skuDimension: 'SKU family',
    customerDimension: 'Customer',
    overview: {
      orgName: 'Americana Foods (demo)',
      tagline: 'A Gulf food group — four divisions, one accountability loop.',
      narrative: [
        'Americana Foods is a GCC-headquartered FMCG food group with roughly AED 6.8B in annual revenue. It manufactures in the UAE, KSA and Egypt, and sells across the Gulf through modern trade, traditional trade, food service and a fast-growing e-commerce and quick-commerce channel.',
        'The business runs as four divisions, each with its own COO and P&L: Protein (frozen and fresh poultry — the largest and most margin-sensitive), G&I (grains and instants, including the Ramadan-critical noodle and rice ranges), Fruits & Vegetables (fresh produce with the shortest shelf life and highest shrink risk), and Ambient Foods (canned goods, sauces and snacks — the most promo-driven).',
        'Every division holds the same four functions — supply chain, production, commercial finance, and analysts — and shares group-level functions: FP&A under the CFO, plus procurement, shared services, HR services and audit under the Group CEO. Division commercial finance answers to its COO on the solid line and the CFO on the dotted line, so a margin drift is held by two chains at once.',
        'In Rewive, every one of these numbers is a mandate held twice: a person owns it, and an agent counterpart watches the same number. When the number drifts from the base data you see here, the counterpart raises a finding and the loop starts — Sense → Find → Decide → Act → Close.',
      ],
      stats: [
        { label: 'Revenue (TTM)', value: 'AED 6.8B', note: '+5.2% YoY' },
        { label: 'EBITDA margin', value: '12.6%', note: 'target 14.0%' },
        { label: 'Operating entities', value: '4', note: 'UAE · KSA · Egypt · GCC' },
        { label: 'Active SKUs', value: '~1,240', note: '12 families tracked here' },
        { label: 'Key accounts', value: '38', note: '8 shown here' },
        { label: 'Mandates held twice', value: '31', note: 'person + counterpart' },
      ],
      divisions: [
        { key: 'protein', name: 'Protein', leader: 'Ahmed Al Farsi', role: 'COO — Protein', revenueShare: '38%', brands: ['Farm Fresh Poultry', 'Golden Breaded'], note: 'Frozen and fresh poultry. Import-dependent (Brazil), cold-chain critical, key-account penalty clauses on fill rate.', watchedBy: 'Supply chain · Production · Commercial finance counterparts' },
        { key: 'gi', name: 'G&I', leader: 'Salim Qureshi', role: 'COO — G&I', revenueShare: '24%', brands: ['Deema Rice', 'QuickPot Noodles'], note: 'Grains and instants. Seasonal peaks (Ramadan build), co-pack capacity shared across launches.', watchedBy: 'Supply chain counterpart · G&I' },
        { key: 'fnv', name: 'Fruits & Vegetables', leader: 'Rania Kassem', role: 'COO — Fruits & Vegetables', revenueShare: '17%', brands: ['DailyFresh', 'GreenCrate'], note: 'Fresh produce. Shortest shelf life in the group — shrink and cold-chain excursions are the standing risks.', watchedBy: 'Supply chain counterpart · F&V' },
        { key: 'ambient', name: 'Ambient Foods', leader: 'Khalid Mansour', role: 'COO — Ambient Foods', revenueShare: '21%', brands: ['Sahara Canned', 'Zayt Sauces', 'Crunchies'], note: 'Canned, sauces, snacks. The most promo-driven division — trade spend ROI is the number to watch.', watchedBy: 'Supply chain counterpart · Ambient' },
      ],
      entities: [
        { name: 'UAE Trading Co.', region: 'UAE', role: 'Sales and distribution — UAE modern and traditional trade' },
        { name: 'KSA Manufacturing Co.', region: 'KSA', role: 'Largest plant network; supplies KSA and exports to GCC' },
        { name: 'Gulf Distribution Co.', region: 'Kuwait & GCC', role: 'Distributor operations for Kuwait, Qatar, Bahrain, Oman' },
        { name: 'Egypt Foods S.A.E.', region: 'Egypt', role: 'Low-cost manufacturing base and domestic Egyptian market' },
      ],
      channels: [
        { name: 'Modern trade', share: '46%', note: 'Carrefour, Lulu, Spinneys, Panda — where fill-rate penalties and OSA audits live' },
        { name: 'Traditional trade', share: '28%', note: 'Distributor-served groceries; sell-in vs sell-out gap is the watch item' },
        { name: 'Food service', share: '14%', note: 'QSR and catering contracts, steady margins' },
        { name: 'E-com & q-com', share: '12%', note: 'Fastest growing; promo OSA during quarter-end load-in drifts here' },
      ],
      actGuide: [
        { title: 'Start from the number', body: 'Sales by SKU and Sales by customer are the base data. A row marked “drifting” means the counterpart watching that number has already raised a finding — the link takes you to its thread.' },
        { title: 'The finding is the unit of work', body: 'Each finding names the drift, the evidence, and the role whose call it is. It waits in that role\'s Today queue with an SLA clock. Silence is not neutral: past the SLA it escalates up the org — function → division COO → Group CEO.' },
        { title: 'Make the four-A call', body: 'Accept sets a measurable exit condition the counterpart watches until the number is back. Act opens a solution design. Acknowledge parks it on a trip-wire. Abandon requires a reason, which tunes the agent.' },
        { title: 'Nothing is done until the number is back', body: 'Accepted findings appear in Findings → Watching until the exit condition holds. Every call lands in the Decision Ledger, and an assessor returns a verdict later: worked, didn\'t, or too early. That is the company\'s memory of judgment.' },
      ],
    },
    skus: [
      { id: 'sku-frozen-chicken', family: 'Frozen chicken', division: 'Protein', revenueYtd: 'AED 812M', growthYoyPct: 3.1, grossMarginPct: 27.4, fillRatePct: 84, health: 'drifting', note: 'Brazil import delays exhausted DC safety stock; key-account penalties trigger at 85%', findingId: 'fmcg-f-protein-fill' },
      { id: 'sku-breaded', family: 'Breaded chicken', division: 'Protein', revenueYtd: 'AED 486M', growthYoyPct: 6.8, grossMarginPct: 31.2, fillRatePct: 95, health: 'watch', note: 'Line 2 first-pass yield slipped to 91% — margin drag if the trend holds', findingId: 'fmcg-f-protein-yield' },
      { id: 'sku-fresh-poultry', family: 'Fresh poultry', division: 'Protein', revenueYtd: 'AED 624M', growthYoyPct: 4.4, grossMarginPct: 24.1, fillRatePct: 97, health: 'ok', note: 'On plan across entities' },
      { id: 'sku-noodles', family: 'Instant noodles', division: 'G&I', revenueYtd: 'AED 388M', growthYoyPct: 9.2, grossMarginPct: 34.6, fillRatePct: 94, health: 'watch', note: 'Ramadan build 9 days behind plan on the two hero SKUs', findingId: 'fmcg-f-gi-rushbuild' },
      { id: 'sku-rice', family: 'Rice & grains', division: 'G&I', revenueYtd: 'AED 402M', growthYoyPct: 2.6, grossMarginPct: 22.8, fillRatePct: 98, health: 'ok', note: 'Steady; long shelf life buffers planning noise' },
      { id: 'sku-breakfast', family: 'Breakfast mixes', division: 'G&I', revenueYtd: 'AED 168M', growthYoyPct: 14.9, grossMarginPct: 36.1, fillRatePct: 96, health: 'watch', note: 'September launch double-booked on co-pack line 2', findingId: 'fmcg-f-gi-capacity' },
      { id: 'sku-berries', family: 'Fresh berries & salads', division: 'F&V', revenueYtd: 'AED 296M', growthYoyPct: 11.3, grossMarginPct: 29.7, fillRatePct: 93, health: 'drifting', note: 'Shrink at 6.1% vs 4.0% standard since the inbound QC change', findingId: 'fmcg-f-fnv-shrink' },
      { id: 'sku-frozen-veg', family: 'Frozen vegetables', division: 'F&V', revenueYtd: 'AED 214M', growthYoyPct: 5.0, grossMarginPct: 26.3, fillRatePct: 97, health: 'ok', note: 'On plan' },
      { id: 'sku-canned', family: 'Canned goods', division: 'Ambient Foods', revenueYtd: 'AED 342M', growthYoyPct: 1.8, grossMarginPct: 30.9, fillRatePct: 96, health: 'drifting', note: 'Promo ROI at 0.6x — display bought, volume didn\'t follow', findingId: 'fmcg-f-ambient-promo-roi' },
      { id: 'sku-sauces', family: 'Sauces & dressings', division: 'Ambient Foods', revenueYtd: 'AED 268M', growthYoyPct: 7.4, grossMarginPct: 35.8, fillRatePct: 97, health: 'watch', note: 'Palm-oil re-price lands +7% next month — margin exposure across the range', findingId: 'fmcg-f-proc-palmoil' },
      { id: 'sku-snacks', family: 'Snacks', division: 'Ambient Foods', revenueYtd: 'AED 386M', growthYoyPct: 8.8, grossMarginPct: 38.2, fillRatePct: 95, health: 'ok', note: 'Growth on plan; NPD contribution rising' },
      { id: 'sku-trade-frozen', family: 'Frozen ready meals', division: 'Protein', revenueYtd: 'AED 176M', growthYoyPct: 12.6, grossMarginPct: 33.4, fillRatePct: 92, health: 'watch', note: 'Forecast bias under-calls frozen demand — same root cause as the frozen forecast finding', findingId: 'fmcg-f-1' },
    ],
    customers: [
      { id: 'cust-carrefour', customer: 'Carrefour UAE', channel: 'Modern trade', region: 'UAE', revenueYtd: 'AED 486M', growthYoyPct: 4.2, tradeSpendPct: 15.8, osaPct: 92, dsoDays: 74, health: 'drifting', note: 'Receivables stretched to 74 days against 45-day terms', findingId: 'fmcg-f-carrefour-dso' },
      { id: 'cust-lulu', customer: 'Lulu Group KSA', channel: 'Modern trade', region: 'KSA', revenueYtd: 'AED 412M', growthYoyPct: 6.1, tradeSpendPct: 14.2, osaPct: 89, dsoDays: 48, health: 'drifting', note: 'OSA below 90% on promoted lines — merchandising gap, not stock', findingId: 'fmcg-f-lulu-osa' },
      { id: 'cust-panda', customer: 'Panda Retail KSA', channel: 'Modern trade', region: 'KSA', revenueYtd: 'AED 298M', growthYoyPct: 8.9, tradeSpendPct: 13.6, osaPct: 93, dsoDays: 52, health: 'watch', note: 'Sell-in running 12% ahead of sell-out — channel stuffing risk', findingId: 'fmcg-f-8' },
      { id: 'cust-spinneys', customer: 'Spinneys UAE', channel: 'Modern trade', region: 'UAE', revenueYtd: 'AED 186M', growthYoyPct: 5.4, tradeSpendPct: 12.1, osaPct: 96, dsoDays: 41, health: 'ok', note: 'Model account — terms and OSA both on plan' },
      { id: 'cust-unioncoop', customer: 'Union Coop', channel: 'Modern trade', region: 'UAE', revenueYtd: 'AED 154M', growthYoyPct: 3.8, tradeSpendPct: 12.9, osaPct: 94, dsoDays: 45, health: 'ok', note: 'Steady; quarterly range reviews on schedule' },
      { id: 'cust-gulfdist', customer: 'GCC distributors (agg.)', channel: 'Traditional trade', region: 'Kuwait & GCC', revenueYtd: 'AED 522M', growthYoyPct: 2.2, tradeSpendPct: 10.4, osaPct: 88, dsoDays: 58, health: 'watch', note: 'Quarter-end load-in starves store replenishment on promo lines', findingId: 'fmcg-f-ambient-osa' },
      { id: 'cust-qcom', customer: 'Talabat / noon minutes', channel: 'E-com & q-com', region: 'UAE', revenueYtd: 'AED 148M', growthYoyPct: 32.4, tradeSpendPct: 16.8, osaPct: 95, dsoDays: 28, health: 'ok', note: 'Fastest-growing accounts; watch picking capacity as volume scales' },
      { id: 'cust-foodservice', customer: 'QSR & catering (agg.)', channel: 'Food service', region: 'GCC', revenueYtd: 'AED 634M', growthYoyPct: 4.9, tradeSpendPct: 6.2, osaPct: 97, dsoDays: 39, health: 'ok', note: 'Contracted volumes, steady margins' },
    ],
  },

  healthcare: {
    skuDimension: 'Service line',
    customerDimension: 'Payer',
    overview: {
      orgName: 'Metro Health System (demo)',
      tagline: 'A regional health system — three facilities, one accountability loop.',
      narrative: [
        'Metro Health System operates a general hospital, a clinic network and a surgical center across three regions, with roughly $940M in annual net patient revenue.',
        'Revenue flows through payer contracts — two national commercial payers, Medicare/Medicaid, and self-pay. The margin risks live in denials, length of stay, and agency labor; the quality mandates live in HAI rates and readmissions.',
        'In Rewive, every service-line and payer number below is a mandate held twice: an operator owns it and a counterpart watches it. Drift becomes a finding routed to whoever\'s call it is.',
      ],
      stats: [
        { label: 'Net patient revenue (TTM)', value: '$940M', note: '+3.4% YoY' },
        { label: 'Operating margin', value: '2.1%', note: 'target 4.0%' },
        { label: 'Facilities', value: '3', note: 'hospital · clinics · surgical center' },
        { label: 'Service lines', value: '12', note: '4 shown here' },
      ],
      divisions: [
        { key: 'hospital', name: 'Metro General Hospital', leader: 'Dr. Maya Suresh', role: 'Chief medical officer', revenueShare: '58%', brands: ['Inpatient', 'ED', 'OR'], note: 'The margin engine — bed occupancy, OR utilization and length of stay drive everything.', watchedBy: 'Clinical ops counterpart' },
        { key: 'clinics', name: 'Northside Clinics', leader: 'Fatima Al Marri', role: 'Patient experience lead', revenueShare: '26%', brands: ['Primary care', 'Specialty'], note: 'Access and no-show rates are the standing watch items.', watchedBy: 'Patient experience counterpart' },
        { key: 'surgical', name: 'Lakeside Surgical Center', leader: 'James Okafor', role: 'Revenue cycle director', revenueShare: '16%', brands: ['Ambulatory surgery'], note: 'Highest margin per case; payer mix and denials decide the quarter.', watchedBy: 'Revenue cycle counterpart' },
      ],
      entities: [
        { name: 'Metro General Hospital', region: 'Northeast', role: 'Acute care flagship' },
        { name: 'Northside Clinics', region: 'Midwest', role: 'Ambulatory network' },
        { name: 'Lakeside Surgical Center', region: 'South', role: 'Ambulatory surgery center' },
      ],
      channels: [
        { name: 'Commercial payers', share: '48%', note: 'Two national contracts; denial rates are the watch item' },
        { name: 'Medicare / Medicaid', share: '41%', note: 'Volume anchor, thinnest margins' },
        { name: 'Self-pay & other', share: '11%', note: 'Point-of-service collections drive the cash line' },
      ],
      actGuide: [
        { title: 'Start from the number', body: 'Service-line and payer rows marked “drifting” already have a finding — the link opens its thread.' },
        { title: 'The finding is the unit of work', body: 'Each finding waits in the responsible role\'s Today queue with an SLA clock; silence escalates it.' },
        { title: 'Make the four-A call', body: 'Accept sets an exit condition; Act opens a solution; Acknowledge sets a trip-wire; Abandon needs a reason.' },
        { title: 'Nothing is done until the number is back', body: 'Watched exit conditions and assessor verdicts close the loop in the Decision Ledger.' },
      ],
    },
    skus: [
      { id: 'hc-sl-inpatient', family: 'Inpatient medicine', division: 'Metro General', revenueYtd: '$214M', growthYoyPct: 2.1, grossMarginPct: 8.4, fillRatePct: 92, health: 'watch', note: 'ALOS creeping against benchmark', findingId: 'hc-f-2' },
      { id: 'hc-sl-surgery', family: 'Surgical services', division: 'Metro General + Lakeside', revenueYtd: '$186M', growthYoyPct: 5.6, grossMarginPct: 18.2, fillRatePct: 88, health: 'ok', note: 'OR utilization recovering' },
      { id: 'hc-sl-ed', family: 'Emergency dept', division: 'Metro General', revenueYtd: '$122M', growthYoyPct: 3.9, grossMarginPct: 4.1, fillRatePct: 84, health: 'watch', note: 'Door-to-provider times above target' },
      { id: 'hc-sl-primary', family: 'Primary care', division: 'Northside Clinics', revenueYtd: '$98M', growthYoyPct: 6.2, grossMarginPct: 9.8, fillRatePct: 90, health: 'ok', note: 'Panel growth on plan' },
    ],
    customers: [
      { id: 'hc-pay-blue', customer: 'BlueShield National', channel: 'Commercial', region: 'All', revenueYtd: '$262M', growthYoyPct: 4.1, tradeSpendPct: 0, osaPct: 91, dsoDays: 54, health: 'drifting', note: 'Denial rate climbing on level-of-care documentation', findingId: 'hc-f-1' },
      { id: 'hc-pay-united', customer: 'UnitedCare', channel: 'Commercial', region: 'All', revenueYtd: '$189M', growthYoyPct: 3.2, tradeSpendPct: 0, osaPct: 93, dsoDays: 47, health: 'ok', note: 'Contract renewed; clean-claim rate steady' },
      { id: 'hc-pay-medicare', customer: 'Medicare', channel: 'Government', region: 'All', revenueYtd: '$248M', growthYoyPct: 2.8, tradeSpendPct: 0, osaPct: 95, dsoDays: 38, health: 'ok', note: 'Volume anchor' },
      { id: 'hc-pay-medicaid', customer: 'Medicaid', channel: 'Government', region: 'All', revenueYtd: '$137M', growthYoyPct: 1.9, tradeSpendPct: 0, osaPct: 94, dsoDays: 61, health: 'watch', note: 'AR days drifting past 60' },
    ],
  },

  manufacturing: {
    skuDimension: 'Product line',
    customerDimension: 'Customer',
    overview: {
      orgName: 'Gulf Precision Industries (demo)',
      tagline: 'Discrete manufacturing — two plants, one accountability loop.',
      narrative: [
        'Gulf Precision Industries machines and assembles industrial components across two plants (Jebel Ali and Dammam), selling to OEMs on on-time-delivery contracts.',
        'In Rewive, every plant and product-line number is a mandate held twice; drift becomes a finding routed to whoever\'s call it is.',
      ],
      stats: [
        { label: 'Revenue (TTM)', value: '$310M', note: '+4.0% YoY' },
        { label: 'On-time delivery', value: '91%', note: 'target 96%' },
        { label: 'Plants', value: '2', note: 'Jebel Ali · Dammam' },
      ],
      divisions: [
        { key: 'p1', name: 'Plant 1 — Jebel Ali', leader: 'Priya Raman', role: 'Plant director', revenueShare: '61%', brands: ['Machined components'], note: 'OEE and unplanned downtime are the standing risks.', watchedBy: 'Production counterpart' },
        { key: 'p2', name: 'Plant 2 — Dammam', leader: 'Hassan Jaber', role: 'Maintenance manager', revenueShare: '39%', brands: ['Assemblies'], note: 'PM compliance drives the downtime line.', watchedBy: 'Maintenance counterpart' },
      ],
      entities: [
        { name: 'Plant 1 — Jebel Ali', region: 'UAE', role: 'Machining and finishing' },
        { name: 'Plant 2 — Dammam', region: 'KSA', role: 'Assembly and test' },
      ],
      channels: [
        { name: 'OEM contracts', share: '78%', note: 'OTD penalties apply' },
        { name: 'Aftermarket', share: '22%', note: 'Higher margin, volatile demand' },
      ],
      actGuide: [
        { title: 'Start from the number', body: 'Product-line rows marked “drifting” already have a finding — the link opens its thread.' },
        { title: 'Make the four-A call', body: 'Accept, Act, Acknowledge or Abandon — silence escalates on the SLA.' },
      ],
    },
    skus: [
      { id: 'mfg-pl-machined', family: 'Machined components', division: 'Plant 1', revenueYtd: '$118M', growthYoyPct: 3.2, grossMarginPct: 22.4, fillRatePct: 91, health: 'watch', note: 'Unplanned downtime pressuring OTD' },
      { id: 'mfg-pl-assemblies', family: 'Assemblies', division: 'Plant 2', revenueYtd: '$74M', growthYoyPct: 5.1, grossMarginPct: 19.8, fillRatePct: 94, health: 'ok', note: 'On plan' },
    ],
    customers: [
      { id: 'mfg-cust-oem1', customer: 'Emirates Heavy Equipment', channel: 'OEM', region: 'UAE', revenueYtd: '$96M', growthYoyPct: 4.4, tradeSpendPct: 0, osaPct: 92, dsoDays: 51, health: 'watch', note: 'OTD at 91% against a 96% contract floor' },
      { id: 'mfg-cust-oem2', customer: 'Saudi Industrial Group', channel: 'OEM', region: 'KSA', revenueYtd: '$71M', growthYoyPct: 3.1, tradeSpendPct: 0, osaPct: 95, dsoDays: 46, health: 'ok', note: 'On plan' },
    ],
  },
};
