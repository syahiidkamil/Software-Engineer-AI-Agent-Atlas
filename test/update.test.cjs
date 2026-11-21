// `swe-atlas update`: the recommendation, what --apply may write, and the line it
// may never cross. A template change is simulated from the workspace side: put
// older content in a file and record that content's hash as the baseline, which
// is exactly the state a workspace installed from an older package is in.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { REPO, tempDir, write, read, exists, cli, scaffold } = require('./helpers.cjs');
const tpl = require('../bin/lib/template.js');
const updater = require('../bin/lib/update.js');
const installer = require('../bin/install.js');
const ws = require('../.claude/scripts/lib/workspace.cjs');

const RECORD = '.atlas/installed.json';
const COMMIT = '.claude/commands/git/commit.md';
const LOG = '.claude/commands/git/log.md';
const MODE = '.claude/commands/atlas/mode.md';
const AGENT = '.claude/agents/commit.md';
const manifest = tpl.loadManifest(REPO);

// answers: flavor, partner, mode, project, stage, browser, [profile], skills, compact, advisor, [file], commit
const multi = () => scaffold(['3', 'Ada', '3', 'shop', '2', '1', '', '3', '1', 'n']).dir;

function plan(dir, ...args) {
  const r = cli(['update', dir, '--json', ...args]);
  assert.equal(r.status, 0, r.out + r.err);
  return JSON.parse(r.out);
}

const actionOf = (p, rel) => (p.items.find((i) => i.path === rel) || {}).action;
const record = (dir) => JSON.parse(read(dir, RECORD));
const saveRecord = (dir, rec) => write(dir, RECORD, JSON.stringify(rec, null, 2));

/** Pretend `rel` was installed from an older package that shipped `content`. */
function installedAs(dir, rel, content) {
  const rec = record(dir);
  rec.files[rel] = tpl.hash(rel, Buffer.from(content));
  saveRecord(dir, rec);
}

/** Every file in the workspace with a hash of its bytes, minus git internals. */
function snapshot(dir) {
  const out = {};
  for (const rel of tpl.walk(dir)) {
    if (rel.startsWith('.git/')) continue;
    out[rel] = crypto.createHash('sha256').update(fs.readFileSync(path.join(dir, rel))).digest('hex');
  }
  return out;
}

function changed(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((rel) => before[rel] !== after[rel]).sort();
}

/**
 * One workspace holding every case the plan has to tell apart.
 * Returns the paths that belong to the user, to check they survive.
 */
function mixedWorkspace() {
  const dir = multi();
  // the template changed it, the user did not
  write(dir, COMMIT, 'the 3.0.0 text of this command\n');
  installedAs(dir, COMMIT, 'the 3.0.0 text of this command\n');
  // the user changed it, the template did not
  write(dir, LOG, read(dir, LOG) + '\nmy own extra rule\n');
  // both changed it
  write(dir, MODE, 'older text, then edited by me\n');
  installedAs(dir, MODE, 'older text\n');
  // new in this version
  fs.rmSync(path.join(dir, AGENT));
  const rec = record(dir);
  delete rec.files[AGENT];
  // dropped by this version, untouched; and dropped but edited
  write(dir, '.claude/commands/old/gone.md', 'retired\n');
  rec.files['.claude/commands/old/gone.md'] = tpl.hash('x', Buffer.from('retired\n'));
  write(dir, '.claude/commands/old/tuned.md', 'retired, but I rewrote it\n');
  rec.files['.claude/commands/old/tuned.md'] = tpl.hash('x', Buffer.from('retired\n'));
  saveRecord(dir, rec);
  // on the manifest's removed list: one the baseline knows (ATLAS's to remove), one it does not
  write(dir, '.claude/agents/code-explorer.md', 'the agent 2.6 shipped\n');
  installedAs(dir, '.claude/agents/code-explorer.md', 'the agent 2.6 shipped\n');
  write(dir, '.claude/hooks/task-complete.cjs', '// could be from 2.6, could be mine\n');
  // deleted by the user on purpose
  fs.rmSync(path.join(dir, '.claude/commands/git/stage-commit.md'));
  // the user's own
  const mine = {
    'NOTES.md': '# my notes\n',
    'projects/shop/CLAUDE.md': '# shop, as I wrote it\n',
    'projects/shop/STATUS.md': 'Now: shipping\n',
    'projects/shop/docs/decision_logs/2026-01-01-db.md': 'postgres\n',
    'projects/shop/.env.example': 'API_KEY=\n',
    'general/scratch.md': 'notes\n',
    '.claude/skills/mine/SKILL.md': '---\nname: mine\ndescription: my skill\n---\n',
    '.claude/commands/team/standup.md': '---\ndescription: mine\n---\n',
    '.claude/rules/design/shop.md': '---\npaths:\n  - "**/*.tsx"\n---\n',
    '.claude/settings.local.json': read(dir, '.claude/settings.local.json'),
    '.atlas/config.json': read(dir, '.atlas/config.json'),
    'index.md': read(dir, 'index.md'),
  };
  for (const [rel, content] of Object.entries(mine)) write(dir, rel, content);
  // additive files that lost an ATLAS line and carry lines of the user's own
  write(dir, '.gitignore', 'node_modules/\n');
  write(dir, '.claude/settings.json', JSON.stringify({ model: 'opus', permissions: { deny: ['Bash(rm -rf:*)'] } }));
  return { dir, mine };
}

test('update: a fresh scaffold records its baseline and has nothing to update', () => {
  const dir = multi();
  const rec = record(dir);
  assert.deepEqual([rec.version, rec.variant, rec.partner], [require('../package.json').version, 'atlas-collaborative', 'Ada']);
  assert.ok(rec.files['CLAUDE.md'] && rec.files[COMMIT] && rec.files['misc/self/atlas.md']);
  assert.ok(!Object.keys(rec.files).some((rel) => manifest.classOf(rel) === 'user'), 'the record lists only template files');
  const before = snapshot(dir);
  const p = plan(dir);
  assert.deepEqual(changed(before, snapshot(dir)), [], 'a plan writes nothing');
  assert.equal(p.baseline, 'recorded');
  assert.deepEqual(p.inferred, []);
  assert.deepEqual([...new Set(p.items.map((i) => i.action))], ['current']);
  assert.deepEqual(p.structure, []);
  assert.ok(p.available.includes('shadcn'), 'skills that were not installed are offered, not added');
  assert.ok(p.owned.includes('projects/ (1 projects)') && p.owned.includes('NOTES.md'));
});

test('update: the plan sorts every file by who changed it', () => {
  const { dir } = mixedWorkspace();
  const before = snapshot(dir);
  const p = plan(dir);
  assert.deepEqual(changed(before, snapshot(dir)), [], 'a plan writes nothing');
  assert.equal(actionOf(p, COMMIT), 'replace');
  assert.equal(actionOf(p, LOG), 'keep');
  assert.equal(actionOf(p, MODE), 'merge');
  assert.equal(actionOf(p, AGENT), 'add');
  assert.equal(actionOf(p, '.claude/commands/old/gone.md'), 'remove');
  assert.equal(actionOf(p, '.claude/commands/old/tuned.md'), 'review-removed');
  assert.equal(actionOf(p, '.claude/agents/code-explorer.md'), 'remove');
  assert.equal(actionOf(p, '.claude/hooks/task-complete.cjs'), 'review-removed', 'no baseline for it: it may be the user\'s own file');
  assert.equal(actionOf(p, '.claude/commands/git/stage-commit.md'), 'deleted');
  assert.equal(actionOf(p, '.gitignore'), 'additive');
  assert.equal(actionOf(p, '.claude/settings.json'), 'additive');
  assert.deepEqual(p.yours, ['.claude/commands/team/standup.md', '.claude/rules/design/shop.md', '.claude/skills/mine/']);
  for (const rel of ['NOTES.md', 'index.md', 'projects/shop/CLAUDE.md', '.atlas/config.json', '.claude/settings.local.json']) {
    assert.equal(actionOf(p, rel), undefined, `${rel} is the user's and never appears as an item`);
  }

  const text = cli(['update', dir]).out;
  for (const heading of ['Safe to replace (1)', 'New in this version (1)', 'Safe to remove (2)', 'Needs a merge (1)', 'Your edits, kept (1)', 'Never touched (yours):', 'Nothing was changed.']) {
    assert.ok(text.includes(heading), `report misses "${heading}"\n${text}`);
  }
  assert.ok(text.includes('.claude/skills/mine/') && text.includes('projects/ (1 projects)'));
});

test('update --apply: writes the safe items, leaves edits and everything of the user\'s alone', () => {
  const { dir, mine } = mixedWorkspace();
  const before = snapshot(dir);
  const r = cli(['update', dir, '--apply']);
  assert.equal(r.status, 0, r.out + r.err);
  assert.match(r.out, /Applied: 4 written, 2 removed, 0 kept as yours\. 3 still need a decision\./);

  const touched = changed(before, snapshot(dir));
  assert.deepEqual(touched, [
    '.atlas/installed.json', AGENT, '.claude/commands/git/commit.md', '.claude/commands/old/gone.md',
    '.claude/agents/code-explorer.md', '.claude/settings.json', '.gitignore',
  ].sort());
  for (const rel of touched) assert.notEqual(manifest.classOf(rel) === 'user' && rel !== RECORD, true, `${rel} is the user's`);
  for (const [rel, content] of Object.entries(mine)) assert.equal(read(dir, rel), content, `${rel} changed`);

  assert.equal(read(dir, COMMIT), fs.readFileSync(path.join(REPO, COMMIT), 'utf-8'));
  assert.ok(exists(dir, AGENT) && !exists(dir, '.claude/commands/old/gone.md') && !exists(dir, '.claude/agents/code-explorer.md'));
  assert.ok(exists(dir, '.claude/hooks/task-complete.cjs'), 'a dropped path with no baseline is left where it is');
  assert.equal(read(dir, MODE), 'older text, then edited by me\n', 'a file that needs a merge is not overwritten');
  assert.ok(exists(dir, '.claude/commands/old/tuned.md'), 'a dropped file the user edited is kept');
  assert.ok(!exists(dir, '.claude/commands/git/stage-commit.md'), 'a file the user deleted is not brought back');
  assert.match(read(dir, '.gitignore'), /^node_modules\/\n[\s\S]*\.atlas\/secrets\//);
  const shared = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(shared.model, 'opus');
  assert.ok(shared.permissions.deny.includes('Bash(rm -rf:*)') && shared.permissions.deny.includes('Read(/.atlas/secrets/**)'));

  const again = plan(dir);
  const left = again.items.filter((i) => i.action !== 'current').map((i) => [i.path, i.action]);
  assert.deepEqual(left, [
    ['.claude/commands/atlas/mode.md', 'merge'], ['.claude/commands/git/log.md', 'keep'],
    ['.claude/commands/git/stage-commit.md', 'deleted'], ['.claude/commands/old/tuned.md', 'review-removed'],
    ['.claude/hooks/task-complete.cjs', 'review-removed'],
  ], 'a pending merge survives --apply instead of being forgotten');
});

test('update --take and --keep settle one path at a time', () => {
  const { dir } = mixedWorkspace();
  const r = cli(['update', dir, '--take', MODE, '--keep', '.claude/commands/old', '--take', '.claude/skills/shadcn', '--take', '.claude/commands/git/stage-commit.md']);
  assert.equal(r.status, 0, r.out + r.err);
  assert.equal(read(dir, MODE), fs.readFileSync(path.join(REPO, MODE), 'utf-8'));
  assert.ok(exists(dir, '.claude/skills/shadcn/SKILL.md'), '--take installs a skill');
  assert.ok(exists(dir, '.claude/commands/git/stage-commit.md'), '--take restores a deleted file');
  assert.equal(read(dir, COMMIT), 'the 3.0.0 text of this command\n', 'without --apply the safe items wait');
  const p = plan(dir);
  assert.equal(actionOf(p, MODE), 'current');
  assert.equal(actionOf(p, '.claude/commands/old/tuned.md'), undefined);
  assert.ok(p.yours.includes('.claude/commands/old/tuned.md'), 'a kept dropped file becomes the user\'s own');
  assert.ok(!p.available.includes('shadcn'));
  assert.equal(actionOf(p, COMMIT), 'replace');

  const kept = cli(['update', dir, '--keep', LOG]);
  assert.equal(kept.status, 0, kept.out + kept.err);
  assert.match(read(dir, LOG), /my own extra rule/);

  const before = snapshot(dir);
  const refused = cli(['update', dir, '--take', 'NOTES.md']);
  assert.equal(refused.status, 1);
  assert.match(refused.err, /ships nothing there/);
  assert.deepEqual(changed(before, snapshot(dir)), [], 'a refused --take changes nothing');
});

test('update: no write can reach a path the manifest calls the user\'s', () => {
  const { dir, mine } = mixedWorkspace();
  for (const rel of ['NOTES.md', 'projects/shop/CLAUDE.md', 'projects/shop/.env', '.atlas/secrets/global.env', '.atlas/config.json', 'index.md', '../outside.md']) {
    const p = updater.plan(dir, REPO, { additive: installer.additiveMergers() });
    p.items.push({ path: rel, class: 'template', action: 'replace', theirs: 'x' });
    p.internal.next.set(rel, Buffer.from('overwritten'));
    assert.throws(() => updater.apply(p, { safe: true }), rel.startsWith('..') ? /outside the workspace/ : /the manifest says it is yours/, rel);
  }
  for (const rel of ['NOTES.md', 'projects/shop/CLAUDE.md']) assert.equal(read(dir, rel), mine[rel]);
  assert.ok(!exists(dir, 'projects/shop/.env') && !exists(dir, '.atlas/secrets/global.env'));
});

test('manifest: everything the template ships has an owner, and none of it is the user\'s', () => {
  for (const cls of ['template', 'seeded', 'additive', 'user']) assert.ok(Array.isArray(manifest[cls]) && manifest[cls].length, cls);
  assert.equal(manifest.record, RECORD);
  for (const variant of tpl.VARIANTS) {
    for (const mode of ['repo', 'project', 'multi']) {
      const files = tpl.renderTemplate(REPO, { variant, partner: 'Ada', mode, block: ws.workspaceBlock });
      assert.ok(files.has('CLAUDE.md') && files.has(tpl.MANIFEST_PATH));
      for (const rel of files.keys()) assert.notEqual(manifest.classOf(rel), 'user', `${rel} is shipped but classified as the user's`);
    }
  }
  for (const rel of ['NOTES.md', 'index.md', 'PROJECT.md', 'projects/a/CLAUDE.md', 'projects/a/repos/api/src/x.ts', 'repos/api/.env', '.env.production',
    '.atlas/secrets/a.env', '.atlas/config.json', '.claude/settings.local.json', '.claude/rules/design/a.md', 'docs/decision_logs/x.md',
    '.mcp.json', 'something/i/made.txt', '.claude/unknown/file.md']) {
    assert.equal(manifest.classOf(rel), 'user', rel);
  }
  for (const rel of Object.keys(installer.additiveMergers())) assert.equal(manifest.classOf(rel), 'additive', rel);
  const pkg = require('../package.json');
  for (const dir of tpl.CLAUDE_DIRS) assert.ok(pkg.files.includes(`.claude/${dir}/`), `package.json files misses .claude/${dir}/`);
  assert.ok(pkg.files.includes(tpl.MANIFEST_PATH) && pkg.files.includes('bin/'));
  for (const r of manifest.removed) assert.ok(!fs.existsSync(path.join(REPO, ...r.path.split('/'))), `${r.path} is listed as removed but still shipped`);
});

test('update: a workspace from before the record (3.0.0) is read off its CLAUDE.md, and --base tells edits from template changes', () => {
  const dir = multi();
  fs.rmSync(path.join(dir, RECORD));
  write(dir, '.atlas/config.json', JSON.stringify({ mode: 'multi', version: '3.0.0' }));
  write(dir, LOG, read(dir, LOG) + '\nmy own extra rule\n');

  const blind = plan(dir);
  assert.deepEqual([blind.from, blind.baseline, blind.variant, blind.partner], ['3.0.0', 'none', 'atlas-collaborative', 'Ada']);
  assert.deepEqual(blind.inferred, ['variant', 'partner']);
  assert.equal(actionOf(blind, LOG), 'review', 'without a baseline nobody can say who changed it');
  assert.equal(actionOf(blind, 'CLAUDE.md'), 'current', 'the inferred partner name renders the same CLAUDE.md');
  assert.ok(blind.structure.some((s) => s.path === RECORD));
  assert.match(cli(['update', dir]).out, /baseline: none recorded[\s\S]*--base <dir>/);

  const based = plan(dir, '--base', REPO);
  assert.equal(based.baseline, 'base');
  assert.equal(actionOf(based, LOG), 'keep', 'with the installed package as the base it is the user\'s edit');

  assert.equal(cli(['update', dir, '--apply', '--base', REPO]).status, 0);
  const after = plan(dir);
  assert.equal(after.baseline, 'recorded', '--apply writes the record, so the next update needs no --base');
  assert.equal(actionOf(after, LOG), 'keep');
  assert.match(read(dir, LOG), /my own extra rule/);
  assert.equal(JSON.parse(read(dir, '.atlas/config.json')).version, '3.0.0', 'config.json is the user\'s; update leaves it alone');
});

test('update: the autonomous and vanilla flavors are recognised without a record', () => {
  const auto = scaffold(['2', 'Grace Hopper', '1', '', '2', '1', '', '3', '1', 'n']).dir;
  fs.rmSync(path.join(auto, RECORD));
  const a = plan(auto);
  assert.deepEqual([a.variant, a.partner, actionOf(a, 'CLAUDE.md')], ['atlas-autonomous', 'Grace Hopper', 'current']);
  const vanilla = scaffold(['1', '1', '', '2', '1', '', '3', '1', 'n']).dir;
  fs.rmSync(path.join(vanilla, RECORD));
  const v = plan(vanilla);
  assert.deepEqual([v.variant, actionOf(v, 'CLAUDE.md')], ['vanilla', 'current']);
  assert.ok(!v.items.some((i) => i.path.startsWith('misc/self/')), 'vanilla has no identity docs to add');
});

test('update: a mode switch and CRLF line endings are not edits', () => {
  const dir = multi();
  write(dir, 'CLAUDE.md', ws.setWorkspaceBlock(read(dir, 'CLAUDE.md'), 'repo'));
  write(dir, LOG, read(dir, LOG).replace(/\n/g, '\r\n'));
  const p = plan(dir);
  assert.equal(actionOf(p, 'CLAUDE.md'), 'current');
  assert.equal(actionOf(p, LOG), 'current');
});

test('update: structure the version expects is reported and never moved', () => {
  const dir = multi();
  fs.rmSync(path.join(dir, 'projects/shop/STATUS.md'));
  fs.rmSync(path.join(dir, 'general'), { recursive: true });
  write(dir, 'projects/blog/CLAUDE.md', '# blog\n');
  write(dir, '.claude/rules/DESIGN.md', '---\nname: mine\n---\n');
  const expected = ['.claude/rules/DESIGN.md', 'general', 'projects/blog/STATUS.md', 'projects/shop/STATUS.md'];
  assert.deepEqual(plan(dir).structure.map((s) => s.path).sort(), expected);
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  assert.deepEqual(plan(dir).structure.map((s) => s.path).sort(), expected, '--apply does not create or move the user\'s structure');
  assert.equal(read(dir, '.claude/rules/DESIGN.md'), '---\nname: mine\n---\n');
});

test('update --stage: writes the template, the base and a three-way merge for files that need a decision', () => {
  const dir = multi();
  const current = read(dir, LOG);
  const lines = current.split('\n');
  // base = the template with its last line different; mine = the base with a line added at the top
  const base = path.join(tempDir(), 'pkg');
  write(base, 'claude_md_variants/atlas-collaborative.md', fs.readFileSync(path.join(REPO, 'claude_md_variants', 'atlas-collaborative.md'), 'utf-8'));
  const older = [...lines.slice(0, -2), 'a line the old version ended with', ''].join('\n');
  write(base, LOG, older);
  write(dir, LOG, older.replace(/^(---\n[\s\S]*?\n---\n)/, '$1\nmy own opening note\n'));
  fs.rmSync(path.join(dir, RECORD));

  const stageDir = path.join(tempDir(), 'stage');
  const before = snapshot(dir);
  const r = cli(['update', dir, '--base', base, '--stage', stageDir, '--json']);
  assert.equal(r.status, 0, r.out + r.err);
  assert.deepEqual(changed(before, snapshot(dir)), [], 'staging writes only into the stage folder');
  const out = JSON.parse(r.out);
  assert.equal(actionOf(out, LOG), 'merge');
  const staged = out.staged.find((s) => s.path === LOG);
  assert.equal(fs.readFileSync(staged.new, 'utf-8'), current);
  assert.equal(fs.readFileSync(staged.base, 'utf-8'), older);
  assert.equal(staged.conflicts, 0, 'edits in different places merge cleanly');
  const merged = fs.readFileSync(staged.merged, 'utf-8');
  assert.ok(merged.includes('my own opening note') && !merged.includes('a line the old version ended with'));
});

test('update: refuses a non-workspace, an older package, and unknown options', () => {
  const empty = tempDir();
  assert.match(cli(['update', empty]).err, /not an ATLAS workspace/);
  const help = cli(['update', '--help']);
  assert.equal(help.status, 0, help.err);
  assert.match(help.out, /--take <path>/);
  assert.match(cli(['update', REPO]).err, /the swe-atlas package itself/);
  const dir = multi();
  assert.match(cli(['update', dir, '--force']).err, /unknown option --force/);
  assert.match(cli(['update', dir, '--take']).err, /--take needs a value/);
  assert.match(cli(['update', dir, '--base', empty]).err, /not an unpacked swe-atlas package/);
  saveRecord(dir, { ...record(dir), version: '99.0.0' });
  const r = cli(['update', dir, '--apply']);
  assert.equal(r.status, 1);
  assert.match(r.err, /this package is .* and the workspace is already at 99\.0\.0/);
  assert.ok(installer.isOlder('3.0.0', '3.0.1') && installer.isOlder('3.9.0', '3.10.0') && !installer.isOlder('3.1.0', '3.1.0'));
});

test('update: an executable script stays executable', { skip: process.platform === 'win32' }, () => {
  const dir = scaffold(['3', 'Ada', '3', '', '1', '*', '3', '1', 'n']).dir;
  const rel = '.claude/skills/skill-creator/scripts/quick_validate.py';
  assert.ok(fs.statSync(path.join(dir, rel)).mode & 0o111, 'the scaffold keeps the mode');
  fs.rmSync(path.join(dir, rel));
  assert.equal(cli(['update', dir, '--take', rel]).status, 0);
  assert.ok(fs.statSync(path.join(dir, rel)).mode & 0o111, '--take keeps the mode');
});

// ─── What an update must never do to a file of the user's ───────────────────

test('update: a file of the user\'s at a path ATLAS once shipped is never removed, and --keep settles it', () => {
  const dir = multi();
  const mine = {
    '.claude/commands/plandev/mine.md': 'my own command\n',
    '.claude/agents/code-review.md': '---\nname: code-review\ndescription: my own reviewer\n---\nmy prompt\n',
  };
  for (const [rel, content] of Object.entries(mine)) write(dir, rel, content);
  // and one ATLAS did install, which the user then rewrote
  write(dir, '.claude/agents/code-simplifier.md', 'rewritten by me\n');
  installedAs(dir, '.claude/agents/code-simplifier.md', 'as 2.6 shipped it\n');

  const p = plan(dir);
  for (const rel of [...Object.keys(mine), '.claude/agents/code-simplifier.md']) assert.equal(actionOf(p, rel), 'review-removed', rel);
  assert.ok(!cli(['update', dir]).out.includes('Safe to remove'));

  assert.equal(cli(['update', dir, '--apply']).status, 0);
  for (const [rel, content] of Object.entries(mine)) assert.equal(read(dir, rel), content, `${rel} survived --apply`);

  const kept = cli(['update', dir, '--apply', '--keep', '.claude/agents/code-review.md', '--keep', '.claude/commands/plandev', '--keep', '.claude/agents/code-simplifier.md']);
  assert.match(kept.out, /0 removed, 3 kept as yours\. 0 still need/);
  const after = plan(dir);
  assert.deepEqual(after.items.filter((i) => i.action !== 'current'), [], 'kept paths stop being reported');
  for (const rel of Object.keys(mine)) assert.ok(after.yours.includes(rel), `${rel} is listed as the user's`);
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  for (const [rel, content] of Object.entries(mine)) assert.equal(read(dir, rel), content, `${rel} survived a later --apply`);
  assert.equal(read(dir, '.claude/agents/code-simplifier.md'), 'rewritten by me\n');
});

test('update --keep beats a safe removal, and an emptied folder goes with its last file', () => {
  const dir = multi();
  for (const name of ['a.md', 'b.md']) {
    write(dir, `.claude/commands/plandev/${name}`, 'retired\n');
    installedAs(dir, `.claude/commands/plandev/${name}`, 'retired\n');
  }
  assert.equal(actionOf(plan(dir), '.claude/commands/plandev/a.md'), 'remove');
  const r = cli(['update', dir, '--apply', '--keep', '.claude/commands/plandev/a.md']);
  assert.match(r.out, /1 removed, 1 kept as yours/);
  assert.ok(exists(dir, '.claude/commands/plandev/a.md') && !exists(dir, '.claude/commands/plandev/b.md'));
  fs.rmSync(path.join(dir, '.claude/commands/plandev/a.md'));
  write(dir, '.claude/agents/code-architect.md', 'retired\n');
  installedAs(dir, '.claude/agents/code-architect.md', 'retired\n');
  write(dir, '.claude/commands/retired/only.md', 'retired\n');
  installedAs(dir, '.claude/commands/retired/only.md', 'retired\n');
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  assert.ok(!exists(dir, '.claude/commands/retired'), 'no empty folder is left behind');
  assert.ok(exists(dir, '.claude/agents/commit.md'), 'a folder that still holds files stays');
});

test('update: refuses a Claude Code repo that is not an ATLAS workspace', () => {
  const dir = tempDir();
  write(dir, 'CLAUDE.md', '# My app\n');
  write(dir, '.claude/agents/code-review.md', 'mine\n');
  write(dir, '.claude/settings.json', '{"permissions":{"allow":["Bash(npm test)"]}}\n');
  const before = snapshot(dir);
  for (const args of [[], ['--apply'], ['--take', COMMIT]]) {
    const r = cli(['update', dir, ...args]);
    assert.equal(r.status, 1);
    assert.match(r.err, /not an ATLAS workspace/);
  }
  assert.deepEqual(changed(before, snapshot(dir)), [], 'nothing was written');
});

test('update: nothing is written through a symlink or into a folder of the user\'s that shares a skill\'s name', { skip: process.platform === 'win32' }, () => {
  const dir = multi();
  const outside = tempDir();
  // a skill folder that links out of the workspace, under a name the template also ships
  write(outside, 'shadcn/SKILL.md', 'my own skill\n');
  fs.symlinkSync(path.join(outside, 'shadcn'), path.join(dir, '.claude/skills/shadcn'));
  // a template file replaced by a link, in a state that would otherwise be "safe to replace"
  write(outside, 'commit.md', 'the 3.0.0 text of this command\n');
  fs.rmSync(path.join(dir, COMMIT));
  fs.symlinkSync(path.join(outside, 'commit.md'), path.join(dir, COMMIT));
  installedAs(dir, COMMIT, 'the 3.0.0 text of this command\n');
  // a real folder of the user's own with a shipped skill's name, which ATLAS never installed here
  write(dir, '.claude/skills/find-skills/SKILL.md', 'mine, not the shipped one\n');

  const p = plan(dir);
  assert.equal(actionOf(p, COMMIT), undefined);
  assert.ok(!p.items.some((i) => i.path.startsWith('.claude/skills/shadcn/') || i.path.startsWith('.claude/skills/find-skills/')));
  assert.ok(p.yours.some((y) => y.startsWith('.claude/skills/shadcn/') && y.includes('symlink')), p.yours.join('\n'));
  assert.ok(p.yours.some((y) => y.startsWith(COMMIT) && y.includes('symlink')));
  assert.ok(p.yours.includes('.claude/skills/find-skills/'));

  assert.equal(cli(['update', dir, '--apply']).status, 0);
  // a refused path stops the whole --take, whichever comes first: the valid one is not written either
  write(dir, LOG, 'my rewrite of the log command\n');
  for (const order of [[LOG, '.claude/skills/shadcn'], ['.claude/skills/shadcn', LOG]]) {
    const taken = cli(['update', dir, ...order.flatMap((x) => ['--take', x])]);
    assert.equal(taken.status, 1);
    assert.match(taken.err, /symlink/);
    assert.equal(read(dir, LOG), 'my rewrite of the log command\n');
  }
  assert.deepEqual(fs.readdirSync(path.join(outside, 'shadcn')), ['SKILL.md'], 'nothing landed outside the workspace');
  assert.equal(fs.readFileSync(path.join(outside, 'commit.md'), 'utf-8'), 'the 3.0.0 text of this command\n');
  assert.deepEqual(fs.readdirSync(path.join(dir, '.claude/skills/find-skills')), ['SKILL.md'], 'no template file was added beside the user\'s own');
});

test('update: with no install record, a same-named skill folder with no shipped file in it is never written, until --keep or --take settles it', () => {
  const dir = multi();
  const { skills: installed, available: [name, other] } = plan(dir);
  assert.ok(installed.length > 0 && name && other);
  fs.rmSync(path.join(dir, RECORD));
  for (const n of [name, other]) write(dir, `.claude/skills/${n}/SKILL.md`, 'mine, not the shipped one\n');
  const p = plan(dir);
  assert.deepEqual(p.skills, installed, 'the scaffolded skills are recognised by their files');
  assert.deepEqual(p.unsure, [name, other].sort());
  assert.ok(!p.available.includes(name), 'not offered as "not installed"');
  assert.ok(!p.items.some((i) => i.path.startsWith(`.claude/skills/${name}/`)));
  const blind = cli(['update', dir, '--apply']);
  assert.match(blind.out, /origin unknown \(2\)/);
  assert.match(blind.out, /2 still need a decision/);
  assert.deepEqual(fs.readdirSync(path.join(dir, `.claude/skills/${name}`)), ['SKILL.md']);
  assert.deepEqual(record(dir).unsure, [name, other].sort(), 'the doubt is remembered once a record exists');

  // --keep: it is the user's, and from then on --take will not write into it
  assert.match(cli(['update', dir, '--keep', `.claude/skills/${name}`]).out, /1 kept as yours\. 1 still needs a decision/);
  const mine = plan(dir);
  assert.deepEqual(mine.unsure, [other]);
  assert.ok(mine.yours.includes(`.claude/skills/${name}/`) && !mine.available.includes(name));
  const refused = cli(['update', dir, '--take', `.claude/skills/${name}`]);
  assert.equal(refused.status, 1);
  assert.match(refused.err, /folder of your own/);
  assert.equal(read(dir, `.claude/skills/${name}/SKILL.md`), 'mine, not the shipped one\n');

  // --take: replace it with the shipped skill
  assert.equal(cli(['update', dir, '--take', `.claude/skills/${other}`]).status, 0);
  assert.equal(read(dir, `.claude/skills/${other}/SKILL.md`), fs.readFileSync(path.join(REPO, `.claude/skills/${other}/SKILL.md`), 'utf-8'));
  assert.equal(record(dir).unsure, undefined);
  assert.ok(plan(dir).skills.includes(other));

  // a folder made after the record exists was never in doubt: it is simply the user's
  const third = plan(dir).available[0];
  write(dir, `.claude/skills/${third}/SKILL.md`, 'mine\n');
  const later = plan(dir);
  assert.ok(later.unsure.length === 0 && later.yours.includes(`.claude/skills/${third}/`) && !later.available.includes(third));
});

test('update: an installed skill whose every file changed since is recovered by --base, even after an --apply without it', () => {
  const dir = multi();
  const skill = plan(dir).skills[0];
  const skillFiles = Object.keys(record(dir).files).filter((rel) => tpl.skillOf(rel) === skill);
  const older = Object.fromEntries(skillFiles.map((rel) => [rel, `what 2.9.0 shipped at ${rel}\n`]));
  const base = olderPackage(older);
  fs.rmSync(path.join(dir, RECORD));
  write(dir, '.atlas/config.json', JSON.stringify({ mode: 'multi', version: '2.9.0' }));
  for (const rel of skillFiles) write(dir, rel, older[rel]);

  assert.equal(cli(['update', dir, '--apply']).status, 0);
  for (const rel of skillFiles) assert.equal(read(dir, rel), older[rel], 'nothing is written while the origin is unknown');
  assert.deepEqual([record(dir).unsure, record(dir).pendingBase], [[skill], '2.9.0']);
  assert.match(cli(['update', dir]).out, /unpack swe-atlas@2\.9\.0 and pass --base/);

  const p = plan(dir, '--base', base);
  assert.ok(p.skills.includes(skill) && p.unsure.length === 0, 'its files match the base: ATLAS installed it');
  for (const rel of skillFiles) assert.equal(actionOf(p, rel), 'replace', rel);
  assert.equal(cli(['update', dir, '--apply', '--base', base]).status, 0);
  for (const rel of skillFiles) assert.deepEqual(fs.readFileSync(path.join(dir, rel)), fs.readFileSync(path.join(REPO, rel)), rel);
  const rec = record(dir);
  assert.ok(rec.skills.includes(skill) && rec.unsure === undefined && rec.pendingBase === undefined);
});

test('update: a failing --take writes nothing, including the valid ones before it', () => {
  const { dir } = mixedWorkspace();
  const before = snapshot(dir);
  const r = cli(['update', dir, '--take', MODE, '--take', 'nope/zzz']);
  assert.equal(r.status, 1);
  assert.deepEqual(changed(before, snapshot(dir)), []);
});

test('update: settings.json and .gitignore keep the user\'s own hooks and choices', () => {
  const dir = multi();
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  const cmd = (command) => ({ hooks: [{ type: 'command', command }] });
  settings.permissions.deny = settings.permissions.deny.filter((d) => d !== 'Read(**/.env)'); // so there is a line to add
  // a workspace update accepts was never given a retired hook by ATLAS: all of these are the user's
  const stop = [
    cmd('node $CLAUDE_PROJECT_DIR/tools/task-complete.cjs'),
    cmd('node "${CLAUDE_PROJECT_DIR}/.claude/hooks/task-complete.cjs"'),
    cmd('node ~/.claude/hooks/ask-user-input.cjs --global'),
    cmd('echo ./vendor/.claude/hooks/task-complete.cjs.bak'),
  ];
  settings.hooks.Stop = stop;
  settings.hooks.Notification = { odd: 'shape' };
  settings.hooks.SessionEnd = [];
  write(dir, '.claude/settings.json', JSON.stringify(settings, null, 2) + '\n');
  write(dir, '.claude/hooks/task-complete.cjs', '// my own script, at a name ATLAS once used\n');
  write(dir, '.gitattributes', '*.md text eol=crlf\nassets/** binary\n');

  const item = plan(dir).items.find((i) => i.path === '.claude/settings.json');
  assert.doesNotMatch(item.note, /remove/);
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  const after = JSON.parse(read(dir, '.claude/settings.json'));
  assert.deepEqual(after.hooks.Stop, stop, 'no hook is removed by an update');
  assert.deepEqual(after.hooks.Notification, { odd: 'shape' }, 'a shape it does not understand is left alone');
  assert.deepEqual(after.hooks.SessionEnd, []);
  assert.ok(after.permissions.deny.includes('Read(**/.env)'));
  const attrs = read(dir, '.gitattributes');
  assert.ok(attrs.startsWith('*.md text eol=crlf\nassets/** binary\n') && attrs.includes('.claude/** text=auto eol=lf'), 'the user\'s lines stay, ATLAS\'s are added');
  assert.ok(!attrs.includes('*.md text eol=lf'), 'and their rule for *.md is not overridden');

  // --keep: the user removed lines on purpose, and they stay removed
  const mine = JSON.stringify({ permissions: { deny: [] } }) + '\n';
  write(dir, '.claude/settings.json', mine);
  write(dir, '.gitignore', 'node_modules/\n');
  const kept = cli(['update', dir, '--apply', '--keep', '.claude/settings.json', '--keep', '.gitignore']);
  assert.match(kept.out, /0 written, 0 removed, 2 kept as yours/);
  assert.equal(read(dir, '.claude/settings.json'), mine);
  assert.equal(read(dir, '.gitignore'), 'node_modules/\n');
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  assert.equal(read(dir, '.gitignore'), 'node_modules/\n', 'a kept file is not offered lines again');
  assert.ok(plan(dir).yours.some((y) => y.startsWith('.gitignore')));
});

test('update: a line the user added inside the managed CLAUDE.md block is an edit, not something to replace', () => {
  const dir = multi();
  const edited = read(dir, 'CLAUDE.md').replace('<!-- atlas:workspace end -->', '- @docs/team-conventions.md - my own import\n<!-- atlas:workspace end -->');
  assert.notEqual(edited, read(dir, 'CLAUDE.md'));
  write(dir, 'CLAUDE.md', edited);
  assert.equal(actionOf(plan(dir), 'CLAUDE.md'), 'keep', 'the template did not change, so the edit is simply kept');
  installedAs(dir, 'CLAUDE.md', '# an older CLAUDE.md\n');
  assert.equal(actionOf(plan(dir), 'CLAUDE.md'), 'merge', 'both sides changed');
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  assert.equal(read(dir, 'CLAUDE.md'), edited);
  // a block ATLAS wrote for another mode is still not an edit
  write(dir, 'CLAUDE.md', ws.setWorkspaceBlock(edited, 'project'));
  saveRecord(dir, { ...record(dir), files: { ...record(dir).files, 'CLAUDE.md': tpl.hash('CLAUDE.md', Buffer.from(ws.setWorkspaceBlock(edited, 'multi'))) } });
  assert.equal(actionOf(plan(dir), 'CLAUDE.md'), 'current');
});

/** A copy of this package with `changes` applied: stands in for the older version a workspace was installed from. */
function olderPackage(changes) {
  const base = path.join(tempDir(), 'package');
  for (const rel of ['claude_md_variants', 'misc/self', 'misc/archive', tpl.MANIFEST_PATH, 'package.json', ...tpl.CLAUDE_DIRS.map((d) => `.claude/${d}`)]) {
    const from = path.join(REPO, ...rel.split('/'));
    if (fs.existsSync(from)) fs.cpSync(from, path.join(base, ...rel.split('/')), { recursive: true });
  }
  for (const [rel, content] of Object.entries(changes)) write(base, rel, content);
  return base;
}

test('update: a 3.0.0 workspace with the installed package as --base is upgraded end to end', () => {
  const dir = multi();
  const older = { [COMMIT]: 'the text 2.9.0 shipped\n', [MODE]: 'what 2.9.0 said about modes\n' };
  const base = olderPackage(older);
  // the workspace as that version left it: old files, no record, one of them edited
  fs.rmSync(path.join(dir, RECORD));
  write(dir, '.atlas/config.json', JSON.stringify({ mode: 'multi', version: '2.9.0' }));
  write(dir, COMMIT, older[COMMIT]);
  write(dir, MODE, older[MODE] + 'and my own line\n');
  write(dir, LOG, read(dir, LOG) + '\nmy own extra rule\n');

  // without the base: nothing is guessed, and the report says which version to fetch, before and after --apply
  const blind = cli(['update', dir, '--apply']);
  assert.match(blind.out, /0 written[\s\S]*3 still need a decision/);
  assert.equal(read(dir, COMMIT), older[COMMIT]);
  assert.equal(record(dir).pendingBase, '2.9.0');
  assert.match(cli(['update', dir]).out, /Unpack swe-atlas@2\.9\.0 and pass --base/);
  const stageDir = path.join(tempDir(), 'stage');
  assert.match(cli(['update', dir, '--stage', stageDir]).out, /base\/ and the three-way merged\/ need the package you installed: unpack swe-atlas@2\.9\.0/);
  assert.ok(exists(stageDir, `new/${COMMIT}`) && !exists(stageDir, 'base'));

  // with it: the untouched file is replaced, the user's edits are told apart from template changes
  const p = plan(dir, '--base', base);
  assert.deepEqual([actionOf(p, COMMIT), actionOf(p, MODE), actionOf(p, LOG)], ['replace', 'merge', 'keep']);
  const r = cli(['update', dir, '--apply', '--base', base]);
  assert.match(r.out, /1 written[\s\S]*1 still needs a decision/);
  assert.equal(read(dir, COMMIT), fs.readFileSync(path.join(REPO, COMMIT), 'utf-8'));
  assert.match(read(dir, MODE), /and my own line/);
  assert.match(read(dir, LOG), /my own extra rule/);
  assert.equal(record(dir).pendingBase, '2.9.0', 'the merge still needs that version');

  assert.equal(cli(['update', dir, '--keep', MODE]).status, 0);
  assert.equal(record(dir).pendingBase, undefined, 'nothing waits on the old version any more');
  assert.equal(actionOf(plan(dir), MODE), 'keep', 'the kept file is recorded as reconciled with this template');
  assert.ok(!cli(['update', dir]).out.includes('pass --base'));
});

test('update: --keep survives a later --apply --base, and a path that matches nothing is an error', () => {
  const dir = multi();
  const gone = '.claude/commands/old/gone.md';
  const base = olderPackage({ [gone]: 'a command 2.9.0 shipped\n' });
  write(dir, gone, 'a command 2.9.0 shipped\n');
  assert.equal(actionOf(plan(dir, '--base', base), gone), 'remove', 'the base knows it and it is untouched');
  assert.match(cli(['update', dir, '--base', base, '--keep', gone]).out, /1 kept as yours/);
  for (const args of [['--apply', '--base', base], ['--apply']]) {
    assert.equal(cli(['update', dir, ...args]).status, 0);
    assert.equal(read(dir, gone), 'a command 2.9.0 shipped\n', `kept, so ${args.join(' ')} leaves it`);
  }
  assert.ok(plan(dir, '--base', base).yours.includes(gone));

  const before = snapshot(dir);
  const typo = cli(['update', dir, '--apply', '--keep', '.claude/commands/git/comit.md']);
  assert.equal(typo.status, 1);
  assert.match(typo.err, /nothing there is waiting on a decision/);
  assert.deepEqual(changed(before, snapshot(dir)), []);
});

test('update: the version in the record moves only with --apply', () => {
  const dir = multi();
  const current = record(dir).version;
  saveRecord(dir, { ...record(dir), version: '2.9.0' });
  write(dir, COMMIT, 'edited\n');
  assert.equal(cli(['update', dir, '--take', COMMIT]).status, 0);
  assert.equal(record(dir).version, '2.9.0', 'one file was taken; the rest of the update has not been applied');
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  assert.equal(record(dir).version, current);
});

test('update: a hand-damaged record or a folder at a template path does not stop the update', () => {
  const dir = multi();
  const good = record(dir);
  for (const damage of [{ kept: 'CLAUDE.md' }, { kept: ['/', ''] }, { kept: [1, null] }, { skills: 'all' }, { blocks: {} }, { unsure: 7 }, { files: [] }, { files: null }, { partner: 5 }]) {
    saveRecord(dir, { ...good, ...damage });
    assert.equal(cli(['update', dir]).status, 0, JSON.stringify(damage));
  }
  saveRecord(dir, good);
  // a folder where the template ships a file, and a file where it needs a folder
  fs.rmSync(path.join(dir, AGENT));
  write(dir, `${AGENT}/notes.md`, 'mine\n');
  fs.rmSync(path.join(dir, '.claude/commands/git'), { recursive: true });
  write(dir, '.claude/commands/git', 'a file of mine\n');
  // the same one level up: a file where a whole template folder goes
  fs.rmSync(path.join(dir, '.claude/reference'), { recursive: true });
  write(dir, '.claude/reference', 'also a file of mine\n');
  write(dir, MODE, 'older text\n');
  installedAs(dir, MODE, 'older text\n');
  const p = plan(dir);
  assert.ok(p.yours.some((y) => y.startsWith(`${AGENT}/`) && y.includes('a folder where the template ships a file')), p.yours.join('\n'));
  assert.ok(p.yours.some((y) => y.startsWith('.claude/commands/git ') && y.includes('a file where the template needs a folder')));
  assert.ok(!p.items.some((i) => i.path === AGENT || i.path.startsWith('.claude/commands/git/')));
  const r = cli(['update', dir, '--apply']);
  assert.equal(r.status, 0, r.err);
  assert.equal(read(dir, MODE), fs.readFileSync(path.join(REPO, MODE), 'utf-8'), 'the rest of the update is applied');
  assert.equal(read(dir, '.claude/commands/git'), 'a file of mine\n');
  assert.equal(read(dir, '.claude/reference'), 'also a file of mine\n');
  assert.ok(p.yours.some((y) => y.startsWith('.claude/reference ') && y.includes('a file where the template needs a folder')));
  assert.equal(cli(['update', dir, '--take', AGENT]).status, 1, '--take cannot write there either');
});

test('update: symlinked folders, a symlinked .atlas and links at removable or additive paths are left alone', { skip: process.platform === 'win32' }, () => {
  const dir = multi();
  const outside = tempDir();
  // .claude/commands moved out and linked back, holding a file that would be "safe to replace" and one "safe to remove"
  write(dir, COMMIT, 'the 3.0.0 text of this command\n');
  installedAs(dir, COMMIT, 'the 3.0.0 text of this command\n');
  write(dir, '.claude/commands/old/gone.md', 'retired\n');
  installedAs(dir, '.claude/commands/old/gone.md', 'retired\n');
  fs.renameSync(path.join(dir, '.claude/commands'), path.join(outside, 'commands'));
  fs.symlinkSync(path.join(outside, 'commands'), path.join(dir, '.claude/commands'));
  // a retired agent ATLAS installed, now a link; and .gitignore linked to a shared file that lacks the ATLAS lines
  write(outside, 'code-explorer.md', 'the agent 2.6 shipped\n');
  fs.symlinkSync(path.join(outside, 'code-explorer.md'), path.join(dir, '.claude/agents/code-explorer.md'));
  installedAs(dir, '.claude/agents/code-explorer.md', 'the agent 2.6 shipped\n');
  fs.rmSync(path.join(dir, '.gitignore'));
  write(outside, 'ignore', 'node_modules/\n');
  fs.symlinkSync(path.join(outside, 'ignore'), path.join(dir, '.gitignore'));
  // one ordinary file that is safe to replace, to see the update still does its work
  write(dir, AGENT, 'older agent text\n');
  installedAs(dir, AGENT, 'older agent text\n');

  const p = plan(dir);
  assert.ok(!p.items.some((i) => i.path.startsWith('.claude/commands/') || i.path === '.gitignore' || i.path === '.claude/agents/code-explorer.md'), JSON.stringify(p.items.filter((i) => i.action !== 'current')));
  for (const link of ['.claude/commands/', '.gitignore', '.claude/agents/code-explorer.md']) {
    assert.ok(p.yours.some((y) => y.startsWith(link) && y.includes('symlink')), `${link} is reported as a symlink`);
  }
  const outsideBefore = snapshot(outside);
  const r = cli(['update', dir, '--apply']);
  assert.equal(r.status, 0, r.err);
  assert.deepEqual(changed(outsideBefore, snapshot(outside)), [], 'nothing behind a link was written or removed');
  assert.equal(read(dir, AGENT), fs.readFileSync(path.join(REPO, AGENT), 'utf-8'), 'and the rest of the update went through');

  // the guard itself refuses a removal behind a link, even if a plan were to ask for one
  const inProcess = updater.plan(dir, REPO, {});
  inProcess.items.push({ path: '.claude/commands/old/gone.md', class: 'template', action: 'remove' });
  assert.throws(() => updater.apply(inProcess, { safe: true }), /symlink/);
  assert.ok(exists(outside, 'commands/old/gone.md'));

  // .atlas linked elsewhere: the record would land outside, so nothing is written at all
  const linked = multi();
  const elsewhere = tempDir();
  write(linked, AGENT, 'older agent text\n');
  installedAs(linked, AGENT, 'older agent text\n'); // safe to replace, were it not for where the record would go
  fs.renameSync(path.join(linked, '.atlas'), path.join(elsewhere, 'atlas'));
  fs.symlinkSync(path.join(elsewhere, 'atlas'), path.join(linked, '.atlas'));
  const [inside, behind] = [snapshot(linked), snapshot(elsewhere)];
  const refused = cli(['update', linked, '--apply']);
  assert.equal(refused.status, 1);
  assert.match(refused.err, /symlink/);
  assert.deepEqual([changed(inside, snapshot(linked)), changed(behind, snapshot(elsewhere))], [[], []]);
});

test('update --stage refuses a folder whose new/ would be the workspace itself', () => {
  const dir = path.join(tempDir(), 'new');
  scaffold(['3', 'Ada', '3', 'shop', '2', '1', '', '3', '1', 'n'], { into: dir });
  write(dir, LOG, read(dir, LOG) + '\nmy own extra rule\n');
  const before = snapshot(dir);
  const r = cli(['update', dir, '--stage', path.dirname(dir)]);
  assert.equal(r.status, 1);
  assert.match(r.err, /would overwrite workspace files/);
  assert.deepEqual(changed(before, snapshot(dir)), []);
  // a folder inside the workspace is fine
  assert.equal(cli(['update', dir, '--stage', path.join(dir, 'gitignored', 'stage')]).status, 0);
  assert.ok(exists(dir, `gitignored/stage/new/${LOG}`));
});

test('update: the flavor is not guessed from a heading alone, and a user-owned path is never the template\'s to add or remove', () => {
  // vanilla, no record, with a heading the collaborative flavor also has
  const { dir } = scaffold(['1', '3', 'shop', '2', '1', '', '3', '1', 'n']);
  fs.rmSync(path.join(dir, RECORD));
  write(dir, 'CLAUDE.md', read(dir, 'CLAUDE.md') + '\n## Work Discipline\n\n- my own rule\n');
  const p = plan(dir);
  assert.equal(p.variant, 'vanilla');
  assert.ok(!p.items.some((i) => i.path.startsWith('misc/self/')), 'no identity docs are added to a vanilla workspace');

  // a path the manifest gives to the user, inside a template-managed folder
  const mine = '.claude/rules/design/shop.md';
  const ws2 = multi();
  write(ws2, mine, 'my design rule\n');
  installedAs(ws2, mine, 'my design rule\n'); // even with a baseline that matches, it is not a leftover
  const theirs = olderPackage({ '.claude/rules/design/web.md': 'a design rule a package wrongly ships\n' });
  const q = updater.plan(ws2, theirs, {});
  assert.equal(actionOf(q, mine), undefined);
  assert.ok(q.yours.includes(mine));
  assert.equal(actionOf(q, '.claude/rules/design/web.md'), undefined, 'a user-class path is never added, whatever a package ships');
});

test('update: a managed block an earlier ATLAS wrote is still not an edit, because the record remembers it', () => {
  const dir = multi();
  const older = '<!-- atlas:workspace start -->\nthe block as an earlier version worded it\n<!-- atlas:workspace end -->';
  write(dir, 'CLAUDE.md', read(dir, 'CLAUDE.md').replace(tpl.BLOCK_RE, older));
  assert.equal(actionOf(plan(dir), 'CLAUDE.md'), 'keep', 'a block nothing vouches for counts as the user\'s text');
  const rec = record(dir);
  saveRecord(dir, { ...rec, blocks: [...rec.blocks, crypto.createHash('sha256').update(older).digest('hex')] });
  assert.equal(actionOf(plan(dir), 'CLAUDE.md'), 'current');
});

test('update: on a disk that ignores case, a folder of the user\'s named like a shipped skill is not written into', () => {
  const dir = multi();
  write(dir, '.claude/skills/Shadcn/SKILL.md', 'MY OWN Shadcn skill\n');
  if (!exists(dir, '.claude/skills/shadcn/SKILL.md')) return; // this disk tells the two names apart: nothing to guard
  const p = plan(dir);
  assert.ok(!p.available.includes('shadcn'), 'not offered as a skill to install');
  const r = cli(['update', dir, '--take', '.claude/skills/shadcn']);
  assert.equal(r.status, 1);
  assert.match(r.err, /a folder of your own that shares a shipped skill's name/);
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  assert.equal(read(dir, '.claude/skills/Shadcn/SKILL.md'), 'MY OWN Shadcn skill\n');
  assert.deepEqual(fs.readdirSync(path.join(dir, '.claude/skills/Shadcn')), ['SKILL.md']);
});

test('update --stage refuses a stage folder with a link in it, before writing through it', { skip: process.platform === 'win32' }, () => {
  const dir = multi();
  write(dir, LOG, read(dir, LOG) + '\nMY EDIT\n');
  for (const link of ['new', 'new/.claude']) {
    const stage = tempDir();
    if (link.includes('/')) fs.mkdirSync(path.join(stage, 'new'));
    fs.symlinkSync(link === 'new' ? dir : path.join(dir, '.claude'), path.join(stage, ...link.split('/')));
    const before = snapshot(dir);
    const r = cli(['update', dir, '--stage', stage]);
    assert.equal(r.status, 1, link);
    assert.match(r.err, /is a symlink|would overwrite workspace files/);
    assert.deepEqual(changed(before, snapshot(dir)), [], link);
  }
});

test('update: settings.json keeps its indentation and line endings, and one that is not an object is refused', () => {
  const dir = multi();
  const settings = JSON.parse(read(dir, '.claude/settings.json'));
  settings.permissions.deny = settings.permissions.deny.filter((d) => d !== 'Read(**/.env)');
  write(dir, '.claude/settings.json', (JSON.stringify(settings, null, 4) + '\n').replace(/\n/g, '\r\n'));
  assert.equal(cli(['update', dir, '--apply']).status, 0);
  const text = read(dir, '.claude/settings.json');
  assert.ok(JSON.parse(text).permissions.deny.includes('Read(**/.env)'));
  assert.match(text, /^\{\r\n {4}"/, 'four spaces and CRLF, as the user had it');
  assert.ok(!/[^\r]\n/.test(text), 'no bare LF was mixed in');
  for (const content of ['null', '[]']) {
    write(dir, '.claude/settings.json', content);
    const before = snapshot(dir);
    const r = cli(['update', dir, '--apply']);
    assert.equal(r.status, 1, content);
    assert.match(r.err, /settings\.json is not a JSON object/);
    assert.deepEqual(changed(before, snapshot(dir)), []);
  }
});

test('record: a kept folder written with a trailing slash still means the folder', () => {
  const dir = multi();
  saveRecord(dir, { ...record(dir), kept: ['.claude/skills/shadcn/', 'CLAUDE.md'] });
  assert.deepEqual(tpl.readRecord(dir, manifest).kept, ['.claude/skills/shadcn', 'CLAUDE.md']);
});

test('update --stage refuses a folder whose new/ holds the workspace under another case, on a disk that ignores case', () => {
  const top = tempDir();
  const dir = path.join(top, 'New', 'inner');
  scaffold(['3', 'Ada', '3', 'shop', '2', '1', '', '3', '1', 'n'], { into: dir });
  if (!exists(top, 'new')) return; // this disk tells New from new: staging into new/ touches nothing of the workspace
  write(top, 'New/CLAUDE.md', 'MY OUTER FILE\n');
  write(dir, 'CLAUDE.md', read(dir, 'CLAUDE.md') + '\nmy own line\n');
  const before = snapshot(top);
  const r = cli(['update', dir, '--stage', top]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.err, /would overwrite workspace files/);
  assert.deepEqual(changed(before, snapshot(top)), [], 'the CLAUDE.md above the workspace is not the stage copy');
});

test('update: a file of the user\'s inside an installed skill is listed by its path, not as the whole folder', () => {
  const dir = multi();
  const skill = record(dir).skills[0];
  write(dir, `.claude/skills/${skill}/MY-NOTES.md`, 'my notes\n');
  const p = plan(dir);
  assert.ok(p.yours.includes(`.claude/skills/${skill}/MY-NOTES.md`));
  assert.ok(!p.yours.includes(`.claude/skills/${skill}/`), 'the skill is ATLAS\'s and still updated: calling the folder "never touched" would be false');

  // a folder of generated files in there is one line of the report, not one per file
  for (let i = 0; i < 40; i++) write(dir, `.claude/skills/${skill}/node_modules/pkg${i}/index.js`, `// ${i}\n`);
  write(dir, `.claude/skills/${skill}/scripts/mine.py`, 'pass\n');
  const report = cli(['update', dir]).out;
  assert.ok(report.includes(`  .claude/skills/${skill}/node_modules/  (40 files of yours)\n`), report);
  assert.doesNotMatch(report, /node_modules\/pkg/);
  assert.ok(report.includes(`  .claude/skills/${skill}/MY-NOTES.md\n`) && report.includes(`  .claude/skills/${skill}/scripts/mine.py\n`), 'a few files are still named');
  assert.equal(plan(dir).yours.filter((rel) => rel.includes('node_modules')).length, 40, 'the plan itself keeps every path');
});

test('update: --keep on a folder settles only what was waiting there, and --stage needs a folder', () => {
  const dir = multi();
  write(dir, LOG, read(dir, LOG) + '\nmy own extra rule\n');
  const kept = cli(['update', dir, '--keep', '.claude/commands']);
  assert.equal(kept.status, 0, kept.err);
  assert.match(kept.out, /0 removed, 1 kept as yours\. 0 still need/);
  const nothing = cli(['update', dir, '--keep', '.claude/agents']);
  assert.equal(nothing.status, 1, 'every file there is current');
  assert.match(nothing.err, /nothing there is waiting on a decision \(what the report lists under "Never touched" is already yours/);
  const empty = cli(['update', dir, '--stage', '']);
  assert.equal(empty.status, 1);
  assert.match(empty.err, /--stage needs a folder/);

  // a file new in this version, under a kept folder: it is not here, so it is not the user's to keep
  const next = multi();
  fs.rmSync(path.join(next, AGENT));
  const rec = record(next);
  delete rec.files[AGENT];
  saveRecord(next, rec);
  write(next, '.claude/agents/manual-qa-haiku.md', read(next, '.claude/agents/manual-qa-haiku.md') + '\nmy own rule\n');
  assert.match(cli(['update', next, '--keep', '.claude/agents']).out, /1 kept as yours/);
  assert.equal(actionOf(plan(next), AGENT), 'add', 'still offered, not "deleted by you"');
  assert.equal(cli(['update', next, '--apply']).status, 0);
  assert.ok(exists(next, AGENT));
  assert.match(read(next, '.claude/agents/manual-qa-haiku.md'), /my own rule/);
});
