'use strict';

const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');
const REPO_ROOT = path.join(__dirname, '../..');
const candidatePaths = [
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'Server/.env'),
].filter((filePath) => fs.existsSync(filePath));

for (const envPath of candidatePaths) {
  dotenv.config({ path: envPath, quiet: true });
}
