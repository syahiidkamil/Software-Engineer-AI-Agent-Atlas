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

/** Run the package CLI (bin/install.js). */
function cli(args, { input = '', cwd } = {}) {
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'install.js'), ...args], {
    input,
    cwd,
    encoding: 'utf-8',
    env: { ...process.env, ATLAS_SKIP_SUBMODULE: '1', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  });
  return { status: r.status, out: r.stdout.replace(/\x1b\[[0-9;]*m/g, ''), err: r.stderr };
}

/** Run the real scaffolder with piped answers (the numeric fallback prompts). */
function scaffold(answers, { into } = {}) {
  const dir = into || path.join(tempDir(), 'Saori-Hibana');
  const r = cli(['new-project', dir], { input: answers.join('\n') + '\n' });
  if (r.status !== 0) throw new Error(`scaffold failed:\n${r.out}${r.err}`);
  return { dir, out: r.out };
}

/** The real content of files swe-atlas 2.6.4 shipped and 3.0.0 retired, by workspace path (test/fixtures/legacy-2.6.4). */
function legacy() {
  const base = path.join(__dirname, 'fixtures', 'legacy-2.6.4', 'claude');
  const out = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[`.claude/${path.relative(base, full).split(path.sep).join('/')}`] = fs.readFileSync(full);
    }
  };
  walk(base);
  return out;
}

module.exports = { REPO, SCRIPTS, HOOKS, tempDir, workspace, write, read, exists, script, hook, cli, scaffold, legacy };
