'use strict';

const fs = require('fs');
const path = require('path');
const { loadDependency } = require('./dependency-loader');

const dotenv = loadDependency('dotenv');
const REPO_ROOT = path.join(__dirname, '../..');
const candidatePaths = [
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'Server/.env'),
].filter((filePath) => fs.existsSync(filePath));

if (candidatePaths.length > 0) {
  dotenv.config({ path: candidatePaths, quiet: true });
}
