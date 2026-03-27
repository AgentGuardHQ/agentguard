# How AgentGuard Addresses the OWASP Agentic Top 10

*Draft for LinkedIn / dev.to — issue #925 — drafted by marketing-em 2026-03-27*

---

We ran an audit. Not a marketing audit — a code-level audit, invariant by invariant, against the [OWASP Agentic Top 10](https://owasp.org/www-project-agentic-top-10/).

The result: 64/100. Strong where it matters most. Honest about where we have gaps.

Here's what we found.

---

## The OWASP Agentic Top 10

The OWASP Agentic Top 10 is the security community's first structured attempt to catalog what goes wrong when AI agents operate autonomously. It covers:

1. Prompt Injection
2. Insecure Tool Implementation
3. Excessive Agency / Permissions
4. Insecure Output Handling
5. Inadequate Sandboxing
6. Implicit Trust / Insufficient Verification
7. Data Exfiltration via Agent
8. Model Manipulation / Abuse
9. Insufficient Logging / Monitoring
10. Multi-Agent Trust Issues

Most agent frameworks don't address this list at all. They hand the LLM a set of tools and hope for the best.

AgentGuard is built differently — it's a governed action runtime that intercepts every tool call and evaluates it against policies and invariants before execution. So let's see how that architecture holds up.

---

## The Honest Scorecard

| # | Category | AgentGuard Coverage | Score |
|---|----------|--------------------|----|
| 1 | Prompt Injection | Moderate | 6/10 |
| 2 | Insecure Tool Implementation | **Strong** | 8/10 |
| 3 | Excessive Agency / Permissions | **Strong** | 9/10 |
| 4 | Insecure Output Handling | Weak | 4/10 |
| 5 | Inadequate Sandboxing | Minimal | 3/10 |
| 6 | Implicit Trust / Insufficient Verification | **Strong** | 8/10 |
| 7 | Data Exfiltration via Agent | **Strong** | 8/10 |
| 8 | Model Manipulation / Abuse | Moderate | 5/10 |
| 9 | Insufficient Logging / Monitoring | **Strong** | 9/10 |
| 10 | Multi-Agent Trust Issues | Weak | 4/10 |

**Overall: 64/100**

Six STRONG categories. Four that need work. Here's what each means in practice.

---

## Where AgentGuard Is Strong

### #3: Excessive Agency (9/10)

This is the core of what AgentGuard does, and it shows.

Every agent action passes through a kernel pipeline: propose → normalize → evaluate → execute → emit. Before execution, 24 built-in invariants check whether the action exceeds appropriate scope:

- `blast-radius-limit` — blocks operations affecting too many files at once
- `no-force-push` — prevents overwriting remote history
- `no-permission-escalation` — blocks `sudo`, `chmod 777`, capability grants
- `no-cicd-config-modification` — protects `.github/workflows/` from agent edits
- `no-governance-self-modification` — agents can't modify their own governance rules
- `no-skill-modification` — agents can't rewrite their own skills or prompts

When denials accumulate, the escalation state machine engages: `NORMAL → ELEVATED → HIGH → LOCKDOWN`. An agent that repeatedly tests boundaries doesn't just get denied — it gets locked down.

The gap here is that permissions are binary. We're building capability-scoped grants (path-limited, size-limited, time-bounded) for Phase 7.

### #9: Insufficient Logging (9/10)

Every action — allowed or denied — emits structured events. There are 47 event kinds covering the full governance lifecycle: `ActionRequested`, `ActionAllowed`, `ActionDenied`, `PolicyDenied`, `InvariantViolation`, `BlastRadiusExceeded`, `IntentDriftDetected`, and more.

Every event sinks to SQLite with indexed queries. `PolicyTraceRecorded` events log which rules were evaluated, which conditions matched, and why the decision was made. Evidence packs attach to denied actions with full violation chains.

`agentguard inspect <runId>` shows you the action graph for any session. `agentguard audit-verify` checks the tamper-resistant audit chain.

The gap: no automatic SIEM webhook routing yet. That's on the roadmap.

### #6 & #7: Implicit Trust + Data Exfiltration (8/10 each)

For trust verification: policy files are cryptographically signed and validated before loading. Hook configurations are hash-verified on each load — a tampered hook is detected and flagged. All trust decisions emit `PolicyTrustVerified/Denied` and `HookIntegrityVerified/Failed` events.

For data exfiltration: the `no-network-egress` invariant blocks HTTP requests to non-allowlisted domains and detects `curl`, `wget`, and `nc` in shell commands. The `no-ide-socket-access` invariant prevents agents from escaping governance via VS Code, JetBrains, or Cursor IPC sockets. Three-layer secret detection (regex + fingerprint hash + entropy threshold) prevents writing credentials to files.

---

## Where AgentGuard Has Gaps

### #5: Inadequate Sandboxing (3/10)

This is the honest low point. AgentGuard governs at the action layer — it can deny a command before it executes, but once an action is allowed, there's no OS-level isolation. The agent process shares memory, filesystem access, and environment with the kernel.

We don't have seccomp-bpf, Linux Landlock, or container isolation. The `no-network-egress` invariant detects obvious network patterns in shell commands, but a Go binary or Python subprocess doesn't get checked at the syscall level.

This is a known limitation. The roadmap includes OS-level sandboxing (P2), but that's a significant engineering investment. In the meantime, AgentGuard's approach is to prevent dangerous actions from being authorized in the first place.

### #10: Multi-Agent Trust (4/10)

The persona system assigns each agent a trust tier, role, and autonomy level. Policy rules can condition on these. But there's no inter-agent authorization — Agent A can modify the files that Agent B just wrote, without any handshake.

In our own swarm (26+ agents operating concurrently), we've hit this gap. Escalation counts are per-session, not across the swarm. Two agents can each accumulate three denials without triggering a swarm-level response.

This is where the multi-agent world breaks the single-agent governance model. It's the most interesting unsolved problem in the space.

---

## Why the Honest Audit Matters

Other vendors in this space report their own scores. Some claim perfect 10/10 coverage across all ten categories. We looked at our code and counted what's actually implemented.

The result isn't perfect, and that's the point. An honest 64/100 with a roadmap to close the gaps is more useful than a marketing 100/100 that doesn't reflect reality.

What's actually shipped: 24 deterministic invariants with structured pattern matching. No LLM in the enforcement path. Cryptographic audit chains. A reference monitor architecture that treats every agent tool call as an authorization decision.

What's coming: capability-scoped permissions, OS-level sandboxing, multi-agent resource locks, and cross-session escalation aggregation.

---

## Try It

```bash
# Install AgentGuard
npm install -g @red-codes/agentguard

# Wire into Claude Code
agentguard claude-init

# Start governed session
agentguard guard --policy agentguard.yaml

# Inspect what happened
agentguard inspect --last
```

The governance layer is open source. The full OWASP audit with code-level references is in [`docs/owasp-agentic-top10-coverage.md`](https://github.com/AgentGuardHQ/agentguard/blob/main/docs/owasp-agentic-top10-coverage.md).

If you're building or deploying AI coding agents, the Agentic Top 10 is worth reading. Then check what your governance layer actually covers — not what it claims to.

---

*AgentGuard is an open-source governed action runtime for AI coding agents.*
*GitHub: [AgentGuardHQ/agentguard](https://github.com/AgentGuardHQ/agentguard)*
