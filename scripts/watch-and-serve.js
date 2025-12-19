const http = require('http');
const fs = require('fs');
const path = require('path');

const generate = require('./generate-games-list.js');

const ROOT = process.cwd();
const PORT = Number(process.env.PORT || 8000);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg'
};

let sseClients = new Set();
let lastGamesJson = '';

function sendSSE(event, data = '') {
  for (const res of sseClients) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${data}\n\n`);
    } catch (e) { /* ignore broken clients */ }
  }
}

function regenerateIfChanged() {
  try {
    const games = generate(); // writes games.json
    const str = JSON.stringify(games, null, 2);
    if (str !== lastGamesJson) {
      lastGamesJson = str;
      console.log('games.json changed; notifying clients');
      sendSSE('games-updated', '1');
    }
  } catch (err) {
    console.error('Error regenerating games.json', err);
  }
}

const server = http.createServer((req, res) => {
  const url = decodeURI(req.url.split('?')[0]);
  if (url === '/events') {
    // SSE endpoint
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write(':ok\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // Serve static files
  let safePath = path.normalize(path.join(ROOT, url));
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  // if directory, serve index.html
  let filePath = safePath;
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch (e) {
    // not found; try appending index.html only if url ends with '/'
    if (url.endsWith('/')) filePath = path.join(safePath, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const type = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT} on http://localhost:${PORT}`);
  // initial generation
  regenerateIfChanged();
  // poll to regenerate periodically (2s)
  setInterval(regenerateIfChanged, 2000);
});

function shutdown() {
  console.log('Shutting down server');
  server.close(() => process.exit(0));
  for (const res of sseClients) try { res.end(); } catch (e) {}
  sseClients.clear();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
