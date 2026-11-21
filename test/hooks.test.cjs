const test = require('node:test');
const assert = require('node:assert/strict');
const { decide } = require('../.claude/hooks/guard-secrets.cjs');
const { spokenName } = require('../.claude/hooks/notify.cjs');
const { instructions } = require('../.claude/hooks/compact-keep.cjs');
const { workspace, write, hook } = require('./helpers.cjs');

test('guard: blocks commands that touch secrets or real env files', () => {
  for (const cmd of [
    'cat .env',
    'cat .env.local',
    'less ./.env',
    'grep KEY projects/shop/.env.production',
    'cat .atlas/secrets/global.env',
    'ls .atlas/secrets/',
    'cp .env.example .env.local',
    'source .env && npm run dev',
    'type C:\\ws\\.env',
    'node .claude/scripts/secrets.cjs link --out .env; cat .env',
    // bypasses found in adversarial review
    'cat .env*',
    'tail -n +1 projects/shop/.env*',
    'find . -name ".env*" -exec cat {} +',
    'cd .atlas && cat secrets/global.env',
    'cat .atlas/*/global.env',
    'node .claude/scripts/secrets.cjs keys shop\ncat .atlas/secrets/projects/blog.env',
    'node .claude/scripts/secrets.cjs run shop -- cat .atlas/secrets/projects/blog.env',
    'node .claude/scripts/db.cjs shop-prod -f .atlas/secrets/global.env',
  ]) assert.ok(decide(cmd), `should deny: ${cmd}`);
});

test('guard: allows contracts, env access in code, and the approved scripts', () => {
  for (const cmd of [
    'cat .env.example',
    'git add .env.example',
    'node -e "console.log(process.env.FOO)"',
    'echo $HOME/.envrc',
    'vite build --mode production',
    'npm run env',
    'git status',
    'node .claude/scripts/secrets.cjs link shop --out .env',
    'node .claude/scripts/db.cjs list',
    'node .claude/scripts/secrets.cjs set KEY --project shop',
    // metadata-only commands and source files are not secrets
    'git rm --cached .env',
    'git check-ignore -v .env',
    'ls -la .env',
    'cat src/config/.env.ts',
    'cd .atlas && cat config.json',
  ]) assert.equal(decide(cmd), null, `should allow: ${cmd}`);
});

test('guard: emits a PreToolUse deny decision, silent otherwise', () => {
  const deny = hook('guard-secrets.cjs', [], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'cat .env' } }) });
  assert.equal(deny.status, 0);
  const out = JSON.parse(deny.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, 'PreToolUse');
  assert.equal(out.hookSpecificOutput.permissionDecision, 'deny');
  const allow = hook('guard-secrets.cjs', [], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'ls' } }) });
  assert.equal(allow.status, 0);
  assert.equal(allow.stdout, '');
  assert.equal(hook('guard-secrets.cjs', [], { input: 'not json' }).status, 0);
});

test('notify: first word plus initials', () => {
  assert.equal(spokenName('saori-hibana'), 'saori sh');
  assert.equal(spokenName('bank-asset-management-atlas'), 'bank bama');
  assert.equal(spokenName('shop'), 'shop');
  assert.equal(spokenName('my_cool.app'), 'my mca');
  assert.equal(spokenName('bankAsset'), 'bank ba');
  assert.equal(spokenName('@org/pkg-name'), 'org opn');
});

function dryRun(root, args, input = '', env = {}) {
  const r = hook('notify.cjs', [...args, '--dry-run'], { root, input, env });
  assert.equal(r.status, 0);
  return /^message: (.*)$/m.exec(r.stdout)[1];
}

test('notify: repo mode speaks the workspace folder name', () => {
  const root = workspace({ mode: 'repo' });
  const folder = spokenName(require('path').basename(root));
  assert.equal(dryRun(root, ['done']), `${folder} done`);
  assert.equal(dryRun(root, ['ask', 'input']), `${folder} ask input`);
  assert.equal(dryRun(root, ['done'], '', { ATLAS_NOTIFY_NAME: 'saori-hibana' }), 'saori sh done');
});

test('notify: multi mode names the project from cwd or the transcript', () => {
  const root = workspace({ mode: 'multi' }, { 'projects/bank-asset-management/CLAUDE.md': '', 'projects/shop/CLAUDE.md': '' });
  const transcript = write(root, 't.jsonl', [
    JSON.stringify({ message: { content: [{ type: 'tool_use', input: { file_path: `${root}/projects/shop/src/a.ts` } }] } }),
    '{"broken json',
    JSON.stringify({ message: { content: [{ type: 'tool_use', input: { command: 'cd projects/bank-asset-management/repos/api && npm test' } }] } }),
    JSON.stringify({ message: { content: [{ type: 'text', text: 'projects/shop/ mentioned in prose only' }] } }),
  ].join('\n'));
  assert.equal(dryRun(root, ['done'], JSON.stringify({ transcript_path: transcript, cwd: root })), 'bank bam done');
  assert.equal(dryRun(root, ['done'], JSON.stringify({ cwd: `${root}/projects/shop/src` })), 'shop done');
  // unknown project names are ignored; fall back to the workspace folder
  const t2 = write(root, 't2.jsonl', JSON.stringify({ message: { content: [{ type: 'tool_use', input: { file_path: '/x/projects/ghost/a' } }] } }));
  assert.equal(dryRun(root, ['done'], JSON.stringify({ transcript_path: t2 })), `${spokenName(require('path').basename(root))} done`);
});

test('notify: never fails, even with garbage input or opted out', () => {
  const root = workspace({ mode: 'multi' });
  assert.equal(hook('notify.cjs', ['done', '--dry-run'], { root, input: '{{{' }).status, 0);
  assert.equal(hook('notify.cjs', ['done'], { root, env: { ATLAS_NOTIFY: 'off' } }).status, 0);
});

test('compact-keep: the summary is told to keep approvals, constraints and progress', () => {
  const out = hook('compact-keep.cjs', [], { input: JSON.stringify({ hook_event_name: 'PreCompact', trigger: 'auto', custom_instructions: null }) });
  assert.equal(out.status, 0);
  for (const kept of [/approved/, /rejected or said to leave alone/, /Standing instructions/, /done and verified/, /what is left/, /Decisions made/, /Paths of the files/]) assert.match(out.stdout, kept);
  assert.doesNotMatch(out.stdout, /The user's own instructions/, 'nothing is invented when the user gave none');
  assert.ok(out.stdout.length < 2000, 'instructions stay short: they are read on every compaction');
});

test('compact-keep: what the user typed after /compact is repeated, and wins', () => {
  const text = instructions({ trigger: 'manual', custom_instructions: '  focus on the migration  ' }, null);
  assert.match(text, /The user's own instructions for this compaction, which come first where the two disagree:\nfocus on the migration$/);
  assert.doesNotMatch(instructions({ custom_instructions: '   ' }, null), /The user's own instructions/);
  assert.doesNotMatch(instructions({ custom_instructions: { not: 'a string' } }, null), /The user's own instructions/);
});

test('compact-keep: never blocks a compaction, whatever arrives on stdin', () => {
  // exit code 2 from a PreCompact hook blocks the compaction, so no input may produce it
  for (const input of ['not json', '', 'null', '[]', '{"custom_instructions":5}']) {
    const out = hook('compact-keep.cjs', [], { input });
    assert.equal(out.status, 0, JSON.stringify(input));
    assert.match(out.stdout, /Keep these in the summary/, JSON.stringify(input));
    assert.equal(out.stderr, '');
  }
});

test('compact-keep: in a multi-mode workspace it names the project the session is on', () => {
  const root = workspace({ mode: 'multi' }, { 'projects/shop/CLAUDE.md': '', 'projects/blog/CLAUDE.md': '' });
  const run = (input, at = root) => hook('compact-keep.cjs', [], { root: at, input: JSON.stringify(input) });
  assert.match(run({ cwd: `${root}/projects/shop/src` }).stdout, /working on the project "shop" \(projects\/shop\/\)/);
  const transcript = write(root, 't.jsonl', JSON.stringify({ message: { content: [{ type: 'tool_use', input: { command: 'cd projects/blog/repos/web && npm test' } }] } }));
  assert.match(run({ cwd: root, transcript_path: transcript }).stdout, /working on the project "blog"/);
  assert.doesNotMatch(run({ cwd: root }).stdout, /working on the project/, 'no guess when nothing points at a project');
  const single = workspace({ mode: 'repo' }, { 'projects/shop/CLAUDE.md': '' });
  assert.doesNotMatch(run({ cwd: `${single}/projects/shop` }, single).stdout, /working on the project/, 'one project at the root needs no name');
});
