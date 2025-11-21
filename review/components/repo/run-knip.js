const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const path = require('path');
const { ROOT_DIR } = require('../utils/paths');

async function runKnip() {
  try {
    const reviewDir = path.join(ROOT_DIR, '.windsurf', 'review');
    const cmd = `npx --prefix "${reviewDir.replace(/"/g, '\\"')}" knip --reporter json --no-progress --config .windsurf/review/knip.config.js --tsConfig .windsurf/review/tsconfig.review.json`;
    const { stdout, stderr } = await execAsync(cmd, { cwd: ROOT_DIR, maxBuffer: 64 * 1024 * 1024 });
    const output = String(stdout || stderr || '');
    return JSON.parse(output);
  } catch (error) {
    const out = (error && (error.stdout?.toString() || error.stderr?.toString())) || '';
    try {
      return JSON.parse(out);
    } catch (e) {
      return { error: `Failed to run knip: ${error.message}`, raw: out };
    }
  }
}

module.exports = { runKnip };
