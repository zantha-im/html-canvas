 const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const { ROOT_DIR, OUTPUT_DIR } = require('../utils/paths');

/** Detect if project-level ESLint config exists at repo root */
function detectProjectEslintConfig() {
  try {
    const candidates = [
      'eslint.config.js', 'eslint.config.cjs', 'eslint.config.mjs',
      '.eslintrc', '.eslintrc.js', '.eslintrc.cjs', '.eslintrc.json', '.eslintrc.yaml', '.eslintrc.yml',
      'package.json'
    ];
    for (const name of candidates) {
      const p = path.join(ROOT_DIR, name);
      if (fs.existsSync(p)) {
        if (name === 'package.json') {
          try {
            const pkg = JSON.parse(fs.readFileSync(p, 'utf8'));
            if (pkg && pkg.eslintConfig) return true;
          } catch (_) {}
        } else {
          return true;
        }
      }
    }
  } catch (_) {}
  return false;
}

function parseEslintJson(raw) {
  let arr;
  try { arr = JSON.parse(raw); } catch { arr = []; }
  if (!Array.isArray(arr)) arr = [];
  const map = {};
  for (const item of arr) {
    const key = path.resolve(item.filePath || '');
    const errors = [];
    const warnings = [];
    const msgs = Array.isArray(item.messages) ? item.messages : [];
    for (const m of msgs) {
      const entry = {
        line: m.line || 0,
        column: m.column || 0,
        endLine: m.endLine || undefined,
        endColumn: m.endColumn || undefined,
        message: (m.message || '').trim(),
        rule: m.ruleId || null,
        fixable: !!m.fix
      };
      if (m.severity === 2) errors.push(entry); else if (m.severity === 1) warnings.push(entry);
    }
    map[key] = { errors, warnings };
  }
  return map;
}
// Run ESLint once for a batch of files using the PROJECT configuration.
// Returns a map: absolutePath -> { errors, warnings }.
// Throws on execution or parse failure. No per-file fallback.
async function runEslintBatch(filePaths) {
  const files = Array.isArray(filePaths) ? filePaths.filter(Boolean) : [];
  const resultMap = {};
  if (files.length === 0) return resultMap;

  const reviewDir = path.join(ROOT_DIR, '.windsurf', 'review');
  const q = (s) => `"${String(s).replace(/"/g, '\\"')}"`;
  const cacheDir = path.join(OUTPUT_DIR, '.tmp', 'eslint');
  try { fs.mkdirSync(cacheDir, { recursive: true }); } catch (_) {}
  const cachePath = path.join(cacheDir, 'project.cache');
  const timeout = 180000;

  // Helper to run a single ESLint invocation for a subset of files
  const runOnce = async (subset) => {
    const quoted = subset.map(fp => q(fp)).join(' ');
    const cmd = `npx --prefix ${q(reviewDir)} eslint --ext .ts,.tsx --format json --cache --cache-location ${q(cachePath)} ${quoted}`;
    try {
      const { stdout, stderr } = await execAsync(cmd, { cwd: ROOT_DIR, maxBuffer: 64 * 1024 * 1024, timeout });
      const errTxt = String(stderr || '').trim();
      if (errTxt) {
        // Treat any stderr output as a hard failure to avoid partial/ambiguous results
        throw new Error(errTxt.slice(0, 2000));
      }
      const raw = String(stdout || '[]');
      return parseEslintJson(raw);
    } catch (err) {
      const stdoutTxt = String(err && err.stdout ? err.stdout.toString() : '').trim();
      const stderrTxt = String(err && err.stderr ? err.stderr.toString() : '').trim();
      // Even if eslint exits non-zero, it typically prints valid JSON to stdout. Prefer parsing it.
      if (stdoutTxt) {
        try {
          return parseEslintJson(stdoutTxt);
        } catch (_) {
          // fall through to throw with stderr context
        }
      }
      const snippet = (stderrTxt || (err && err.message) || 'ESLint execution failed').toString().slice(0, 2000);
      const e = new Error(`ESLint sub-batch failed: ${snippet}`);
      e.code = 'ESLINT_BATCH_FAILED';
      throw e;
    }
  };

  // On Windows, avoid hitting command line length limits by using smaller sub-batches
  const isWin = process.platform === 'win32';
  const SUB_BATCH = isWin ? 60 : files.length;
  if (files.length <= SUB_BATCH) {
    try {
      return await runOnce(files);
    } catch (err) {
      const raw = String((err && (err.stdout?.toString() || err.stderr?.toString())) || '').trim();
      const msg = raw ? raw.slice(0, 2000) : String(err && err.message || 'ESLint execution failed');
      const e = new Error(`ESLint batch failed: ${msg}`);
      e.code = 'ESLINT_BATCH_FAILED';
      throw e;
    }
  }

  // Run multiple sub-batches and merge
  const promises = [];
  for (let i = 0; i < files.length; i += SUB_BATCH) {
    const subset = files.slice(i, i + SUB_BATCH);
    promises.push(runOnce(subset));
  }
  try {
    const maps = await Promise.all(promises);
    const merged = {};
    for (const m of maps) {
      for (const [k, v] of Object.entries(m)) merged[k] = v;
    }
    return merged;
  } catch (err) {
    const raw = String((err && (err.stdout?.toString() || err.stderr?.toString())) || '').trim();
    const msg = raw ? raw.slice(0, 2000) : String(err && err.message || 'ESLint execution failed');
    const e = new Error(`ESLint batch failed: ${msg}`);
    e.code = 'ESLINT_BATCH_FAILED';
    throw e;
  }
}

module.exports = { runEslintBatch, detectProjectEslintConfig };

