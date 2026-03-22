// CLI command: agentguard review — code review powered by code-review-graph.
// Shells out to the code-review-graph Python CLI for structural analysis,
// parses results, and emits CodeReviewed events into the AgentGuard event stream.

import { execSync } from 'node:child_process';
import { parseArgs } from '../args.js';
import { bold, color, dim } from '../colors.js';
import type { StorageConfig } from '@red-codes/storage';

/** Check if code-review-graph is available on the system PATH. */
function isInstalled(): boolean {
  try {
    execSync('code-review-graph --version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/** Run a code-review-graph CLI command and return stdout. */
function runCrg(subcommand: string, extraArgs: string[] = []): string {
  const args = [subcommand, ...extraArgs].join(' ');
  return execSync(`code-review-graph ${args}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 120_000,
  });
}

/** Try to parse JSON output from code-review-graph, falling back to raw text. */
function tryParseJson(output: string): Record<string, unknown> | null {
  try {
    return JSON.parse(output) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function emitCodeReviewedEvent(
  runId: string,
  reviewData: Record<string, unknown>,
  storageConfig?: StorageConfig
): Promise<void> {
  const { createEvent, CODE_REVIEWED } = await import('@red-codes/events');
  const { createStorageBundle } = await import('@red-codes/storage');

  const event = createEvent(CODE_REVIEWED, {
    runId,
    source: 'code-review-graph',
    ...reviewData,
  });

  const config: StorageConfig = storageConfig ?? { backend: 'sqlite' as const };
  let storage: Awaited<ReturnType<typeof createStorageBundle>> | null = null;
  try {
    storage = await createStorageBundle(config);
    const sink = storage.createEventSink(runId);
    sink.write(event);
    storage.close();
  } catch {
    // Storage failure is non-fatal
    if (storage) {
      try {
        storage.close();
      } catch {
        // ignore
      }
    }
  }
}

// --- Subcommands ---

async function handleStatus(): Promise<number> {
  if (!isInstalled()) {
    process.stderr.write(
      '\n' +
        bold('  code-review-graph is not installed.\n\n') +
        '  Install it with:\n' +
        `    ${color('pip install code-review-graph', 'cyan')}\n\n` +
        '  Or via Claude Code plugin marketplace:\n' +
        `    ${color('claude plugin marketplace add tirth8205/code-review-graph', 'cyan')}\n\n`
    );
    return 1;
  }

  process.stderr.write('\n' + bold('  code-review-graph') + dim(' — installed\n\n'));

  try {
    const output = runCrg('status');
    process.stdout.write(output);
  } catch {
    process.stderr.write(dim('  Could not retrieve graph status.\n'));
  }

  return 0;
}

async function handleBuild(): Promise<number> {
  if (!isInstalled()) {
    process.stderr.write(
      '  Error: code-review-graph is not installed. Run `agentguard review status` for install instructions.\n'
    );
    return 1;
  }

  process.stderr.write(dim('  Building code graph...\n'));
  try {
    const output = runCrg('build');
    process.stdout.write(output);
    process.stderr.write(color('  Graph built successfully.\n', 'green'));
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    process.stderr.write(`  Error building graph: ${msg}\n`);
    return 1;
  }
}

async function handleDelta(args: string[], storageConfig?: StorageConfig): Promise<number> {
  if (!isInstalled()) {
    process.stderr.write(
      '  Error: code-review-graph is not installed. Run `agentguard review status` for install instructions.\n'
    );
    return 1;
  }

  const parsed = parseArgs(args, {
    boolean: ['--json'],
  });
  const jsonOutput = parsed.flags['json'] === true;

  process.stderr.write(dim('  Analyzing changed files...\n'));
  try {
    const crgArgs = ['--json'];
    const output = runCrg('review-delta', crgArgs);
    const data = tryParseJson(output);

    if (data) {
      const runId = `review_${Date.now()}`;
      await emitCodeReviewedEvent(
        runId,
        {
          subcommand: 'delta',
          filesAnalyzed: data.files_analyzed ?? data.filesAnalyzed ?? 0,
          affectedFiles: data.affected_files ?? data.affectedFiles ?? 0,
          tokensSaved: data.tokens_saved ?? data.tokensSaved ?? 0,
          summary: data.summary ?? '',
        },
        storageConfig
      );

      if (jsonOutput) {
        process.stdout.write(JSON.stringify(data, null, 2) + '\n');
      } else {
        const files = (data.files_analyzed ?? data.filesAnalyzed ?? 0) as number;
        const affected = (data.affected_files ?? data.affectedFiles ?? 0) as number;
        const tokens = (data.tokens_saved ?? data.tokensSaved ?? 0) as number;
        process.stderr.write('\n');
        process.stderr.write(bold('  Code Review Delta\n'));
        process.stderr.write(`  Files analyzed:  ${color(String(files), 'cyan')}\n`);
        process.stderr.write(`  Affected files:  ${color(String(affected), 'yellow')}\n`);
        if (tokens > 0) {
          process.stderr.write(`  Tokens saved:    ${color(String(tokens), 'green')}\n`);
        }
        process.stderr.write('\n');
        if (data.summary) {
          process.stdout.write(String(data.summary) + '\n');
        }
      }
    } else {
      // Raw text output
      process.stdout.write(output);
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    process.stderr.write(`  Error running review delta: ${msg}\n`);
    return 1;
  }
}

async function handlePr(args: string[], storageConfig?: StorageConfig): Promise<number> {
  if (!isInstalled()) {
    process.stderr.write(
      '  Error: code-review-graph is not installed. Run `agentguard review status` for install instructions.\n'
    );
    return 1;
  }

  const parsed = parseArgs(args, {
    boolean: ['--json'],
    string: ['--pr'],
  });
  const jsonOutput = parsed.flags['json'] === true;
  const prNumber = parsed.flags['pr'] as string | undefined;

  process.stderr.write(dim('  Reviewing PR...\n'));
  try {
    const crgArgs = ['--json'];
    if (prNumber) crgArgs.push('--pr', prNumber);
    const output = runCrg('review-pr', crgArgs);
    const data = tryParseJson(output);

    if (data) {
      const runId = `review_${Date.now()}`;
      await emitCodeReviewedEvent(
        runId,
        {
          subcommand: 'pr',
          prNumber: prNumber ?? data.pr_number ?? null,
          filesAnalyzed: data.files_analyzed ?? data.filesAnalyzed ?? 0,
          affectedFiles: data.affected_files ?? data.affectedFiles ?? 0,
          tokensSaved: data.tokens_saved ?? data.tokensSaved ?? 0,
          summary: data.summary ?? '',
        },
        storageConfig
      );

      if (jsonOutput) {
        process.stdout.write(JSON.stringify(data, null, 2) + '\n');
      } else {
        const files = (data.files_analyzed ?? data.filesAnalyzed ?? 0) as number;
        const affected = (data.affected_files ?? data.affectedFiles ?? 0) as number;
        process.stderr.write('\n');
        process.stderr.write(bold('  Code Review PR\n'));
        process.stderr.write(`  Files analyzed:  ${color(String(files), 'cyan')}\n`);
        process.stderr.write(`  Affected files:  ${color(String(affected), 'yellow')}\n`);
        process.stderr.write('\n');
        if (data.summary) {
          process.stdout.write(String(data.summary) + '\n');
        }
      }
    } else {
      process.stdout.write(output);
    }

    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    process.stderr.write(`  Error running PR review: ${msg}\n`);
    return 1;
  }
}

// --- Main entry point ---

export async function review(args: string[], storageConfig?: StorageConfig): Promise<number> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'status':
      return handleStatus();
    case 'build':
      return handleBuild();
    case 'delta':
      return handleDelta(subArgs, storageConfig);
    case 'pr':
      return handlePr(subArgs, storageConfig);
    case undefined:
    case '--help':
    case '-h':
      process.stderr.write(
        '\n' +
          bold('  agentguard review') +
          dim(' \u2014 code review powered by code-review-graph\n\n') +
          '  Subcommands:\n' +
          `    ${bold('status')}   Check if code-review-graph is installed and show graph stats\n` +
          `    ${bold('build')}    Build or update the code knowledge graph\n` +
          `    ${bold('delta')}    Review changed files using structural analysis\n` +
          `    ${bold('pr')}       Review a pull request with graph-informed context\n\n` +
          '  Options:\n' +
          '    --json         Output as JSON\n' +
          '    --pr <number>  Target PR number (for pr subcommand)\n\n' +
          '  Prerequisites:\n' +
          `    ${dim('pip install code-review-graph')}\n\n`
      );
      return 0;
    default:
      process.stderr.write(
        `  Unknown subcommand: ${subcommand}. Run \`agentguard review --help\` for usage.\n`
      );
      return 1;
  }
}
