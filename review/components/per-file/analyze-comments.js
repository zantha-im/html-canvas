const { readFileSmart } = require('../utils/fs-utils');

function analyzeComments(filePath) {
  try {
    const content = readFileSmart(filePath);
    const lines = content.split('\n');

    const violations = [];
    let inJsDoc = false;
    let inMultiLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // JSDoc comments
      if (line.startsWith('/**')) {
        inJsDoc = true;
        violations.push({ type: 'jsdoc', line: lineNum, content: line });
        continue;
      }

      // Multi-line comments
      if (line.startsWith('/*') && !line.startsWith('/**')) {
        inMultiLine = true;
        violations.push({ type: 'multiline', line: lineNum, content: line });
        continue;
      }

      // End of comments
      if (line.endsWith('*/')) {
        inJsDoc = false;
        inMultiLine = false;
        continue;
      }

      // Inside comments
      if (inJsDoc || inMultiLine) {
        violations.push({ type: inJsDoc ? 'jsdoc' : 'multiline', line: lineNum, content: line });
        continue;
      }

      // Single-line comments
      if (line.startsWith('//')) {
        violations.push({ type: 'inline', line: lineNum, content: line });
      }
    }

    return violations;
  } catch (_) {
    return [];
  }
}

module.exports = { analyzeComments };
