const path = require('path');
const fs = require('fs');

// Resolve repo root relative to this file: .windsurf/review/components/utils -> ../../../..
const ROOT_DIR = path.join(__dirname, '..', '..', '..', '..');

function toRepoRelative(p) {
  try {
    const abs = path.isAbsolute(p) ? p : path.resolve(p);
    return path.relative(ROOT_DIR, abs) || p;
  } catch (_) {
    return p;
  }
}

const OUTPUT_DIR = path.join(ROOT_DIR, '.windsurf', 'review', 'output');
const RESULTS_FILE = path.join(OUTPUT_DIR, 'code-review-results.json');
// Legacy report files from the monolithic analyzer
const OLD_ANALYSIS_FILE = path.join(OUTPUT_DIR, 'code_review_analysis.json');
const LEGACY_ANALYSIS_FILE = path.join(ROOT_DIR, '.windsurf', 'review', 'code_review.json');
const TMP_JSCPD_DIR = path.join(OUTPUT_DIR, '.tmp', 'jscpd');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

module.exports = {
  ROOT_DIR,
  OUTPUT_DIR,
  RESULTS_FILE,
  OLD_ANALYSIS_FILE,
  LEGACY_ANALYSIS_FILE,
  TMP_JSCPD_DIR,
  toRepoRelative,
  ensureDir,
};
