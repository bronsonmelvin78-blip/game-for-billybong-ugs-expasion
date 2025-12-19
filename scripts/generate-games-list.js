const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'games.json');
const IGNORES = new Set(['node_modules', '.git', '.vscode', '.github', 'scripts']);

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORES.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

function generate() {
  const games = [];
  walk(ROOT, (file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const lower = file.toLowerCase();
    if ((lower.endsWith('.html') || lower.endsWith('.htm')) && !/(^|\/)index\.html?$/i.test(rel)) {
      games.push({
        name: path.basename(file),
        path: './' + rel
      });
    }
  });
  fs.writeFileSync(OUT, JSON.stringify(games, null, 2));
  console.log(`Wrote ${games.length} entries to ${OUT}`);
  return games;
}

module.exports = generate;

if (require.main === module) {
  generate();
}
