// `swe-atlas update`: compare an installed workspace with the template in this
// package and recommend what to do with each path. The plan changes nothing;
// writing is a separate step (--apply, --take, --keep), and every write goes
// through guard(), which refuses any path the manifest calls the user's.
//
// Three hashes decide each file: mine (the workspace), theirs (this template),
// and base (what was installed, from .atlas/installed.json or --base <dir>).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const tpl = require('./template.js');

const PACKAGE_DIR = path.join(__dirname, '..', '..');
const atlas = require(path.join(PACKAGE_DIR, '.claude', 'scripts', 'lib', 'atlas.cjs'));
const ws = require(path.join(PACKAGE_DIR, '.claude', 'scripts', 'lib', 'workspace.cjs'));

const SAFE = new Set(['add', 'replace', 'remove', 'additive']);

const abs = (root, rel) => path.join(root, ...rel.split('/'));
const under = (prefix, rel) => rel === prefix || rel.startsWith(`${prefix.replace(/\/+$/, '')}/`);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function readOrNull(file) {
  try {
    return fs.statSync(file).isFile() ? fs.readFileSync(file) : null;
  } catch {
    return null;
  }
}

/** Variant and partner name: the record knows them; older installs are read off CLAUDE.md. */
function detectInstall(root, templateDir, record, opts) {
  const claude = (readOrNull(abs(root, 'CLAUDE.md')) || '').toString();
  const inferred = [];
  let variant = opts.variant || (record && record.variant);
  if (!variant) {
    variant = /^## Autonomy\s*$/m.test(claude) ? 'atlas-autonomous'
      : /^## Work Discipline\s*$/m.test(claude) || /I Am ATLAS/.test(claude) ? 'atlas-collaborative'
        : 'vanilla';
    // The headings alone are weak evidence (anyone's CLAUDE.md can have "## Work Discipline"):
    // an ATLAS flavor also has its identity docs.
    if (variant !== 'vanilla' && !fs.existsSync(abs(root, 'misc/self/atlas.md'))) variant = 'vanilla';
    inferred.push('variant');
  }
  let partner = opts.partner || (record && record.partner) || '';
  if (!partner && variant !== 'vanilla') {
    const source = (readOrNull(path.join(templateDir, 'claude_md_variants', `${variant}.md`)) || '').toString();
    for (const line of source.split('\n').filter((l) => l.includes('{{PARTNER_NAME}}'))) {
      const m = new RegExp(line.split('{{PARTNER_NAME}}').map(escapeRe).join('(.+?)')).exec(claude);
      if (m) {
        partner = m[1];
        inferred.push('partner');
        break;
      }
    }
  }
  return { variant, partner, inferred };
}

/**
 * Build the recommendation. Reads the workspace, writes nothing.
 * `additive` maps a path to (currentText|null) => { text, changed, note } for the
 * files that only ever gain lines (.gitignore, .gitattributes, settings.json).
 */
function plan(root, templateDir, opts = {}) {
  const manifest = tpl.loadManifest(templateDir);
  const pkg = JSON.parse(fs.readFileSync(path.join(templateDir, 'package.json'), 'utf-8'));
  const record = tpl.readRecord(root, manifest);
  const config = atlas.readConfig(root);
  tpl.trustBlocks(record && record.blocks);
  const install = detectInstall(root, templateDir, record, opts);
  const render = (dir) => {
    const files = tpl.renderTemplate(dir, { ...install, mode: config.mode, block: ws.workspaceBlock });
    for (const rel of [...files.keys()]) if (manifest.classOf(rel) === 'user') files.delete(rel);
    return files;
  };
  const next = render(templateDir);
  const base = opts.base ? render(path.resolve(opts.base)) : null;
  const recorded = (record && record.files) || {};
  const baseHash = (rel) => recorded[rel] || (base && base.has(rel) ? tpl.hash(rel, base.get(rel)) : undefined);

  const items = [];
  const available = new Set();
  const yours = [];
  const own = (shown) => !yours.includes(shown) && yours.push(shown);
  // Paths the user took over with --keep: no longer ATLAS's to remove or to add lines to.
  const keptPaths = (record && record.kept) || [];
  const isKept = (rel) => keptPaths.some((k) => under(k, rel));
  // A path reached through a symlink is left alone: the file behind it may be outside the workspace.
  const linked = (rel) => {
    const link = tpl.symlinkOn(root, rel);
    if (link) own(`${link}${link === rel ? '' : '/'}  (a symlink: left alone)`);
    return Boolean(link);
  };
  // So is a path that cannot hold the file: a folder of that name, or a file where a folder goes.
  const blocked = (rel) => {
    if (linked(rel)) return true;
    const o = tpl.obstacle(root, rel);
    if (o) own(`${o.at}  (${o.why}: left alone)`);
    return Boolean(o);
  };

  // A skill is installed when ATLAS put it there. The record says so, and so does a file in the
  // folder that is exactly the one this template or the base ships. A folder with a shipped
  // skill's name and neither proof is the user's own, and never written into. The one case that
  // stays open is a workspace from before the record (3.0.0): there nothing was ever recorded, so
  // such a folder is "unsure" until --base proves it, --take replaces it, or --keep claims it.
  const skillsDir = abs(root, '.claude/skills');
  const shippedHere = (name) => [...next, ...(base || [])].some(([rel, buf]) => {
    if (tpl.skillOf(rel) !== name) return false;
    const mine = readOrNull(abs(root, rel));
    return Boolean(mine) && tpl.hash(rel, mine) === tpl.hash(rel, buf);
  });
  const shippedNames = new Set([...next.keys(), ...(base ? base.keys() : [])].map(tpl.skillOf).filter(Boolean));
  // Asked of the disk by the shipped name, not matched against a listing: on a disk that ignores
  // case, the user's own Shadcn/ is where .claude/skills/shadcn/SKILL.md would be written.
  const isDir = (dir) => {
    try {
      return fs.lstatSync(dir).isDirectory(); // a link to a folder is refused by the symlink guard, by name
    } catch {
      return false;
    }
  };
  const folders = tpl.symlinkOn(root, '.claude/skills') ? [] : [...shippedNames].filter((name) => isDir(path.join(skillsDir, name)));
  const installedSkills = new Set(record ? [...Object.keys(recorded).map(tpl.skillOf).filter(Boolean), ...record.skills] : []);
  const unsure = new Set();
  const ownSkills = new Set();
  for (const name of folders.filter((n) => !installedSkills.has(n))) {
    if (isKept(`.claude/skills/${name}`)) ownSkills.add(name);
    else if (shippedHere(name)) installedSkills.add(name);
    else if (!record || record.unsure.includes(name)) unsure.add(name);
    else ownSkills.add(name);
  }

  for (const [rel, buf] of next) {
    if (blocked(rel)) continue;
    const skill = tpl.skillOf(rel);
    if (skill && !installedSkills.has(skill)) {
      if (!unsure.has(skill) && !ownSkills.has(skill)) available.add(skill);
      continue;
    }
    const mine = readOrNull(abs(root, rel));
    const t = tpl.hash(rel, buf);
    const b = baseHash(rel);
    const i = mine && tpl.hash(rel, mine);
    let action;
    if (!mine) action = b ? 'deleted' : 'add';
    else if (i === t) action = 'current';
    else if (!b) action = 'review';
    else if (i === b) action = 'replace';
    else if (t === b) action = 'keep';
    else action = 'merge';
    items.push({ path: rel, class: manifest.classOf(rel), action, theirs: t, base: b });
  }

  // Paths an earlier ATLAS shipped and a later one dropped. Only a file whose baseline hash
  // still matches is ATLAS's to remove. With no baseline for it, it may be the user's own file
  // that happens to sit at that path, so it is shown and left where it is.
  const dropped = manifest.removed || [];
  for (const r of dropped) {
    if (linked(r.path)) continue;
    let stat;
    try {
      stat = fs.lstatSync(abs(root, r.path));
    } catch {
      continue;
    }
    for (const rel of stat.isDirectory() ? tpl.walk(abs(root, r.path)).map((sub) => `${r.path}/${sub}`) : [r.path]) {
      if (isKept(rel)) {
        own(rel);
        continue;
      }
      const b = baseHash(rel);
      const same = Boolean(b) && tpl.hash(rel, fs.readFileSync(abs(root, rel))) === b;
      const why = same ? '' : b ? '; you edited it' : '; nothing records that ATLAS installed this one';
      items.push({ path: rel, class: 'template', action: same ? 'remove' : 'review-removed', base: b, note: `dropped in ${r.since}: ${r.note}${why}` });
    }
  }
  // Files in template-managed folders that this template does not ship: dropped
  // by the template (the baseline knew them) or added by the user (it did not).
  for (const dir of [...tpl.CLAUDE_DIRS.map((d) => `.claude/${d}`), 'misc/archive']) {
    if (linked(dir)) continue; // the walk would follow the link and list files that are not here
    for (const sub of tpl.walk(abs(root, dir))) {
      const rel = `${dir}/${sub}`;
      const skill = tpl.skillOf(rel);
      if (skill && unsure.has(skill)) continue; // reported in its own group
      if (skill && !installedSkills.has(skill)) {
        own(`.claude/skills/${skill}/`); // a folder of the user's own that shares a shipped skill's name
        continue;
      }
      if (next.has(rel) || dropped.some((r) => under(r.path, rel))) continue;
      const b = baseHash(rel);
      if (manifest.classOf(rel) === 'user' || !b || isKept(rel)) {
        own(rel); // the file, not its folder: the skill around it is installed and still updated
        continue;
      }
      const same = tpl.hash(rel, fs.readFileSync(abs(root, rel))) === b;
      items.push({ path: rel, class: 'template', action: same ? 'remove' : 'review-removed', base: b, note: same ? 'no longer shipped' : 'no longer shipped, and you edited it' });
    }
  }

  for (const [rel, fn] of Object.entries(opts.additive || {})) {
    if (blocked(rel)) continue;
    if (isKept(rel)) {
      own(`${rel}  (kept as yours: ATLAS lines are no longer offered; the "kept" list in ${manifest.record} undoes that)`);
      continue;
    }
    const current = readOrNull(abs(root, rel));
    const result = fn(current && current.toString('utf-8'), config.mode);
    if (result.changed) items.push({ path: rel, class: 'additive', action: 'additive', note: result.note, text: result.text });
  }

  return {
    root,
    from: (record && record.version) || config.version || 'unknown',
    to: pkg.version,
    mode: config.mode,
    ...install,
    baseline: record ? 'recorded' : base ? 'base' : 'none',
    // the version whose files a pending merge or look is based on; --base needs that one
    pendingBase: (record && record.pendingBase) || null,
    hasBase: Boolean(base),
    items: items.sort((a, b) => (a.path < b.path ? -1 : 1)),
    skills: [...installedSkills].sort(),
    unsure: [...unsure].sort(),
    available: [...available].sort(),
    yours: yours.sort(),
    owned: ownedPaths(root, manifest, config),
    structure: structureNotes(root, manifest, config, record),
    // not serialized: what apply() and stage() need
    internal: { manifest, record, next, base, config, templateDir, installedSkills, ownSkills },
  };
}

/**
 * The "never touched" list for the report. The user's files inside an installed skill are listed
 * one by one, until a folder of them (node_modules, a cache) would bury the rest: then it is one line.
 */
function foldOwned(paths, limit = 8) {
  const folderOf = (rel) => (tpl.skillOf(rel) && !rel.endsWith('/') ? rel.split('/').slice(0, Math.min(4, rel.split('/').length - 1)).join('/') : null);
  const sizes = new Map();
  for (const rel of paths) if (folderOf(rel)) sizes.set(folderOf(rel), (sizes.get(folderOf(rel)) || 0) + 1);
  const out = [];
  for (const rel of paths) {
    const folder = folderOf(rel);
    if (!folder || sizes.get(folder) <= limit) out.push(rel);
    else if (!out.includes(`${folder}/  (${sizes.get(folder)} files of yours)`)) out.push(`${folder}/  (${sizes.get(folder)} files of yours)`);
  }
  return out;
}

/** The user-owned paths that exist here, read off the manifest so the report and the guard agree. */
function ownedPaths(root, manifest, config) {
  const out = [];
  for (const pattern of manifest.user) {
    const literal = pattern.replace(/\/\*\*$/, '');
    if (/[*?]/.test(literal) || !fs.existsSync(abs(root, literal))) continue;
    const isDir = fs.statSync(abs(root, literal)).isDirectory();
    const count = literal === 'projects' && config.mode === 'multi' ? ` (${atlas.listProjects(root).length} projects)` : '';
    out.push(`${literal}${isDir ? '/' : ''}${count}`);
  }
  return out;
}

/** What this version expects of the layout. Reported, never applied: moving a user's files is theirs to approve. */
function structureNotes(root, manifest, config, record) {
  const notes = [];
  const missing = (rel, why) => !fs.existsSync(abs(root, rel)) && notes.push({ path: rel, note: why });
  if (!record) notes.push({ path: manifest.record, note: 'no install record yet; --apply writes it, so later updates can tell your edits from template changes' });
  for (const m of manifest.moves || []) {
    if (fs.existsSync(abs(root, m.from))) notes.push({ path: m.from, note: `since ${m.since} this lives at ${m.to}: ${m.note}` });
  }
  if (config.mode === 'multi') {
    missing('index.md', 'multi mode expects the project registry (node .claude/scripts/project.cjs status rebuilds it)');
    missing('general', 'multi mode expects general/ for work that belongs to no project');
    for (const name of atlas.listProjects(root)) {
      missing(`projects/${name}/CLAUDE.md`, 'every project has a map');
      missing(`projects/${name}/STATUS.md`, 'every project has a status');
    }
  } else {
    missing('PROJECT.md', `${config.mode} mode expects the project map (/atlas:get-to-know writes it)`);
    missing('STATUS.md', `${config.mode} mode expects the project status`);
  }
  return notes;
}

// ─── Writing ────────────────────────────────────────────────────────────────

function guard(p, rel) {
  const { manifest } = p.internal;
  if (rel.split('/').includes('..') || path.isAbsolute(rel)) throw new Error(`refusing a path outside the workspace: ${rel}`);
  if (rel !== manifest.record && manifest.classOf(rel) === 'user') throw new Error(`refusing to write ${rel}: the manifest says it is yours`);
  const o = tpl.obstacle(p.root, rel);
  if (o) throw new Error(`refusing to touch ${rel}: ${o.at} is ${o.why}${o.why === 'a symlink' ? ', and the file behind it may be outside the workspace' : ''}`);
}

function write(p, rel, content) {
  guard(p, rel);
  tpl.place(p.root, rel, Buffer.from(content), p.internal.templateDir);
}

/** After a file is removed, drop the folders it leaves empty (never one that still holds anything). */
function pruneEmptyDirs(root, rel) {
  for (let dir = path.posix.dirname(rel); dir && dir !== '.'; dir = path.posix.dirname(dir)) {
    try {
      fs.rmdirSync(abs(root, dir));
    } catch {
      return;
    }
  }
}

/**
 * safe: apply every add / replace / remove / additive item.
 * take: paths (or folders) to overwrite with the template's version, whatever their state.
 * keep: paths (or folders) to mark as reconciled: yours stays, and stops being reported.
 * Everything is decided and every path checked before the first write, so a refusal leaves
 * the workspace as it was.
 */
function apply(p, { safe = false, take = [], keep = [] } = {}) {
  const { manifest, record, next, config, installedSkills, ownSkills } = p.internal;
  const files = { ...((record && record.files) || {}) };
  const keptPaths = new Set((record && record.kept) || []);
  const skills = new Set([...installedSkills].filter((s) => [...next.keys()].some((rel) => tpl.skillOf(rel) === s)));
  const unsure = new Set(p.unsure);
  const done = { written: [], removed: [], kept: [] };
  const clean = (list) => list.map((x) => x.split(path.sep).join('/').replace(/^\.\//, '').replace(/\/+$/, ''));
  take = clean(take);
  keep = clean(keep);

  guard(p, manifest.record);
  const taking = [];
  for (const prefix of take) {
    const matched = [...next.keys()].filter((rel) => under(prefix, rel));
    if (!matched.length) throw new Error(`--take ${prefix}: this template ships nothing there`);
    for (const rel of matched) {
      const skill = tpl.skillOf(rel);
      if (skill && ownSkills.has(skill)) {
        throw new Error(`--take ${prefix}: .claude/skills/${skill}/ is a folder of your own that shares a shipped skill's name. Move it aside first, then take the skill.`);
      }
      guard(p, rel);
    }
    taking.push(...matched);
  }
  const claimed = [...unsure].filter((s) => keep.some((prefix) => under(prefix, `.claude/skills/${s}`)));
  // --keep settles a file that is here. One that is up to date has nothing to settle, and one that
  // is not here (new in this version, or deleted) is not the user's to keep: marking a new file
  // "kept" under --keep <folder> would report it as deleted by them from then on.
  const keepable = (item) => !['current', 'add', 'deleted'].includes(item.action);
  for (const prefix of keep) {
    const waiting = p.items.some((i) => keepable(i) && under(prefix, i.path)) || claimed.some((s) => under(prefix, `.claude/skills/${s}`));
    if (!waiting) throw new Error(`--keep ${prefix}: nothing there is waiting on a decision (what the report lists under "Never touched" is already yours, and a file that is not here cannot be kept)`);
  }
  const decide = (item) => {
    if (taking.includes(item.path)) return 'taken';
    if (item.action === 'current') return 'current'; // nothing to settle, under --keep <folder> too
    const kept = keepable(item) && keep.some((prefix) => under(prefix, item.path));
    // --keep wins over every removal and every added line: from here on the path is the user's
    if (kept && ['remove', 'review-removed', 'additive'].includes(item.action)) return 'own';
    if (kept && item.theirs) return 'reconciled';
    if (safe && SAFE.has(item.action)) return item.action === 'remove' ? 'remove' : 'write';
    return item.base ? 'base' : 'none';
  };
  const decisions = p.items.map((item) => [item, decide(item)]);
  for (const [item, d] of decisions) if (d === 'remove' || d === 'write') guard(p, item.path);

  for (const rel of taking) {
    write(p, rel, next.get(rel));
    files[rel] = tpl.hash(rel, next.get(rel));
    if (tpl.skillOf(rel)) {
      skills.add(tpl.skillOf(rel));
      unsure.delete(tpl.skillOf(rel));
    }
    done.written.push(rel);
  }
  for (const skill of claimed.filter((s) => unsure.has(s))) {
    unsure.delete(skill);
    keptPaths.add(`.claude/skills/${skill}`);
    done.kept.push(`.claude/skills/${skill}/`);
  }
  for (const [item, d] of decisions) {
    if (d === 'own') {
      delete files[item.path];
      keptPaths.add(item.path);
      done.kept.push(item.path);
    } else if (d === 'reconciled') {
      files[item.path] = item.theirs;
      done.kept.push(item.path);
    } else if (d === 'remove') {
      fs.rmSync(abs(p.root, item.path), { force: true });
      pruneEmptyDirs(p.root, item.path);
      delete files[item.path];
      done.removed.push(item.path);
    } else if (d === 'write') {
      write(p, item.path, item.action === 'additive' ? item.text : next.get(item.path));
      if (item.theirs) files[item.path] = item.theirs;
      done.written.push(item.path);
    } else if (d === 'current') {
      files[item.path] = item.theirs;
    } else if (d === 'base') {
      files[item.path] = item.base; // remember a --base baseline, so the next update needs no --base
    }
  }

  const open = p.items.filter((i) => ['merge', 'review', 'review-removed'].includes(i.action)
    && !done.written.includes(i.path) && !done.kept.includes(i.path));
  // While a merge, a look or an unsure skill is still open, remember which version it came
  // from: settling it needs that package as --base, and `version` has moved on by then.
  const from = (record && record.version) || config.version;
  const waiting = open.some((i) => i.action !== 'review-removed') || unsure.size > 0;
  const pendingBase = waiting ? p.pendingBase || (from && from !== p.to ? from : undefined) : undefined;
  tpl.writeRecord(p.root, manifest, {
    version: safe ? p.to : from || p.to,
    variant: p.variant,
    partner: p.partner,
    ...(pendingBase ? { pendingBase } : {}),
    blocks: [...new Set([...((record && record.blocks) || []), ...tpl.blockHashes(ws.workspaceBlock)])].sort(),
    skills: [...skills].sort(),
    ...(unsure.size ? { unsure: [...unsure].sort() } : {}),
    kept: [...keptPaths].sort(),
    files,
  });
  return { ...done, pending: open.length + unsure.size };
}

/**
 * Write the template's version of every file that needs a human decision into
 * <dir>/new, the baseline into <dir>/base when it is known, and a three-way merge
 * into <dir>/merged, so they can be compared with ordinary tools.
 */
function stage(p, dir) {
  const { next, base } = p.internal;
  const out = [];
  // <dir>/new/CLAUDE.md must never be the workspace's own CLAUDE.md (`--stage ..` from a folder named "new")
  const real = (d) => {
    try {
      return fs.realpathSync.native(d);
    } catch {
      return path.resolve(d);
    }
  };
  for (const kind of ['new', 'base', 'merged']) {
    // resolved again with the kind on it: on a disk that ignores case, <dir>/new is also <dir>/New
    const target = real(path.join(real(dir), kind));
    const rootReal = real(p.root);
    const holds = rootReal === target || rootReal.startsWith(target + path.sep);
    if (holds || rootReal.toLowerCase() === target.toLowerCase()) {
      throw new Error(`--stage ${dir}: its ${kind}/ folder is this workspace or holds it, so staging there would overwrite workspace files. Pick another folder.`);
    }
  }
  // Nor may a link inside the stage folder lead a write somewhere else (<dir>/new -> the workspace).
  const staging = p.items.filter((i) => ['merge', 'review', 'keep', 'review-removed'].includes(i.action));
  for (const kind of ['new', 'base', 'merged']) {
    for (const item of staging) {
      const link = tpl.symlinkOn(dir, `${kind}/${item.path}`);
      if (link) throw new Error(`--stage ${dir}: ${link} in it is a symlink, so staging would write wherever it points. Pick another folder.`);
    }
  }
  const put = (kind, rel, buf) => {
    const file = path.join(dir, kind, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, buf);
    return file;
  };
  for (const item of staging) {
    const entry = { path: item.path, action: item.action };
    if (next.has(item.path)) entry.new = put('new', item.path, next.get(item.path));
    if (base && base.has(item.path)) entry.base = put('base', item.path, base.get(item.path));
    if (entry.new && entry.base && !tpl.isBinary(next.get(item.path))) {
      const r = spawnSync('git', ['merge-file', '-p', '--diff3', '-L', 'yours', '-L', 'installed', '-L', 'template',
        abs(p.root, item.path), entry.base, entry.new], { encoding: 'buffer' });
      // exit status is the number of conflicts; 255 (or no status) means git could not merge
      if (r.status !== null && r.status < 128 && r.stdout) {
        entry.merged = put('merged', item.path, r.stdout);
        entry.conflicts = r.status;
      }
    }
    out.push(entry);
  }
  return out;
}

/** The version to unpack for --base when files are waiting on a comparison, or null. */
function baseToFetch(p) {
  if (p.hasBase) return null;
  const waiting = p.items.some((i) => ['merge', 'review'].includes(i.action)) || p.unsure.length > 0;
  if (!waiting) return null;
  const version = p.pendingBase || (p.baseline === 'none' ? p.from : null);
  return version && version !== 'unknown' ? version : null;
}

// ─── Report ─────────────────────────────────────────────────────────────────

const SECTIONS = [
  ['replace', 'Safe to replace', 'the template changed these and you never edited them'],
  ['add', 'New in this version', 'not in your workspace yet'],
  ['additive', 'Lines to add', 'your content stays; missing ATLAS lines are appended'],
  ['remove', 'Safe to remove', 'the template no longer ships these, and they carry no edit of yours'],
  ['merge', 'Needs a merge', 'you edited these and the template changed them too'],
  ['review', 'Needs a look', 'differs from the template, and there is no baseline to say who changed it'],
  ['review-removed', 'Dropped by the template, left for you', 'edited by you, or never recorded as installed by ATLAS: --keep <path> makes it yours, or delete it yourself'],
  ['keep', 'Your edits, kept', 'the template did not change these'],
  ['deleted', 'Deleted by you, left deleted', 'the template still ships these; --take <path> restores one'],
];

function listing(items) {
  const byDir = new Map();
  for (const item of items) {
    const dir = item.path.includes('/') ? item.path.slice(0, item.path.lastIndexOf('/') + 1) : './';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(item);
  }
  const lines = [];
  for (const [dir, list] of byDir) {
    lines.push(`  ${dir}  (${list.length})`);
    for (const item of list.slice(0, 6)) lines.push(`    ${item.path.slice(dir === './' ? 0 : dir.length)}${item.note ? `  — ${item.note}` : ''}`);
    if (list.length > 6) lines.push(`    … and ${list.length - 6} more (--json lists every file)`);
  }
  return lines;
}

function format(p) {
  const lines = [`ATLAS update: ${p.from} -> ${p.to}`, `workspace: ${p.root}`];
  const tag = (key) => (p.inferred.includes(key) ? ' (read from CLAUDE.md)' : '');
  lines.push(`mode ${p.mode}, flavor ${p.variant}${tag('variant')}${p.variant === 'vanilla' ? '' : `, partner ${p.partner || '?'}${tag('partner')}`}`);
  if (p.variant !== 'vanilla' && !p.partner) lines.push('partner name not found: pass --partner <name>, or CLAUDE.md will show a {{PARTNER_NAME}} difference');
  if (p.baseline === 'none') {
    lines.push(`baseline: none recorded. Every differing file lands under "Needs a look". Unpack swe-atlas@${p.from} and pass --base <dir> to tell your edits from template changes.`);
  } else {
    lines.push(`baseline: ${p.baseline === 'recorded' ? `.atlas/installed.json${p.hasBase ? ', and --base for the files it does not list' : ''}` : '--base (the installed version)'}`);
    const fetch = baseToFetch(p);
    if (fetch) lines.push(`Files below still wait on the update that started from ${fetch}. Unpack swe-atlas@${fetch} and pass --base <dir> to compare or merge them.`);
  }

  const count = (action) => p.items.filter((i) => i.action === action).length;
  for (const [action, title, why] of SECTIONS) {
    const list = p.items.filter((i) => i.action === action);
    if (!list.length) continue;
    lines.push('', `${title} (${list.length}): ${why}`, ...listing(list));
  }
  if (p.unsure.length) {
    const fetch = baseToFetch(p);
    lines.push('', `Has a shipped skill's name, origin unknown (${p.unsure.length}): nothing records who put these here, and no file in them matches a shipped one. Left alone until you say`);
    for (const name of p.unsure) lines.push(`  .claude/skills/${name}/`);
    const prove = p.hasBase ? 'the --base you passed has no file that matches either, so it is probably yours'
      : `${fetch ? `unpack swe-atlas@${fetch} and pass --base <dir>` : 'pass --base <the package you installed>'}, and it is updated like the rest`;
    lines.push(`    ATLAS installed it: ${prove}`);
    lines.push('    --take .claude/skills/<name> replaces its files with this template\'s; --keep .claude/skills/<name> marks it as yours');
  }
  lines.push('', `Up to date: ${count('current')} files`);
  if (p.available.length) lines.push(`Skills you have not installed: ${p.available.join(', ')}  (--take .claude/skills/<name> adds one)`);
  lines.push('', 'Never touched (yours):');
  for (const rel of foldOwned([...p.owned, ...p.yours])) lines.push(`  ${rel}`);
  lines.push('  …and everything else the template does not ship');
  if (p.structure.length) {
    lines.push('', 'Structure this version expects:');
    for (const s of p.structure) lines.push(`  ${s.path}  — ${s.note}`);
  }
  return lines.join('\n');
}

function toJSON(p) {
  const { internal, items, ...rest } = p;
  return { ...rest, items: items.map(({ text, theirs, base, ...item }) => item) };
}

module.exports = { plan, apply, stage, format, toJSON, detectInstall, baseToFetch, pruneEmptyDirs, SAFE };
