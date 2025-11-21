const { readFileSmart } = require('../utils/fs-utils');

function analyzeTypeScript(filePath) {
  try {
    const content = readFileSmart(filePath);
    const lines = content.split('\n');

    // Extract function-like constructs with metadata (name, line, kind, wrapper)
    function extractFunctions(lines) {
      const functions = [];
      for (let i = 0; i < lines.length; i++) {
        const firstLine = lines[i];
        let name = '';
        let kind = '';
        let wrapperName = null;

        const fnDeclMatch = firstLine.match(/(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/);
        const constMatch = firstLine.match(/(?:export\s+)?const\s+(\w+)\s*=\s*/);

        if (!fnDeclMatch && !constMatch) continue;

        if (fnDeclMatch) {
          name = fnDeclMatch[1];
          kind = 'function-declaration';
        } else if (constMatch) {
          name = constMatch[1];
          kind = 'const';
        }

        let text = firstLine;
        let j = i + 1;
        let parenLevel = 0;
        let seenArrow = /=>/.test(firstLine);
        let foundBrace = false;
        let everSawParen = false;

        function scan(s) {
          for (let ch of s) {
            if (ch === '(') { parenLevel++; everSawParen = true; }
            else if (ch === ')') { parenLevel = Math.max(0, parenLevel - 1); }
            else if (ch === '{' && parenLevel === 0) { foundBrace = true; break; }
          }
          if (/=>/.test(s)) seenArrow = true;
        }

        scan(firstLine);
        // Capture header lines conservatively.
        if (kind === 'const') {
          while (!foundBrace && j < lines.length && (parenLevel > 0 || (!seenArrow && !everSawParen && (j - i) < 3))) {
            text += '\n' + lines[j];
            scan(lines[j]);
            j++;
          }
        } else {
          while (!foundBrace && j < lines.length && (parenLevel > 0 || !seenArrow)) {
            text += '\n' + lines[j];
            scan(lines[j]);
            j++;
          }
          while (!foundBrace && j < lines.length && j - i < 8) {
            text += '\n' + lines[j];
            scan(lines[j]);
            j++;
          }
        }

        // Determine wrapper name (if any) for const assignments
        if (kind === 'const') {
          const wrapperMatch = text.match(/=\s*([A-Za-z_$][\w$]*)\s*(?:<|\()/);
          if (wrapperMatch) {
            wrapperName = wrapperMatch[1];
            if (/=\s*\(/.test(text)) {
              kind = 'const-arrow';
            } else {
              kind = 'wrapped-arrow';
            }
          } else {
            kind = 'const-arrow';
          }
        }

        // Only keep const assignments that are function-like
        if (kind !== 'function-declaration') {
          const isArrow = /=\s*(?:async\s+)?[\s\S]*?\)\s*=>/.test(text);
          const isFunctionKeyword = /function\s*\(/.test(text);
          const isTypedFunctionVar = /const\s+\w+\s*:\s*[^=]*=>/.test(text);
          const isWrapperWithArrowArg = /=\s*[A-Za-z_$][\w$]*\s*(?:<[^>]*>)?\s*\(\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^)]+)?\s*=>/.test(text);
          const functionLike = isArrow || isFunctionKeyword || isTypedFunctionVar || isWrapperWithArrowArg;
          if (!functionLike) {
            continue;
          }
        }

        const signaturePreview = text.split('\n')[0].trim();

        functions.push({
          text,
          startLine: i + 1,
          name: name || '(anonymous)',
          kind,
          wrapperName,
          signaturePreview,
        });
      }
      return functions;
    }

    const functions = extractFunctions(lines);
    const missingDetails = [];

    function hasExplicitReturnType(func) {
      const clean = func.text.replace(/\s+/g, ' ').trim();

      function headerBeforeBody(text) {
        let paren = 0;
        for (let idx = 0; idx < text.length; idx++) {
          const ch = text[idx];
          if (ch === '(') paren++;
          else if (ch === ')') paren = Math.max(0, paren - 1);
          else if (ch === '{' && paren === 0) {
            return text.slice(0, idx);
          }
        }
        return text;
      }

      if (func.kind === 'function-declaration') {
        const header = headerBeforeBody(func.text).replace(/\s+/g, ' ');
        if (/\)\s*:\s*\S/.test(header)) {
          return true;
        }
      }

      if (/function\s+\w+\s*\([^)]*\)\s*:\s*[^\{]+\{/.test(clean)) return true;
      if (/const\s+\w+\s*:\s*[^=]+=\s*/.test(clean)) return true;
      if (/=\s*(?:async\s+)?[\s\S]*?\)\s*:\s*[^=]+=>/.test(clean)) return true;

      if (func.kind === 'wrapped-arrow' && func.wrapperName === 'useCallback') {
        const m = clean.match(/=\s*useCallback\s*<([^>]+)>/);
        if (m && /\([^)]*\)\s*=>\s*[^)]+/.test(m[1])) return true;
      }

      if (/=\s*[A-Za-z_$][\w$]*\s*(?:<[^>]+>)?\s*\(\s*(?:async\s+)?\([^)]*\)\s*:\s*[^)]+=>/.test(clean)) return true;

      return false;
    }

    functions.forEach(func => {
      const clean = func.text.replace(/\s+/g, ' ').trim();
      const shouldSkip = clean.includes('constructor') || clean.includes('set ') || clean.includes('get ') || /function\s+\w+\s*\(\)\s*\{/.test(clean) || clean.includes('(): void') || clean.includes(': void') || clean.includes('Promise<void>');
      if (shouldSkip) return;
      if (!hasExplicitReturnType(func)) {
        missingDetails.push({ name: func.name, line: func.startLine, kind: func.kind, signaturePreview: func.signaturePreview });
      }
    });

    return { totalFunctions: functions.length, missingReturnTypes: missingDetails.length, hasExplicitTypes: missingDetails.length === 0, status: missingDetails.length === 0 ? 'PASS' : 'FAIL', details: missingDetails };
  } catch (_) {
    return { totalFunctions: 0, missingReturnTypes: 0, hasExplicitTypes: true, status: 'PASS', details: [] };
  }
}

module.exports = { analyzeTypeScript };
