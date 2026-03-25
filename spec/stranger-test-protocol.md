# Stranger Test Protocol

Validates the zero-context install experience for AgentGuard. A "stranger" is someone who has never seen the project before and follows the README from scratch.

## Prerequisites

- Tester has Node.js >= 18 installed
- Tester has Claude Code (or Copilot CLI) installed
- Tester has NO prior AgentGuard installation (run `npm uninstall -g @red-codes/agentguard` first)
- Tester has a test project with a git repo initialized

## Success Criteria

The entire flow must complete without errors, confusion, or manual workarounds:

1. Install resolves and completes in < 30 seconds
2. `claude-init` wizard runs interactively with clear prompts
3. Governance hooks are active and intercepting tool calls
4. `agentguard status` confirms all components are healthy
5. A dry-run deny correctly blocks a protected-branch push
6. No 404 links, missing files, or confusing error messages

## Test Steps

### Step 1: Install (Global)

```bash
npm install -g @red-codes/agentguard
```

**Pass criteria:**
- [ ] Installs without errors
- [ ] No confusing postinstall output
- [ ] `agentguard --version` prints a version number
- [ ] `agentguard --help` lists available commands

**Friction point taxonomy:** `install-error`, `postinstall-noise`, `missing-binary`

### Step 2: Install (npx alternative)

```bash
npx @red-codes/agentguard --version
```

**Pass criteria:**
- [ ] Resolves and runs without 404
- [ ] Version output matches global install

**Known issue:** `npx agentguard` (unscoped) returns 404 — the package is `@red-codes/agentguard`.

**Friction point taxonomy:** `npx-discovery`, `package-naming`

### Step 3: Initialize Claude Code Integration

```bash
cd /path/to/test-project
agentguard claude-init
```

**Pass criteria:**
- [ ] Interactive wizard launches with mode selection
- [ ] Pack selection prompt appears
- [ ] Role selection prompt appears
- [ ] `.claude/settings.json` is created with PreToolUse hooks
- [ ] `agentguard.yaml` is created with selected mode and pack
- [ ] `scripts/` directory is created with identity scripts
- [ ] `.agentguard-identity` file is created
- [ ] Summary output shows all components as green checkmarks

**Friction point taxonomy:** `wizard-unclear`, `file-creation-error`, `permission-denied`, `path-resolution`

### Step 4: Verify Status

```bash
agentguard status
```

**Pass criteria:**
- [ ] Shows hooks as installed
- [ ] Shows policy file as detected
- [ ] Shows runtime as active (or ready)
- [ ] No error output

**Friction point taxonomy:** `status-error`, `misleading-status`

### Step 5: Test Dry-Run Deny

```bash
echo '{"tool":"Bash","command":"git push origin main"}' | agentguard guard --dry-run
```

**Pass criteria:**
- [ ] Action is correctly classified as `git.push`
- [ ] Policy denies the push to `main`
- [ ] Output clearly shows the deny reason
- [ ] Exit code is non-zero (denial)

**Friction point taxonomy:** `dry-run-error`, `classification-wrong`, `output-unclear`

### Step 6: Live Governance Test

Start a Claude Code session in the test project and attempt a governed action:

```bash
claude "Show me the git status"
```

**Pass criteria:**
- [ ] Claude Code session starts without hook errors
- [ ] Tool calls are intercepted by PreToolUse hook
- [ ] `agentguard inspect --last` shows the governed session
- [ ] Events are persisted to SQLite (`.agentguard/agentguard.db`)

**Friction point taxonomy:** `hook-execution-error`, `session-crash`, `event-missing`

### Step 7: Non-Interactive Setup (CI)

```bash
agentguard claude-init --remove
agentguard claude-init --mode guide --pack essentials
```

**Pass criteria:**
- [ ] `--remove` cleanly removes hooks
- [ ] Non-interactive init completes without prompts
- [ ] Same result as interactive wizard with matching options

**Friction point taxonomy:** `flag-parse-error`, `incomplete-removal`, `non-interactive-fail`

### Step 8: Documentation Verification

- [ ] All links in README.md resolve (no 404s)
- [ ] All CLI commands shown in README work as documented
- [ ] Policy YAML examples are valid (pass `agentguard policy validate`)
- [ ] Architecture diagram matches actual behavior

**Friction point taxonomy:** `broken-link`, `outdated-docs`, `invalid-example`

## Friction Point Classification

| Severity | Definition | Action |
|----------|-----------|--------|
| **Blocker** | Prevents installation or basic usage | Must fix before v3.0 |
| **Major** | Causes confusion but has a workaround | Should fix before v3.0 |
| **Minor** | Cosmetic or edge case | Fix post-v3.0 |

## Known Friction Points (Pre-Test)

| ID | Step | Description | Severity | Status |
|----|------|-------------|----------|--------|
| FP-1 | 2 | `npx agentguard` fails with 404 (unscoped name not on npm) | Blocker | Open (#848) |
| FP-2 | 3,8 | Generated policy comments linked to wrong GitHub URL (`agent-guard` vs `agentguard`) | Major | Fixed (this PR) |
| FP-3 | 3 | Wizard says "21 invariants" instead of 22 | Minor | Fixed (this PR) |
| FP-4 | 3 | Postinstall auto-policy used `monitor` mode but wizard defaults to `guide` | Minor | Fixed (this PR) |
| FP-5 | 1,2 | README Quick Start only showed global install, no npx alternative | Major | Fixed (this PR) |

## Reporting Template

For each friction point discovered during testing:

```
### FP-N: [Short description]
- **Step**: [Which test step]
- **Expected**: [What should happen]
- **Actual**: [What actually happened]
- **Severity**: Blocker / Major / Minor
- **Screenshot/Output**: [paste]
- **Environment**: [OS, Node version, Claude Code version]
```
