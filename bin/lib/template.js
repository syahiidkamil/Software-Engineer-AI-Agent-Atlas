// The set of files a swe-atlas package puts into a workspace, as data. The
// scaffolder writes this set and `swe-atlas update` compares against it, so the
// two can never disagree about what the template ships. Paths are workspace-
// relative with forward slashes on every OS.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const VARIANTS = ['vanilla', 'atlas-autonomous', 'atlas-collaborative'];
const CLAUDE_DIRS = ['agents', 'commands', 'hooks', 'reference', 'rules', 'scripts', 'templates', 'skills'];
const MANIFEST_PATH = '.claude/atlas-manifest.json';
const BLOCK_RE = /<!-- atlas:workspace start[^>]*-->[\s\S]*?<!-- atlas:workspace end -->/;
const MODES = ['repo', 'project', 'multi'];

// Hashes of the managed-block texts ATLAS itself has written (any mode, this version or one the
// install record remembers). Only such a block is ignored when comparing CLAUDE.md: a block the
// user added a line to is an edit, and must not be replaced as if it were untouched.
const trustedBlocks = new Set();
const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const blockHash = (text) => sha(text.replace(/\r\n?/g, '\n'));
const blockHashes = (block) => MODES.map((mode) => blockHash(block(mode)));
function trustBlocks(hashes) {
  for (const h of hashes || []) trustedBlocks.add(h);
}

function walk(dir, base = dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT' || err.code === 'ENOTDIR') return out; // nothing there, or a file where the folder would be
    throw err;
  }
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue; // never ship Finder junk from a dev checkout
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.isFile()) out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

/** The identity docs call the human "Boss" in the source; a workspace calls them "Partner". */
function partnerize(text) {
  return text.replace(/\bBoss\b/g, 'Partner').replace(/\bboss\b/g, 'partner');
}

/**
 * Every file the template at `templateDir` ships for this variant and partner,
 * as Map<path, Buffer>. All skills are included; the caller decides which ones
 * a workspace has installed. `block(mode)` supplies the managed workspace block.
 */
function renderTemplate(templateDir, { variant, partner = '', mode, block }) {
  if (!VARIANTS.includes(variant)) throw new Error(`variant must be one of: ${VARIANTS.join(', ')}`);
  trustBlocks(blockHashes(block));
  const files = new Map();
  const add = (rel, from = rel) => files.set(rel, fs.readFileSync(path.join(templateDir, ...from.split('/'))));

  const variantFile = path.join(templateDir, 'claude_md_variants', `${variant}.md`);
  if (fs.existsSync(variantFile)) {
    // function replacements: a "$" in a name or in the block is literal text, not a pattern
    const text = fs.readFileSync(variantFile, 'utf-8').replaceAll('{{PARTNER_NAME}}', () => partner || '{{PARTNER_NAME}}');
    files.set('CLAUDE.md', Buffer.from(text.replace('{{WORKSPACE_BLOCK}}', () => block(mode))));
  }
  if (variant !== 'vanilla') {
    for (const rel of walk(path.join(templateDir, 'misc', 'self'))) {
      const buf = fs.readFileSync(path.join(templateDir, 'misc', 'self', ...rel.split('/')));
      files.set(`misc/self/${rel}`, rel.endsWith('.md') ? Buffer.from(partnerize(buf.toString('utf-8'))) : buf);
    }
  }
  for (const rel of walk(path.join(templateDir, 'misc', 'archive'))) add(`misc/archive/${rel}`);
  for (const dir of CLAUDE_DIRS) {
    for (const rel of walk(path.join(templateDir, '.claude', dir))) add(`.claude/${dir}/${rel}`);
  }
  if (fs.existsSync(path.join(templateDir, ...MANIFEST_PATH.split('/')))) add(MANIFEST_PATH);
  const external = path.join(templateDir, 'docs', 'external-information');
  if (fs.existsSync(external)) {
    for (const entry of fs.readdirSync(external, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) add(`docs/external-information/${entry.name}`);
    }
  }
  return files;
}

/**
 * Write one rendered file into a workspace. A script the template ships as
 * executable stays executable (writeFile alone would create it 0644).
 */
function place(root, rel, buf, templateDir) {
  const link = symlinkOn(root, rel);
  if (link) throw new Error(`refusing to write ${rel}: ${link} is a symlink, and the file behind it may be outside the workspace`);
  const file = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  try {
    const mode = fs.statSync(path.join(templateDir, ...rel.split('/'))).mode;
    if (mode & 0o111) fs.chmodSync(file, mode & 0o777);
  } catch {
    // CLAUDE.md and misc/self are rendered, not copied: no source file to mirror
  }
}

/**
 * The first symlink on the way from the workspace root to `rel` (the file itself included), or
 * null. Writing or deleting through one could reach a file outside the workspace.
 */
function symlinkOn(root, rel) {
  const parts = rel.split('/');
  for (let i = 1; i <= parts.length; i++) {
    const sub = parts.slice(0, i).join('/');
    try {
      if (fs.lstatSync(path.join(root, ...parts.slice(0, i))).isSymbolicLink()) return sub;
    } catch {
      return null; // nothing there yet, so nothing below it either
    }
  }
  return null;
}

/**
 * Why `rel` cannot be written or removed as a plain file, or null: a symlink on the way, a
 * file where a folder has to be, or a folder where the file itself goes.
 */
function obstacle(root, rel) {
  const link = symlinkOn(root, rel);
  if (link) return { at: link, why: 'a symlink' };
  const parts = rel.split('/');
  for (let i = 1; i <= parts.length; i++) {
    let stat;
    try {
      stat = fs.lstatSync(path.join(root, ...parts.slice(0, i)));
    } catch {
      return null;
    }
    const sub = parts.slice(0, i).join('/');
    if (i < parts.length && !stat.isDirectory()) return { at: sub, why: 'a file where the template needs a folder' };
    if (i === parts.length && stat.isDirectory()) return { at: `${sub}/`, why: 'a folder where the template ships a file' };
  }
  return null;
}

/** The skill a path belongs to, or null. */
function skillOf(rel) {
  const m = /^\.claude\/skills\/([^/]+)\//.exec(rel);
  return m ? m[1] : null;
}

// ─── Hashing ────────────────────────────────────────────────────────────────

function isBinary(buf) {
  return buf.subarray(0, 8000).includes(0);
}

/**
 * What counts as "the same file": line endings never matter, and the managed
 * workspace block in CLAUDE.md is ignored while it is one ATLAS wrote, because
 * /atlas:mode rewrites it.
 */
function normalize(rel, buf) {
  if (isBinary(buf)) return buf;
  let text = buf.toString('utf-8').replace(/\r\n?/g, '\n');
  if (rel === 'CLAUDE.md') text = text.replace(BLOCK_RE, (block) => (trustedBlocks.has(blockHash(block)) ? '{{WORKSPACE_BLOCK}}' : block));
  return Buffer.from(text);
}

function hash(rel, buf) {
  return crypto.createHash('sha256').update(normalize(rel, buf)).digest('hex');
}

// ─── Manifest ───────────────────────────────────────────────────────────────

function globToRegExp(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\/|\*\*|\*|\?/g, (m) => (m === '**/' ? '(?:.*/)?' : m === '**' ? '.*' : m === '*' ? '[^/]*' : '[^/]'));
  return new RegExp(`^${re}$`);
}

function loadManifest(templateDir) {
  const raw = JSON.parse(fs.readFileSync(path.join(templateDir, ...MANIFEST_PATH.split('/')), 'utf-8'));
  const compiled = {};
  for (const cls of ['template', 'seeded', 'additive', 'user']) compiled[cls] = (raw[cls] || []).map(globToRegExp);
  const matches = (cls, rel) => compiled[cls].some((re) => re.test(rel));
  return {
    ...raw,
    matches,
    /** template | seeded | additive | user: `user` is the default for anything unlisted. */
    classOf(rel) {
      if (matches('user', rel)) return 'user';
      return ['seeded', 'additive', 'template'].find((cls) => matches(cls, rel)) || 'user';
    },
  };
}

// ─── The record: .atlas/installed.json ──────────────────────────────────────

/** The record as written, with every list a list of strings: a hand-edited file must not crash the reader. */
function readRecord(root, manifest) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(path.join(root, ...manifest.record.split('/')), 'utf-8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw new Error(`${manifest.record} is not valid JSON: ${err.message}`);
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${manifest.record} is not a JSON object`);
  const text = (v) => (typeof v === 'string' && v ? v : undefined);
  const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x) : []);
  const files = raw.files && typeof raw.files === 'object' && !Array.isArray(raw.files) ? raw.files : {};
  return {
    ...raw,
    version: text(raw.version),
    variant: text(raw.variant),
    partner: text(raw.partner) || '',
    pendingBase: text(raw.pendingBase),
    blocks: strings(raw.blocks),
    skills: strings(raw.skills),
    unsure: strings(raw.unsure),
    kept: strings(raw.kept).map((k) => k.replace(/\/+$/, '')).filter(Boolean), // "folder/" by hand means the folder
    files: Object.fromEntries(Object.entries(files).filter(([, h]) => typeof h === 'string')),
  };
}

function writeRecord(root, manifest, record) {
  const link = symlinkOn(root, manifest.record);
  if (link) throw new Error(`refusing to write ${manifest.record}: ${link} is a symlink, and the file behind it may be outside the workspace`);
  const file = path.join(root, ...manifest.record.split('/'));
  const files = Object.fromEntries(Object.entries(record.files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...record, files }, null, 2) + '\n');
}

module.exports = {
  VARIANTS,
  CLAUDE_DIRS,
  MANIFEST_PATH,
  BLOCK_RE,
  blockHashes,
  trustBlocks,
  symlinkOn,
  obstacle,
  walk,
  partnerize,
  renderTemplate,
  place,
  skillOf,
  isBinary,
  normalize,
  hash,
  globToRegExp,
  loadManifest,
  readRecord,
  writeRecord,
};
