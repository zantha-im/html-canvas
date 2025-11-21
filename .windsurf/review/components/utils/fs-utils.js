const fs = require('fs');
const path = require('path');
const { ensureDir, OUTPUT_DIR, OLD_ANALYSIS_FILE, LEGACY_ANALYSIS_FILE } = require('./paths');

// Simple in-memory cache for file contents during a single analyzer run
const _fileContentCache = new Map();

function countLines(filePath) {
  try {
    const content = readFileSmart(filePath);
    if (!content) return 0;
    // Normalize newlines for consistent counting
    return content.split(/\r?\n/).length;
  } catch (e) {
    return 0;
  }
}

function readFileCached(filePath) {
  try {
    if (_fileContentCache.has(filePath)) return _fileContentCache.get(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    _fileContentCache.set(filePath, content || '');
    return content || '';
  } catch (_) {
    _fileContentCache.set(filePath, '');
    return '';
  }
}

function readFileSmart(filePath) {
  if (process.env.CODE_REVIEW_CACHE_FILES === '0') {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (_) {
      return '';
    }
  }
  return readFileCached(filePath);
}

function readJson(filePath, fallback = null) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function deleteFileIfExists(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (_) {}
}

function deleteStaleReports() {
  // Remove legacy report outputs to avoid confusion
  deleteFileIfExists(OLD_ANALYSIS_FILE);
  deleteFileIfExists(LEGACY_ANALYSIS_FILE);
}

module.exports = {
  countLines,
  readFileSmart,
  readJson,
  writeJson,
  deleteFileIfExists,
  deleteStaleReports,
};
