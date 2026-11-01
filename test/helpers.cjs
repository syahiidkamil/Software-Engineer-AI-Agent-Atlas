// Shared test helpers: temp workspaces and script runners.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const SCRIPTS = path.join(REPO, '.claude', 'scripts');
const HOOKS = path.join(REPO, '.claude', 'hooks');

function tempDir(prefix = 'atlas-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** A bare workspace: just .atlas/config.json (and whatever `files` adds). */
function workspace(config, files = {}) {
  const root = tempDir();
  if (config) write(root, '.atlas/config.json', JSON.stringify(config));
  for (const [rel, content] of Object.entries(files)) write(root, rel, content);
  return root;
}

function write(root, rel, content) {
  const file = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return file;
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, ...rel.split('/')), 'utf-8');
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, ...rel.split('/')));
}

/** Run a .claude/scripts/<name> against a workspace root. */
function script(name, args, { root, input, env = {} } = {}) {
  return spawnSync(process.execPath, [path.join(SCRIPTS, name), ...args], {
    encoding: 'utf-8',
    input: input === undefined ? '' : input,
    env: { ...process.env, ATLAS_ROOT: root, ...env },
  });
}

function hook(name, args, { root, input = '', env = {} } = {}) {
  return spawnSync(process.execPath, [path.join(HOOKS, name), ...args], {
    encoding: 'utf-8',
    input,
    env: { ...process.env, ...(root ? { ATLAS_ROOT: root } : {}), ...env },
  });
}

module.exports = { REPO, SCRIPTS, HOOKS, tempDir, workspace, write, read, exists, script, hook };
