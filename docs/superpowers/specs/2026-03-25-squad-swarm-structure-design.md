# Agent Swarm Squad Structure — Design Spec

**Date:** 2026-03-25
**Status:** Approved
**Author:** Jared + Claude

## Problem

The current agent swarm is a flat pool of 26 agents in 5 functional tiers. Agents step on each other, there's no code ownership, no review chain, and no accountability per area. When 8 PRs pile up with 1 conflicted, nobody owns the resolution. The swarm coordination via `swarm-state.json` works for state sharing but has no hierarchy for decision-making or escalation.

The goal: restructure the swarm into squads that operate like an engineering org — clear ownership, built-in review chains, seniority-based model assignment, multi-vendor governance (Claude Code + Copilot CLI), and telemetry that flows from agent identity through the database to the dashboard and office-sim.

## Design

### Squad Structure

3 squads, each with 5 agents + 1 EM. 1 Director. 1 Human.

```
Human (Jared)
  └── Director (Opus, claude-code)
        ├── EM: Kernel Squad (Opus, claude-code)
        │     ├── Product Lead (Sonnet, claude-code)
        │     ├── Architect (Opus, claude-code)
        │     ├── Senior Engineer (Sonnet, copilot-cli)
        │     ├── Junior Engineer (Copilot, copilot-cli)
        │     └── QA Automation (Sonnet, copilot-cli)
        │
        ├── EM: Cloud Squad (Opus, claude-code)
        │     ├── Product Lead (Sonnet, claude-code)
        │     ├── Architect (Opus, claude-code)
        │     ├── Senior Engineer (Sonnet, copilot-cli)
        │     ├── Junior Engineer (Copilot, copilot-cli)
        │     └── QA Automation (Sonnet, copilot-cli)
        │
        └── EM: QA Squad (Sonnet, claude-code)
              ├── Product Lead (Sonnet, claude-code)
              ├── Architect (Sonnet, claude-code)
              ├── Senior Engineer (Sonnet, copilot-cli)
              ├── Junior Engineer (Copilot, copilot-cli)
              └── QA Automation (Haiku, copilot-cli)
```

**Total: 15 squad agents + 3 EMs + 1 Director = 19 agents**

**Ownership:**
- **Kernel Squad** — `agent-guard/` (Go kernel, TS kernel, policy, invariants, matchers, CLI, npm publishing)
- **Cloud Squad** — `agentguard-cloud/` (dashboard, API server, telemetry, office-sim, Vercel deployment)
- **QA Squad** — Cross-repo (stranger tests, Playwright e2e, compliance suite, swarm health, CI/CD)

### Model & Driver Assignment

Copilot CLI is a first-class workhorse — 9 of 15 squad agents use it. Claude Code is reserved for leadership and architecture roles.

| Role | Model | Driver | Rationale |
|------|-------|--------|-----------|
| Director | Opus | claude-code | Cross-squad reasoning needs depth |
| EM | Opus | claude-code | Architectural context for coordination |
| Product Lead | Sonnet | claude-code | Prioritization, roadmap alignment |
| Architect | Opus | claude-code | Design reviews need deepest reasoning |
| Senior Engineer | Sonnet | copilot-cli | Fast implementation, high volume |
| Junior Engineer | Copilot | copilot-cli | Cheapest, highest volume tasks |
| QA Automation | Sonnet/Haiku | copilot-cli | Fast test execution, high frequency |

This stress-tests multi-vendor governance — every Copilot CLI action goes through the same AgentGuard kernel as Claude Code actions via the `copilot-cli` adapter.

### Coordination Protocol

Three layers: squad-internal, cross-squad, human escalation.

**Squad-internal (files — fast, every run):**

Each squad writes to `.agentguard/squads/{squad-name}/state.json`:
```json
{
  "squad": "kernel",
  "sprint": { "goal": "Go kernel Phase 2", "issues": ["#860", "#862"] },
  "assignments": {
    "architect": { "current": "#860", "status": "reviewing" },
    "senior": { "current": "#862", "status": "implementing" },
    "junior": { "current": "#863", "status": "writing-tests" },
    "qa": { "current": null, "waiting": "senior to push" }
  },
  "blockers": [],
  "prQueue": { "open": 2, "reviewed": 1, "mergeable": 1 }
}
```

PL sets priorities. Architect reviews before merge. Senior implements. Junior writes tests + handles chores. QA runs e2e after merge. EM reads state, unblocks, and escalates.

**Cross-squad (EM → Director — aggregated files):**

EMs write to `.agentguard/squads/{squad-name}/em-report.json`. Director reads all EM reports and writes `.agentguard/director-brief.json` — the human's daily summary.

**Human escalation (GitHub issues):**

When Director needs the human: creates an issue labeled `escalation:human`. When an EM is stuck: creates an issue labeled `escalation:em`. Human comments to resolve. Agent polls for response.

### Adopted Patterns (from everything-claude-code)

**1. Continuous Learning Cycle**

Each squad maintains `.agentguard/squads/{squad-name}/learnings.json`. Four operations:

- **Learn** — After every PR merge, QA extracts patterns: what worked, what broke, what was surprising. Stored as `{pattern, confidence, source_pr, timestamp}`.
- **Eval** — Weekly, Architect scores accumulated patterns (0-1 confidence). Low-confidence patterns get more evidence or get dropped.
- **Evolve** — Monthly, PL clusters high-confidence patterns into new squad-specific skills. A pattern in 3+ PRs becomes a skill file.
- **Prune** — Monthly, EM removes stale learnings (>30 days, low confidence, superseded).

**2. Autonomous Loop Guards (5-layer)**

Every agent run checks before proceeding:

1. **Budget guard** — Max 3 PRs open per squad. Exceeded → skip implementation, only review/merge.
2. **Retry guard** — Same action failed 3 times → stop, create escalation issue.
3. **Blast radius guard** — Predicted file changes > 20 → pause, escalate to Architect.
4. **Cascade guard** — 2+ squads both modifying same file → pause both, escalate to Director.
5. **Time guard** — Agent run exceeds 10 minutes → force-stop, log partial progress, EM investigates.

**3. Orchestration Commands**

EM-level commands for squad task management:

- `/squad-plan {goal}` — PL + Architect decompose goal into tasks, assign to Sr/Jr/QA
- `/squad-execute` — EM dispatches all assigned tasks in dependency order
- `/squad-status` — EM aggregates squad state into one-line summary per agent
- `/squad-retro` — QA + Architect review last sprint's merged PRs, extract learnings

**4. Skill Expansion (39 → 125+)**

Current 39 skills are SDLC-focused. Expand with:
- Per-language skills (Go, Python, TypeScript patterns)
- Per-squad skills (kernel: policy testing, invariant validation; cloud: Vercel deployment, DB migrations)
- Business skills (content generation, changelog writing, release notes)
- Learning skills (pattern extraction, confidence scoring, skill evolution)
- Autonomous loop skills (DAG orchestration, sequential pipelines, PR loops)

Skills are composable — agents reference which skills they use. Squads inherit shared skills + add squad-specific ones. Manifest-driven selective install (from everything-claude-code) prevents skill bloat.

### Agent Identity & Manifest

**Identity format:** `{driver}:{model}:{squad}:{rank}`

Examples:
- `claude-code:opus:kernel:architect`
- `copilot-cli:copilot:cloud:junior`
- `claude-code:opus:director:director`

**Manifest structure** — extends existing `packages/swarm/manifest.json`:

```yaml
# .agentguard/squad-manifest.yaml
org:
  director:
    id: director
    driver: claude-code
    model: opus
    cron: "0 7,19 * * *"
    skills: [squad-status, director-brief, escalation-router]

squads:
  kernel:
    repo: agent-guard
    em:
      id: kernel-em
      driver: claude-code
      model: opus
      cron: "0 */3 * * *"
      skills: [squad-plan, squad-execute, squad-status, squad-retro, escalation-router]
    agents:
      product-lead:
        driver: claude-code
        model: sonnet
        cron: "0 6 * * *"
        skills: [sprint-planning, roadmap-expand, backlog-steward, learn]
      architect:
        driver: claude-code
        model: opus
        cron: "0 */4 * * *"
        skills: [architecture-review, review-open-prs, eval, evolve]
      senior:
        driver: copilot-cli
        model: sonnet
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, create-pr, run-tests]
      junior:
        driver: copilot-cli
        model: copilot
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, run-tests, generate-tests]
      qa:
        driver: copilot-cli
        model: sonnet
        cron: "0 */3 * * *"
        skills: [e2e-testing, compliance-test, test-health-review, learn, prune]

  cloud:
    repo: agentguard-cloud
    em:
      id: cloud-em
      driver: claude-code
      model: opus
      cron: "0 */3 * * *"
      skills: [squad-plan, squad-execute, squad-status, squad-retro, escalation-router]
    agents:
      product-lead:
        driver: claude-code
        model: sonnet
        cron: "0 6 * * *"
        skills: [sprint-planning, roadmap-expand, backlog-steward, learn]
      architect:
        driver: claude-code
        model: opus
        cron: "0 */4 * * *"
        skills: [architecture-review, review-open-prs, eval, evolve]
      senior:
        driver: copilot-cli
        model: sonnet
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, create-pr, run-tests]
      junior:
        driver: copilot-cli
        model: copilot
        cron: "0 */2 * * *"
        skills: [claim-issue, implement-issue, run-tests, generate-tests]
      qa:
        driver: copilot-cli
        model: sonnet
        cron: "0 */3 * * *"
        skills: [e2e-testing, compliance-test, test-health-review, learn, prune]

  qa:
    repo: "*"
    em:
      id: qa-em
      driver: claude-code
      model: sonnet
      cron: "0 */3 * * *"
      skills: [squad-plan, squad-execute, squad-status, squad-retro, escalation-router]
    agents:
      product-lead:
        driver: claude-code
        model: sonnet
        cron: "0 6 * * *"
        skills: [sprint-planning, test-strategy, stranger-test-plan, learn]
      architect:
        driver: claude-code
        model: sonnet
        cron: "0 */4 * * *"
        skills: [test-architecture, compliance-review, eval, evolve]
      senior:
        driver: copilot-cli
        model: sonnet
        cron: "0 */2 * * *"
        skills: [playwright-e2e, stranger-test-run, compliance-test, create-pr]
      junior:
        driver: copilot-cli
        model: copilot
        cron: "0 */2 * * *"
        skills: [generate-tests, run-tests, test-data-generation]
      qa:
        driver: copilot-cli
        model: haiku
        cron: "0 */1 * * *"
        skills: [e2e-testing, regression-analysis, flakiness-detection, learn, prune]
```

### Migration from Current 26 Agents

Existing agents don't disappear — they get reassigned into squads:

| Current Agent | Squad | New Role |
|--------------|-------|----------|
| coder-agent | kernel/cloud | Senior Engineer |
| code-review-agent | kernel/cloud | Architect responsibility |
| pr-merger-agent | kernel/cloud | EM responsibility |
| ci-triage-agent | qa | QA Automation |
| merge-conflict-resolver | kernel/cloud | EM responsibility |
| pr-review-responder | kernel/cloud | Architect responsibility |
| stale-branch-janitor | qa | Junior Engineer chore |
| recovery-controller | — | Director responsibility |
| risk-escalation-agent | — | Director responsibility |
| governance-monitor | qa | QA Architect |
| planning-agent | kernel/cloud | Product Lead |
| backlog-steward | kernel/cloud | Product Lead skill |
| observability-agent | qa | QA Product Lead |
| docs-sync-agent | kernel/cloud | Junior Engineer chore |
| product-agent | kernel/cloud | Product Lead |
| progress-controller | — | Director skill |
| repo-hygiene-agent | qa | Junior Engineer chore |
| retrospective-agent | — | EM skill (squad-retro) |
| test-agent | qa | QA Senior Engineer |
| test-generation-agent | qa | QA Junior Engineer |
| security-audit-agent | qa | QA Architect |
| architect-agent | kernel/cloud | Architect |
| cicd-hardening-agent | qa | QA Senior Engineer |
| audit-merged-prs-agent | qa | QA Automation |
| infrastructure-health-agent | qa | QA Automation |
| marketing-content-agent | cloud | Junior Engineer skill |

### Database & Telemetry Integration

Squad identity flows through the entire platform pipeline:

```
squad-manifest.yaml → .agentguard-identity → kernel → telemetry → Postgres → dashboard → office-sim
```

**Identity propagation:**
1. Agent starts with identity `copilot-cli:sonnet:kernel:senior` in `.agentguard-identity`
2. Governance hook reads identity, attaches to every `GovernanceDecisionRecord`
3. Telemetry `AgentEvent` includes full `agentId` with squad/rank
4. Cloud telemetry server stores events in Postgres with agent identity
5. Dashboard queries by squad, rank, model, driver
6. Office-sim visualizes squads as teams with real-time action streams

**Database: parse from agentId at query time (no schema change):**

The identity format `{driver}:{model}:{squad}:{rank}` is parseable:
```sql
SELECT
  split_part(agent_id, ':', 3) AS squad,
  split_part(agent_id, ':', 4) AS rank,
  split_part(agent_id, ':', 1) AS driver,
  count(*) AS decisions
FROM agent_events
WHERE timestamp > now() - interval '7 days'
GROUP BY squad, rank, driver
ORDER BY decisions DESC;
```

No schema migration needed — the existing `agent_id` text field carries the full hierarchy.

**Dashboard views enabled:**
- Squad leaderboard (PRs merged, tests written, denials per squad)
- Agent performance by rank (Opus architects vs Sonnet seniors)
- Model cost analysis (Copilot CLI vs Claude Code event volume)
- Escalation funnel (issues reaching EM → Director → Human)
- Office-sim squad visualization (live agent activity grouped by squad)
- Learning cycle metrics (patterns extracted, skills evolved, confidence trends)

## Non-Goals

- More than 3 squads initially (add Dashboard squad when justified)
- Custom LLM fine-tuning for agent roles (use prompt engineering via skills)
- Real-time inter-agent chat (async file + issue coordination is sufficient)
- Windows Copilot CLI support (Linux only for now)
