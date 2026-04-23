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

function parseReport(text) {
  if (!text) {
    return null;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed, extractJsonPayload(trimmed)].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep trying with the next candidate.
    }
  }
  return null;
}

const report = parseReport(stdout) || parseReport(stderr) || parseReport(rawOutput);
if (!report) {
  console.error('Failed to parse npm audit output as JSON.');
  process.exit(1);
}

function buildSummary(auditReport) {
  const metadataSummary = auditReport?.metadata?.vulnerabilities;
  if (metadataSummary) {
    return {
      critical: Number(metadataSummary.critical || 0),
      high: Number(metadataSummary.high || 0),
      moderate: Number(metadataSummary.moderate || 0),
      low: Number(metadataSummary.low || 0),
      info: Number(metadataSummary.info || 0),
    };
  }

  const summary = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  const vulnObj = auditReport?.vulnerabilities;
  if (!vulnObj || typeof vulnObj !== 'object') {
    return null;
  }

  for (const value of Object.values(vulnObj)) {
    const severity = String(value?.severity || '').toLowerCase();
    if (severity in summary) {
      summary[severity] += 1;
    }
  }

  return summary;
}

const summary = buildSummary(report);
if (!summary) {
  console.error('npm audit output is missing vulnerability metadata.');
  process.exit(1);
}

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
