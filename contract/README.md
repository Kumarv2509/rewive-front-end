# Contract test harness

The mock server's REST contract as an **executable spec** (ARCH-GTM-001 P1.3).
The mock (`mock-server/`) is the reference implementation; the production API
must pass this suite unchanged — that is what lets the frontend ship on day one.

Zero dependencies: `node:test` + built-in `fetch`.

```bash
npm run test:contract                     # against the local mock (:4000)
CONTRACT_BASE_URL=https://api.example.com/api/v1 npm run test:contract
```

## Environment

| Var | Default | Meaning |
|---|---|---|
| `CONTRACT_BASE_URL` | `http://localhost:4000/api/v1` | Target implementation |
| `CONTRACT_INDUSTRIES` | `fmcg,healthcare,hypermarket,manufacturing` | Contexts the target serves — a production tenant serves one |
| `CONTRACT_MUTATIONS` | `1` | Set `0` for shared/production targets: skips every write (dispositions, escalations, actions, keys, org-profile switch) |
| `CONTRACT_SWEEP` | off | `1` also triggers a live agent sweep (slow: paced per mandate) |

## Rules the suite lives by

- **Discovery-driven, never seed-driven.** Tests find their targets through the
  list endpoints (e.g. "an open finding") and skip when none exists — the suite
  must hold against any data set, not just the demo seeds.
- **Behavior over shape.** Shapes are asserted (from `src/api/types.ts`, the
  source of truth), but the valuable checks are the loop's consequences:
  Accept mints a recovery target; every decision lands in the ledger the moment
  it is made; closing the loop delivers the assessor's verdict; Dismiss without
  a reason is refused; escalation delivers a notification to the new owner;
  signed claims outrank `?industry=`; opaque bearers are never treated as
  sessions.
- **Serial by design** (`--test-concurrency=1`): mutation tests share state.

## Adding to the contract

New endpoint → type in `src/api/types.ts` → mock route + seed → a test here
asserting the *behavior* the frontend will rely on. Keep specs to the fields
the frontend actually reads.
