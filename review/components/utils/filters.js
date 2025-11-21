const path = require('path');
const { ROOT_DIR } = require('./paths');

const FILE_SIZE_LIMITS = {
  components: 150,
  hooks: 100,
  types: 100,
  utils: 50,
  routes: 100,
  services: 100,
  repositories: 100,
};

function getFileType(filePath) {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  if (dirName.includes('components')) return 'components';
  if (dirName.includes('hooks')) return 'hooks';
  if (dirName.includes('types')) return 'types';
  if (dirName.includes('services')) return 'services';
  if (dirName.includes('repositories')) return 'repositories';
  if (dirName.includes('app') && fileName.includes('route')) return 'routes';
  if (dirName.includes('lib') || dirName.includes('utils')) return 'utils';
  return 'components';
}

function isReviewablePath(relPath) {
  try {
    const n = String(relPath || '').replace(/\\/g, '/').replace(/^\.\/+/, '');
    // Allow top-level or src/ prefixed common roots, plus services/repositories
    if (!/^(?:src\/)?(?:app|components|lib|hooks|types|services|repositories|pages)\//.test(n)) return false;
    if (/^test\//.test(n)) return false;
    if(/^\.windsurf\//.test(n)) return false;
    if (/node_modules\//.test(n)) return false;
    if (/\.d\.ts$/i.test(n)) return false;
    if (!/\.(ts|tsx)$/i.test(n)) return false;
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = {
  FILE_SIZE_LIMITS,
  getFileType,
  isReviewablePath,
  ROOT_DIR,
};
