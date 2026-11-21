// Runs the real scaffolder with piped answers, one workspace per mode, and
// checks the result. Piped stdin uses the numeric fallback prompts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { REPO, tempDir, write, read, exists, cli, scaffold, legacy } = require('./helpers.cjs');
const tpl = require('../bin/lib/template.js');
const installer = require('../bin/install.js');

const REMOVED = [
  '.claude/agents/code-explorer.md', '.claude/agents/code-architect.md', '.claude/agents/code-review.md',
  '.claude/agents/code-simplifier.md', '.claude/agents/qa-manual-tester.md', '.claude/commands/plandev',
  '.claude/hooks/task-complete.wav', '.claude/hooks/task-complete.cjs', '.claude/hooks/ask-user-input.cjs',
  '.claude/rules/DESIGN.md', 'misc/goals', 'misc/prompts', 'repos/backend',
];

function commonChecks(dir) {
  for (const f of [
    'CLAUDE.md', 'NOTES.md', '.gitignore', '.gitattributes', '.atlas/config.json', '.atlas/installed.json', '.claude/atlas-manifest.json',
    '.claude/settings.json', '.claude/settings.local.json', '.claude/rules/workspace.md',
    '.claude/agents/manual-qa-haiku.md', '.claude/agents/manual-qa-sonnet.md', '.claude/agents/commit.md',
    '.claude/hooks/notify.cjs', '.claude/hooks/guard-secrets.cjs', '.claude/scripts/lib/atlas.cjs',
    '.claude/scripts/secrets.cjs', '.claude/scripts/db.cjs', '.claude/templates/DESIGN.md',
    '.claude/commands/atlas/mode.md', '.claude/commands/deploy/run.md',
  ]) assert.ok(exists(dir, f), `missing ${f}`);
  for (const f of REMOVED) assert.ok(!exists(dir, f), `should not exist: ${f}`);
  const shared = JSON.parse(read(dir, '.claude/settings.json'));
  assert.ok(shared.permissions.deny.includes('Read(/.atlas/secrets/**)'));
  assert.match(shared.hooks.PreToolUse[0].hooks[0].command, /guard-secrets\.cjs"$/);
  const personal = JSON.parse(read(dir, '.claude/settings.local.json'));
  const commands = Object.values(personal.hooks).flat().map((g) => g.hooks[0].command);
  assert.ok(commands.every((c) => c.startsWith('node "${CLAUDE_PROJECT_DIR}/.claude/hooks/notify.cjs"')), commands.join('\n'));
  assert.ok(!JSON.stringify(personal).includes(':-$PWD'), 'no POSIX-only fallbacks');
  assert.ok(!JSON.stringify(personal).includes('lsof'), 'no POSIX-only port checks');
  assert.match(read(dir, '.gitignore'), /\.atlas\/secrets\//);
  assert.match(read(dir, '.gitignore'), /\.claude\/settings\.local\.json/);
  assert.doesNotMatch(read(dir, 'CLAUDE.md'), /\{\{/);
  // every shipped hook and script runs inside the scaffold
  for (const h of ['notify.cjs']) {
    const r = spawnSync(process.execPath, [path.join(dir, '.claude', 'hooks', h), 'done', '--dry-run'], { encoding: 'utf-8', input: '' });
    assert.equal(r.status, 0, r.stderr);
  }
  for (const s of ['secrets.cjs', 'db.cjs', 'project.cjs', 'mode.cjs', 'port.cjs']) {
    const r = spawnSync(process.execPath, [path.join(dir, '.claude', 'scripts', s), '--help'], { encoding: 'utf-8' });
    assert.equal(r.status, 0, `${s}: ${r.stderr}`);
  }
}

// answers: flavor, partner, mode, project, stage, browser, [profile], skills, compact, advisor, [file], commit
test('scaffold: repo mode, collaborative, Playwright CLI, compaction shared', () => {
  const { dir } = scaffold(['3', 'Ada', '1', '', '2', '3', '1', '', '1', '1', '2', 'n']);
  commonChecks(dir);
  assert.deepEqual(JSON.parse(read(dir, '.atlas/config.json')).mode, 'repo');
  assert.equal(JSON.parse(read(dir, '.atlas/config.json')).project, 'saori-hibana');
  assert.ok(exists(dir, 'PROJECT.md') && exists(dir, 'STATUS.md') && exists(dir, '.env.example'));
  assert.match(read(dir, 'PROJECT.md'), /Stage: mvp/);
  assert.match(read(dir, 'CLAUDE.md'), /@PROJECT\.md/);
  assert.match(read(dir, 'CLAUDE.md'), /partner Ada/);
  assert.ok(exists(dir, '.claude/skills/playwright-cli/SKILL.md'));
  assert.ok(exists(dir, '.claude/skills/deploy/SKILL.md'));
  assert.ok(!exists(dir, '.claude/skills/free-will'), 'free-will only auto-installs for autonomous');
  assert.equal(JSON.parse(read(dir, '.claude/settings.json')).env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, '50');
  assert.equal(JSON.parse(read(dir, '.playwright/cli.config.json')).browser.isolated, true);
  assert.ok(!exists(dir, 'docs/decision_logs'), 'docs grow on demand');
});

test('scaffold: project mode, autonomous, Playwright MCP persistent, advisor personal', () => {
  const { dir } = scaffold(['2', 'Ada', '2', 'Shop App', '3', '2', '2', '', '3', '2', '1', 'n']);
  commonChecks(dir);
  const config = JSON.parse(read(dir, '.atlas/config.json'));
  assert.deepEqual([config.mode, config.project], ['project', 'shop-app']);
  assert.ok(exists(dir, 'repos/.gitkeep'));
  assert.match(read(dir, '.gitignore'), /^repos\/\*\/$/m);
  assert.match(read(dir, 'PROJECT.md'), /Stage: production/);
  assert.ok(exists(dir, '.claude/skills/free-will/SKILL.md'));
  const personal = JSON.parse(read(dir, '.claude/settings.local.json'));
  assert.equal(personal.advisorModel, 'opus');
  assert.equal(personal.env, undefined, 'compaction left at default');
  assert.deepEqual(personal.enabledMcpjsonServers, ['playwright']);
  assert.ok(JSON.parse(read(dir, '.mcp.json')).mcpServers.playwright.args.some((a) => a.startsWith('--user-data-dir')));
  assert.ok(!('postgres' in JSON.parse(read(dir, '.mcp.json')).mcpServers));
});

test('scaffold: multi mode, vanilla, first project, MCP forced isolated', () => {
  const { dir } = scaffold(['1', '3', 'shop', '1', '2', '', '3', '1', 'n']);
  commonChecks(dir);
  assert.deepEqual(JSON.parse(read(dir, '.atlas/config.json')).mode, 'multi');
  assert.ok(exists(dir, 'projects/shop/CLAUDE.md') && exists(dir, 'projects/shop/STATUS.md'));
  assert.ok(exists(dir, 'general/.gitkeep'));
  assert.match(read(dir, 'index.md'), /\| shop \| {2}\| toy \|/);
  assert.match(read(dir, 'CLAUDE.md'), /@index\.md/);
  assert.ok(!exists(dir, 'misc/self'), 'vanilla has no identity');
  assert.ok(JSON.parse(read(dir, '.mcp.json')).mcpServers.playwright.args.includes('--isolated'));
  assert.match(read(dir, '.gitignore'), /projects\/\*\/repos\/\*\//);
});

test('scaffold: multi mode without a first project, defaults everywhere', () => {
  const { dir, out } = scaffold(['', 'Ada', '', '', '', '', '', '', '', 'n']);
  commonChecks(dir);
  assert.match(out, /Mode:\s+multi/);
  assert.ok(exists(dir, 'projects/.gitkeep'));
  assert.ok(exists(dir, 'misc/self/atlas.md'));
  assert.doesNotMatch(read(dir, 'misc/self/atlas.md'), /\bBoss\b/);
  assert.equal(JSON.parse(read(dir, '.claude/settings.local.json')).env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE, '50');
});

test('scaffold: upgrading a 2.6 workspace drops the old hooks and files instead of doubling them', () => {
  const into = tempDir();
  // the files exactly as 2.6.4 shipped them: that content is what makes them ATLAS's to remove
  const shipped = legacy();
  for (const [rel, buf] of Object.entries(shipped)) write(into, rel, buf);
  write(into, '.claude/hooks/task-complete.wav', 'my own sound, at the old name');
  const old = (s) => ({ matcher: '', hooks: [{ type: 'command', command: `node "\${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/${s}"` }] });
  const mine = { hooks: [{ type: 'command', command: 'afplay .claude/hooks/task-complete.wav' }] };
  write(into, '.claude/settings.local.json', JSON.stringify({
    hooks: { Stop: [old('task-complete.cjs'), mine], PreToolUse: [{ ...old('ask-user-input.cjs'), matcher: 'AskUserQuestion' }], Notification: { bad: 'shape' } },
  }));
  write(into, 'package.json', '{}');
  const { out } = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into });
  for (const gone of [...Object.keys(shipped), '.claude/commands/plandev', '.claude/rules/DESIGN.md']) {
    assert.ok(!exists(into, gone), `${gone} should be removed`);
  }
  assert.equal(read(into, '.claude/hooks/task-complete.wav'), 'my own sound, at the old name', 'a file at an old path with other content is the user\'s');
  assert.match(out, /kept your \.claude\/hooks\/task-complete\.wav/);
  const hooks = JSON.parse(read(into, '.claude/settings.local.json')).hooks;
  assert.deepEqual(hooks.Notification, { bad: 'shape' }, 'a shape it does not understand is left alone');
  const commands = [...hooks.Stop, ...hooks.PreToolUse].flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(!commands.some((c) => /task-complete\.cjs|ask-user-input/.test(c)), commands.join('\n'));
  assert.ok(hooks.Stop.some((g) => g.hooks[0].command === mine.hooks[0].command), 'the user\'s own Stop hook stays');
  assert.equal(hooks.Stop.length, 2, 'the old hook is gone, the user\'s and the new one are there');
});

test('scaffold: into an existing repo, keeps its files and merges .gitignore and settings', () => {
  const into = tempDir();
  fs.writeFileSync(path.join(into, 'package.json'), '{"name":"existing"}');
  fs.writeFileSync(path.join(into, 'NOTES.md'), '# my notes\n');
  fs.writeFileSync(path.join(into, '.gitignore'), 'node_modules/\n');
  fs.writeFileSync(path.join(into, '.env.example'), 'MY_APP_KEY=\n');
  fs.mkdirSync(path.join(into, '.claude'));
  const myHook = { hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/task-complete.cjs"' }] };
  fs.writeFileSync(path.join(into, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: ['Bash(rm -rf:*)'] }, model: 'opus', hooks: { Stop: [myHook] } }));
  // names an older ATLAS also used: in a repo ATLAS never touched they are the user's own
  const own = {
    '.claude/agents/code-review.md': 'my reviewer\n', '.claude/commands/plandev/mine.md': 'my command\n', '.claude/hooks/task-complete.cjs': '// my hook\n',
    '.claude/rules/DESIGN.md': '# our design system\n', 'misc/archive/2019-notes.md': 'old notes of mine\n',
  };
  for (const [rel, content] of Object.entries(own)) {
    fs.mkdirSync(path.dirname(path.join(into, rel)), { recursive: true });
    fs.writeFileSync(path.join(into, rel), content);
  }
  const { dir, out } = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into });
  for (const [rel, content] of Object.entries(own)) assert.equal(read(dir, rel), content, `${rel} is the user's and stays`);
  assert.match(out, /kept your \.claude\/agents\/code-review\.md/);
  assert.match(out, /kept your \.claude\/rules\/DESIGN\.md/);
  assert.deepEqual(JSON.parse(read(dir, '.claude/settings.json')).hooks.Stop[0], myHook, 'and the hook that runs it stays wired');
  // a second run has ATLAS's own markers in the folder: the files and the hook are still the user's
  scaffold(['y', '3', 'Ada', '', '', '', '', '3', '1', 'n'], { into });
  for (const [rel, content] of Object.entries(own)) assert.equal(read(dir, rel), content, `${rel} survives a second run`);
  assert.deepEqual(JSON.parse(read(dir, '.claude/settings.json')).hooks.Stop[0], myHook);
  assert.match(out, /Mode:\s+repo/, 'detects the existing repo');
  assert.equal(read(dir, '.env.example'), 'MY_APP_KEY=\n', 'the app keeps its own env contract');
  assert.equal(read(dir, 'NOTES.md'), '# my notes\n', 'notes that were already there are never overwritten');
  assert.match(read(dir, '.gitignore'), /^node_modules\/\n/);
  const shared = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(shared.model, 'opus');
  assert.ok(shared.permissions.deny.includes('Bash(rm -rf:*)') && shared.permissions.deny.includes('Read(**/.env)'));
  assert.ok(shared.permissions.deny.includes('Read(**/.env.staging)'), 'named env files beyond production are denied');
  assert.ok(!shared.permissions.deny.some((r) => /\.env\.\*\)$/.test(r)), '.env.example stays readable: no blanket .env.* rule');
});

// answers: flavor, partner, mode, project, stage, browser, [profile], skills, compact, advisor, [replace your files?], commit
test('scaffold: asks before replacing a file of the user\'s at a path ATLAS writes, and No keeps it', () => {
  const repo = () => {
    const into = tempDir();
    write(into, 'package.json', '{}');
    write(into, '.claude/agents/commit.md', 'my own commit agent\n');
    write(into, '.mcp.json', JSON.stringify({ mcpServers: { mine: { command: 'my-server' } }, other: true }));
    write(into, '.playwright/cli.config.json', '{"mine":true}\n');
    return into;
  };
  // No (the default): theirs stays, is not recorded as installed, and everything else is written
  const kept = repo();
  const no = scaffold(['3', 'Ada', '', '', '', '2', '', '', '3', '1', '', 'n'], { into: kept });
  assert.match(no.out, /1 path already here differs from what ATLAS ships/);
  assert.equal(read(kept, '.claude/agents/commit.md'), 'my own commit agent\n');
  const rec = JSON.parse(read(kept, '.atlas/installed.json'));
  assert.ok(!('.claude/agents/commit.md' in rec.files) && '.claude/agents/manual-qa-haiku.md' in rec.files);
  const mcp = JSON.parse(read(kept, '.mcp.json'));
  assert.deepEqual(mcp.mcpServers.mine, { command: 'my-server' }, 'the user\'s MCP servers stay');
  assert.ok(mcp.mcpServers.playwright && mcp.other === true);
  const plan = JSON.parse(cli(['update', kept, '--json']).out);
  assert.equal(plan.items.find((i) => i.path === '.claude/agents/commit.md').action, 'review', 'update shows it for a decision instead of replacing it');

  // Yes: replaced and recorded. An existing Playwright CLI config is the user's either way.
  const replaced = repo();
  scaffold(['3', 'Ada', '', '', '', '3', '', '', '3', '1', 'y', 'n'], { into: replaced });
  assert.equal(read(replaced, '.claude/agents/commit.md'), fs.readFileSync(path.join(REPO, '.claude/agents/commit.md'), 'utf-8'));
  assert.ok('.claude/agents/commit.md' in JSON.parse(read(replaced, '.atlas/installed.json')).files);
  assert.equal(read(replaced, '.playwright/cli.config.json'), '{"mine":true}\n');

  // a CLAUDE.md of their own: agreeing to overwrite "ATLAS files" covers that file, not their agent
  const withMap = repo();
  write(withMap, 'CLAUDE.md', '# my app\n');
  const asked = scaffold(['y', '3', 'Ada', '', '', '', '', '', '3', '1', 'n', 'n'], { into: withMap });
  assert.match(asked.out, /1 path already here differs/);
  assert.equal(read(withMap, '.claude/agents/commit.md'), 'my own commit agent\n');
  assert.match(read(withMap, 'CLAUDE.md'), /ATLAS/);
});

test('scaffold: run again on a workspace, keeps its mode, what update --keep took over, and its record of skills', () => {
  const { dir } = scaffold(['3', 'Ada', '3', '', '', '', '3', '1', 'n']);
  const first = JSON.parse(read(dir, '.atlas/installed.json'));
  const ws = require('../.claude/scripts/lib/workspace.cjs');
  assert.ok(tpl.blockHashes(ws.workspaceBlock).every((h) => first.blocks.includes(h)), 'the record knows the managed block of every mode');
  assert.equal(new Set(first.blocks).size, first.blocks.length, 'each once');
  assert.ok(first.skills.length > 0 && Array.isArray(first.kept));
  // a file with the very content 2.6.4 shipped, which the user kept on purpose
  const [[rel, buf]] = Object.entries(legacy());
  write(dir, rel, buf);
  write(dir, '.gitignore', 'only-mine/\n');
  write(dir, '.atlas/installed.json', JSON.stringify({ ...first, kept: [rel, '.gitignore'] }));
  // an ATLAS file the user edited, and a same-named file ATLAS never installed here
  write(dir, '.claude/commands/git/log.md', 'edited by me\n');
  const { [`.claude/agents/commit.md`]: dropped, ...files } = first.files;
  write(dir, '.atlas/installed.json', JSON.stringify({ ...first, kept: [rel, '.gitignore'], files }));
  write(dir, '.claude/agents/commit.md', 'my own commit agent\n');
  // and one ATLAS installed that is untouched, in a state where the template has moved on
  write(dir, '.claude/commands/atlas/mode.md', 'the older text of this command\n');
  const older = { ...files, '.claude/commands/atlas/mode.md': tpl.hash('.claude/commands/atlas/mode.md', Buffer.from('the older text of this command\n')) };
  // a template file taken over with --keep, a folder still waiting on a decision, and the
  // managed block of an older version: all three are things only the record remembers
  const QA = '.claude/agents/manual-qa-haiku.md';
  write(dir, QA, 'my own QA agent\n');
  write(dir, '.claude/skills/find-skills/SKILL.md', 'whose is this?\n');
  write(dir, '.atlas/installed.json', JSON.stringify({ ...first, kept: [rel, '.gitignore', QA], unsure: ['find-skills'], blocks: [...first.blocks, 'an-older-block'], files: older }));
  const again = scaffold(['y', '3', 'Ada', '', '', '', '', '3', '1', '', 'n'], { into: dir });
  assert.match(again.out, /2 paths already here differ/);
  assert.equal(read(dir, '.claude/commands/git/log.md'), 'edited by me\n', 'an ATLAS file the user edited is asked about, and No keeps it');
  assert.equal(read(dir, '.claude/agents/commit.md'), 'my own commit agent\n', 'so is a file the record never listed');
  assert.equal(read(dir, '.claude/commands/atlas/mode.md'), fs.readFileSync(path.join(REPO, '.claude/commands/atlas/mode.md'), 'utf-8'), 'a file still as ATLAS installed it is replaced without asking');
  assert.ok(dropped);
  const second = JSON.parse(read(dir, '.atlas/installed.json'));
  assert.equal(second.files['.claude/commands/git/log.md'], first.files['.claude/commands/git/log.md'], 'the baseline of a kept file is carried over, so update can still merge it');
  assert.ok(!('.claude/agents/commit.md' in second.files));
  assert.deepEqual(second.skills, first.skills);
  assert.match(again.out, /Mode:\s+multi/, 'Enter at the mode prompt keeps the mode the workspace has');
  assert.ok(exists(dir, rel), 'a kept path is not cleaned up as a leftover');
  assert.equal(read(dir, '.gitignore'), 'only-mine/\n', 'a kept file gains no lines');
  assert.equal(read(dir, QA), 'my own QA agent\n', 'a kept template file is not written');
  assert.deepEqual(second.kept, ['.gitignore', rel, QA].sort());
  assert.deepEqual(second.unsure, ['find-skills']);
  assert.ok(second.blocks.includes('an-older-block') && first.blocks.every((h) => second.blocks.includes(h)));
});

test('scaffold: refuses before the first write when a path is a symlink or the wrong kind', { skip: process.platform === 'win32' }, () => {
  const answers = ['3', 'Ada', '', '', '', '2', '', '', '3', '1', 'n'].join('\n') + '\n';
  const cases = {
    '.atlas': (into, outside) => fs.symlinkSync(outside, path.join(into, '.atlas')),
    '.gitignore': (into, outside) => fs.symlinkSync(write(outside, 'shared-ignore', 'mine\n'), path.join(into, '.gitignore')),
    '.claude/settings.json': (into, outside) => {
      fs.mkdirSync(path.join(into, '.claude'));
      fs.symlinkSync(write(outside, 'settings.json', '{}\n'), path.join(into, '.claude', 'settings.json'));
    },
    '.claude/settings.local.json': (into, outside) => {
      fs.mkdirSync(path.join(into, '.claude'));
      fs.symlinkSync(write(outside, 'local.json', '{}\n'), path.join(into, '.claude', 'settings.local.json'));
    },
    '.mcp.json': (into, outside) => fs.symlinkSync(write(outside, 'mcp.json', '{}\n'), path.join(into, '.mcp.json')),
    '.claude/skills': (into, outside) => {
      fs.mkdirSync(path.join(into, '.claude'));
      fs.symlinkSync(outside, path.join(into, '.claude', 'skills'));
    },
    '.claude/agents/commit.md/': (into) => write(into, '.claude/agents/commit.md/inner.md', 'a folder where a file goes\n'),
  };
  for (const [what, setup] of Object.entries(cases)) {
    const into = tempDir();
    const outside = tempDir();
    write(into, 'package.json', '{}');
    setup(into, outside);
    const before = fs.readdirSync(outside).map((n) => [n, fs.readFileSync(path.join(outside, n), 'utf-8')]);
    const r = cli(['new-project', into], { input: answers });
    assert.equal(r.status, 1, what);
    assert.match(r.err, /nothing was written/, what);
    assert.ok(r.err.includes(what), `${what} is named: ${r.err}`);
    assert.ok(!exists(into, 'CLAUDE.md') && !exists(into, 'NOTES.md'), `${what}: the folder is as it was`);
    assert.deepEqual(fs.readdirSync(outside).map((n) => [n, fs.readFileSync(path.join(outside, n), 'utf-8')]), before, `${what}: nothing landed behind the link`);
  }
  // the same guard sits on the write itself, not only on the check before it
  const root = tempDir();
  fs.symlinkSync(tempDir(), path.join(root, 'linked'));
  assert.throws(() => tpl.place(root, 'linked/file.md', Buffer.from('x'), REPO), /symlink/);
  assert.throws(() => tpl.writeRecord(root, { record: 'linked/installed.json' }, { files: {} }), /symlink/);
});

test('settings: only a hook that runs a retired script of this workspace is dropped, and odd shapes are left alone', () => {
  const cmd = (command) => ({ hooks: [{ type: 'command', command }] });
  const retired = ['.claude/hooks/task-complete.cjs', '.claude/hooks/ask-user-input.cjs', '.claude/agents/code-review.md'];
  const theirs = [
    'node ~/.claude/hooks/ask-user-input.cjs --global',
    'echo ./vendor/.claude/hooks/task-complete.cjs.bak',
    'node /opt/tools/.claude/hooks/task-complete.cjs',
    'node tools/task-complete.cjs',
    'node .claude/hooks/task-complete.cjs.disabled',
  ];
  const ours = [
    'node "${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/task-complete.cjs"',
    'node "$CLAUDE_PROJECT_DIR/.claude/hooks/task-complete.cjs" --quiet',
    'node .claude/hooks/ask-user-input.cjs',
    'node ./.claude/hooks/task-complete.cjs',
  ];
  const settings = {
    model: 'opus',
    hooks: {
      Stop: [...theirs, ...ours].map(cmd),
      Mixed: [{ matcher: 'x', hooks: [cmd(ours[0]).hooks[0], cmd(theirs[0]).hooks[0]] }],
      OnlyOurs: [cmd(ours[0])],
      Empty: [],
      NoHooks: [{ matcher: 'y' }],
      Odd: { not: 'a list' },
    },
  };
  const out = installer.dropLegacyHooks(settings, retired);
  assert.deepEqual(out.hooks.Stop, theirs.map(cmd));
  assert.deepEqual(out.hooks.Mixed, [{ matcher: 'x', hooks: [cmd(theirs[0]).hooks[0]] }], 'a group keeps its other hooks');
  assert.ok(!('OnlyOurs' in out.hooks), 'an event goes only when removing emptied it');
  assert.deepEqual([out.hooks.Empty, out.hooks.NoHooks, out.hooks.Odd, out.model], [[], [{ matcher: 'y' }], { not: 'a list' }, 'opus']);
  assert.deepEqual(installer.dropLegacyHooks(settings, []), settings, 'no script was removed, so no hook is');
  assert.deepEqual(installer.dropLegacyHooks(settings, ['.claude/hooks/task-complete.wav']), settings);

  const merged = installer.mergeSettings(
    { permissions: 'ask me', hooks: { PreToolUse: { odd: true }, Stop: [null, { matcher: 'z' }] }, defaultMode: 'plan', env: [], sandbox: { deny: 'everything' } },
    { permissions: { deny: ['x'] }, hooks: { PreToolUse: [cmd('a')], Stop: [cmd('b')] }, defaultMode: 'acceptEdits', env: { A: '1' }, sandbox: { deny: ['x'] } },
  );
  assert.deepEqual(merged, {
    permissions: 'ask me', hooks: { PreToolUse: { odd: true }, Stop: [null, { matcher: 'z' }, cmd('b')] }, defaultMode: 'plan', env: [], sandbox: { deny: 'everything' },
  });
});

test('.gitattributes, .gitignore and .mcp.json merges keep the user\'s lines, endings and choices', () => {
  const lines = (text) => text.split(/\r?\n/).filter(Boolean);
  const mine = '*.md text eol=crlf\r\n*.png binary\r\n';
  const attrs = installer.mergeLines(mine, installer.gitattributesLines(mine));
  assert.ok(attrs.startsWith(mine), 'the user\'s lines stay first and unchanged');
  assert.ok(!lines(attrs).includes('*.md text eol=lf'), 'no later line overrides the user\'s rule for *.md');
  assert.ok(lines(attrs).includes('.claude/** text=auto eol=lf'));
  assert.ok(!/[^\r]\n/.test(attrs), 'a CRLF file stays CRLF');
  assert.equal(installer.mergeLines(attrs, installer.gitattributesLines(attrs)), attrs, 'a second merge adds nothing');
  const note = installer.additiveMergers()['.gitattributes'](mine).note;
  assert.match(note, /^adds 2 lines: /, note);

  const ws = require('../.claude/scripts/lib/workspace.cjs');
  const ignore = ws.mergeGitignore('node_modules/\r\ndist/\r\n', 'repo');
  assert.ok(ignore.startsWith('node_modules/\r\ndist/\r\n') && !/[^\r]\n/.test(ignore));
  assert.equal(ws.mergeGitignore(ignore, 'repo'), ignore);

  const generated = JSON.stringify({ mcpServers: { playwright: { command: 'npx' } } });
  assert.equal(installer.mergeMcpJson(null, generated), generated);
  assert.deepEqual(JSON.parse(installer.mergeMcpJson('{"mcpServers":{"mine":{"command":"m"},"playwright":{"command":"old"}},"x":1}', generated)),
    { mcpServers: { mine: { command: 'm' }, playwright: { command: 'npx' } }, x: 1 });
  assert.equal(installer.mergeMcpJson('{"mcpServers":[]}', generated), null, 'a shape it does not understand is left to the user');
  assert.equal(installer.mergeMcpJson('[]', generated), null);
});

test('scaffold: over an ATLAS workspace, a file the user wrote or edited is listed and asked about, record or not', () => {
  const UPDATE = '.claude/commands/atlas/update.md';
  const answers = (replace) => ['y', '3', 'Ada', '', '', '', '', '3', '1', replace, 'n'];
  // no record (what a 3.0.0 workspace looks like): nothing says which file ATLAS installed
  const { dir: bare } = scaffold(['3', 'Ada', '3', '', '', '', '3', '1', 'n']);
  fs.rmSync(path.join(bare, '.atlas/installed.json'));
  write(bare, '.atlas/config.json', JSON.stringify({ mode: 'multi', version: '2.9.0' })); // older than this package, whatever its version
  write(bare, UPDATE, 'MY OWN update command\n');
  write(bare, '.claude/scripts/knowledge.cjs', '// MY OWN knowledge script\n');
  const no = scaffold(answers('n'), { into: bare });
  assert.match(no.out, /2 paths already here differ/);
  assert.match(no.out, /Nothing here records which of these an older ATLAS installed/);
  assert.equal(read(bare, UPDATE), 'MY OWN update command\n');
  assert.equal(read(bare, '.claude/scripts/knowledge.cjs'), '// MY OWN knowledge script\n');
  const rec = JSON.parse(read(bare, '.atlas/installed.json'));
  assert.ok(!(UPDATE in rec.files), 'a kept file is not recorded as installed');
  assert.equal(rec.pendingBase, '2.9.0', 'and the record says which version the open files came from');
  assert.equal(JSON.parse(read(bare, '.atlas/config.json')).version, '2.9.0', 'a config key this does not set stays');

  // a record, and a file settled with update --keep: the record holds the template's hash for it
  const { dir } = scaffold(['3', 'Ada', '3', '', '', '', '3', '1', 'n']);
  write(dir, UPDATE, 'MY OWN update command\n');
  assert.equal(cli(['update', dir, '--keep', UPDATE]).status, 0);
  scaffold(answers(''), { into: dir });
  assert.equal(read(dir, UPDATE), 'MY OWN update command\n', 'Enter is No');
  // yes replaces it, which is what the prompt said
  scaffold(answers('y'), { into: dir });
  assert.equal(read(dir, UPDATE), fs.readFileSync(path.join(REPO, UPDATE), 'utf-8'));
});

test('scaffold: a design system of the user\'s is kept, with the placeholder or without', () => {
  const real = legacy()['.claude/rules/DESIGN.md'];
  assert.ok(real && real.includes('{{PROJECT_NAME}}'), 'the fixture is the unfilled 2.x template');
  const cases = {
    'their own file that mentions the placeholder': '# Shop design\n\nHeader pattern: {{PROJECT_NAME}} · <section>\n',
    'the 2.x template with a section of theirs added': `${real.toString('utf-8')}\n## Our palette\n\nTeal and sand.\n`,
  };
  for (const [what, content] of Object.entries(cases)) {
    const into = tempDir();
    write(into, 'package.json', '{}');
    write(into, '.claude/rules/DESIGN.md', content);
    const { out } = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into });
    assert.equal(read(into, '.claude/rules/DESIGN.md'), content, what);
    assert.match(out, /kept your \.claude\/rules\/DESIGN\.md/);
  }
  // CRLF checkout of the untouched template: still the shipped file
  const into = tempDir();
  write(into, 'package.json', '{}');
  write(into, '.claude/rules/DESIGN.md', real.toString('utf-8').replace(/\r?\n/g, '\r\n'));
  scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into });
  assert.ok(!exists(into, '.claude/rules/DESIGN.md'));
});

test('scaffold: a skill folder of the user\'s gets none of the shipped skill\'s files beside theirs', () => {
  // skills answer "*" ticks every skill, deploy among them
  const run = (into, replace) => scaffold(['3', 'Ada', '', '', '', '', '*', '3', '1', replace, 'n'], { into });
  const mine = tempDir();
  write(mine, 'package.json', '{}');
  write(mine, '.claude/skills/deploy/SKILL.md', 'my own deploy skill\n');
  // a folder with the name and none of the skill's files: there is no file to compare, so the folder is asked about
  write(mine, '.claude/skills/shadcn/notes.md', 'my own notes\n');
  const { out } = run(mine, '');
  assert.match(out, /\.claude\/skills\/deploy\/SKILL\.md/);
  assert.match(out, /\.claude\/skills\/shadcn\/\n/);
  assert.deepEqual(fs.readdirSync(path.join(mine, '.claude/skills/deploy')), ['SKILL.md']);
  assert.deepEqual(fs.readdirSync(path.join(mine, '.claude/skills/shadcn')), ['notes.md']);
  const rec = JSON.parse(read(mine, '.atlas/installed.json'));
  assert.match(out, new RegExp(`Skills:\\s+${rec.skills.length} installed`), 'the summary counts the skills written, not the ones ticked');
  assert.ok(!rec.skills.includes('deploy') && !rec.skills.includes('shadcn') && rec.skills.includes('free-will'));
  assert.ok(!Object.keys(rec.files).some((rel) => /^\.claude\/skills\/(deploy|shadcn)\//.test(rel)));
  const plan = JSON.parse(cli(['update', mine, '--json']).out);
  assert.ok(plan.yours.includes('.claude/skills/deploy/') && !plan.available.includes('deploy'), 'update sees it as the user\'s too');
  assert.equal(cli(['update', mine, '--take', '.claude/skills/deploy']).status, 1);

  // a folder taken over with update --keep stays the user's on the next run, with no question
  const { dir } = scaffold(['3', 'Ada', '3', '', '', '', '3', '1', 'n']);
  const first = JSON.parse(read(dir, '.atlas/installed.json'));
  write(dir, '.claude/skills/shadcn/SKILL.md', 'my own shadcn skill\n');
  write(dir, '.atlas/installed.json', JSON.stringify({ ...first, kept: ['.claude/skills/shadcn/'] }));
  const again = scaffold(['y', '3', 'Ada', '', '', '', '*', '3', '1', 'n'], { into: dir });
  assert.doesNotMatch(again.out, /already here differ/);
  assert.match(again.out, /\.claude\/skills\/shadcn\/ is yours: none of the shadcn skill's files were written/, 'and the run says so');
  assert.deepEqual(fs.readdirSync(path.join(dir, '.claude/skills/shadcn')), ['SKILL.md']);
  assert.ok(!JSON.parse(read(dir, '.atlas/installed.json')).skills.includes('shadcn'));
  assert.equal(cli(['update', dir, '--take', '.claude/skills/shadcn']).status, 1, 'and update still refuses to write into it');
});

test('scaffold: run again with fewer skills ticked keeps the record of the skills still installed', () => {
  // "*" ticks every skill; Enter on the next run ticks the preselected ones only, and shadcn is not one
  const { dir } = scaffold(['3', 'Ada', '3', '', '', '*', '3', '1', 'n']);
  const first = JSON.parse(read(dir, '.atlas/installed.json'));
  const SKILL = '.claude/skills/shadcn/SKILL.md';
  assert.ok(first.skills.includes('shadcn') && first.skills.includes('find-skills') && first.files[SKILL]);
  fs.rmSync(path.join(dir, '.claude/skills/find-skills'), { recursive: true });
  const again = scaffold(['y', '3', 'Ada', '', '', '', '', '3', '1', 'n'], { into: dir });
  assert.doesNotMatch(again.out, /already here differ/);
  const second = JSON.parse(read(dir, '.atlas/installed.json'));
  assert.deepEqual(second.skills, first.skills.filter((name) => name !== 'find-skills'), 'a skill installed earlier and still here stays recorded; one the user deleted does not');
  assert.equal(second.files[SKILL], first.files[SKILL], 'with the baseline of its files');
  assert.ok(!Object.keys(second.files).some((rel) => rel.startsWith('.claude/skills/find-skills/')));
  const plan = JSON.parse(cli(['update', dir, '--json']).out);
  assert.ok(!plan.available.includes('shadcn') && plan.available.includes('find-skills'), 'so update still treats it as installed');
  assert.ok(!plan.yours.includes('.claude/skills/shadcn/'));
});

test('scaffold: run again with Enter keeps the project name, the other config keys, and the file\'s formatting', () => {
  const dir = path.join(tempDir(), 'shop-ws');
  scaffold(['3', 'Ada', '1', 'myapp', '2', '1', '', '3', '1', 'n'], { into: dir });
  assert.equal(JSON.parse(read(dir, '.atlas/config.json')).project, 'myapp');
  write(dir, '.atlas/config.json', JSON.stringify({ mode: 'repo', project: 'myapp', team: 'payments' }, null, 4).replace(/\n/g, '\r\n'));
  write(dir, '.claude/settings.json', JSON.stringify(JSON.parse(read(dir, '.claude/settings.json')), null, '\t'));
  const { out } = scaffold(['y', '3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into: dir });
  assert.match(out, /default: myapp/);
  assert.deepEqual(JSON.parse(read(dir, '.atlas/config.json')), { mode: 'repo', project: 'myapp', team: 'payments' });
  assert.match(read(dir, '.atlas/config.json'), /\{\r\n {4}"mode"/, 'four spaces and CRLF stay');
  assert.match(read(dir, '.claude/settings.json'), /\n\t"permissions"/, 'tabs stay');
});

test('scaffold: settings that are valid JSON but not an object stop the run before anything is written', () => {
  for (const content of ['null', '[]', '42']) {
    const into = tempDir();
    write(into, 'package.json', '{}');
    write(into, '.claude/settings.json', content);
    const r = cli(['new-project', into], { input: ['3', 'Ada', '', '', '', '', '', '3', '1', 'n'].join('\n') + '\n' });
    assert.equal(r.status, 1, content);
    assert.match(r.err, /nothing was written[\s\S]*settings\.json is not a JSON object/);
    assert.deepEqual(tpl.walk(into).sort(), ['.claude/settings.json', 'package.json']);
    assert.equal(read(into, '.claude/settings.json'), content);
  }
});

test('scaffold: in a repo with uncommitted work, Enter at the commit prompt does not commit', () => {
  const into = tempDir();
  const git = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: into, encoding: 'utf-8' });
  if (git('init', '-q').status !== 0) return; // no git on this machine
  write(into, 'package.json', '{}');
  git('add', '-A');
  git('commit', '-qm', 'init');
  write(into, 'src/wip.js', '// half done\n');
  const { out } = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', ''], { into });
  assert.match(out, /had uncommitted changes before the scaffold/);
  assert.equal(git('rev-list', '--count', 'HEAD').stdout.trim(), '1', 'no commit was made');
  // a clean repo keeps the old default: Enter commits the scaffold
  const clean = tempDir();
  const gitc = (...args) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: clean, encoding: 'utf-8' });
  gitc('init', '-q');
  write(clean, 'package.json', '{}');
  gitc('add', '-A');
  gitc('commit', '-qm', 'init');
  scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', ''], { into: clean });
  assert.equal(gitc('rev-list', '--count', 'HEAD').stdout.trim(), '2');
});

test('gitattributes: a rule of the user\'s for every file keeps ATLAS off their documents', () => {
  const lines = installer.gitattributesLines('* text=auto eol=crlf\n');
  assert.ok(!lines.includes('*.md text eol=lf'));
  assert.ok(lines.includes('.claude/** text=auto eol=lf'), 'ATLAS\'s own folders still get their rule');
  assert.ok(installer.gitattributesLines('*.png binary\n').includes('*.md text eol=lf'));
});

/** Every file under `dir` with its content, minus git internals. */
function contents(dir) {
  return Object.fromEntries(tpl.walk(dir).filter((rel) => !rel.startsWith('.git/')).sort().map((rel) => [rel, read(dir, rel)]));
}

test('scaffold: a damaged .atlas/config.json stops the run before anything is written', () => {
  const { dir } = scaffold(['3', 'Ada', '1', 'billing', '2', '1', '', '3', '1', 'n']);
  const cases = [
    ['{"mode":"project","project":"billing","team":{"owner":"sam"},}', /nothing was written[\s\S]*\.atlas\/config\.json is not valid JSON/],
    ['["repo"]', /nothing was written[\s\S]*\.atlas\/config\.json is not a JSON object/],
    ['', /config\.json is not valid JSON \(it is empty: delete it, or put \{\} in it\)/],
    ['\ufeff{"mode":"repo"}', /config\.json is not valid JSON \(it starts with a byte-order mark/],
  ];
  for (const [content, message] of cases) {
    write(dir, '.atlas/config.json', content);
    const before = contents(dir);
    const r = cli(['new-project', dir], { input: ['y', '3', 'Ada', '', '', '', '', '', '3', '1', 'n'].join('\n') + '\n' });
    assert.equal(r.status, 1, content);
    assert.match(r.err, message);
    assert.deepEqual(contents(dir), before, 'the file with the keys only it holds is still there to repair');
  }
  // .atlas as a file: refused for what it is, not for a record that cannot be read
  const into = tempDir();
  write(into, '.atlas', 'not a folder\n');
  const r = cli(['new-project', into], { input: ['3', 'Ada', '', '', '', '', '', '3', '1', 'n'].join('\n') + '\n' });
  assert.equal(r.status, 1);
  assert.match(r.err, /nothing was written[\s\S]*\.atlas is a file/);
  assert.doesNotMatch(r.err, /stopped partway/);
  assert.deepEqual(fs.readdirSync(into), ['.atlas']);
});

test('scaffold: a run that stops partway says so, and running it again finishes it', { skip: process.platform === 'win32' || (process.getuid && process.getuid() === 0) }, () => {
  const { dir } = scaffold(['3', 'Ada', '1', 'demo', '', '1', '', '1', '1', 'n']);
  const locked = path.join(dir, '.claude', 'settings.json');
  fs.chmodSync(locked, 0o444);
  const answers = ['y', '1', '3', '', '1', '', '1', '1', 'n']; // now vanilla, multi
  const r = cli(['new-project', dir], { input: answers.join('\n') + '\n' });
  assert.equal(r.status, 1);
  assert.match(r.err, /EACCES[\s\S]*stopped partway[\s\S]*run the same command again/);
  assert.equal(JSON.parse(read(dir, '.atlas/installed.json')).variant, 'atlas-collaborative', 'the record still describes the run before');
  fs.chmodSync(locked, 0o644);
  const again = scaffold(answers, { into: dir });
  assert.doesNotMatch(again.out, /already here differ/, 'what the stopped run wrote is not mistaken for the user\'s');
  assert.equal(JSON.parse(read(dir, '.atlas/installed.json')).variant, 'vanilla');
  assert.equal(JSON.parse(read(dir, '.atlas/config.json')).mode, 'multi');
  assert.equal(cli(['update', dir]).status, 0);

  // a stop after the record is written: the message must not say the record is missing, and the same command still finishes
  const late = tempDir();
  fs.mkdirSync(path.join(late, '.playwright'));
  fs.chmodSync(path.join(late, '.playwright'), 0o555);
  const cliAnswers = ['3', 'Ada', '1', 'demo', '', '3', '1', '', '1', '1', 'n']; // Playwright CLI, whose config is written near the end
  const stopped = cli(['new-project', late], { input: cliAnswers.join('\n') + '\n' });
  assert.equal(stopped.status, 1);
  assert.ok(exists(late, '.atlas/installed.json'));
  assert.match(stopped.err, /stopped partway: some files are written and others are not/);
  fs.chmodSync(path.join(late, '.playwright'), 0o755);
  const finished = scaffold(['y', ...cliAnswers], { into: late });
  assert.doesNotMatch(finished.out, /already here differ/);
  assert.ok(exists(late, '.playwright/cli.config.json'));
});

test('settings: the 2.x hooks go when their scripts are gone, whichever run deleted them', { skip: process.platform === 'win32' || (process.getuid && process.getuid() === 0) }, () => {
  const hook = (name) => `node "\${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/${name}"`;
  const wired = (names) => JSON.stringify({ hooks: {
    Stop: [{ hooks: [{ type: 'command', command: hook(names[0]) }] }],
    PreToolUse: [{ matcher: 'AskUserQuestion', hooks: [{ type: 'command', command: hook(names[1]) }] }],
  } });
  const answers = ['3', 'Ada', '1', 'demo', '', '1', '', '1', '1', '1', 'n'];
  const stale = (dir) => read(dir, '.claude/settings.local.json').match(/task-complete|ask-user-input/g);

  // 2.6.4, and a first run that deletes the scripts and stops before it reaches settings.local.json
  const into = tempDir();
  for (const [rel, buf] of Object.entries(legacy())) write(into, rel, buf);
  write(into, '.claude/settings.local.json', wired(['task-complete.cjs', 'ask-user-input.cjs']));
  write(into, '.claude/settings.json', '{}');
  fs.chmodSync(path.join(into, '.claude', 'settings.json'), 0o444);
  const stopped = cli(['new-project', into], { input: answers.join('\n') + '\n' });
  assert.match(stopped.err, /stopped partway/);
  assert.ok(!exists(into, '.claude/hooks/task-complete.cjs'), 'the script went in the run that stopped');
  assert.equal(stale(into).length, 2, 'and its hooks are still wired');
  fs.chmodSync(path.join(into, '.claude', 'settings.json'), 0o644);
  const again = scaffold(['y', ...answers], { into });
  assert.equal(stale(into), null, 'the run that finishes the job drops them: a hook to a missing script fails on every Stop');
  assert.match(again.out, /removed 2 hooks from \.claude\/settings\.local\.json/);

  // 2.1 to 2.6.2 shipped the same two scripts as .js
  const older = tempDir();
  const files = legacy();
  for (const name of ['task-complete', 'ask-user-input']) write(older, `.claude/hooks/${name}.js`, files[`.claude/hooks/${name}.cjs`]);
  write(older, '.claude/settings.local.json', wired(['task-complete.js', 'ask-user-input.js']));
  scaffold(answers, { into: older });
  assert.ok(!exists(older, '.claude/hooks/task-complete.js') && !exists(older, '.claude/hooks/ask-user-input.js'));
  assert.equal(stale(older), null);

  // a script of that name the user rewrote is theirs: it stays, and so does its hook
  const theirs = tempDir();
  write(theirs, '.claude/hooks/task-complete.cjs', '// my own\n');
  write(theirs, '.claude/settings.local.json', wired(['task-complete.cjs', 'my-other.cjs']));
  scaffold(answers, { into: theirs });
  assert.equal(read(theirs, '.claude/hooks/task-complete.cjs'), '// my own\n');
  assert.equal(stale(theirs).length, 1);
  assert.deepEqual(installer.legacyScriptsGone(theirs).sort(), ['.claude/hooks/ask-user-input.cjs', '.claude/hooks/ask-user-input.js', '.claude/hooks/task-complete.js']);
  assert.deepEqual(installer.legacyScriptsGone(theirs, ['.claude/hooks/ask-user-input.js', '.claude/hooks']), [], 'a path kept with update --keep is the user\'s, here or not');
});

test('settings: a hook group of the user\'s in another shape is merged around, in new-project and in update', () => {
  const cmd = (command) => ({ hooks: [{ type: 'command', command }] });
  const odd = [{ matcher: 'Bash', hooks: { type: 'command', command: 'echo mine' } }, null, 'x', { hooks: [null, { command: 'a' }] }];
  const merged = installer.mergeSettings({ hooks: { PreToolUse: odd } }, { hooks: { PreToolUse: [cmd('a'), cmd('b')] } });
  assert.deepEqual(merged.hooks.PreToolUse, [...odd, cmd('b')], 'theirs untouched, ours added unless the command is already there');

  const into = tempDir();
  write(into, 'package.json', '{}');
  write(into, '.claude/settings.json', JSON.stringify({ hooks: { PreToolUse: odd } }));
  write(into, '.claude/settings.local.json', JSON.stringify({ hooks: { Stop: odd } }));
  scaffold(['1', '3', '', '1', '', '3', '1', 'n'], { into });
  const shared = JSON.parse(read(into, '.claude/settings.json')).hooks.PreToolUse;
  assert.deepEqual(shared.slice(0, odd.length), odd);
  assert.match(shared[odd.length].hooks[0].command, /guard-secrets\.cjs/);
  assert.deepEqual(JSON.parse(read(into, '.claude/settings.local.json')).hooks.Stop.slice(0, odd.length), odd);
  // the record is written last: reaching it means the run did not stop halfway with an older record still in place
  assert.equal(JSON.parse(read(into, '.atlas/installed.json')).variant, 'vanilla');
  assert.equal(JSON.parse(read(into, '.atlas/config.json')).mode, 'multi');
  assert.equal(cli(['update', into, '--apply']).status, 0, 'update merges the same file');
});

test('settings: a hook that runs a retired script and then something of the user\'s is kept and named', () => {
  const retired = ['.claude/hooks/task-complete.cjs'];
  const ours = 'node "${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/task-complete.cjs"';
  const bare = 'node .claude/hooks/task-complete.cjs';
  const extended = [`${ours}; my-own-logger --session-end`, `${ours} && notify-me`, `${ours} | tee -a log`, `echo "$(date)" >> log\n${ours}`,
    `${bare}; say done`, `${bare}&&say done`, `${bare}|tee log`]; // nothing between the name and the rest of the line
  const alone = [ours, `${ours} --quiet`, `${bare}>/dev/null`, `(${bare})`];
  const settings = { hooks: { Stop: [{ hooks: [...extended, ...alone].map((command) => ({ type: 'command', command })) }] } };
  const mixed = [];
  const dropped = [];
  const out = installer.dropLegacyHooks(settings, retired, mixed, dropped);
  assert.deepEqual(out.hooks.Stop[0].hooks.map((h) => h.command), extended, 'only the hooks that do nothing else are dropped');
  assert.deepEqual(mixed, extended);
  assert.deepEqual(dropped, alone);

  const into = tempDir();
  for (const [rel, buf] of Object.entries(legacy())) write(into, rel, buf);
  write(into, '.claude/settings.local.json', JSON.stringify({ hooks: { Stop: [{ hooks: [{ type: 'command', command: extended[0] }] }] } }));
  const { out: said } = scaffold(['3', 'Ada', '1', 'demo', '', '1', '', '1', '1', '1', 'n'], { into });
  assert.ok(!exists(into, retired[0]));
  const commands = JSON.parse(read(into, '.claude/settings.local.json')).hooks.Stop.flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(commands.includes(extended[0]), 'the user\'s logger still runs');
  assert.match(said, /a hook in \.claude\/settings\.local\.json runs a script of an older ATLAS that is gone, inside a longer command/);
  assert.ok(said.includes(extended[0]), 'and the run shows the line');
});

test('scaffold: the question about replacing files names every one of them', () => {
  const { dir } = scaffold(['3', 'Ada', '1', 'demo', '', '1', '', '1', '1', 'n']);
  const edited = tpl.walk(dir).filter((rel) => /^\.claude\/(commands|hooks|rules)\//.test(rel)).sort().slice(0, 14);
  assert.equal(edited.length, 14);
  for (const rel of edited) write(dir, rel, read(dir, rel) + '\nMY EDIT\n');
  // y is answered to exactly this list, so a path missing from it would be replaced unasked
  const { out } = scaffold(['y', '3', 'Ada', '', '', '', '1', '', '1', '1', 'y', 'n'], { into: dir });
  assert.match(out, /14 paths already here differ/);
  for (const rel of edited) assert.ok(out.includes(`    ${rel}\n`), `${rel} is not named`);
  assert.doesNotMatch(out, /and \d+ more/);
});

test('settings: a server ATLAS adds is enabled by name, and "all project servers" stays as the user set it', () => {
  const add = installer.personalSettings({ playwright: true });
  const merged = installer.mergeSettings({ enableAllProjectMcpServers: false, enabledMcpjsonServers: ['mine'] }, add);
  assert.equal(merged.enableAllProjectMcpServers, false);
  assert.deepEqual(merged.enabledMcpjsonServers, ['mine', 'playwright']);
  assert.equal(installer.mergeSettings({}, add).enableAllProjectMcpServers, true, 'with no choice of the user\'s, the server just works');
});

test('scaffold: in a folder that had files and no git, Enter at the commit prompt does not commit them', () => {
  const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf-8' });
  if (git(tempDir(), 'init', '-q').status !== 0) return; // no git on this machine
  const into = tempDir();
  write(into, '.env.staging', 'TOKEN=not-for-git\n');
  write(into, 'node_modules/x/index.js', '1\n');
  const { out } = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', ''], { into });
  assert.match(out, /already held files and had no git/);
  assert.match(out, /commit these changes\? \(y\/N\)/);
  assert.notEqual(git(into, 'rev-parse', 'HEAD').status, 0, 'no commit was made');
  assert.equal(git(into, 'ls-files').stdout, '', 'and nothing is staged');
  // a new, empty folder keeps the old default: Enter commits the scaffold
  const fresh = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', '']);
  assert.match(fresh.out, /commit these changes\? \(Y\/n\)/);
  assert.equal(git(fresh.dir, 'rev-list', '--count', 'HEAD').stdout.trim(), '1');
});
