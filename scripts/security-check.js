'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

const serverDir = path.join(__dirname, '../Server');
const isWindows = process.platform === 'win32';
const failLevel = (process.env.SECURITY_FAIL_LEVEL || 'high').toLowerCase();

const levelOrder = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

if (!(failLevel in levelOrder)) {
  console.error(`Invalid SECURITY_FAIL_LEVEL: ${failLevel}. Use one of: none, low, moderate, high, critical.`);
  process.exit(1);
}

const command = isWindows ? 'cmd.exe' : 'npm';
const args = isWindows
  ? ['/d', '/s', '/c', 'npm audit --json --omit=dev']
  : ['audit', '--json', '--omit=dev'];

const result = spawnSync(command, args, {
  cwd: serverDir,
  encoding: 'utf8',
});

const stdout = (result.stdout || '').trim();
const stderr = (result.stderr || '').trim();

if (result.error) {
  console.error(`Failed to execute npm audit: ${result.error.message}`);
  process.exit(1);
}

const rawOutput = [stdout, stderr].filter(Boolean).join('\n').trim();
if (!rawOutput) {
  console.error('npm audit did not return JSON output.');
  process.exit(1);
}

function extractJsonPayload(text) {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    return '';
  }
  return text.slice(firstBrace, lastBrace + 1);
}

let report;
try {
  report = JSON.parse(extractJsonPayload(rawOutput));
} catch (err) {
  console.error('Failed to parse npm audit output as JSON.');
  console.error(err.message || String(err));
  process.exit(1);
}

const vulnerabilities = report?.metadata?.vulnerabilities;
if (!vulnerabilities) {
  console.error('npm audit output is missing vulnerability metadata.');
  process.exit(1);
}

const summary = {
  critical: Number(vulnerabilities.critical || 0),
  high: Number(vulnerabilities.high || 0),
  moderate: Number(vulnerabilities.moderate || 0),
  low: Number(vulnerabilities.low || 0),
  info: Number(vulnerabilities.info || 0),
};

console.log('Security audit summary (runtime dependencies):');
console.log(`- critical: ${summary.critical}`);
console.log(`- high: ${summary.high}`);
console.log(`- moderate: ${summary.moderate}`);
console.log(`- low: ${summary.low}`);
console.log(`- info: ${summary.info}`);

const levelCounts = [
  ['critical', summary.critical],
  ['high', summary.high],
  ['moderate', summary.moderate],
  ['low', summary.low],
];

const threshold = levelOrder[failLevel];
const hasBlocking = levelCounts.some(([level, count]) => levelOrder[level] >= threshold && count > 0);

if (hasBlocking) {
  console.error(`Security gate failed at threshold "${failLevel}". Resolve vulnerabilities and rerun.`);
  process.exit(1);
}

console.log(`Security gate passed at threshold "${failLevel}".`);
 