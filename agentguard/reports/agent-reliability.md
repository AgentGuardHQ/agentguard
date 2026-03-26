# Agent Reliability Report — 2026-03-26

**Window:** 7 days (2 days of data available: 2026-03-25 to 2026-03-26) | **Agents analyzed:** 27 | **Total completed runs:** 94
**Swarm success rate:** 93.6% (88/94) | **Regressions detected:** 2

> Note: Only 2 days of log history available on this box. Regression detection is limited without a full 7-day window. Agents currently running (exit_code not yet recorded) are excluded from analysis.

## Regressions (was working, now failing)

| Agent | Repo | Success Rate | Recent Failures | Notes |
|-------|------|-------------|-----------------|-------|
| qa-regression-analyzer | bench-devs-platform | 0% (0/2) | 2 consecutive timeouts (exit 124) | Both runs hit 900s timeout; never succeeded in available window |
| qa-issue-fixer-agent | bench-devs-platform | 67% (2/3) | 1 timeout (exit 124) | First run timed out at 1801s, recovered in subsequent runs |

## Broken Agents (<50% success)

| Agent | Repo | Success Rate | Runs | Last Success |
|-------|------|-------------|------|--------------|
| qa-regression-analyzer | bench-devs-platform | 0% (0/2) | 2 | Never (in window) |

## Highly Flaky (>50% flip rate)

| Agent | Repo | Flakiness | Success Rate | Flips/Runs |
|-------|------|-----------|-------------|------------|
| qa-test-architect | bench-devs-platform | 100% (high) | 50% (1/2) | 1/1 transitions |

> qa-test-architect: First run timed out (exit 124, 900s), second run succeeded (744s). With only 2 runs the flakiness rate is maximal but may normalize with more data.

## Timeout Risks (avg duration >80% of timeout)

| Agent | Avg Duration | Timeout | % Used | Notes |
|-------|-------------|---------|--------|-------|
| qa-coder-agent | 1491s | 1800s | 82.8% | Consistently running near timeout limit |

> qa-coder-agent succeeds but averages 24m51s against a 30m timeout. Consider increasing timeout to 2400s or investigating execution efficiency.

## Unreliable (50-79% success)

| Agent | Repo | Success Rate | Flakiness | Notes |
|-------|------|-------------|-----------|-------|
| qa-issue-fixer-agent | bench-devs-platform | 67% (2/3) | Moderate (50%) | Recovering; 2 consecutive successes after initial timeout |
| qa-test-architect | bench-devs-platform | 50% (1/2) | High (100%) | Timeout on first run, success on second |

## Mostly Reliable (80-94% success)

| Agent | Repo | Success Rate | Flakiness | Timeout Hits | Notes |
|-------|------|-------------|-----------|-------------|-------|
| studio-sr | . (workspace) | 83% (10/12) | Moderate (36%) | 2 | Pattern: pass-fail-pass-pass-fail-pass-pass-pass-pass-pass-pass-pass. Both failures were timeouts (exit 124). Currently on 7-run success streak. |

## Reliable (>95% success)

23 agents operating normally:

| Agent | Repo | Runs | Success Rate | Avg Duration | Streak |
|-------|------|------|-------------|-------------|--------|
| qa-pr-review-agent | bench-devs-platform | 9 | 100% | 64s | 9 passes |
| studio-em | . (workspace) | 10 | 100% | 231s | 10 passes |
| studio-qa | . (workspace) | 10 | 100% | 191s | 10 passes |
| workspace-pr-review-agent | agent-guard | 8 | 100% | 94s | 8 passes |
| qa-smoke-runner | bench-devs-platform | 4 | 100% | 491s | 4 passes |
| qa-issue-generator | bench-devs-platform | 3 | 100% | 103s | 3 passes |
| qa-pr-review-responder | bench-devs-platform | 3 | 100% | 227s | 3 passes |
| studio-designer | . (workspace) | 3 | 100% | 179s | 3 passes |
| workspace-config-validator | agent-guard | 3 | 100% | 243s | 3 passes |
| marketing-content-agent-cloud | agentguard-cloud | 2 | 100% | 54s | 2 passes |
| qa-backlog-steward | bench-devs-platform | 2 | 100% | 485s | 2 passes |
| qa-coder-agent | bench-devs-platform | 2 | 100% | 1491s | 2 passes |
| qa-escalation-agent | bench-devs-platform | 2 | 100% | 230s | 2 passes |
| qa-flaky-test-detector | bench-devs-platform | 2 | 100% | 467s | 2 passes |
| qa-observability-agent | bench-devs-platform | 2 | 100% | 425s | 2 passes |
| qa-slack-reporter | bench-devs-platform | 2 | 100% | 149s | 2 passes |
| workspace-agent-reliability | agent-guard | 2 | 100% | 344s | 2 passes |
| design-auditor | agentguard-cloud | 1 | 100% | 77s | 1 pass |
| design-em | agentguard-cloud | 1 | 100% | 50s | 1 pass |
| marketing-content-agent | agent-guard | 1 | 100% | 283s | 1 pass |
| marketing-em | agent-guard | 1 | 100% | 213s | 1 pass |
| site-em | agent-guard | 1 | 100% | 180s | 1 pass |
| studio-product | . (workspace) | 1 | 100% | 445s | 1 pass |

## Recommendations

1. **qa-regression-analyzer** (CRITICAL): Broken — 0% success rate, both runs timed out at 900s against 1800s configured timeout. Investigate why it's timing out; the exit code 124 indicates the process hit the `timeout` command limit. May need debugging or timeout increase.

2. **qa-coder-agent** (WATCH): Averaging 82.8% of timeout (1491s/1800s). Currently succeeding but at risk of timeouts as workload grows. Consider increasing timeout to 2400s.

3. **qa-test-architect** (WATCH): 50% success with 1 timeout. Weekly agent (runs Sunday) so limited data. Monitor next run closely.

4. **studio-sr** (WATCH): 83% success with intermittent timeouts (2/12 runs). Currently on 7-run success streak so may have self-resolved. Pattern suggests occasional long-running tasks exceed 900s timeout. Consider increasing timeout to 1200s if timeouts recur.

5. **qa-issue-fixer-agent** (RECOVERING): Had initial timeout but recovered with 2 consecutive successes. Continue monitoring.

## Governance Notes

- No AgentGuard governance issues encountered during this analysis run.
- Dogfood reporting spec (`claude/shared/dogfood-reporting.md`) not found in workspace; no governance anomalies to report.
