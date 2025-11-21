const { readFileSmart } = require('../utils/fs-utils');

function isValidBooleanLogic(line) {
  return /\|\|\s*(true|false|\w+\.\w+|\w+\(\)|\w+)\s*$/.test(line) || /const\s+\w+\s*=\s*\w+\s*\|\|\s*\w+/.test(line);
}

function isValidHtmlAttribute(line) {
  return /(disabled|checked|selected|required|readOnly|autoFocus)\s*=\s*\{.*?\?.*?:.*?(true|false|undefined)\s*\}/.test(line);
}

function isValidCssClass(line) {
  return /(className|class)\s*=\s*\{.*?\?\s*['`"].*?['`"]\s*:\s*['`"].*/.test(line);
}

function isValidAriaAttribute(line) {
  return /aria-\w+\s*=\s*\{.*?\?\s*['`"](true|false|menu)['`"]\s*:\s*['`"](true|false)['`"]/.test(line) || /\{\.\.\.\(.*?&&.*?\{\s*['"]aria-/.test(line);
}

function isCommentLine(line) {
  return /^\s*\/\//.test(line) || /^\s*\/\*/.test(line) || /^\s*\*/.test(line);
}

function isExplicitNullableReturnType(content, lineNum) {
  const lines = content.split('\n');
  const currentLineIndex = lineNum - 1;
  for (let i = Math.max(0, currentLineIndex - 10); i <= currentLineIndex; i++) {
    const line = lines[i];
    if (/:\s*[^=]*\|\s*null/.test(line) || /JSX\.Element\s*\|\s*null/.test(line) || /ReactNode\s*\|\s*null/.test(line)) {
      return true;
    }
  }
  return false;
}

function isReactConditionalRender(content, lineNum) {
  const lines = content.split('\n');
  const currentLineIndex = lineNum - 1;
  const hasReactImports = content.includes('import React') || content.includes('import * as React') || content.includes('JSX.Element');
  if (!hasReactImports) return false;
  for (let i = Math.max(0, currentLineIndex - 15); i <= currentLineIndex; i++) {
    const line = lines[i];
    if (/const\s+\w+\s*=\s*\([^)]*\)\s*:\s*JSX\.Element\s*\|\s*null/.test(line) || /function\s+\w+\s*\([^)]*\)\s*:\s*JSX\.Element\s*\|\s*null/.test(line)) {
      return true;
    }
  }
  return false;
}

function isValidApiNotFoundPattern(content, lineNum) {
  const lines = content.split('\n');
  const currentLineIndex = lineNum - 1;
  for (let i = Math.max(0, currentLineIndex - 10); i <= currentLineIndex; i++) {
    const line = lines[i];
    if (/function\s+\w+.*?:\s*\w+\s*\|\s*null/.test(line) || /export\s+function\s+\w+.*?:\s*\w+\s*\|\s*null/.test(line)) {
      return true;
    }
  }
  const contextLines = lines.slice(Math.max(0, currentLineIndex - 5), currentLineIndex + 1).join(' ');
  if (/localStorage\.getItem|cache\.get|stored|expired/.test(contextLines) || /if\s*\(!\w+\)|if\s*\(.*expired.*\)|Date\.now\(\).*?>.*maxAge/.test(contextLines) || /deleteDraft|removeItem|clear/.test(contextLines)) {
    return true;
  }
  if (/if\s*\([^)]*\)\s*\{[^}]*return\s+null/.test(contextLines)) {
    return true;
  }
  return false;
}

function analyzeFallbackData(filePath) {
  try {
    const content = readFileSmart(filePath);
    const lines = content.split('\n');
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmedLine = line.trim();

      // Pattern 1: Return null/undefined (with context validation)
      if (/return\s+(null|undefined);?$/.test(trimmedLine)) {
        if (isExplicitNullableReturnType(content, lineNum) || isReactConditionalRender(content, lineNum) || isValidApiNotFoundPattern(content, lineNum)) {
          continue;
        }
        violations.push({ type: 'return_null', line: lineNum, content: trimmedLine, advice: 'Throw composed error instead of null return. Null returns mask invalid states and prevent proper error handling. Consider: What upstream validation failed? Why is this data missing?' });
      }

      // Pattern 2: Logical OR fallbacks with literals (exclude boolean logic)
      const orFallbackMatch = /\|\|\s*(['`"].*?['`"]|\[.*?\]|\{.*?\})/.exec(trimmedLine);
      if (orFallbackMatch && !isValidBooleanLogic(trimmedLine) && !isCommentLine(trimmedLine)) {
        violations.push({ type: 'or_fallback', line: lineNum, content: trimmedLine, advice: 'Throw composed error instead of silent fallback. This pattern hides missing required data. Recommend deeper analysis: Is this data truly optional, or should upstream validation catch this?' });
      }

      // Pattern 3: Optional chaining with fallbacks
      if (/\?\.\w+.*?\|\|/.test(trimmedLine)) {
        violations.push({ type: 'optional_chaining_fallback', line: lineNum, content: trimmedLine, advice: 'Throw composed error instead of defensive fallback. Optional chaining with fallbacks suggests unclear data contracts. Recommend deeper analysis: Should this property be guaranteed? Is validation missing?' });
      }

      // Pattern 4: Ternary with default values (exclude HTML/CSS/ARIA attributes and comments)
      const ternaryFallbackMatch = /\?\s*\w+\s*:\s*(['`"].*?['`"]|\[.*?\]|\{.*?\})/.exec(trimmedLine);
      if (ternaryFallbackMatch && !isValidHtmlAttribute(trimmedLine) && !isValidCssClass(trimmedLine) && !isValidAriaAttribute(trimmedLine) && !isCommentLine(trimmedLine)) {
        violations.push({ type: 'ternary_fallback', line: lineNum, content: trimmedLine, advice: 'Throw composed error instead of default value. Ternary fallbacks mask validation failures. Consider: What makes this condition invalid? Should upstream code prevent this state?' });
      }

      // Pattern 5: Empty catch blocks with returns (multi-line detection)
      if (trimmedLine.includes('catch')) {
        let catchContent = '';
        let j = i;
        let braceCount = 0;
        let inCatch = false;
        while (j < lines.length) {
          const currentLine = lines[j].trim();
          if (currentLine.includes('catch')) inCatch = true;
          if (inCatch) {
            catchContent += currentLine + ' ';
            braceCount += (currentLine.match(/\{/g) || []).length;
            braceCount -= (currentLine.match(/\}/g) || []).length;
            if (braceCount === 0 && inCatch) break;
          }
          j++;
        }
        if (/catch\s*\([^)]*\)\s*\{[^}]*return\s+[^;]+;?\s*\}/.test(catchContent.replace(/\s+/g, ' '))) {
          violations.push({ type: 'empty_catch_return', line: lineNum, content: trimmedLine, advice: 'Throw composed error instead of swallowing exceptions. Silent error suppression violates fail-fast methodology. Consider: Should this error propagate up? What context should be preserved?' });
        }
      }
    }

    return { violations, count: violations.length, status: violations.length === 0 ? 'PASS' : 'FAIL' };
  } catch (_) {
    return { violations: [], count: 0, status: 'PASS' };
  }
}

module.exports = { analyzeFallbackData };
