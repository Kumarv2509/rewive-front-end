// v4 seed data: counterpart org — KPI brains, counterpart agents, findings, closure KPIs.
// Industry templates. FMCG is the primary demo (Americana-style); Healthcare is the
// second act. The Manufacturing pack is seeded but off the pickers until it's as deep
// as the other two (11 mandates vs 26/22) — deep-linking with ?industry= still works.

export const orgProfileSeed = { orgName: 'Americana Foods (demo)', industry: 'fmcg' };

export const industryOptions = [
  { id: 'fmcg', name: 'FMCG / food & beverage', description: 'Consumer packaged food: manufacturing, distribution and trade across modern and traditional channels.', streamCount: 8, kpiCount: 26 },
  { id: 'healthcare', name: 'Healthcare', description: 'Hospital and clinic network: clinical operations, revenue cycle, patient experience, pharmacy, finance and people.', streamCount: 6, kpiCount: 22 },
];

// ---------------------------------------------------------------------------
// FMCG brain
// ---------------------------------------------------------------------------
const fmcgStreams = [
  { key: 'commercial', name: 'Commercial & sales', answersTo: 'Revenue growth and market share' },
  { key: 'planning', name: 'Demand & supply planning', answersTo: 'Cash conversion and service level' },
  { key: 'manufacturing', name: 'Manufacturing', answersTo: 'Cost per unit' },
  { key: 'logistics', name: 'Logistics & distribution', answersTo: 'Cost to serve' },
  { key: 'quality', name: 'Quality & food safety', answersTo: 'Zero incidents' },
  { key: 'finance', name: 'Finance', answersTo: 'EBITDA margin' },
  { key: 'marketing', name: 'Marketing & NPD', answersTo: 'Brand growth' },
  { key: 'people', name: 'People', answersTo: 'Capability and retention' },
];

const fmcgNodes = [
  // Targets (org level)
  { id: 'fmcg-t-rev', kind: 'target', name: 'Revenue growth', streamKey: null, definition: 'Year-over-year net revenue growth across all channels.', currentValue: '+5.2% YoY', targetValue: '+8% YoY', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['ERP revenue ledger'] },
  { id: 'fmcg-t-ebitda', kind: 'target', name: 'EBITDA margin', streamKey: null, definition: 'Earnings before interest, tax, depreciation and amortization as a share of net revenue.', currentValue: '12.6%', targetValue: '14.0%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['ERP P&L'] },
  { id: 'fmcg-t-share', kind: 'target', name: 'Market share', streamKey: null, definition: 'Value share in measured retail channels.', currentValue: '21.4%', targetValue: '22.5%', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['Nielsen retail panel'] },
  { id: 'fmcg-t-cash', kind: 'target', name: 'Cash conversion cycle', streamKey: null, definition: 'Days from cash out (materials) to cash in (collections).', currentValue: '46 days', targetValue: '38 days', trend: 'down', health: 'off_track', status: 'connected', dataSources: ['ERP working capital'] },

  // Commercial & sales
  { id: 'fmcg-k-osa', kind: 'stream_kpi', name: 'On-shelf availability', streamKey: 'commercial', definition: 'Share of audited store-SKU combinations in stock and on shelf.', currentValue: '93.1%', targetValue: '96%', trend: 'down', health: 'at_risk', status: 'connected', dataSources: ['Modern trade POS API', 'Store audit app'] },
  { id: 'fmcg-k-dist', kind: 'stream_kpi', name: 'Weighted distribution', streamKey: 'commercial', definition: 'Distribution weighted by outlet turnover.', currentValue: '78%', targetValue: '82%', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['Distributor sell-through feed'] },
  { id: 'fmcg-k-sellgap', kind: 'stream_kpi', name: 'Sell-in vs sell-out gap', streamKey: 'commercial', definition: 'Gap between shipments to trade and consumer offtake — a build-up signals channel stuffing.', currentValue: '+9%', targetValue: '< 4%', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Modern trade POS API', 'ERP shipments'] },
  { id: 'fmcg-k-troi', kind: 'stream_kpi', name: 'Trade-spend ROI', streamKey: 'commercial', definition: 'Incremental gross profit per dirham of trade investment.', currentValue: '1.6x', targetValue: '2.0x', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['Trade-spend ledger', 'Modern trade POS API'] },

  // Demand & supply planning
  { id: 'fmcg-k-mape', kind: 'stream_kpi', name: 'Forecast accuracy', streamKey: 'planning', definition: '1 − MAPE at SKU-DC-week level, lag 1.', currentValue: '68%', targetValue: '78%', trend: 'down', health: 'off_track', status: 'connected', dataSources: ['Demand planning tool'] },
  { id: 'fmcg-k-fill', kind: 'stream_kpi', name: 'Case fill rate (OTIF)', streamKey: 'planning', definition: 'Cases delivered in full and on time as a share of cases ordered.', currentValue: '92.4%', targetValue: '97%', trend: 'down', health: 'at_risk', status: 'connected', dataSources: ['ERP order lines', 'DC stock snapshots'] },
  { id: 'fmcg-k-invdays', kind: 'stream_kpi', name: 'Inventory days', streamKey: 'planning', definition: 'Days of finished-goods inventory on hand at current run rate.', currentValue: '41', targetValue: '32', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['DC stock snapshots'] },
  { id: 'fmcg-k-obs', kind: 'stream_kpi', name: 'Obsolescence', streamKey: 'planning', definition: 'Write-offs from expired or unsellable stock as a share of COGS.', currentValue: '1.9%', targetValue: '1.2%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['ERP write-off ledger'] },

  // Manufacturing
  { id: 'fmcg-k-oee', kind: 'stream_kpi', name: 'OEE', streamKey: 'manufacturing', definition: 'Overall equipment effectiveness: availability × performance × quality.', currentValue: '71%', targetValue: '78%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['Line sensor telemetry'] },
  { id: 'fmcg-k-yield', kind: 'stream_kpi', name: 'First-pass yield', streamKey: 'manufacturing', definition: 'Units passing quality without rework as a share of units started.', currentValue: '96.8%', targetValue: '98%', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['Line sensor telemetry', 'QC lab results'] },
  { id: 'fmcg-k-waste', kind: 'stream_kpi', name: 'Waste & scrap', streamKey: 'manufacturing', definition: 'Material lost in production as a share of material issued.', currentValue: '4.8%', targetValue: '3.5%', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Line sensor telemetry', 'ERP material issues'] },
  { id: 'fmcg-k-cho', kind: 'stream_kpi', name: 'Changeover time', streamKey: 'manufacturing', definition: 'Average minutes to switch a line between SKUs.', currentValue: '42 min', targetValue: '30 min', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['Line sensor telemetry'] },

  // Logistics & distribution
  { id: 'fmcg-k-cpc', kind: 'stream_kpi', name: 'Cost per case', streamKey: 'logistics', definition: 'Total warehousing and transport cost per case delivered.', currentValue: 'AED 3.90', targetValue: 'AED 3.40', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['TMS freight invoices'] },
  { id: 'fmcg-k-truck', kind: 'stream_kpi', name: 'Truck utilization', streamKey: 'logistics', definition: 'Loaded capacity as a share of available capacity per route.', currentValue: '74%', targetValue: '85%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['TMS route logs'] },
  { id: 'fmcg-k-cold', kind: 'stream_kpi', name: 'Cold-chain excursions', streamKey: 'logistics', definition: 'Temperature excursions outside the approved band per month.', currentValue: '14 / mo', targetValue: '< 5 / mo', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Reefer temperature probes'] },

  // Quality & food safety
  { id: 'fmcg-k-ppm', kind: 'stream_kpi', name: 'Complaints per million', streamKey: 'quality', definition: 'Consumer complaints per million units sold.', currentValue: '38', targetValue: '25', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['Consumer complaints log'] },
  { id: 'fmcg-k-audit', kind: 'stream_kpi', name: 'Food-safety audit score', streamKey: 'quality', definition: 'Weighted score across internal and third-party food-safety audits.', currentValue: '94', targetValue: '95', trend: 'flat', health: 'on_track', status: 'connected', dataSources: ['Audit management system'] },

  // Finance
  { id: 'fmcg-k-gm', kind: 'stream_kpi', name: 'Gross margin', streamKey: 'finance', definition: 'Net revenue minus COGS as a share of net revenue.', currentValue: '31.2%', targetValue: '33%', trend: 'down', health: 'at_risk', status: 'connected', dataSources: ['ERP P&L'] },
  { id: 'fmcg-k-cogsvar', kind: 'stream_kpi', name: 'COGS variance vs plan', streamKey: 'finance', definition: 'Actual cost of goods sold against the planning standard.', currentValue: '+2.4%', targetValue: '0%', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['ERP P&L', 'Demand planning tool'] },
  { id: 'fmcg-k-wcd', kind: 'stream_kpi', name: 'Working-capital days', streamKey: 'finance', definition: 'Inventory days + receivable days − payable days.', currentValue: '52', targetValue: '45', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['ERP working capital'] },
  { id: 'fmcg-k-tradepct', kind: 'stream_kpi', name: 'Trade spend % of revenue', streamKey: 'finance', definition: 'All trade investment as a share of gross revenue.', currentValue: '14.8%', targetValue: '13%', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['Trade-spend ledger'] },

  // Marketing & NPD
  { id: 'fmcg-k-npd', kind: 'stream_kpi', name: 'NPD contribution', streamKey: 'marketing', definition: 'Share of revenue from products launched in the last 24 months.', currentValue: '8.9%', targetValue: '12%', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['ERP revenue ledger'] },
  { id: 'fmcg-k-croi', kind: 'stream_kpi', name: 'Campaign ROI', streamKey: 'marketing', definition: 'Incremental revenue per dirham of media spend.', currentValue: '2.3x', targetValue: '2.5x', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['Media agency reports'] },

  // People
  { id: 'fmcg-k-attr', kind: 'stream_kpi', name: 'Frontline attrition', streamKey: 'people', definition: 'Annualized voluntary attrition across plants and distribution.', currentValue: '24%', targetValue: '18%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['HRIS'] },
  { id: 'fmcg-k-lti', kind: 'stream_kpi', name: 'LTIFR', streamKey: 'people', definition: 'Lost-time injury frequency rate per million hours worked.', currentValue: '0.42', targetValue: '< 0.3', trend: 'down', health: 'on_track', status: 'connected', dataSources: ['EHS incident log'] },

  // Drivers (data feeds the KPIs compute from)
  { id: 'fmcg-d-pos', kind: 'driver', name: 'Modern trade POS feed', streamKey: 'commercial', definition: 'Daily sell-out by store and SKU from key accounts.', status: 'connected', dataSources: ['Modern trade POS API'] },
  { id: 'fmcg-d-dcstock', kind: 'driver', name: 'DC stock snapshots', streamKey: 'planning', definition: 'Twice-daily stock positions across distribution centers.', status: 'connected', dataSources: ['WMS export'] },
  { id: 'fmcg-d-linesensors', kind: 'driver', name: 'Line sensor telemetry', streamKey: 'manufacturing', definition: 'Machine-level counts, speeds and stops from plant lines.', status: 'connected', dataSources: ['Plant historian'] },
  { id: 'fmcg-d-tempprobes', kind: 'driver', name: 'Reefer temperature probes', streamKey: 'logistics', definition: 'In-transit temperature readings from refrigerated fleet.', status: 'connected', dataSources: ['Telematics provider'] },
  { id: 'fmcg-d-complaints', kind: 'driver', name: 'Consumer complaints log', streamKey: 'quality', definition: 'Complaints from care lines, retailers and social listening.', status: 'connected', dataSources: ['CRM cases'] },
  { id: 'fmcg-d-tradeledger', kind: 'driver', name: 'Trade-spend ledger', streamKey: 'finance', definition: 'Promotions, listing fees and rebates by customer and brand.', status: 'needs_data', dataSources: [] },

  // Agent-proposed node awaiting accept / decline
  { id: 'fmcg-k-otifmt', kind: 'stream_kpi', name: 'OTIF — modern trade split', streamKey: 'planning', definition: 'Case fill measured separately for modern trade, where penalties apply.', status: 'proposed', proposedBy: 'Planning counterpart', dataSources: ['ERP order lines', 'Modern trade POS API'] },
];

const fmcgEdges = [
  // drivers → stream KPIs
  { id: 'fmcg-e-1', source: 'fmcg-d-pos', target: 'fmcg-k-sellgap', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-2', source: 'fmcg-d-pos', target: 'fmcg-k-osa', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-3', source: 'fmcg-d-dcstock', target: 'fmcg-k-fill', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-4', source: 'fmcg-d-dcstock', target: 'fmcg-k-invdays', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-5', source: 'fmcg-d-linesensors', target: 'fmcg-k-oee', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-6', source: 'fmcg-d-linesensors', target: 'fmcg-k-waste', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-7', source: 'fmcg-d-tempprobes', target: 'fmcg-k-cold', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-8', source: 'fmcg-d-complaints', target: 'fmcg-k-ppm', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-9', source: 'fmcg-d-tradeledger', target: 'fmcg-k-tradepct', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-10', source: 'fmcg-d-tradeledger', target: 'fmcg-k-troi', weight: 'strong', status: 'connected' },

  // cross-stream KPI → KPI (the "brain" part)
  { id: 'fmcg-e-11', source: 'fmcg-k-mape', target: 'fmcg-k-fill', weight: 'strong', status: 'connected', rationale: 'Under-forecasting starves replenishment; fill rate follows forecast error with a 1-2 week lag.' },
  { id: 'fmcg-e-12', source: 'fmcg-k-fill', target: 'fmcg-k-osa', weight: 'strong', status: 'connected', rationale: 'Unfilled orders become empty shelves in 3-5 days.' },
  { id: 'fmcg-e-13', source: 'fmcg-k-cho', target: 'fmcg-k-oee', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-14', source: 'fmcg-k-waste', target: 'fmcg-k-cogsvar', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-15', source: 'fmcg-k-oee', target: 'fmcg-k-cogsvar', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-16', source: 'fmcg-k-cpc', target: 'fmcg-k-cogsvar', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-17', source: 'fmcg-k-obs', target: 'fmcg-k-cogsvar', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-18', source: 'fmcg-k-cogsvar', target: 'fmcg-k-gm', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-19', source: 'fmcg-k-tradepct', target: 'fmcg-k-gm', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-20', source: 'fmcg-k-cold', target: 'fmcg-k-ppm', weight: 'strong', status: 'connected', rationale: 'Excursions surface as quality complaints 2-4 weeks later.' },
  { id: 'fmcg-e-21', source: 'fmcg-k-attr', target: 'fmcg-k-oee', weight: 'weak', status: 'connected' },
  { id: 'fmcg-e-22', source: 'fmcg-k-invdays', target: 'fmcg-k-wcd', weight: 'strong', status: 'connected' },

  // stream KPIs → targets
  { id: 'fmcg-e-23', source: 'fmcg-k-osa', target: 'fmcg-t-rev', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-24', source: 'fmcg-k-osa', target: 'fmcg-t-share', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-25', source: 'fmcg-k-dist', target: 'fmcg-t-share', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-26', source: 'fmcg-k-sellgap', target: 'fmcg-t-cash', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-27', source: 'fmcg-k-troi', target: 'fmcg-t-rev', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-28', source: 'fmcg-k-gm', target: 'fmcg-t-ebitda', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-29', source: 'fmcg-k-wcd', target: 'fmcg-t-cash', weight: 'strong', status: 'connected' },
  { id: 'fmcg-e-30', source: 'fmcg-k-ppm', target: 'fmcg-t-share', weight: 'weak', status: 'connected' },
  { id: 'fmcg-e-31', source: 'fmcg-k-npd', target: 'fmcg-t-rev', weight: 'moderate', status: 'connected' },
  { id: 'fmcg-e-32', source: 'fmcg-k-croi', target: 'fmcg-t-rev', weight: 'weak', status: 'connected' },

  // agent-proposed edges awaiting accept / decline
  { id: 'fmcg-e-p1', source: 'fmcg-k-cho', target: 'fmcg-k-yield', weight: 'moderate', status: 'proposed', proposedBy: 'Manufacturing counterpart', rationale: 'Yield dips in the first hour after changeovers correlate 0.71 with changeover duration over the last 12 weeks.' },
  { id: 'fmcg-e-p2', source: 'fmcg-k-otifmt', target: 'fmcg-k-osa', weight: 'strong', status: 'proposed', proposedBy: 'Planning counterpart', rationale: 'Modern trade OTIF drives penalty exposure and shelf availability where measured share is won.' },
];

// ---------------------------------------------------------------------------
// Healthcare brain (lighter — proves the template)
// ---------------------------------------------------------------------------
const hcStreams = [
  { key: 'clinical', name: 'Clinical operations', answersTo: 'Quality of care and throughput' },
  { key: 'revcycle', name: 'Revenue cycle', answersTo: 'Cash collection and margin' },
  { key: 'patientexp', name: 'Patient experience', answersTo: 'Access and loyalty' },
  { key: 'pharmacy', name: 'Pharmacy operations', answersTo: 'Script economics' },
  { key: 'finance', name: 'Finance', answersTo: 'Net margin' },
  { key: 'people', name: 'People', answersTo: 'Clinical staffing and retention' },
];

const hcNodes = [
  { id: 'hc-t-margin', kind: 'target', name: 'Net margin', streamKey: null, definition: 'Operating margin across the network.', currentValue: '3.1%', targetValue: '5.0%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['GL'] },
  { id: 'hc-t-quality', kind: 'target', name: '30-day readmission', streamKey: null, definition: 'All-cause readmissions within 30 days of discharge.', currentValue: '14.2%', targetValue: '11%', trend: 'down', health: 'at_risk', status: 'connected', dataSources: ['EMR feed'] },
  { id: 'hc-t-access', kind: 'target', name: 'Appointment lead time', streamKey: null, definition: 'Median days from booking request to appointment.', currentValue: '9 days', targetValue: '5 days', trend: 'flat', health: 'off_track', status: 'connected', dataSources: ['Scheduling system'] },

  { id: 'hc-k-alos', kind: 'stream_kpi', name: 'Average length of stay', streamKey: 'clinical', definition: 'Inpatient days per discharge, case-mix adjusted.', currentValue: '4.9', targetValue: '4.3', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['EMR feed'] },
  { id: 'hc-k-bed', kind: 'stream_kpi', name: 'Bed occupancy', streamKey: 'clinical', definition: 'Occupied bed-days as a share of available bed-days.', currentValue: '82%', targetValue: '85%', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['EMR feed'] },
  { id: 'hc-k-orutil', kind: 'stream_kpi', name: 'OR utilization', streamKey: 'clinical', definition: 'Utilized OR block time as a share of scheduled block time.', currentValue: '68%', targetValue: '78%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['OR scheduling'] },
  { id: 'hc-k-ar', kind: 'stream_kpi', name: 'Days in AR', streamKey: 'revcycle', definition: 'Average days from claim submission to payment.', currentValue: '54', targetValue: '42', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Claims clearinghouse'] },
  { id: 'hc-k-denial', kind: 'stream_kpi', name: 'Claim denial rate', streamKey: 'revcycle', definition: 'First-pass denials as a share of claims submitted.', currentValue: '11.8%', targetValue: '7%', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Claims clearinghouse'] },
  { id: 'hc-k-noshow', kind: 'stream_kpi', name: 'No-show rate', streamKey: 'patientexp', definition: 'Missed appointments without cancellation.', currentValue: '12.4%', targetValue: '8%', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['Scheduling system'] },
  { id: 'hc-k-nps', kind: 'stream_kpi', name: 'Patient NPS', streamKey: 'patientexp', definition: 'Net promoter score from post-visit surveys.', currentValue: '41', targetValue: '50', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['Survey tool'] },
  { id: 'hc-k-generic', kind: 'stream_kpi', name: 'Generic dispensing rate', streamKey: 'pharmacy', definition: 'Generic fills as a share of eligible scripts.', currentValue: '86%', targetValue: '90%', trend: 'up', health: 'on_track', status: 'connected', dataSources: ['Pharmacy system'] },
  { id: 'hc-k-labor', kind: 'stream_kpi', name: 'Labor cost % of revenue', streamKey: 'finance', definition: 'Total clinical and support labor as a share of net revenue.', currentValue: '56%', targetValue: '52%', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['GL', 'HRIS'] },
  { id: 'hc-k-nurseattr', kind: 'stream_kpi', name: 'Nurse attrition', streamKey: 'people', definition: 'Annualized voluntary nurse turnover.', currentValue: '19%', targetValue: '14%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['HRIS'] },

  // Additional mandates
  { id: 'hc-t-safety', kind: 'target', name: 'Patient safety index', streamKey: null, definition: 'Composite of harm events — infections, medication errors, risk-adjusted mortality.', currentValue: '82', targetValue: '90', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['EMR feed', 'Lab & microbiology'] },

  { id: 'hc-k-edwait', kind: 'stream_kpi', name: 'ED door-to-provider time', streamKey: 'clinical', definition: 'Median minutes from ED arrival to first provider contact.', currentValue: '42 min', targetValue: '30 min', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['EMR feed'] },
  { id: 'hc-k-hai', kind: 'stream_kpi', name: 'Hospital-acquired infection rate', streamKey: 'clinical', definition: 'Healthcare-associated infections per 1,000 patient-days.', currentValue: '2.1', targetValue: '< 1.0', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Lab & microbiology'] },
  { id: 'hc-k-mortality', kind: 'stream_kpi', name: 'Risk-adjusted mortality index', streamKey: 'clinical', definition: 'Observed vs expected inpatient mortality (1.0 = expected).', currentValue: '1.05', targetValue: '< 0.95', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['EMR feed'] },
  { id: 'hc-k-cleanclaim', kind: 'stream_kpi', name: 'Clean claim rate', streamKey: 'revcycle', definition: 'Claims accepted on first submission without edits.', currentValue: '82%', targetValue: '95%', trend: 'down', health: 'off_track', status: 'connected', dataSources: ['Claims clearinghouse'] },
  { id: 'hc-k-poscash', kind: 'stream_kpi', name: 'Point-of-service collections', streamKey: 'revcycle', definition: 'Share of patient liability collected at or before the visit.', currentValue: '48%', targetValue: '65%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['Claims clearinghouse'] },
  { id: 'hc-k-clinicwait', kind: 'stream_kpi', name: 'Clinic wait time', streamKey: 'patientexp', definition: 'Median minutes from check-in to being seen in outpatient clinics.', currentValue: '27 min', targetValue: '15 min', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['Scheduling system'] },
  { id: 'hc-k-complaint', kind: 'stream_kpi', name: 'Complaint rate', streamKey: 'patientexp', definition: 'Formal patient complaints per 1,000 visits.', currentValue: '3.4', targetValue: '2.0', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['Patient survey platform'] },
  { id: 'hc-k-mederror', kind: 'stream_kpi', name: 'Medication error rate', streamKey: 'pharmacy', definition: 'Reported medication errors per 1,000 doses dispensed.', currentValue: '0.9', targetValue: '< 0.4', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['Pharmacy system'] },
  { id: 'hc-k-drugspend', kind: 'stream_kpi', name: 'Drug spend per discharge', streamKey: 'pharmacy', definition: 'Pharmacy cost per adjusted discharge.', currentValue: '$1,240', targetValue: '$1,050', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['Pharmacy system', 'GL'] },
  { id: 'hc-k-costdischarge', kind: 'stream_kpi', name: 'Cost per adjusted discharge', streamKey: 'finance', definition: 'Fully loaded operating cost per adjusted discharge.', currentValue: '$11,800', targetValue: '$10,500', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['GL'] },
  { id: 'hc-k-cashdays', kind: 'stream_kpi', name: 'Days cash on hand', streamKey: 'finance', definition: 'Days of operating expense covered by unrestricted cash.', currentValue: '142', targetValue: '> 180', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['GL'] },
  { id: 'hc-k-agency', kind: 'stream_kpi', name: 'Agency staffing %', streamKey: 'people', definition: 'Contract/agency nursing hours as a share of total nursing hours.', currentValue: '14%', targetValue: '< 6%', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['HRIS'] },

  { id: 'hc-d-emr', kind: 'driver', name: 'EMR feed', streamKey: 'clinical', definition: 'Admissions, discharges, transfers and orders.', status: 'connected', dataSources: ['EMR HL7 feed'] },
  { id: 'hc-d-claims', kind: 'driver', name: 'Claims clearinghouse', streamKey: 'revcycle', definition: 'Claim submissions, remits and denial codes.', status: 'connected', dataSources: ['Clearinghouse SFTP'] },
  { id: 'hc-d-sched', kind: 'driver', name: 'Scheduling system', streamKey: 'patientexp', definition: 'Bookings, cancellations and arrivals.', status: 'connected', dataSources: ['Scheduling API'] },
  { id: 'hc-d-lab', kind: 'driver', name: 'Lab & microbiology', streamKey: 'clinical', definition: 'Culture results, positive cultures and antibiotic flags.', status: 'connected', dataSources: ['LIS feed'] },
  { id: 'hc-d-survey', kind: 'driver', name: 'Patient survey platform', streamKey: 'patientexp', definition: 'Post-visit surveys and complaint intake.', status: 'connected', dataSources: ['Survey API'] },
  { id: 'hc-d-pharmacy', kind: 'driver', name: 'Pharmacy system', streamKey: 'pharmacy', definition: 'Dispensing records, formulary and error reports.', status: 'connected', dataSources: ['Pharmacy DB'] },
  { id: 'hc-d-gl', kind: 'driver', name: 'General ledger', streamKey: 'finance', definition: 'Cost, revenue and cash positions.', status: 'connected', dataSources: ['ERP GL'] },
  { id: 'hc-d-hr', kind: 'driver', name: 'HRIS & time clock', streamKey: 'people', definition: 'Staffing hours, agency use and overtime.', status: 'connected', dataSources: ['HRIS export'] },
];

const hcEdges = [
  { id: 'hc-e-1', source: 'hc-d-emr', target: 'hc-k-alos', weight: 'strong', status: 'connected' },
  { id: 'hc-e-2', source: 'hc-d-emr', target: 'hc-k-bed', weight: 'strong', status: 'connected' },
  { id: 'hc-e-3', source: 'hc-d-claims', target: 'hc-k-denial', weight: 'strong', status: 'connected' },
  { id: 'hc-e-4', source: 'hc-d-claims', target: 'hc-k-ar', weight: 'strong', status: 'connected' },
  { id: 'hc-e-5', source: 'hc-d-sched', target: 'hc-k-noshow', weight: 'strong', status: 'connected' },
  { id: 'hc-e-6', source: 'hc-k-denial', target: 'hc-k-ar', weight: 'strong', status: 'connected', rationale: 'Denied claims add 30-60 days of rework before payment.' },
  { id: 'hc-e-7', source: 'hc-k-alos', target: 'hc-t-quality', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-8', source: 'hc-k-alos', target: 'hc-k-bed', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-9', source: 'hc-k-noshow', target: 'hc-k-orutil', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-10', source: 'hc-k-noshow', target: 'hc-t-access', weight: 'strong', status: 'connected' },
  { id: 'hc-e-11', source: 'hc-k-orutil', target: 'hc-t-margin', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-12', source: 'hc-k-ar', target: 'hc-t-margin', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-13', source: 'hc-k-labor', target: 'hc-t-margin', weight: 'strong', status: 'connected' },
  { id: 'hc-e-14', source: 'hc-k-generic', target: 'hc-t-margin', weight: 'weak', status: 'connected' },
  { id: 'hc-e-15', source: 'hc-k-nurseattr', target: 'hc-k-alos', weight: 'weak', status: 'connected' },
  { id: 'hc-e-16', source: 'hc-k-nps', target: 'hc-t-access', weight: 'weak', status: 'connected' },

  // senses → new mandates
  { id: 'hc-e-17', source: 'hc-d-emr', target: 'hc-k-edwait', weight: 'strong', status: 'connected' },
  { id: 'hc-e-18', source: 'hc-d-emr', target: 'hc-k-mortality', weight: 'strong', status: 'connected' },
  { id: 'hc-e-19', source: 'hc-d-lab', target: 'hc-k-hai', weight: 'strong', status: 'connected' },
  { id: 'hc-e-20', source: 'hc-d-claims', target: 'hc-k-cleanclaim', weight: 'strong', status: 'connected' },
  { id: 'hc-e-21', source: 'hc-d-claims', target: 'hc-k-poscash', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-22', source: 'hc-d-sched', target: 'hc-k-clinicwait', weight: 'strong', status: 'connected' },
  { id: 'hc-e-23', source: 'hc-d-survey', target: 'hc-k-complaint', weight: 'strong', status: 'connected' },
  { id: 'hc-e-24', source: 'hc-d-pharmacy', target: 'hc-k-mederror', weight: 'strong', status: 'connected' },
  { id: 'hc-e-25', source: 'hc-d-pharmacy', target: 'hc-k-drugspend', weight: 'strong', status: 'connected' },
  { id: 'hc-e-26', source: 'hc-d-gl', target: 'hc-k-costdischarge', weight: 'strong', status: 'connected' },
  { id: 'hc-e-27', source: 'hc-d-gl', target: 'hc-k-cashdays', weight: 'strong', status: 'connected' },
  { id: 'hc-e-28', source: 'hc-d-gl', target: 'hc-k-drugspend', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-29', source: 'hc-d-hr', target: 'hc-k-agency', weight: 'strong', status: 'connected' },

  // new mandates → mandates / intents (the cross-stream wiring)
  { id: 'hc-e-30', source: 'hc-k-hai', target: 'hc-t-safety', weight: 'strong', status: 'connected', rationale: 'Infections are a leading driver of the harm composite.' },
  { id: 'hc-e-31', source: 'hc-k-mortality', target: 'hc-t-safety', weight: 'strong', status: 'connected' },
  { id: 'hc-e-32', source: 'hc-k-mederror', target: 'hc-t-safety', weight: 'strong', status: 'connected' },
  { id: 'hc-e-33', source: 'hc-k-hai', target: 'hc-k-alos', weight: 'moderate', status: 'connected', rationale: 'Infections extend length of stay.' },
  { id: 'hc-e-34', source: 'hc-k-edwait', target: 'hc-t-access', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-35', source: 'hc-k-cleanclaim', target: 'hc-k-denial', weight: 'strong', status: 'connected', rationale: 'Dirty claims convert directly into first-pass denials.' },
  { id: 'hc-e-36', source: 'hc-k-cleanclaim', target: 'hc-k-ar', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-37', source: 'hc-k-poscash', target: 'hc-k-ar', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-38', source: 'hc-k-clinicwait', target: 'hc-k-nps', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-39', source: 'hc-k-complaint', target: 'hc-k-nps', weight: 'strong', status: 'connected' },
  { id: 'hc-e-40', source: 'hc-k-drugspend', target: 'hc-k-costdischarge', weight: 'moderate', status: 'connected' },
  { id: 'hc-e-41', source: 'hc-k-costdischarge', target: 'hc-t-margin', weight: 'strong', status: 'connected' },
  { id: 'hc-e-42', source: 'hc-k-cashdays', target: 'hc-t-margin', weight: 'weak', status: 'connected' },
  { id: 'hc-e-43', source: 'hc-k-agency', target: 'hc-k-labor', weight: 'strong', status: 'connected', rationale: 'Agency premiums inflate labor cost per hour.' },
  { id: 'hc-e-44', source: 'hc-k-agency', target: 'hc-k-nurseattr', weight: 'weak', status: 'connected' },
];

// ---------------------------------------------------------------------------
// Manufacturing brain (lighter — proves the template)
// ---------------------------------------------------------------------------
const mfgStreams = [
  { key: 'production', name: 'Production', answersTo: 'Throughput and unit cost' },
  { key: 'maintenance', name: 'Maintenance', answersTo: 'Asset availability' },
  { key: 'supplychain', name: 'Supplier network', answersTo: 'Material availability' },
  { key: 'quality', name: 'Quality', answersTo: 'Customer PPM' },
  { key: 'safety', name: 'Safety', answersTo: 'Zero harm' },
  { key: 'finance', name: 'Finance', answersTo: 'Unit cost' },
];

const mfgNodes = [
  { id: 'mfg-t-otd', kind: 'target', name: 'On-time delivery', streamKey: null, definition: 'Customer orders shipped complete by promise date.', currentValue: '87%', targetValue: '95%', trend: 'flat', health: 'off_track', status: 'connected', dataSources: ['ERP shipments'] },
  { id: 'mfg-t-unitcost', kind: 'target', name: 'Unit cost index', streamKey: null, definition: 'Fully loaded cost per unit, indexed to plan (100).', currentValue: '104', targetValue: '98', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['ERP costing'] },
  { id: 'mfg-t-safety', kind: 'target', name: 'TRIR', streamKey: null, definition: 'Total recordable incident rate per 200k hours.', currentValue: '1.8', targetValue: '< 1.0', trend: 'down', health: 'at_risk', status: 'connected', dataSources: ['EHS incident log'] },

  { id: 'mfg-k-oee', kind: 'stream_kpi', name: 'OEE', streamKey: 'production', definition: 'Availability × performance × quality across constrained lines.', currentValue: '64%', targetValue: '75%', trend: 'flat', health: 'off_track', status: 'connected', dataSources: ['MES telemetry'] },
  { id: 'mfg-k-throughput', kind: 'stream_kpi', name: 'Throughput attainment', streamKey: 'production', definition: 'Units produced vs the weekly master schedule.', currentValue: '91%', targetValue: '98%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['MES telemetry'] },
  { id: 'mfg-k-scrap', kind: 'stream_kpi', name: 'Scrap rate', streamKey: 'production', definition: 'Scrapped units as a share of units started.', currentValue: '3.1%', targetValue: '2.0%', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['MES telemetry'] },
  { id: 'mfg-k-unplanned', kind: 'stream_kpi', name: 'Unplanned downtime', streamKey: 'maintenance', definition: 'Hours of unscheduled stoppage per week on constrained assets.', currentValue: '22 h/wk', targetValue: '8 h/wk', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['CMMS work orders'] },
  { id: 'mfg-k-pmcomp', kind: 'stream_kpi', name: 'PM compliance', streamKey: 'maintenance', definition: 'Preventive maintenance completed on schedule.', currentValue: '76%', targetValue: '95%', trend: 'down', health: 'off_track', status: 'connected', dataSources: ['CMMS work orders'] },
  { id: 'mfg-k-supotd', kind: 'stream_kpi', name: 'Supplier OTIF', streamKey: 'supplychain', definition: 'Supplier lines received in full and on time.', currentValue: '84%', targetValue: '95%', trend: 'down', health: 'off_track', status: 'connected', dataSources: ['ERP purchase orders'] },
  { id: 'mfg-k-rawdays', kind: 'stream_kpi', name: 'Raw material days', streamKey: 'supplychain', definition: 'Days of raw material coverage at current consumption.', currentValue: '18', targetValue: '14', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['ERP inventory'] },
  { id: 'mfg-k-fpy', kind: 'stream_kpi', name: 'First-pass yield', streamKey: 'quality', definition: 'Units passing final inspection without rework.', currentValue: '94.2%', targetValue: '97%', trend: 'flat', health: 'at_risk', status: 'connected', dataSources: ['QC inspections'] },
  { id: 'mfg-k-custppm', kind: 'stream_kpi', name: 'Customer PPM', streamKey: 'quality', definition: 'Defective parts per million reaching customers.', currentValue: '410', targetValue: '150', trend: 'down', health: 'at_risk', status: 'connected', dataSources: ['Customer returns'] },
  { id: 'mfg-k-nearmiss', kind: 'stream_kpi', name: 'Near-miss reporting', streamKey: 'safety', definition: 'Near misses reported per 100 employees per month (leading indicator — higher is better).', currentValue: '2.1', targetValue: '4.0', trend: 'up', health: 'at_risk', status: 'connected', dataSources: ['EHS incident log'] },
  { id: 'mfg-k-costvar', kind: 'stream_kpi', name: 'Cost variance vs standard', streamKey: 'finance', definition: 'Actual production cost vs the standard cost model.', currentValue: '+4.1%', targetValue: '0%', trend: 'up', health: 'off_track', status: 'connected', dataSources: ['ERP costing'] },

  { id: 'mfg-d-mes', kind: 'driver', name: 'MES telemetry', streamKey: 'production', definition: 'Line counts, rates and stop reasons.', status: 'connected', dataSources: ['MES historian'] },
  { id: 'mfg-d-cmms', kind: 'driver', name: 'CMMS work orders', streamKey: 'maintenance', definition: 'Planned and reactive maintenance orders.', status: 'connected', dataSources: ['CMMS API'] },
  { id: 'mfg-d-erp', kind: 'driver', name: 'ERP purchase orders', streamKey: 'supplychain', definition: 'PO lines, receipts and supplier promise dates.', status: 'connected', dataSources: ['ERP extract'] },
];

const mfgEdges = [
  { id: 'mfg-e-1', source: 'mfg-d-mes', target: 'mfg-k-oee', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-2', source: 'mfg-d-mes', target: 'mfg-k-scrap', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-3', source: 'mfg-d-cmms', target: 'mfg-k-unplanned', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-4', source: 'mfg-d-cmms', target: 'mfg-k-pmcomp', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-5', source: 'mfg-d-erp', target: 'mfg-k-supotd', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-6', source: 'mfg-k-pmcomp', target: 'mfg-k-unplanned', weight: 'strong', status: 'connected', rationale: 'Skipped PMs convert to breakdowns within 4-8 weeks on rotating equipment.' },
  { id: 'mfg-e-7', source: 'mfg-k-unplanned', target: 'mfg-k-oee', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-8', source: 'mfg-k-oee', target: 'mfg-k-throughput', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-9', source: 'mfg-k-throughput', target: 'mfg-t-otd', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-10', source: 'mfg-k-supotd', target: 'mfg-t-otd', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-11', source: 'mfg-k-fpy', target: 'mfg-k-scrap', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-12', source: 'mfg-k-scrap', target: 'mfg-k-costvar', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-13', source: 'mfg-k-costvar', target: 'mfg-t-unitcost', weight: 'strong', status: 'connected' },
  { id: 'mfg-e-14', source: 'mfg-k-rawdays', target: 'mfg-t-unitcost', weight: 'weak', status: 'connected' },
  { id: 'mfg-e-15', source: 'mfg-k-nearmiss', target: 'mfg-t-safety', weight: 'moderate', status: 'connected' },
  { id: 'mfg-e-16', source: 'mfg-k-fpy', target: 'mfg-k-custppm', weight: 'moderate', status: 'connected' },
];

export const brains = {
  fmcg: { industry: 'fmcg', streams: fmcgStreams, nodes: fmcgNodes, edges: fmcgEdges },
  healthcare: { industry: 'healthcare', streams: hcStreams, nodes: hcNodes, edges: hcEdges },
  manufacturing: { industry: 'manufacturing', streams: mfgStreams, nodes: mfgNodes, edges: mfgEdges },
};

// ---------------------------------------------------------------------------
// Counterpart orgs (one agent per stream + an org-level chief of staff)
// ---------------------------------------------------------------------------
export const shadowOrgs = {
  fmcg: {
    industry: 'fmcg',
    agents: [
      { id: 'fmcg-sa-chief', name: 'Chief of staff counterpart', streamKey: null, humanOwner: { name: 'Kumara Vijayan', initials: 'KV', avatarBg: '#4F46E5', role: 'Co-founder · Admin' }, watchesNodeIds: ['fmcg-t-rev', 'fmcg-t-ebitda', 'fmcg-t-share', 'fmcg-t-cash'], openFindings: 0, slaBreaches: 0, temperament: 35, health: 'attention', lastFindingAt: '2026-07-05T09:40:00Z', reportsToAgentId: null },
      { id: 'fmcg-sa-commercial', name: 'Commercial counterpart', streamKey: 'commercial', humanOwner: { name: 'Layla Nasser', initials: 'LN', avatarBg: '#0E7490', role: 'Commercial director' }, watchesNodeIds: ['fmcg-k-osa', 'fmcg-k-dist', 'fmcg-k-sellgap', 'fmcg-k-troi', 'fmcg-d-pos'], openFindings: 0, slaBreaches: 0, temperament: 55, health: 'attention', lastFindingAt: '2026-07-02T14:10:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-planning', name: 'Planning counterpart', streamKey: 'planning', humanOwner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#B45309', role: 'Head of planning' }, watchesNodeIds: ['fmcg-k-mape', 'fmcg-k-fill', 'fmcg-k-invdays', 'fmcg-k-obs', 'fmcg-d-dcstock'], openFindings: 0, slaBreaches: 1, temperament: 60, health: 'critical', lastFindingAt: '2026-07-06T06:20:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-manufacturing', name: 'Manufacturing counterpart', streamKey: 'manufacturing', humanOwner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED', role: 'Plant director' }, watchesNodeIds: ['fmcg-k-oee', 'fmcg-k-yield', 'fmcg-k-waste', 'fmcg-k-cho', 'fmcg-d-linesensors'], openFindings: 0, slaBreaches: 0, temperament: 45, health: 'attention', lastFindingAt: '2026-07-05T22:05:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-logistics', name: 'Logistics counterpart', streamKey: 'logistics', humanOwner: { name: 'Tariq Aziz', initials: 'TA', avatarBg: '#0F766E', role: 'Logistics head' }, watchesNodeIds: ['fmcg-k-cpc', 'fmcg-k-truck', 'fmcg-k-cold', 'fmcg-d-tempprobes'], openFindings: 0, slaBreaches: 1, temperament: 50, health: 'critical', lastFindingAt: '2026-07-06T04:45:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-quality', name: 'Quality counterpart', streamKey: 'quality', humanOwner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D', role: 'Quality & food safety lead' }, watchesNodeIds: ['fmcg-k-ppm', 'fmcg-k-audit', 'fmcg-d-complaints'], openFindings: 0, slaBreaches: 0, temperament: 30, health: 'healthy', lastFindingAt: '2026-06-28T11:30:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-finance', name: 'Finance counterpart', streamKey: 'finance', humanOwner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8', role: 'FP&A lead' }, watchesNodeIds: ['fmcg-k-gm', 'fmcg-k-cogsvar', 'fmcg-k-wcd', 'fmcg-k-tradepct', 'fmcg-d-tradeledger'], openFindings: 0, slaBreaches: 0, temperament: 40, health: 'attention', lastFindingAt: '2026-07-03T16:00:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-marketing', name: 'Marketing counterpart', streamKey: 'marketing', humanOwner: { name: 'Sara Idris', initials: 'SI', avatarBg: '#9333EA', role: 'Marketing director' }, watchesNodeIds: ['fmcg-k-npd', 'fmcg-k-croi'], openFindings: 0, slaBreaches: 0, temperament: 35, health: 'healthy', lastFindingAt: '2026-06-30T10:15:00Z', reportsToAgentId: 'fmcg-sa-chief' },
      { id: 'fmcg-sa-people', name: 'People counterpart', streamKey: 'people', humanOwner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C', role: 'People partner' }, watchesNodeIds: ['fmcg-k-attr', 'fmcg-k-lti'], openFindings: 0, slaBreaches: 0, temperament: 25, health: 'healthy', lastFindingAt: '2026-06-25T08:00:00Z', reportsToAgentId: 'fmcg-sa-chief' },
    ],
  },
  healthcare: {
    industry: 'healthcare',
    agents: [
      { id: 'hc-sa-chief', name: 'Chief of staff counterpart', streamKey: null, humanOwner: { name: 'Kumara Vijayan', initials: 'KV', avatarBg: '#4F46E5', role: 'Co-founder · Admin' }, watchesNodeIds: ['hc-t-margin', 'hc-t-quality', 'hc-t-access', 'hc-t-safety'], openFindings: 0, slaBreaches: 0, temperament: 35, health: 'attention', lastFindingAt: '2026-07-04T12:00:00Z', reportsToAgentId: null },
      { id: 'hc-sa-clinical', name: 'Clinical ops counterpart', streamKey: 'clinical', humanOwner: { name: 'Dr. Maya Suresh', initials: 'MS', avatarBg: '#0E7490', role: 'Chief medical officer' }, watchesNodeIds: ['hc-k-alos', 'hc-k-bed', 'hc-k-orutil', 'hc-k-edwait', 'hc-k-hai', 'hc-k-mortality', 'hc-d-emr', 'hc-d-lab'], openFindings: 0, slaBreaches: 0, temperament: 40, health: 'healthy', lastFindingAt: '2026-07-01T09:00:00Z', reportsToAgentId: 'hc-sa-chief' },
      { id: 'hc-sa-revcycle', name: 'Revenue cycle counterpart', streamKey: 'revcycle', humanOwner: { name: 'James Okafor', initials: 'JO', avatarBg: '#B45309', role: 'Revenue cycle director' }, watchesNodeIds: ['hc-k-ar', 'hc-k-denial', 'hc-k-cleanclaim', 'hc-k-poscash', 'hc-d-claims'], openFindings: 0, slaBreaches: 1, temperament: 55, health: 'critical', lastFindingAt: '2026-07-06T05:30:00Z', reportsToAgentId: 'hc-sa-chief' },
      { id: 'hc-sa-patientexp', name: 'Patient experience counterpart', streamKey: 'patientexp', humanOwner: { name: 'Fatima Al Marri', initials: 'FA', avatarBg: '#BE185D', role: 'Patient experience lead' }, watchesNodeIds: ['hc-k-noshow', 'hc-k-nps', 'hc-k-clinicwait', 'hc-k-complaint', 'hc-d-sched', 'hc-d-survey'], openFindings: 0, slaBreaches: 0, temperament: 35, health: 'attention', lastFindingAt: '2026-07-05T15:20:00Z', reportsToAgentId: 'hc-sa-chief' },
      { id: 'hc-sa-pharmacy', name: 'Pharmacy counterpart', streamKey: 'pharmacy', humanOwner: { name: 'Ravi Menon', initials: 'RM', avatarBg: '#0F766E', role: 'Pharmacy operations head' }, watchesNodeIds: ['hc-k-generic', 'hc-k-mederror', 'hc-k-drugspend', 'hc-d-pharmacy'], openFindings: 0, slaBreaches: 0, temperament: 25, health: 'healthy', lastFindingAt: '2026-06-27T10:00:00Z', reportsToAgentId: 'hc-sa-chief' },
      { id: 'hc-sa-finance', name: 'Finance counterpart', streamKey: 'finance', humanOwner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8', role: 'FP&A lead' }, watchesNodeIds: ['hc-k-labor', 'hc-k-costdischarge', 'hc-k-cashdays', 'hc-d-gl'], openFindings: 0, slaBreaches: 0, temperament: 40, health: 'healthy', lastFindingAt: '2026-07-02T13:45:00Z', reportsToAgentId: 'hc-sa-chief' },
      { id: 'hc-sa-people', name: 'People counterpart', streamKey: 'people', humanOwner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C', role: 'People partner' }, watchesNodeIds: ['hc-k-nurseattr', 'hc-k-agency', 'hc-d-hr'], openFindings: 0, slaBreaches: 0, temperament: 25, health: 'healthy', lastFindingAt: '2026-06-29T09:30:00Z', reportsToAgentId: 'hc-sa-chief' },
    ],
  },
  manufacturing: {
    industry: 'manufacturing',
    agents: [
      { id: 'mfg-sa-chief', name: 'Chief of staff counterpart', streamKey: null, humanOwner: { name: 'Kumara Vijayan', initials: 'KV', avatarBg: '#4F46E5', role: 'Co-founder · Admin' }, watchesNodeIds: ['mfg-t-otd', 'mfg-t-unitcost', 'mfg-t-safety'], openFindings: 0, slaBreaches: 0, temperament: 35, health: 'attention', lastFindingAt: '2026-07-05T18:00:00Z', reportsToAgentId: null },
      { id: 'mfg-sa-production', name: 'Production counterpart', streamKey: 'production', humanOwner: { name: 'Priya Raman', initials: 'PR', avatarBg: '#7C3AED', role: 'Plant director' }, watchesNodeIds: ['mfg-k-oee', 'mfg-k-throughput', 'mfg-k-scrap', 'mfg-d-mes'], openFindings: 0, slaBreaches: 0, temperament: 50, health: 'attention', lastFindingAt: '2026-07-05T20:10:00Z', reportsToAgentId: 'mfg-sa-chief' },
      { id: 'mfg-sa-maintenance', name: 'Maintenance counterpart', streamKey: 'maintenance', humanOwner: { name: 'Hassan Jaber', initials: 'HJ', avatarBg: '#B45309', role: 'Maintenance manager' }, watchesNodeIds: ['mfg-k-unplanned', 'mfg-k-pmcomp', 'mfg-d-cmms'], openFindings: 0, slaBreaches: 1, temperament: 60, health: 'critical', lastFindingAt: '2026-07-06T03:15:00Z', reportsToAgentId: 'mfg-sa-chief' },
      { id: 'mfg-sa-supplychain', name: 'Supplier network counterpart', streamKey: 'supplychain', humanOwner: { name: 'Omar Farouk', initials: 'OF', avatarBg: '#0E7490', role: 'Supply chain manager' }, watchesNodeIds: ['mfg-k-supotd', 'mfg-k-rawdays', 'mfg-d-erp'], openFindings: 0, slaBreaches: 0, temperament: 45, health: 'attention', lastFindingAt: '2026-07-04T16:40:00Z', reportsToAgentId: 'mfg-sa-chief' },
      { id: 'mfg-sa-quality', name: 'Quality counterpart', streamKey: 'quality', humanOwner: { name: 'Amira Hassan', initials: 'AH', avatarBg: '#BE185D', role: 'Quality manager' }, watchesNodeIds: ['mfg-k-fpy', 'mfg-k-custppm'], openFindings: 0, slaBreaches: 0, temperament: 30, health: 'healthy', lastFindingAt: '2026-07-01T11:00:00Z', reportsToAgentId: 'mfg-sa-chief' },
      { id: 'mfg-sa-safety', name: 'Safety counterpart', streamKey: 'safety', humanOwner: { name: 'Noura Khalid', initials: 'NK', avatarBg: '#C2410C', role: 'EHS lead' }, watchesNodeIds: ['mfg-k-nearmiss'], openFindings: 0, slaBreaches: 0, temperament: 30, health: 'healthy', lastFindingAt: '2026-06-30T14:00:00Z', reportsToAgentId: 'mfg-sa-chief' },
      { id: 'mfg-sa-finance', name: 'Finance counterpart', streamKey: 'finance', humanOwner: { name: 'Daniel Chen', initials: 'DC', avatarBg: '#1D4ED8', role: 'Plant controller' }, watchesNodeIds: ['mfg-k-costvar'], openFindings: 0, slaBreaches: 0, temperament: 40, health: 'attention', lastFindingAt: '2026-07-03T10:20:00Z', reportsToAgentId: 'mfg-sa-chief' },
    ],
  },
};

// ---------------------------------------------------------------------------
// Findings — each carries a closureTemplate the server uses when accepted
// ---------------------------------------------------------------------------
export const findingsSeed = {
  fmcg: [
    {
      id: 'fmcg-f-1',
      title: 'Frozen category forecast bias is starving modern trade',
      summary: 'The frozen range has been under-forecast by a persistent 11% for eight straight weeks. Replenishment is chasing demand it never planned for, fill rate is sliding, and top-40 stores are showing repeat stockouts on the four best-selling SKUs.',
      raisedByAgentId: 'fmcg-sa-planning', raisedByAgentName: 'Planning counterpart', streamKey: 'planning', linkedKpiNodeId: 'fmcg-k-mape', severity: 'critical',
      impactPath: [
        { nodeId: 'fmcg-k-mape', nodeName: 'Forecast accuracy', kind: 'stream_kpi', effect: '-11% persistent under-forecast on frozen' },
        { nodeId: 'fmcg-k-fill', nodeName: 'Case fill rate (OTIF)', kind: 'stream_kpi', effect: 'frozen fill down to 88% vs 97% target' },
        { nodeId: 'fmcg-k-osa', nodeName: 'On-shelf availability', kind: 'stream_kpi', effect: '63 stockout events in top-40 stores, 30 days' },
        { nodeId: 'fmcg-t-rev', nodeName: 'Revenue growth', kind: 'target', effect: '≈ AED 1.2M revenue at risk this quarter' },
      ],
      impactEstimate: '≈ AED 1.2M revenue at risk this quarter',
      evidence: [
        { label: 'Forecast bias (frozen, 8 weeks)', value: '-11% persistent under-forecast' },
        { label: 'Stockout events, top-40 stores', value: '63 in the last 30 days' },
        { label: 'Unfulfilled orders booked', value: 'AED 410k' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 14, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-06T06:20:00Z', persona: 'coo',
      closureTemplate: { name: 'Frozen category case fill back above 96% for 4 straight weeks', baseline: '88%', target: '96%' },
    },
    {
      id: 'fmcg-f-2',
      title: 'Line 3 waste running 4.8% against a 3.5% standard',
      summary: 'Waste on Line 3 stepped up after the June changeover pattern shifted to shorter runs. Start-up losses per changeover are unchanged, but changeovers per week nearly doubled — the waste is structural to the new schedule, not an operator issue.',
      raisedByAgentId: 'fmcg-sa-manufacturing', raisedByAgentName: 'Manufacturing counterpart', streamKey: 'manufacturing', linkedKpiNodeId: 'fmcg-k-waste', severity: 'high',
      impactPath: [
        { nodeId: 'fmcg-k-waste', nodeName: 'Waste & scrap', kind: 'stream_kpi', effect: '4.8% vs 3.5% standard since week 24' },
        { nodeId: 'fmcg-k-cogsvar', nodeName: 'COGS variance vs plan', kind: 'stream_kpi', effect: '+0.6pp of the +2.4% variance traced here' },
        { nodeId: 'fmcg-k-gm', nodeName: 'Gross margin', kind: 'stream_kpi', effect: 'margin drag concentrated in frozen and sauces' },
        { nodeId: 'fmcg-t-ebitda', nodeName: 'EBITDA margin', kind: 'target', effect: '≈ 35 bps this quarter if unaddressed' },
      ],
      impactEstimate: '≈ 35 bps gross margin this quarter',
      evidence: [
        { label: 'Waste rate, Line 3 (4 weeks)', value: '4.8% vs 3.5% standard' },
        { label: 'Changeovers per week', value: '11 now vs 6 in May' },
        { label: 'Start-up loss per changeover', value: 'unchanged at ~180 kg' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 22, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-05T22:05:00Z', persona: 'operations_head',
      closureTemplate: { name: 'Line 3 waste back under 3.5% for 3 consecutive weeks', baseline: '4.8%', target: '3.5%' },
    },
    {
      id: 'fmcg-f-3',
      title: 'Cold-chain excursions on the Dubai–Sharjah corridor doubled month over month',
      summary: 'Reefer excursions on corridor DXB-12 went from 6 to 14 in a month. Nine of the fourteen trace to two specific vehicles. If the pattern holds, quality complaints follow within 2-4 weeks based on prior episodes.',
      raisedByAgentId: 'fmcg-sa-logistics', raisedByAgentName: 'Logistics counterpart', streamKey: 'logistics', linkedKpiNodeId: 'fmcg-k-cold', severity: 'high',
      impactPath: [
        { nodeId: 'fmcg-k-cold', nodeName: 'Cold-chain excursions', kind: 'stream_kpi', effect: '14 last month vs 6 prior' },
        { nodeId: 'fmcg-k-ppm', nodeName: 'Complaints per million', kind: 'stream_kpi', effect: 'complaint spike expected within 2-4 weeks' },
        { nodeId: 'fmcg-t-share', nodeName: 'Market share', kind: 'target', effect: 'brand-trust exposure in key accounts' },
      ],
      impactEstimate: '9 of 14 excursions trace to two vehicles — contained if acted on now',
      evidence: [
        { label: 'Excursions, corridor DXB-12', value: '14 last month vs 6 prior' },
        { label: 'Attributable vehicles', value: 'TRK-081 and TRK-094 (9 of 14)' },
        { label: 'Prior episode complaint lag', value: '2-4 weeks (Feb 2026 pattern)' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 6, escalationLevel: 1, escalatedToAgentId: 'fmcg-sa-chief',
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-06T04:45:00Z', persona: 'coo',
      closureTemplate: { name: 'Corridor DXB-12 excursions below 5 per month for 2 months', baseline: '14 / mo', target: '< 5 / mo' },
    },
    {
      id: 'fmcg-f-4',
      title: 'Juice trade spend exceeding plan with flat sell-out',
      summary: 'Trade investment in juices is tracking 14.8% of revenue against a 13% plan, while POS sell-out is flat. The extra spend is buying display, not offtake.',
      raisedByAgentId: 'fmcg-sa-finance', raisedByAgentName: 'Finance counterpart', streamKey: 'finance', linkedKpiNodeId: 'fmcg-k-tradepct', severity: 'medium',
      impactPath: [
        { nodeId: 'fmcg-k-tradepct', nodeName: 'Trade spend % of revenue', kind: 'stream_kpi', effect: '14.8% vs 13% plan, concentrated in juices' },
        { nodeId: 'fmcg-k-gm', nodeName: 'Gross margin', kind: 'stream_kpi', effect: 'juice margin down 1.1pp QTD' },
        { nodeId: 'fmcg-t-ebitda', nodeName: 'EBITDA margin', kind: 'target', effect: '≈ 15 bps drag if the pattern holds' },
      ],
      impactEstimate: '≈ 15 bps EBITDA drag if the pattern holds',
      evidence: [
        { label: 'Trade spend, juices QTD', value: '14.8% of revenue vs 13% plan' },
        { label: 'POS sell-out, juices (8 weeks)', value: 'flat (+0.4%)' },
      ],
      status: 'acknowledged', disposition: 'acknowledge', dispositionBy: 'Kumara Vijayan', dispositionAt: '2026-07-04T10:30:00Z', dispositionReason: null,
      slaHoursRemaining: 0, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null,
      reAlertCondition: 'Re-alert if juice trade spend passes 15.5% of revenue or sell-out stays flat another 4 weeks',
      detectedAt: '2026-07-03T16:00:00Z', persona: 'commercial_finance',
      closureTemplate: { name: 'Juice trade spend back to 13% of revenue with sell-out up 2%', baseline: '14.8%', target: '13%' },
    },
    {
      id: 'fmcg-f-5',
      title: 'On-shelf availability slipped below 94% in top-40 stores',
      summary: 'OSA in the top-40 stores dipped to 93.1%, driven by the frozen fill problem plus slow shelf recovery after weekend peaks. Accepted: tracked with a closure KPI while the frozen forecast finding is worked separately.',
      raisedByAgentId: 'fmcg-sa-commercial', raisedByAgentName: 'Commercial counterpart', streamKey: 'commercial', linkedKpiNodeId: 'fmcg-k-osa', severity: 'medium',
      impactPath: [
        { nodeId: 'fmcg-k-osa', nodeName: 'On-shelf availability', kind: 'stream_kpi', effect: '93.1% vs 96% target in top-40 stores' },
        { nodeId: 'fmcg-t-rev', nodeName: 'Revenue growth', kind: 'target', effect: 'each OSA point ≈ AED 220k monthly revenue' },
      ],
      impactEstimate: 'Each OSA point in top-40 stores ≈ AED 220k monthly revenue',
      evidence: [
        { label: 'OSA, top-40 stores', value: '93.1% vs 96% target' },
        { label: 'Worst window', value: 'Sunday 10:00-14:00 post-weekend' },
      ],
      status: 'accepted', disposition: 'accept', dispositionBy: 'Layla Nasser', dispositionAt: '2026-07-02T15:00:00Z', dispositionReason: null,
      slaHoursRemaining: 0, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: 'fmcg-c-1', solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-02T14:10:00Z', persona: 'sales_supervisor',
      closureTemplate: { name: 'OSA in top-40 stores at or above 96% for 4 consecutive weeks', baseline: '93.1%', target: '96%' },
    },
    {
      id: 'fmcg-f-6',
      title: 'Complaint spike in week 22 across chilled desserts',
      summary: 'A 3x complaint spike in week 22 traced to a single reefer breakdown on one delivery, already repaired and stock withdrawn. No systemic pattern.',
      raisedByAgentId: 'fmcg-sa-quality', raisedByAgentName: 'Quality counterpart', streamKey: 'quality', linkedKpiNodeId: 'fmcg-k-ppm', severity: 'low',
      impactPath: [
        { nodeId: 'fmcg-k-ppm', nodeName: 'Complaints per million', kind: 'stream_kpi', effect: 'one-week spike, reverted' },
        { nodeId: 'fmcg-t-share', nodeName: 'Market share', kind: 'target', effect: 'no measurable exposure' },
      ],
      impactEstimate: 'Contained — single-incident root cause, already resolved',
      evidence: [
        { label: 'Complaints, week 22', value: '3x weekly average, single batch' },
        { label: 'Root cause', value: 'Reefer breakdown TRK-062, repaired' },
      ],
      status: 'abandoned', disposition: 'abandon', dispositionBy: 'Amira Hassan', dispositionAt: '2026-06-29T09:00:00Z',
      dispositionReason: 'One-off logistics incident already resolved. Agent tuned: ignore single-batch complaint spikes with a confirmed closed root cause.',
      slaHoursRemaining: 0, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-06-28T11:30:00Z', persona: 'operations_head',
      closureTemplate: { name: 'Complaints back to baseline for 4 weeks', baseline: '3x avg', target: 'baseline' },
    },
  ],
  healthcare: [
    {
      id: 'hc-f-1',
      title: 'First-pass denial rate jumped 3 points after the payer policy change',
      summary: 'Denials stepped from 8.9% to 11.8% in five weeks, concentrated in two payers that changed prior-authorization rules. Each denied claim adds 30-60 days of rework before payment.',
      raisedByAgentId: 'hc-sa-revcycle', raisedByAgentName: 'Revenue cycle counterpart', streamKey: 'revcycle', linkedKpiNodeId: 'hc-k-denial', severity: 'critical',
      impactPath: [
        { nodeId: 'hc-k-denial', nodeName: 'Claim denial rate', kind: 'stream_kpi', effect: '11.8% vs 7% target, 2 payers drive the step' },
        { nodeId: 'hc-k-ar', nodeName: 'Days in AR', kind: 'stream_kpi', effect: 'AR days up 54 and climbing' },
        { nodeId: 'hc-t-margin', nodeName: 'Net margin', kind: 'target', effect: '≈ $380k cash delayed per month' },
      ],
      impactEstimate: '≈ $380k cash delayed per month',
      evidence: [
        { label: 'Denial rate (5 weeks)', value: '8.9% → 11.8%' },
        { label: 'Concentration', value: '2 payers account for 78% of the step' },
        { label: 'Top denial code', value: 'Missing prior authorization (CO-197)' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 10, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-06T05:30:00Z', persona: 'cfo',
      closureTemplate: { name: 'First-pass denial rate back under 8% for 6 weeks', baseline: '11.8%', target: '< 8%' },
    },
    {
      id: 'hc-f-2',
      title: 'No-show rate creeping up in specialty clinics',
      summary: 'Specialty no-shows rose from 10.1% to 12.4% over two months, worst in dermatology and cardiology follow-ups booked more than 3 weeks out.',
      raisedByAgentId: 'hc-sa-patientexp', raisedByAgentName: 'Patient experience counterpart', streamKey: 'patientexp', linkedKpiNodeId: 'hc-k-noshow', severity: 'medium',
      impactPath: [
        { nodeId: 'hc-k-noshow', nodeName: 'No-show rate', kind: 'stream_kpi', effect: '12.4%, worst on 3+ week lead times' },
        { nodeId: 'hc-k-orutil', nodeName: 'OR utilization', kind: 'stream_kpi', effect: 'downstream block-time gaps' },
        { nodeId: 'hc-t-access', nodeName: 'Appointment lead time', kind: 'target', effect: 'wasted slots extend everyone else’s wait' },
      ],
      impactEstimate: '≈ 240 wasted specialty slots per month',
      evidence: [
        { label: 'No-show rate (2 months)', value: '10.1% → 12.4%' },
        { label: 'Worst segments', value: 'Dermatology, cardiology follow-ups' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 30, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-05T15:20:00Z', persona: 'operations_head',
      closureTemplate: { name: 'Specialty no-show rate under 9% for 8 weeks', baseline: '12.4%', target: '< 9%' },
    },
    {
      id: 'hc-f-3',
      title: 'ALOS drift in medical wards',
      summary: 'Case-mix-adjusted length of stay drifted from 4.5 to 4.9 days, mostly discharge delays waiting on social-care placement. Accepted and tracked.',
      raisedByAgentId: 'hc-sa-clinical', raisedByAgentName: 'Clinical ops counterpart', streamKey: 'clinical', linkedKpiNodeId: 'hc-k-alos', severity: 'medium',
      impactPath: [
        { nodeId: 'hc-k-alos', nodeName: 'Average length of stay', kind: 'stream_kpi', effect: '4.9 vs 4.3 target' },
        { nodeId: 'hc-k-bed', nodeName: 'Bed occupancy', kind: 'stream_kpi', effect: 'bed pressure on admission days' },
        { nodeId: 'hc-t-quality', nodeName: '30-day readmission', kind: 'target', effect: 'discharge-planning quality exposure' },
      ],
      impactEstimate: '≈ 11 beds effectively lost to discharge delays',
      evidence: [
        { label: 'ALOS (case-mix adjusted)', value: '4.5 → 4.9 days' },
        { label: 'Primary delay reason', value: 'Social-care placement wait' },
      ],
      status: 'accepted', disposition: 'accept', dispositionBy: 'Dr. Maya Suresh', dispositionAt: '2026-07-01T10:00:00Z', dispositionReason: null,
      slaHoursRemaining: 0, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: 'hc-c-1', solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-01T09:00:00Z', persona: 'operations_head',
      closureTemplate: { name: 'ALOS back to 4.3 days for a full month', baseline: '4.9', target: '4.3' },
    },
  ],
  manufacturing: [
    {
      id: 'mfg-f-1',
      title: 'Unplanned downtime on the press line tripled as PM compliance slid',
      summary: 'PM compliance fell from 92% to 76% over a quarter as crews were pulled to expedites. Unplanned downtime followed exactly the 4-8 week lag the model predicts — now 22 h/wk on the constraint.',
      raisedByAgentId: 'mfg-sa-maintenance', raisedByAgentName: 'Maintenance counterpart', streamKey: 'maintenance', linkedKpiNodeId: 'mfg-k-unplanned', severity: 'critical',
      impactPath: [
        { nodeId: 'mfg-k-pmcomp', nodeName: 'PM compliance', kind: 'stream_kpi', effect: '92% → 76% over the quarter' },
        { nodeId: 'mfg-k-unplanned', nodeName: 'Unplanned downtime', kind: 'stream_kpi', effect: '22 h/wk on the constraint line' },
        { nodeId: 'mfg-k-oee', nodeName: 'OEE', kind: 'stream_kpi', effect: 'availability is the whole OEE gap' },
        { nodeId: 'mfg-t-otd', nodeName: 'On-time delivery', kind: 'target', effect: '87% OTD; every constraint hour is a late order' },
      ],
      impactEstimate: '≈ 320 units/week of lost constraint capacity',
      evidence: [
        { label: 'PM compliance trend', value: '92% → 76% in 13 weeks' },
        { label: 'Unplanned downtime', value: '22 h/wk vs 8 h/wk target' },
        { label: 'Failure modes', value: '70% bearing and hydraulic — PM-preventable' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 8, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-06T03:15:00Z', persona: 'operations_head',
      closureTemplate: { name: 'PM compliance above 95% and unplanned downtime under 8 h/wk for a month', baseline: '76% / 22h', target: '95% / 8h' },
    },
    {
      id: 'mfg-f-2',
      title: 'Two suppliers drive the entire OTIF slide',
      summary: 'Supplier OTIF fell to 84%. Removing two castings suppliers puts the rest of the base at 96% — the problem is concentrated, not systemic.',
      raisedByAgentId: 'mfg-sa-supplychain', raisedByAgentName: 'Supplier network counterpart', streamKey: 'supplychain', linkedKpiNodeId: 'mfg-k-supotd', severity: 'high',
      impactPath: [
        { nodeId: 'mfg-k-supotd', nodeName: 'Supplier OTIF', kind: 'stream_kpi', effect: '84%; two suppliers account for the slide' },
        { nodeId: 'mfg-t-otd', nodeName: 'On-time delivery', kind: 'target', effect: 'casting shortages gate final assembly' },
      ],
      impactEstimate: '2 suppliers gate ~60% of late customer orders',
      evidence: [
        { label: 'Supplier OTIF', value: '84% overall, 96% excluding 2 suppliers' },
        { label: 'Gated orders', value: '~60% of late orders wait on castings' },
      ],
      status: 'open', disposition: null, dispositionBy: null, dispositionAt: null, dispositionReason: null,
      slaHoursRemaining: 26, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null, reAlertCondition: null,
      detectedAt: '2026-07-04T16:40:00Z', persona: 'operations_head',
      closureTemplate: { name: 'Castings suppliers at 95% OTIF for 8 weeks', baseline: '84%', target: '95%' },
    },
    {
      id: 'mfg-f-3',
      title: 'Scrap concentrated in one part family after tooling change',
      summary: 'Scrap on the B-housing family doubled after the May tooling refresh. Acknowledged pending the tooling vendor’s inspection report.',
      raisedByAgentId: 'mfg-sa-production', raisedByAgentName: 'Production counterpart', streamKey: 'production', linkedKpiNodeId: 'mfg-k-scrap', severity: 'medium',
      impactPath: [
        { nodeId: 'mfg-k-scrap', nodeName: 'Scrap rate', kind: 'stream_kpi', effect: 'B-housing scrap 2x after tooling refresh' },
        { nodeId: 'mfg-k-costvar', nodeName: 'Cost variance vs standard', kind: 'stream_kpi', effect: '+0.8pp of variance from this family' },
        { nodeId: 'mfg-t-unitcost', nodeName: 'Unit cost index', kind: 'target', effect: 'index drag if refresh rolls to other lines' },
      ],
      impactEstimate: '+0.8pp cost variance from one part family',
      evidence: [
        { label: 'Scrap, B-housing family', value: '2x since May tooling refresh' },
        { label: 'Vendor inspection', value: 'Report due within the week' },
      ],
      status: 'acknowledged', disposition: 'acknowledge', dispositionBy: 'Priya Raman', dispositionAt: '2026-07-05T21:00:00Z', dispositionReason: null,
      slaHoursRemaining: 0, escalationLevel: 0, escalatedToAgentId: null,
      closureKpiId: null, solutionDesignId: null,
      reAlertCondition: 'Re-alert if B-housing scrap rises further or the vendor report slips past 2026-07-12',
      detectedAt: '2026-07-05T20:10:00Z', persona: 'operations_head',
      closureTemplate: { name: 'B-housing scrap back to pre-refresh baseline for 4 weeks', baseline: '2x baseline', target: 'baseline' },
    },
  ],
};

// ---------------------------------------------------------------------------
// Closure KPIs (fmcg-c-1 / hc-c-1 referenced by accepted findings above;
// fmcg-c-2 is an older, fully closed loop to show the end state)
// ---------------------------------------------------------------------------
export const closureKpisSeed = {
  fmcg: [
    { id: 'fmcg-c-1', findingId: 'fmcg-f-5', findingTitle: 'On-shelf availability slipped below 94% in top-40 stores', name: 'OSA in top-40 stores at or above 96% for 4 consecutive weeks', baseline: '93.1%', target: '96%', current: '94.9%', progressPct: 62, status: 'tracking', watchedByAgentName: 'Commercial counterpart', createdAt: '2026-07-02T15:00:00Z', closedAt: null },
    { id: 'fmcg-c-2', findingId: 'fmcg-f-0', findingTitle: 'Q1 obsolescence spike in canned range (closed)', name: 'Obsolescence write-offs below AED 120k/month for a full quarter', baseline: 'AED 310k/mo', target: 'AED 120k/mo', current: 'AED 96k/mo', progressPct: 100, status: 'closed', watchedByAgentName: 'Planning counterpart', createdAt: '2026-03-14T09:00:00Z', closedAt: '2026-06-20T09:00:00Z' },
  ],
  healthcare: [
    { id: 'hc-c-1', findingId: 'hc-f-3', findingTitle: 'ALOS drift in medical wards', name: 'ALOS back to 4.3 days for a full month', baseline: '4.9', target: '4.3', current: '4.7', progressPct: 33, status: 'tracking', watchedByAgentName: 'Clinical ops counterpart', createdAt: '2026-07-01T10:00:00Z', closedAt: null },
  ],
  manufacturing: [],
};

// ---------- FP&A P&L impact rollup (findings translated onto the P&L) ----------
// One row per P&L line item: how many findings the counterparts identified
// against it, what happened to them, and the measured impact so far.
export const plImpactSeed = {
  fmcg: [
    { key: 'gross-revenue', plLine: 'Gross revenue', topDrivers: 'Frozen forecast bias · OSA in top-40 stores', identified: 9, accepted: 4, acting: 2, cleared: 2, openNow: 1, translatedImpact: { text: '+AED 1.42M protected / qtr', direction: 'up' } },
    { key: 'returns', plLine: 'Returns & refusals', topDrivers: 'Cold-chain excursions · chilled desserts complaints', identified: 4, accepted: 2, acting: 1, cleared: 1, openNow: 0, translatedImpact: { text: '−AED 180k returns avoided', direction: 'up' } },
    { key: 'trade-spend', plLine: 'Trade spend & discounts', topDrivers: 'Juice trade spend with flat sell-out · display compliance', identified: 6, accepted: 2, acting: 2, cleared: 2, openNow: 1, translatedImpact: { text: 'AED 480k spend re-aimed', direction: 'up' } },
    { key: 'cogs-waste', plLine: 'COGS — waste & scrap', topDrivers: 'Line 3 waste vs standard · changeover start-up losses', identified: 5, accepted: 3, acting: 1, cleared: 1, openNow: 1, translatedImpact: { text: '+AED 260k margin held', direction: 'up' } },
    { key: 'logistics-cost', plLine: 'Logistics & distribution cost', topDrivers: 'Corridor excursions traced to two vehicles · truck utilization', identified: 3, accepted: 1, acting: 1, cleared: 1, openNow: 1, translatedImpact: { text: '+AED 95k / qtr', direction: 'up' } },
    { key: 'working-capital', plLine: 'Working capital', topDrivers: 'Distributor payment terms · obsolescence write-offs', identified: 2, accepted: 1, acting: 0, cleared: 1, openNow: 0, translatedImpact: { text: '−AED 40k DSO cost', direction: 'down' } },
  ],
  healthcare: [
    { key: 'patient-revenue', plLine: 'Net patient revenue', topDrivers: 'First-pass denial surge · payer policy change', identified: 7, accepted: 3, acting: 2, cleared: 2, openNow: 1, translatedImpact: { text: '+$620k recovered', direction: 'up' } },
    { key: 'denials', plLine: 'Denials & write-offs', topDrivers: 'Prior-auth denials, two payers', identified: 5, accepted: 2, acting: 1, cleared: 2, openNow: 1, translatedImpact: { text: '−4.4 pts first-pass denial rate', direction: 'up' } },
    { key: 'supply-pharmacy', plLine: 'Supply & pharmacy cost', topDrivers: 'Biosimilar switch · infusion therapy formulary', identified: 4, accepted: 2, acting: 1, cleared: 1, openNow: 0, translatedImpact: { text: '+$210k / yr', direction: 'up' } },
    { key: 'labor', plLine: 'Labor & premium pay', topDrivers: 'ALOS drift holding beds · discharge delays', identified: 3, accepted: 1, acting: 1, cleared: 0, openNow: 1, translatedImpact: { text: 'measuring…', direction: 'flat' } },
    { key: 'ar', plLine: 'AR & working capital', topDrivers: 'Claim processing time · eligibility verification', identified: 2, accepted: 1, acting: 0, cleared: 1, openNow: 0, translatedImpact: { text: '−6 days in AR', direction: 'up' } },
  ],
  manufacturing: [
    { key: 'revenue', plLine: 'Revenue — OTIF penalties', topDrivers: 'Two suppliers driving the OTIF slide', identified: 4, accepted: 2, acting: 1, cleared: 1, openNow: 1, translatedImpact: { text: '+9 pts OTIF', direction: 'up' } },
    { key: 'cogs-scrap', plLine: 'COGS — scrap & rework', topDrivers: 'Scrap concentrated in one part family', identified: 3, accepted: 1, acting: 1, cleared: 1, openNow: 0, translatedImpact: { text: '−0.8 pt scrap', direction: 'up' } },
    { key: 'maintenance', plLine: 'Maintenance & downtime', topDrivers: 'PM compliance slide on the press line', identified: 3, accepted: 2, acting: 0, cleared: 1, openNow: 1, translatedImpact: { text: '−14 h/wk downtime', direction: 'up' } },
  ],
};
