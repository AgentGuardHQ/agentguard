# Workspace Config Validation — 2026-03-28T06:33:44Z

**Identity:** claude-code:opus:ops (workspace-config-validator)  
**Schedule agents:** 131 enabled, 4 disabled  
**Registry agents:** 89  
**Overall:** FAIL

## Schedule Structure

- **JSON validity:** PASS
- **`max_workers`:** 32 ✓
- **`default_timeout_seconds`:** 900 ✓
- **Agent entries:** 135 total (131 enabled, 4 disabled)
- **Cron expression validity:** All 131 enabled agents have valid 5-field cron expressions ✓

## Schedule ↔ SKILL.md
| Agent | Enabled | SKILL.md | Status |
|-------|---------|----------|--------|
| agentguard-autonomous-sdlc--code-review-agent | yes | OK | PASS |
| agentguard-autonomous-sdlc--coder-agent | yes | OK | PASS |
| agentguard-autonomous-sdlc--documentation-maintainer-agent | yes | OK | PASS |
| agentguard-autonomous-sdlc--governance-monitor-agent | yes | OK | PASS |
| analytics-em | yes | OK | PASS |
| analytics-invariant-researcher | yes | OK | PASS |
| analytics-pipeline | yes | OK | PASS |
| analytics-pr-review-agent | yes | OK | PASS |
| analytics-reporter | yes | OK | PASS |
| architect-agent | yes | OK | PASS |
| architect-agent-cloud | yes | OK | PASS |
| audit-merged-prs | yes | OK | PASS |
| audit-merged-prs-cloud | yes | OK | PASS |
| backlog-hygiene--roadmap-triage-agent | yes | OK | PASS |
| backlog-steward-agent | yes | OK | PASS |
| backlog-steward-cloud | yes | OK | PASS |
| ci-triage-agent-cloud | yes | OK | PASS |
| cicd-hardening-agent | yes | OK | PASS |
| cicd-hardening-agent-cloud | yes | OK | PASS |
| cloud-em | yes | OK | PASS |
| cloud-qa | yes | OK | PASS |
| cloud-qa-backlog-steward | yes | OK | PASS |
| cloud-qa-coder-agent | yes | OK | PASS |
| cloud-qa-regression-analyzer | yes | OK | PASS |
| cloud-qa-smoke-runner | yes | OK | PASS |
| cloud-qa-test-architect | yes | OK | PASS |
| cloud-sr | yes | OK | PASS |
| code-review-agent-cloud | yes | OK | PASS |
| coder-agent-cloud | yes | OK | PASS |
| copilot-docs-sync | yes | OK | PASS |
| copilot-pr-fixer | yes | OK | PASS |
| copilot-test-writer | yes | OK | PASS |
| copilot-test-writer-oss | yes | OK | PASS |
| design-auditor | yes | OK | PASS |
| design-em | yes | OK | PASS |
| director | yes | OK | PASS |
| docs-sync-agent-cloud | yes | OK | PASS |
| documentation-maintainer-agent | yes | OK | PASS |
| governance-monitor-agent | yes | OK | PASS |
| governance-monitor-cloud | yes | OK | PASS |
| hq-em | yes | OK | PASS |
| infrastructure-health-agent | yes | OK | PASS |
| infrastructure-health-agent-cloud | yes | OK | PASS |
| jared-conductor | yes | MISSING | FAIL |
| kernel-em | yes | OK | PASS |
| kernel-qa | yes | OK | PASS |
| kernel-sr | yes | OK | PASS |
| marketing-content-agent | yes | OK | PASS |
| marketing-content-agent-cloud | yes | OK | PASS |
| marketing-em | yes | OK | PASS |
| marketing-launch-agent | yes | OK | PASS |
| merge-conflict-resolver-cloud | yes | OK | PASS |
| observability-agent | yes | OK | PASS |
| observability-agent-cloud | yes | OK | PASS |
| office-sim-em | yes | OK | PASS |
| office-sim-qa | yes | OK | PASS |
| office-sim-sr | yes | OK | PASS |
| onboarding-monitor-agent | yes | OK | PASS |
| planning-agent | yes | OK | PASS |
| planning-agent-cloud | yes | OK | PASS |
| pr-merger-agent | yes | OK | PASS |
| pr-merger-agent-cloud | yes | OK | PASS |
| pr-review-responder-cloud | yes | OK | PASS |
| product-agent | yes | OK | PASS |
| product-agent-cloud | yes | OK | PASS |
| progress-controller-agent | yes | OK | PASS |
| progress-controller-cloud | yes | OK | PASS |
| qa-backlog-steward | yes | OK | PASS |
| qa-coder-agent | yes | OK | PASS |
| qa-conductor | yes | MISSING | FAIL |
| qa-em | yes | OK | PASS |
| qa-escalation-agent | yes | OK | PASS |
| qa-flaky-test-detector | yes | OK | PASS |
| qa-issue-analyst | yes | MISSING | FAIL |
| qa-issue-generator | yes | OK | PASS |
| qa-issue-scorer | yes | MISSING | FAIL |
| qa-observability-agent | yes | OK | PASS |
| qa-performance-agent | yes | MISSING | FAIL |
| qa-pr-code-reviewer | yes | MISSING | FAIL |
| qa-pr-review-agent | yes | OK | PASS |
| qa-pr-review-responder | yes | OK | PASS |
| qa-regression-analyzer | yes | OK | PASS |
| qa-slack-reporter | yes | OK | PASS |
| qa-smoke-runner | yes | OK | PASS |
| qa-test-architect | yes | OK | PASS |
| readybench-director | yes | MISSING | FAIL |
| recovery-controller-agent | yes | OK | PASS |
| recovery-controller-cloud | yes | OK | PASS |
| repo-hygiene-agent | yes | OK | PASS |
| repo-hygiene-agent-cloud | yes | OK | PASS |
| resolve-merge-conflicts | yes | OK | PASS |
| respond-to-pr-reviews | yes | OK | PASS |
| retrospective-agent | yes | OK | PASS |
| retrospective-agent-cloud | yes | OK | PASS |
| risk-escalation-agent | yes | OK | PASS |
| risk-escalation-agent-cloud | yes | OK | PASS |
| rollout-canary-validator | yes | OK | PASS |
| security-audit-agent | yes | OK | PASS |
| security-audit-agent-cloud | yes | OK | PASS |
| shellforge-docs | yes | OK | PASS |
| shellforge-em | yes | OK | PASS |
| shellforge-ollama-integration | yes | OK | PASS |
| shellforge-qa | yes | OK | PASS |
| shellforge-research-scout | yes | OK | PASS |
| shellforge-reviewer | yes | OK | PASS |
| shellforge-sr | yes | OK | PASS |
| site-builder | yes | OK | PASS |
| site-docs-sync | yes | OK | PASS |
| site-em | yes | OK | PASS |
| stale-branch-janitor | yes | OK | PASS |
| stale-branch-janitor-cloud | yes | OK | PASS |
| studio-designer | yes | OK | PASS |
| studio-em | yes | OK | PASS |
| studio-jr | yes | OK | PASS |
| studio-product | yes | OK | PASS |
| studio-qa | yes | OK | PASS |
| studio-sr | yes | OK | PASS |
| swarm-health-agent | yes | OK | PASS |
| test-agent | yes | OK | PASS |
| test-agent-cloud | yes | OK | PASS |
| test-generation-agent | yes | OK | PASS |
| test-generation-agent-cloud | yes | OK | PASS |
| tier-a-architect-review | yes | OK | PASS |
| tier-b-senior-review | yes | OK | PASS |
| tier-c-copilot-implementer | yes | OK | PASS |
| tier-c-copilot-implementer-oss | yes | OK | PASS |
| triage-failing-ci-agent | yes | OK | PASS |
| workspace-agent-reliability | yes | OK | PASS |
| workspace-backlog-steward | yes | OK | PASS |
| workspace-config-validator | yes | OK | PASS |
| workspace-pr-review-agent | yes | OK | PASS |
| policy-effectiveness-agent | no | OK | — |
| qa-fix-proposer | no | MISSING | — |
| qa-issue-fixer-agent | no | OK | — |
| security-code-scan-agent | no | OK | — |

## Schedule ↔ Registry
| Agent | In Schedule | In Registry | Repo Match | Status |
|-------|-------------|-------------|------------|--------|
| agentguard-autonomous-sdlc--code-review-agent | yes | yes | yes | PASS |
| agentguard-autonomous-sdlc--coder-agent | yes | yes | yes | PASS |
| agentguard-autonomous-sdlc--documentation-maintainer-agent | yes | yes | yes | PASS |
| agentguard-autonomous-sdlc--governance-monitor-agent | yes | yes | yes | PASS |
| analytics-em | yes | no | n-a | WARN |
| analytics-invariant-researcher | yes | no | n-a | WARN |
| analytics-pipeline | yes | no | n-a | WARN |
| analytics-pr-review-agent | yes | no | n-a | WARN |
| analytics-reporter | yes | no | n-a | WARN |
| architect-agent | yes | yes | yes | PASS |
| architect-agent-cloud | yes | yes | yes | PASS |
| audit-merged-prs | yes | yes | yes | PASS |
| audit-merged-prs-cloud | yes | yes | yes | PASS |
| backlog-hygiene--roadmap-triage-agent | yes | yes | yes | PASS |
| backlog-steward-agent | yes | yes | yes | PASS |
| backlog-steward-cloud | yes | yes | yes | PASS |
| ci-triage-agent-cloud | yes | yes | yes | PASS |
| cicd-hardening-agent | yes | yes | yes | PASS |
| cicd-hardening-agent-cloud | yes | yes | yes | PASS |
| cloud-em | yes | no | n-a | WARN |
| cloud-qa | yes | no | n-a | WARN |
| cloud-qa-backlog-steward | yes | yes | yes | PASS |
| cloud-qa-coder-agent | yes | yes | yes | PASS |
| cloud-qa-regression-analyzer | yes | yes | yes | PASS |
| cloud-qa-smoke-runner | yes | yes | yes | PASS |
| cloud-qa-test-architect | yes | yes | yes | PASS |
| cloud-sr | yes | no | n-a | WARN |
| code-review-agent-cloud | yes | yes | yes | PASS |
| coder-agent-cloud | yes | yes | yes | PASS |
| copilot-docs-sync | yes | yes | yes | PASS |
| copilot-pr-fixer | yes | yes | yes | PASS |
| copilot-test-writer | yes | yes | yes | PASS |
| copilot-test-writer-oss | yes | yes | yes | PASS |
| design-auditor | yes | no | n-a | WARN |
| design-em | yes | no | n-a | WARN |
| director | yes | no | n-a | WARN |
| docs-sync-agent-cloud | yes | yes | yes | PASS |
| documentation-maintainer-agent | yes | yes | yes | PASS |
| governance-monitor-agent | yes | yes | yes | PASS |
| governance-monitor-cloud | yes | yes | yes | PASS |
| hq-em | yes | no | n-a | WARN |
| infrastructure-health-agent | yes | yes | yes | PASS |
| infrastructure-health-agent-cloud | yes | yes | yes | PASS |
| jared-conductor | yes | no | n-a | WARN |
| kernel-em | yes | no | n-a | WARN |
| kernel-qa | yes | no | n-a | WARN |
| kernel-sr | yes | no | n-a | WARN |
| marketing-content-agent | yes | yes | yes | PASS |
| marketing-content-agent-cloud | yes | yes | yes | PASS |
| marketing-em | yes | no | n-a | WARN |
| marketing-launch-agent | yes | no | n-a | WARN |
| merge-conflict-resolver-cloud | yes | yes | yes | PASS |
| observability-agent | yes | yes | yes | PASS |
| observability-agent-cloud | yes | yes | yes | PASS |
| office-sim-em | yes | no | n-a | WARN |
| office-sim-qa | yes | no | n-a | WARN |
| office-sim-sr | yes | no | n-a | WARN |
| onboarding-monitor-agent | yes | no | n-a | WARN |
| planning-agent | yes | yes | yes | PASS |
| planning-agent-cloud | yes | yes | yes | PASS |
| pr-merger-agent | yes | yes | yes | PASS |
| pr-merger-agent-cloud | yes | yes | yes | PASS |
| pr-review-responder-cloud | yes | yes | yes | PASS |
| product-agent | yes | yes | yes | PASS |
| product-agent-cloud | yes | yes | yes | PASS |
| progress-controller-agent | yes | yes | yes | PASS |
| progress-controller-cloud | yes | yes | yes | PASS |
| qa-backlog-steward | yes | yes | yes | PASS |
| qa-coder-agent | yes | yes | yes | PASS |
| qa-conductor | yes | no | n-a | WARN |
| qa-em | yes | no | n-a | WARN |
| qa-escalation-agent | yes | yes | yes | PASS |
| qa-flaky-test-detector | yes | yes | yes | PASS |
| qa-issue-analyst | yes | no | n-a | WARN |
| qa-issue-generator | yes | yes | yes | PASS |
| qa-issue-scorer | yes | yes | yes | PASS |
| qa-observability-agent | yes | yes | yes | PASS |
| qa-performance-agent | yes | no | n-a | WARN |
| qa-pr-code-reviewer | yes | no | n-a | WARN |
| qa-pr-review-agent | yes | yes | yes | PASS |
| qa-pr-review-responder | yes | yes | yes | PASS |
| qa-regression-analyzer | yes | yes | yes | PASS |
| qa-slack-reporter | yes | yes | yes | PASS |
| qa-smoke-runner | yes | yes | yes | PASS |
| qa-test-architect | yes | yes | yes | PASS |
| readybench-director | yes | no | n-a | WARN |
| recovery-controller-agent | yes | yes | yes | PASS |
| recovery-controller-cloud | yes | yes | yes | PASS |
| repo-hygiene-agent | yes | yes | yes | PASS |
| repo-hygiene-agent-cloud | yes | yes | yes | PASS |
| resolve-merge-conflicts | yes | yes | yes | PASS |
| respond-to-pr-reviews | yes | yes | yes | PASS |
| retrospective-agent | yes | yes | yes | PASS |
| retrospective-agent-cloud | yes | yes | yes | PASS |
| risk-escalation-agent | yes | yes | yes | PASS |
| risk-escalation-agent-cloud | yes | yes | yes | PASS |
| rollout-canary-validator | yes | yes | yes | PASS |
| security-audit-agent | yes | yes | yes | PASS |
| security-audit-agent-cloud | yes | yes | yes | PASS |
| shellforge-docs | yes | no | n-a | WARN |
| shellforge-em | yes | no | n-a | WARN |
| shellforge-ollama-integration | yes | no | n-a | WARN |
| shellforge-qa | yes | no | n-a | WARN |
| shellforge-research-scout | yes | no | n-a | WARN |
| shellforge-reviewer | yes | no | n-a | WARN |
| shellforge-sr | yes | no | n-a | WARN |
| site-builder | yes | no | n-a | WARN |
| site-docs-sync | yes | no | n-a | WARN |
| site-em | yes | no | n-a | WARN |
| stale-branch-janitor | yes | yes | yes | PASS |
| stale-branch-janitor-cloud | yes | yes | yes | PASS |
| studio-designer | yes | no | n-a | WARN |
| studio-em | yes | no | n-a | WARN |
| studio-jr | yes | no | n-a | WARN |
| studio-product | yes | no | n-a | WARN |
| studio-qa | yes | no | n-a | WARN |
| studio-sr | yes | no | n-a | WARN |
| swarm-health-agent | yes | no | n-a | WARN |
| test-agent | yes | yes | yes | PASS |
| test-agent-cloud | yes | yes | yes | PASS |
| test-generation-agent | yes | yes | yes | PASS |
| test-generation-agent-cloud | yes | yes | yes | PASS |
| tier-a-architect-review | yes | yes | yes | PASS |
| tier-b-senior-review | yes | yes | yes | PASS |
| tier-c-copilot-implementer | yes | yes | yes | PASS |
| tier-c-copilot-implementer-oss | yes | yes | yes | PASS |
| triage-failing-ci-agent | yes | yes | yes | PASS |
| workspace-agent-reliability | yes | yes | yes | PASS |
| workspace-backlog-steward | yes | no | n-a | WARN |
| workspace-config-validator | yes | yes | yes | PASS |
| workspace-pr-review-agent | yes | yes | yes | PASS |
| policy-effectiveness-agent | no | yes | — | — |
| qa-fix-proposer | no | yes | — | — |
| qa-issue-fixer-agent | no | yes | — | — |
| security-code-scan-agent | no | yes | — | — |

## Repo Directories
| Repo | Exists | Git Valid | Status |
|------|--------|-----------|--------|
| . | yes | yes | PASS |
| agent-guard | yes | yes | PASS |
| agentguard-analytics | yes | yes | PASS |
| agentguard-cloud | yes | yes | PASS |
| bench-devs-platform | no | no | FAIL |

## Schedule Collisions
None detected.

## Infrastructure Scripts
| Script | Exists | Executable | Status |
|--------|--------|------------|--------|
| run-agent.sh | yes | yes | PASS |
| worker.sh | yes | yes | PASS |
| enqueue.sh | yes | yes | PASS |

## Issues Found
1. **[FAIL] SKILL.md MISSING — `jared-conductor`**: No SKILL.md at `~/.claude/scheduled-tasks/jared-conductor/SKILL.md`. Agent cannot run without its skill definition.
2. **[FAIL] SKILL.md MISSING — `qa-conductor`**: No SKILL.md at `~/.claude/scheduled-tasks/qa-conductor/SKILL.md`. Agent cannot run without its skill definition.
3. **[FAIL] SKILL.md MISSING — `qa-issue-analyst`**: No SKILL.md at `~/.claude/scheduled-tasks/qa-issue-analyst/SKILL.md`. Agent cannot run without its skill definition.
4. **[FAIL] SKILL.md MISSING — `qa-issue-scorer`**: No SKILL.md at `~/.claude/scheduled-tasks/qa-issue-scorer/SKILL.md`. Agent cannot run without its skill definition.
5. **[FAIL] SKILL.md MISSING — `qa-performance-agent`**: No SKILL.md at `~/.claude/scheduled-tasks/qa-performance-agent/SKILL.md`. Agent cannot run without its skill definition.
6. **[FAIL] SKILL.md MISSING — `qa-pr-code-reviewer`**: No SKILL.md at `~/.claude/scheduled-tasks/qa-pr-code-reviewer/SKILL.md`. Agent cannot run without its skill definition.
7. **[FAIL] SKILL.md MISSING — `readybench-director`**: No SKILL.md at `~/.claude/scheduled-tasks/readybench-director/SKILL.md`. Agent cannot run without its skill definition.
8. **[FAIL] Repo directory missing — `bench-devs-platform`**: No git repository found at `/home/jared/agentguard-workspace/bench-devs-platform`. All agents targeting this repo will fail to start.
9. **[WARN] 46 enabled agents not in agent-registry.json**: These agents lack registered identity/telemetry metadata. They can still run, but won't be tracked in cloud telemetry. Agents: `analytics-em`, `analytics-invariant-researcher`, `analytics-pipeline`, `analytics-pr-review-agent`, `analytics-reporter`, `cloud-em`, `cloud-qa`, `cloud-sr`, `design-auditor`, `design-em`, `director`, `hq-em`, `jared-conductor`, `kernel-em`, `kernel-qa`, `kernel-sr`, `marketing-em`, `marketing-launch-agent`, `office-sim-em`, `office-sim-qa`, `office-sim-sr`, `onboarding-monitor-agent`, `qa-conductor`, `qa-em`, `qa-issue-analyst`, `qa-performance-agent`, `qa-pr-code-reviewer`, `readybench-director`, `shellforge-docs`, `shellforge-em`, `shellforge-ollama-integration`, `shellforge-qa`, `shellforge-research-scout`, `shellforge-reviewer`, `shellforge-sr`, `site-builder`, `site-docs-sync`, `site-em`, `studio-designer`, `studio-em`, `studio-jr`, `studio-product`, `studio-qa`, `studio-sr`, `swarm-health-agent`, `workspace-backlog-steward`
