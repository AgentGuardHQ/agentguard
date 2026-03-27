// OpenCode adapter — normalizes opencode.ai agent hook payloads into kernel actions.
// Handles before and after tool execution hooks from OpenCode's plugin system.
// Payload format (before): { tool, input (object), sessionId?, cwd? }
// Response format (before): empty = allow, JSON { decision: 'deny', reason } = block

import type { RawAgentAction } from '@red-codes/kernel';
import { normalizeToActionContext } from '@red-codes/kernel';
import type { Kernel, KernelResult } from '@red-codes/kernel';
import type {
  AgentPersona,
  ActionContext,
  GovernanceEventEnvelope,
  DomainEvent,
  EnvelopePerformanceMetrics,
  Suggestion,
} from '@red-codes/core';
import type { HookResponseOptions } from './claude-code.js';
import { simpleHash, personaFromEnv } from '@red-codes/core';
import { createEnvelope } from '@red-codes/events';

export interface OpenCodeHookPayload {
  /** OpenCode tool name (snake_case: write_file, read_file, shell, etc.) */
  tool: string;
  /** Tool input arguments as a plain object */
  input?: Record<string, unknown>;
  /** Present only in after-hook payloads */
  output?: {
    error?: string;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
  };
  /** Session identifier for audit correlation */
  sessionId?: string;
  /** Working directory at time of tool call */
  cwd?: string;
}

/**
 * Resolve a meaningful agent identity from the OpenCode session ID.
 * Format: 'opencode' (no session) or 'opencode:<hash>' (with session).
 */
export function resolveOpenCodeAgentIdentity(sessionId?: string): string {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return 'opencode';
  }
  return `opencode:${simpleHash(sessionId.trim())}`;
}

/**
 * Map OpenCode tool names to AgentGuard canonical PascalCase tool names.
 * OpenCode uses snake_case tool names.
 */
const OPENCODE_TOOL_MAP: Record<string, string> = {
  shell: 'Bash',
  write_file: 'Write',
  read_file: 'Read',
  edit_file: 'Edit',
  search: 'Grep',
  list_files: 'Glob',
  web_fetch: 'WebFetch',
  task: 'Agent',
  spawn_agent: 'Agent',
};

export function normalizeOpenCodeAction(
  payload: OpenCodeHookPayload,
  persona?: AgentPersona
): RawAgentAction {
  const input = payload.input ?? {};
  const sessionId = payload.sessionId || process.env.OPENCODE_SESSION_ID;
  const agent = resolveOpenCodeAgentIdentity(sessionId);
  const envPersona = personaFromEnv();
  const resolvedPersona = persona || (envPersona as AgentPersona | undefined);

  const canonicalTool = OPENCODE_TOOL_MAP[payload.tool] || payload.tool;

  let baseAction: RawAgentAction;

  switch (payload.tool) {
    case 'write_file':
      baseAction = {
        tool: 'Write',
        file: input.path as string | undefined,
        content: input.content as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'opencode' },
      };
      break;

    case 'edit_file':
      baseAction = {
        tool: 'Edit',
        file: input.path as string | undefined,
        content: (input.new_content ?? input.content) as string | undefined,
        agent,
        metadata: {
          hook: 'before',
          old_content: input.old_content,
          sessionId,
          source: 'opencode',
        },
      };
      break;

    case 'read_file':
      baseAction = {
        tool: 'Read',
        file: input.path as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'opencode' },
      };
      break;

    case 'shell': {
      const command = input.command as string | undefined;
      baseAction = {
        tool: 'Bash',
        command,
        target: command?.slice(0, 100),
        agent,
        metadata: {
          hook: 'before',
          cwd: input.cwd ?? payload.cwd,
          sessionId,
          source: 'opencode',
        },
      };
      break;
    }

    case 'search':
      baseAction = {
        tool: 'Grep',
        target: input.query as string | undefined,
        agent,
        metadata: { hook: 'before', path: input.path, sessionId, source: 'opencode' },
      };
      break;

    case 'list_files':
      baseAction = {
        tool: 'Glob',
        target: input.pattern as string | undefined,
        agent,
        metadata: { hook: 'before', path: input.path, sessionId, source: 'opencode' },
      };
      break;

    case 'web_fetch':
      baseAction = {
        tool: 'WebFetch',
        target: input.url as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'opencode' },
      };
      break;

    case 'task':
    case 'spawn_agent':
      baseAction = {
        tool: 'Agent',
        target: (input.prompt as string | undefined)?.slice(0, 100),
        agent,
        metadata: { hook: 'before', prompt: input.prompt, sessionId, source: 'opencode' },
      };
      break;

    default:
      baseAction = {
        tool: canonicalTool,
        agent,
        metadata: { hook: 'before', input, sessionId, source: 'opencode' },
      };
      break;
  }

  if (resolvedPersona) {
    return { ...baseAction, persona: resolvedPersona };
  }
  return baseAction;
}

/**
 * Convert an OpenCode hook payload directly into a vendor-neutral ActionContext.
 * This is the KE-2 adapter mapping: OpenCode tool-calls → ActionContext.
 */
export function openCodeToActionContext(
  payload: OpenCodeHookPayload,
  persona?: AgentPersona
): ActionContext {
  const rawAction = normalizeOpenCodeAction(payload, persona);
  return normalizeToActionContext(rawAction, 'opencode');
}

export async function processOpenCodeHook(
  kernel: Kernel,
  payload: OpenCodeHookPayload,
  systemContext: Record<string, unknown> = {},
  persona?: AgentPersona
): Promise<KernelResult> {
  // KE-2: Normalize to ActionContext at the adapter boundary
  const context = openCodeToActionContext(payload, persona);
  return kernel.propose(context, systemContext);
}

/**
 * Format kernel result as OpenCode hook response.
 * OpenCode before-hooks expect JSON on stdout with a decision field.
 * Empty string (or absence of output) = allow; { decision: 'deny', reason } = block.
 *
 * Extended with optional `suggestion` and `options` params for corrective enforcement modes.
 */
export function formatOpenCodeHookResponse(
  result: KernelResult,
  suggestion?: Suggestion | null,
  options?: HookResponseOptions
): string {
  const mode = options?.mode;

  // Educate mode: allow the action, write suggestion to stderr
  if (mode === 'educate' && suggestion) {
    const parts = [`[AgentGuard educate] ${suggestion.message}`];
    if (suggestion.correctedCommand) {
      parts.push(`Suggested command: ${suggestion.correctedCommand}`);
    }
    process.stderr.write(parts.join('\n') + '\n');
    return '';
  }

  // Guide mode: block with corrective suggestion
  if (mode === 'guide' && !result.allowed) {
    const attempt = options?.retryAttempt ?? 0;
    const maxRetries = options?.maxRetries ?? 3;

    if (attempt > maxRetries) {
      return JSON.stringify({
        decision: 'deny',
        reason: `Action blocked after ${attempt} correction attempts — ask the human for help`,
      });
    }

    const reason = result.decision?.decision?.reason ?? 'Action denied';
    const parts = [reason];
    if (suggestion) {
      parts.push(`Suggestion: ${suggestion.message}`);
      if (suggestion.correctedCommand) {
        parts.push(`Corrected command: ${suggestion.correctedCommand}`);
      }
    }
    parts.push(`(attempt ${attempt}/${maxRetries})`);

    return JSON.stringify({ decision: 'deny', reason: parts.join(' | ') });
  }

  // Enforce mode / Monitor mode / no options: standard behavior
  if (!result.allowed) {
    const reason = result.decision?.decision?.reason ?? 'Action denied by AgentGuard policy';
    const violations = result.decision?.violations ?? [];
    const parts = [reason];
    if (violations.length > 0) {
      parts.push(`Violations: ${violations.map((v: { name: string }) => v.name).join(', ')}`);
    }
    return JSON.stringify({ decision: 'deny', reason: parts.join(' | ') });
  }
  // Empty string = allow
  return '';
}

/**
 * Wrap a DomainEvent in a GovernanceEventEnvelope with OpenCode as the source.
 *
 * This is the KE-3 envelope producer for the OpenCode adapter.
 */
export function openCodeToEnvelope(
  event: DomainEvent,
  options?: {
    policyVersion?: string | null;
    decisionCodes?: readonly string[];
    performanceMetrics?: EnvelopePerformanceMetrics;
  }
): GovernanceEventEnvelope {
  return createEnvelope(event, {
    source: 'opencode',
    policyVersion: options?.policyVersion,
    decisionCodes: options?.decisionCodes,
    performanceMetrics: options?.performanceMetrics,
  });
}
