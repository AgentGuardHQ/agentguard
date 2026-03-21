<p align="center">
  <img src="site/assets/logo-wordmark.svg" alt="AgentGuard" width="320">
</p>

<p align="center"><strong>Runtime governance for AI coding agents.</strong><br>
Install in 30 seconds. Block dangerous actions before they execute.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@red-codes/agentguard"><img src="https://img.shields.io/npm/v/@red-codes/agentguard.svg" alt="npm version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache 2.0"></a>
  <img src="https://github.com/AgentGuardHQ/agentguard/actions/workflows/size-check.yml/badge.svg" alt="CI">
  <a href="https://agentguardhq.github.io/agentguard/"><img src="https://img.shields.io/badge/Website-AgentGuardHQ.github.io-22C55E?style=flat&logo=github" alt="Website"></a>
</p>

---

AI coding agents (Claude Code, GitHub Copilot, any MCP client) execute file writes, shell commands, and git operations autonomously. AgentGuard sits between what an agent proposes and what actually runs — enforcing policy, checking 21 built-in safety invariants, and emitting a tamper-resistant audit trail.

**For individuals:** block dangerous actions in your local dev environment.
**For teams:** centralized governance, compliance packs, and real-time dashboard.

## Quick Start

```bash
npm install -g @red-codes/agentguard
cd your-project
agentguard init
agentguard claude-init
# Governance is active — every Claude Code tool call is now governed
```

Verify it's running:

```bash
agentguard status
# ✓ Claude Code hooks installed
# ✓ Policy file (agentguard.yaml)
# ✓ Runtime active
```

Test a deny rule without executing anything:

```bash
echo '{"tool":"Bash","command":"git push origin main"}' | agentguard guard --dry-run
# ✗ git.push main → DENIED (protect-main)
```

## Cloud Dashboard

Connect to the AgentGuard Cloud for team governance, real-time telemetry, and multi-tenant management:

```bash
agentguard cloud login
# Opens browser → authenticate with GitHub or Google → CLI auto-configures
```

| Link | Description |
|------|-------------|
| [agentguard-cloud-dashboard.vercel.app](https://agentguard-cloud-dashboard.vercel.app) | Team dashboard — runs, violations, analytics |
| [agentguard-cloud-office-sim.vercel.app](https://agentguard-cloud-office-sim.vercel.app) | Live Office — 2D visualization of agent activity |

## What It Does

| Capability | Details |
|------------|---------|
| **Policy enforcement** | YAML rules with deny / allow / escalate — drop `agentguard.yaml` in your repo |
| **21 built-in invariants** | Secret exposure, protected branches, blast radius, path traversal, CI/CD config, package script injection, and more |
| **46 event kinds** | Full lifecycle telemetry: `ActionRequested → ActionAllowed/Denied → ActionExecuted` |
| **Real-time cloud dashboard** | Telemetry streams to your team dashboard; opt-in, anonymous by default |
| **Multi-tenant** | Team workspaces, GitHub/Google OAuth, SSO-ready |
| **Live Office visualization** | 2D view of agents working in real time — share a link with your team |
| **Agent SDK** | Programmatic governance for custom integrations and RunManifest-driven workflows |
| **Works with** | Claude Code, GitHub Copilot, any MCP client |

## Policy Example

Drop `agentguard.yaml` in your repo root. It's picked up automatically:

```yaml
id: my-project
name: My Project Policy
severity: 4

rules:
  - action: git.push
    effect: deny
    branches: [main, master]
    reason: Protected branch — use a PR

  - action: file.write
    effect: deny
    target: "**/.env"
    reason: No secrets modification

  - action: shell.exec
    effect: deny
    pattern: "rm -rf"
    reason: Destructive shell commands blocked

  - action: file.read
    effect: allow
    reason: Read access is unrestricted
```

Compose multiple policies with `extends`:

```yaml
extends:
  - soc2
  - hipaa
```

## Built-in Invariants

21 safety invariants run on every action evaluation:

| Invariant | Severity | What it blocks |
|-----------|----------|----------------|
| `no-secret-exposure` | Critical | `.env`, credentials, `.pem`, `.key` files |
| `no-credential-file-creation` | Critical | SSH keys, cloud configs, auth tokens |
| `no-cicd-config-modification` | Critical | `.github/workflows/`, `.gitlab-ci.yml`, Jenkinsfile |
| `no-governance-self-modification` | Critical | Agents modifying their own governance config |
| `no-scheduled-task-modification` | Critical | Cron jobs, scheduled task files |
| `protected-branch` | High | Direct push to main/master |
| `no-force-push` | High | `git push --force` |
| `no-network-egress` | High | HTTP requests outside your allowlist |
| `no-permission-escalation` | High | `chmod` world-writable, setuid/setgid |
| `no-skill-modification` | High | `.claude/skills/` files |
| `no-package-script-injection` | High | `package.json` lifecycle script changes |
| `transitive-effect-analysis` | High | Downstream policy violations from a file write |
| `no-ide-socket-access` | High | VS Code IPC socket files |
| `blast-radius-limit` | Medium | Caps file modification count per action (default: 20) |
| `no-container-config-modification` | Medium | Dockerfile, docker-compose.yml |
| `no-env-var-modification` | Medium | Shell profile and env var files |
| `no-destructive-migration` | Medium | Migration files with DROP/TRUNCATE DDL |
| `large-file-write` | Medium | Per-file size limit (prevents data dumps) |
| `test-before-push` | Medium | Requires tests to pass before push |
| `recursive-operation-guard` | Low | `find -exec`, `xargs` with write/delete |
| `lockfile-integrity` | Low | `package.json` changes without lockfile sync |

## Architecture

```
Agent tool call
      │
      ▼
AgentGuard Kernel
  1. Normalize   — map tool call to canonical action type
  2. Evaluate    — match policy rules (deny / allow / escalate)
  3. Check       — run 21 built-in invariants
  4. Execute     — run action via adapter (file, shell, git)
  5. Emit        — 46 event kinds → SQLite audit trail + cloud telemetry
```

**Storage:** SQLite audit trail at `.agentguard/`. Every decision is recorded and verifiable.

**Kernel overhead:** < 5ms end-to-end (policy evaluation < 30µs, full invariant suite < 300µs).

## For Teams and Enterprise

| Feature | Details |
|---------|---------|
| **Compliance packs** | `extends: soc2`, `extends: hipaa` — pre-built policy packs mapping to SOC 2 CC6/CC7 and HIPAA 164.312 controls |
| **Audit trail** | Tamper-resistant SQLite event chain; export to JSONL for SIEM ingestion |
| **Evidence PRs** | `agentguard evidence-pr` — attach governance evidence summary to any PR |
| **CI gates** | `agentguard ci-check <session>` — fail CI if a governance session contains violations |
| **Branch protection** | Policy-enforced push controls on top of GitHub branch rules |
| **SSO** | GitHub and Google OAuth via cloud dashboard |
| **Multi-tenant** | Isolated workspaces per team or project |

## CLI Reference

```bash
# Setup
agentguard init                           # Initialize policy in current project
agentguard claude-init                    # Install Claude Code hooks
agentguard claude-init --global           # Install hooks globally (~/.claude/settings.json)
agentguard status                         # Show governance status

# Runtime
agentguard guard                          # Start governed action runtime
agentguard guard --policy <file>          # Use a specific policy file
agentguard guard --dry-run                # Evaluate without executing

# Inspect
agentguard inspect --last                 # Show last run action graph
agentguard events --last                  # Raw event stream (pipe to jq)
agentguard traces [runId]                 # Policy evaluation traces
agentguard replay --last                  # Replay session timeline

# Cloud
agentguard cloud login                    # Device code auth — opens browser
agentguard cloud status                   # Check cloud connection
agentguard cloud events                   # Query events from cloud
agentguard cloud runs                     # List governance runs
agentguard cloud summary                  # Analytics summary

# CI / Compliance
agentguard ci-check <session>             # Verify session for violations (CI gate)
agentguard evidence-pr                    # Attach evidence summary to PR
agentguard audit-verify                   # Verify tamper-resistant audit chain
agentguard analytics                      # Violation pattern analysis

# Policy
agentguard policy validate <file>         # Validate a policy file
```

## Agent SDK

Use AgentGuard programmatically in your own tooling:

```bash
npm install @red-codes/core @red-codes/events
```

```typescript
import { createKernel } from '@red-codes/kernel';

const kernel = createKernel({ policy: './agentguard.yaml' });
const decision = await kernel.propose({
  tool: 'Bash',
  command: 'git push origin main',
});
// decision.effect === 'deny'
```

## Compliance Policy Packs

```yaml
# agentguard.yaml
extends:
  - soc2              # CC6.1, CC6.6, CC7.1-7.2
  - hipaa             # 164.312(a)-(e) technical safeguards
  - engineering-standards
```

| Pack | Controls |
|------|----------|
| `soc2` | SOC 2 Type II access controls and change management |
| `hipaa` | HIPAA technical safeguards for PHI protection |
| `engineering-standards` | Balanced dev-friendly guardrails |
| `ci-safe` | Strict CI/CD pipeline protection |
| `enterprise` | Full enterprise governance |
| `strict` | Maximum restriction |
| `open-source` | OSS contribution-friendly defaults |

## Links

| Resource | URL |
|----------|-----|
| Dashboard | [agentguard-cloud-dashboard.vercel.app](https://agentguard-cloud-dashboard.vercel.app) |
| Live Office | [agentguard-cloud-office-sim.vercel.app](https://agentguard-cloud-office-sim.vercel.app) |
| Website | [agentguardhq.github.io/agentguard](https://agentguardhq.github.io/agentguard/) |
| Docs | [docs/](docs/) |
| Architecture | [docs/unified-architecture.md](docs/unified-architecture.md) |
| Hook design | [docs/hook-architecture.md](docs/hook-architecture.md) |
| Event model | [docs/event-model.md](docs/event-model.md) |
| Roadmap | [ROADMAP.md](ROADMAP.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Issues | [github.com/AgentGuardHQ/agentguard/issues](https://github.com/AgentGuardHQ/agentguard/issues) |

## License

[Apache 2.0](LICENSE)
