// Shared helpers for ATLAS scripts and hooks. Zero dependencies, Node >= 18,
// macOS / Linux / Windows. Scripts live at <root>/.claude/scripts/, hooks at
// <root>/.claude/hooks/, so the workspace root is two levels above them unless
// ATLAS_ROOT overrides it (tests, unusual layouts).

const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const MODES = ['repo', 'project', 'multi'];
const PROJECT_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/;
const ENV_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESERVED_PROJECT_NAMES = new Set(['general', 'projects', 'repos', 'docs', 'misc']);

// ─── Workspace ──────────────────────────────────────────────────────────────

function findRoot(fromDir) {
  if (process.env.ATLAS_ROOT) return path.resolve(process.env.ATLAS_ROOT);
  return path.resolve(fromDir, '..', '..');
}

function configPath(root) {
  return path.join(root, '.atlas', 'config.json');
}

/** Read .atlas/config.json. Workspaces scaffolded before 3.0 have none: they are repo mode. */
function readConfig(root) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath(root), 'utf-8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`.atlas/config.json is not valid JSON: ${err.message}`);
  }
  const mode = MODES.includes(config.mode) ? config.mode : 'repo';
  const project = mode === 'multi' ? undefined : config.project || defaultProjectName(root);
  return { ...config, mode, project };
}

function writeConfig(root, config) {
  const clean = { ...config };
  if (clean.mode === 'multi') delete clean.project;
  writeFile(configPath(root), JSON.stringify(clean, null, 2) + '\n');
}

function defaultProjectName(root) {
  return slugify(path.basename(root)) || 'app';
}

function slugify(text) {
  return String(text)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '');
}

function validateProjectName(name) {
  if (!name || !PROJECT_NAME_RE.test(name)) {
    throw new Error(`invalid project name "${name}": use lowercase letters, digits, ".", "_" or "-"`);
  }
  if (RESERVED_PROJECT_NAMES.has(name)) throw new Error(`"${name}" is reserved; pick another project name`);
}

function listProjects(root) {
  const dir = path.join(root, 'projects');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && PROJECT_NAME_RE.test(e.name))
    .map((e) => e.name)
    .sort();
}

/**
 * Resolve a project to { name, dir }. In repo/project mode there is exactly one
 * project and it lives at the root. In multi mode the name is required and the
 * project lives in projects/<name>/.
 */
function resolveProject(root, config, name, { mustExist = true } = {}) {
  if (config.mode !== 'multi') {
    if (name && name !== config.project) {
      throw new Error(`this is a ${config.mode}-mode workspace with one project ("${config.project}"), not "${name}"`);
    }
    return { name: config.project, dir: root };
  }
  if (!name) {
    const known = listProjects(root);
    throw new Error(`multi-mode workspace: name a project (${known.length ? known.join(', ') : 'none yet'})`);
  }
  validateProjectName(name);
  const dir = path.join(root, 'projects', name);
  if (mustExist && !fs.existsSync(dir)) throw new Error(`no such project: projects/${name}/`);
  return { name, dir };
}

// ─── Files ──────────────────────────────────────────────────────────────────

function writeFile(file, content, mode) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, mode ? { encoding: 'utf-8', mode } : 'utf-8');
  if (mode && process.platform !== 'win32') fs.chmodSync(file, mode);
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function render(template, vars) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}

// ─── dotenv ─────────────────────────────────────────────────────────────────

/**
 * Scan dotenv text into entries with their exact spans, so parsing and editing
 * agree on where a value ends. Supports export, quotes ('…', "…" with escapes,
 * `…`), values spanning lines inside any quotes, and inline # comments.
 */
function scanEnv(text) {
  const entries = [];
  if (!text) return entries;
  const src = text.replace(/\r\n?/g, '\n');
  let i = 0;
  while (i < src.length) {
    const nl = src.indexOf('\n', i);
    const lineEnd = nl === -1 ? src.length : nl;
    const line = src.slice(i, lineEnd);
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*/.exec(line);
    if (!m) {
      i = lineEnd + 1;
      continue;
    }
    const start = i;
    let j = i + m[0].length;
    const quote = src[j];
    let value;
    if (quote === '"' || quote === "'" || quote === '`') {
      j++;
      let buf = '';
      while (j < src.length && src[j] !== quote) {
        if (quote === '"' && src[j] === '\\' && j + 1 < src.length) {
          const next = src[j + 1];
          buf += next === 'n' ? '\n' : next === 'r' ? '\r' : next === 't' ? '\t' : next;
          j += 2;
          continue;
        }
        buf += src[j++];
      }
      value = buf;
      const end = src.indexOf('\n', j);
      i = end === -1 ? src.length : end + 1;
    } else {
      value = line.slice(m[0].length).replace(/\s+#.*$/, '').trim();
      i = lineEnd + 1;
    }
    entries.push({ key: m[1], value, start, end: Math.min(i, src.length) });
  }
  return entries;
}

/** Parse dotenv text into an ordered Map (last occurrence wins). */
function parseEnv(text) {
  return new Map(scanEnv(text).map((e) => [e.key, e.value]));
}

function serializeEnvValue(value) {
  const v = String(value);
  if (/^[A-Za-z0-9_\-.,:/@+=%~]*$/.test(v)) return v;
  if (!/[\n\r']/.test(v)) return `'${v}'`;
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
}

/**
 * Set (or remove, when value === undefined) one key in a dotenv file. Every other
 * byte stays as it was, including comments and hand-written multi-line values.
 */
function updateEnvFile(file, key, value) {
  const src = (readIfExists(file) || '').replace(/\r\n?/g, '\n');
  const spans = scanEnv(src).filter((e) => e.key === key);
  const line = value === undefined ? '' : `${key}=${serializeEnvValue(value)}\n`;
  let out = src;
  for (const [n, span] of [...spans.entries()].reverse()) {
    out = out.slice(0, span.start) + (n === 0 ? line : '') + out.slice(span.end);
  }
  if (!spans.length && line) out = `${out}${out && !out.endsWith('\n') ? '\n' : ''}${line}`;
  if (out && !out.endsWith('\n')) out += '\n';
  writeFile(file, out, 0o600);
  return spans.length > 0;
}

/** Keys declared by a .env.example: name, default value (may be ''), and the comment above it. */
function parseEnvExample(text) {
  const keys = [];
  const lines = (text || '').replace(/\r\n?/g, '\n').split('\n');
  let comment = [];
  for (const line of lines) {
    if (/^\s*#/.test(line)) {
      comment.push(line.replace(/^\s*#\s?/, ''));
      continue;
    }
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/.exec(line);
    if (m) {
      const parsed = parseEnv(`${m[1]}=${m[2]}`);
      keys.push({ name: m[1], fallback: parsed.get(m[1]) || '', comment: comment.join(' ').trim() });
    }
    comment = [];
  }
  return keys;
}

// ─── Secret store ───────────────────────────────────────────────────────────

function secretsDir(root) {
  return path.join(root, '.atlas', 'secrets');
}

/**
 * Lowest to highest priority: global, project, project@env. "@" can't appear in a
 * project name, so the env layer of "shop" never collides with a project "shop.prod".
 */
function secretLayers(root, project, env) {
  const dir = secretsDir(root);
  const layers = [{ scope: 'global', file: path.join(dir, 'global.env') }];
  if (project) layers.push({ scope: `project:${project}`, file: path.join(dir, 'projects', `${project}.env`) });
  if (project && env) layers.push({ scope: `project:${project}@${env}`, file: path.join(dir, 'projects', `${project}@${env}.env`) });
  return layers;
}

function loadLayers(layers) {
  const values = new Map();
  const source = new Map();
  for (const layer of layers) {
    for (const [k, v] of parseEnv(readIfExists(layer.file))) {
      values.set(k, v);
      source.set(k, layer.scope);
    }
  }
  return { values, source };
}

// ─── Processes ──────────────────────────────────────────────────────────────

function isExecutable(file) {
  try {
    if (!fs.statSync(file).isFile()) return false;
    if (process.platform !== 'win32') fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Find a binary on PATH (honours PATHEXT on Windows). Returns the full path or null. */
function which(bin) {
  if (/[\\/]/.test(bin)) return isExecutable(bin) ? bin : null;
  const win = process.platform === 'win32';
  const dirs = (process.env.PATH || process.env.Path || '').split(path.delimiter).filter(Boolean);
  const exts = win && !path.extname(bin)
    ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
    : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, bin + ext);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

// cmd.exe quoting, after cross-spawn: .cmd/.bat shims cannot be spawned without a
// shell on Windows (Node refuses since the 2024 batch-file CVE), so build an
// escaped command line for `cmd /d /s /c` instead of trusting shell: true.
const CMD_META = /([()\][%!^"`<>&|;, *?])/g;
function escapeCmdArg(arg, doubleEscape = false) {
  const a = String(arg).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1');
  const once = `"${a}"`.replace(CMD_META, '^$1');
  return doubleEscape ? once.replace(CMD_META, '^$1') : once;
}

/** Build spawn arguments that work for .exe and .cmd/.bat alike, never through a shell string. */
function portableCommand(command, args) {
  const resolved = which(command);
  if (!resolved) return null;
  if (process.platform === 'win32' && /\.(cmd|bat)$/i.test(resolved)) {
    // npm's node_modules/.bin shims pass arguments through a second cmd parse
    const shim = /node_modules[\\/]\.bin[\\/][^\\/]+\.cmd$/i.test(resolved);
    const line = [path.normalize(resolved).replace(CMD_META, '^$1'), ...args.map((a) => escapeCmdArg(a, shim))].join(' ');
    return {
      file: process.env.comspec || 'cmd.exe',
      args: ['/d', '/s', '/c', `"${line}"`],
      options: { windowsVerbatimArguments: true },
    };
  }
  return { file: resolved, args, options: {} };
}

function spawnPortable(command, args, options = {}) {
  const cmd = portableCommand(command, args);
  if (!cmd) {
    const err = new Error(`command not found: ${command}`);
    err.code = 'ENOENT';
    throw err;
  }
  return spawn(cmd.file, cmd.args, { ...options, ...cmd.options });
}

function spawnPortableSync(command, args, options = {}) {
  const cmd = portableCommand(command, args);
  if (!cmd) return { status: null, error: Object.assign(new Error(`command not found: ${command}`), { code: 'ENOENT' }) };
  return spawnSync(cmd.file, cmd.args, { ...options, ...cmd.options });
}

// ─── Output masking ─────────────────────────────────────────────────────────

const MIN_MASK = 6;

/** Every form a value commonly takes in output: as-is, JSON-escaped, CRLF, and each line of a multi-line value. */
function maskVariants(secrets) {
  const out = new Set();
  for (const s of secrets) {
    if (!s) continue;
    const forms = [s, JSON.stringify(s).slice(1, -1), s.replace(/\n/g, '\r\n')];
    if (/\n/.test(s)) for (const line of s.split(/\r?\n/)) if (line.trim().length >= 8) forms.push(line.trim());
    for (const f of forms) if (f.length >= MIN_MASK) out.add(f);
  }
  return [...out].sort((a, b) => b.length - a.length);
}

/**
 * Replace secret values in a stream before it reaches the terminal (and so the
 * transcript). Output is released as soon as it cannot be the start of a secret;
 * a tail that could still grow into one is held until more output or the end,
 * so a value split across chunks, or paused mid-way, never slips through.
 * Best-effort against accidents, not against a command built to exfiltrate
 * (an encoded or reversed value is not recognized). Values under 6 characters
 * are never masked.
 */
function createMasker(secrets, write) {
  const values = maskVariants(secrets);
  const maxLen = values.length ? values[0].length : 0;
  const mask = (text) => values.reduce((t, v) => t.split(v).join('****'), text);
  const heldTail = (text) => {
    for (let n = Math.min(text.length, maxLen - 1); n > 0; n--) {
      const tail = text.slice(-n);
      if (values.some((v) => v.startsWith(tail))) return n;
    }
    return 0;
  };
  let pending = '';
  function flush(final) {
    if (!pending) return;
    const masked = mask(pending);
    const keep = final ? 0 : heldTail(masked);
    const out = masked.slice(0, masked.length - keep);
    pending = masked.slice(masked.length - keep);
    if (out) write(out);
  }
  return {
    push(chunk) {
      pending += chunk.toString();
      flush(false);
    },
    end() {
      flush(true);
    },
  };
}

module.exports = {
  MODES,
  ENV_KEY_RE,
  findRoot,
  configPath,
  readConfig,
  writeConfig,
  defaultProjectName,
  slugify,
  validateProjectName,
  listProjects,
  resolveProject,
  writeFile,
  readIfExists,
  render,
  scanEnv,
  parseEnv,
  serializeEnvValue,
  updateEnvFile,
  parseEnvExample,
  secretsDir,
  secretLayers,
  loadLayers,
  which,
  escapeCmdArg,
  portableCommand,
  spawnPortable,
  spawnPortableSync,
  MIN_MASK,
  createMasker,
};
