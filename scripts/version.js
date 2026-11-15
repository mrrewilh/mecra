'use strict';
/**
 * Version is derived from the latest commit's timestamp, never written by hand.
 * `git log -1 --format=%cI` gives the committer date in the commit's own offset,
 * e.g. 2026-11-15T19:04:38+03:00 -> 2026.11.15.1904.
 */
const { execSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function compute() {
  try {
    const iso = execSync('git log -1 --format=%cI', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (match) return match[1] + '.' + match[2] + '.' + match[3] + '.' + match[4] + match[5];
  } catch (error) {
    // Fall through: no git (tarball, shallow CI) uses the clock instead.
  }
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return (
    now.getUTCFullYear() +
    '.' +
    pad(now.getUTCMonth() + 1) +
    '.' +
    pad(now.getUTCDate()) +
    '.' +
    pad(now.getUTCHours()) +
    pad(now.getUTCMinutes())
  );
}

module.exports = { compute };

if (require.main === module) {
  process.stdout.write(compute() + '\n');
}
