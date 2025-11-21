const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { ROOT_DIR, toRepoRelative } = require('../utils/paths');

// Run TypeScript compiler (project-wide) and collect diagnostics
async function runTsc(tsconfigPathArg) {
  const byFile = {};
  let totalErrors = 0;
  const reviewTsconfig = path.join(ROOT_DIR, '.windsurf', 'review', 'tsconfig.review.json');
  const defaultTsconfig = fs.existsSync(reviewTsconfig) ? reviewTsconfig : path.join(ROOT_DIR, 'tsconfig.json');
  const tsconfigPathUsed = tsconfigPathArg || defaultTsconfig;
  const reviewDir = path.join(ROOT_DIR, '.windsurf', 'review');
  const prefix = `npx --prefix "${reviewDir.replace(/"/g, '\\"')}"`;
  const cmd = fs.existsSync(tsconfigPathUsed)
    ? `${prefix} tsc --noEmit --pretty false -p "${tsconfigPathUsed.replace(/"/g, '\\"')}"`
    : `${prefix} tsc --noEmit --pretty false`;
  try {
    // Success: no compiler errors
    await execAsync(cmd, { cwd: ROOT_DIR, maxBuffer: 64 * 1024 * 1024 });
    return { byFile, totalErrors, tsconfigPath: tsconfigPathUsed };
  } catch (error) {
    const out = (error && (error.stdout?.toString() || error.stderr?.toString())) || '';
    const lines = out.split(/\r?\n/);
    const add = (fileKey, item) => {
      if (!byFile[fileKey]) byFile[fileKey] = [];
      byFile[fileKey].push(item);
      totalErrors++;
    };
    for (const raw of lines) {
      const line = String(raw || '').trim();
      if (!line || !/error\s+TS\d+/i.test(line)) continue;
      // Pattern 1: C:\\path\\file.ts(12,34): error TS1234: Message
      let m = line.match(/^(.*\.(?:ts|tsx))\((\d+),(\d+)\):\s*error\s+TS(\d+):\s*(.+)$/i);
      if (m) {
        const fileRaw = m[1];
        const fileAbs = path.isAbsolute(fileRaw) ? fileRaw : path.join(ROOT_DIR, fileRaw);
        const fileKey = toRepoRelative(fileAbs);
        add(fileKey, { line: parseInt(m[2], 10), column: parseInt(m[3], 10), code: `TS${m[4]}`, message: m[5] });
        continue;
      }
      // Pattern 2: C:\\path\\file.ts:12:34 - error TS1234: Message
      m = line.match(/^(.*\.(?:ts|tsx)):(\d+):(\d+)\s*-\s*error\s+TS(\d+):\s*(.+)$/i);
      if (m) {
        const fileRaw = m[1];
        const fileAbs = path.isAbsolute(fileRaw) ? fileRaw : path.join(ROOT_DIR, fileRaw);
        const fileKey = toRepoRelative(fileAbs);
        add(fileKey, { line: parseInt(m[2], 10), column: parseInt(m[3], 10), code: `TS${m[4]}`, message: m[5] });
        continue;
      }
      // Pattern 3: Global error without file path: error TS1234: Message
      m = line.match(/^error\s+TS(\d+):\s*(.+)$/i);
      if (m) {
        add('__global__', { line: 0, column: 0, code: `TS${m[1]}`, message: m[2] });
        continue;
      }
      // Fallback: unparsed line, still count to avoid false PASS
      add('__global__', { line: 0, column: 0, code: 'UNKNOWN', message: line });
    }
    return { byFile, totalErrors, tsconfigPath: tsconfigPathUsed, raw: out };
  }
}

module.exports = { runTsc };
