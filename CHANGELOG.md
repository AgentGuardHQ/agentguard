# Changelog

## 2.4.0 (2026-03-22)

### Features

* **Agent identity system** — session identity prompt, auto-detecting wizard, MCP persona, and worktree enforcement. Agents declare identity (role + driver) for telemetry attribution and persona-scoped policy rules. Set via `--agent-name` flag or interactive prompt (#715, #714, #713, #712, #709, #707, #706)
* **Pre-push branch protection** — enforce branch protection rules from `agentguard.yaml` via git pre-push hooks, installed automatically by `agentguard claude-init` (#704)
* **Capability grants enforcement** — enforce capability grants before adapter execution (#681)
* **Cloud credential storage** — store cloud credentials in project `.env` instead of global config (#679, #678)

### Bug Fixes

* **Security: governance bypass vectors** — closed three governance bypass vectors (#696)
* **ESM bundle fix** — added `createRequire` shim and updated help text for ESM compatibility (#703)

### Other

* **Site redesign** — floating nav, dark/light toggle, social proof, newsletter signup (#708)
* **Messaging pivot** — governance-first to outcome-first positioning (#701)
* **CLI wizard docs** — YAML policy format documentation updated (#697)

## 1.0.0 (2026-03-07)


### Features

* add Claude Code integration and one-liner onboarding ([8c712af](https://github.com/jpleva91/BugMon/commit/8c712afe412a0b2e4b53c6b504b909c91c42bb40))
* audit and improve JS tooling across CI, build, CLI, and monorepo ([18c256e](https://github.com/jpleva91/BugMon/commit/18c256eaf284b2c125bef83daf313b11e5757808))
* complete CLI MVP architecture — add init, demo, resolve, heal, boss battles, auto-walk ([1c48cb5](https://github.com/jpleva91/BugMon/commit/1c48cb52ad86d623b7d373d8d906e02b1ce7ef49))


### Bug Fixes

* correct bundle size claims to match actual build output ([6474fd5](https://github.com/jpleva91/BugMon/commit/6474fd5f1fc98d435c8172cb37bf60784ed8f471))
