import { suite, test } from './run.js';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MODULE_ORDER = [
  'ecosystem/data/monsters.js', 'ecosystem/data/moves.js', 'ecosystem/data/types.js', 'ecosystem/data/mapData.js', 'ecosystem/data/evolutions.js',
  'game/engine/events.js', 'game/engine/state.js', 'game/audio/sound.js', 'game/engine/input.js',
  'game/sprites/sprites.js', 'game/sprites/monsterGen.js', 'game/sprites/tiles.js',
  'game/world/map.js', 'game/world/player.js', 'game/world/encounters.js',
  'game/engine/renderer.js', 'game/engine/transition.js', 'game/sync/save.js', 'game/engine/title.js',
  'game/battle/damage.js', 'game/battle/battleEngine.js',
  'game/evolution/tracker.js', 'game/evolution/evolution.js', 'game/evolution/animation.js',
  'game/game.js',
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

suite('Import path validation', () => {
  test('all ES module imports in index.html resolve to real files', () => {
    const htmlPath = path.join(ROOT, 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Find all import ... from '...' statements
    const importRe = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let m;
    const errors = [];
    while ((m = importRe.exec(html)) !== null) {
      const importPath = m[1];
      // Resolve relative to ROOT (where index.html lives)
      const resolved = path.join(ROOT, importPath);
      if (!fs.existsSync(resolved)) {
        errors.push(`Import "${importPath}" resolves to "${resolved}" which does not exist`);
      }
    }

    // Also check <script type="module" src="..."> tags
    const srcRe = /<script[^>]+src=["']([^"']+)["'][^>]*>/g;
    while ((m = srcRe.exec(html)) !== null) {
      const srcPath = m[1];
      const resolved = path.join(ROOT, srcPath);
      if (!fs.existsSync(resolved)) {
        errors.push(`Script src="${srcPath}" resolves to "${resolved}" which does not exist`);
      }
    }

    assert.strictEqual(errors.length, 0,
      `Found ${errors.length} broken import path(s):\n  ${errors.join('\n  ')}`);
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
