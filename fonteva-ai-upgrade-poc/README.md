# Fonteva Payments 3.0 — AI Upgrade Assistant (POC)

An end-to-end, fully functional Proof of Concept that demonstrates how a **multi-agent AI system with Human-in-the-Loop (HITL) governance** can collapse the Fonteva Payments 3.0 upgrade from a **2–3 day** cross-team ticket dance into a **same-day, engineer-supervised** workflow.

Nothing is mocked at the orchestration layer. Agents, workflows, approvals, dashboards, audit trails, and business logic are all **fully operational**. Where production systems aren't available (Salesforce Metadata API, Stripe API), the POC uses realistic **simulators** and enterprise-grade **synthetic data** so the client can see the exact "before and after" mutations, ticket bodies, webhook payloads, and payout records the agents produce.

## What's new in v2

- **Enterprise light theme** — polished shadcn-inspired UI with dark navy sidebar, cards with soft shadows, animated status states, toasts, and a login screen.
- **Real GPT-4o Mini streaming** — agents stream token-by-token reasoning to the browser via SSE. Falls back to a deterministic MockLLM when no key is set.
- **Upgrade Copilot** — grounded chatbot page + floating widget on every upgrade page. Ask "which upgrades hit HITL?" or "summarize this run" and it answers over live data.
- **Interactive launcher** — 4-step wizard: pick org × starting-state × custom overrides (target version, force ticket, inject validation failure, reset simulated state) × review.
- **Streaming reasoning cards** — see each agent's LLM reasoning arrive live with a blinking caret, then persist to the timeline.
- **Agent pipeline card** — live-updating dashboard tile that highlights the active agent across all in-flight upgrades.

---

## What this POC demonstrates

| Requirement | How the POC delivers |
|---|---|
| **End-to-end business process** | Nine-stage state machine from readiness → planning → HITL approval → Salesforce config → Stripe config → validation → reporting → HITL sign-off → completion. |
| **Autonomous, collaborative AI agents** | Seven specialist agents (Orchestrator, Readiness, Salesforce Config, Stripe Integration, Validation, Reporting, Governance) that hand off work, escalate on low confidence, and gate on policy. |
| **HITL approvals & governance** | Governance policy watches confidence thresholds, permission grants, Stripe direct-API use, validation failures, and final sign-off. Every HITL prompt has explainable reasoning, evidence, and a reviewer note field. |
| **Real-time visibility** | SSE stream powers a live agent activity feed, live upgrade timeline, live validation grid, live dashboard KPIs. |
| **Explainability, confidence, transparency** | Every decision carries reasoning bullets, evidence rows (with pass/fail), and a 0–100% confidence score visualised in badges + bars. |
| **Auditability** | Every action is written to a SHA-256-chained audit log. Any tampering with a prior row breaks the chain — validated in the Audit page. |
| **Realistic synthetic data** | 5 orgs (NA/EU/APAC, SMB→Enterprise), 5 scenarios (clean, missing perms, EU ticket-required, validation failure, small org), full Salesforce metadata (page layouts, scheduled jobs, permission sets, custom metadata, connected apps) and full Stripe state (webhooks, rates, payouts). |
| **Simulated integrations** | Salesforce Metadata API and Stripe API implemented as file-backed simulators that mutate state exactly as production would. Includes a **Stripe ticket outbox** for the ticket-required flow. |
| **Business outcomes framing** | KPIs: hours saved, avg. cycle time, auto-action rate, HITL rate, cycle-time trend chart. |
| **Wow-factor UX** | Dark modern UI, animated live indicators, hero dashboard, guided wizard, agent avatars, evidence-rich approval cards, tamper-evident audit chain, per-upgrade timeline + live feed. |

---

## Architecture

```
┌────────────────────── Next.js (App Router) ──────────────────────┐
│                                                                  │
│  UI (React 18 + Tailwind)                                        │
│    · Dashboard  · Upgrade wizard  · Live upgrade detail          │
│    · Approvals  · Agents graph    · Systems  · Audit chain       │
│                          │                                       │
│  SSE Stream ◄── Event Bus (in-process pub/sub)                   │
│                          ▲                                       │
│  API Routes ─────────────┤                                       │
│    /api/upgrades  /api/approvals  /api/stream  /api/audit ...    │
│                          │                                       │
│  Orchestrator ── governance ── specialist agents                 │
│    · Readiness  · Salesforce Config  · Stripe Integration        │
│    · Validation · Reporting          · Governance                │
│                          │                                       │
│  LLM Adapter  ─── MockLLM (default) | OpenAI (optional)          │
│                          │                                       │
│  Simulators                                                      │
│    · Salesforce Metadata API (file-backed, per-org)              │
│    · Stripe API + Ticket outbox (file-backed, per-account)       │
│                          │                                       │
│  Persistence: JSON collections + tamper-evident audit chain      │
└──────────────────────────────────────────────────────────────────┘
```

### The seven agents

| Agent | Role | What it does |
|---|---|---|
| **Orchestrator** | Supervisor | Owns the state machine, routes work, emits handoffs. |
| **Readiness Analyst** | Specialist | Inspects Salesforce org (permissions, jobs, layouts, connected apps) + audits Stripe webhook coverage. |
| **Salesforce Config Agent** | Specialist | Plans and applies page-layout upgrades, scheduled-job activation, custom metadata, and permission grants. |
| **Stripe Integration Agent** | Specialist | Configures webhooks + rates via API. Falls back to a **fully-populated ticket** when tenant policy forbids direct API. |
| **Validation Runner** | Specialist | Executes 10-step end-to-end validation (payment, refund, webhook, payout, scheduled job, logs). |
| **Reporting Agent** | Specialist | Synthesizes decisions, evidence, and outcomes into the completion report. |
| **Governance Guard** | Oversight | Enforces confidence thresholds, escalates policy-sensitive actions, owns rollback authority. |

### The HITL touchpoints

1. **Plan approval** — before applying Salesforce + Stripe configuration
2. **Stripe path override** — force ticket vs. direct API
3. **Validation incident** — hold / rollback / continue-with-warning
4. **Final sign-off** — engineer confirms customer notification

Each approval card shows the agent's **reasoning trace**, **evidence table**, and **confidence score**, and captures a **reviewer note** into the audit trail.

---

## Running the POC

Prereqs: **Node 20+**, **npm 10+**. Works on Windows, macOS, Linux.

```bash
npm install
npm run dev
# Open http://localhost:3000 (or 3005 if you use `npx next dev -p 3005`)
```

**Login:** `admin / demo2026` (demo credentials shown on the login page).

No API keys required for the demo — the MockLLM produces realistic reasoning and confidence scores derived from real evidence. To enable **real GPT-4o Mini streaming**:

```bash
# .env.local
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
# Optional: point at a company proxy
# OPENAI_BASE_URL=https://your-proxy.example.com/v1
```

The top-bar chip flips to green + `gpt-4o-mini` when the key is detected. Every agent reasoning stream, every Copilot answer, and every completion-report narrative then flow from real GPT-4o Mini calls, streamed token-by-token.

### Where the LLM adds value

| Value area | Where you'll see it |
|---|---|
| **Agent reasoning** | Every specialist agent streams its reasoning bullets and an engineer-facing narrative in the *AI reasoning stream* card. |
| **Decision support** | Approval cards show the LLM's reasoning trace + confidence + evidence — the reviewer sees exactly what the AI weighed. |
| **Chatbot / Copilot** | Grounded chat over live data — orgs, upgrades, decisions, HITL history, Stripe tickets, audit chain. Ask "which upgrades stalled at Stripe integration and why?" |
| **Report narrative** | The Reporting Agent uses GPT-4o Mini to craft a customer-ready summary paragraph that leads the engineer notes. |
| **Explainability** | Every stream persists a *reasoning_complete* activity so the reasoning survives refresh + is auditable. |

### Demo script (5 minutes)

1. **Dashboard** — quick tour of KPIs, live feed, cycle-time trend.
2. **Start Upgrade → pick "Clean upgrade — happy path"** — watch the agents in the live feed and timeline. Approve the plan and sign-off when prompted.
3. **Start Upgrade → pick "EU tenant — Stripe direct API disallowed"** — show how the Stripe Integration Agent generates a fully-populated ticket in the **Systems** page.
4. **Start Upgrade → pick "Validation incident — refund path fails"** — show governance halting the flow and offering **Hold / Rollback / Continue-with-warning**.
5. **Audit Trail** — show the hash-chained log with tamper detection.

### Reset the demo

```bash
# Wipe runtime state (keeps seed data)
rm -rf data/runtime/*
```

---

## Repo layout

```
src/
  app/                  Next.js App Router pages + API routes
  components/
    ui/                 Design system (Badge, Card, Confidence, ...)
    shell/              Sidebar, Topbar, LiveIndicator
    feed/               LiveFeed (SSE-backed)
    upgrades/           Wizard, Detail, Timeline, DecisionCard, Report
    approvals/          ApprovalCard, ApprovalsView
    dash/               KpiTrendChart
  lib/
    agents/             Agents (readiness, salesforce_config, stripe_integration,
                         validation, reporting, governance) + orchestrator + registry
    simulators/         Salesforce + Stripe simulators
    llm.ts              MockLLM + OpenAI adapter
    db.ts               JSON collections with per-file write locks
    events.ts           Pub/sub event bus for SSE
    audit.ts            Tamper-evident SHA-256 chain
    seed.ts             Orgs / scenarios / synthetic state
    types.ts            Shared type system
```

---

## What "not mocked" means in this POC

- The state machine really executes across nine stages, each with typed events, latency, and side-effects.
- Salesforce mutations really change `data/runtime/salesforce/*.json` — you can see before/after in the **Systems** page.
- Stripe mutations really change `data/runtime/stripe/*.json` and can create tickets in `data/runtime/stripe-tickets.json`.
- HITL blocks the orchestrator with a real async wait — the engineer's browser click actually unblocks the run.
- Audit entries are actually SHA-256 chained — try editing `data/runtime/audit.json` and reloading the Audit page to see it break.
- Confidence scores are actually derived from evidence counts + policy penalties, not hardcoded.

The **only** thing that's simulated is the underlying Salesforce/Stripe I/O — because the client's production endpoints aren't available. Everything above that line — the AI orchestration, HITL, dashboards, governance, explainability, audit — is fully operational.
