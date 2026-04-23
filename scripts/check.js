const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TARGET_DIRS = ['Client', 'Server'];
const JS_EXT = '.js';
const HTML_EXT = '.html';
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walk(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function syntaxCheck(jsFile) {
  const result = spawnSync(process.execPath, ['--check', jsFile], {
    stdio: 'inherit',
  });
  return result.status === 0;
}

function validateHtml(htmlFile) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  if (content.includes('src="/api.js"')) {
    return `Invalid absolute API helper path in ${htmlFile}. Use "api.js" instead of "/api.js".`;
  }
  return null;
}

function run() {
  const allFiles = TARGET_DIRS
    .map((dirName) => path.join(ROOT, dirName))
    .filter((dir) => fs.existsSync(dir))
    .flatMap((dir) => walk(dir));

  const jsFiles = allFiles.filter((file) => file.endsWith(JS_EXT));
  const htmlFiles = allFiles.filter((file) => file.endsWith(HTML_EXT));
  const issues = [];

  for (const file of jsFiles) {
    if (!syntaxCheck(file)) {
      issues.push(`Syntax check failed: ${file}`);
    }
  }

  for (const file of htmlFiles) {
    const issue = validateHtml(file);
    if (issue) {
      issues.push(issue);
    }
  }

  if (issues.length > 0) {
    console.error('\nChecks failed:\n');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log('All checks passed.');
}

run();
