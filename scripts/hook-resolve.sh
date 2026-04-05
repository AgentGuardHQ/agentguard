#!/bin/bash
# hook-resolve.sh — Universal AgentGuard binary resolver for all drivers.
# Ensures governance hooks + telemetry work in worktrees, local installs, and global installs.
#
# Usage (from any hook config):
#   source scripts/hook-resolve.sh
#   eval "$AGENTGUARD_BIN claude-hook"   # or copilot-hook, codex-hook, gemini-hook
#
# Sets:
#   AGENTGUARD_BIN — shell command prefix that works everywhere (may include cd)
#   _AG_MAIN_ROOT  — path to the main (non-worktree) checkout

# Resolve project root
_AG_PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Source persona env if available
if [ -f "$_AG_PROJECT_ROOT/.agentguard/persona.env" ]; then
  set -a; source "$_AG_PROJECT_ROOT/.agentguard/persona.env"; set +a
fi

# Source workspace .env for telemetry config (API key, cloud endpoint, tenant ID)
_AG_WS_ROOT="$HOME/agentguard-workspace"
if [ -f "$_AG_WS_ROOT/.env" ]; then
  set -a; source "$_AG_WS_ROOT/.env"; set +a
fi

# Find the main worktree root (where node_modules lives)
_AG_MAIN_ROOT="$(git worktree list --porcelain 2>/dev/null | sed -n '1s/^worktree //p')"
_AG_IN_WORKTREE=0
if [ -n "$_AG_MAIN_ROOT" ] && [ "$_AG_MAIN_ROOT" != "$_AG_PROJECT_ROOT" ]; then
  _AG_IN_WORKTREE=1
fi

# Resolve binary — priority: local dev > global install > main worktree fallback
AGENTGUARD_BIN=""

# 1. Global install (npm install -g @red-codes/agentguard)
#    Works in any directory — no worktree issues.
if command -v agentguard &>/dev/null; then
  AGENTGUARD_BIN="agentguard"
fi

# 2. Local dev (apps/cli/dist/bin.js in current or main worktree)
#    ESM resolution requires CWD to be where node_modules exists.
#    In worktrees, we MUST cd to the main root before running the binary.
if [ -f "$_AG_PROJECT_ROOT/apps/cli/dist/bin.js" ]; then
  if [ "$_AG_IN_WORKTREE" -eq 1 ] && [ -n "$_AG_MAIN_ROOT" ]; then
    # Worktree: run from main root for ESM package resolution
    AGENTGUARD_BIN="cd $_AG_MAIN_ROOT && node apps/cli/dist/bin.js"
  else
    AGENTGUARD_BIN="node $_AG_PROJECT_ROOT/apps/cli/dist/bin.js"
  fi
elif [ "$_AG_IN_WORKTREE" -eq 1 ] && [ -n "$_AG_MAIN_ROOT" ] && [ -f "$_AG_MAIN_ROOT/apps/cli/dist/bin.js" ]; then
  # Worktree doesn't have the binary but main root does
  AGENTGUARD_BIN="cd $_AG_MAIN_ROOT && node apps/cli/dist/bin.js"
fi

# 3. Probe: verify the resolved binary actually works
if [ -n "$AGENTGUARD_BIN" ]; then
  if ! eval "$AGENTGUARD_BIN --version" >/dev/null 2>&1; then
    # Binary fails — try main worktree as last resort
    if [ -n "$_AG_MAIN_ROOT" ] && [ -f "$_AG_MAIN_ROOT/apps/cli/dist/bin.js" ]; then
      AGENTGUARD_BIN="cd $_AG_MAIN_ROOT && node apps/cli/dist/bin.js"
      if ! eval "$AGENTGUARD_BIN --version" >/dev/null 2>&1; then
        AGENTGUARD_BIN=""  # give up, bootstrap exemption will handle it
      fi
    else
      AGENTGUARD_BIN=""
    fi
  fi
fi

export AGENTGUARD_BIN
