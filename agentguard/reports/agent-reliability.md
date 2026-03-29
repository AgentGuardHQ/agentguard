# Agent Reliability Report — 2026-03-29

**Window:** 7 days (2026-03-22 → 2026-03-29) | **Agents analyzed:** 110 | **Total runs:** 3,467
**Swarm success rate:** 72.9% | **Regressions detected:** 41 | **Identity:** `claude-code:opus:ops`

> **Infrastructure context:** Two systemic events affected the swarm during this window:
> - **2026-03-26 03:00–24:00Z**: Full swarm outage (~100% failure rate, all agents affected)
> - **2026-03-28 12:00Z onwards**: Ongoing degradation (~50-60% failure rate, continuing at report time)
> Agents showing regression patterns are primarily victims of these infrastructure events, not code-level regressions.

## Regressions (was working, now failing)

*Note: Most regressions below are attributable to the 2026-03-28T12Z infrastructure degradation.*

| Agent | Repo | Was (days 4–7) | Now (days 1–3) | Trend |
|-------|------|---------------|----------------|-------|
| `observability-agent` | agent-guard | 100% | 0% | ↓100% |
| `observability-agent-cloud` | agentguard-cloud | 100% | 0% | ↓100% |
| `architect-agent-cloud` | agentguard-cloud | 100% | 25% | ↓75% |
| `tier-a-architect-review` | agentguard-cloud | 100% | 25% | ↓75% |
| `tier-b-senior-review` | agentguard-cloud | 100% | 25% | ↓75% |
| `ci-triage-agent-cloud` | agentguard-cloud | 98% | 32% | ↓66% |
| `coder-agent-cloud` | agentguard-cloud | 95% | 33% | ↓62% |
| `analytics-pipeline` | agentguard-analytics | 100% | 38% | ↓62% |
| `kernel-em` | agent-guard | 100% | 43% | ↓57% |
| `resolve-merge-conflicts` | agent-guard | 98% | 41% | ↓57% |
| `cloud-em` | agent-guard | 100% | 44% | ↓56% |
| `director` | agent-guard | 100% | 44% | ↓56% |
| `merge-conflict-resolver-cloud` | agentguard-cloud | 98% | 42% | ↓56% |
| `triage-failing-ci-agent` | agent-guard | 93% | 39% | ↓54% |
| `kernel-qa` | agent-guard | 100% | 46% | ↓54% |
| `office-sim-em` | agent-guard | 100% | 46% | ↓54% |
| `architect-agent` | agent-guard | 100% | 50% | ↓50% |
| `docs-sync-agent-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `planning-agent` | agent-guard | 100% | 50% | ↓50% |
| `planning-agent-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `pr-review-responder-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `product-agent` | agent-guard | 100% | 50% | ↓50% |
| `progress-controller-agent` | agent-guard | 100% | 50% | ↓50% |
| `recovery-controller-agent` | agent-guard | 100% | 50% | ↓50% |
| `recovery-controller-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `risk-escalation-agent` | agent-guard | 100% | 50% | ↓50% |
| `risk-escalation-agent-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `agentguard-autonomous-sdlc--governance-monitor-agent` | agent-guard | 100% | 50% | ↓50% |
| `governance-monitor-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `test-agent-cloud` | agentguard-cloud | 100% | 50% | ↓50% |
| `office-sim-qa` | agent-guard | 100% | 52% | ↓48% |
| `cloud-qa` | agentguard-cloud | 100% | 54% | ↓46% |
| `analytics-em` | agentguard-analytics | 100% | 61% | ↓39% |
| `cloud-qa-smoke-runner` | agentguard-cloud | 100% | 62% | ↓38% |
| `agentguard-autonomous-sdlc--coder-agent` | agent-guard | 90% | 54% | ↓36% |
| `code-review-agent-cloud` | agentguard-cloud | 100% | 66% | ↓34% |
| `design-em` | agent-guard | 100% | 67% | ↓33% |
| `governance-monitor-agent` | agent-guard | 100% | 67% | ↓33% |
| `infrastructure-health-agent` | agent-guard | 100% | 67% | ↓33% |
| `pr-merger-agent` | agent-guard | 99% | 67% | ↓32% |
| `workspace-pr-review-agent` | agent-guard | 98% | 68% | ↓30% |

## Broken Agents (<50% success)

| Agent | Repo | Success Rate | Runs | Last Success | Note |
|-------|------|-------------|------|--------------|------|
| `design-auditor` | agent-guard | 0% | 2 | Never | no runs |
| `retrospective-agent` | agent-guard | 0% | 1 | Never | no runs |
| `retrospective-agent-cloud` | agentguard-cloud | 0% | 1 | Never | no runs |
| `shellforge-ollama-integration` | shellforge | 0% | 7 | Never | shellforge infra issue |
| `shellforge-reviewer` | shellforge | 17% | 6 | Yesterday | shellforge infra issue |
| `kernel-sr` | agent-guard | 23% | 43 | Today |  |
| `cloud-sr` | agent-guard | 30% | 37 | Today |  |
| `shellforge-sr` | shellforge | 31% | 13 | Today | shellforge infra issue |
| `shellforge-research-scout` | shellforge | 33% | 6 | Today | shellforge infra issue |
| `shellforge-em` | shellforge | 36% | 14 | Today | shellforge infra issue |
| `shellforge-docs` | shellforge | 38% | 8 | Today | shellforge infra issue |
| `office-sim-sr` | agent-guard | 41% | 34 | Today |  |
| `shellforge-qa` | shellforge | 44% | 16 | Today | shellforge infra issue |

## Highly Flaky (>50% flip rate)

| Agent | Repo | Flakiness | Success Rate | Flips/Runs |
|-------|------|-----------|-------------|------------|
| `audit-merged-prs-cloud` | agentguard-cloud | 100% | 50% | 1/1 |
| `cloud-qa-coder-agent` | agentguard-cloud | 100% | 60% | 4/4 |
| `swarm-conductor` | agent-guard | 100% | 50% | 1/1 |
| `analytics-invariant-researcher` | agentguard-analytics | 67% | 71% | 4/6 |

## Timeout Risks (avg duration >80% of timeout)

| Agent | Avg Duration | Timeout | % Used | Recommendation |
|-------|-------------|---------|--------|----------------|
| `audit-merged-prs-cloud` | 812s | 900s | 90% | Increase timeout to 1200s |
| `audit-merged-prs` | 757s | 900s | 84% | Monitor closely |

## Unreliable (50–79% success)

| Agent | Repo | Success Rate | Flakiness | Runs |
|-------|------|-------------|-----------|------|
| `audit-merged-prs-cloud` | agentguard-cloud | 50% | high | 2 |
| `observability-agent-cloud` | agentguard-cloud | 50% | low | 6 |
| `studio-designer` | agent-guard | 50% | moderate | 8 |
| `swarm-conductor` | agent-guard | 50% | high | 2 |
| `analytics-pr-review-agent` | agentguard-analytics | 52% | moderate | 44 |
| `kernel-qa` | agent-guard | 53% | moderate | 32 |
| `analytics-pipeline` | agentguard-analytics | 56% | moderate | 18 |
| `architect-agent-cloud` | agentguard-cloud | 57% | moderate | 7 |
| `office-sim-qa` | agent-guard | 57% | low | 28 |
| `product-agent-cloud` | agentguard-cloud | 57% | moderate | 7 |
| `progress-controller-cloud` | agentguard-cloud | 57% | moderate | 7 |
| `tier-a-architect-review` | agentguard-cloud | 57% | moderate | 7 |
| `tier-b-senior-review` | agentguard-cloud | 57% | moderate | 7 |
| `director` | agent-guard | 58% | low | 12 |
| `office-sim-em` | agent-guard | 58% | low | 36 |
| `kernel-em` | agent-guard | 59% | low | 39 |
| `cloud-qa` | agentguard-cloud | 60% | low | 30 |
| `cloud-qa-coder-agent` | agentguard-cloud | 60% | high | 5 |
| `observability-agent` | agent-guard | 60% | moderate | 5 |
| `studio-product` | agent-guard | 60% | moderate | 5 |
| `cloud-em` | agent-guard | 60% | low | 38 |
| `hq-em` | agent-guard | 65% | low | 37 |
| `cloud-qa-smoke-runner` | agentguard-cloud | 67% | moderate | 15 |
| `triage-failing-ci-agent` | agent-guard | 68% | low | 152 |
| `coder-agent-cloud` | agentguard-cloud | 69% | low | 71 |
| `ci-triage-agent-cloud` | agentguard-cloud | 70% | low | 137 |
| `analytics-em` | agentguard-analytics | 71% | low | 42 |
| `analytics-invariant-researcher` | agentguard-analytics | 71% | high | 7 |
| `docs-sync-agent-cloud` | agentguard-cloud | 71% | moderate | 7 |
| `onboarding-monitor-agent` | agent-guard | 71% | moderate | 7 |
| `planning-agent` | agent-guard | 71% | moderate | 7 |
| `planning-agent-cloud` | agentguard-cloud | 71% | moderate | 7 |
| `pr-review-responder-cloud` | agentguard-cloud | 71% | moderate | 7 |
| `product-agent` | agent-guard | 71% | moderate | 7 |
| `progress-controller-agent` | agent-guard | 71% | moderate | 7 |
| `recovery-controller-agent` | agent-guard | 71% | moderate | 7 |
| `recovery-controller-cloud` | agentguard-cloud | 71% | moderate | 7 |
| `risk-escalation-agent` | agent-guard | 71% | moderate | 7 |
| `risk-escalation-agent-cloud` | agentguard-cloud | 71% | moderate | 7 |
| `merge-conflict-resolver-cloud` | agentguard-cloud | 73% | low | 71 |
| `agentguard-autonomous-sdlc--coder-agent` | agent-guard | 74% | low | 76 |
| `code-review-agent-cloud` | agentguard-cloud | 74% | moderate | 90 |
| `resolve-merge-conflicts` | agent-guard | 75% | low | 67 |
| `workspace-pr-review-agent` | agent-guard | 75% | low | 209 |
| `architect-agent` | agent-guard | 75% | moderate | 8 |
| `cloud-qa-backlog-steward` | agentguard-cloud | 75% | moderate | 4 |
| `cloud-qa-regression-analyzer` | agentguard-cloud | 75% | moderate | 4 |
| `test-agent` | agent-guard | 75% | moderate | 4 |
| `pr-merger-agent` | agent-guard | 76% | low | 638 |
| `design-em` | agent-guard | 78% | moderate | 9 |

## Reliable (≥80% success)

**47 agents operating well** (18 reliable, 29 mostly reliable).

| Agent | Repo | Success Rate | Flakiness | Streak |
|-------|------|-------------|-----------|--------|
| `agentguard-autonomous-sdlc--code-review-agent` | agent-guard | 100% | stable | 7× success |
| `audit-merged-prs` | agent-guard | 100% | stable | 2× success |
| `cicd-hardening-agent` | agent-guard | 100% | stable | 1× success |
| `cicd-hardening-agent-cloud` | agentguard-cloud | 100% | stable | 2× success |
| `copilot-docs-sync` | agent-guard | 100% | stable | 4× success |
| `copilot-test-writer` | agent-guard | 100% | stable | 4× success |
| `copilot-test-writer-oss` | agent-guard | 100% | stable | 4× success |
| `jared-conductor` | agent-guard | 100% | stable | 4× success |
| `marketing-content-agent` | agent-guard | 100% | stable | 2× success |
| `marketing-content-agent-cloud` | agentguard-cloud | 100% | stable | 2× success |
| `marketing-launch-agent` | agent-guard | 100% | stable | 1× success |
| `respond-to-pr-reviews` | agent-guard | 100% | stable | 8× success |
| `rollout-canary-validator` | agent-guard | 100% | stable | 6× success |
| `security-audit-agent-cloud` | agentguard-cloud | 100% | stable | 1× success |
| `site-builder` | agent-guard | 100% | stable | 4× success |
| `site-docs-sync` | agent-guard | 100% | stable | 3× success |
| `tier-c-copilot-implementer-hq` | agent-guard | 100% | stable | 1× success |
| `workspace-agent-reliability` | agent-guard | 100% | stable | 3× success |
| `tier-c-copilot-implementer-oss` | agent-guard | 93% | low | 1× fail |
| `copilot-pr-fixer` | agent-guard | 91% | low | 2× fail |
| `studio-em` | agent-guard | 90% | low | 17× success |
| `analytics-reporter` | agentguard-analytics | 90% | moderate | 5× success |
| `backlog-steward-agent` | agent-guard | 90% | moderate | 3× success |
| `backlog-steward-cloud` | agentguard-cloud | 90% | moderate | 3× success |
| `studio-jr` | agent-guard | 90% | low | 1× fail |
| `marketing-em` | agent-guard | 89% | moderate | 5× success |
| `site-em` | agent-guard | 89% | moderate | 5× success |
| `studio-qa` | agent-guard | 88% | low | 6× success |
| `backlog-hygiene--roadmap-triage-agent` | agent-guard | 88% | moderate | 3× success |
| `swarm-health-agent` | agent-guard | 88% | low | 10× success |
| `workspace-config-validator` | agent-guard | 88% | moderate | 2× success |
| `agentguard-autonomous-sdlc--documentation-maintainer-agent` | agent-guard | 86% | moderate | 3× success |
| `documentation-maintainer-agent` | agent-guard | 86% | moderate | 3× success |
| `infrastructure-health-agent-cloud` | agentguard-cloud | 86% | moderate | 3× success |
| `repo-hygiene-agent` | agent-guard | 86% | moderate | 3× success |
| `repo-hygiene-agent-cloud` | agentguard-cloud | 86% | moderate | 3× success |
| `stale-branch-janitor` | agent-guard | 86% | moderate | 3× success |
| `stale-branch-janitor-cloud` | agentguard-cloud | 86% | moderate | 3× success |
| `workspace-backlog-steward` | agent-guard | 86% | low | 1× fail |
| `governance-monitor-agent` | agent-guard | 83% | moderate | 2× success |
| `infrastructure-health-agent` | agent-guard | 83% | moderate | 2× success |
| `studio-sr` | agent-guard | 83% | moderate | 2× success |
| `tier-c-copilot-implementer` | agentguard-cloud | 82% | low | 8× fail |
| `pr-merger-agent-cloud` | agentguard-cloud | 80% | low | 44× fail |
| `agentguard-autonomous-sdlc--governance-monitor-agent` | agent-guard | 80% | moderate | 1× success |
| `governance-monitor-cloud` | agentguard-cloud | 80% | moderate | 1× success |
| `test-agent-cloud` | agentguard-cloud | 80% | moderate | 1× success |

## Recommendations

### Critical (Action Required)

1. **Investigate ongoing infrastructure degradation** — The 2026-03-28T12Z degradation is still active (~40-60% failure rate as of this report). This is the primary driver of all regression metrics. Root-cause investigation of the swarm runner is needed before any agent-level fixes.

2. **Shellforge agents** — The shellforge cluster (`shellforge-em`, `shellforge-sr`, `shellforge-qa`, `shellforge-docs`, `shellforge-reviewer`, `shellforge-ollama-integration`, `shellforge-research-scout`) shows persistent failures pre-dating the infrastructure events. These agents may have a repo-level issue unrelated to the swarm outage. Disable until fixed:
   - `shellforge-ollama-integration` (0% success, 7 runs)
   - `shellforge-reviewer` (17% success)
   - `shellforge-sr` (31% success)

3. **`observability-agent` / `observability-agent-cloud`** — Both dropped from 100% to 0% recent success. Even accounting for infra events, zero success in the recent window warrants investigation.

### Timeout Management

4. **Increase timeout for `audit-merged-prs-cloud`** — averaging 812s against a 900s timeout (90%). Recommend increasing to 1200s to prevent spurious timeout failures.
5. **Monitor `audit-merged-prs`** — averaging 757s against 900s (84%). Watch for timeout drift.

### Low Priority

6. **`analytics-invariant-researcher`** — Genuinely flaky (66.7% flip rate, 71% success). Investigate for non-determinism in analytics pipeline.
7. **`cloud-qa-coder-agent`** — 100% flip rate across 5 runs. Too few samples to classify definitively, but alternating pass/fail pattern suggests environmental sensitivity.

*Report generated by `workspace-agent-reliability` (identity: `claude-code:opus:ops`) at 2026-03-29T03:04:13Z*