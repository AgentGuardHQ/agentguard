# Skill: Claim Issue

Claim a discovered GitHub issue for the current agent session. Updates labels, creates a working branch, and posts a start comment.

## Agent Identity

Set agent name for cloud telemetry:

```bash
export AGENTGUARD_AGENT_NAME="claim-issue"
```

## Prerequisites

Run `discover-next-issue` first to identify the issue number.

## Steps

### 1. Update Issue Status

Remove the pending label and mark as in-progress:

```bash
gh issue edit <ISSUE_NUMBER> --remove-label "status:pending" --add-label "status:in-progress"
```

If label update fails because the label does not exist on the repository, create it first:

```bash
gh label create "status:in-progress" --color "0E8A16" --description "Agent is actively working on this"
```

Then retry the edit command.

### 2. Determine Branch Name

Map the task type label to a branch prefix:

| Label | Branch Prefix |
|-------|--------------|
| `task:implementation` | `agent/implementation/issue-<N>` |
| `task:bug-fix` | `agent/bugfix/issue-<N>` |
| `task:refactor` | `agent/refactor/issue-<N>` |
| `task:test-generation` | `agent/tests/issue-<N>` |
| `task:documentation` | `agent/docs/issue-<N>` |
| (default) | `agent/task/issue-<N>` |

### 3. Worktree Safety Check

**CRITICAL:** Before any branch operations, verify you are in a git worktree — NOT the main working directory. Run:

```bash
MAIN_ROOT=$(git worktree list --porcelain | head -1 | sed 's/worktree //')
CURRENT_ROOT=$(git rev-parse --show-toplevel)
if [ "$MAIN_ROOT" = "$CURRENT_ROOT" ]; then
  echo "FATAL: You are in the MAIN working directory, not a worktree. STOP — do not create or switch branches here."
  exit 1
fi
```

If this check fails, **STOP immediately**. Do not proceed. You must be running in a worktree (e.g., `.claude/worktrees/<name>/`).

### 4. Create Working Branch

```bash
git checkout -b agent/<type>/issue-<ISSUE_NUMBER>
```

If the branch already exists (from a previous attempt):

```bash
git checkout agent/<type>/issue-<ISSUE_NUMBER>
```

### 5. Verify Branch

```bash
git branch --show-current
```

Confirm the output matches the expected branch name.

### 6. Post Start Comment

```bash
gh issue comment <ISSUE_NUMBER> --body "**AgentGuard Agent** — work started.

- **Branch**: \`agent/<type>/issue-<ISSUE_NUMBER>\`
- **Governance**: Active (PreToolUse hooks enforcing policy)
- **Started**: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

## Rules

- If the branch already exists, check it out instead of creating a new one
- Always verify you are on the correct branch before proceeding
- If the issue is already `status:in-progress`, check if it was previously assigned — if so, resume work on the existing branch rather than starting fresh
- Do not claim more than one issue at a time
