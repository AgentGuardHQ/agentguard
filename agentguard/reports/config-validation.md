# Workspace Config Validation — 2026-03-29

**Schedule agents:** 135 enabled, 4 disabled
**Registry agents:** 89
**Overall:** PASS (with warnings)

---

## Schedule Structure

| Check | Result |
|-------|--------|
| Valid JSON | PASS |
| `max_workers` (32) | PASS |
| `default_timeout_seconds` (900) | PASS |
| `agents` object present (139 entries) | PASS |
| All agents have `cron`, `repo`, `enabled` | PASS |
| All cron expressions have 5 fields | PASS (135/135) |

---

## Schedule ↔ SKILL.md

All 135 enabled agents have a valid SKILL.md. No missing or empty files detected.

| Status | Count |
|--------|-------|
| OK (>10 bytes) | 135 |
| MISSING | 0 |
| EMPTY | 0 |

**Extra skill dirs not in schedule.json (informational):**

| Directory | Status |
|-----------|--------|
| `session-pattern-miner` | INFO — not scheduled |
| `swarm-conductor` | INFO — not scheduled |

These may be deprecated or future agents. No action required.

---

## Schedule ↔ Registry

85 of 135 enabled agents have registry entries with matching repos. 50 have no registry entry (WARN).

| Category | Count |
|----------|-------|
| In registry, repo match | 85 |
| Not in registry | 50 |
| Repo mismatches | 0 |

**Agents in registry but not in enabled schedule (informational):**

| Agent | Note |
|-------|------|
| `policy-effectiveness-agent` | disabled in schedule |
| `qa-fix-proposer` | disabled in schedule |
| `qa-issue-fixer-agent` | disabled in schedule |
| `security-code-scan-agent` | disabled in schedule |

**Unregistered enabled agents (50) — grouped by squad:**

*director squad:* `director`, `readybench-director`
*ops squad:* `jared-conductor`
*kernel squad:* `kernel-em`, `kernel-sr`, `kernel-qa`, `swarm-health-agent`, `site-builder`, `site-docs-sync`, `site-em`, `marketing-em`, `marketing-launch-agent`
*cloud squad:* `cloud-em`, `cloud-sr`, `cloud-qa`, `design-em`, `design-auditor`, `office-sim-em`, `office-sim-sr`, `office-sim-qa`, `onboarding-monitor-agent`
*hq squad:* `hq-em`, `ecosystem-scout`, `workspace-backlog-steward`
*analytics squad:* `analytics-em`, `analytics-pipeline`, `analytics-reporter`, `analytics-invariant-researcher`, `analytics-pr-review-agent`
*studio squad:* `studio-em`, `studio-sr`, `studio-jr`, `studio-qa`, `studio-product`, `studio-designer`
*shellforge squad:* `shellforge-em`, `shellforge-sr`, `shellforge-qa`, `shellforge-reviewer`, `shellforge-docs`, `shellforge-ollama-integration`, `shellforge-research-scout`
*octi-pulpo squad:* `octi-pulpo-em`, `octi-pulpo-sr`, `octi-pulpo-qa`
*qa squad (readybench):* `qa-em`, `qa-conductor`, `qa-issue-analyst`, `qa-performance-agent`, `qa-pr-code-reviewer`

---

## Repo Directories

Checked from jared box (`/home/jared/agentguard-workspace/`).

| Repo | Exists | Git Valid | Used By Boxes | Status |
|------|--------|-----------|---------------|--------|
| `agent-guard` | yes | yes | jared | PASS |
| `agentguard-cloud` | yes | yes | jared | PASS |
| `agentguard-analytics` | yes | yes | jared | PASS |
| `octi-pulpo` | yes | yes | jared | PASS |
| `.` (workspace root) | yes | yes | jared | PASS |
| `bench-devs-platform` | no | n/a | readybench only | WARN (expected — remote box) |

`bench-devs-platform` is only referenced by agents with `box: readybench`. It does not need to exist on the jared box. The readybench machine is responsible for this repo.

---

## Schedule Collisions

None detected. No two enabled agents share identical cron + repo + box combinations.

---

## Infrastructure Scripts

| Script | Exists | Executable | Status |
|--------|--------|------------|--------|
| `run-agent.sh` | yes | yes | PASS |
| `worker.sh` | yes | yes | PASS |
| `enqueue.sh` | yes | yes | PASS |

---

## Issues Found

1. **WARN**: 50 enabled agents have no registry entry in `claude/agent-registry.json`. These agents cannot use identity-based features (persona injection, `$AGENTGUARD_AGENT_NAME`, etc.). Breakdown: 45 on jared box, 5 on readybench box. Unregistered jared-box agents: `director`, `jared-conductor`, `kernel-em`, `kernel-sr`, `kernel-qa`, `hq-em`, `cloud-em`, `cloud-sr`, `cloud-qa`, `analytics-em`, `analytics-pipeline`, `analytics-reporter`, `analytics-invariant-researcher`, `analytics-pr-review-agent`, `studio-em`, `studio-sr`, `studio-jr`, `studio-qa`, `studio-product`, `studio-designer`, `shellforge-em`, `shellforge-sr`, `shellforge-qa`, `shellforge-reviewer`, `shellforge-docs`, `shellforge-ollama-integration`, `shellforge-research-scout`, `octi-pulpo-em`, `octi-pulpo-sr`, `octi-pulpo-qa`, `design-em`, `design-auditor`, `office-sim-em`, `office-sim-sr`, `office-sim-qa`, `onboarding-monitor-agent`, `marketing-em`, `marketing-launch-agent`, `site-em`, `site-builder`, `site-docs-sync`, `swarm-health-agent`, `ecosystem-scout`, `workspace-backlog-steward`, `readybench-director`

2. **WARN**: `bench-devs-platform` repo not present on jared box at `/home/jared/agentguard-workspace/bench-devs-platform`. All agents referencing this repo have `box: readybench` — this is expected behavior; the repo lives on the readybench machine.

3. **INFO**: 2 skill directories in `~/.claude/scheduled-tasks/` have no corresponding `schedule.json` entry: `session-pattern-miner`, `swarm-conductor`. These may be deprecated or pre-scheduled agents. No functional impact.

---

*Agent:* `workspace-config-validator` (claude-code:opus:ops)
*Run:* 2026-03-29T20:00Z
*Worktree:* workspace-config-validator-281154
