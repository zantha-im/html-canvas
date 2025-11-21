const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { ROOT_DIR, TMP_JSCPD_DIR } = require('../utils/paths');

async function runJscpd(apiOpts = {}) {
  const tmpDir = TMP_JSCPD_DIR;
  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  } catch (_) {}

  const tmpScript = path.join(tmpDir, 'inline-jscpd.js');
  const reviewDir = path.join(ROOT_DIR, '.windsurf', 'review');
  const includeRoots = Array.isArray(apiOpts.includeRoots) && apiOpts.includeRoots.length > 0
    ? apiOpts.includeRoots
    : ["app", "components", "lib", "hooks", "types"]; // default project roots only
  const minTokens = typeof apiOpts.minTokens === 'number' && !Number.isNaN(apiOpts.minTokens)
    ? apiOpts.minTokens
    : 60; // default threshold (filters boilerplate patterns like routes while catching meaningful duplication)
  const scriptSource = [
    "const path = require('path');",
    "const fs = require('fs');",
    "const { createRequire } = require('module');",
    `const reviewDir = ${JSON.stringify(reviewDir)};`,
    "const reviewRequire = createRequire(path.join(reviewDir, 'package.json'));",
    "const { detectClones } = reviewRequire('jscpd');",
    '(async () => {',
    `  const includeRoots = ${JSON.stringify(includeRoots)};`,
    `  const minTokens = ${JSON.stringify(minTokens)};`,
    '  const cwd = process.cwd().replace(/\\\\/g, "/");',
    '  // Resolve includeRoots to absolute existing directories and normalize to POSIX for globbing reliability',
    '  const toAbs = (d) => (path.isAbsolute(d) ? d : path.join(cwd, d));',
    '  const toPosix = (p) => String(p).replace(/\\\\/g, "/");',
    '  const searchPaths = (Array.isArray(includeRoots) && includeRoots.length) ?',
    '    includeRoots.map(toAbs).filter(p => { try { return require("fs").existsSync(p); } catch (_) { return false; } }).map(toPosix) :',
    '    [cwd];',
    '  const opts = {',
    '    path: searchPaths,',
    '    pattern: "**/*.{ts,tsx,js}",',
    '    languages: ["javascript","typescript","tsx"],',
    '    ignore: ["**/{.next,node_modules,dist,build}/**","**/lib/generated/**","prisma/**"],',
    '    minTokens: minTokens,',
    '    absolute: true,',
    '    gitignore: false,',
    '    silent: true,',
    '    reporters: ["silent"]',
    '  };',
    '  const debug = { includeRoots, minTokens, searchPaths: opts.path, cwd };',
    '  const hc = { log: console.log, info: console.info, warn: console.warn };',
    '  let clones;',
    '  try {',
    '    console.log = () => {};',
    '    console.info = () => {};',
    '    console.warn = () => {};',
    '    clones = await detectClones(opts);',
    '  } finally {',
    '    console.log = hc.log;',
    '    console.info = hc.info;',
    '    console.warn = hc.warn;',
    '  }',
    '  debug.clonesShape = { isArray: Array.isArray(clones), type: typeof clones, keys: clones && Object.keys(clones) };',
    '  const safeNum = (v) => typeof v === "number" ? v : 0;',
    '  const raw = Array.isArray(clones) ? clones : ((clones && (clones.clones || clones.duplicates)) || []);',
    '  const dups = (Array.isArray(raw) ? raw : []).map(c => {',
    '    const srcs = Array.isArray(c.sources) ? c.sources : null;',
    '    const tokenGuess = (typeof c.tokens === "number" ? c.tokens : (typeof c.tokenCount === "number" ? c.tokenCount : 0));',
    '    const getName = (s) => (s && (s.id || s.sourceId || s.name)) || "";',
    '    const getLine = (s, key) => {',
    '      if (!s) return 0;',
    '      const v = s[key];',
    '      if (typeof v === "number") return v;',
    '      if (v && typeof v.line === "number") return v.line;',
    '      return 0;',
    '    };',
    '    if (srcs && srcs.length >= 2) {',
    '      const sA = srcs[0] || {};',
    '      const sB = srcs[1] || {};',
    '      const aName = getName(sA);',
    '      const bName = getName(sB);',
    '      const aStartLine = getLine(sA, "start");',
    '      const aEndLine = getLine(sA, "end");',
    '      const bStartLine = getLine(sB, "start");',
    '      const bEndLine = getLine(sB, "end");',
    '      const linesA = safeNum((aEndLine - aStartLine) + 1);',
    '      const linesB = safeNum((bEndLine - bStartLine) + 1);',
    '      const lines = Math.max(linesA, linesB);',
    '      return {',
    '        firstFile: { name: aName, start: aStartLine, end: aEndLine },',
    '        secondFile: { name: bName, start: bStartLine, end: bEndLine },',
    '        lines,',
    '        tokens: tokenGuess',
    '      };',
    '    }',
    '    // Fallback to older shape duplicationA/duplicationB',
    '    const a = c.duplicationA || {};',
    '    const b = c.duplicationB || {};',
    '    const aStart = a.start || {};',
    '    const aEnd = a.end || {};',
    '    const bStart = b.start || {};',
    '    const bEnd = b.end || {};',
    '    const lines = safeNum((safeNum(aEnd.line) - safeNum(aStart.line)) + 1);',
    '    return {',
    '      firstFile: { name: a.sourceId || "", start: safeNum(aStart.line), end: safeNum(aEnd.line) },',
    '      secondFile: { name: b.sourceId || "", start: safeNum(bStart.line), end: safeNum(bEnd.line) },',
    '      lines,',
    '      tokens: tokenGuess',
    '    };',
    '  }).filter(d => d.firstFile.name && d.secondFile.name && d.lines > 0);',
    '  const computed = {',
    '    clones: dups.length,',
    '    duplicatedLines: dups.reduce((a, c) => a + (c.lines || 0), 0)',
    '  };',
    '  // Pass-through percentage if provided by jscpd; otherwise omit to avoid misleading 0s',
    '  let pct;',
    '  try {',
    '    pct = (clones && clones.statistics && clones.statistics.total && typeof clones.statistics.total.percentage === "number") ? clones.statistics.total.percentage : ((clones && clones.statistic && clones.statistic.total && typeof clones.statistic.total.percentage === "number") ? clones.statistic.total.percentage : undefined);',
    '  } catch (_) { pct = undefined; }',
    '  const stats = { total: Object.assign({}, computed, (typeof pct === "number" && Number.isFinite(pct) ? { percentage: pct } : {})) };',
    '  const result = { duplicates: dups, statistics: stats, debug };',
    '  console.log(JSON.stringify(result));',
    '})().catch(err => {',
    '  console.error(JSON.stringify({ error: String(err && err.message || err) }));',
    '  process.exit(1);',
    '});'
  ].join('\n');

  try {
    fs.writeFileSync(tmpScript, scriptSource, 'utf8');
    const { stdout, stderr } = await execAsync(`node "${tmpScript}"`, { cwd: ROOT_DIR, maxBuffer: 64 * 1024 * 1024 });
    const out = String(stdout || stderr || '');
    try {
      return JSON.parse(out);
    } catch (parseErr) {
      return { error: `Failed to parse jscpd API output: ${parseErr.message}`, raw: out };
    }
  } catch (error) {
    const raw = error && (error.stdout?.toString() || error.stderr?.toString()) || '';
    try {
      return JSON.parse(raw);
    } catch (_) {
      return { error: `Failed to run jscpd API: ${error.message}`, raw };
    }
  } finally {
    try { if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript); } catch (_) {}
  }
}

module.exports = { runJscpd };
