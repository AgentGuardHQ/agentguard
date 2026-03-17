import assert from 'node:assert';
import { test, suite } from './run.js';
import { replay } from '../dist/cli/replay.js';
import { createRecorder } from '../dist/cli/recorder.js';
import { loadSession, listSessions } from '../dist/cli/session-store.js';

suite('Replay CLI', () => {
  test('replay module exports a replay function', () => {
    assert.strictEqual(typeof replay, 'function');
  });

  test('replay end-to-end: record a session and verify loadable', () => {
    // Create a session with events via the recorder
    const recorder = createRecorder('npm', ['test']);
    recorder.recordTest('pass', { suite: 'unit' });
    recorder.recordFileModified('src/main.js');
    recorder.end(0);

    // Verify session is loadable and has correct structure
    const session = loadSession(recorder.sessionId);
    assert.ok(session, 'session loaded');
    assert.strictEqual(session.events.length, 2);
    assert.strictEqual(session.events[0].kind, 'TestCompleted');
    assert.strictEqual(session.events[1].kind, 'FileSaved');

    // Verify it appears in the session list
    const sessions = listSessions();
    const found = sessions.find((s) => s.id === recorder.sessionId);
    assert.ok(found, 'session appears in list');
    assert.strictEqual(found.eventCount, 2);
  });

  test('replay with stats: session has correct summary data', () => {
    const recorder = createRecorder('npm', ['test']);
    recorder.recordTest('fail', { suite: 'unit' });
    recorder.recordTest('pass', { suite: 'integration' });
    recorder.end(1);

    const session = loadSession(recorder.sessionId);
    assert.ok(session.summary, 'session has summary');
    assert.ok(session.summary.duration >= 0, 'summary has duration');
    assert.strictEqual(session.summary.exitCode, 1);
  });

  test('unknown session returns null from loadSession', () => {
    const result = loadSession('nonexistent-id-12345');
    assert.strictEqual(result, null);
  });
});
