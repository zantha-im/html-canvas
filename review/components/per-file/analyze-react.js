const { readFileSmart } = require('../utils/fs-utils');

function analyzeReactPatterns(filePath) {
  try {
    const content = readFileSmart(filePath);
    const lines = content.split(/\r?\n/);

    const hasReactImport = content.includes('import React') || content.includes('import * as React');
    const hasUseCallback = content.includes('useCallback');
    const hasUseMemo = content.includes('useMemo');
    const hasUseEffect = content.includes('useEffect');
    const hasHooks = /use[A-Z]/.test(content);

    const issues = [];

    // Check for React import when using React types
    if (content.includes('React.') && !hasReactImport) {
      const lineIdx = lines.findIndex(l => l.includes('React.'));
      issues.push({ message: 'Missing React import for React.* usage', line: lineIdx >= 0 ? lineIdx + 1 : 0 });
    }

    // Check for hook usage patterns
    if (hasHooks && !hasUseCallback && content.includes('const handle')) {
      lines.forEach((l, i) => {
        if (l.includes('const handle')) {
          issues.push({ message: 'Event handlers should use useCallback', line: i + 1 });
        }
      });
    }

    if (hasHooks && !hasUseMemo && content.includes('const filtered')) {
      lines.forEach((l, i) => {
        if (l.includes('const filtered')) {
          issues.push({ message: 'Filtered/computed values should use useMemo', line: i + 1 });
        }
      });
    }

    return {
      hasReactImport,
      hasUseCallback,
      hasUseMemo,
      hasUseEffect,
      hasHooks,
      issues
    };
  } catch (_) {
    return { hasReactImport: false, hasUseCallback: false, hasUseMemo: false, hasUseEffect: false, hasHooks: false, issues: [] };
  }
}

module.exports = { analyzeReactPatterns };
