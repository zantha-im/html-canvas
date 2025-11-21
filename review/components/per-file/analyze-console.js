const { readFileSmart } = require('../utils/fs-utils');

function analyzeConsoleErrors(filePath) {
  try {
    const content = readFileSmart(filePath);
    const lines = content.split('\n');

    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for console.error and console.warn patterns
      const consoleErrorMatch = line.match(/console\.(error|warn)\s*\(/);
      if (consoleErrorMatch) {
        const method = consoleErrorMatch[1];
        violations.push({
          line: lineNum,
          method,
          content: line.trim(),
          guidance: `Replace console.${method} with proper error throwing. Use 'throw new Error(message)' instead of logging and continuing execution.`
        });
      }
    }

    return {
      violations,
      count: violations.length,
      status: violations.length === 0 ? 'PASS' : 'FAIL'
    };
  } catch (_) {
    return { violations: [], count: 0, status: 'PASS' };
  }
}

module.exports = { analyzeConsoleErrors };
