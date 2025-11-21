const fs = require('fs');
const path = require('path');
const { mapLimit } = require('../utils/concurrency');

function stripComments(content) {
  let removedCount = 0;
  let result = content;

  // Remove JSDoc blocks (/** ... */)
  result = result.replace(/\/\*\*[\s\S]*?\*\//g, () => {
    removedCount++;
    return '';
  });

  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, () => {
    removedCount++;
    return '';
  });

  // Remove single-line comments (// ...)
  result = result.replace(/^\s*\/\/.*$/gm, () => {
    removedCount++;
    return '';
  });

  // NOTE: Do not strip inline trailing // comments anymore because it can
  // incorrectly truncate valid string/JSX attribute contents such as
  // URLs (e.g., xmlns="http://www.w3.org/2000/svg").

  // Clean up multiple consecutive empty lines (more than 2)
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

  return { content: result, removedCount };
}

function stripDebugConsoles(content) {
  let removedCount = 0;
  let result = content;

  // console.log
  result = result.replace(/^\s*console\.log\([^)]*\);?(?:\s*\/\/.*)?\s*$/gm, () => {
    removedCount++;
    return '';
  });

  // console.debug
  result = result.replace(/^\s*console\.debug\([^)]*\);?(?:\s*\/\/.*)?\s*$/gm, () => {
    removedCount++;
    return '';
  });

  // console.info
  result = result.replace(/^\s*console\.info\([^)]*\);?(?:\s*\/\/.*)?\s*$/gm, () => {
    removedCount++;
    return '';
  });

  // Keep warn/error

  // Clean up multiple consecutive empty lines (more than 2)
  result = result.replace(/\n\s*\n\s*\n/g, '\n\n');

  return { content: result, removedCount };
}

async function applyAutofix(files, { concurrency = 4 } = {}) {
  const stats = {
    filesProcessed: 0,
    commentsRemoved: 0,
    consolesRemoved: 0,
    errors: 0,
  };

  await mapLimit(files, Math.max(1, concurrency), async (filePath) => {
    try {
      // Only operate on files that exist
      if (!fs.existsSync(filePath)) {
        stats.errors++;
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
        // Should not happen because caller filters, but be safe
        return;
      }

      const original = fs.readFileSync(filePath, 'utf8');
      let modified = original;

      const c1 = stripComments(modified);
      modified = c1.content;
      const commentsRemoved = c1.removedCount;

      const c2 = stripDebugConsoles(modified);
      modified = c2.content;
      const consolesRemoved = c2.removedCount;

      if (modified !== original) {
        fs.writeFileSync(filePath, modified, 'utf8');
      }

      stats.filesProcessed++;
      stats.commentsRemoved += commentsRemoved;
      stats.consolesRemoved += consolesRemoved;
    } catch (err) {
      stats.errors++;
    }
  });

  return stats;
}

module.exports = { applyAutofix };
