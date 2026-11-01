#!/usr/bin/env node
// Projects in a multi-mode ATLAS workspace.
//   add <name> [--stage toy|mvp|production] [--one-line "..."] [--stack "..."]
//   list [--json]
//   status            refresh index.md's Status column from each STATUS.md "Now:" line

const fs = require('fs');
const path = require('path');
const lib = require('./lib/atlas.cjs');
const ws = require('./lib/workspace.cjs');

const HELP = `Usage: node .claude/scripts/project.cjs <command>

  add <name> [--stage toy|mvp|production] [--one-line "..."] [--stack "..."]
        create projects/<name>/ (CLAUDE.md, STATUS.md, .env.example) and register it in index.md
  list [--json]   projects with stage and status
  status          refresh index.md from each project's CLAUDE.md and STATUS.md

Multi mode only. Repo and project mode hold exactly one project at the root;
switch with /atlas:mode multi.`;

const root = lib.findRoot(__dirname);

function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json' || a === '--help' || a === '-h') opts[a.replace(/^-+/, '')] = true;
    else if (['--stage', '--one-line', '--stack'].includes(a)) {
      if (argv[i + 1] === undefined) throw new Error(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts._.push(a);
  }
  return opts;
}

function requireMulti() {
  const config = lib.readConfig(root);
  if (config.mode !== 'multi') {
    throw new Error(`this is a ${config.mode}-mode workspace (one project: "${config.project}"). Switch with /atlas:mode multi`);
  }
  return config;
}

function indexFile() {
  return path.join(root, 'index.md');
}

function projectRow(name) {
  const dir = path.join(root, 'projects', name);
  const map = lib.readIfExists(path.join(dir, 'CLAUDE.md'));
  const status = lib.readIfExists(path.join(dir, 'STATUS.md'));
  const deploy = lib.readIfExists(path.join(dir, 'DEPLOY.md'));
  const provider = ws.readLineValue(deploy, 'Provider');
  return {
    Project: name,
    'One line': ws.readLineValue(map, 'One line'),
    Stage: ws.readLineValue(map, 'Stage'),
    Path: `projects/${name}`,
    Deploy: provider && !provider.startsWith('<') ? provider : 'none',
    Status: ws.readLineValue(status, 'Now') || 'no STATUS.md',
  };
}

function add(opts) {
  requireMulti();
  const name = opts._[0];
  lib.validateProjectName(name);
  const dir = path.join(root, 'projects', name);
  if (fs.existsSync(dir)) throw new Error(`projects/${name}/ already exists`);
  const files = ws.projectFiles('multi', { name, stage: opts.stage, oneLine: opts['one-line'], stack: opts.stack });
  for (const [file, content] of Object.entries(files)) lib.writeFile(path.join(dir, file), content);
  const row = { ...projectRow(name), Stack: opts.stack || '' };
  lib.writeFile(indexFile(), ws.upsertIndexRow(lib.readIfExists(indexFile()), row));
  console.log(`created projects/${name}/ (${Object.keys(files).join(', ')}) and registered it in index.md`);
}

function list(opts) {
  requireMulti();
  const rows = lib.listProjects(root).map(projectRow);
  if (opts.json) return console.log(JSON.stringify(rows, null, 2));
  if (!rows.length) return console.log('no projects yet (add one with: project.cjs add <name>)');
  for (const r of rows) console.log(`${r.Project.padEnd(24)} ${(r.Stage || '-').padEnd(11)} ${r.Status}`);
}

function status() {
  requireMulti();
  let text = lib.readIfExists(indexFile());
  const known = lib.listProjects(root);
  for (const name of known) {
    const fresh = projectRow(name);
    // keep hand-written Stack and One line cells; refresh what the files own
    const current = text ? ws.parseIndex(text).rows.find((r) => r.Project === name) : null;
    if (current && current['One line']) delete fresh['One line'];
    text = ws.upsertIndexRow(text, fresh);
  }
  const missing = ws.parseIndex(text).rows.filter((r) => !known.includes(r.Project)).map((r) => r.Project);
  lib.writeFile(indexFile(), text);
  console.log(`index.md refreshed (${known.length} project${known.length === 1 ? '' : 's'})`);
  if (missing.length) console.log(`listed in index.md but no folder under projects/: ${missing.join(', ')}`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = parse(rest);
  if (!command || command === 'help' || opts.help || command === '--help') return console.log(HELP);
  const commands = { add, list, status };
  if (!commands[command]) throw new Error(`unknown command "${command}"`);
  commands[command](opts);
}

try {
  main();
} catch (err) {
  console.error(`project: ${err.message}`);
  process.exit(1);
}
