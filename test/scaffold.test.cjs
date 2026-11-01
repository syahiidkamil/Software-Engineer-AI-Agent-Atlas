// Runs the real scaffolder with piped answers, one workspace per mode, and
// checks the result. Piped stdin uses the numeric fallback prompts.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { REPO, tempDir, read, exists } = require('./helpers.cjs');

function scaffold(answers, { into } = {}) {
  const dir = into || path.join(tempDir(), 'Saori-Hibana');
  const r = spawnSync(process.execPath, [path.join(REPO, 'bin', 'install.js'), 'new-project', dir], {
    input: answers.join('\n') + '\n',
    encoding: 'utf-8',
    env: { ...process.env, ATLAS_SKIP_SUBMODULE: '1', GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  return { dir, out: r.stdout.replace(/\x1b\[[0-9;]*m/g, '') };
}

const REMOVED = [
  '.claude/agents/code-explorer.md', '.claude/agents/code-architect.md', '.claude/agents/code-review.md',
  '.claude/agents/code-simplifier.md', '.claude/agents/qa-manual-tester.md', '.claude/commands/plandev',
  '.claude/hooks/task-complete.wav', '.claude/hooks/task-complete.cjs', '.claude/hooks/ask-user-input.cjs',
  '.claude/rules/DESIGN.md', 'misc/goals', 'misc/prompts', 'repos/backend',
];

function commonChecks(dir) {
  for (const f of [
    'CLAUDE.md', 'NOTES.md', '.gitignore', '.gitattributes', '.atlas/config.json',
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
  fs.mkdirSync(path.join(into, '.claude', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(into, '.claude', 'agents'));
  fs.mkdirSync(path.join(into, '.claude', 'rules'));
  for (const f of ['task-complete.cjs', 'ask-user-input.cjs', 'task-complete.wav']) fs.writeFileSync(path.join(into, '.claude', 'hooks', f), '');
  fs.writeFileSync(path.join(into, '.claude', 'agents', 'code-explorer.md'), '');
  fs.writeFileSync(path.join(into, '.claude', 'rules', 'DESIGN.md'), '---\nname: {{PROJECT_NAME}}\n---\n');
  const old = (s) => ({ matcher: '', hooks: [{ type: 'command', command: `node "\${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/${s}"` }] });
  fs.writeFileSync(path.join(into, '.claude', 'settings.local.json'), JSON.stringify({
    hooks: { Stop: [old('task-complete.cjs')], PreToolUse: [{ ...old('ask-user-input.cjs'), matcher: 'AskUserQuestion' }], Notification: { bad: 'shape' } },
  }));
  fs.writeFileSync(path.join(into, 'package.json'), '{}');
  scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into });
  for (const gone of ['.claude/hooks/task-complete.cjs', '.claude/hooks/task-complete.wav', '.claude/agents/code-explorer.md', '.claude/rules/DESIGN.md']) {
    assert.ok(!exists(into, gone), `${gone} should be removed`);
  }
  const hooks = JSON.parse(read(into, '.claude/settings.local.json')).hooks;
  const commands = Object.values(hooks).flat().flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(!commands.some((c) => /task-complete|ask-user-input/.test(c)), commands.join('\n'));
  assert.equal(hooks.Stop.length, 1);
});

test('scaffold: into an existing repo, keeps its files and merges .gitignore and settings', () => {
  const into = tempDir();
  fs.writeFileSync(path.join(into, 'package.json'), '{"name":"existing"}');
  fs.writeFileSync(path.join(into, '.gitignore'), 'node_modules/\n');
  fs.writeFileSync(path.join(into, '.env.example'), 'MY_APP_KEY=\n');
  fs.mkdirSync(path.join(into, '.claude'));
  fs.writeFileSync(path.join(into, '.claude', 'settings.json'), JSON.stringify({ permissions: { deny: ['Bash(rm -rf:*)'] }, model: 'opus' }));
  const { dir, out } = scaffold(['3', 'Ada', '', '', '', '', '', '3', '1', 'n'], { into });
  assert.match(out, /Mode:\s+repo/, 'detects the existing repo');
  assert.equal(read(dir, '.env.example'), 'MY_APP_KEY=\n', 'the app keeps its own env contract');
  assert.match(read(dir, '.gitignore'), /^node_modules\/\n/);
  const shared = JSON.parse(read(dir, '.claude/settings.json'));
  assert.equal(shared.model, 'opus');
  assert.ok(shared.permissions.deny.includes('Bash(rm -rf:*)') && shared.permissions.deny.includes('Read(**/.env)'));
});
