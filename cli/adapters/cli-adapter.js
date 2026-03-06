// CLI adapter — wraps child processes and intercepts stderr errors

import { spawn } from 'node:child_process';
import { parseErrors } from '../core/error-parser.js';
import { parseStackTrace, getUserFrame } from '../core/stacktrace-parser.js';
import { matchMonster } from '../monsters/matcher.js';
import { recordEncounter } from '../bugdex/bugdex.js';
import { renderEncounter } from '../ui/terminal-renderer.js';

/**
 * Run a command and intercept errors from stderr.
 * @param {string} command - The command to run
 * @param {string[]} args - Command arguments
 * @returns {Promise<number>} Exit code
 */
export function watch(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'inherit', 'pipe'],
      shell: process.platform === 'win32',
    });

    let stderrBuffer = '';

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;

      // Pass stderr through immediately so developers still see real output
      process.stderr.write(chunk);
    });

    child.on('error', (err) => {
      process.stderr.write(`bugmon: failed to start "${command}": ${err.message}\n`);
      resolve(1);
    });

    child.on('close', (code) => {
      // Process accumulated stderr for errors
      if (stderrBuffer.length > 0) {
        processErrors(stderrBuffer);
      }
      resolve(code || 0);
    });
  });
}

/**
 * Process a block of stderr text, find errors, and render encounters.
 * @param {string} text
 */
function processErrors(text) {
  const errors = parseErrors(text);

  for (const error of errors) {
    // Parse stack trace for location info
    const frames = parseStackTrace(error.rawLines);
    const location = getUserFrame(frames);

    // Match to a BugMon
    const { monster, confidence } = matchMonster(error);

    // Record in BugDex
    const { xpGained, isNew } = recordEncounter(
      monster,
      error.message,
      location?.file || null,
      location?.line || null,
    );

    // Render the encounter
    renderEncounter(monster, error, location, confidence);

    // XP notification
    const parts = [`+${xpGained} XP`];
    if (isNew) parts.push('NEW BugDex entry!');
    process.stderr.write(`  ${parts.join(' | ')}\n\n`);
  }
}
