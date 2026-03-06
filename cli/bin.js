#!/usr/bin/env node

// BugMon CLI — debugging tool with game aesthetics
// Usage:
//   bugmon watch -- <command>     Wrap a command and catch bugs
//   bugmon dex                    View your BugDex
//   bugmon stats                  View your bug hunter stats
//   bugmon help                   Show help

import { watch } from './adapters/cli-adapter.js';
import { loadBugDex } from './bugdex/bugdex.js';
import { getAllMonsters } from './monsters/matcher.js';
import { renderBugDex, renderStats } from './ui/terminal-renderer.js';

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'watch': {
    const dashDash = args.indexOf('--');
    if (dashDash === -1 || dashDash === args.length - 1) {
      printUsage('watch requires a command after --');
      process.exit(1);
    }
    const cmd = args[dashDash + 1];
    const cmdArgs = args.slice(dashDash + 2);
    const code = await watch(cmd, cmdArgs);
    process.exit(code);
  }

  case 'dex': {
    const data = loadBugDex();
    const monsters = getAllMonsters();
    renderBugDex(data, monsters);
    break;
  }

  case 'stats': {
    const data = loadBugDex();
    renderStats(data.stats);
    break;
  }

  case 'help':
  case '--help':
  case '-h':
  case undefined:
    printHelp();
    break;

  default:
    printUsage(`Unknown command: ${command}`);
    process.exit(1);
}

function printHelp() {
  console.log(`
  BugMon — Debugging tool with game aesthetics

  Every error is a wild BugMon encounter.
  Catch 'em all in your BugDex.

  Usage:
    bugmon watch -- <command>   Wrap a command and catch bugs
    bugmon dex                  View your BugDex
    bugmon stats                View your bug hunter stats
    bugmon help                 Show this help

  Examples:
    bugmon watch -- npm run dev
    bugmon watch -- node server.js
    bugmon watch -- npx tsc --noEmit
    bugmon dex
`);
}

function printUsage(error) {
  console.error(`  Error: ${error}`);
  console.error('  Run "bugmon help" for usage info.');
}
