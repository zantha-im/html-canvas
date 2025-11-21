const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ROOT_DIR } = require('./paths');
const { isReviewablePath } = require('./filters');

function collectPorcelainFiles() {
  try {
    const out = execSync('git status --porcelain -z', { cwd: ROOT_DIR, encoding: 'utf8' });
    const tokens = out.split('\0').filter(Boolean);
    const rels = [];
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (!t || t.length < 3) continue;
      const xy = t.slice(0, 2);
      const rest = t.slice(3);
      // Skip deletions (staged or unstaged): 'D ' or ' D'
      if (xy[0] === 'D' || xy[1] === 'D') {
        continue;
      }
      if (xy[0] === 'R' || xy[0] === 'C') {
        const next = tokens[i + 1];
        const newPath = (typeof next === 'string' && next.length > 0) ? next : rest;
        const trimmed = String(newPath || '').trim();
        const abs = path.join(ROOT_DIR, trimmed);
        if (isReviewablePath(trimmed) && fs.existsSync(abs)) rels.push(trimmed);
        if (typeof next === 'string' && next.length > 0) i += 1;
      } else {
        const p = rest.trim();
        const abs = path.join(ROOT_DIR, p);
        if (isReviewablePath(p) && fs.existsSync(abs)) rels.push(p);
      }
    }
    const uniqueAbs = Array.from(new Set(rels)).map(r => path.join(ROOT_DIR, r));
    return uniqueAbs;
  } catch (e) {
    console.error(`Error running git porcelain: ${e.message}`);
    return [];
  }
}

module.exports = { collectPorcelainFiles };
