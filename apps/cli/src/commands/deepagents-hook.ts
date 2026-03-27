// AgentGuard DeepAgents hook — before-tool governance + after-tool error monitoring.
// before: routes actions through the kernel for policy/invariant enforcement.
// after: reports shell stderr errors (informational only).
// Always exits 0 — hooks must never crash the agent.
// Supports both JSONL (default) and SQLite storage backends via --store flag or AGENTGUARD_STORE env var.
// Cloud telemetry: sends governance events to the AgentGuard dashboard when AGENTGUARD_API_KEY is set.

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, parse as parsePath, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { DeepAgentsHookPayload } from '@red-codes/adapters';
import type { LoadedPolicy } from '@red-codes/policy';
import type { CloudSinkBundle } from '@red-codes/telemetry';

// --- Session state: persist formatPass/testsPass/writtenFiles across hook invocations
interface DeepAgentsSessionState extends Record<string, unknown> {
  formatPass?: boolean;
  testsPass?: boolean;
  writtenFiles?: string[];
}

function sessionStatePath(sessionId: string): string {
  return join(tmpdir(), 'agentguard', `deepagents-session-${sessionId}.json`);
}

function readSessionState(sessionId: string | undefined): DeepAgentsSessionState {
  const key = sessionId || String(process.ppid) || 'default';
  try {
    return JSON.parse(readFileSync(sessionStatePath(key), 'utf8')) as DeepAgentsSessionState;
  } catch {
    return {};
  }
}

function writeSessionState(
  sessionId: string | undefined,
  patch: Partial<DeepAgentsSessionState>
): void {
  const key = sessionId || String(process.ppid) || 'default';
  try {
    mkdirSync(join(tmpdir(), 'agentguard'), { recursive: true });
    const current = readSessionState(key);
    writeFileSync(sessionStatePath(key), JSON.stringify({ ...current, ...patch }));
  } catch {
    // Non-fatal
  }
}

/**
 * Load AGENTGUARD_* variables from the nearest .env file, walking up from cwd.
 * Only sets variables not already in process.env (env vars take precedence).
 */
function loadProjectEnv(): void {
  let dir = process.env.AGENTGUARD_WORKSPACE || process.cwd();
  const { root } = parsePath(dir);

  while (dir !== root) {
    const envPath = join(dir, '.env');
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx < 0) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          if (!key.startsWith('AGENTGUARD_')) continue;
          if (process.env[key] !== undefined) continue;
          let value = trimmed.slice(eqIdx + 1).trim();
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          process.env[key] = value;
        }
      } catch {
        // Non-fatal — continue without .env
      }
      return;
    }
    dir = dirname(dir);
  }
}

/**
 * Extract the target file path from a DeepAgents hook payload for path-aware policy resolution.
 */
function extractTargetPath(payload: DeepAgentsHookPayload): string | undefined {
  const input = payload.input ?? {};

  if (input.path && typeof input.path === 'string') {
    return input.path;
  }
  if (input.file && typeof input.file === 'string') {
    return input.file;
  }

  // Shell: look for absolute paths in the command
  const command = input.command ?? input.cmd;
  if (typeof command === 'string') {
    const match = command.match(/(?:^|\s)(\/(?!dev\/null)[^\s"']+|[A-Z]:\\[^\s"']+)/);
    if (match) return match[1];
  }

  return undefined;
}

export async function deepAgentsHook(hookType?: string, extraArgs: string[] = []): Promise<void> {
  loadProjectEnv();

  try {
    const input = await readStdin();
    if (!input) process.exit(0);

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(input) as Record<string, unknown>;
    } catch {
      process.exit(0);
      return;
    }

    // Determine hook type: explicit CLI arg > inference from output presence
    const isBeforeHook = hookType === 'before' || (!hookType && !data.output);

    if (isBeforeHook) {
      const payload = parseDeepAgentsPayload(data);
      const denied = await handleBeforeHook(payload, extraArgs);
      if (denied) {
        process.exit(0);
      }
    } else {
      handleAfterHook(data);
    }
  } catch {
    // Swallow all errors — hooks must never fail (fail-open)
  }
  process.exit(0);
}

/** Parse raw JSON data into DeepAgentsHookPayload. */
function parseDeepAgentsPayload(data: Record<string, unknown>): DeepAgentsHookPayload {
  const sessionId =
    (data.sessionId as string | undefined) ||
    (data.session_id as string | undefined) ||
    process.env.DEEPAGENTS_SESSION_ID ||
    undefined;

  return {
    tool: (data.tool as string) || 'unknown',
    input: (data.input as Record<string, unknown> | undefined) ?? {},
    sessionId,
    cwd: data.cwd as string | undefined,
  };
}

/** Returns true if the action was denied. */
async function handleBeforeHook(
  payload: DeepAgentsHookPayload,
  cliArgs: string[]
): Promise<boolean> {
  const { processDeepAgentsHook, formatDeepAgentsHookResponse } =
    await import('@red-codes/adapters');
  const { createKernel } = await import('@red-codes/kernel');
  const { DEFAULT_INVARIANTS } = await import('@red-codes/invariants');
  const { loadPolicyDefs, findPolicyForPath } = await import('../policy-resolver.js');
  const { resolveStorageConfig, createStorageBundle } = await import('@red-codes/storage');

  const targetPath = extractTargetPath(payload);
  let projectRoot: string | undefined;

  if (targetPath) {
    const policyResult = findPolicyForPath(targetPath);
    if (policyResult) {
      projectRoot = policyResult.projectRoot;
    }
  }

  let policyDefs: unknown[] = [];
  try {
    policyDefs = loadPolicyDefs(undefined, targetPath);
  } catch (policyErr) {
    process.stderr.write(
      `agentguard: warning — no policy loaded (${policyErr instanceof Error ? policyErr.message : 'unknown error'}). All actions will be allowed.\n`
    );
  }

  const runId = `hook_${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 8)}`;

  const storageConfig = resolveStorageConfig(cliArgs);
  let storage: Awaited<ReturnType<typeof createStorageBundle>> | null = null;
  let eventSink: import('@red-codes/core').EventSink | undefined;
  let decisionSink: import('@red-codes/core').DecisionSink | undefined;

  try {
    storage = await createStorageBundle(storageConfig);
    eventSink = storage.createEventSink(runId);
    decisionSink = storage.createDecisionSink(runId);
  } catch {
    // Sink creation failure is non-fatal
  }

  let cloudSinks: CloudSinkBundle | null = null;
  try {
    const { createCloudSinks } = await import('@red-codes/telemetry');
    const { loadIdentity, resolveMode } = await import('@red-codes/telemetry-client');
    const identity = loadIdentity();
    const telemetryMode = resolveMode(identity);
    if (telemetryMode !== 'off') {
      const apiKey = process.env.AGENTGUARD_API_KEY ?? identity?.enrollment_token;
      const cloudSessionId = payload.sessionId || runId;
      cloudSinks = await createCloudSinks({
        mode: telemetryMode,
        serverUrl:
          process.env.AGENTGUARD_TELEMETRY_URL ??
          identity?.server_url ??
          'https://telemetry.agentguard.dev',
        runId: cloudSessionId,
        agentId: resolveAgentIdentity() ?? 'deepagents',
        installId: identity?.install_id,
        apiKey,
        flushIntervalMs: 0,
      });
    }
  } catch {
    // Cloud telemetry setup failure is non-fatal
  }

  const allEventSinks = [eventSink, cloudSinks?.eventSink].filter(
    Boolean
  ) as import('@red-codes/core').EventSink[];
  const allDecisionSinks = [decisionSink, cloudSinks?.decisionSink].filter(
    Boolean
  ) as import('@red-codes/core').DecisionSink[];

  if (storageConfig.jsonlPath) {
    const { createJsonlEventSink, createJsonlDecisionSink } = await import('@red-codes/storage');
    allEventSinks.push(createJsonlEventSink(storageConfig.jsonlPath, runId));
    allDecisionSinks.push(createJsonlDecisionSink(storageConfig.jsonlPath, runId));
  }

  const disabledIds = new Set<string>();
  for (const def of policyDefs) {
    const di = (def as LoadedPolicy).disabledInvariants;
    if (Array.isArray(di)) {
      for (const id of di) {
        disabledIds.add(id);
      }
    }
  }

  let invariants: typeof DEFAULT_INVARIANTS | undefined;
  if (disabledIds.size > 0) {
    invariants = DEFAULT_INVARIANTS.filter((inv) => !disabledIds.has(inv.id));
  }

  if (policyDefs.length === 0) {
    process.stderr.write(
      '[agentguard] WARNING: No policies loaded — running in fail-open mode. All unmatched actions will be allowed.\n'
    );
  }

  const kernel = createKernel({
    runId,
    policyDefs,
    dryRun: true,
    evaluateOptions: { defaultDeny: policyDefs.length > 0 },
    sinks: allEventSinks,
    decisionSinks: allDecisionSinks,
    ...(invariants ? { invariants } : {}),
  });

  const sessionKey = payload.sessionId || runId;
  if (storage?.sessions) {
    storage.sessions.start(sessionKey, 'deepagents-hook', {
      storageBackend: storageConfig.backend,
    });
  }

  const { personaFromEnv: readPersonaFromEnv, resolvePersona } = await import('@red-codes/core');
  const envPersona = readPersonaFromEnv();
  const resolvedPersona = envPersona ? resolvePersona(undefined, envPersona) : undefined;

  const sessionState = readSessionState(payload.sessionId);
  const enrichedState: Record<string, unknown> = { ...sessionState };
  if (sessionState.writtenFiles && sessionState.writtenFiles.length > 0) {
    enrichedState.sessionWrittenFiles = sessionState.writtenFiles;
  }

  const result = await processDeepAgentsHook(kernel, payload, enrichedState, resolvedPersona);
  kernel.shutdown();

  // Track file writes in session state
  if (
    result.allowed &&
    (payload.tool === 'write_file' || payload.tool === 'edit_file') &&
    payload.input?.path
  ) {
    const filePath = payload.input.path as string;
    const existing = sessionState.writtenFiles ?? [];
    if (!existing.includes(filePath)) {
      writeSessionState(payload.sessionId, { writtenFiles: [...existing, filePath] });
    }
  }

  if (cloudSinks) {
    try {
      const flushTimeout = new Promise<void>((resolve) => setTimeout(resolve, 2000));
      await Promise.race([cloudSinks.flush(), flushTimeout]);
    } catch {
      // Non-fatal
    }
    cloudSinks.stop();
  }

  if (storage) {
    try {
      storage.close();
    } catch {
      // Non-fatal
    }
  }

  if (!result.allowed) {
    const { resolveInvariantMode } = await import('../mode-resolver.js');
    const { buildModeConfig } = await import('../policy-resolver.js');
    const modeConfig = buildModeConfig(policyDefs as LoadedPolicy[], projectRoot);
    const violations = result.decision?.violations ?? [];

    let shouldEnforce = false;
    const monitorWarnings: string[] = [];

    if (violations.length > 0) {
      for (const v of violations) {
        const mode = resolveInvariantMode(v.invariantId, modeConfig);
        if (mode === 'enforce') {
          shouldEnforce = true;
          break;
        }
        monitorWarnings.push(
          `\u26A0 agentguard: ${v.invariantId} triggered \u2014 ${v.name} (monitor mode)`
        );
      }
    } else {
      const mode = resolveInvariantMode(null, modeConfig);
      if (mode === 'enforce') {
        shouldEnforce = true;
      } else {
        const reason = result.decision?.decision?.reason ?? 'Action denied by policy';
        monitorWarnings.push(`\u26A0 agentguard: policy denied \u2014 ${reason} (monitor mode)`);
      }
    }

    if (shouldEnforce) {
      const response = formatDeepAgentsHookResponse(result);
      if (response) {
        process.stdout.write(response);
      }
      return true;
    }

    for (const warning of monitorWarnings) {
      process.stderr.write(warning + '\n');
    }
    return false;
  }
  return false;
}

function handleAfterHook(data: Record<string, unknown>): void {
  const toolName = (data.tool as string) || '';
  const isShellTool =
    toolName === 'run_shell' ||
    toolName === 'bash' ||
    toolName === 'shell' ||
    toolName === 'execute_command';
  if (!isShellTool) return;

  const output = (data.output || {}) as Record<string, unknown>;
  const stderr = (output.stderr || '') as string;
  const exitCode = (output.exitCode ?? output.exit_code ?? -1) as number;

  if (exitCode !== 0 && stderr.trim()) {
    process.stderr.write('\n');
    process.stderr.write(
      `  \x1b[1m\x1b[31mError detected:\x1b[0m ${stderr.trim().split('\n')[0].slice(0, 80)}\n`
    );
    process.stderr.write('\n');
  }

  // Track format/test pass for session state
  const sessionId =
    (data.sessionId as string | undefined) ||
    (data.session_id as string | undefined) ||
    process.env.DEEPAGENTS_SESSION_ID ||
    undefined;
  const input = (data.input ?? {}) as Record<string, unknown>;
  const command = typeof input.command === 'string' ? input.command : '';

  if (exitCode === 0 && sessionId) {
    const isFormatCmd =
      command.includes('prettier') ||
      command.includes('format:fix') ||
      command.includes('format --write');
    if (isFormatCmd) {
      writeSessionState(sessionId, { formatPass: true });
    }
    const isTestCmd =
      command.includes('vitest') || command.includes('jest') || command.includes('pnpm test');
    if (isTestCmd) {
      writeSessionState(sessionId, { testsPass: true });
    }
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let input = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk: string) => {
      input += chunk;
    });
    process.stdin.on('end', () => resolve(input));
    process.stdin.on('error', () => resolve(''));
    if (process.stdin.isTTY) resolve('');
  });
}

/** Resolve agent identity from .agentguard-identity file or AGENTGUARD_AGENT_NAME env var. */
function resolveAgentIdentity(): string | null {
  const envName = process.env.AGENTGUARD_AGENT_NAME;
  if (envName) return envName;

  const roots = [process.env.AGENTGUARD_WORKSPACE, process.cwd()].filter(Boolean) as string[];
  for (const root of roots) {
    try {
      const content = readFileSync(join(root, '.agentguard-identity'), 'utf8').trim();
      if (content) return content;
    } catch {
      // File doesn't exist or unreadable
    }
  }

  return null;
}
