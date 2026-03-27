// DeepAgents adapter — normalizes LangChain DeepAgents middleware hook payloads into kernel actions.
// DeepAgents is a Python-based autonomous agent harness; this adapter bridges via subprocess.
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

export interface DeepAgentsHookPayload {
  /** DeepAgents middleware tool name (snake_case: read_file, write_file, run_shell, etc.) */
  tool: string;
  /** Tool input arguments as a plain object */
  input?: Record<string, unknown>;
  /** Present only in after-hook payloads */
  output?: {
    error?: string;
    exitCode?: number;
    stdout?: string;
    stderr?: string;
    result?: unknown;
  };
  /** Session identifier for audit correlation */
  sessionId?: string;
  /** Working directory at time of tool call */
  cwd?: string;
}

/**
 * Resolve a meaningful agent identity from the DeepAgents session ID.
 * Format: 'deepagents' (no session) or 'deepagents:<hash>' (with session).
 */
export function resolveDeepAgentsIdentity(sessionId?: string): string {
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim() === '') {
    return 'deepagents';
  }
  return `deepagents:${simpleHash(sessionId.trim())}`;
}

/**
 * Map DeepAgents middleware tool names to AgentGuard canonical PascalCase tool names.
 * DeepAgents uses snake_case Python-style tool names from its middleware stack.
 * Middleware stack: FileSystem, Shell, SubAgent, Memory, TodoList, Summarization.
 */
const DEEPAGENTS_TOOL_MAP: Record<string, string> = {
  // FileSystem middleware
  read_file: 'Read',
  write_file: 'Write',
  edit_file: 'Edit',
  delete_file: 'Delete',
  list_directory: 'Glob',
  list_files: 'Glob',
  search_files: 'Grep',
  // Shell middleware
  run_shell: 'Bash',
  bash: 'Bash',
  shell: 'Bash',
  execute_command: 'Bash',
  // SubAgent middleware
  spawn_subagent: 'Agent',
  delegate_task: 'Agent',
  run_subagent: 'Agent',
  create_agent: 'Agent',
  // Memory middleware
  memory_store: 'Write',
  memory_write: 'Write',
  memory_retrieve: 'Read',
  memory_read: 'Read',
  memory_search: 'Grep',
  // TodoList middleware
  todo_add: 'Write',
  todo_write: 'Write',
  todo_read: 'Read',
  todo_list: 'Read',
  todo_complete: 'Write',
  // Summarization middleware
  summarize: 'Agent',
  summarize_content: 'Agent',
  // Web / HTTP
  web_fetch: 'WebFetch',
  http_request: 'WebFetch',
};

export function normalizeDeepAgentsAction(
  payload: DeepAgentsHookPayload,
  persona?: AgentPersona
): RawAgentAction {
  const input = payload.input ?? {};
  const sessionId = payload.sessionId || process.env.DEEPAGENTS_SESSION_ID;
  const agent = resolveDeepAgentsIdentity(sessionId);
  const envPersona = personaFromEnv();
  const resolvedPersona = persona || (envPersona as AgentPersona | undefined);

  const canonicalTool = DEEPAGENTS_TOOL_MAP[payload.tool] || payload.tool;

  let baseAction: RawAgentAction;

  switch (payload.tool) {
    case 'write_file':
      baseAction = {
        tool: 'Write',
        file: input.path as string | undefined,
        content: input.content as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents' },
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
          source: 'deepagents',
        },
      };
      break;

    case 'read_file':
      baseAction = {
        tool: 'Read',
        file: input.path as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents' },
      };
      break;

    case 'delete_file':
      baseAction = {
        tool: 'Delete',
        file: input.path as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents' },
      };
      break;

    case 'list_directory':
    case 'list_files':
      baseAction = {
        tool: 'Glob',
        target: (input.pattern ?? input.path) as string | undefined,
        agent,
        metadata: { hook: 'before', path: input.path, sessionId, source: 'deepagents' },
      };
      break;

    case 'search_files':
      baseAction = {
        tool: 'Grep',
        target: input.query as string | undefined,
        agent,
        metadata: { hook: 'before', path: input.path, sessionId, source: 'deepagents' },
      };
      break;

    case 'run_shell':
    case 'bash':
    case 'shell':
    case 'execute_command': {
      const command = (input.command ?? input.cmd) as string | undefined;
      baseAction = {
        tool: 'Bash',
        command,
        target: command?.slice(0, 100),
        agent,
        metadata: {
          hook: 'before',
          cwd: input.cwd ?? payload.cwd,
          sessionId,
          source: 'deepagents',
        },
      };
      break;
    }

    case 'spawn_subagent':
    case 'delegate_task':
    case 'run_subagent':
    case 'create_agent':
    case 'summarize':
    case 'summarize_content':
      baseAction = {
        tool: 'Agent',
        target: (input.prompt ?? input.task ?? input.content) as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents', input },
      };
      break;

    case 'memory_store':
    case 'memory_write':
    case 'todo_add':
    case 'todo_write':
    case 'todo_complete':
      baseAction = {
        tool: 'Write',
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents', input },
      };
      break;

    case 'memory_retrieve':
    case 'memory_read':
    case 'todo_read':
    case 'todo_list':
      baseAction = {
        tool: 'Read',
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents', input },
      };
      break;

    case 'memory_search':
      baseAction = {
        tool: 'Grep',
        target: input.query as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents' },
      };
      break;

    case 'web_fetch':
    case 'http_request':
      baseAction = {
        tool: 'WebFetch',
        target: (input.url ?? input.uri) as string | undefined,
        agent,
        metadata: { hook: 'before', sessionId, source: 'deepagents' },
      };
      break;

    default:
      baseAction = {
        tool: canonicalTool,
        agent,
        metadata: { hook: 'before', input, sessionId, source: 'deepagents' },
      };
      break;
  }

  if (resolvedPersona) {
    return { ...baseAction, persona: resolvedPersona };
  }
  return baseAction;
}

/**
 * Convert a DeepAgents hook payload directly into a vendor-neutral ActionContext.
 * This is the KE-2 adapter mapping: DeepAgents tool-calls → ActionContext.
 */
export function deepAgentsToActionContext(
  payload: DeepAgentsHookPayload,
  persona?: AgentPersona
): ActionContext {
  const rawAction = normalizeDeepAgentsAction(payload, persona);
  return normalizeToActionContext(rawAction, 'deepagents');
}

export async function processDeepAgentsHook(
  kernel: Kernel,
  payload: DeepAgentsHookPayload,
  systemContext: Record<string, unknown> = {},
  persona?: AgentPersona
): Promise<KernelResult> {
  // KE-2: Normalize to ActionContext at the adapter boundary
  const context = deepAgentsToActionContext(payload, persona);
  return kernel.propose(context, systemContext);
}

/**
 * Format kernel result as DeepAgents hook response.
 * DeepAgents before-hooks expect JSON on stdout with a decision field.
 * Empty string (or absence of output) = allow; { decision: 'deny', reason } = block.
 */
export function formatDeepAgentsHookResponse(
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
 * Wrap a DomainEvent in a GovernanceEventEnvelope with deepagents as the source.
 *
 * This is the KE-3 envelope producer for the DeepAgents adapter.
 */
export function deepAgentsToEnvelope(
  event: DomainEvent,
  options?: {
    policyVersion?: string | null;
    decisionCodes?: readonly string[];
    performanceMetrics?: EnvelopePerformanceMetrics;
  }
): GovernanceEventEnvelope {
  return createEnvelope(event, {
    source: 'deepagents',
    policyVersion: options?.policyVersion,
    decisionCodes: options?.decisionCodes,
    performanceMetrics: options?.performanceMetrics,
  });
}
