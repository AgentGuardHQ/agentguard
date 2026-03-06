import { suite, test } from './run.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MODULE_ORDER = [
  'data/monsters.js', 'data/moves.js', 'data/types.js', 'data/mapData.js', 'data/evolutions.js',
  'engine/events.js', 'engine/state.js', 'audio/sound.js', 'engine/input.js',
  'sprites/sprites.js', 'sprites/monsterGen.js', 'sprites/tiles.js',
  'world/map.js', 'world/player.js', 'world/encounters.js',
  'engine/renderer.js', 'engine/transition.js', 'sync/save.js', 'engine/title.js',
  'battle/damage.js', 'battle/battleEngine.js',
  'evolution/tracker.js', 'evolution/evolution.js', 'evolution/animation.js',
  'game.js',
];

suite('Variable collision detection', () => {
  test('no top-level const/let name collisions across modules', () => {
    const nameToFiles = new Map();
    const re = /^(?:export\s+)?(?:const|let)\s+(\w+)\s*[=;,]/gm;

    for (const mod of MODULE_ORDER) {
      const fp = path.join(ROOT, mod);
      if (!fs.existsSync(fp)) continue;
      const code = fs.readFileSync(fp, 'utf8');
      let m;
      while ((m = re.exec(code)) !== null) {
        const name = m[1];
        if (!nameToFiles.has(name)) nameToFiles.set(name, []);
        const files = nameToFiles.get(name);
        if (!files.includes(mod)) files.push(mod);
      }
    }

    const collisions = [];
    for (const [name, files] of nameToFiles) {
      if (files.length > 1) collisions.push(`${name}: ${files.join(', ')}`);
    }
    assert.strictEqual(collisions.length, 0,
      `Found ${collisions.length} variable collision(s):\n  ${collisions.join('\n  ')}`);
  });
});

suite('Build output validation', () => {
  test('build produces valid JavaScript', () => {
    execSync('node scripts/build.js --no-sprites --no-budget', { cwd: ROOT, stdio: 'pipe' });

    const outPath = path.join(ROOT, 'dist', 'index.html');
    assert.ok(fs.existsSync(outPath), 'dist/index.html should exist');

    const html = fs.readFileSync(outPath, 'utf8');
    const m = html.match(/<script>([\s\S]*)<\/script>/);
    assert.ok(m, 'should contain a <script> tag');

    assert.doesNotThrow(() => new Function(m[1]), SyntaxError, 'bundled JS should parse without errors');

    const size = Buffer.byteLength(html);
    assert.ok(size > 1024, `output too small: ${size} bytes`);
    assert.ok(size < 200 * 1024, `output too large: ${size} bytes`);
  });
});
