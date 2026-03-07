# Skill: BugMon Status

Check your BugMon party, BugDex, and bug hunter stats from within Claude Code.

## Steps

### 1. Gather Status

Run these commands and collect their output:

```bash
bugmon party
bugmon dex
bugmon stats
```

If `bugmon` is not on PATH, use `npx bugmon` instead.

### 2. Present Summary

Display a formatted summary of the player's state:
- Party members with names, types, and HP
- BugDex completion (seen / total)
- Bug hunter level and XP progress
- Recent encounters if available

### 3. Suggest Actions

Based on the current state, suggest next steps:
- If party members are injured: suggest `bugmon heal`
- If there are unresolved encounters: suggest `bugmon resolve` or `bugmon resolve --all`
- If BugDex is incomplete: suggest `bugmon watch --cache -- <their dev command>` to find more
- If Claude Code hook is not set up: suggest `bugmon claude-init` for automatic encounters
- If git hooks are not installed: suggest `bugmon init` for evolution tracking
