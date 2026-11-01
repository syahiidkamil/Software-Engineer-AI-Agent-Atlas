const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const lib = require('../.claude/scripts/lib/atlas.cjs');
const ws = require('../.claude/scripts/lib/workspace.cjs');
const { tempDir } = require('./helpers.cjs');

test('dotenv: parse handles export, quotes, escapes, comments, multiline', () => {
  const env = lib.parseEnv([
    '# comment',
    'export A=plain # trailing comment',
    'B="with \\"quotes\\" and\\nnewline"',
    "C='single $not #comment'",
    'D="line1',
    'line2"',
    'E=',
    'not a line',
  ].join('\n'));
  assert.equal(env.get('A'), 'plain');
  assert.equal(env.get('B'), 'with "quotes" and\nnewline');
  assert.equal(env.get('C'), 'single $not #comment');
  assert.equal(env.get('D'), 'line1\nline2');
  assert.equal(env.get('E'), '');
  assert.equal(env.size, 5);
});

test('dotenv: serialize round-trips awkward values', () => {
  for (const v of ['simple', 'p@ss:word/1', 'has space', 'dollar$sign', "it's", 'multi\nline', 'back\\slash"quote', '#hash']) {
    const parsed = lib.parseEnv(`K=${lib.serializeEnvValue(v)}`);
    assert.equal(parsed.get('K'), v, `round-trip failed for ${JSON.stringify(v)}`);
  }
});

test('dotenv: updateEnvFile sets, replaces, and removes one key, keeping the rest', () => {
  const file = path.join(tempDir(), 'x.env');
  fs.writeFileSync(file, '# keep me\nA=1\nB="multi\nline"\nC=3\n');
  assert.equal(lib.updateEnvFile(file, 'B', 'new'), true);
  assert.equal(lib.updateEnvFile(file, 'D', 'four'), false);
  lib.updateEnvFile(file, 'A', undefined);
  const text = fs.readFileSync(file, 'utf-8');
  assert.match(text, /# keep me/);
  assert.deepEqual([...lib.parseEnv(text)], [['B', 'new'], ['C', '3'], ['D', 'four']]);
  if (process.platform !== 'win32') assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('env example: names, defaults, comments', () => {
  const keys = lib.parseEnvExample('# the db\nDATABASE_URL=\nPORT=3000\n\n# COMMENTED=out\n');
  assert.deepEqual(keys, [
    { name: 'DATABASE_URL', fallback: '', comment: 'the db' },
    { name: 'PORT', fallback: '3000', comment: '' },
  ]);
});

test('names: slugify and validation', () => {
  assert.equal(lib.slugify('My Cool App'), 'my-cool-app');
  assert.equal(lib.slugify('bankAssetManagement'), 'bank-asset-management');
  assert.throws(() => lib.validateProjectName('general'));
  assert.throws(() => lib.validateProjectName('Bad Name'));
  assert.doesNotThrow(() => lib.validateProjectName('shop-2.web'));
});

test('config: missing file means repo mode with the folder name', () => {
  const root = path.join(tempDir(), 'Saori-Hibana');
  fs.mkdirSync(root);
  assert.deepEqual(lib.readConfig(root), { mode: 'repo', project: 'saori-hibana' });
});

test('masker: holds a possible secret through a pause, masks escaped and multi-line forms', () => {
  const run = (chunks, secrets) => {
    let out = '';
    const m = lib.createMasker(secrets, (s) => (out += s));
    for (const c of chunks) m.push(c);
    m.end();
    return out;
  };
  let seen = '';
  const m = lib.createMasker(['sk-live-ROTATED-0000'], (s) => (seen += s));
  m.push('using key sk-live-RO');
  assert.equal(seen, 'using key ', 'the partial value is held back, not flushed');
  m.push('TATED-0000 ok');
  m.end();
  assert.equal(seen, 'using key **** ok');
  assert.equal(run([JSON.stringify({ p: 'p@ss\\w0rd"x9' })], ['p@ss\\w0rd"x9']), '{"p":"****"}');
  const pem = '-----BEGIN KEY-----\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLI\n-----END KEY-----';
  assert.equal(run([pem.replace(/\n/g, '\r\n')], [pem]), '****');
  assert.equal(run(['body: MIIBOgIBAAJBAKj34GkxFhD90vcNLYLI'], [pem]), 'body: ****');
});

test('dotenv: updateEnvFile leaves hand-edited multi-line neighbours intact', () => {
  const file = path.join(tempDir(), 'y.env');
  fs.writeFileSync(file, "A=1\nPEM='-----BEGIN\nBODY\n-----END'\nB=\"abc\\\\\"\nC=3\n");
  lib.updateEnvFile(file, 'PEM', undefined);
  lib.updateEnvFile(file, 'B', undefined);
  assert.equal(fs.readFileSync(file, 'utf-8'), 'A=1\nC=3\n');
});

test('masker: hides secrets even when split across chunks', async () => {
  let out = '';
  const m = lib.createMasker(['supersecret123', 'short'], (s) => (out += s));
  m.push('token=super');
  m.push('secret123 done; short stays');
  m.end();
  assert.equal(out, 'token=**** done; short stays');
});

test('windows cmd quoting escapes metacharacters', () => {
  assert.equal(lib.escapeCmdArg('a b'), '^"a^ b^"');
  assert.equal(lib.escapeCmdArg('x&y'), '^"x^&y^"');
  assert.equal(lib.escapeCmdArg('say "hi"'), '^"say^ \\^"hi\\^"^"');
  assert.equal(lib.escapeCmdArg('a&b', true), '^^^"a^^^&b^^^"', 'node_modules/.bin shims get escaped twice');
});

test('workspace block: inserted from token, replaced on mode change, idempotent', () => {
  const variant = '# CLAUDE.md\n\n## Core Documents\n\n- @NOTES.md - notes\n{{WORKSPACE_BLOCK}}\n\n## Next\n';
  const repo = ws.setWorkspaceBlock(variant, 'repo');
  assert.match(repo, /@PROJECT\.md/);
  const multi = ws.setWorkspaceBlock(repo, 'multi');
  assert.match(multi, /@index\.md/);
  assert.doesNotMatch(multi, /@PROJECT\.md/);
  assert.equal(ws.setWorkspaceBlock(multi, 'multi'), multi);
  // a CLAUDE.md from an older ATLAS has no markers: the block goes after the Core Documents list
  const legacy = '# X\n\n## Core Documents\n\n- @a.md - a\n- @b.md - b\n\n## How I Work\n';
  const upgraded = ws.setWorkspaceBlock(legacy, 'project');
  assert.match(upgraded, /- @b\.md - b\n<!-- atlas:workspace start[^\n]*\n- @PROJECT\.md[^\n]*\n<!-- atlas:workspace end -->\n\n## How I Work/);
});

test('index.md: upsert keeps order, escapes pipes, preserves surrounding text', () => {
  let text = ws.template('index.md');
  text = ws.upsertIndexRow(text, { Project: 'shop', Stage: 'mvp', Status: 'checkout | payments' });
  text = ws.upsertIndexRow(text, { Project: 'notes', Stage: 'toy' });
  text = ws.upsertIndexRow(text, { Project: 'shop', Status: 'launched' });
  const { rows } = ws.parseIndex(text);
  assert.deepEqual(rows.map((r) => [r.Project, r.Stage, r.Status]), [['notes', 'toy', ''], ['shop', 'mvp', 'launched']]);
  assert.match(text, /`general\/` holds work outside any project/);
});

test('gitignore: merge adds missing lines once and never removes user lines', () => {
  const once = ws.mergeGitignore('node_modules/\n.env.local\n', 'multi');
  assert.match(once, /^node_modules\//);
  assert.match(once, /\.atlas\/secrets\//);
  assert.match(once, /projects\/\*\/repos\/\*\//);
  assert.equal(once.split('\n').filter((l) => l === '**/.env.local').length, 1);
  assert.ok(once.split('\n').includes('.env.local'), "the user's own line stays");
  assert.equal(ws.mergeGitignore(once, 'multi'), once);
});

test('project files: multi map is CLAUDE.md, other modes PROJECT.md; stage validated', () => {
  assert.deepEqual(Object.keys(ws.projectFiles('multi', { name: 'shop' })), ['CLAUDE.md', 'STATUS.md', '.env.example']);
  const files = ws.projectFiles('repo', { name: 'shop', stage: 'toy', oneLine: 'a shop' });
  assert.match(files['PROJECT.md'], /^# shop\n\nStage: toy\nOne line: a shop/);
  assert.match(files['.env.example'], /secrets\.cjs link\n/);
  assert.throws(() => ws.projectFiles('repo', { name: 'x', stage: 'enterprise' }));
});
