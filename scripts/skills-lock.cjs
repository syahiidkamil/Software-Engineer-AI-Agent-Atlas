#!/usr/bin/env node
// Dev tool (not shipped): report which vendored skills are behind upstream.
//
//   node scripts/skills-lock.cjs check          # compare skills.lock.json with upstream
//   node scripts/skills-lock.cjs pin <skill>... # record upstream's latest commit after re-vendoring
//
// For each skill the lock stores { repo, path, commit }, where commit is the last upstream
// commit that touched `path` when the copy was taken. "Behind" means upstream has a newer
// commit on that path. Uses the GitHub REST API; set GITHUB_TOKEN to lift the rate limit.

const fs = require('fs');
const path = require('path');

const LOCK = path.join(__dirname, '..', 'skills.lock.json');

async function latestCommit(repo, skillPath) {
  const url = `https://api.github.com/repos/${repo}/commits?path=${encodeURIComponent(skillPath)}&per_page=1`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'swe-atlas-skills-lock' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${repo}: GitHub API ${res.status}`);
  const [commit] = await res.json();
  if (!commit) throw new Error(`${repo}: no commits found for ${skillPath}`);
  return { sha: commit.sha, date: commit.commit.committer.date };
}

function readLock() {
  return JSON.parse(fs.readFileSync(LOCK, 'utf-8'));
}

async function check() {
  const lock = readLock();
  let behind = 0;
  for (const [name, entry] of Object.entries(lock.skills)) {
    try {
      const latest = await latestCommit(entry.repo, entry.path);
      const status = latest.sha === entry.commit ? 'current' : 'BEHIND';
      if (status === 'BEHIND') behind++;
      console.log(`${status.padEnd(8)} ${name.padEnd(34)} ${entry.repo} (upstream ${latest.date.slice(0, 10)})`);
    } catch (err) {
      console.log(`${'ERROR'.padEnd(8)} ${name.padEnd(34)} ${err.message}`);
    }
  }
  process.exitCode = behind > 0 ? 1 : 0;
}

async function pin(names) {
  const lock = readLock();
  for (const name of names) {
    const entry = lock.skills[name];
    if (!entry) throw new Error(`unknown skill in lock: ${name}`);
    entry.commit = (await latestCommit(entry.repo, entry.path)).sha;
    console.log(`pinned ${name} -> ${entry.commit}`);
  }
  fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2) + '\n');
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'check') return check();
  if (command === 'pin' && rest.length) return pin(rest);
  console.log('usage: node scripts/skills-lock.cjs check | pin <skill>...');
  process.exitCode = command ? 1 : 0;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
