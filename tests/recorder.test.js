import assert from 'node:assert';
import { test, suite } from './run.js';
import { createRecorder } from '../dist/cli/recorder.js';
import { loadSession } from '../dist/cli/session-store.js';

suite('Session Recorder', () => {
  test('createRecorder returns recorder with sessionId and methods', () => {
    const recorder = createRecorder('npm', ['test']);
    assert.ok(recorder.sessionId, 'recorder has sessionId');
    assert.strictEqual(typeof recorder.record, 'function');
    assert.strictEqual(typeof recorder.recordTest, 'function');
    assert.strictEqual(typeof recorder.recordFileModified, 'function');
    assert.strictEqual(typeof recorder.end, 'function');
    recorder.end(0);
  });

  test('recordTest creates a TestCompleted event', () => {
    const recorder = createRecorder('npm', ['test']);
    recorder.recordTest('pass', { suite: 'unit', duration: 100 });
    recorder.end(0);

    const session = loadSession(recorder.sessionId);
    assert.strictEqual(session.events.length, 1);
    assert.strictEqual(session.events[0].kind, 'TestCompleted');
    assert.strictEqual(session.events[0].result, 'pass');
  });

  test('recordFileModified creates a FileSaved event', () => {
    const recorder = createRecorder('npm', ['test']);
    recorder.recordFileModified('src/main.js');
    recorder.end(0);

    const session = loadSession(recorder.sessionId);
    assert.strictEqual(session.events.length, 1);
    assert.strictEqual(session.events[0].kind, 'FileSaved');
    assert.strictEqual(session.events[0].file, 'src/main.js');
  });

  test('end produces summary with exit code', () => {
    const recorder = createRecorder('npm', ['test']);
    recorder.recordTest('pass');
    recorder.end(1);

    const session = loadSession(recorder.sessionId);
    assert.strictEqual(session.summary.exitCode, 1);
  });
});
