import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateLesson,
  mergeLesson,
  emptyLessonStore,
  formatLessonContext,
  readLessonStore,
  writeLessonStore,
} from '../src/lessons.js';
import type { LessonInput, LessonStore } from '../src/lessons.js';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync as fsWriteFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const makeInput = (overrides?: Partial<LessonInput>): LessonInput => ({
  action: 'git.push',
  tool: 'Bash',
  target: 'main',
  rule: 'Direct push to protected branch',
  reason: 'Pushing directly to main rewrites shared history',
  suggestion: 'Push to a feature branch and open a pull request instead',
  correctedCommand: 'git push origin HEAD:feat/my-branch',
  agentId: 'copilot-cli:sonnet:kernel:senior',
  squad: 'kernel',
  ...overrides,
});

describe('generateLesson', () => {
  it('creates a lesson with all fields', () => {
    const lesson = generateLesson(makeInput());
    expect(lesson.action).toBe('git.push');
    expect(lesson.rule).toBe('Direct push to protected branch');
    expect(lesson.why).toBe('Pushing directly to main rewrites shared history');
    expect(lesson.instead).toContain('feature branch');
    expect(lesson.correctedCommand).toBe('git push origin HEAD:feat/my-branch');
    expect(lesson.hitCount).toBe(1);
    expect(lesson.squad).toBe('kernel');
    expect(lesson.id).toMatch(/^lesson-/);
  });

  it('infers critical severity for secret-related rules', () => {
    const lesson = generateLesson(makeInput({ reason: 'Secrets files must not be modified' }));
    expect(lesson.severity).toBe('critical');
  });

  it('infers warning severity for protected branch rules', () => {
    const lesson = generateLesson(makeInput({ reason: 'Protected branch direct push' }));
    expect(lesson.severity).toBe('warning');
  });

  it('defaults to info severity', () => {
    const lesson = generateLesson(makeInput({ reason: 'General style guideline' }));
    expect(lesson.severity).toBe('info');
  });

  it('respects explicit severity override', () => {
    const lesson = generateLesson(makeInput({ severity: 'critical', reason: 'anything' }));
    expect(lesson.severity).toBe('critical');
  });

  it('generates deterministic IDs for same pattern+action', () => {
    const a = generateLesson(makeInput());
    const b = generateLesson(makeInput());
    expect(a.id).toBe(b.id);
  });

  it('generates different IDs for different actions', () => {
    const a = generateLesson(makeInput({ action: 'git.push' }));
    const b = generateLesson(makeInput({ action: 'file.write' }));
    expect(a.id).not.toBe(b.id);
  });
});

describe('mergeLesson', () => {
  it('adds a new lesson to empty store', () => {
    const store = emptyLessonStore();
    const lesson = generateLesson(makeInput());
    const updated = mergeLesson(store, lesson);
    expect(updated.lessons).toHaveLength(1);
    expect(updated.lessons[0].hitCount).toBe(1);
  });

  it('increments hitCount for duplicate lesson', () => {
    let store = emptyLessonStore();
    const lesson = generateLesson(makeInput());
    store = mergeLesson(store, lesson);
    store = mergeLesson(store, lesson);
    store = mergeLesson(store, lesson);
    expect(store.lessons).toHaveLength(1);
    expect(store.lessons[0].hitCount).toBe(3);
  });

  it('adds different lessons independently', () => {
    let store = emptyLessonStore();
    store = mergeLesson(store, generateLesson(makeInput({ action: 'git.push' })));
    store = mergeLesson(store, generateLesson(makeInput({ action: 'file.write', rule: 'Secrets' })));
    expect(store.lessons).toHaveLength(2);
  });

  it('updates lastUpdated on merge', () => {
    const store: LessonStore = {
      lessons: [],
      version: '1.0.0',
      lastUpdated: '2020-01-01T00:00:00.000Z', // fixed past date
    };
    const updated = mergeLesson(store, generateLesson(makeInput()));
    expect(updated.lastUpdated).not.toBe('2020-01-01T00:00:00.000Z');
  });
});

describe('formatLessonContext', () => {
  it('returns empty for empty store', () => {
    const ctx = formatLessonContext(emptyLessonStore());
    expect(ctx.count).toBe(0);
    expect(ctx.text).toBe('');
  });

  it('formats lessons as markdown', () => {
    let store = emptyLessonStore();
    store = mergeLesson(store, generateLesson(makeInput()));
    const ctx = formatLessonContext(store);
    expect(ctx.count).toBe(1);
    expect(ctx.text).toContain('Governance Learnings');
    expect(ctx.text).toContain('Direct push to protected branch');
    expect(ctx.text).toContain('feature branch');
    expect(ctx.text).toContain('git push origin HEAD:feat/my-branch');
  });

  it('sorts critical lessons first', () => {
    let store = emptyLessonStore();
    store = mergeLesson(store, generateLesson(makeInput({ severity: 'info', action: 'a', rule: 'Low' })));
    store = mergeLesson(store, generateLesson(makeInput({ severity: 'critical', action: 'b', rule: 'High' })));
    const ctx = formatLessonContext(store);
    expect(ctx.topLessons[0].severity).toBe('critical');
  });

  it('respects maxLessons limit', () => {
    let store = emptyLessonStore();
    for (let i = 0; i < 30; i++) {
      store = mergeLesson(store, generateLesson(makeInput({ action: `action.${i}`, rule: `Rule ${i}` })));
    }
    const ctx = formatLessonContext(store, { maxLessons: 5 });
    expect(ctx.count).toBe(5);
    expect(ctx.topLessons).toHaveLength(5);
  });

  it('filters by minimum severity', () => {
    let store = emptyLessonStore();
    store = mergeLesson(store, generateLesson(makeInput({ severity: 'info', action: 'a', rule: 'A' })));
    store = mergeLesson(store, generateLesson(makeInput({ severity: 'warning', action: 'b', rule: 'B' })));
    store = mergeLesson(store, generateLesson(makeInput({ severity: 'critical', action: 'c', rule: 'C' })));
    const ctx = formatLessonContext(store, { minSeverity: 'warning' });
    expect(ctx.count).toBe(2);
  });

  it('shows hit count for repeated lessons', () => {
    let store = emptyLessonStore();
    const lesson = generateLesson(makeInput());
    store = mergeLesson(store, lesson);
    store = mergeLesson(store, lesson);
    store = mergeLesson(store, lesson);
    const ctx = formatLessonContext(store);
    expect(ctx.text).toContain('triggered 3 times');
  });
});

describe('file I/O', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'lessons-'));
    mkdirSync(join(dir, '.agentguard', 'squads', 'kernel'), { recursive: true });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('reads empty store from missing file', () => {
    const store = readLessonStore(dir, 'kernel');
    expect(store.lessons).toHaveLength(0);
  });

  it('writes and reads lesson store roundtrip', () => {
    let store = emptyLessonStore();
    store = mergeLesson(store, generateLesson(makeInput()));
    store = mergeLesson(store, generateLesson(makeInput({ action: 'file.write', rule: 'Secrets' })));

    writeLessonStore(dir, 'kernel', store);
    const loaded = readLessonStore(dir, 'kernel');
    expect(loaded.lessons).toHaveLength(2);
    expect(loaded.lessons[0].action).toBe('git.push');
  });

  it('handles legacy array format in learnings.json', () => {
    // The old format was just [] — empty array
    const path = join(dir, '.agentguard', 'squads', 'kernel', 'learnings.json');
    fsWriteFileSync(path, '[]');
    const store = readLessonStore(dir, 'kernel');
    expect(store.lessons).toHaveLength(0);
    expect(store.version).toBe('1.0.0');
  });

  it('creates squad dir if missing', () => {
    const store = mergeLesson(emptyLessonStore(), generateLesson(makeInput({ squad: 'newteam' })));
    writeLessonStore(dir, 'newteam', store);
    const loaded = readLessonStore(dir, 'newteam');
    expect(loaded.lessons).toHaveLength(1);
  });
});
