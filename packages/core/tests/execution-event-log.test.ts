import { describe, it, expect, beforeEach } from 'vitest';
import {
  createExecutionEvent,
  validateExecutionEvent,
  resetExecutionEventCounter,
  AGENT_EDIT_FILE,
  RUNTIME_EXCEPTION,
  TEST_SUITE_FAILED,
  BUILD_FAILED,
  DEPLOYMENT_FAILED,
  TESTS_SKIPPED,
  POLICY_VIOLATION_DETECTED,
  ALL_EXECUTION_EVENT_KINDS,
  FAILURE_KINDS,
  VIOLATION_KINDS,
  AGENT_ACTION_KINDS,
} from '@red-codes/core';
import { createExecutionEventLog } from '@red-codes/core';
import { buildCausalChain, scoreAgentRun, clusterFailures, mapToEncounter } from '@red-codes/core';

describe('execution-log/event-schema', () => {
  beforeEach(() => {
    resetExecutionEventCounter();
  });

  it('creates a valid execution event', () => {
    const event = createExecutionEvent(AGENT_EDIT_FILE, {
      actor: 'agent',
      source: 'cli',
      context: { file: 'auth.ts', agentRunId: 'run-1' },
      payload: { linesChanged: 42 },
    });

    expect(event.id).toMatch(/^xev_/);
    expect(event.kind).toBe(AGENT_EDIT_FILE);
    expect(event.actor).toBe('agent');
    expect(event.source).toBe('cli');
    expect(event.context.file).toBe('auth.ts');
    expect(event.payload.linesChanged).toBe(42);
    expect(event.fingerprint).toBeTruthy();
  });

  it('generates unique IDs', () => {
    const e1 = createExecutionEvent(AGENT_EDIT_FILE, {
      actor: 'agent',
      source: 'cli',
    });
    const e2 = createExecutionEvent(AGENT_EDIT_FILE, {
      actor: 'agent',
      source: 'cli',
    });
    expect(e1.id).not.toBe(e2.id);
  });

  it('generates deterministic fingerprints', () => {
    const opts = {
      actor: 'agent' as const,
      source: 'cli' as const,
      payload: { file: 'test.ts' },
      timestamp: 1000,
    };
    resetExecutionEventCounter();
    const e1 = createExecutionEvent(AGENT_EDIT_FILE, opts);
    resetExecutionEventCounter();
    const e2 = createExecutionEvent(AGENT_EDIT_FILE, opts);
    expect(e1.fingerprint).toBe(e2.fingerprint);
  });

  it('validates required fields', () => {
    const result = validateExecutionEvent({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates actor values', () => {
    const result = validateExecutionEvent({
      id: 'test',
      timestamp: 1000,
      actor: 'invalid',
      source: 'cli',
      kind: 'Test',
      context: {},
      payload: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('actor'))).toBe(true);
  });

  it('validates source values', () => {
    const result = validateExecutionEvent({
      id: 'test',
      timestamp: 1000,
      actor: 'human',
      source: 'invalid',
      kind: 'Test',
      context: {},
      payload: {},
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('source'))).toBe(true);
  });

  it('includes causedBy when provided', () => {
    const event = createExecutionEvent(RUNTIME_EXCEPTION, {
      actor: 'system',
      source: 'runtime',
      payload: { message: 'null ref' },
      causedBy: 'xev_123_1',
    });
    expect(event.causedBy).toBe('xev_123_1');
  });

  it('defines all expected event kind sets', () => {
    expect(ALL_EXECUTION_EVENT_KINDS.size).toBeGreaterThan(20);
    expect(FAILURE_KINDS.size).toBeGreaterThan(0);
    expect(VIOLATION_KINDS.size).toBeGreaterThan(0);
    expect(AGENT_ACTION_KINDS.size).toBeGreaterThan(0);
  });
});

describe('execution-log/event-log', () => {
  beforeEach(() => {
    resetExecutionEventCounter();
  });

  it('creates an empty log', () => {
    const log = createExecutionEventLog();
    expect(log.count()).toBe(0);
    expect(log.replay()).toHaveLength(0);
  });

  it('appends and counts events', () => {
    const log = createExecutionEventLog();
    const event = createExecutionEvent(AGENT_EDIT_FILE, {
      actor: 'agent',
      source: 'cli',
    });
    log.append(event);
    expect(log.count()).toBe(1);
  });

  it('rejects invalid events', () => {
    const log = createExecutionEventLog();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => log.append({ kind: 'Fake' } as any)).toThrow();
  });

  it('queries by kind', () => {
    const log = createExecutionEventLog();
    log.append(createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' }));
    log.append(
      createExecutionEvent(RUNTIME_EXCEPTION, {
        actor: 'system',
        source: 'runtime',
        payload: { message: 'error' },
      })
    );
    log.append(createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' }));

    expect(log.query({ kind: AGENT_EDIT_FILE })).toHaveLength(2);
    expect(log.query({ kind: RUNTIME_EXCEPTION })).toHaveLength(1);
  });

  it('queries by actor', () => {
    const log = createExecutionEventLog();
    log.append(createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' }));
    log.append(
      createExecutionEvent(RUNTIME_EXCEPTION, {
        actor: 'system',
        source: 'runtime',
        payload: { message: 'err' },
      })
    );

    expect(log.query({ actor: 'agent' })).toHaveLength(1);
    expect(log.query({ actor: 'system' })).toHaveLength(1);
  });

  it('queries by agentRunId', () => {
    const log = createExecutionEventLog();
    log.append(
      createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
        context: { agentRunId: 'run-1' },
      })
    );
    log.append(
      createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
        context: { agentRunId: 'run-2' },
      })
    );

    expect(log.query({ agentRunId: 'run-1' })).toHaveLength(1);
  });

  it('queries by file', () => {
    const log = createExecutionEventLog();
    log.append(
      createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
        context: { file: 'auth.ts' },
      })
    );
    log.append(
      createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
        context: { file: 'index.ts' },
      })
    );

    expect(log.query({ file: 'auth.ts' })).toHaveLength(1);
  });

  it('replays from a given ID', () => {
    const log = createExecutionEventLog();
    const e1 = createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' });
    const e2 = createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' });
    const e3 = createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' });
    log.append(e1);
    log.append(e2);
    log.append(e3);

    const replayed = log.replay(e2.id);
    expect(replayed).toHaveLength(2);
    expect(replayed[0].id).toBe(e2.id);
  });

  it('traces causal chain', () => {
    const log = createExecutionEventLog();

    const root = createExecutionEvent(AGENT_EDIT_FILE, {
      actor: 'agent',
      source: 'cli',
      context: { file: 'auth.ts' },
    });
    log.append(root);

    const middle = createExecutionEvent(TESTS_SKIPPED, {
      actor: 'system',
      source: 'ci',
      causedBy: root.id,
    });
    log.append(middle);

    const leaf = createExecutionEvent(RUNTIME_EXCEPTION, {
      actor: 'system',
      source: 'runtime',
      payload: { message: 'null ref in auth' },
      causedBy: middle.id,
    });
    log.append(leaf);

    const chain = log.trace(leaf.id);
    expect(chain).toHaveLength(3);
    expect(chain[0].id).toBe(root.id);
    expect(chain[1].id).toBe(middle.id);
    expect(chain[2].id).toBe(leaf.id);
  });

  it('trace returns single event if no causedBy', () => {
    const log = createExecutionEventLog();
    const event = createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' });
    log.append(event);

    const chain = log.trace(event.id);
    expect(chain).toHaveLength(1);
    expect(chain[0].id).toBe(event.id);
  });

  it('trace returns empty for unknown event', () => {
    const log = createExecutionEventLog();
    expect(log.trace('unknown')).toHaveLength(0);
  });

  it('round-trips via NDJSON', () => {
    const log = createExecutionEventLog();
    log.append(
      createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
        context: { file: 'test.ts' },
        payload: { lines: 10 },
      })
    );
    log.append(
      createExecutionEvent(RUNTIME_EXCEPTION, {
        actor: 'system',
        source: 'runtime',
        payload: { message: 'error' },
      })
    );

    const ndjson = log.toNDJSON();
    expect(ndjson.split('\n')).toHaveLength(2);

    const log2 = createExecutionEventLog();
    const loaded = log2.fromNDJSON(ndjson);
    expect(loaded).toBe(2);
    expect(log2.count()).toBe(2);

    const events = log2.replay();
    expect(events[0].kind).toBe(AGENT_EDIT_FILE);
    expect(events[0].context.file).toBe('test.ts');
    expect(events[1].kind).toBe(RUNTIME_EXCEPTION);
  });

  it('clears all events', () => {
    const log = createExecutionEventLog();
    log.append(createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' }));
    log.clear();
    expect(log.count()).toBe(0);
  });
});

describe('execution-log/event-projections', () => {
  beforeEach(() => {
    resetExecutionEventCounter();
  });

  describe('buildCausalChain', () => {
    it('returns the trace from log', () => {
      const log = createExecutionEventLog();
      const root = createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
      });
      log.append(root);

      const child = createExecutionEvent(TEST_SUITE_FAILED, {
        actor: 'system',
        source: 'ci',
        payload: { suite: 'auth' },
        causedBy: root.id,
      });
      log.append(child);

      const chain = buildCausalChain(log, child.id);
      expect(chain).toHaveLength(2);
      expect(chain[0].id).toBe(root.id);
    });
  });

  describe('scoreAgentRun', () => {
    it('scores a clean run as low risk', () => {
      const log = createExecutionEventLog();
      log.append(
        createExecutionEvent(AGENT_EDIT_FILE, {
          actor: 'agent',
          source: 'cli',
          context: { agentRunId: 'run-1', file: 'utils.ts' },
        })
      );

      const risk = scoreAgentRun(log, 'run-1');
      expect(risk.level).toBe('low');
      expect(risk.score).toBe(0);
      expect(risk.failureCount).toBe(0);
    });

    it('returns score 0 and level low for a run with no events', () => {
      const log = createExecutionEventLog();
      const risk = scoreAgentRun(log, 'empty-run');
      expect(risk.score).toBe(0);
      expect(risk.level).toBe('low');
      expect(risk.failureCount).toBe(0);
      expect(risk.violationCount).toBe(0);
      expect(risk.factors).toHaveLength(0);
    });

    it('scores failures', () => {
      const log = createExecutionEventLog();
      log.append(
        createExecutionEvent(TEST_SUITE_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { agentRunId: 'run-2' },
          payload: { suite: 'auth' },
        })
      );
      log.append(
        createExecutionEvent(BUILD_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { agentRunId: 'run-2' },
          payload: { reason: 'type error' },
        })
      );

      const risk = scoreAgentRun(log, 'run-2');
      expect(risk.failureCount).toBe(2);
      expect(risk.score).toBeGreaterThan(0);
    });

    it('scores violations as high risk', () => {
      const log = createExecutionEventLog();
      log.append(
        createExecutionEvent(POLICY_VIOLATION_DETECTED, {
          actor: 'system',
          source: 'governance',
          context: { agentRunId: 'run-3' },
          payload: { policy: 'no-auth-edit' },
        })
      );

      const risk = scoreAgentRun(log, 'run-3');
      expect(risk.violationCount).toBe(1);
      expect(risk.score).toBeGreaterThanOrEqual(25);
    });

    it('scores sensitive file edits', () => {
      const log = createExecutionEventLog();
      log.append(
        createExecutionEvent(AGENT_EDIT_FILE, {
          actor: 'agent',
          source: 'cli',
          context: { agentRunId: 'run-4', file: 'auth/passwords.ts' },
        })
      );

      const risk = scoreAgentRun(log, 'run-4');
      expect(risk.factors.some((f) => f.name === 'sensitive_file_edits')).toBe(true);
    });

    it('returns empty score for unknown run', () => {
      const log = createExecutionEventLog();
      const risk = scoreAgentRun(log, 'nonexistent');
      expect(risk.score).toBe(0);
      expect(risk.level).toBe('low');
    });

    it('risk level is medium for score 15–39', () => {
      const log = createExecutionEventLog();
      // POLICY_VIOLATION_DETECTED counts as both failure (10) and violation (25) = 35 pts → medium
      log.append(
        createExecutionEvent(POLICY_VIOLATION_DETECTED, {
          actor: 'system',
          source: 'governance',
          context: { agentRunId: 'run-medium' },
        })
      );
      const risk = scoreAgentRun(log, 'run-medium');
      expect(risk.score).toBe(35);
      expect(risk.level).toBe('medium');
    });

    it('risk level is high for score 40–74', () => {
      const log = createExecutionEventLog();
      // 2 x POLICY_VIOLATION_DETECTED: 2 failures (20) + 2 violations (50) = 70 pts → high
      for (let i = 0; i < 2; i++) {
        log.append(
          createExecutionEvent(POLICY_VIOLATION_DETECTED, {
            actor: 'system',
            source: 'governance',
            context: { agentRunId: 'run-high' },
          })
        );
      }
      const risk = scoreAgentRun(log, 'run-high');
      expect(risk.score).toBe(70);
      expect(risk.level).toBe('high');
    });

    it('risk level is critical for score >=75', () => {
      const log = createExecutionEventLog();
      // 3 x POLICY_VIOLATION_DETECTED: 3 failures (30) + 3 violations (75) = 105 pts → critical
      for (let i = 0; i < 3; i++) {
        log.append(
          createExecutionEvent(POLICY_VIOLATION_DETECTED, {
            actor: 'system',
            source: 'governance',
            context: { agentRunId: 'run-critical' },
          })
        );
      }
      const risk = scoreAgentRun(log, 'run-critical');
      expect(risk.score).toBe(105);
      expect(risk.level).toBe('critical');
    });

    it('flags high action rate (>50 agent actions)', () => {
      const log = createExecutionEventLog();
      for (let i = 0; i < 51; i++) {
        log.append(
          createExecutionEvent(AGENT_EDIT_FILE, {
            actor: 'agent',
            source: 'cli',
            context: { agentRunId: 'run-velocity', file: `src/file${i}.ts` },
          })
        );
      }
      const risk = scoreAgentRun(log, 'run-velocity');
      expect(risk.factors.some((f) => f.name === 'high_action_rate')).toBe(true);
    });

    it('detects sensitive file patterns: .env, token, password, key, credential', () => {
      const sensitiveFiles = ['.env', 'auth-token.ts', 'password-utils.ts', 'api-key.ts', 'credentials.json'];
      for (const file of sensitiveFiles) {
        const log = createExecutionEventLog();
        log.append(
          createExecutionEvent(AGENT_EDIT_FILE, {
            actor: 'agent',
            source: 'cli',
            context: { agentRunId: 'run-sensitive', file },
          })
        );
        const risk = scoreAgentRun(log, 'run-sensitive');
        expect(risk.factors.some((f) => f.name === 'sensitive_file_edits')).toBe(
          true,
          `Expected sensitive file detection for: ${file}`
        );
      }
    });

    it('mixes failures and violations for combined score', () => {
      const log = createExecutionEventLog();
      // BUILD_FAILED = failure only (10 pts)
      // POLICY_VIOLATION_DETECTED = failure (10) + violation (25) = 35 pts
      // Total: 45 pts → high
      log.append(
        createExecutionEvent(BUILD_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { agentRunId: 'run-mixed' },
        })
      );
      log.append(
        createExecutionEvent(POLICY_VIOLATION_DETECTED, {
          actor: 'system',
          source: 'governance',
          context: { agentRunId: 'run-mixed' },
        })
      );
      const risk = scoreAgentRun(log, 'run-mixed');
      expect(risk.score).toBe(45);
      expect(risk.level).toBe('high');
      expect(risk.failureCount).toBe(2); // BUILD_FAILED + POLICY_VIOLATION_DETECTED both in FAILURE_KINDS
      expect(risk.violationCount).toBe(1);
    });
  });

  describe('clusterFailures', () => {
    it('clusters failures by file', () => {
      const log = createExecutionEventLog();
      const now = Date.now();

      log.append(
        createExecutionEvent(TEST_SUITE_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { file: 'auth.ts' },
          payload: { suite: 'test1' },
          timestamp: now,
        })
      );
      log.append(
        createExecutionEvent(RUNTIME_EXCEPTION, {
          actor: 'system',
          source: 'runtime',
          context: { file: 'auth.ts' },
          payload: { message: 'null ref' },
          timestamp: now + 1000,
        })
      );
      log.append(
        createExecutionEvent(BUILD_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { file: 'other.ts' },
          payload: { reason: 'syntax' },
          timestamp: now + 2000,
        })
      );

      const clusters = clusterFailures(log);
      expect(clusters.length).toBeGreaterThanOrEqual(2);

      const authCluster = clusters.find((c) => c.commonFile === 'auth.ts');
      expect(authCluster).toBeTruthy();
      expect(authCluster!.events).toHaveLength(2);
    });

    it('returns empty for no failures', () => {
      const log = createExecutionEventLog();
      log.append(createExecutionEvent(AGENT_EDIT_FILE, { actor: 'agent', source: 'cli' }));
      expect(clusterFailures(log)).toHaveLength(0);
    });

    it('returns empty for empty log', () => {
      const log = createExecutionEventLog();
      expect(clusterFailures(log)).toHaveLength(0);
    });

    it('produces single cluster for single failure', () => {
      const log = createExecutionEventLog();
      log.append(
        createExecutionEvent(RUNTIME_EXCEPTION, {
          actor: 'system',
          source: 'runtime',
          context: { file: 'index.ts' },
          payload: { message: 'crash' },
        })
      );
      const clusters = clusterFailures(log);
      expect(clusters).toHaveLength(1);
      expect(clusters[0].events).toHaveLength(1);
      expect(clusters[0].severity).toBe(1);
    });

    it('groups same-file failures within the time window into one cluster', () => {
      const log = createExecutionEventLog();
      const now = 1_000_000;
      for (let i = 0; i < 3; i++) {
        log.append(
          createExecutionEvent(TEST_SUITE_FAILED, {
            actor: 'system',
            source: 'ci',
            context: { file: 'app.ts' },
            timestamp: now + i * 1000,
          })
        );
      }
      const clusters = clusterFailures(log, { windowMs: 60_000 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].events).toHaveLength(3);
    });

    it('splits same-file failures outside the time window into separate clusters', () => {
      const log = createExecutionEventLog();
      const now = 1_000_000;
      log.append(
        createExecutionEvent(TEST_SUITE_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { file: 'app.ts' },
          timestamp: now,
        })
      );
      log.append(
        createExecutionEvent(TEST_SUITE_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { file: 'app.ts' },
          timestamp: now + 120_000, // 2 minutes later — outside 1-minute window
        })
      );
      const clusters = clusterFailures(log, { windowMs: 60_000 });
      const appClusters = clusters.filter((c) => c.commonFile === 'app.ts');
      expect(appClusters).toHaveLength(2);
    });

    it('clusters failures without file context by time proximity', () => {
      const log = createExecutionEventLog();
      const now = 2_000_000;
      log.append(
        createExecutionEvent(RUNTIME_EXCEPTION, {
          actor: 'system',
          source: 'runtime',
          payload: { message: 'crash A' },
          timestamp: now,
        })
      );
      log.append(
        createExecutionEvent(RUNTIME_EXCEPTION, {
          actor: 'system',
          source: 'runtime',
          payload: { message: 'crash B' },
          timestamp: now + 5000,
        })
      );
      const clusters = clusterFailures(log, { windowMs: 60_000 });
      expect(clusters).toHaveLength(1);
      expect(clusters[0].events).toHaveLength(2);
      expect(clusters[0].commonFile).toBeUndefined();
    });

    it('caps cluster severity at 5', () => {
      const log = createExecutionEventLog();
      const now = 3_000_000;
      for (let i = 0; i < 10; i++) {
        log.append(
          createExecutionEvent(BUILD_FAILED, {
            actor: 'system',
            source: 'ci',
            context: { file: 'build.ts' },
            timestamp: now + i * 1000,
          })
        );
      }
      const clusters = clusterFailures(log, { windowMs: 60_000 });
      expect(clusters[0].severity).toBe(5);
    });

    it('sorts clusters by descending severity', () => {
      const log = createExecutionEventLog();
      const now = 4_000_000;
      // 3-event cluster on file A
      for (let i = 0; i < 3; i++) {
        log.append(
          createExecutionEvent(BUILD_FAILED, {
            actor: 'system',
            source: 'ci',
            context: { file: 'a.ts' },
            timestamp: now + i * 1000,
          })
        );
      }
      // 1-event cluster on file B
      log.append(
        createExecutionEvent(BUILD_FAILED, {
          actor: 'system',
          source: 'ci',
          context: { file: 'b.ts' },
          timestamp: now,
        })
      );
      const clusters = clusterFailures(log, { windowMs: 60_000 });
      expect(clusters[0].severity).toBeGreaterThanOrEqual(clusters[1].severity);
    });
  });

  describe('mapToEncounter', () => {
    it('maps RuntimeException to monster encounter', () => {
      const event = createExecutionEvent(RUNTIME_EXCEPTION, {
        actor: 'system',
        source: 'runtime',
        context: { file: 'auth.ts' },
        payload: { message: 'null pointer in auth module' },
      });

      const mapping = mapToEncounter(event);
      expect(mapping).not.toBeNull();
      expect(mapping!.encounterType).toBe('monster');
      expect(mapping!.name).toBe('Runtime Wraith');
      expect(mapping!.severity).toBe(3);
    });

    it('maps TestSuiteFailed to monster encounter', () => {
      const event = createExecutionEvent(TEST_SUITE_FAILED, {
        actor: 'system',
        source: 'ci',
        payload: { message: 'auth tests failed' },
      });
      const mapping = mapToEncounter(event);
      expect(mapping).not.toBeNull();
      expect(mapping!.encounterType).toBe('monster');
      expect(mapping!.name).toBe('Test Phantom');
      expect(mapping!.severity).toBe(2);
    });

    it('maps BuildFailed to monster encounter', () => {
      const event = createExecutionEvent(BUILD_FAILED, {
        actor: 'system',
        source: 'ci',
        payload: { message: 'type error in index.ts' },
      });
      const mapping = mapToEncounter(event);
      expect(mapping).not.toBeNull();
      expect(mapping!.encounterType).toBe('monster');
      expect(mapping!.name).toBe('Build Specter');
    });

    it('maps DeploymentFailed to boss encounter', () => {
      const event = createExecutionEvent(DEPLOYMENT_FAILED, {
        actor: 'system',
        source: 'ci',
        payload: { message: 'deploy timeout' },
      });

      const mapping = mapToEncounter(event);
      expect(mapping).not.toBeNull();
      expect(mapping!.encounterType).toBe('boss');
      expect(mapping!.name).toBe('Deploy Colossus');
    });

    it('uses fallback description when no message in payload', () => {
      const event = createExecutionEvent(RUNTIME_EXCEPTION, {
        actor: 'system',
        source: 'runtime',
        context: { file: 'server.ts' },
        // no payload.message
      });
      const mapping = mapToEncounter(event);
      expect(mapping).not.toBeNull();
      expect(mapping!.description).toContain('server.ts');
    });

    it('returns null for non-failure events', () => {
      const event = createExecutionEvent(AGENT_EDIT_FILE, {
        actor: 'agent',
        source: 'cli',
      });
      expect(mapToEncounter(event)).toBeNull();
    });

    it('populates eventId in the encounter mapping', () => {
      const event = createExecutionEvent(RUNTIME_EXCEPTION, {
        actor: 'system',
        source: 'runtime',
      });
      const mapping = mapToEncounter(event);
      expect(mapping!.eventId).toBe(event.id);
    });
  });
});