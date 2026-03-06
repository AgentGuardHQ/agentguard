#!/usr/bin/env node

/**
 * BugMon CLI — Pokemon-style encounters for runtime errors.
 *
 * Usage:
 *   bugmon <script.js>     Run a file, catch bugs as monsters
 *   bugmon --bugdex         Show all known BugMon
 *   bugmon --help           Show help
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { identify } = require('./bugdex');
const { showEncounter, showBugDex, showHelp } = require('./encounter');
const { getAllMonsters } = require('./bugdex');

// ── Parse args ────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  showHelp();
  process.exit(0);
}

if (args.includes('--bugdex')) {
  showBugDex(getAllMonsters());
  process.exit(0);
}

const scriptPath = args[0];
const scriptArgs = args.slice(1);

// Resolve the script path
const resolved = path.resolve(scriptPath);
if (!fs.existsSync(resolved)) {
  console.error(`\x1b[31mError: File not found: ${scriptPath}\x1b[0m`);
  process.exit(1);
}

// ── Run the script ────────────────────────────────────────

const child = spawn(process.execPath, [resolved, ...scriptArgs], {
  stdio: ['inherit', 'inherit', 'pipe'],
  env: { ...process.env },
});

let stderr = '';
let handled = false;

child.stderr.on('data', (data) => {
  stderr += data.toString();
});

child.on('close', async (code) => {
  if (handled) return;
  handled = true;

  if (code === 0) {
    // Clean exit — no bugs!
    console.log(`\n  \x1b[32m✓ No bugs encountered. Your code ran clean!\x1b[0m\n`);
    process.exit(0);
  }

  // Parse error info from stderr
  const errorInfo = parseError(stderr);

  // Identify the BugMon
  const monster = identify(stderr);

  // Show the encounter
  await showEncounter(monster, errorInfo);

  // Exit with the original error code
  process.exit(code);
});

child.on('error', async (err) => {
  if (handled) return;
  handled = true;

  const errorInfo = {
    message: err.message,
    file: scriptPath,
    line: null,
    stack: err.stack || '',
  };

  const monster = identify(err.message);
  await showEncounter(monster, errorInfo);
  process.exit(1);
});

// ── Error parsing ─────────────────────────────────────────

function parseError(stderrText) {
  const lines = stderrText.trim().split('\n');

  // Find the main error message (usually the line starting with ErrorType:)
  let message = '';
  let file = null;
  let line = null;
  let stack = '';

  for (const l of lines) {
    // Match error message like "TypeError: Cannot read properties of null"
    const errMatch = l.match(/^(\w*Error\w*):?\s*(.*)/);
    if (errMatch && !message) {
      message = l.trim();
      continue;
    }

    // Match file:line from stack trace
    const fileMatch = l.match(/at\s+.*?[(\s]([^(\s]+):(\d+):\d+/);
    if (fileMatch && !file) {
      file = fileMatch[1];
      line = fileMatch[2];
    }

    // Match Node.js style "    at file:line:col"
    const nodeMatch = l.match(/^\s+at\s/);
    if (nodeMatch) {
      stack += l + '\n';
    }
  }

  // Fallback: use first non-empty line as message
  if (!message && lines.length > 0) {
    message = lines.find((l) => l.trim().length > 0) || 'Unknown error';
  }

  // Try to extract file/line from the message line itself
  if (!file) {
    const msgFileMatch = stderrText.match(/([^\s:]+\.(?:js|ts|mjs|cjs)):(\d+)/);
    if (msgFileMatch) {
      file = msgFileMatch[1];
      line = msgFileMatch[2];
    }
  }

  return { message: message.trim(), file, line, stack: stack.trim() };
}
