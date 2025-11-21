const fs = require('fs');
const path = require('path');
const { toRepoRelative, ROOT_DIR } = require('../utils/paths');

function applyKnipToResults(results, knipData, opts = {}) {
  const byFile = new Map();
  for (const r of results) {
    byFile.set(toRepoRelative(r.filePath), r);
  }

  const summary = {
    unusedFiles: Array.isArray(knipData?.files) ? knipData.files.length : 0,
    unusedExports: 0,
    unusedTypes: 0,
    unusedExportedTypes: 0,
    unusedEnumMembers: 0,
    unusedClassMembers: 0,
    unlistedDependencies: 0,
    unresolvedImports: 0
  };

  const details = {
    unresolvedImports: [], // { file, specifiers: string[] }
    unlistedDependencies: [], // { file, modules: string[] }
    unusedFiles: [], // string[] repo-relative paths
    unusedExports: [], // { file, names: string[] }
    unusedTypes: [], // { file, names: string[] }
    unusedExportedTypes: [], // { file, names: string[] }
    unusedEnumMembers: [], // { file, enums: Array<{ enum, members: string[] }> }
    unusedClassMembers: [] // { file, classes: Array<{ class, members: string[] }> }
  };

  const issues = Array.isArray(knipData?.issues) ? knipData.issues : [];

  // Collect repo-level unused files details if available
  if (Array.isArray(knipData?.files)) {
    for (const f of knipData.files) {
      const rel = toRepoRelative(typeof f === 'string' ? f : (f && f.file) ? f.file : String(f || ''));
      if (rel) details.unusedFiles.push(rel);
    }
  }
  const toName = (e) => {
    if (typeof e === 'string') return e;
    if (e && typeof e === 'object') {
      if ('name' in e && typeof e.name === 'string') return e.name;
      if ('symbol' in e && typeof e.symbol === 'string') return e.symbol;
      try { return JSON.stringify(e); } catch (_) { return String(e); }
    }
    return String(e);
  };

  // Build map of candidate type names per file for deeper analysis
  const typeCandidatesByFile = new Map(); // file -> Set<string>
  for (const item of issues) {
    const fileKey = toRepoRelative(item.file || '');
    const typeNames = Array.isArray(item?.types) ? item.types : [];
    if (fileKey && typeNames.length > 0) {
      const set = typeCandidatesByFile.get(fileKey) || new Set();
      for (const t of typeNames) {
        const n = (typeof t === 'string') ? t : (t && typeof t === 'object' && ('name' in t) ? t.name : null);
        if (n) set.add(String(n));
      }
      if (set.size) typeCandidatesByFile.set(fileKey, set);
    }
  }

  // Analyze files in parallel (bounded) to split truly unused vs unused-exported (internally referenced)
  const concurrency = Math.max(1, Number(opts.concurrency || 8));
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const analyzeResults = new Map(); // file -> { unused: string[], unusedExported: string[] }
  const filesToAnalyze = Array.from(typeCandidatesByFile.keys());
  let idx = 0;
  async function worker() {
    while (idx < filesToAnalyze.length) {
      const i = idx++;
      const fileRel = filesToAnalyze[i];
      const abs = path.join(ROOT_DIR, fileRel);
      let content = '';
      try { content = fs.readFileSync(abs, 'utf8'); } catch (_) { content = ''; }
      const names = Array.from(typeCandidatesByFile.get(fileRel) || []);
      const unused = [];
      const unusedExported = [];
      for (const name of names) {
        if (!content) { unused.push(name); continue; }
        const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, 'g');
        let count = 0;
        for (const _m of content.matchAll(re)) { count++; if (count > 1) break; }
        // If referenced more than once in the same file, we assume internal usage exists (export unused externally)
        if (count > 1) unusedExported.push(name); else unused.push(name);
      }
      analyzeResults.set(fileRel, { unused, unusedExported });
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, filesToAnalyze.length) }, () => worker());
  // Run bounded workers synchronously (await all)
  return Promise.all(workers).then(() => {
    // Pre-mark per-file results for files Knip reports as unused
    if (Array.isArray(details.unusedFiles) && details.unusedFiles.length) {
      for (const rel of details.unusedFiles) {
        const r = byFile.get(rel);
        if (r) {
          if (!r.deadCode) r.deadCode = { recommendations: [] };
          r.deadCode.unusedFile = true;
          r.deadCode.status = 'FAIL';
          const delGuidance = 'Candidate for deletion. Investigate thoroughly (check dynamic imports, runtime requires, config/test/tooling references). If truly unused, delete the file rather than archiving or excluding it.';
          if (!Array.isArray(r.deadCode.recommendations)) r.deadCode.recommendations = [];
          // Prepend deletion guidance if not already present
          if (!r.deadCode.recommendations.includes(delGuidance)) {
            r.deadCode.recommendations.unshift(delGuidance);
          }
        }
      }
    }
    for (const item of issues) {
      const fileKey = toRepoRelative(item.file || '');
      const countsBase = {
        unusedExports: Array.isArray(item.exports) ? item.exports.length : 0,
        // types are split into two buckets using analyzeResults when available
        unusedTypes: 0,
        unusedExportedTypes: 0,
        unusedEnumMembers: item.enumMembers ? Object.values(item.enumMembers).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0) : 0,
        unusedClassMembers: item.classMembers ? Object.values(item.classMembers).reduce((a, arr) => a + (Array.isArray(arr) ? arr.length : 0), 0) : 0,
        unlistedDependencies: Array.isArray(item.unlisted) ? item.unlisted.length : 0,
        unresolvedImports: Array.isArray(item.unresolved) ? item.unresolved.length : 0
      };

      const split = analyzeResults.get(fileKey);
      const unusedTypeNames = split ? split.unused : (Array.isArray(item.types) ? item.types.map(toName) : []);
      const unusedExportedTypeNames = split ? split.unusedExported : [];

      summary.unusedExports += countsBase.unusedExports;
      summary.unusedTypes += unusedTypeNames.length;
      summary.unusedExportedTypes += unusedExportedTypeNames.length;
      summary.unusedEnumMembers += countsBase.unusedEnumMembers;
      summary.unusedClassMembers += countsBase.unusedClassMembers;
      summary.unlistedDependencies += countsBase.unlistedDependencies;
      summary.unresolvedImports += countsBase.unresolvedImports;

      const r = byFile.get(fileKey);
      if (r) {
        const any = countsBase.unusedExports > 0 || unusedTypeNames.length > 0 || unusedExportedTypeNames.length > 0 || countsBase.unusedEnumMembers > 0 || countsBase.unusedClassMembers > 0 || countsBase.unlistedDependencies > 0 || countsBase.unresolvedImports > 0;
        const recs = [];
        if (countsBase.unusedExports > 0) recs.push('Remove unused export(s) or their references.');
        if (unusedExportedTypeNames.length > 0) recs.push('Make exported type(s) non-exported if only used internally.');
        if (unusedTypeNames.length > 0) recs.push('Remove unused type(s) or inline where needed.');
        if (countsBase.unusedEnumMembers > 0) recs.push('Remove unused enum member(s).');
        if (countsBase.unusedClassMembers > 0) recs.push('Remove unused class member(s).');
        if (countsBase.unlistedDependencies > 0) recs.push('Remove unlisted dependency usage or add to package.json appropriately.');
        if (countsBase.unresolvedImports > 0) recs.push('Fix unresolved import(s): verify path/alias/tsconfig paths.');

        // If the whole file is unused, ensure strong deletion guidance is present
        if (Array.isArray(details.unusedFiles) && details.unusedFiles.includes(fileKey)) {
          recs.unshift('Candidate for deletion. Investigate thoroughly; if truly unused, delete the file.');
        }

        const unresolvedListRaw = Array.isArray(item.unresolved) ? item.unresolved.slice() : [];
        const unresolvedList = unresolvedListRaw.map(u => (u && typeof u === 'object' && 'name' in u) ? u.name : String(u));
        const unlistedList = Array.isArray(item.unlisted) ? item.unlisted.slice() : [];

        const dc = {
          unusedExports: countsBase.unusedExports,
          unusedTypes: unusedTypeNames.length,
          unusedExportedTypes: unusedExportedTypeNames.length,
          status: any ? 'FAIL' : 'PASS',
          recommendations: recs
        };
        if (countsBase.unresolvedImports > 0) dc.unresolvedImportSpecifiers = unresolvedList;
        if (countsBase.unlistedDependencies > 0) dc.unlistedDependencyModules = unlistedList;
        if (countsBase.unusedExports > 0) dc.unusedExportNames = Array.isArray(item.exports) ? item.exports.map(toName) : [];
        if (unusedTypeNames.length > 0) dc.unusedTypeNames = unusedTypeNames.slice();
        if (unusedExportedTypeNames.length > 0) dc.unusedExportedTypeNames = unusedExportedTypeNames.slice();
        if (countsBase.unusedEnumMembers > 0 && item.enumMembers) {
          const enums = Object.entries(item.enumMembers).map(([enm, members]) => ({ enum: enm, members: Array.isArray(members) ? members.map(toName) : [] }));
          dc.unusedEnumMemberNames = enums.filter(e => e.members.length > 0);
        }
        if (countsBase.unusedClassMembers > 0 && item.classMembers) {
          const classes = Object.entries(item.classMembers).map(([cls, members]) => ({ class: cls, members: Array.isArray(members) ? members.map(toName) : [] }));
          dc.unusedClassMemberNames = classes.filter(c => c.members.length > 0);
        }

        // Merge with any previously set deadCode (e.g., from unused file pre-mark)
        r.deadCode = { ...(r.deadCode || {}), ...dc };
      }

      // Always record repo-level details, even if the file wasn't part of the per-file result set
      if (Array.isArray(item.unresolved) && item.unresolved.length > 0) {
        const unresolvedList = item.unresolved.map(u => (u && typeof u === 'object' && 'name' in u) ? u.name : String(u));
        details.unresolvedImports.push({ file: fileKey, specifiers: unresolvedList });
      }
      if (Array.isArray(item.unlisted) && item.unlisted.length > 0) {
        details.unlistedDependencies.push({ file: fileKey, modules: item.unlisted.slice() });
      }
      if (Array.isArray(item.exports) && item.exports.length > 0) {
        const names = item.exports.map(toName);
        details.unusedExports.push({ file: fileKey, names });
      }
      if (Array.isArray(item.types) && item.types.length > 0) {
        if (unusedTypeNames.length > 0) details.unusedTypes.push({ file: fileKey, names: unusedTypeNames.slice() });
        if (unusedExportedTypeNames.length > 0) details.unusedExportedTypes.push({ file: fileKey, names: unusedExportedTypeNames.slice() });
      }
      if (item.enumMembers && typeof item.enumMembers === 'object') {
        const enums = Object.entries(item.enumMembers).map(([enm, members]) => ({ enum: enm, members: Array.isArray(members) ? members.map(toName) : [] }));
        const filtered = enums.filter(e => e.members.length > 0);
        if (filtered.length > 0) details.unusedEnumMembers.push({ file: fileKey, enums: filtered });
      }
      if (item.classMembers && typeof item.classMembers === 'object') {
        const classes = Object.entries(item.classMembers).map(([cls, members]) => ({ class: cls, members: Array.isArray(members) ? members.map(toName) : [] }));
        const filtered = classes.filter(c => c.members.length > 0);
        if (filtered.length > 0) details.unusedClassMembers.push({ file: fileKey, classes: filtered });
      }
    }

    for (const r of results) {
      if (!r.deadCode) {
        r.deadCode = {
          unusedExports: 0,
          unusedTypes: 0,
          unusedExportedTypes: 0,
          unusedEnumMembers: 0,
          unusedClassMembers: 0,
          unlistedDependencies: 0,
          unresolvedImports: 0,
          // also provide arrays for consistency even when empty
          unresolvedImportSpecifiers: [],
          unlistedDependencyModules: [],
          status: 'PASS',
          recommendations: []
        };
      }
    }

    return { summary, details };
  });
}

module.exports = { applyKnipToResults };
