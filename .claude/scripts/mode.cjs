#!/usr/bin/env node
// Small helpers for /atlas:mode. The command itself (the model) plans and performs
// the migration: which files move, conflicts, git mv. This script only does the
// bookkeeping that must be exact.
//
//   node .claude/scripts/mode.cjs current
//   node .claude/scripts/mode.cjs set <repo|project|multi> [--project <name>] [--dry-run]
//       writes .atlas/config.json, rewrites the managed workspace block in CLAUDE.md,
//       and appends any ATLAS .gitignore lines the new mode needs (never removes lines)

const path = require('path');
const lib = require('./lib/atlas.cjs');
const ws = require('./lib/workspace.cjs');

const root = lib.findRoot(__dirname);

function current() {
  const config = lib.readConfig(root);
  if (config.mode === 'multi') {
    const projects = lib.listProjects(root);
    console.log(`mode: multi\nprojects: ${projects.length ? projects.join(', ') : 'none'}`);
  } else {
    console.log(`mode: ${config.mode}\nproject: ${config.project}`);
  }
}

function set(mode, opts) {
  if (!lib.MODES.includes(mode)) throw new Error(`mode must be one of: ${lib.MODES.join(', ')}`);
  const config = lib.readConfig(root);
  const next = { ...config, mode };
  if (mode !== 'multi') {
    next.project = opts.project || config.project || lib.defaultProjectName(root);
    lib.validateProjectName(next.project);
  }
  const claudeFile = path.join(root, 'CLAUDE.md');
  const claude = lib.readIfExists(claudeFile);
  const gitignoreFile = path.join(root, '.gitignore');
  const gitignore = lib.readIfExists(gitignoreFile) || '';
  const mergedIgnore = ws.mergeGitignore(gitignore, mode);

  const changes = [`.atlas/config.json -> mode ${mode}${next.project && mode !== 'multi' ? `, project ${next.project}` : ''}`];
  if (claude !== null) changes.push(`CLAUDE.md workspace block -> ${mode}`);
  if (mergedIgnore !== gitignore) changes.push('.gitignore: ATLAS lines added');
  if (opts['dry-run']) return console.log(changes.map((c) => `would write ${c}`).join('\n'));

  lib.writeConfig(root, next);
  if (claude !== null) lib.writeFile(claudeFile, ws.setWorkspaceBlock(claude, mode));
  if (mergedIgnore !== gitignore) lib.writeFile(gitignoreFile, mergedIgnore);
  console.log(changes.map((c) => `wrote ${c}`).join('\n'));
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--dry-run') opts['dry-run'] = true;
    else if (rest[i] === '--project') opts.project = rest[++i];
    else opts._.push(rest[i]);
  }
  if (command === 'current') return current();
  if (command === 'set') return set(opts._[0], opts);
  console.log('Usage: node .claude/scripts/mode.cjs current | set <repo|project|multi> [--project <name>] [--dry-run]');
  process.exitCode = command && !['help', '--help', '-h'].includes(command) ? 1 : 0;
}

try {
  main();
} catch (err) {
  console.error(`mode: ${err.message}`);
  process.exit(1);
}
