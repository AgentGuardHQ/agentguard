# Design: `formatPass` State Flag + `requireFormat` Policy Condition

**Date:** 2026-03-15
**Status:** Approved
**Scope:** Policy-driven formatting gate for `git.commit` actions

## Problem

`pnpm format` (Prettier `--check`) fails in CI because the kernel has no mechanism to
enforce formatting before commit. The existing `agentguard.yaml` rule attempts this:

```yaml
- action: git.commit
  effect: deny
  requireTests: true
  reason: Run pnpm format:fix before committing
```

Two bugs:
1. **Wrong field** -- uses `requireTests` but the intent is formatting.
2. **Evaluator ignores `requireTests`** -- `matchConditions()` in `evaluator.ts` checks
   `scope`, `limit`, `branches`, and `persona` but never reads `requireTests`. The
   condition is parsed and stored but has no effect, so the deny rule fires
   unconditionally on all `git.commit` actions.

## Solution

Add a `formatPass` state flag (mirrors `testsPass`) and a `requireFormat` policy
condition (mirrors `requireTests`). Fix the evaluator to actually check both
`requireTests` and `requireFormat`.

### Data Flow

```
Agent runs `pnpm format` -> kernel observes shell.exec -> session tracks formatPass=true
                                                           |
Agent attempts git.commit -> policy evaluator checks requireFormat condition
                                                           |
                          formatPass=true? -> allow    formatPass=false? -> deny
```

## Changes

### 1. `SystemState` -- add `formatPass` field

**`packages/invariants/src/definitions.ts`** (line ~35):
```typescript
formatPass?: boolean;
```

**`packages/core/src/types.ts`** (line ~844):
```typescript
readonly formatPass?: boolean;
```

### 2. `buildSystemState()` -- wire `formatPass`

**`packages/invariants/src/checker.ts`** (line ~69):
```typescript
formatPass: context.formatPass as boolean | undefined,
```

### 3. Policy condition types -- add `requireFormat`

**`packages/policy/src/evaluator.ts`** `PolicyRule.conditions`:
```typescript
requireFormat?: boolean;
```

### 4. Evaluator -- fix `matchConditions()` (bug fix + new feature)

**`packages/policy/src/evaluator.ts`** `matchConditions()`:

After the existing persona check, add:

```typescript
// requireTests: for deny rules, match (= deny applies) when tests have NOT passed
if (conditions.requireTests && intent.metadata?.testsPass !== true) {
  return { matched: true, scopeMatched, limitExceeded, branchMatched, personaMatched };
}
// Skip this deny rule when tests have passed
if (conditions.requireTests && intent.metadata?.testsPass === true) {
  return { matched: false, scopeMatched, limitExceeded, branchMatched, personaMatched };
}

// requireFormat: for deny rules, match (= deny applies) when format has NOT passed
if (conditions.requireFormat && intent.metadata?.formatPass !== true) {
  return { matched: true, scopeMatched, limitExceeded, branchMatched, personaMatched };
}
// Skip this deny rule when format has passed
if (conditions.requireFormat && intent.metadata?.formatPass === true) {
  return { matched: false, scopeMatched, limitExceeded, branchMatched, personaMatched };
}
```

For deny rules, `matched: true` means "this deny rule applies" -- so when the flag
is falsy the deny matches and blocks the action. When the flag is true the condition
doesn't match and the deny rule is skipped, allowing the action through.

### 5. YAML parser -- parse `requireFormat`

**`packages/policy/src/yaml-loader.ts`**:

Add to `YamlRule` interface:
```typescript
requireFormat?: boolean;
```

Add case to `parseRuleField()`:
```typescript
case 'requireFormat':
  rule.requireFormat = val === 'true';
  break;
```

Add to `convertRule()`:
```typescript
if (yamlRule.requireFormat !== undefined) {
  conditions.requireFormat = yamlRule.requireFormat;
  hasConditions = true;
}
```

### 6. MCP server schema -- add `formatPass`

**`apps/mcp-server/src/tools/governance.ts`**:
```typescript
formatPass: z.boolean().optional().describe('Has formatting (Prettier) passed?'),
```

### 7. Default policy -- fix the rule

**`agentguard.yaml`**:
```yaml
# Code quality -- require formatting before commit
- action: git.commit
  effect: deny
  requireFormat: true
  reason: Run pnpm format:fix before committing -- all files must pass Prettier
```

### 8. Intent metadata propagation

`NormalizedIntent.metadata` is a `Record<string, unknown>`. The kernel's `decision.ts`
passes `systemContext` through to `buildSystemState()`. The evaluator reads
`intent.metadata?.formatPass` and `intent.metadata?.testsPass`.

The CLI `guard` command and `claude-hook` command pass session-level context (including
`testsPass`) when calling `engine.evaluate()`. The same mechanism carries `formatPass`.

## How `formatPass` gets set

The CLI session tracker observes `shell.exec` actions. When a command matching
`prettier` or `pnpm format` succeeds (exit code 0), the session sets
`formatPass = true` in the system context for subsequent evaluations.

This mirrors how `testsPass` is tracked -- lightweight, no extra subprocess, just
observing what the agent already does.

## Test Plan

1. **Unit: evaluator** -- `requireFormat: true` denies `git.commit` when `formatPass` is
   falsy; allows when `formatPass: true` in metadata.
2. **Unit: evaluator** -- `requireTests: true` denies `git.commit` when `testsPass` is
   falsy; allows when `testsPass: true` (fixes existing bug).
3. **Unit: YAML loader** -- `requireFormat` parsed correctly from YAML.
4. **Unit: checker** -- `buildSystemState()` includes `formatPass`.
5. **Integration: e2e pipeline** -- `git.commit` action denied when `formatPass` not set,
   allowed when `formatPass: true` passed in context.
6. **Policy validation** -- `agentguard.yaml` loads without errors after change.

## Non-Goals

- No new built-in invariant (this is policy-driven, not baked into the kernel).
- No automatic formatter execution (the kernel observes, it doesn't run formatters).
- No changes to CI workflows (this catches the problem *before* push).
