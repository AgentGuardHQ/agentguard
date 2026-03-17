// Session recorder — captures canonical events during a watch session.
// Wraps the session store and provides high-level recording methods.

import { createSession } from './session-store.js';
import {
  createEvent,
  TEST_COMPLETED,
  FILE_SAVED,
} from '@red-codes/events';
import type { DomainEvent } from '@red-codes/core';

export interface Recorder {
  readonly sessionId: string;
  record(event: DomainEvent): void;
  recordTest(result: string, details?: Record<string, unknown>): void;
  recordFileModified(file: string): void;
  end(exitCode?: number): void;
}

export function createRecorder(command: string, args: string[] = []): Recorder {
  const fullCommand = [command, ...args].join(' ');
  const session = createSession({ command: fullCommand });
  const startTime = Date.now();

  return {
    get sessionId() {
      return session.id;
    },

    record(event: DomainEvent) {
      session.append(event as Record<string, unknown>);
    },

    recordTest(result: string, details: Record<string, unknown> = {}) {
      const event = createEvent(TEST_COMPLETED, { result, ...details });
      session.append(event as Record<string, unknown>);
    },

    recordFileModified(file: string) {
      const event = createEvent(FILE_SAVED, { file });
      session.append(event as Record<string, unknown>);
    },

    end(exitCode?: number) {
      session.end({
        exitCode: exitCode ?? null,
        duration: Date.now() - startTime,
      });
    },
  };
}
