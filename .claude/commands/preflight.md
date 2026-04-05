---
description: "Preflight — design-before-you-build gate. Runs automatically before any implementation task."
---

# Preflight Protocol

Before writing any code, you MUST complete these 5 phases in order. Do NOT create, modify, or delete any files until Phase 5.

## Phase 1: Orient

Read relevant files, docs, and recent commits to understand the current state. Use Read, Glob, Grep, and Bash (for git log) to explore. Build a mental model before proposing anything.

- For a bug fix: read the failing code, related tests, recent commits
- For a new feature: read architecture docs, similar features, the target module
- For a refactor: read all code that will change and all code that depends on it

State what you found: "I read X, Y, Z. The current state is..."

## Phase 2: Clarify

Ask the user questions until purpose, constraints, and success criteria are clear.

- Ask one question at a time
- Prefer multiple choice when possible
- Focus on: purpose, constraints, success criteria, edge cases
- Skip only if the task is fully specified with zero ambiguity

State the understanding: "The goal is X, constrained by Y, success means Z."

## Phase 3: Approach

Propose 2-3 approaches with trade-offs and your recommendation.

- For complex tasks: present architectural trade-offs, explain your recommendation
- For trivial tasks: one approach with brief rationale is fine

State the chosen approach: "I recommend approach A because..."

## Phase 4: Confirm

Present your plan to the user and wait for explicit approval.

- Summarize: what files you'll touch, what you'll change, how you'll test it
- Wait for the user to say "go", "yes", "do it", or similar
- If they suggest changes, revise and re-confirm
- Do NOT proceed without approval

## Phase 5: Execute

Now write the code. This is the first phase where you may create, modify, or delete files.

## Rules

- **Phases 1-4 produce zero code changes.** Reading files is encouraged. Writing files is not.
- **Task-scoped.** Each new task triggers a fresh Preflight pass. Continuing work on the same task does not re-trigger.
- **Scales down, never off.** Even a one-line fix goes through all 5 phases — each can be a single sentence for trivial tasks.
