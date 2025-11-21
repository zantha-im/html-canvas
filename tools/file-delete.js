#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const stats = {
  filesDeleted: 0,
  dirsDeleted: 0,
  missingSkipped: 0,
  errors: 0,
};

const repoRoot = path.resolve(__dirname, '..', '..');

function printUsage() {
  console.log(`
🗑️  File/Directory Delete Tool — .windsurf/tools/file-delete.js

Safely delete files and directories inside the repository root.

USAGE
  cmd /c node .windsurf\\tools\\file-delete.js <path1> [path2 ...]

NOTES
  • Paths may be relative to the current working directory or absolute
  • Safety-guards:
    - Refuses deletion outside repo root: ${repoRoot}
    - Refuses deleting the repo root itself
    - Missing paths are logged as "Skipped (missing)"
  • Uses fs.rmSync({ recursive: true, force: true }) when available, otherwise a safe recursive fallback
`);
}

function removeRecursively(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.lstatSync(p);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(p)) {
      removeRecursively(path.join(p, entry));
    }
    fs.rmdirSync(p);
  } else {
    fs.unlinkSync(p);
  }
}

function deletePath(targetPath) {
  try {
    if (!targetPath || typeof targetPath !== 'string') {
      console.error('❌ Invalid path argument');
      stats.errors++;
      return false;
    }

    const abs = path.isAbsolute(targetPath)
      ? path.normalize(targetPath)
      : path.resolve(process.cwd(), targetPath);

    // Safety: ensure inside repository and not the repo root itself
    const relToRoot = path.relative(repoRoot, abs);
    const isOutside = relToRoot.startsWith('..') || path.isAbsolute(relToRoot);
    if (isOutside || abs === repoRoot) {
      console.error(`⛔ Refused to delete outside repository root: ${abs}`);
      stats.errors++;
      return false;
    }

    if (!fs.existsSync(abs)) {
      console.log(`⏭️  Skipped (missing): ${path.relative(process.cwd(), abs)}`);
      stats.missingSkipped++;
      return true;
    }

    const stat = fs.lstatSync(abs);

    const rm = fs.rmSync || null;
    if (stat.isDirectory()) {
      if (rm) {
        rm.call(fs, abs, { recursive: true, force: true });
      } else {
        removeRecursively(abs);
      }
      console.log(`🗂️  Deleted directory: ${path.relative(process.cwd(), abs)}`);
      stats.dirsDeleted++;
    } else {
      fs.unlinkSync(abs);
      console.log(`🗑️  Deleted file: ${path.relative(process.cwd(), abs)}`);
      stats.filesDeleted++;
    }

    return true;
  } catch (error) {
    console.error(`❌ Error deleting ${targetPath}:`, error.message);
    stats.errors++;
    return false;
  }
}

function printSummary() {
  console.log('\n📊 DELETION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Files deleted: ${stats.filesDeleted}`);
  console.log(`Directories deleted: ${stats.dirsDeleted}`);
  console.log(`Missing skipped: ${stats.missingSkipped}`);
  console.log(`Errors: ${stats.errors}`);
}

async function main() {
  const args = process.argv.slice(2).filter(Boolean);
  if (args.length === 0 || args.some(a => a === '--help' || a === '-h' || a === '/?')) {
    printUsage();
    process.exit(args.length === 0 ? 1 : 0);
  }

  for (const p of args) {
    deletePath(p);
  }
  printSummary();
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err && (err.stack || err));
    process.exit(1);
  });
}

module.exports = { deletePath };
