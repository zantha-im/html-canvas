// Portable dynamic Knip config for mixed Next.js + Express/Node projects.
// Declares real entrypoints when present to avoid false-positive "unused files".
// Keeps dead-code detection effective by avoiding blanket ignores of server/integration directories.

const fs = require('fs');
const path = require('path');

function exists(relPath) {
  try {
    return fs.existsSync(path.resolve(process.cwd(), relPath));
  } catch (_) {
    return false;
  }
}

module.exports = (() => {
  const entry = [];

  // Common server entrypoints
  const serverEntrypoints = [
    'src/server/app.ts',
    'src/server/index.ts',
    'src/server/app.js',
    'src/server/index.js',
  ].filter(exists);

  if (serverEntrypoints.length) {
    entry.push(...serverEntrypoints);
    if (exists('src/server/routes')) {
      entry.push('src/server/routes/**/*.ts', 'src/server/routes/**/*.js');
    }
  }

  // Integrations that may be wired at runtime
  if (exists('src/integrations')) {
    entry.push('src/integrations/**/*.{ts,tsx,js,jsx}');
  }

  // Project scope across src/** (primary) and allow top-level common roots
  const project = [
    'src/**/*.{ts,tsx,js,jsx}',
    'app/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'lib/**/*.{ts,tsx,js,jsx}',
    'hooks/**/*.{ts,tsx,js,jsx}',
    'types/**/*.{ts,tsx,js,jsx}',
  ];

  // Dynamically include optional roots if present to avoid false positives
  const optionalRoots = ['context', 'services'];
  for (const root of optionalRoots) {
    if (exists(root)) project.push(`${root}/**/*.{ts,tsx,js,jsx}`);
    const srcRoot = `src/${root}`;
    if (exists(srcRoot)) project.push(`${srcRoot}/**/*.{ts,tsx,js,jsx}`);
  }

  // Ignore non-code assets only
  const ignore = ['views/**', 'public/**'];

  return {
    $schema: 'https://unpkg.com/knip@latest/schema.json',
    entry,
    project,
    ignore,
  };
})();
