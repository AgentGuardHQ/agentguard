# Agent Reliability Report — 2026-03-27

**Window:** 7 days | **Agents analyzed:** 112 | **Total runs:** 1567
**Swarm success rate:** 67.3% | **Regressions detected:** 7

## Regressions (was working, now failing)

| Agent | Repo | Was (days 4-7) | Now (days 1-3) | Recent Failures |
|-------|------|----------------|----------------|------------------|
| agentguard-autonomous-sdlc--coder-agent | agent-guard | 94% | 61% | 15 |
| architect-agent | agent-guard | 100% | 50% | 2 |
| ci-triage-agent-cloud | agentguard-cloud | 97% | 68% | 23 |
| coder-agent-cloud | agentguard-cloud | 94% | 66% | 13 |
| merge-conflict-resolver-cloud | agentguard-cloud | 100% | 68% | 12 |
| resolve-merge-conflicts | agent-guard | 100% | 68% | 12 |
| triage-failing-ci-agent | agent-guard | 91% | 64% | 26 |

## Broken Agents (<50% success)

| Agent | Repo | Success Rate | Runs | Last Success |
|-------|------|-------------|------|---------------|
| design-auditor | agentguard-cloud | 0% | 1 | never |
| retrospective-agent | agent-guard | 0% | 2 | never |
| retrospective-agent-cloud | agentguard-cloud | 0% | 2 | never |
| shellforge-docs | unknown | 0% | 2 | never |
| shellforge-em | unknown | 0% | 3 | never |
| shellforge-ollama-integration | unknown | 0% | 3 | never |
| shellforge-qa | unknown | 0% | 2 | never |
| shellforge-research-scout | unknown | 0% | 2 | never |
| shellforge-reviewer | unknown | 0% | 2 | never |
| shellforge-sr | unknown | 0% | 3 | never |
| kernel-sr | agent-guard | 26% | 27 | 2026-03-27T02:38 |
| office-sim-sr | agentguard-cloud | 28% | 18 | 2026-03-26T00:44 |
| analytics-pr-review-agent | agentguard-analytics | 35% | 20 | 2026-03-27T00:40 |
| cloud-sr | agentguard-cloud | 38% | 21 | 2026-03-27T02:39 |
| product-agent-cloud | agentguard-cloud | 40% | 5 | 2026-03-25T12:35 |
| progress-controller-cloud | agentguard-cloud | 40% | 5 | 2026-03-25T13:35 |
| office-sim-qa | agentguard-cloud | 42% | 12 | 2026-03-27T02:48 |
| cloud-qa | agentguard-cloud | 46% | 13 | 2026-03-27T02:39 |
| office-sim-em | agentguard-cloud | 47% | 17 | 2026-03-26T00:22 |
| hq-em | agent-guard | 47% | 19 | 2026-03-26T00:18 |

## Highly Flaky (>50% flip rate)

| Agent | Repo | Flakiness | Success Rate | Flips/Runs |
|-------|------|-----------|-------------|------------|
| audit-merged-prs-cloud | agentguard-cloud | 100% | 50% | 1/2 |
| cloud-qa-backlog-steward | agentguard-cloud | 100% | 50% | 1/2 |
| cloud-qa-coder-agent | agentguard-cloud | 100% | 67% | 2/3 |
| cloud-qa-regression-analyzer | agentguard-cloud | 100% | 50% | 1/2 |
| studio-em | . | 67% | 50% | 2/4 |

## Timeout Risks (avg duration >80% of timeout)

| Agent | Avg Duration | Timeout | % Used | Timeouts |
|-------|-------------|---------|--------|----------|
| audit-merged-prs-cloud | 812s | 900s | 90% | 0 |
| audit-merged-prs | 757s | 900s | 84% | 0 |

## Unreliable (50-79% success)

| Agent | Repo | Success Rate | Flakiness |
|-------|------|-------------|----------|
| analytics-pipeline | agentguard-analytics | 50% | low |
| audit-merged-prs-cloud | agentguard-cloud | 50% | high |
| cloud-qa-backlog-steward | agentguard-cloud | 50% | high |
| cloud-qa-regression-analyzer | agentguard-cloud | 50% | high |
| director | agent-guard | 50% | low |
| kernel-em | agent-guard | 50% | low |
| studio-em | . | 50% | high |
| analytics-em | agentguard-analytics | 55% | low |
| cloud-em | agentguard-cloud | 55% | low |
| kernel-qa | agent-guard | 56% | low |
| cloud-qa-smoke-runner | agentguard-cloud | 57% | moderate |
| analytics-invariant-researcher | agentguard-analytics | 60% | moderate |
| architect-agent-cloud | agentguard-cloud | 60% | moderate |
| observability-agent | agent-guard | 60% | moderate |
| observability-agent-cloud | agentguard-cloud | 60% | moderate |
| planning-agent | agent-guard | 60% | moderate |
| planning-agent-cloud | agentguard-cloud | 60% | moderate |
| product-agent | agent-guard | 60% | moderate |
| progress-controller-agent | agent-guard | 60% | moderate |
| recovery-controller-agent | agent-guard | 60% | moderate |
| recovery-controller-cloud | agentguard-cloud | 60% | moderate |
| risk-escalation-agent | agent-guard | 60% | moderate |
| risk-escalation-agent-cloud | agentguard-cloud | 60% | moderate |
| tier-a-architect-review | agentguard-cloud | 60% | moderate |
| tier-b-senior-review | agentguard-cloud | 60% | moderate |
| pr-merger-agent-cloud | agentguard-cloud | 62% | low |
| workspace-pr-review-agent | agent-guard | 63% | low |
| analytics-reporter | agentguard-analytics | 67% | low |
| architect-agent | agent-guard | 67% | low |
| cloud-qa-coder-agent | agentguard-cloud | 67% | high |
| agentguard-autonomous-sdlc--coder-agent | agent-guard | 70% | low |
| pr-merger-agent | agent-guard | 72% | low |
| code-review-agent-cloud | agentguard-cloud | 73% | low |
| triage-failing-ci-agent | agent-guard | 73% | low |
| coder-agent-cloud | agentguard-cloud | 74% | low |
| design-em | agentguard-cloud | 75% | moderate |
| marketing-em | agent-guard | 75% | moderate |
| site-em | agent-guard | 75% | moderate |
| ci-triage-agent-cloud | agentguard-cloud | 77% | low |
| merge-conflict-resolver-cloud | agentguard-cloud | 77% | low |
| resolve-merge-conflicts | agent-guard | 77% | low |

## Reliable (>80% success)

51 agents operating normally.

<details>
<summary>Show all reliable agents</summary>

| Agent | Repo | Success Rate | Runs | Streak | Avg Duration |
|-------|------|-------------|------|--------|-------------|
| audit-merged-prs | agent-guard | 100% | 2 | 2 success | 757s |
| cicd-hardening-agent | agent-guard | 100% | 2 | 2 success | 283s |
| cicd-hardening-agent-cloud | agentguard-cloud | 100% | 2 | 2 success | 238s |
| cloud-qa-test-architect | agentguard-cloud | 100% | 1 | 1 success | 412s |
| copilot-docs-sync | agent-guard | 100% | 2 | 2 success | 218s |
| copilot-pr-fixer | agentguard-cloud | 100% | 10 | 10 success | 122s |
| copilot-test-writer | agentguard-cloud | 100% | 2 | 2 success | 371s |
| copilot-test-writer-oss | agent-guard | 100% | 2 | 2 success | 192s |
| marketing-content-agent | agent-guard | 100% | 2 | 2 success | 374s |
| marketing-content-agent-cloud | agentguard-cloud | 100% | 2 | 2 success | 196s |
| marketing-launch-agent | agent-guard | 100% | 1 | 1 success | 106s |
| respond-to-pr-reviews | agent-guard | 100% | 6 | 6 success | 155s |
| rollout-canary-validator | . | 100% | 1 | 1 success | 129s |
| security-audit-agent | agent-guard | 100% | 1 | 1 success | 310s |
| security-audit-agent-cloud | agentguard-cloud | 100% | 1 | 1 success | 37s |
| site-builder | agent-guard | 100% | 1 | 1 success | 332s |
| site-docs-sync | agent-guard | 100% | 1 | 1 success | 646s |
| studio-designer | . | 100% | 1 | 1 success | 342s |
| studio-jr | . | 100% | 1 | 1 success | 117s |
| studio-product | . | 100% | 1 | 1 success | 246s |
| studio-qa | . | 100% | 1 | 1 success | 182s |
| studio-sr | . | 100% | 1 | 1 success | 199s |
| test-generation-agent | agent-guard | 100% | 1 | 1 success | 46s |
| test-generation-agent-cloud | agentguard-cloud | 100% | 1 | 1 success | 63s |
| tier-c-copilot-implementer | agentguard-cloud | 100% | 20 | 20 success | 261s |
| tier-c-copilot-implementer-hq | unknown | 100% | 1 | 1 success | 236s |
| workspace-agent-reliability | agent-guard | 100% | 1 | 1 success | 368s |
| workspace-backlog-steward | agent-guard | 100% | 5 | 5 success | 254s |
| workspace-config-validator | agent-guard | 100% | 1 | 1 success | 331s |
| tier-c-copilot-implementer-oss | agent-guard | 95% | 20 | 18 success | 453s |
| backlog-steward-agent | agent-guard | 88% | 8 | 1 success | 230s |
| backlog-steward-cloud | agentguard-cloud | 88% | 8 | 1 success | 278s |
| agentguard-autonomous-sdlc--code-review-agent | agent-guard | 83% | 6 | 1 failure | 209s |
| backlog-hygiene--roadmap-triage-agent | agent-guard | 83% | 6 | 1 success | 480s |
| swarm-health-agent | agent-guard | 81% | 16 | 2 success | 283s |
| agentguard-autonomous-sdlc--documentation-maintainer-agent | agent-guard | 80% | 5 | 1 success | 511s |
| agentguard-autonomous-sdlc--governance-monitor-agent | agent-guard | 80% | 5 | 1 success | 383s |
| docs-sync-agent-cloud | agentguard-cloud | 80% | 5 | 1 success | 341s |
| documentation-maintainer-agent | agent-guard | 80% | 5 | 1 success | 548s |
| governance-monitor-agent | agent-guard | 80% | 5 | 1 success | 409s |
| governance-monitor-cloud | agentguard-cloud | 80% | 5 | 1 success | 268s |
| infrastructure-health-agent | agent-guard | 80% | 5 | 1 success | 268s |
| infrastructure-health-agent-cloud | agentguard-cloud | 80% | 5 | 1 success | 216s |
| onboarding-monitor-agent | agentguard-cloud | 80% | 5 | 2 success | 88s |
| pr-review-responder-cloud | agentguard-cloud | 80% | 5 | 1 success | 401s |
| repo-hygiene-agent | agent-guard | 80% | 5 | 1 success | 330s |
| repo-hygiene-agent-cloud | agentguard-cloud | 80% | 5 | 1 success | 253s |
| stale-branch-janitor | agent-guard | 80% | 5 | 1 success | 239s |
| stale-branch-janitor-cloud | agentguard-cloud | 80% | 5 | 1 success | 160s |
| test-agent | agent-guard | 80% | 5 | 1 success | 272s |
| test-agent-cloud | agentguard-cloud | 80% | 5 | 1 success | 242s |

</details>

## Recommendations

- **agentguard-autonomous-sdlc--coder-agent**: Regression detected — investigate recent failures (was reliable, now failing)
- **architect-agent**: Regression detected — investigate recent failures (was reliable, now failing)
- **ci-triage-agent-cloud**: Regression detected — investigate recent failures (was reliable, now failing)
- **coder-agent-cloud**: Regression detected — investigate recent failures (was reliable, now failing)
- **merge-conflict-resolver-cloud**: Regression detected — investigate recent failures (was reliable, now failing)
- **resolve-merge-conflicts**: Regression detected — investigate recent failures (was reliable, now failing)
- **triage-failing-ci-agent**: Regression detected — investigate recent failures (was reliable, now failing)
- **analytics-pr-review-agent**: Broken (35% success) — consider disabling until root cause is fixed
- **cloud-qa**: Broken (46% success) — consider disabling until root cause is fixed
- **cloud-sr**: Broken (38% success) — consider disabling until root cause is fixed
- **design-auditor**: Broken (0% success) — consider disabling until root cause is fixed
- **hq-em**: Broken (47% success) — consider disabling until root cause is fixed
- **kernel-sr**: Broken (26% success) — consider disabling until root cause is fixed
- **office-sim-em**: Broken (47% success) — consider disabling until root cause is fixed
- **office-sim-qa**: Broken (42% success) — consider disabling until root cause is fixed
- **office-sim-sr**: Broken (28% success) — consider disabling until root cause is fixed
- **product-agent-cloud**: Broken (40% success) — consider disabling until root cause is fixed
- **progress-controller-cloud**: Broken (40% success) — consider disabling until root cause is fixed
- **retrospective-agent**: Broken (0% success) — consider disabling until root cause is fixed
- **retrospective-agent-cloud**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-docs**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-em**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-ollama-integration**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-qa**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-research-scout**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-reviewer**: Broken (0% success) — consider disabling until root cause is fixed
- **shellforge-sr**: Broken (0% success) — consider disabling until root cause is fixed
- **audit-merged-prs-cloud**: Highly flaky (100% flip rate) — investigate environmental instability
- **cloud-qa-backlog-steward**: Highly flaky (100% flip rate) — investigate environmental instability
- **cloud-qa-coder-agent**: Highly flaky (100% flip rate) — investigate environmental instability
- **cloud-qa-regression-analyzer**: Highly flaky (100% flip rate) — investigate environmental instability
- **studio-em**: Highly flaky (67% flip rate) — investigate environmental instability
- **audit-merged-prs**: Timeout risk (avg 757s / 900s limit, 0 timeouts) — consider increasing timeout
- **audit-merged-prs-cloud**: Timeout risk (avg 812s / 900s limit, 0 timeouts) — consider increasing timeout
- **analytics-em**: Unreliable (55% success) — needs investigation
- **analytics-invariant-researcher**: Unreliable (60% success) — needs investigation
- **analytics-pipeline**: Unreliable (50% success) — needs investigation
- **analytics-reporter**: Unreliable (67% success) — needs investigation
- **architect-agent-cloud**: Unreliable (60% success) — needs investigation
- **cloud-em**: Unreliable (55% success) — needs investigation
- **cloud-qa-smoke-runner**: Unreliable (57% success) — needs investigation
- **code-review-agent-cloud**: Unreliable (73% success) — needs investigation
- **design-em**: Unreliable (75% success) — needs investigation
- **director**: Unreliable (50% success) — needs investigation
- **kernel-em**: Unreliable (50% success) — needs investigation
- **kernel-qa**: Unreliable (56% success) — needs investigation
- **marketing-em**: Unreliable (75% success) — needs investigation
- **observability-agent**: Unreliable (60% success) — needs investigation
- **observability-agent-cloud**: Unreliable (60% success) — needs investigation
- **planning-agent**: Unreliable (60% success) — needs investigation
- **planning-agent-cloud**: Unreliable (60% success) — needs investigation
- **pr-merger-agent**: Unreliable (72% success) — needs investigation
- **pr-merger-agent-cloud**: Unreliable (62% success) — needs investigation
- **product-agent**: Unreliable (60% success) — needs investigation
- **progress-controller-agent**: Unreliable (60% success) — needs investigation
- **recovery-controller-agent**: Unreliable (60% success) — needs investigation
- **recovery-controller-cloud**: Unreliable (60% success) — needs investigation
- **risk-escalation-agent**: Unreliable (60% success) — needs investigation
- **risk-escalation-agent-cloud**: Unreliable (60% success) — needs investigation
- **site-em**: Unreliable (75% success) — needs investigation
- **tier-a-architect-review**: Unreliable (60% success) — needs investigation
- **tier-b-senior-review**: Unreliable (60% success) — needs investigation
- **workspace-pr-review-agent**: Unreliable (63% success) — needs investigation

---
_Generated by `workspace-agent-reliability` (`claude-code:opus:ops`) at 2026-03-27T02:59:25.398536+00:00_
