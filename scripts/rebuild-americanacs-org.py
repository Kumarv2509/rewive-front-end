#!/usr/bin/env python3
"""Rebuild the Americana C&S runtime org through the onboarding factory.

Replaces the lost build-cs-mtd.mjs, which only ever existed in a scratchpad.
Drives the same two endpoints the /onboard UI does: draft (fuzzy-matches KPI
names onto the template's streams) then commit.

The org is in-memory. A mock-server restart wipes it; re-run this.

FIGURES: the MTD gross-sales headline and its four breakdowns, as evidenced
in the Americana C&S work — AED 124M actual against a 135M target. These are
marginals, not a cube: each breakdown sums back to the headline, so summing
every row here would count the same sales several times over.
"""
import json
import urllib.request

BASE = 'http://localhost:4000/api/v1'

COMPANY = {
    'name': 'Americana C&S',
    'currency': 'AED',
    'sector': 'Food trading & distribution',
    'domain': 'americana-cs.example',
    'accent': '#C05B41',
}

# name, current, target  (AED M).  None target = published without one.
KPIS = [
    ('MTD gross sales',            124.0, 135.0),   # the headline
    ('Processed meats gross sales', 28.4, None),    # by business unit
    ('Snacks gross sales',          15.5,  21.0),
    ('Modern trade gross sales',    54.8,  65.0),   # by channel
    ('E-commerce gross sales',       9.1,  12.0),
    ('Abu Dhabi gross sales',       36.9,  46.0),   # by region
    ('Beverages gross sales',       14.0, None),    # by category
]

ROLES = {
    'coo':                {'label': 'Chief Operating Officer', 'person': ''},
    'cfo':                {'label': 'Chief Financial Officer', 'person': ''},
    'operations_head':    {'label': 'Operations head',         'person': ''},
    'store_manager':      {'label': 'Depot manager',           'person': ''},
    'sales_supervisor':   {'label': 'Sales supervisor',        'person': ''},
    'fpa':                {'label': 'FP&A',                    'person': ''},
    'commercial_finance': {'label': 'Commercial finance',      'person': ''},
}

ENTITIES = [{'name': 'Americana C&S', 'region': 'UAE'}]


def post(path, payload):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())


draft = post('/onboarding/draft', {
    'template': 'fmcg',
    'company': COMPANY,
    'kpis': [{'name': n, 'current': c, 'target': t} for n, c, t in KPIS],
})

mandates = draft.get('mandates', [])
print(f'draft: {len(mandates)} rows, {len(draft.get("streams", []))} streams')

# The draft also returns every mandate the fmcg template carries, valueless.
# Include ONLY our own rows — otherwise the org fills with ~26 empty
# "needs_data" mandates that were never Americana C&S's.
for m in mandates:
    ours = m.get('source') != 'template'
    m['include'] = ours
    if ours:
        m['unit'] = 'currency_m'
        m['direction'] = 'up_good'      # more sales is good, for every slice
        print(f'   {m["name"]:34} {str(m["current"]):>7} / {str(m["target"]):>7}'
              f'  stream={m["streamKey"]:<12} ({m["source"]})')

print(f'including {sum(1 for m in mandates if m["include"])} of {len(mandates)}')

for w in draft.get('warnings', []) or []:
    print(f'   warning: {w}')

result = post('/onboarding/commit', {
    'template': 'fmcg',
    'company': COMPANY,
    'entities': ENTITIES,
    'roles': ROLES,
    'mandates': mandates,
    'streams': draft.get('streams', []),
})

tenant = result.get('tenant', {})
print(f'\ncommitted: {tenant.get("name")}  id={tenant.get("id")}  '
      f'industry={tenant.get("industry")}')
prov = result.get('provisioning') or {}
print(f'provisioning: status={prov.get("status")} storeMode={prov.get("storeMode")} '
      f'migrationVersion={prov.get("migrationVersion")}')

# The commit route returns {tenant, labels, industry, provisioning} — it does
# NOT return trackingPlan, so ask the tracking API what actually landed rather
# than reading a key that does not exist and reporting a confident zero.
with urllib.request.urlopen(BASE + '/tracking-configs?industry=custom', timeout=30) as r:
    configs = json.loads(r.read().decode())
configs = configs if isinstance(configs, list) else configs.get('configs', [])
print(f'live-tracked mandates: {len(configs)}')
for c in configs:
    print(f'   {c["nodeId"]:34} {c.get("latestValue")} / target {c.get("targetNumeric")}'
          f'  pts={c.get("pointCount")}  entity={c.get("entity")}')
