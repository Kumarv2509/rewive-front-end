# System Blueprint — how to navigate Rewive (v5)

A map of every screen, how you reach it, and how the screens chain together.
Route source of truth: `src/App.tsx`; nav structure: `src/components/layout/areas.ts`.

## The one idea that organizes everything

Rewive is **the Decision Accountability Layer**. Every mandate (a number the
business committed to) is held twice — once by a person, once by an agent
**counterpart** watching the same number. When the number drifts, the loop runs:

```
Sense ────────► Find ────────► Decide ────────► Act ────────► Close
Operating       Findings       Disposition      Solution       Closure →
Picture +       (/operate/     (Accept/Act/     design →       Decision
counterparts    findings)      Acknowledge/     agent spec     Ledger
                               Abandon)
```

Every screen in the app is one station on that loop. Navigate by asking
"which stage am I looking at?"

## Entry points

| Where | URL | What it is |
|---|---|---|
| Landing page | `/` | Public pitch, no app chrome. Hero: "Nothing drifts unanswered." Pick an **operating context** (FMCG or Healthcare) here — every screen's content swaps with it. Persisted in localStorage, sent as `?industry=` on every API call. |
| Intro tour | `/guide` | Full-screen 9-step scroller (snap slides, dots, skip). Auto-opens once for first-time users (`localStorage['rewive.guideSeen']`); also the Help link in the app. |
| Demo launcher | `public/demo.html` | Standalone launcher page for reviewers. |
| Story page | `public/story.html` | Standalone narrative pitch (the essay). |

## The nav: three areas

### Operate — the hero path (day-to-day work)

| Screen | URL | What you do there |
|---|---|---|
| **Command Center** | `/command` | Start here. The morning view of everything that needs you, filterable by **persona** (store manager / CFO / operations head). |
| **Findings** | `/operate/findings` | Drift the counterparts caught. Each finding is a case that must be dispositioned; silence escalates on an SLA. |
| Finding detail | `/operate/findings/:findingId` | Read the case, then make the four-A call: **Accept / Act / Acknowledge / Abandon**. |
| **Closure** | `/operate/closure` | Accepted findings become **exit conditions** watched until the number is back. Nothing is "done" until the number is back. |
| **Decision Ledger** | `/operate/decisions` | Every decision on record, with a later assessor verdict (worked / didn't / too early). The company's memory of judgment. |
| **Counterparts** | `/operate/counterparts` | The agents holding the mandates — one per function stream plus an org-level chief. |
| **Runs & Actions** | `/operate/runs` | Agent runs and pending actions (nav badge shows pending decisions). |
| **Tasks** | `/operate/tasks` | Task queue. |

### Insights — is it working?

| Screen | URL | What you do there |
|---|---|---|
| **Outcomes** | `/insights/outcomes/:runId` (`latest` by default) | Results of runs. |
| **Performance** | `/insights/people` | Where the loop closes fastest (the reframed leaderboard). |
| **Agent Space** | `/insights/agents`, detail at `/:agentId` | Catalog of deployed agents, industry-scoped. |

### Foundation — what everything runs on (URL prefix is still `/build`)

| Screen | URL | What you do there |
|---|---|---|
| **Operating Picture** | `/build/picture` | The sense layer: intents ← mandates/stream-KPIs ← senses/drivers. |
| **Mandate Library** | `/build/kpis` | Browse/edit the mandates per industry. |
| **Data Connectors** | `/build/connectors` | Source systems feeding the senses. |

## Off-nav screens — reached by flow, not by browsing

The agent-building screens are routable but deliberately absent from the nav.
The only intended path in is a finding's **Act** disposition:

```
Finding detail ──(choose Act)──► Solution Design ──(generate spec)──► Unified Agent Studio
/operate/findings/:id            /build/solutions/:solutionId          /build/agent-studio/:agentSpecId
```

| Screen | URL | Reached from |
|---|---|---|
| Solution Design | `/build/solutions/:solutionId` | Act disposition on a finding (`DispositionBar` navigates there; the detail page links "Open the solution design →"). |
| Unified Agent Studio | `/build/agent-studio/:agentSpecId` | Solution Design, after the spec is created. |
| Create an Agent | `/build/create` | Direct URL only (legacy `/create` redirects here). |
| Agent Studio | `/build/studio`, `/build/studio/:workflowId` | Direct URL only. |
| Signal detail | `/insights/signals/:signalId` | Old v3 signal links only (signals evolved into findings). |

## Legacy URL redirect map

Old bookmarks keep working; keep this convention when moving routes.

| Old URL | Redirects to |
|---|---|
| `/operate` | `/command` |
| `/operate/shadow` | `/operate/counterparts` |
| `/insights/findings`, `/insights/findings/:id` | `/operate/findings`, `/operate/findings/:id` |
| `/insights/closure` | `/operate/closure` |
| `/insights/signals` | `/operate/findings` |
| `/build`, `/build/brain` | `/build/picture` |
| `/insights`, `/insights/outcomes` | `/insights/outcomes/latest` |
| `/runs`, `/decisions`, `/create`, `/people` | `/operate/runs`, `/operate/decisions`, `/build/create`, `/insights/people` |
| `/outcomes`, `/outcomes/:runId` | `/insights/outcomes/latest`, `/insights/outcomes/:runId` |

## A demo walkthrough (the guide's 9 steps, as a route)

1. **Command Center** (`/command`) — start your day; pick a persona.
2. **Findings** (`/operate/findings`) — open a finding and read the case.
3. **Disposition** (finding detail) — make the four-A call.
4. **Closure** (`/operate/closure`) — watch the loop stay open until the number is back.
5. **Decision Ledger** (`/operate/decisions`) — the memory of judgment; assessor verdicts.
6. **Act path** — from a finding, into Solution Design → Agent Studio.
7. **Counterparts** (`/operate/counterparts`) — meet who holds the other half of each mandate.
8. **Foundation** (`/build/picture` → `/build/kpis` → `/build/connectors`) — the sense layer.
9. **Insights** (`/insights/outcomes` → `/insights/people` → `/insights/agents`) — measure what's working.

## Context mechanics worth knowing while navigating

- **Industry** — chosen on `/`, persisted in localStorage, appended as
  `?industry=` by the axios interceptor (`src/api/client.ts`). FMCG (AED) and
  Healthcare (USD) are live; Manufacturing is seeded but hidden from pickers.
- **Data** — everything is served by the mock Express API in `mock-server/`
  (`npm run dev:all` runs frontend :5173 + API :4000). Mutations are in-memory;
  restart resets state.
- **Naming** — user-facing copy says **counterpart**; internals still say
  "shadow" (`ShadowAgent`, `src/screens/ShadowOrg/`). Never surface "shadow" in UI.
