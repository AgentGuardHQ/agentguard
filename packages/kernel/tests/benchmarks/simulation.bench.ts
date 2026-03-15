// Benchmark: Simulation overhead per simulator (filesystem, git, package).
// Measures p50/p95/p99 latency for each ActionSimulator's simulate() method.
// Uses pure-logic paths only — avoids execFileSync calls to stay deterministic.

import { bench, describe } from 'vitest';
import {
  createFilesystemSimulator,
  createGitSimulator,
  createPackageSimulator,
} from '@red-codes/kernel';
import type { NormalizedIntent } from '@red-codes/policy';

const filesystemSim = createFilesystemSimulator();
const gitSim = createGitSimulator();
const packageSim = createPackageSimulator();

const context: Record<string, unknown> = {
  protectedBranches: ['main', 'master'],
};

// ─── Filesystem simulator ───────────────────────────────────────────────────

const fileWriteIntent: NormalizedIntent = {
  action: 'file.write',
  target: 'src/components/Button.tsx',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const sensitiveWriteIntent: NormalizedIntent = {
  action: 'file.write',
  target: '.env',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const lockfileWriteIntent: NormalizedIntent = {
  action: 'file.write',
  target: 'pnpm-lock.yaml',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const ciConfigWriteIntent: NormalizedIntent = {
  action: 'file.write',
  target: '.github/workflows/deploy.yml',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const fileDeleteIntent: NormalizedIntent = {
  action: 'file.delete',
  target: 'src/old-module.ts',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: true,
};

describe('Filesystem simulator overhead', () => {
  bench('file.write — low-risk source file', async () => {
    await filesystemSim.simulate(fileWriteIntent, context);
  });

  bench('file.write — sensitive (.env)', async () => {
    await filesystemSim.simulate(sensitiveWriteIntent, context);
  });

  bench('file.write — lockfile (pnpm-lock.yaml)', async () => {
    await filesystemSim.simulate(lockfileWriteIntent, context);
  });

  bench('file.write — CI config (.github/workflows)', async () => {
    await filesystemSim.simulate(ciConfigWriteIntent, context);
  });

  bench('file.delete — source file', async () => {
    await filesystemSim.simulate(fileDeleteIntent, context);
  });
});

// ─── Git simulator ───────────────────────────────────────────────────────────
// Uses paths that avoid execFileSync: force-push (early return) and
// branch.delete (pure logic), and invalid branch names (validation short-circuit).

const forcePushIntent: NormalizedIntent = {
  action: 'git.force-push',
  target: 'feature/bench',
  branch: 'feature/bench',
  agent: 'bench-agent',
  destructive: true,
};

const branchDeleteIntent: NormalizedIntent = {
  action: 'git.branch.delete',
  target: 'feature/stale-branch',
  branch: 'feature/stale-branch',
  agent: 'bench-agent',
  destructive: true,
};

const protectedBranchDeleteIntent: NormalizedIntent = {
  action: 'git.branch.delete',
  target: 'main',
  branch: 'main',
  agent: 'bench-agent',
  destructive: true,
};

const pushNoRemoteIntent: NormalizedIntent = {
  action: 'git.push',
  target: '',
  branch: '',
  agent: 'bench-agent',
  destructive: false,
};

describe('Git simulator overhead', () => {
  bench('git.force-push (high-risk early path)', async () => {
    await gitSim.simulate(forcePushIntent, context);
  });

  bench('git.branch.delete — non-protected branch', async () => {
    await gitSim.simulate(branchDeleteIntent, context);
  });

  bench('git.branch.delete — protected branch (main)', async () => {
    await gitSim.simulate(protectedBranchDeleteIntent, context);
  });

  bench('git.push — no branch (context-only path)', async () => {
    await gitSim.simulate(pushNoRemoteIntent, context);
  });
});

// ─── Package simulator ───────────────────────────────────────────────────────
// Uses yarn/pnpm commands (estimatedOnly path) and global install (isGlobal path)
// — both skip the npm install --dry-run execFileSync call.

const yarnAddIntent: NormalizedIntent = {
  action: 'shell.exec',
  target: '',
  command: 'yarn add lodash',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const pnpmAddIntent: NormalizedIntent = {
  action: 'shell.exec',
  target: '',
  command: 'pnpm add zod',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const globalInstallIntent: NormalizedIntent = {
  action: 'shell.exec',
  target: '',
  command: 'npm install -g typescript',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

const pnpmRemoveIntent: NormalizedIntent = {
  action: 'shell.exec',
  target: '',
  command: 'pnpm remove unused-dep',
  agent: 'bench-agent',
  branch: 'feature/bench',
  destructive: false,
};

describe('Package simulator overhead', () => {
  bench('yarn add (estimated path — no subprocess)', async () => {
    await packageSim.simulate(yarnAddIntent, context);
  });

  bench('pnpm add (estimated path — no subprocess)', async () => {
    await packageSim.simulate(pnpmAddIntent, context);
  });

  bench('npm install -g (global install path)', async () => {
    await packageSim.simulate(globalInstallIntent, context);
  });

  bench('pnpm remove (estimated path — no subprocess)', async () => {
    await packageSim.simulate(pnpmRemoveIntent, context);
  });
});
