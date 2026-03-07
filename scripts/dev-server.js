#!/usr/bin/env node
// Lightweight dev server with live reload
// Uses Node.js built-in http + fs.watch (zero extra dependencies)
// Usage: node scripts/dev-server.js [port]

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = parseInt(process.argv[2], 10) || 8000;

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// SSE clients for live reload
const sseClients = new Set();

const RELOAD_SCRIPT = `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>`;

const server = http.createServer((req, res) => {
  // SSE endpoint for live reload
  if (req.url === '/__reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  filePath = path.normalize(filePath);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });

    // Inject live reload script into HTML responses
    if (ext === '.html') {
      const html = data.toString().replace('</body>', `${RELOAD_SCRIPT}</body>`);
      res.end(html);
    } else {
      res.end(data);
    }
  });
});

// Watch for file changes and notify SSE clients
let debounce = null;
const WATCH_DIRS = ['game', 'ecosystem', 'core'].map(d => path.join(ROOT, d));

function notifyReload() {
  for (const client of sseClients) {
    client.write('data: reload\n\n');
  }
}

for (const dir of WATCH_DIRS) {
  if (fs.existsSync(dir)) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(debounce);
      debounce = setTimeout(notifyReload, 150);
    });
  }
}

// Also watch index.html
fs.watch(path.join(ROOT, 'index.html'), () => {
  clearTimeout(debounce);
  debounce = setTimeout(notifyReload, 150);
});

server.listen(PORT, () => {
  console.log(`\n  BugMon dev server running at \x1b[36mhttp://localhost:${PORT}\x1b[0m`);
  console.log('  Live reload enabled — editing files will auto-refresh the browser.');
  console.log('  \x1b[2mPress Ctrl+C to stop.\x1b[0m\n');
});
