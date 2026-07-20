// FP&A P&L statement seeds: the full P&L per industry, with Budget and
// Forecast as the base of drift, drillable by two dimensions, and every
// drift anomaly as a task routed to the role whose call it is. Anomalies
// that an agent has raised carry the findingId of their thread.
//
// Numbers are quarter-to-date in the statement's unit. Variances are
// percentages vs budget / vs forecast; the UI flips good/bad via isCost.

export const plStatementSeed = {
  fmcg: {
    period: 'Q3 FY26 · quarter to date',
    unit: 'AED M',
    dimALabel: 'SKU family',
    dimBLabel: 'Channel',
    lines: [
      {
        key: 'gross-revenue', label: 'Gross revenue', kind: 'line', isCost: false,
        actual: '128.4', budget: '132.0', forecast: '129.6', varBudgetPct: -2.7, varForecastPct: -0.9,
        anomalyIds: ['pl-a-1', 'pl-a-2', 'pl-a-7'],
        byDimA: [
          { key: 'frozen', label: 'Frozen', actual: '24.1', budget: '28.0', forecast: '26.2', varBudgetPct: -13.9, varForecastPct: -8.0, anomalyIds: ['pl-a-1'] },
          { key: 'juice', label: 'Juice', actual: '18.6', budget: '19.0', forecast: '18.8', varBudgetPct: -2.1, varForecastPct: -1.1, anomalyIds: [] },
          { key: 'chilled', label: 'Chilled desserts', actual: '12.2', budget: '12.8', forecast: '12.4', varBudgetPct: -4.7, varForecastPct: -1.6, anomalyIds: [] },
          { key: 'canned', label: 'Canned', actual: '15.9', budget: '15.6', forecast: '15.7', varBudgetPct: 1.9, varForecastPct: 1.3, anomalyIds: [] },
          { key: 'snacks', label: 'Snacks', actual: '22.4', budget: '22.1', forecast: '23.1', varBudgetPct: 1.4, varForecastPct: -3.0, anomalyIds: ['pl-a-7'] },
          { key: 'other', label: 'Other families', actual: '35.2', budget: '34.5', forecast: '33.4', varBudgetPct: 2.0, varForecastPct: 5.4, anomalyIds: [] },
        ],
        byDimB: [
          { key: 'modern', label: 'Modern trade', actual: '58.2', budget: '62.5', forecast: '60.1', varBudgetPct: -6.9, varForecastPct: -3.2, anomalyIds: ['pl-a-1', 'pl-a-2'] },
          { key: 'traditional', label: 'Traditional trade', actual: '42.6', budget: '42.0', forecast: '42.3', varBudgetPct: 1.4, varForecastPct: 0.7, anomalyIds: [] },
          { key: 'foodservice', label: 'Food service', actual: '15.4', budget: '15.5', forecast: '15.4', varBudgetPct: -0.6, varForecastPct: 0.0, anomalyIds: [] },
          { key: 'ecom', label: 'E-commerce', actual: '12.2', budget: '12.0', forecast: '11.8', varBudgetPct: 1.7, varForecastPct: 3.4, anomalyIds: ['pl-a-7'] },
        ],
      },
      {
        key: 'trade-spend', label: 'Trade spend & discounts', kind: 'line', isCost: true,
        actual: '18.9', budget: '17.2', forecast: '18.1', varBudgetPct: 9.9, varForecastPct: 4.4,
        anomalyIds: ['pl-a-3', 'pl-a-8'],
        byDimA: [
          { key: 'juice', label: 'Juice', actual: '5.8', budget: '4.6', forecast: '5.2', varBudgetPct: 26.1, varForecastPct: 11.5, anomalyIds: ['pl-a-3'] },
          { key: 'canned', label: 'Canned', actual: '3.4', budget: '2.9', forecast: '3.1', varBudgetPct: 17.2, varForecastPct: 9.7, anomalyIds: ['pl-a-8'] },
          { key: 'frozen', label: 'Frozen', actual: '3.1', budget: '3.2', forecast: '3.2', varBudgetPct: -3.1, varForecastPct: -3.1, anomalyIds: [] },
          { key: 'other', label: 'All other', actual: '6.6', budget: '6.5', forecast: '6.6', varBudgetPct: 1.5, varForecastPct: 0.0, anomalyIds: [] },
        ],
        byDimB: [
          { key: 'modern', label: 'Modern trade', actual: '11.9', budget: '10.4', forecast: '11.2', varBudgetPct: 14.4, varForecastPct: 6.3, anomalyIds: ['pl-a-3'] },
          { key: 'traditional', label: 'Traditional trade', actual: '4.6', budget: '4.3', forecast: '4.4', varBudgetPct: 7.0, varForecastPct: 4.5, anomalyIds: ['pl-a-8'] },
          { key: 'ecom', label: 'E-commerce', actual: '2.4', budget: '2.5', forecast: '2.5', varBudgetPct: -4.0, varForecastPct: -4.0, anomalyIds: [] },
        ],
      },
      {
        key: 'returns', label: 'Returns & refusals', kind: 'line', isCost: true,
        actual: '2.6', budget: '1.9', forecast: '2.2', varBudgetPct: 36.8, varForecastPct: 18.2,
        anomalyIds: ['pl-a-4', 'pl-a-6'],
        byDimA: [
          { key: 'frozen', label: 'Frozen', actual: '1.1', budget: '0.7', forecast: '0.9', varBudgetPct: 57.1, varForecastPct: 22.2, anomalyIds: ['pl-a-4'] },
          { key: 'chilled', label: 'Chilled desserts', actual: '0.8', budget: '0.5', forecast: '0.6', varBudgetPct: 60.0, varForecastPct: 33.3, anomalyIds: ['pl-a-6'] },
          { key: 'other', label: 'All other', actual: '0.7', budget: '0.7', forecast: '0.7', varBudgetPct: 0.0, varForecastPct: 0.0, anomalyIds: [] },
        ],
        byDimB: [
          { key: 'modern', label: 'Modern trade', actual: '1.6', budget: '1.1', forecast: '1.3', varBudgetPct: 45.5, varForecastPct: 23.1, anomalyIds: ['pl-a-4'] },
          { key: 'traditional', label: 'Traditional trade', actual: '0.8', budget: '0.6', forecast: '0.7', varBudgetPct: 33.3, varForecastPct: 14.3, anomalyIds: [] },
          { key: 'foodservice', label: 'Food service', actual: '0.2', budget: '0.2', forecast: '0.2', varBudgetPct: 0.0, varForecastPct: 0.0, anomalyIds: [] },
        ],
      },
      {
        key: 'net-revenue', label: 'Net revenue', kind: 'subtotal', isCost: false,
        actual: '106.9', budget: '112.9', forecast: '109.3', varBudgetPct: -5.3, varForecastPct: -2.2, anomalyIds: [],
      },
      {
        key: 'cogs', label: 'COGS — materials & conversion', kind: 'line', isCost: true,
        actual: '68.3', budget: '67.2', forecast: '67.9', varBudgetPct: 1.6, varForecastPct: 0.6,
        anomalyIds: ['pl-a-5'],
        byDimA: [
          { key: 'chilled', label: 'Chilled desserts (Line 3)', actual: '9.4', budget: '8.7', forecast: '9.0', varBudgetPct: 8.0, varForecastPct: 4.4, anomalyIds: ['pl-a-5'] },
          { key: 'frozen', label: 'Frozen', actual: '13.9', budget: '13.8', forecast: '13.9', varBudgetPct: 0.7, varForecastPct: 0.0, anomalyIds: [] },
          { key: 'other', label: 'All other', actual: '45.0', budget: '44.7', forecast: '45.0', varBudgetPct: 0.7, varForecastPct: 0.0, anomalyIds: [] },
        ],
      },
      {
        key: 'gross-margin', label: 'Gross margin', kind: 'subtotal', isCost: false,
        actual: '38.6', budget: '45.7', forecast: '41.4', varBudgetPct: -15.5, varForecastPct: -6.8, anomalyIds: [],
      },
      {
        key: 'logistics', label: 'Logistics & distribution', kind: 'line', isCost: true,
        actual: '9.8', budget: '9.2', forecast: '9.5', varBudgetPct: 6.5, varForecastPct: 3.2,
        anomalyIds: ['pl-a-9'],
        byDimB: [
          { key: 'modern', label: 'Modern trade routes', actual: '4.9', budget: '4.4', forecast: '4.6', varBudgetPct: 11.4, varForecastPct: 6.5, anomalyIds: ['pl-a-9'] },
          { key: 'traditional', label: 'Traditional trade routes', actual: '3.4', budget: '3.4', forecast: '3.4', varBudgetPct: 0.0, varForecastPct: 0.0, anomalyIds: [] },
          { key: 'other', label: 'Other', actual: '1.5', budget: '1.4', forecast: '1.5', varBudgetPct: 7.1, varForecastPct: 0.0, anomalyIds: [] },
        ],
      },
      {
        key: 'overheads', label: 'Marketing & overheads', kind: 'line', isCost: true,
        actual: '12.4', budget: '12.6', forecast: '12.5', varBudgetPct: -1.6, varForecastPct: -0.8, anomalyIds: [],
      },
      {
        key: 'ebitda', label: 'EBITDA', kind: 'subtotal', isCost: false,
        actual: '16.4', budget: '23.9', forecast: '19.4', varBudgetPct: -31.4, varForecastPct: -15.5, anomalyIds: [],
      },
    ],
    anomalies: [
      { id: 'pl-a-1', title: 'Frozen under-forecast starving modern trade', plLineKey: 'gross-revenue', plLineLabel: 'Gross revenue', dimA: 'Frozen', dimB: 'Modern trade', driftVsBudgetPct: -13.9, driftVsForecastPct: -8.0, impact: '≈ AED 1.2M revenue at risk this quarter', severity: 'critical', routedTo: 'coo', status: 'raised', findingId: 'fmcg-f-1' },
      { id: 'pl-a-2', title: 'OSA below 96% in top-40 stores', plLineKey: 'gross-revenue', plLineLabel: 'Gross revenue', dimB: 'Modern trade', driftVsBudgetPct: -3.1, driftVsForecastPct: -1.8, impact: 'each OSA point ≈ AED 220k monthly revenue', severity: 'medium', routedTo: 'sales_supervisor', status: 'watching', findingId: 'fmcg-f-5' },
      { id: 'pl-a-3', title: 'Juice trade spend +26% vs budget with flat sell-out', plLineKey: 'trade-spend', plLineLabel: 'Trade spend & discounts', dimA: 'Juice', dimB: 'Modern trade', driftVsBudgetPct: 26.1, driftVsForecastPct: 11.5, impact: '≈ 15 bps EBITDA drag if the pattern holds', severity: 'medium', routedTo: 'commercial_finance', status: 'watching', findingId: 'fmcg-f-4' },
      { id: 'pl-a-4', title: 'Frozen returns doubling on the Dubai–Sharjah corridor', plLineKey: 'returns', plLineLabel: 'Returns & refusals', dimA: 'Frozen', dimB: 'Modern trade', driftVsBudgetPct: 57.1, driftVsForecastPct: 22.2, impact: '9 of 14 excursions trace to two vehicles', severity: 'high', routedTo: 'coo', status: 'raised', findingId: 'fmcg-f-3' },
      { id: 'pl-a-5', title: 'Line 3 waste at 4.8% against the 3.5% standard', plLineKey: 'cogs', plLineLabel: 'COGS — materials & conversion', dimA: 'Chilled desserts (Line 3)', driftVsBudgetPct: 8.0, driftVsForecastPct: 4.4, impact: '≈ 35 bps gross margin this quarter', severity: 'high', routedTo: 'operations_head', status: 'raised', findingId: 'fmcg-f-2' },
      { id: 'pl-a-6', title: 'Chilled desserts complaint returns, week 22 spike', plLineKey: 'returns', plLineLabel: 'Returns & refusals', dimA: 'Chilled desserts', driftVsBudgetPct: 60.0, driftVsForecastPct: 33.3, impact: 'contained — single-incident root cause', severity: 'low', routedTo: 'operations_head', status: 'cleared', findingId: 'fmcg-f-6' },
      { id: 'pl-a-7', title: 'Snacks e-commerce price-pack drift vs forecast', plLineKey: 'gross-revenue', plLineLabel: 'Gross revenue', dimA: 'Snacks', dimB: 'E-commerce', driftVsBudgetPct: 1.4, driftVsForecastPct: -3.0, impact: 'mix shifting to low-margin packs', severity: 'medium', routedTo: 'commercial_finance', status: 'new' },
      { id: 'pl-a-8', title: 'Canned promo depth cannibalizing full-price snacks', plLineKey: 'trade-spend', plLineLabel: 'Trade spend & discounts', dimA: 'Canned', dimB: 'Traditional trade', driftVsBudgetPct: 17.2, driftVsForecastPct: 9.7, impact: 'promo ROI below 1.0 in 3 of 5 areas', severity: 'medium', routedTo: 'commercial_finance', status: 'new' },
      { id: 'pl-a-9', title: 'Reefer surcharge on modern trade routes', plLineKey: 'logistics', plLineLabel: 'Logistics & distribution', dimB: 'Modern trade', driftVsBudgetPct: 11.4, driftVsForecastPct: 6.5, impact: 'linked to corridor excursions re-routing', severity: 'low', routedTo: 'coo', status: 'new' },
    ],
  },

  healthcare: {
    period: 'Q3 FY26 · quarter to date',
    unit: 'AED M',
    dimALabel: 'Service line',
    dimBLabel: 'Payer',
    lines: [
      {
        key: 'patient-revenue', label: 'Net patient revenue', kind: 'line', isCost: false,
        actual: '309.0', budget: '321.1', forecast: '314.2', varBudgetPct: -3.8, varForecastPct: -1.6,
        anomalyIds: ['hpl-a-1'],
        byDimA: [
          { key: 'medsurg', label: 'Inpatient wards', actual: '115.2', budget: '121.1', forecast: '117.8', varBudgetPct: -4.8, varForecastPct: -2.2, anomalyIds: ['hpl-a-1'] },
          { key: 'specialty', label: 'Specialty medical centres', actual: '69.4', budget: '72.7', forecast: '70.5', varBudgetPct: -4.5, varForecastPct: -1.6, anomalyIds: [] },
          { key: 'other', label: 'All other', actual: '124.4', budget: '127.3', forecast: '125.9', varBudgetPct: -2.3, varForecastPct: -1.2, anomalyIds: [] },
        ],
        byDimB: [
          { key: 'payer-a', label: 'Sukoon', actual: '90.3', budget: '96.9', forecast: '93.6', varBudgetPct: -6.8, varForecastPct: -3.5, anomalyIds: ['hpl-a-1'] },
          { key: 'payer-b', label: 'AXA / GIG Gulf', actual: '72.7', budget: '76.7', forecast: '74.1', varBudgetPct: -5.3, varForecastPct: -2.0, anomalyIds: ['hpl-a-1'] },
          { key: 'other', label: 'All other payers', actual: '146.0', budget: '147.5', forecast: '146.5', varBudgetPct: -1.0, varForecastPct: -0.3, anomalyIds: [] },
        ],
      },
      {
        key: 'denials', label: 'Denials & write-offs', kind: 'line', isCost: true,
        actual: '22.4', budget: '17.6', forecast: '20.2', varBudgetPct: 27.1, varForecastPct: 10.9,
        anomalyIds: ['hpl-a-2'],
        byDimB: [
          { key: 'payer-a', label: 'Sukoon', actual: '9.5', budget: '6.2', forecast: '7.7', varBudgetPct: 52.9, varForecastPct: 23.8, anomalyIds: ['hpl-a-2'] },
          { key: 'payer-b', label: 'AXA / GIG Gulf', actual: '7.0', budget: '5.1', forecast: '6.3', varBudgetPct: 35.7, varForecastPct: 11.8, anomalyIds: ['hpl-a-2'] },
          { key: 'other', label: 'All other payers', actual: '5.9', budget: '6.3', forecast: '6.2', varBudgetPct: -5.9, varForecastPct: -5.9, anomalyIds: [] },
        ],
      },
      {
        key: 'supply-pharmacy', label: 'Supply & pharmacy cost', kind: 'line', isCost: true,
        actual: '78.2', budget: '80.4', forecast: '78.9', varBudgetPct: -2.7, varForecastPct: -0.9,
        anomalyIds: ['hpl-a-3'],
        byDimA: [
          { key: 'infusion', label: 'Infusion therapy', actual: '19.1', budget: '21.3', forecast: '20.2', varBudgetPct: -10.3, varForecastPct: -5.5, anomalyIds: ['hpl-a-3'] },
          { key: 'other', label: 'All other', actual: '59.1', budget: '59.1', forecast: '58.7', varBudgetPct: 0.0, varForecastPct: 0.6, anomalyIds: [] },
        ],
      },
      {
        key: 'labor', label: 'Labour & premium pay', kind: 'line', isCost: true,
        actual: '141.7', budget: '137.3', forecast: '139.8', varBudgetPct: 3.2, varForecastPct: 1.3,
        anomalyIds: ['hpl-a-4'],
        byDimA: [
          { key: 'medsurg', label: 'Inpatient wards', actual: '54.3', budget: '51.0', forecast: '52.8', varBudgetPct: 6.5, varForecastPct: 2.8, anomalyIds: ['hpl-a-4'] },
          { key: 'other', label: 'All other', actual: '87.4', budget: '86.3', forecast: '87.0', varBudgetPct: 1.3, varForecastPct: 0.4, anomalyIds: [] },
        ],
      },
      {
        key: 'ebitda', label: 'EBITDA', kind: 'subtotal', isCost: false,
        actual: '66.8', budget: '85.9', forecast: '75.2', varBudgetPct: -22.2, varForecastPct: -11.2, anomalyIds: [],
      },
    ],
    anomalies: [
      { id: 'hpl-a-1', title: 'First-pass denials suppressing net revenue, two payers', plLineKey: 'patient-revenue', plLineLabel: 'Net patient revenue', dimA: 'Inpatient wards', dimB: 'Sukoon + AXA / GIG Gulf', driftVsBudgetPct: -6.8, driftVsForecastPct: -3.5, impact: '≈ AED 6.6M revenue at risk this quarter', severity: 'critical', routedTo: 'commercial_finance', status: 'raised', findingId: 'hc-f-1' },
      { id: 'hpl-a-2', title: 'Denial rate +3 pts after payer prior-approval policy change', plLineKey: 'denials', plLineLabel: 'Denials & write-offs', dimB: 'Sukoon', driftVsBudgetPct: 52.9, driftVsForecastPct: 23.8, impact: 'first-pass denial rate 11.8% vs 8.8% budget — mostly AUTH-003 prior approval not obtained', severity: 'high', routedTo: 'commercial_finance', status: 'raised', findingId: 'hc-f-1' },
      { id: 'hpl-a-3', title: 'Biosimilar switch tracking ahead of budget', plLineKey: 'supply-pharmacy', plLineLabel: 'Supply & pharmacy cost', dimA: 'Infusion therapy', driftVsBudgetPct: -10.3, driftVsForecastPct: -5.5, impact: '+AED 770k/yr — favourable, verdict logged', severity: 'low', routedTo: 'cfo', status: 'cleared' },
      { id: 'hpl-a-4', title: 'ALOS drift holding beds, premium pay creeping', plLineKey: 'labor', plLineLabel: 'Labour & premium pay', dimA: 'Inpatient wards', driftVsBudgetPct: 6.5, driftVsForecastPct: 2.8, impact: 'ALOS 4.7 vs 4.3 target', severity: 'medium', routedTo: 'operations_head', status: 'watching', findingId: 'hc-f-3' },
    ],
  },

  manufacturing: {
    period: 'Q3 FY26 · quarter to date',
    unit: '$ M',
    dimALabel: 'Part family',
    dimBLabel: 'Customer',
    lines: [
      { key: 'revenue', label: 'Revenue', kind: 'line', isCost: false, actual: '46.2', budget: '48.0', forecast: '47.1', varBudgetPct: -3.8, varForecastPct: -1.9, anomalyIds: ['mpl-a-1'] },
      { key: 'cogs-scrap', label: 'COGS — scrap & rework', kind: 'line', isCost: true, actual: '2.4', budget: '1.9', forecast: '2.1', varBudgetPct: 26.3, varForecastPct: 14.3, anomalyIds: ['mpl-a-2'] },
      { key: 'maintenance', label: 'Maintenance & downtime', kind: 'line', isCost: true, actual: '3.1', budget: '2.6', forecast: '2.9', varBudgetPct: 19.2, varForecastPct: 6.9, anomalyIds: ['mpl-a-3'] },
      { key: 'ebitda', label: 'EBITDA', kind: 'subtotal', isCost: false, actual: '6.8', budget: '9.1', forecast: '7.7', varBudgetPct: -25.3, varForecastPct: -11.7, anomalyIds: [] },
    ],
    anomalies: [
      { id: 'mpl-a-1', title: 'OTIF penalties from two casting suppliers', plLineKey: 'revenue', plLineLabel: 'Revenue', dimB: 'Key accounts', driftVsBudgetPct: -3.8, driftVsForecastPct: -1.9, impact: '+9 pts OTIF recovered after dual-sourcing', severity: 'high', routedTo: 'coo', status: 'watching', findingId: 'mfg-f-2' },
      { id: 'mpl-a-2', title: 'Scrap concentrated in B-housing after tooling change', plLineKey: 'cogs-scrap', plLineLabel: 'COGS — scrap & rework', dimA: 'B-housing', driftVsBudgetPct: 26.3, driftVsForecastPct: 14.3, impact: '−0.8 pt scrap after tooling return', severity: 'medium', routedTo: 'operations_head', status: 'raised', findingId: 'mfg-f-3' },
      { id: 'mpl-a-3', title: 'Unplanned downtime tripled as PM compliance slid', plLineKey: 'maintenance', plLineLabel: 'Maintenance & downtime', dimA: 'Press line', driftVsBudgetPct: 19.2, driftVsForecastPct: 6.9, impact: '22 h/wk downtime vs 8 budgeted', severity: 'high', routedTo: 'operations_head', status: 'raised', findingId: 'mfg-f-1' },
    ],
  },
};
