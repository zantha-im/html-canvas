const { toRepoRelative } = require('../utils/paths');

function applyJscpdToResults(results, jscpdData) {
  const segmentsByFile = new Map();
  const dups = Array.isArray(jscpdData?.duplicates) ? jscpdData.duplicates : [];

  function pushSegment(fileRel, seg) {
    if (!segmentsByFile.has(fileRel)) segmentsByFile.set(fileRel, []);
    segmentsByFile.get(fileRel).push(seg);
  }

  for (const dup of dups) {
    const first = dup.firstFile || {};
    const second = dup.secondFile || {};
    const firstRel = toRepoRelative(first.name || '');
    const secondRel = toRepoRelative(second.name || '');
    const lines = typeof dup.lines === 'number' ? dup.lines : (first.end - first.start + 1 || 0);
    const tokens = typeof dup.tokens === 'number' ? dup.tokens : 0;

    pushSegment(firstRel, {
      otherFile: secondRel,
      lines,
      tokens,
      startLine: first.start,
      endLine: first.end,
      otherStartLine: second.start,
      otherEndLine: second.end
    });

    pushSegment(secondRel, {
      otherFile: firstRel,
      lines,
      tokens,
      startLine: second.start,
      endLine: second.end,
      otherStartLine: first.start,
      otherEndLine: first.end
    });
  }

  for (const r of results) {
    const key = toRepoRelative(r.filePath);
    const segs = segmentsByFile.get(key) || [];
    r.duplicates = {
      count: segs.length,
      segments: segs,
      status: segs.length > 0 ? 'FAIL' : 'PASS',
      recommendations: segs.length > 0 ? ['Extract shared logic into a utility/component to remove duplication.'] : []
    };
  }

  const totalStats = (jscpdData && (jscpdData.statistics?.total || jscpdData.statistic?.total)) || {};
  // Build repo-level top groups (prioritize by lines desc)
  const normalize = (p) => String(p || '').replace(/\\/g, '/');
  const split = (p) => normalize(p).split('/').filter(Boolean);
  const join = (arr) => arr.join('/');
  const commonDir = (a, b) => {
    const A = split(a); const B = split(b); const out = [];
    for (let i = 0; i < Math.min(A.length, B.length); i++) {
      if (A[i] === B[i]) out.push(A[i]); else break;
    }
    return join(out);
  };
  const suggestPath = (a, b) => {
    const cd = commonDir(a, b);
    const base = cd && cd.length ? cd : 'lib';
    const targetDir = base.startsWith('lib') ? base : `lib/${base}`;
    return `${targetDir}/utils/shared-extracted.ts`;
  };

  const groups = dups.map(dup => {
    const a = toRepoRelative((dup.firstFile && dup.firstFile.name) || '');
    const b = toRepoRelative((dup.secondFile && dup.secondFile.name) || '');
    const lines = typeof dup.lines === 'number' ? dup.lines : 0;
    const tokens = typeof dup.tokens === 'number' ? dup.tokens : 0;
    const startA = dup.firstFile?.start || 0;
    const endA = dup.firstFile?.end || startA;
    const startB = dup.secondFile?.start || 0;
    const endB = dup.secondFile?.end || startB;
    return {
      files: [a, b],
      lines,
      tokens,
      a: { startLine: startA, endLine: endA },
      b: { startLine: startB, endLine: endB },
      suggestedModulePath: suggestPath(a, b)
    };
  }).sort((x, y) => (y.lines || 0) - (x.lines || 0));

  const summaryBase = {
    groups: totalStats.clones || 0,
    duplicatedLines: totalStats.duplicatedLines || 0,
    details: {
      topGroups: groups.slice(0, 5),
      playbook: {
        similarBlocks: [
          'Refactor similar (not identical) duplicate blocks by extracting the shared “load-and-map” or scaffold pattern into a reusable function or hook.',
          'Parameterize the differing parts (URL builder(s), number of requests, response mapping, error messages). Keep shared concerns internal: loading/error toggles, try/catch, Promise.all orchestration.',
          'Suggested targets: lib/utils/fetching.ts (or nearest common directory).',
          'Function signature example: loadWithParams<T>({ buildUrls: () => string[], map: (payloads:any[]) => T, onError?: (e:unknown)=>string }): Promise<T>.',
          'Hook signature example: useFetchMapped<T>({ deps:any[], buildRequests: () => Promise<Response>[], map: (payloads:any[]) => T }).',
          'Acceptance criteria: identical behavior for success/error/empty cases; type-safety preserved (generics); both sites replaced to import the shared utility; smoke tests for 1 vs 2 request scenarios.',
          'Skip extraction when the shared block is very small (<10 lines) or context-heavy such that abstraction reduces clarity.'
        ].join('\n')
      }
    }
  };
  const summary = (typeof totalStats.percentage === 'number' && Number.isFinite(totalStats.percentage))
    ? { ...summaryBase, percentage: totalStats.percentage }
    : summaryBase;
  return { summary };
}

module.exports = { applyJscpdToResults };
