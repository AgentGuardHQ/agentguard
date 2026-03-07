// Terminal renderer — ANSI-colored output for BugMon encounters
// Zero dependencies: raw ANSI escape codes

import { renderBugDexContributionPrompt, BUGDEX_CONTRIBUTION_MIN } from './contribute.js';
import { RESET, BOLD, DIM, TYPE_COLORS, color, bold, dim, padVis } from './colors.js';

// ── ASCII art per type ──

const TYPE_ART = {
  frontend: [
    ' ┌─────┐ ',
    ' │ </> │ ',
    ' │ ┌─┐ │ ',
    ' │ └─┘ │ ',
    ' └─────┘ ',
  ],
  backend: [
    ' ┌─[==]─┐',
    ' │ ░░░░ │',
    ' │ ▓▓▓▓ │',
    ' │ ░░░░ │',
    ' └──────┘',
  ],
  devops: [
    ' *─────* ',
    ' │ >>> │ ',
    ' │ === │ ',
    ' │ <<< │ ',
    ' *─────* ',
  ],
  testing: [
    ' ╭──v──╮ ',
    ' │ x v │ ',
    ' │ v x │ ',
    ' │ x v │ ',
    ' ╰──x──╯ ',
  ],
  architecture: [
    ' ╔═╦═╦═╗ ',
    ' ║ ║ ║ ║ ',
    ' ╠═╬═╬═╣ ',
    ' ║ ║ ║ ║ ',
    ' ╚═╩═╩═╝ ',
  ],
  security: [
    ' ┌──*──┐ ',
    ' │ /|\\ │ ',
    ' │/ | \\│ ',
    ' │\\ | /│ ',
    ' └──*──┘ ',
  ],
  ai: [
    ' ╭─────╮ ',
    ' │ 0 1 │ ',
    ' │ 1 0 │ ',
    ' │ 0 1 │ ',
    ' ╰─────╯ ',
  ],
};

// ── Renderers ──

/**
 * Render a BugMon encounter card to the terminal.
 */
export function renderEncounter(monster, error, location, confidence) {
  const typeColor = TYPE_COLORS[monster.type] || 'white';
  const art = TYPE_ART[monster.type] || TYPE_ART.runtime;
  const W = 48; // inner width (between the border chars)

  const border = color('║', typeColor);
  const hr = '═'.repeat(W);

  const row = (content) => `${border}${padVis(content, W)}${border}`;
  const empty = () => row('');

  const lines = [];
  lines.push('');
  lines.push(color(`╔${hr}╗`, typeColor));
  lines.push(row(bold(`  Wild ${monster.name} appeared!`)));
  lines.push(empty());

  // ASCII art
  for (const artLine of art) {
    lines.push(row(`  ${artLine}`));
  }
  lines.push(empty());

  // Type and HP bar
  const hpBar = renderHPBar(monster.hp, monster.hp, 10);
  lines.push(row(`  Type: ${color(monster.type.toUpperCase(), typeColor)}    HP: ${hpBar} ${monster.hp}`));
  lines.push(empty());

  // Error message (word-wrapped)
  const msgLines = wordWrap(error.message, W - 4);
  for (const ml of msgLines) {
    lines.push(row(`  ${color(ml, 'red')}`));
  }
  lines.push(empty());

  // File location
  if (location) {
    const loc = `  >> ${location.file}:${location.line}${location.column ? ':' + location.column : ''}`;
    lines.push(row(color(loc, 'cyan')));
    lines.push(empty());
  }

  // Fix tip
  if (monster.fixTip) {
    const tipLines = wordWrap(monster.fixTip, W - 10);
    lines.push(row(color(`  Tip: ${tipLines[0]}`, 'green')));
    for (let i = 1; i < tipLines.length; i++) {
      lines.push(row(color(`       ${tipLines[i]}`, 'green')));
    }
  }

  lines.push(color(`╚${hr}╝`, typeColor));
  lines.push('');

  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * Render the BugDex summary.
 */
export function renderBugDex(dexData, allMonsters) {
  const seen = dexData.seen || {};
  const total = allMonsters.length;
  const discovered = Object.keys(seen).length;

  const lines = [];
  lines.push('');
  lines.push(bold(color('  ╔══════════════════════════════════════╗', 'cyan')));
  lines.push(bold(color('  ║           B U G D E X               ║', 'cyan')));
  lines.push(bold(color('  ╚══════════════════════════════════════╝', 'cyan')));
  lines.push('');
  lines.push(`  Discovered: ${bold(`${discovered}/${total}`)} (${Math.round(discovered / total * 100)}%)`);
  lines.push('');

  for (const monster of allMonsters) {
    const count = seen[monster.id] || 0;
    const typeColor = TYPE_COLORS[monster.type] || 'white';

    if (count > 0) {
      const name = monster.name.padEnd(20);
      const type = color(monster.type.padEnd(10), typeColor);
      const encounters = dim(`x${count}`);
      lines.push(`  ${color('#' + String(monster.id).padStart(2, '0'), 'gray')} ${bold(name)} ${type} ${encounters}`);
    } else {
      lines.push(`  ${color('#' + String(monster.id).padStart(2, '0'), 'gray')} ${dim('???'.padEnd(20))} ${dim('???'.padEnd(10))}`);
    }
  }

  // Contribution nudge for engaged users
  if (discovered >= BUGDEX_CONTRIBUTION_MIN) {
    lines.push(...renderBugDexContributionPrompt(discovered));
  }

  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

/**
 * Render player stats.
 */
export function renderStats(stats) {
  const level = stats.level || 1;
  const xp = stats.xp || 0;
  const nextLevel = getXPForLevel(level + 1);
  const xpBar = renderHPBar(xp - getXPForLevel(level), nextLevel - getXPForLevel(level), 20);

  const lines = [];
  lines.push('');
  lines.push(bold('  Bug Hunter Stats'));
  lines.push(`  Level: ${bold(String(level))}  XP: ${xp}/${nextLevel}`);
  lines.push(`  ${xpBar}`);
  lines.push(`  Encounters: ${bold(String(stats.totalEncounters || 0))}`);
  lines.push(`  Resolved:   ${bold(color(String(stats.totalResolved || 0), 'green'))}`);
  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

// ── Utilities ──

function renderHPBar(current, max, width) {
  const ratio = max > 0 ? current / max : 0;
  const filled = Math.round(ratio * width);
  const bar = '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, width - filled));
  return color(bar, ratio > 0.5 ? 'green' : ratio > 0.25 ? 'yellow' : 'red');
}

function wordWrap(text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

/**
 * Render the player's party.
 */
export function renderParty(party) {
  if (!party || party.length === 0) {
    process.stdout.write('\n  No BugMon in your party yet.\n  Run "bugmon watch --cache -- <command>" to start caching!\n\n');
    return;
  }

  const lines = [];
  lines.push('');
  lines.push(bold(color('  ╔══════════════════════════════════════╗', 'yellow')));
  lines.push(bold(color('  ║           P A R T Y                 ║', 'yellow')));
  lines.push(bold(color('  ╚══════════════════════════════════════╝', 'yellow')));
  lines.push('');

  for (let i = 0; i < party.length; i++) {
    const mon = party[i];
    const typeColor = TYPE_COLORS[mon.type] || 'white';
    const hp = mon.currentHP ?? mon.hp;
    const bar = renderHPBar(hp, mon.hp, 10);
    const name = bold(mon.name.padEnd(18));
    const type = color(mon.type.padEnd(10), typeColor);
    lines.push(`  ${color(`[${i + 1}]`, 'gray')} ${name} ${type} ${bar} ${hp}/${mon.hp}`);
  }

  lines.push('');
  process.stdout.write(lines.join('\n') + '\n');
}

/**
 * Render the encounter prompt — asks if the player wants to fight.
 */
export function renderEncounterPrompt(monster) {
  const typeColor = TYPE_COLORS[monster.type] || 'white';
  const lines = [];
  lines.push('');
  lines.push(color('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', typeColor));
  lines.push(`  ${bold(`A wild ${color(monster.name, typeColor)} appeared!`)}`);
  lines.push(`  Type: ${color(monster.type.toUpperCase(), typeColor)}  HP: ${monster.hp}  ATK: ${monster.attack}  SPD: ${monster.speed}`);
  lines.push(color('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', typeColor));
  lines.push('');
  process.stderr.write(lines.join('\n') + '\n');
}

/**
 * Render a boss encounter card — red theme, ASCII art, defeat condition.
 */
export function renderBossEncounter(boss) {
  const W = 48;
  const border = color('║', 'red');
  const hr = '═'.repeat(W);

  const row = (content) => `${border}${padVis(content, W)}${border}`;
  const empty = () => row('');

  const lines = [];
  lines.push('');
  lines.push(color(`╔${hr}╗`, 'red'));
  lines.push(row(bold(color(`  ★ BOSS: ${boss.name} ★`, 'red'))));
  lines.push(empty());

  // ASCII art
  if (boss.ascii) {
    for (const artLine of boss.ascii) {
      lines.push(row(`  ${artLine}`));
    }
    lines.push(empty());
  }

  // Type and HP bar
  const typeColor = TYPE_COLORS[boss.type] || 'white';
  const hpBar = renderHPBar(boss.hp, boss.hp, 10);
  lines.push(row(`  Type: ${color(boss.type.toUpperCase(), typeColor)}    HP: ${hpBar} ${boss.hp}`));
  lines.push(empty());

  // Description
  if (boss.description) {
    const descLines = wordWrap(boss.description, W - 4);
    for (const dl of descLines) {
      lines.push(row(`  ${dim(dl)}`));
    }
    lines.push(empty());
  }

  // Defeat condition
  if (boss.defeatCondition) {
    lines.push(row(color(`  To defeat: ${boss.defeatCondition}`, 'cyan')));
    lines.push(empty());
  }

  lines.push(color(`╚${hr}╝`, 'red'));
  lines.push('');

  process.stderr.write(lines.join('\n') + '\n');
}

function getXPForLevel(level) {
  // 0, 100, 300, 600, 1000, 1500, 2100, ...
  return level <= 1 ? 0 : (level * (level - 1)) / 2 * 100;
}
