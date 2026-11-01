// Keeps the README, the frontmatter, and the shipped files honest.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { REPO } = require('./helpers.cjs');

const claude = (...p) => path.join(REPO, '.claude', ...p);
const readme = fs.readFileSync(path.join(REPO, 'README.md'), 'utf-8');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [...out, dir];
  for (const n of fs.readdirSync(dir)) {
    if (n === '.DS_Store' || n === 'node_modules') continue;
    walk(path.join(dir, n), out);
  }
  return out;
}

function frontmatter(file) {
  const m = /^---\n([\s\S]*?)\n---/.exec(fs.readFileSync(file, 'utf-8'));
  assert.ok(m, `no frontmatter in ${path.relative(REPO, file)}`);
  return Object.fromEntries(m[1].split('\n').map((l) => /^([a-z-]+):\s*(.*)$/.exec(l)).filter(Boolean).map((x) => [x[1], x[2]]));
}

const skills = fs.readdirSync(claude('skills')).filter((n) => fs.statSync(claude('skills', n)).isDirectory()).sort();
const agents = fs.readdirSync(claude('agents')).filter((n) => n.endsWith('.md')).map((n) => n.replace(/\.md$/, ''));
const commands = fs.readdirSync(claude('commands')).flatMap((ns) =>
  fs.readdirSync(claude('commands', ns)).filter((f) => f.endsWith('.md')).map((f) => `/${ns}:${f.replace(/\.md$/, '')}`)
);

test('README counts and tables match the folders', () => {
  assert.match(readme, new RegExp(`### ${skills.length} Skills`), `README should say "### ${skills.length} Skills"`);
  assert.match(readme, new RegExp(`### ${agents.length} Agents`), `README should say "### ${agents.length} Agents"`);
  for (const s of skills) assert.ok(readme.includes(`\`/${s}\``), `README skill table misses ${s}`);
  for (const a of agents) {
    const { model } = frontmatter(claude('agents', `${a}.md`));
    const row = readme.split('\n').find((l) => l.startsWith(`| ${a} |`));
    assert.ok(row, `README agent table misses ${a}`);
    assert.ok(row.toLowerCase().includes(model), `README lists ${a} with the wrong model (file says ${model})`);
  }
  for (const c of commands) assert.ok(readme.includes(`\`${c}`), `README command table misses ${c}`);
});

test('removed agents, skills, commands, and hooks are referenced nowhere', () => {
  const gone = ['code-explorer', 'code-architect', 'code-simplifier', 'qa-manual-tester', 'theme-factory', 'algorithmic-art',
    'mcp-builder', 'anthropic-product-knowledge', 'postgresql-code-review', 'postgresql-optimization', 'plandev',
    'task-complete', 'ask-user-input', 'server-postgres'];
  const files = [
    ...walk(path.join(REPO, '.claude')).filter((f) => !f.includes(`${path.sep}worktrees${path.sep}`) && !f.endsWith('settings.local.json')),
    ...walk(path.join(REPO, 'bin')), ...walk(path.join(REPO, 'claude_md_variants')), ...walk(path.join(REPO, 'misc', 'self')),
    path.join(REPO, 'README.md'), path.join(REPO, 'NOTES.md'), path.join(REPO, 'CLAUDE.md'), path.join(REPO, 'package.json'), path.join(REPO, '.mcp.json'),
  ].filter((f) => /\.(md|js|cjs|json|ya?ml)$/.test(f));
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf-8');
    for (const name of gone) assert.ok(!text.includes(name), `${path.relative(REPO, f)} still mentions ${name}`);
  }
});

test('the two QA runners share one body', () => {
  const body = (n) => fs.readFileSync(claude('agents', `${n}.md`), 'utf-8').replace(/^---\n[\s\S]*?\n---\n/, '');
  assert.equal(body('manual-qa-haiku'), body('manual-qa-sonnet'));
  assert.equal(frontmatter(claude('agents', 'manual-qa-haiku.md')).model, 'haiku');
  assert.equal(frontmatter(claude('agents', 'manual-qa-sonnet.md')).model, 'sonnet');
});

test('frontmatter: agents, commands, and skills are well-formed', () => {
  for (const a of agents) {
    const fm = frontmatter(claude('agents', `${a}.md`));
    assert.equal(fm.name, a);
    assert.ok(fm.description && fm.description.length < 400, `${a}: description missing or too long`);
    assert.ok(['haiku', 'sonnet', 'opus', 'fable', 'inherit'].includes(fm.model), `${a}: model ${fm.model}`);
  }
  for (const s of skills) {
    const fm = frontmatter(claude('skills', s, 'SKILL.md'));
    assert.equal(fm.name, s, `skill folder ${s} has name ${fm.name}`);
    assert.ok(fm.description, `${s}: no description`);
  }
  for (const ns of fs.readdirSync(claude('commands'))) {
    for (const f of fs.readdirSync(claude('commands', ns))) assert.ok(frontmatter(claude('commands', ns, f)).description, `${ns}/${f}: no description`);
  }
});

test('path-scoped rules and the design template are where the loader expects them', () => {
  assert.ok(!fs.existsSync(claude('rules', 'DESIGN.md')), 'DESIGN.md must not load in every session');
  assert.ok(fs.existsSync(claude('templates', 'DESIGN.md')));
  for (const f of walk(claude('rules'))) {
    const text = fs.readFileSync(f, 'utf-8');
    if (text.startsWith('---')) assert.match(text, /^---\npaths:\n/, `${path.relative(REPO, f)}: frontmatter must hold only paths:`);
  }
});

test('shipped files carry no personal names or hosts', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, 'package.json'), 'utf-8'));
  const shipped = pkg.files.filter((f) => !['gitignore'].includes(f)).flatMap((f) => walk(path.join(REPO, f)));
  for (const f of shipped.filter((x) => /\.(md|js|cjs|json|ya?ml|txt)$/.test(x))) {
    const text = fs.readFileSync(f, 'utf-8');
    assert.doesNotMatch(text, /syahiid|kamil|hostinger/i, `${path.relative(REPO, f)} has a personal identifier`);
  }
});

test('vendored skills are pinned in skills.lock.json with their license', () => {
  const lock = JSON.parse(fs.readFileSync(path.join(REPO, 'skills.lock.json'), 'utf-8'));
  for (const [name, entry] of Object.entries(lock.skills)) {
    assert.ok(skills.includes(name), `lock lists missing skill ${name}`);
    assert.match(entry.commit, /^[0-9a-f]{40}$/);
    assert.ok(fs.readdirSync(claude('skills', name)).some((f) => /^LICENSE/.test(f)), `${name} has no license file`);
  }
});
