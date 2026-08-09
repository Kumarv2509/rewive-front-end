---
name: rewive-brief
description: The founding product idea for Rewive, the decision accountability layer, and the guardrails that keep work from drifting off it. Load this BEFORE designing, building, naming, or writing copy for any Rewive feature, screen, API, agent behaviour, or customer-facing material — and whenever a request involves mandates, signals, counterparts/agents, findings, decisions, SLAs, escalation, recovery targets, or the Decision Ledger. Also use when judging whether a proposed feature belongs in the product at all, or when a request sounds like a dashboard, alert, task manager, chat-over-data, or "mark as done" feature.
---

# Rewive — the idea, and how not to drift from it

Full statement: `docs/BRIEF-001-project-brief.md`. This skill is the working
guardrail. When the two disagree, the brief wins.

## The anchor

> **The system of record for operational decisions. Nothing drifts unanswered.**

Dashboards show you the number. Rewive **holds every number twice** — a person
and an AI counterpart on the same mandate — so the moment it drifts, a decision
is demanded, watched to closure, and remembered.

The person decides. The counterpart never looks away. Silence escalates up the
real org chart on an SLA.

**The problem being solved:** action items from the monthly business review
drift, because attention is the only thing holding them in place. People own
some and disown a lot. The fix is structural, not disciplinary.

**The loop:** Sense → Find → Decide → Act → Close.

**The five primitives:** mandate · signal · counterpart (agent) · finding ·
Decision Ledger. Everything in the product is one of these five things. If a
proposed object is none of them, that is a design smell worth raising.

## The ten non-negotiables

Check every design against these. Breaking one is off-idea no matter how good
the feature looks.

1. Every mandate has exactly **one accountable human owner** — never zero,
   never an agent, never a committee.
2. Every finding **demands a decision**. There is no state that stops the clock
   without a recorded choice.
3. **Silence escalates**, up the real org chart, on an SLA.
4. **Nothing is "done" until the number is back.** Closure is a measured
   recovery target, not a status someone sets.
5. Every decision **lands in the ledger** and gets an assessor verdict later.
6. A mandate with no live signal is shown **blind** — never inferred, never
   faked.
7. **Accountability transfers, never bypasses.** To answer for a mandate you
   must first own it, and that transfer is a recorded event.
8. **Dismissal requires a reason**, and the reason tunes the agent.
9. **Each seat sees only what it holds.** No generic "admin sees everything".
10. **The loop runs whether or not anyone is watching.**

## Drift patterns — what to do when asked

These are the requests that quietly turn Rewive into a different product.
Don't refuse them; reframe them, build the on-idea version, and say what you
changed.

| Request | Why it drifts | Do this instead |
|---|---|---|
| "Add a chart / dashboard / report view" | Competing on visualisation is the dashboard market Rewive exists to escape | Ask what decision the view forces. If none, it is decoration — say so |
| "Send alerts / notifications" | An alert can be ignored without consequence; a finding cannot | Route it as a finding with an owner and a clock, or don't build it |
| "Let admins close any finding" | Breaks #7 | Admin reassigns ownership to themselves first — a ledger event — then decides |
| "Auto-decide low-impact findings" | Breaks #2 | Agents raise, price, trace, watch and close on a **met recovery target**. They never make the call |
| "Add a task board" | Tasks without findings become a project tool | Tasks exist only downstream of an **Act** decision |
| "Mark as done" | Breaks #4 | Closure is a recovery target being met, verified by the counterpart |
| "Snooze this" | Loses the trip-wire | That is **Park** — requires a re-alert rule, and it comes back louder |
| "Estimate the number when the feed is missing" | Breaks #6 — trust is the product | Show the mandate **blind** until its signal lands |
| "Add chat over our data" | Findings arise from mandates and signals, not from someone thinking to ask | Make it a mandate a counterpart watches continuously |
| "Escalate straight to the CEO" | Skips the real chain | Escalate up the actual org chart; executive queues stay empty unless the org went silent |
| "Show everyone the full picture" | Breaks #9 | Each seat sees its own slice; matrix lines fork, they don't flatten |

## Language

**Keep verbatim:**
- "Every mandate, held twice." — landing page and guide finale **only**;
  in-app copy says "every number has two owners — a person and an agent"
- "The company's memory of judgment."
- "Nothing is 'done' until the number is back."
- "Nothing drifts unanswered." — statement form; never "makes someone answer
  for it" (reads as blame)

**Use these words in UI copy** (internal identifiers deliberately lag them —
do not rename `useDisposeFinding`, `FindingDisposition`, `ExitConditionCard`,
`TripWireRow` and friends):

| Internal / API | UI copy says |
|---|---|
| disposition | **Decide** / "needs a decision" / "decided" |
| acknowledge | **Park** — "known issue; re-alerts if it gets worse" |
| abandon | **Dismiss** — "not real; your reason tunes the agent" |
| exit condition / `ClosureKpi` | **recovery target** |
| trip-wire / `reAlertCondition` | **re-alert rule** |
| sense (data-feed sense) | **signal** |
| Mandate Library | **Mandates** |

Findings, Decision Ledger, Operating Picture, mandate, worker, agent,
Open/Watching/Closed stay as-is.

**Never write:**
- **"Shadow organization"** — fine as an internal mental model in conversation,
  never in product copy, the site, or customer material. It reads as something
  operating behind the company's back, inverting the trust being sold.
- **"Agentic operating model"** — story-page essay framing only.
- **Any humans-versus-agents ranking** — not "humans as a rider aid", not
  "agents do the real work". It is a division of labour between continuous
  attention and accountable judgment. The canonical line: *"This is not
  automation replacing judgment — it's judgment made unavoidable. The
  counterpart brings the finding; the human owns the call; the ledger remembers
  whether it worked."*
- Blame framing of any kind.

## Before shipping anything

- [ ] Which of the five primitives is this? If none, justify it.
- [ ] Does it force, support, record, or verify a **decision**? If it does none
      of those four, why is it in the product?
- [ ] Does it break any of the ten non-negotiables?
- [ ] Does the copy use the plain-language vocabulary above?
- [ ] Does anything imply a number is fine when no live signal stands behind it?
- [ ] Would a CFO find the resulting ledger entry auditable?

## When a request genuinely conflicts

Say so in one or two sentences, name the non-negotiable it breaks, offer the
nearest on-idea version — then build what the user decides. If the user
reaffirms the original request, that is their call: build it, and note the
brief entry that should be amended so the documents stop disagreeing with the
product.
