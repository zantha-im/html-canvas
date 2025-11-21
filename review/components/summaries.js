const path = require('path');
const { FILE_SIZE_LIMITS, getFileType } = require('./utils/filters');

function generateCompactSummary(results, opts = {}) {
  const totalFiles = results.length;
  const failedFiles = results.filter(r => 
    r.eslint.errors.length > 0 || r.eslint.warnings.length > 0 || 
    r.comments.status === 'FAIL' || 
    r.size.status === 'FAIL' || 
    r.typescript.status === 'FAIL' ||
    (r.typescriptCompiler && r.typescriptCompiler.status === 'FAIL') ||
    r.consoleErrors.status === 'FAIL' ||
    r.fallbackData.status === 'FAIL' ||
    (r.deadCode && r.deadCode.status === 'FAIL') ||
    (r.duplicates && r.duplicates.status === 'FAIL')
  );
  const passingFiles = totalFiles - failedFiles.length;
  const repo = opts && opts.repo ? opts.repo : null;
  const hasRepoViolations = !!(repo && (
    (repo.tsc && (repo.tsc.totalErrors || 0) > 0) ||
    (repo.knip && (
      (repo.knip.unusedFiles || 0) > 0 ||
      (repo.knip.unusedExports || 0) > 0 ||
      (repo.knip.unusedTypes || 0) > 0 ||
      (repo.knip.unusedExportedTypes || 0) > 0 ||
      (repo.knip.unusedEnumMembers || 0) > 0 ||
      (repo.knip.unusedClassMembers || 0) > 0 ||
      (repo.knip.unlistedDependencies || 0) > 0 ||
      (repo.knip.unresolvedImports || 0) > 0
    )) ||
    (repo.jscpd && (
      (repo.jscpd.groups || 0) > 0 ||
      (repo.jscpd.duplicatedLines || 0) > 0 ||
      (repo.jscpd.percentage || 0) > 0
    ))
  ));
  
  let summary = `CODE REVIEW: ${totalFiles} files | ${passingFiles} passed | ${failedFiles.length} failed\n`;
  summary += `\n`;
  
  if (failedFiles.length > 0) {
    summary += `VIOLATIONS (blocking):\n`;
    
    failedFiles.forEach(file => {
      const fileName = path.basename(file.filePath);

      if (file.size.status === 'FAIL') {
        const fileType = getFileType(file.filePath);
        const limit = FILE_SIZE_LIMITS[fileType];
        summary += `${fileName}: File too large (${file.size.lines}/${limit}) - split into modules\n`;
      }
      
      if (file.comments.status === 'FAIL') {
        summary += `${fileName}: Remove ${file.comments.count} comments\n`;
      }
      
      if (file.typescript.status === 'FAIL') {
        summary += `${fileName}: Add ${file.typescript.missingReturnTypes} return types\n`;
        const details = file.typescript.details || [];
        details.forEach(d => {
          const fnName = d.name || '(anonymous)';
          summary += `${fileName}:${d.line} - Add return type to "${fnName}"\n`;
        });
      }
      if (file.typescriptCompiler && file.typescriptCompiler.errorCount > 0) {
        const count = file.typescriptCompiler.errorCount;
        summary += `${fileName}: ${count} TypeScript compiler error(s)\n`;
        const list = Array.isArray(file.typescriptCompiler.errors) ? file.typescriptCompiler.errors.slice(0, 5) : [];
        list.forEach(e => {
          const code = e.code || 'TS';
          const line = typeof e.line === 'number' ? e.line : 0;
          const col = typeof e.column === 'number' ? e.column : 0;
          const msg = (e.message || '').trim();
          summary += `${fileName}:${line}:${col} - ${code}: ${msg}\n`;
        });
        if ((file.typescriptCompiler.errors || []).length > 5) {
          summary += `${fileName}: ...and more\n`;
        }
      }
      
      if (file.consoleErrors.status === 'FAIL') {
        file.consoleErrors.violations.forEach(violation => {
          summary += `${fileName}:${violation.line} - FAIL-FAST VIOLATION: Replace console.${violation.method} with throw new Error()\n`;
        });
      }
      
      if (file.fallbackData.status === 'FAIL') {
        file.fallbackData.violations.forEach(violation => {
          summary += `${fileName}:${violation.line} - FALLBACK DATA VIOLATION: ${violation.advice}\n`;
        });
      }
      
      if (file.deadCode && file.deadCode.status === 'FAIL') {
        summary += `${fileName}: Dead code/unresolved imports detected\n`;
      }
      
      if (file.duplicates && file.duplicates.status === 'FAIL') {
        summary += `${fileName}: Duplicate code segments (${file.duplicates.count})\n`;
      }
      
      const allViolations = [...file.eslint.errors, ...file.eslint.warnings];
      if (allViolations.length > 0) {
        allViolations.forEach(violation => {
          let message = violation.message;
          if (message.includes('Unexpected any')) {
            message = 'Replace any type';
          } else if (message.includes('Missing semicolon')) {
            message = 'Add semicolon';
          } else if (message.includes('Unused variable')) {
            message = 'Remove unused variable';
          }
          summary += `${fileName}:${violation.line} - ${message}\n`;
        });
      }
    });
    if (hasRepoViolations) {
      summary += `\nREPO-WIDE VIOLATIONS (blocking):\n`;
      if (repo && repo.tsc && (repo.tsc.totalErrors || 0) > 0) {
        summary += `TypeScript compiler: ${repo.tsc.totalErrors} error(s) repo-wide\n`;
      }
      if (repo && repo.knip) {
        const k = repo.knip;
        const knipParts = [];
        if ((k.unusedFiles || 0) > 0) knipParts.push(`unused files ${k.unusedFiles}`);
        if ((k.unusedExports || 0) > 0) knipParts.push(`unused exports ${k.unusedExports}`);
        if ((k.unusedTypes || 0) > 0) knipParts.push(`unused types ${k.unusedTypes}`);
        if ((k.unusedExportedTypes || 0) > 0) knipParts.push(`unused exported types ${k.unusedExportedTypes}`);
        if ((k.unusedEnumMembers || 0) > 0) knipParts.push(`unused enum members ${k.unusedEnumMembers}`);
        if ((k.unusedClassMembers || 0) > 0) knipParts.push(`unused class members ${k.unusedClassMembers}`);
        if ((k.unlistedDependencies || 0) > 0) knipParts.push(`unlisted dependencies ${k.unlistedDependencies}`);
        if ((k.unresolvedImports || 0) > 0) knipParts.push(`unresolved imports ${k.unresolvedImports}`);
        if (knipParts.length) summary += `knip: ${knipParts.join(', ')}\n`;
      }
      if (repo && repo.jscpd) {
        const j = repo.jscpd;
        if ((j.groups || 0) > 0 || (j.duplicatedLines || 0) > 0 || (j.percentage || 0) > 0) {
          const parts = [];
          if ((j.groups || 0) > 0) parts.push(`${j.groups} groups`);
          if ((j.duplicatedLines || 0) > 0) parts.push(`${j.duplicatedLines} duplicated lines`);
          if ((j.percentage || 0) > 0) parts.push(`${j.percentage}%`);
          summary += `jscpd: ${parts.join(', ')}\n`;
        }
      }
    }
    summary += `\nACTION REQUIRED: Fix all violations above.\n`;
  } else {
    if (hasRepoViolations) {
      summary += `REPO-WIDE VIOLATIONS (blocking):\n`;
      if (repo && repo.tsc && (repo.tsc.totalErrors || 0) > 0) {
        summary += `TypeScript compiler: ${repo.tsc.totalErrors} error(s) repo-wide\n`;
      }
      if (repo && repo.knip) {
        const k = repo.knip;
        const knipParts = [];
        if ((k.unusedFiles || 0) > 0) knipParts.push(`unused files ${k.unusedFiles}`);
        if ((k.unusedExports || 0) > 0) knipParts.push(`unused exports ${k.unusedExports}`);
        if ((k.unusedTypes || 0) > 0) knipParts.push(`unused types ${k.unusedTypes}`);
        if ((k.unusedExportedTypes || 0) > 0) knipParts.push(`unused exported types ${k.unusedExportedTypes}`);
        if ((k.unusedEnumMembers || 0) > 0) knipParts.push(`unused enum members ${k.unusedEnumMembers}`);
        if ((k.unusedClassMembers || 0) > 0) knipParts.push(`unused class members ${k.unusedClassMembers}`);
        if ((k.unlistedDependencies || 0) > 0) knipParts.push(`unlisted dependencies ${k.unlistedDependencies}`);
        if ((k.unresolvedImports || 0) > 0) knipParts.push(`unresolved imports ${k.unresolvedImports}`);
        if (knipParts.length) summary += `knip: ${knipParts.join(', ')}\n`;
      }
      if (repo && repo.jscpd) {
        const j = repo.jscpd;
        if ((j.groups || 0) > 0 || (j.duplicatedLines || 0) > 0 || (j.percentage || 0) > 0) {
          const parts = [];
          if ((j.groups || 0) > 0) parts.push(`${j.groups} groups`);
          if ((j.duplicatedLines || 0) > 0) parts.push(`${j.duplicatedLines} duplicated lines`);
          if ((j.percentage || 0) > 0) parts.push(`${j.percentage}%`);
          summary += `jscpd: ${parts.join(', ')}\n`;
        }
      }
      summary += `\nACTION REQUIRED: Fix all violations above.\n`;
    } else {
      summary += `✅ All files passed code review standards.\n`;
    }
  }
  
  // Append timing information to the summary if provided (format as minutes/seconds)
  if (opts && opts.timing) {
    const t = opts.timing;
    const f = (ms) => formatMs(ms);
    if (opts.debugMode) {
      summary += `\n⏱ Timing: autofix ${f(t.autofixMs)} | per-file ${f(t.perFileMs)} | repo ${f(t.repoMs)} | total ${f(t.totalMs)}\n`;
      if (t.repoBreakdown) {
        const rb = t.repoBreakdown;
        const parts = [];
        if (typeof rb.knipMs === 'number') parts.push(`knip ${f(rb.knipMs)}`);
        if (typeof rb.jscpdMs === 'number') parts.push(`jscpd ${f(rb.jscpdMs)}`);
        if (typeof rb.tscMs === 'number') parts.push(`tsc ${f(rb.tscMs)}`);
        if (parts.length) summary += `   repo breakdown: ${parts.join(' | ')}\n`;
      }
    } else {
      summary += `\n⏱ Total time: ${f(t.totalMs)}\n`;
    }
  }
  
  return summary;
}

function generateBatchSummary(results, opts = {}) {
  const totalFiles = results.length;
  const passedFiles = results.filter(r => r.comments.status === 'PASS' && r.size.status === 'PASS' && r.typescript.status === 'PASS' && (!r.typescriptCompiler || r.typescriptCompiler.status === 'PASS') && r.eslint.errors.length === 0 && r.consoleErrors.status === 'PASS' && r.fallbackData.status === 'PASS' && (!r.deadCode || r.deadCode.status === 'PASS') && (!r.duplicates || r.duplicates.status === 'PASS'));
  const failedFiles = results.filter(r => r.comments.status === 'FAIL' || r.size.status === 'FAIL' || r.typescript.status === 'FAIL' || (r.typescriptCompiler && r.typescriptCompiler.status === 'FAIL') || r.eslint.errors.length > 0 || r.consoleErrors.status === 'FAIL' || r.fallbackData.status === 'FAIL' || (r.deadCode && r.deadCode.status === 'FAIL') || (r.duplicates && r.duplicates.status === 'FAIL'));
  const repo = opts && opts.repo ? opts.repo : null;
  const hasRepoViolations = !!(repo && (
    (repo.tsc && (repo.tsc.totalErrors || 0) > 0) ||
    (repo.knip && (
      (repo.knip.unusedFiles || 0) > 0 ||
      (repo.knip.unusedExports || 0) > 0 ||
      (repo.knip.unusedTypes || 0) > 0 ||
      (repo.knip.unusedExportedTypes || 0) > 0 ||
      (repo.knip.unusedEnumMembers || 0) > 0 ||
      (repo.knip.unusedClassMembers || 0) > 0 ||
      (repo.knip.unlistedDependencies || 0) > 0 ||
      (repo.knip.unresolvedImports || 0) > 0
    )) ||
    (repo.jscpd && (
      (repo.jscpd.groups || 0) > 0 ||
      (repo.jscpd.duplicatedLines || 0) > 0 ||
      (repo.jscpd.percentage || 0) > 0
    ))
  ));
  
  let summary = `=== BATCH TEST SUMMARY ===\n`;
  summary += `Total Files: ${totalFiles} | Passed: ${passedFiles.length} | Failed: ${failedFiles.length}\n\n`;
  if (hasRepoViolations) {
    summary += `REPO-WIDE VIOLATIONS (blocking):\n`;
    if (repo && repo.tsc && (repo.tsc.totalErrors || 0) > 0) {
      summary += `TypeScript compiler: ${repo.tsc.totalErrors} error(s) repo-wide\n`;
    }
    if (repo && repo.knip) {
      const k = repo.knip;
      const knipParts = [];
      if ((k.unusedFiles || 0) > 0) knipParts.push(`unused files ${k.unusedFiles}`);
      if ((k.unusedExports || 0) > 0) knipParts.push(`unused exports ${k.unusedExports}`);
      if ((k.unusedTypes || 0) > 0) knipParts.push(`unused types ${k.unusedTypes}`);
      if ((k.unusedEnumMembers || 0) > 0) knipParts.push(`unused enum members ${k.unusedEnumMembers}`);
      if ((k.unusedClassMembers || 0) > 0) knipParts.push(`unused class members ${k.unusedClassMembers}`);
      if ((k.unlistedDependencies || 0) > 0) knipParts.push(`unlisted dependencies ${k.unlistedDependencies}`);
      if ((k.unresolvedImports || 0) > 0) knipParts.push(`unresolved imports ${k.unresolvedImports}`);
      if (knipParts.length) summary += `knip: ${knipParts.join(', ')}\n`;
    }
    if (repo && repo.jscpd) {
      const j = repo.jscpd;
      if ((j.groups || 0) > 0 || (j.duplicatedLines || 0) > 0 || (j.percentage || 0) > 0) {
        const parts = [];
        if ((j.groups || 0) > 0) parts.push(`${j.groups} groups`);
        if ((j.duplicatedLines || 0) > 0) parts.push(`${j.duplicatedLines} duplicated lines`);
        if ((j.percentage || 0) > 0) parts.push(`${j.percentage}%`);
        summary += `jscpd: ${parts.join(', ')}\n`;
      }
    }
    summary += `\n`;
    summary += `🔧 ACTION REQUIRED: Repo-wide violations must be corrected.\n`;
    summary += `   No violations are acceptable - fix all issues above.\n\n`;
  }
  
  if (failedFiles.length > 0) {
    summary += `⚠️  FAILED FILES - ALL VIOLATIONS MUST BE FIXED:\n`;
    failedFiles.forEach(file => {
      const fileName = path.basename(file.filePath);
      const issues = [];
      if (file.comments.status === 'FAIL') issues.push('comments');
      if (file.size.status === 'FAIL') issues.push('size');
      if (file.typescript.status === 'FAIL') issues.push(`typescript (${file.typescript.missingReturnTypes} missing)`);
      if (file.typescriptCompiler && file.typescriptCompiler.status === 'FAIL') issues.push(`tsc (${file.typescriptCompiler.errorCount})`);
      if (file.consoleErrors.status === 'FAIL') issues.push(`console-errors (${file.consoleErrors.count} fail-fast violations)`);
      if (file.fallbackData.status === 'FAIL') issues.push(`fallback-data (${file.fallbackData.count} violations)`);
      if (file.eslint.errors.length > 0) issues.push(`eslint (${file.eslint.errors.length} errors)`);
      if (file.deadCode && file.deadCode.status === 'FAIL') issues.push('dead-code');
      if (file.duplicates && file.duplicates.status === 'FAIL') issues.push(`duplicates (${file.duplicates.count})`);
      summary += `- ${fileName}: ${issues.join(', ')}\n`;
    });
    summary += `\n`;
    summary += `🔧 ACTION REQUIRED: Every failed file must be corrected.\n`;
    summary += `   No violations are acceptable - fix all issues above.\n`;
    summary += `\n`;
  }
  
  if (passedFiles.length > 0) {
    summary += `✅ PASSED FILES:\n`;
    passedFiles.forEach(file => {
      const fileName = path.basename(file.filePath);
      summary += `- ${fileName}: All checks passed\n`;
    });
    summary += `\n`;
  }
  
  // Append timing information to the batch summary if provided (format as minutes/seconds)
  if (opts && opts.timing) {
    const t = opts.timing;
    const f = (ms) => formatMs(ms);
    if (opts.debugMode) {
      summary += `⏱ Timing: autofix ${f(t.autofixMs)} | per-file ${f(t.perFileMs)} | repo ${f(t.repoMs)} | total ${f(t.totalMs)}\n`;
      if (t.repoBreakdown) {
        const rb = t.repoBreakdown;
        const parts = [];
        if (typeof rb.knipMs === 'number') parts.push(`knip ${f(rb.knipMs)}`);
        if (typeof rb.jscpdMs === 'number') parts.push(`jscpd ${f(rb.jscpdMs)}`);
        if (typeof rb.tscMs === 'number') parts.push(`tsc ${f(rb.tscMs)}`);
        if (parts.length) summary += `   repo breakdown: ${parts.join(' | ')}\n`;
      }
    } else {
      summary += `⏱ Total time: ${f(t.totalMs)}\n`;
    }
  }
  
  return summary;
}

function generateMinimalSummary(results, opts = {}) {
  const totalFiles = results.length;
  const failedFiles = results.filter(r => 
    r.eslint.errors.length > 0 || r.eslint.warnings.length > 0 || 
    r.comments.status === 'FAIL' || 
    r.size.status === 'FAIL' || 
    r.typescript.status === 'FAIL' ||
    (r.typescriptCompiler && r.typescriptCompiler.status === 'FAIL') ||
    r.consoleErrors.status === 'FAIL' ||
    r.fallbackData.status === 'FAIL' ||
    (r.deadCode && r.deadCode.status === 'FAIL') ||
    (r.duplicates && r.duplicates.status === 'FAIL')
  );
  const passedFiles = totalFiles - failedFiles.length;
  const repo = opts && opts.repo ? opts.repo : null;
  const hasRepoViolations = !!(repo && (
    (repo.tsc && (repo.tsc.totalErrors || 0) > 0) ||
    (repo.knip && (
      (repo.knip.unusedFiles || 0) > 0 ||
      (repo.knip.unusedExports || 0) > 0 ||
      (repo.knip.unusedTypes || 0) > 0 ||
      (repo.knip.unusedEnumMembers || 0) > 0 ||
      (repo.knip.unusedClassMembers || 0) > 0 ||
      (repo.knip.unlistedDependencies || 0) > 0 ||
      (repo.knip.unresolvedImports || 0) > 0
    )) ||
    (repo.jscpd && (
      (repo.jscpd.groups || 0) > 0 ||
      (repo.jscpd.duplicatedLines || 0) > 0 ||
      (repo.jscpd.percentage || 0) > 0
    ))
  ));

  const status = (failedFiles.length > 0 || hasRepoViolations) ? 'FAIL' : 'PASS';
  const reviewMode = opts.reviewMode || 'Full Project Scan';
  const reportPath = opts.reportPath || '.windsurf/review/output/code-review-results.json';

  const passedText = passedFiles > 0 ? `✅ ${passedFiles} passed` : `${passedFiles} passed`;
  const failedText = failedFiles.length > 0 ? `❌ ${failedFiles.length} failed` : `${failedFiles.length} failed`;
  const normalizedReportPath = path.normalize(reportPath);

  // Compute repo-wide check statuses (knip, jscpd, tsc)
  const k = (repo && repo.knip) ? repo.knip : { unusedFiles: 0, unusedExports: 0, unusedTypes: 0, unusedExportedTypes: 0, unusedEnumMembers: 0, unusedClassMembers: 0, unlistedDependencies: 0, unresolvedImports: 0 };
  const j = (repo && repo.jscpd) ? repo.jscpd : { groups: 0, duplicatedLines: 0, percentage: 0 };
  const tsc = (repo && repo.tsc) ? repo.tsc : { totalErrors: 0 };
  const knipPass = ((k.unusedFiles || 0) === 0) && ((k.unusedExports || 0) === 0) && ((k.unusedTypes || 0) === 0) && ((k.unusedExportedTypes || 0) === 0) && ((k.unusedEnumMembers || 0) === 0) && ((k.unusedClassMembers || 0) === 0) && ((k.unlistedDependencies || 0) === 0) && ((k.unresolvedImports || 0) === 0);
  const jscpdPass = ((j.groups || 0) === 0) && ((j.duplicatedLines || 0) === 0) && ((j.percentage || 0) === 0);
  const tscPass = ((tsc.totalErrors || 0) === 0);
  const repoChecksTotal = 3;
  const repoChecksPassed = [knipPass, jscpdPass, tscPass].filter(Boolean).length;
  const repoChecksFailed = repoChecksTotal - repoChecksPassed;
  const repoPassedText = repoChecksPassed > 0 ? `✅ ${repoChecksPassed} passed` : `${repoChecksPassed} passed`;
  const repoFailedText = repoChecksFailed > 0 ? `❌ ${repoChecksFailed} failed` : `${repoChecksFailed} failed`;

  const perFileStatus = (failedFiles.length === 0) ? 'PASS' : 'FAIL';
  const repoStatus = (repoChecksFailed === 0) ? 'PASS' : 'FAIL';
  const overallStatus = (perFileStatus === 'PASS' && repoStatus === 'PASS') ? 'PASS' : 'FAIL';
  const overallStatusIcon = (overallStatus === 'PASS') ? '✅PASS' : '❌FAIL';

  let summary = '';
  // Section: Per-file (Review Mode)
  summary += `REVIEW: ${reviewMode}` + "\n";
  summary += `Files: ${totalFiles} total, ${passedText}, ${failedText}` + "\n";
  summary += `Status: ${perFileStatus}` + "\n\n";

  // Section: Repo Wide
  summary += `REVIEW: Repo Wide` + "\n";
  summary += `Checks: ${repoChecksTotal} total, ${repoPassedText}, ${repoFailedText}` + "\n";
  summary += `Status: ${repoStatus}` + "\n\n";

  // Footer: Total time only (omit redundant overall header/status lines)
  if (opts && opts.timing) {
    const f = (ms) => formatMs(ms);
    summary += `Total Time: ${f(opts.timing.totalMs)}` + "\n\n";
  } else {
    summary += "\n";
  }

  if (overallStatus === 'FAIL') {
    summary += `AI ACTION REQUIRED: Read and apply → ${normalizedReportPath}` + "\n";
  } else {
    summary += `Report written → ${normalizedReportPath}` + "\n";
  }
  return summary;
}

module.exports = { generateCompactSummary, generateBatchSummary, generateMinimalSummary };

// Format milliseconds as minutes and seconds, e.g., "2m 03s" or "0m 45s"
function formatMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '0m 00s';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  return `${minutes}m ${ss}s`;
}
