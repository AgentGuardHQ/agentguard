// Tests for the agentguard review CLI command (code-review-graph integration)
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process before importing review
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

// Mock storage to avoid SQLite dependency in tests
vi.mock('@red-codes/storage', () => ({
  createStorageBundle: vi.fn().mockResolvedValue({
    createEventSink: () => ({ write: vi.fn() }),
    close: vi.fn(),
  }),
}));

vi.mock('@red-codes/events', () => ({
  createEvent: vi.fn((_kind: string, data: unknown) => ({ kind: 'CodeReviewed', ...data as object })),
  CODE_REVIEWED: 'CodeReviewed',
}));

import { execSync } from 'node:child_process';
import { review } from '../src/commands/review.js';

const mockExecSync = vi.mocked(execSync);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
});

describe('review', () => {
  // --- Help ---

  it('shows help when no subcommand given', async () => {
    const code = await review([]);
    expect(code).toBe(0);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('code review powered by code-review-graph')
    );
  });

  it('shows help with --help flag', async () => {
    const code = await review(['--help']);
    expect(code).toBe(0);
  });

  it('returns 1 for unknown subcommand', async () => {
    const code = await review(['nonexistent']);
    expect(code).toBe(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Unknown subcommand')
    );
  });

  // --- Status ---

  it('shows install instructions when code-review-graph is not installed', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    const code = await review(['status']);
    expect(code).toBe(1);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('not installed')
    );
  });

  it('shows status when code-review-graph is installed', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('--version')) return 'code-review-graph 1.8.4\n';
      if (cmdStr.includes('status')) return 'Graph: 150 nodes, 200 edges\n';
      return '';
    });

    const code = await review(['status']);
    expect(code).toBe(0);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('installed')
    );
  });

  // --- Build ---

  it('returns 1 for build when not installed', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    const code = await review(['build']);
    expect(code).toBe(1);
  });

  it('builds graph successfully', async () => {
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('--version')) return '1.8.4\n';
      if (cmdStr.includes('build')) return 'Built 150 nodes\n';
      return '';
    });

    const code = await review(['build']);
    expect(code).toBe(0);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('built successfully')
    );
  });

  // --- Delta ---

  it('returns 1 for delta when not installed', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    const code = await review(['delta']);
    expect(code).toBe(1);
  });

  it('runs delta review and outputs results', async () => {
    const deltaResult = JSON.stringify({
      files_analyzed: 5,
      affected_files: 12,
      tokens_saved: 3400,
      summary: 'Changed functions affect 12 downstream files.',
    });
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('--version')) return '1.8.4\n';
      if (cmdStr.includes('review-delta')) return deltaResult;
      return '';
    });

    const code = await review(['delta']);
    expect(code).toBe(0);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Files analyzed')
    );
  });

  it('outputs JSON for delta with --json flag', async () => {
    const deltaResult = JSON.stringify({
      files_analyzed: 5,
      affected_files: 12,
      tokens_saved: 3400,
    });
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('--version')) return '1.8.4\n';
      if (cmdStr.includes('review-delta')) return deltaResult;
      return '';
    });

    const code = await review(['delta', '--json']);
    expect(code).toBe(0);
    expect(process.stdout.write).toHaveBeenCalledWith(
      expect.stringContaining('"files_analyzed"')
    );
  });

  // --- PR ---

  it('returns 1 for pr when not installed', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('command not found');
    });

    const code = await review(['pr']);
    expect(code).toBe(1);
  });

  it('runs pr review successfully', async () => {
    const prResult = JSON.stringify({
      files_analyzed: 8,
      affected_files: 15,
      tokens_saved: 5000,
      summary: 'PR impacts 15 files across 3 modules.',
    });
    mockExecSync.mockImplementation((cmd: unknown) => {
      const cmdStr = String(cmd);
      if (cmdStr.includes('--version')) return '1.8.4\n';
      if (cmdStr.includes('review-pr')) return prResult;
      return '';
    });

    const code = await review(['pr']);
    expect(code).toBe(0);
    expect(process.stderr.write).toHaveBeenCalledWith(
      expect.stringContaining('Code Review PR')
    );
  });
});
