#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────

// The package root IS the source of truth. bin/ sits at the package root, so
// `..` resolves to the dir that holds .claude/, misc/ (self, archive), NOTES.md — both
// in this repo (dev) and in the published npm tarball.
const TEMPLATES_DIR = path.join(__dirname, '..');

// ATLAS Orange theme — distinct from GSD's cyan/blue
const ORANGE = '\x1b[38;5;208m';
const BRIGHT_ORANGE = '\x1b[38;5;214m';
const DARK_ORANGE = '\x1b[38;5;166m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const WHITE = '\x1b[37m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Utilities ───────────────────────────────────────────────────────────────

function print(msg = '') {
  console.log(msg);
}

function printHeader() {
  print();
  print(`${BRIGHT_ORANGE}    ███████╗██╗    ██╗███████╗       █████╗ ████████╗██╗      █████╗ ███████╗${RESET}`);
  print(`${BRIGHT_ORANGE}    ██╔════╝██║    ██║██╔════╝      ██╔══██╗╚══██╔══╝██║     ██╔══██╗██╔════╝${RESET}`);
  print(`${ORANGE}    ███████╗██║ █╗ ██║█████╗  █████╗███████║   ██║   ██║     ███████║███████╗${RESET}`);
  print(`${ORANGE}    ╚════██║██║███╗██║██╔══╝  ╚════╝██╔══██║   ██║   ██║     ██╔══██║╚════██║${RESET}`);
  print(`${DARK_ORANGE}    ███████║╚███╔███╔╝███████╗      ██║  ██║   ██║   ███████╗██║  ██║███████║${RESET}`);
  print(`${DARK_ORANGE}    ╚══════╝ ╚══╝╚══╝ ╚══════╝      ╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚══════╝${RESET}`);
  print();
  print(`${WHITE}    Software Engineer — AI Agent${RESET}`);
  print(`${DIM}    Adaptive Technical Learning & Architecture System${RESET}`);
  print();
  print(`${DIM}    FAANG experience for scale. Startup experience for pragmatism.${RESET}`);
  print();
}

function printUsage() {
  print();
  print(`${BOLD}  Usage:${RESET}`);
  print(`    swe-atlas new-project ${DIM}[folder-name]${RESET}`);
  print();
  print(`${BOLD}  Workspace modes${RESET} ${DIM}(asked during setup, switchable later with /atlas:mode):${RESET}`);
  print(`    repo     ${DIM}ATLAS inside one code repo${RESET}`);
  print(`    project  ${DIM}one project wrapping its repos in repos/${RESET}`);
  print(`    multi    ${DIM}many projects in projects/, plus general/ and index.md${RESET}`);
  print();
  print(`${BOLD}  Arguments:${RESET}`);
  print(`    ${DIM}folder-name${RESET}  Target directory ${DIM}(default: current directory)${RESET}`);
  print();
  print(`${BOLD}  Examples:${RESET}`);
  print(`    swe-atlas new-project              ${DIM}# scaffold in current directory${RESET}`);
  print(`    swe-atlas new-project my-project   ${DIM}# scaffold in ./my-project${RESET}`);
  print();
}

// Prompter that buffers incoming lines instead of relying on rl.question.
// rl.question drops lines that arrive while no question is pending, which
// breaks piped/scripted input (printf 'a\nb\n' | swe-atlas ...). Buffering
// makes interactive and non-interactive use behave the same.
function createPrompter() {
  const lines = [];
  const waiters = [];
  let ended = false;
  let rl = null;
  let swapping = false;

  function attach() {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('line', (line) => {
      const waiter = waiters.shift();
      if (waiter) waiter(line.trim());
      else lines.push(line.trim());
    });
    rl.on('close', () => {
      if (swapping) return; // deliberate detach for a raw-mode prompt, not EOF
      ended = true;
      // stdin ended — resolve pending questions with '' so defaults kick in
      while (waiters.length) waiters.shift()('');
    });
  }
  attach();

  return {
    ask(question) {
      process.stdout.write(`${ORANGE}  ? ${RESET}${question} `);
      if (lines.length > 0) {
        const answer = lines.shift();
        process.stdout.write(`${answer}\n`);
        return Promise.resolve(answer);
      }
      if (ended) {
        process.stdout.write('\n');
        return Promise.resolve('');
      }
      return new Promise((resolve) => waiters.push(resolve));
    },
    // Raw-mode prompts (the checkbox picker) need readline out of the way,
    // or it echoes keypresses and buffers them as a pending line.
    detach() {
      swapping = true;
      rl.close();
      swapping = false;
    },
    reattach: attach,
    close() {
      rl.close();
    },
  };
}

async function askChoice(prompter, question, options, defaultIndex = 0) {
  print(`${ORANGE}  ? ${RESET}${question}`);
  options.forEach((opt, i) => {
    print(`    ${BOLD}${i + 1}${RESET}) ${opt.label} ${DIM}— ${opt.desc}${RESET}`);
  });
  const answer = await prompter.ask(
    `Choose [1-${options.length}] (default ${defaultIndex + 1}):`
  );
  const idx = parseInt(answer, 10) - 1;
  if (idx >= 0 && idx < options.length) {
    return options[idx].value;
  }
  print(`${DIM}    Defaulting to: ${options[defaultIndex].label}${RESET}`);
  return options[defaultIndex].value;
}

async function askMultiChoice(prompter, question, options, preselected = []) {
  const chosen = new Set(preselected);
  print(`${ORANGE}  ? ${RESET}${question} ${DIM}(comma-separated, e.g. 1,3 · * = all · Enter = keep pre-checked)${RESET}`);
  options.forEach((opt, i) => {
    const box = chosen.has(opt.value) ? `${ORANGE}[x]${RESET}` : '[ ]';
    print(`    ${BOLD}${i + 1}${RESET}) ${box} ${opt.label} ${DIM}— ${opt.desc}${RESET}`);
  });
  const answer = await prompter.ask(`Choose:`);
  if (answer.trim() === '*') return options.map((o) => o.value);
  // Typed indices add to the pre-checked set; Enter alone keeps it as-is.
  if (answer) {
    for (const i of answer.split(',').map((s) => parseInt(s.trim(), 10) - 1)) {
      if (i >= 0 && i < options.length) chosen.add(options[i].value);
    }
  }
  return options.filter((o) => chosen.has(o.value)).map((o) => o.value);
}

// Interactive checkbox picker — ↑/↓ to move, space to toggle, a to toggle
// all, enter to confirm. Zero-dependency raw-mode rendering.
function askCheckboxInteractive(prompter, question, options, preselected = []) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    prompter.detach();
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    process.stdout.write('\x1b[?25l'); // hide cursor while navigating

    let cursor = 0;
    let rendered = false;
    const preset = new Set(preselected);
    const checked = options.map((o) => preset.has(o.value));
    const lineCount = options.length + 1;

    function render() {
      if (rendered) process.stdout.write(`\x1b[${lineCount}A`); // redraw in place
      rendered = true;
      const width = process.stdout.columns || 80;
      process.stdout.write(
        `\x1b[2K${ORANGE}  ? ${RESET}${question} ${DIM}(↑/↓ · space toggle · a = all · enter confirm)${RESET}\n`
      );
      options.forEach((opt, i) => {
        // keep each entry on one terminal row — wrapping breaks in-place redraw
        let desc = opt.desc;
        const maxDesc = width - opt.label.length - 12;
        if (desc.length > maxDesc) desc = maxDesc > 3 ? `${desc.slice(0, maxDesc - 3)}...` : '';
        const pointer = i === cursor ? `${ORANGE}❯${RESET}` : ' ';
        const box = checked[i] ? `${ORANGE}[x]${RESET}` : '[ ]';
        process.stdout.write(
          `\x1b[2K  ${pointer} ${box} ${opt.label}${desc ? ` ${DIM}— ${desc}${RESET}` : ''}\n`
        );
      });
    }

    function restore() {
      stdin.setRawMode(false);
      stdin.removeListener('keypress', onKeypress);
      process.stdout.write('\x1b[?25h'); // show cursor again
    }

    function onKeypress(str, key = {}) {
      if (key.ctrl && key.name === 'c') {
        restore();
        print();
        process.exit(130);
      }
      if (key.name === 'up' || key.name === 'k') {
        cursor = (cursor - 1 + options.length) % options.length;
      } else if (key.name === 'down' || key.name === 'j') {
        cursor = (cursor + 1) % options.length;
      } else if (key.name === 'space') {
        checked[cursor] = !checked[cursor];
      } else if (str === 'a') {
        const all = checked.every(Boolean);
        checked.fill(!all);
      } else if (key.name === 'return') {
        restore();
        prompter.reattach();
        resolve(options.filter((_, i) => checked[i]).map((o) => o.value));
        return;
      }
      render();
    }

    stdin.on('keypress', onKeypress);
    render();
  });
}

// Checkbox UX on a real terminal; numeric askMultiChoice fallback keeps
// piped/scripted input (printf 'a\nb\n' | swe-atlas ...) working.
async function askCheckbox(prompter, question, options, preselected = []) {
  if (!process.stdin.isTTY) {
    return askMultiChoice(prompter, question, options, preselected);
  }
  const selected = await askCheckboxInteractive(prompter, question, options, preselected);
  print(`${DIM}    ${selected.length} selected${RESET}`);
  return selected;
}

// Discover installable skills from the package's .claude/skills/ directory,
// pulling each description from SKILL.md frontmatter for the picker.
function listSkills() {
  const skillsDir = path.join(TEMPLATES_DIR, '.claude', 'skills');
  if (!fs.existsSync(skillsDir)) return [];
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      let desc = '';
      const skillMd = path.join(skillsDir, entry.name, 'SKILL.md');
      if (fs.existsSync(skillMd)) {
        const match = fs
          .readFileSync(skillMd, 'utf-8')
          .match(/^description:\s*(.+)$/m);
        if (match) desc = match[1].trim().replace(/^['"]|['"]$/g, '');
      }
      if (desc.length > 72) desc = `${desc.slice(0, 69)}...`;
      return { label: entry.name, desc: desc || 'no description', value: entry.name };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue; // never ship Finder junk when running from a dev checkout
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function writeFileSync(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function gitkeep(dirPath) {
  ensureDir(dirPath);
  const gk = path.join(dirPath, '.gitkeep');
  if (!fs.existsSync(gk)) {
    fs.writeFileSync(gk, '', 'utf-8');
  }
}

const { spawnSync } = require('child_process');

// ─── Templates ───────────────────────────────────────────────────────────────
// The package root is the single source of truth: the CLI copies files from
// it and substitutes tokens; it never regenerates content. Layout knowledge
// (project skeleton, CLAUDE.md workspace block, index.md, .gitignore lines) is
// shared with the workspace scripts through .claude/scripts/lib/workspace.cjs.
// Only the settings files are generated inline, because their shape depends
// on the answers.

const workspace = require(path.join(TEMPLATES_DIR, '.claude', 'scripts', 'lib', 'workspace.cjs'));
const atlasLib = require(path.join(TEMPLATES_DIR, '.claude', 'scripts', 'lib', 'atlas.cjs'));

function readTemplate(...segments) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, ...segments), 'utf-8');
}

// variant maps 1:1 to a complete template file in claude_md_variants/
function generateClaudeMd(variant, partnerName, mode) {
  const text = readTemplate('claude_md_variants', `${variant}.md`).replaceAll('{{PARTNER_NAME}}', partnerName);
  return workspace.setWorkspaceBlock(text, mode);
}

// Root .mcp.json defines every supported server; keep only the selected ones.
function generateMcpJson(options = {}) {
  const template = JSON.parse(readTemplate('.mcp.json'));
  const servers = {};
  for (const [name, config] of Object.entries(template.mcpServers || {})) {
    if (options[name]) servers[name] = config;
  }
  // Isolated browser: swap the persistent profile dir for --isolated so each
  // session gets a fresh in-memory profile (safe for concurrent testing).
  if (servers.playwright && options.isolatedBrowser) {
    servers.playwright.args = servers.playwright.args
      .filter((arg) => !String(arg).startsWith('--user-data-dir'))
      .concat('--isolated');
  }
  return JSON.stringify({ mcpServers: servers }, null, 2) + '\n';
}

// Root .playwright/cli.config.json is the persistent-profile baseline; the
// isolated flavor is derived from it, never duplicated.
function generatePlaywrightCliConfig(isolated) {
  const config = JSON.parse(readTemplate('.playwright', 'cli.config.json'));
  if (isolated) {
    config.browser = config.browser || {};
    config.browser.isolated = true;
    delete config.browser.userDataDir;
  }
  return JSON.stringify(config, null, 2) + '\n';
}

// ${CLAUDE_PROJECT_DIR} is substituted by Claude Code and exported to the hook,
// so the command works under sh, Git Bash and PowerShell alike; no POSIX
// ${VAR:-default} fallbacks, which PowerShell does not understand.
const hookCmd = (script, ...args) =>
  [`node "\${CLAUDE_PROJECT_DIR}/.claude/hooks/${script}"`, ...args].join(' ');

const hook = (matcher, command) => ({ matcher, hooks: [{ type: 'command', command }] });

/**
 * Shared, committed guardrails: secrets stay out of reach of the Read/Edit tools
 * (permission rules) and of the shell (the guard hook).
 */
function sharedSettings() {
  return {
    permissions: {
      deny: [
        'Read(/.atlas/secrets/**)',
        'Edit(/.atlas/secrets/**)',
        'Read(**/.env)',
        'Read(**/.env.local)',
        'Read(**/.env.*.local)',
        'Read(**/.env.production)',
      ],
    },
    hooks: {
      PreToolUse: [hook('Bash', hookCmd('guard-secrets.cjs'))],
    },
  };
}

/** Personal settings: allow-list, MCP enablement, spoken notifications. */
function personalSettings(options = {}) {
  const allow = [
    'Bash(git log:*)',
    'Bash(mkdir:*)',
    'Bash(find:*)',
    'Bash(node .claude/scripts/port.cjs:*)',
    'Bash(node .claude/scripts/mode.cjs current)',
    'Bash(node .claude/scripts/project.cjs:*)',
    'Bash(node .claude/scripts/secrets.cjs keys:*)',
    'Bash(node .claude/scripts/secrets.cjs check:*)',
    'Bash(node .claude/scripts/secrets.cjs link:*)',
    'Bash(node .claude/scripts/db.cjs list)',
    'WebFetch(domain:www.anthropic.com)',
  ];
  if (options.playwrightCli) allow.push('Bash(playwright-cli:*)');
  if (options.playwright) {
    allow.push(
      'mcp__playwright__browser_navigate',
      'mcp__playwright__browser_click',
      'mcp__playwright__browser_snapshot',
      'mcp__playwright__browser_type',
      'mcp__playwright__browser_console_messages',
      'mcp__playwright__browser_press_key',
      'mcp__playwright__browser_take_screenshot',
      'mcp__playwright__browser_fill_form',
      'mcp__playwright__browser_evaluate',
      'mcp__playwright__browser_wait_for',
      'mcp__playwright__browser_select_option',
      'mcp__playwright__browser_hover',
      'mcp__playwright__browser_resize',
      'mcp__playwright__browser_close',
      'mcp__playwright__browser_network_requests',
    );
  }
  const settings = {
    permissions: { allow, deny: [], ask: [], defaultMode: 'acceptEdits' },
    hooks: {
      Stop: [hook('', hookCmd('notify.cjs', 'done'))],
      PreToolUse: [hook('AskUserQuestion', hookCmd('notify.cjs', 'ask input'))],
      Notification: [hook('permission_prompt', hookCmd('notify.cjs', 'ask permission'))],
    },
  };
  if (options.playwright) {
    settings.enableAllProjectMcpServers = true;
    settings.enabledMcpjsonServers = ['playwright'];
  }
  return settings;
}

/** Compaction threshold and advisor model, written into whichever file the user picked. */
function contextSettings({ compactPct, advisor }) {
  const out = {};
  if (compactPct) out.env = { CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: String(compactPct) };
  if (advisor) out.advisorModel = advisor;
  return out;
}

/**
 * Merge settings into an existing file instead of overwriting it: arrays are
 * unioned, hook groups are added unless a group with the same command exists,
 * objects merge, and scalars from `add` win (the user just chose them).
 */
function mergeSettings(base, add) {
  const out = { ...base };
  for (const [key, value] of Object.entries(add)) {
    if (key === 'hooks') {
      out.hooks = { ...(base.hooks || {}) };
      for (const [event, groups] of Object.entries(value)) {
        const existing = Array.isArray(out.hooks[event]) ? [...out.hooks[event]] : [];
        const commands = new Set(existing.flatMap((g) => (g.hooks || []).map((h) => h.command)));
        for (const g of groups) if (!g.hooks.some((h) => commands.has(h.command))) existing.push(g);
        out.hooks[event] = existing;
      }
    } else if (Array.isArray(value)) {
      out[key] = [...new Set([...(Array.isArray(base[key]) ? base[key] : []), ...value])];
    } else if (value && typeof value === 'object') {
      out[key] = mergeSettings(base[key] && typeof base[key] === 'object' ? base[key] : {}, value);
    } else if (!(key === 'defaultMode' && base[key])) {
      out[key] = value;
    }
  }
  return out;
}

// Hooks and files an older ATLAS scaffolded that this release replaced. Left in
// place they double every notification and keep loading removed agents.
const LEGACY_HOOK_SCRIPTS = /[\\/](task-complete|ask-user-input)\.cjs/;
const LEGACY_FILES = [
  ['.claude', 'hooks', 'task-complete.cjs'], ['.claude', 'hooks', 'task-complete.wav'], ['.claude', 'hooks', 'ask-user-input.cjs'],
  ['.claude', 'agents', 'code-explorer.md'], ['.claude', 'agents', 'code-architect.md'], ['.claude', 'agents', 'code-review.md'],
  ['.claude', 'agents', 'code-simplifier.md'], ['.claude', 'agents', 'qa-manual-tester.md'], ['.claude', 'commands', 'plandev'],
];

function dropLegacyHooks(settings) {
  if (!settings.hooks || typeof settings.hooks !== 'object') return settings;
  const hooks = {};
  for (const [event, groups] of Object.entries(settings.hooks)) {
    if (!Array.isArray(groups)) continue;
    const kept = groups
      .map((g) => ({ ...g, hooks: (g.hooks || []).filter((h) => !LEGACY_HOOK_SCRIPTS.test(h.command || '')) }))
      .filter((g) => g.hooks.length);
    if (kept.length) hooks[event] = kept;
  }
  return { ...settings, hooks };
}

/** Remove what an older scaffold left behind; a customized DESIGN.md is kept and reported. */
function removeLegacy(dir, report) {
  for (const parts of LEGACY_FILES) {
    const p = path.join(dir, ...parts);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      report(`removed ${parts.join('/')} (replaced in this release)`);
    }
  }
  const design = path.join(dir, '.claude', 'rules', 'DESIGN.md');
  if (fs.existsSync(design)) {
    if (fs.readFileSync(design, 'utf-8').includes('{{PROJECT_NAME}}')) {
      fs.rmSync(design);
      report('removed the unfilled .claude/rules/DESIGN.md template (it loaded in every session)');
    } else {
      report('kept your .claude/rules/DESIGN.md; make it path-scoped with /design:create-design-md or /atlas:mode');
    }
  }
}

function writeSettings(file, ...parts) {
  let current = {};
  if (fs.existsSync(file)) {
    try {
      current = dropLegacyHooks(JSON.parse(fs.readFileSync(file, 'utf-8')));
    } catch {
      throw new Error(`${file} is not valid JSON; fix or remove it and run again`);
    }
  }
  const merged = parts.reduce((acc, p) => mergeSettings(acc, p), current);
  writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');
}

// Line endings for ATLAS's own files only: a repo-mode install must not change
// how the host repo normalizes its code.
const GITATTRIBUTES_LINES = [
  '# ATLAS: keep scripts and docs LF on every OS',
  '.claude/** text=auto eol=lf',
  '.atlas/*.json text eol=lf',
  '*.md text eol=lf',
];

function mergeLines(existing, lines) {
  const have = new Set((existing || '').split(/\r?\n/).map((l) => l.trim()));
  const missing = lines.filter((l) => !l.startsWith('#') && !have.has(l));
  if (!missing.length) return existing;
  const block = lines.filter((l) => l.startsWith('#') || missing.includes(l));
  const base = (existing || '').replace(/\s*$/, '');
  return `${base ? `${base}\n\n` : ''}${block.join('\n')}\n`;
}

/** Guess the mode: an existing code repo means repo mode, a fresh folder means multi. */
function detectMode(dir) {
  if (!fs.existsSync(dir)) return 'multi';
  const markers = ['.git', 'package.json', 'go.mod', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'Gemfile', 'composer.json', 'src'];
  return markers.some((m) => fs.existsSync(path.join(dir, m))) ? 'repo' : 'multi';
}

function git(args, cwd) {
  return spawnSync('git', args, { cwd, stdio: 'ignore' });
}

// ─── Scaffold ────────────────────────────────────────────────────────────────

const MODE_OPTIONS = [
  { label: 'Repo', desc: 'ATLAS inside one code repo, at its root', value: 'repo' },
  { label: 'Project', desc: 'one project; its code repos live in repos/<name>/', value: 'project' },
  { label: 'Multi', desc: 'many projects in projects/<name>/, plus general/ and index.md', value: 'multi' },
];

async function askProjectBasics(prompter, defaultName, { optional = false } = {}) {
  const hint = optional ? 'Enter to skip' : `default: ${defaultName}`;
  const raw = (await prompter.ask(`Project name? (${hint})`)).trim();
  const name = raw ? atlasLib.slugify(raw) : optional ? '' : defaultName;
  if (!name) return null;
  atlasLib.validateProjectName(name);
  const stage = await askChoice(prompter, `Stage of ${name}?`, [
    { label: 'toy', desc: 'simplest thing that works', value: 'toy' },
    { label: 'mvp', desc: 'sound core, honest shortcuts', value: 'mvp' },
    { label: 'production', desc: 'the full engineering bar', value: 'production' },
  ], 1);
  return { name, stage };
}

async function scaffold(targetDir) {
  printHeader();

  const resolvedDir = path.resolve(targetDir);
  print(`  ${ORANGE}${BOLD}Target:${RESET} ${resolvedDir}`);
  print();

  const prompter = createPrompter();

  try {
    // Guard: don't silently overwrite an existing scaffold
    if (fs.existsSync(path.join(resolvedDir, 'CLAUDE.md'))) {
      print(`${YELLOW}  CLAUDE.md already exists in the target directory.${RESET}`);
      const proceed = await prompter.ask('Overwrite existing ATLAS files? (y/N)');
      if (!['y', 'yes'].includes(proceed.toLowerCase())) {
        print(`${DIM}  Aborted — nothing was changed.${RESET}`);
        prompter.close();
        process.exit(0);
      }
      print();
    }

    // 1. CLAUDE.md flavor
    const variant = await askChoice(
      prompter,
      'CLAUDE.md flavor?',
      [
        { label: 'Vanilla', desc: 'minimal CLAUDE.md — just NOTES.md + decision logs, no ATLAS identity', value: 'vanilla' },
        { label: 'ATLAS — autonomous', desc: 'ATLAS identity, works independently, no partner-approval loop', value: 'atlas-autonomous' },
        { label: 'ATLAS — collaborative', desc: 'ATLAS identity with partner review/commit loop (classic)', value: 'atlas-collaborative' },
      ],
      2
    );

    // 2. Partner name (vanilla has no identity, so no name needed)
    let partnerName = '';
    if (variant !== 'vanilla') {
      partnerName = await prompter.ask('What is your name (partner name)?');
      if (!partnerName) {
        print(`${YELLOW}  Partner name is required.${RESET}`);
        process.exit(1);
      }
    }

    // 3. Workspace mode, defaulting from what the folder already holds
    const guessed = detectMode(resolvedDir);
    const mode = await askChoice(prompter, 'Workspace mode?', MODE_OPTIONS, MODE_OPTIONS.findIndex((o) => o.value === guessed));

    // 4. The project (repo/project mode: the one project; multi: an optional first one)
    const defaultName = atlasLib.defaultProjectName(resolvedDir);
    const project = await askProjectBasics(prompter, defaultName, { optional: mode === 'multi' });

    // 5. Browser automation — asked before skills so the picker can pre-check
    // the playwright-cli skill when the CLI option is chosen.
    const browser = await askChoice(prompter, 'Browser automation?', [
      { label: 'None', desc: 'skip browser automation', value: 'none' },
      { label: 'Playwright MCP', desc: 'MCP server in .mcp.json (mcp__playwright__* tools)', value: 'mcp' },
      { label: 'Playwright CLI', desc: 'playwright-cli skill driving the Playwright CLI via Bash', value: 'cli' },
    ]);

    // 5b. Browser profile. Multi mode is always isolated: parallel sessions on
    // different projects cannot share one persistent profile. Per-project
    // persistent profiles live in projects/<p>/misc/.playwright/ when needed.
    let browserProfile = 'isolated';
    if (browser !== 'none' && mode !== 'multi') {
      browserProfile = await askChoice(prompter, 'Browser profile?', [
        { label: 'Isolated', desc: 'fresh in-memory profile per session — enables concurrent/parallel testing', value: 'isolated' },
        { label: 'Persistent', desc: 'profile saved to disk — logins survive browser restarts', value: 'persistent' },
      ]);
    }
    const isolatedBrowser = browserProfile === 'isolated';

    // 6. Skills — interactive checkbox; some are pre-checked from the answers above:
    //   • super-product-owner, super-ui-ux-design, human-writing, frontend-design,
    //     adversarial-review, deploy — for every flavor
    //   • free-will — the autonomous flavor, which replaces the approval loop with
    //     deliberate decisions
    //   • playwright-cli — when Playwright CLI is the browser option
    const skillOptions = listSkills();
    let selectedSkills = [];
    if (skillOptions.length > 0) {
      const available = new Set(skillOptions.map((o) => o.value));
      const autoSkills = new Set(['super-product-owner', 'super-ui-ux-design', 'human-writing', 'frontend-design', 'adversarial-review', 'deploy']);
      if (variant === 'atlas-autonomous') autoSkills.add('free-will');
      if (browser === 'cli') autoSkills.add('playwright-cli');
      const preselected = [...autoSkills].filter((s) => available.has(s));
      selectedSkills = await askCheckbox(prompter, 'Which skills to install?', skillOptions, preselected);
    }

    // 7. Context: compaction threshold and advisor, per workspace
    const compactPct = await askChoice(prompter, 'Auto-compact earlier than Claude Code\'s default?', [
      { label: '50%', desc: 'recommended: quality holds better, and project memory makes a fresh context cheap', value: 50 },
      { label: '70%', desc: 'a little earlier than default', value: 70 },
      { label: 'Default', desc: 'leave Claude Code\'s threshold alone', value: 0 },
    ]);
    const advisor = await askChoice(prompter, 'Advisor model for this workspace? (second opinion on hard calls; uses extra usage)', [
      { label: 'None', desc: 'off', value: '' },
      { label: 'Opus', desc: 'advisorModel: opus', value: 'opus' },
      { label: 'Fable', desc: 'advisorModel: fable (may need /model fable consent first)', value: 'fable' },
      { label: 'Sonnet', desc: 'advisorModel: sonnet (only if your main model is not more capable)', value: 'sonnet' },
    ], variant === 'atlas-autonomous' ? 1 : 0);
    let contextFile = 'local';
    if (compactPct || advisor) {
      contextFile = await askChoice(prompter, 'Save the compaction/advisor choice where?', [
        { label: 'Personal', desc: '.claude/settings.local.json (gitignored, just you)', value: 'local' },
        { label: 'Shared', desc: '.claude/settings.json (committed, everyone on this workspace)', value: 'shared' },
      ]);
    }

    // ─── Write Files ──────────────────────────────────────────────────────

    print();
    print(`${ORANGE}${BOLD}  Scaffolding ATLAS...${RESET}`);
    print();

    ensureDir(resolvedDir);
    const claudeDir = path.join(resolvedDir, '.claude');
    const added = (label) => print(`  ${ORANGE}+${RESET} ${label}`);
    const skipped = (label) => print(`  ${DIM}  ${label}${RESET}`);
    removeLegacy(resolvedDir, (msg) => print(`  ${YELLOW}-${RESET} ${msg}`));

    // CLAUDE.md — the chosen variant, with the mode's workspace block
    writeFileSync(path.join(resolvedDir, 'CLAUDE.md'), generateClaudeMd(variant, partnerName, mode));
    added(`CLAUDE.md (${variant}, ${mode} mode)`);

    writeFileSync(path.join(resolvedDir, 'NOTES.md'), readTemplate('NOTES.md'));
    added('NOTES.md');

    // .gitignore — the root .gitignore is the source; the published tarball
    // ships it as `gitignore` (npm strips dotted .gitignore files; see prepack).
    // An existing file is kept and only gains the ATLAS lines it lacks: secrets
    // must be ignored even in a repo that already has its own .gitignore.
    const gitignorePath = path.join(resolvedDir, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      writeFileSync(gitignorePath, workspace.mergeGitignore(fs.readFileSync(gitignorePath, 'utf-8'), mode));
      added('.gitignore (ATLAS lines merged)');
    } else {
      const source = fs.existsSync(path.join(TEMPLATES_DIR, '.gitignore')) ? '.gitignore' : 'gitignore';
      writeFileSync(gitignorePath, workspace.mergeGitignore(readTemplate(source), mode));
      added('.gitignore');
    }
    const gitattributesPath = path.join(resolvedDir, '.gitattributes');
    const attrs = fs.existsSync(gitattributesPath) ? fs.readFileSync(gitattributesPath, 'utf-8') : '';
    writeFileSync(gitattributesPath, mergeLines(attrs, GITATTRIBUTES_LINES));
    added('.gitattributes (LF for ATLAS files)');

    // misc/self/ — ATLAS identity docs (vanilla has no identity, skip).
    // Renamed Boss -> Partner at copy time per the partner naming.
    if (variant !== 'vanilla') {
      const selfDir = path.join(resolvedDir, 'misc', 'self');
      copyDirSync(path.join(TEMPLATES_DIR, 'misc', 'self'), selfDir);
      for (const file of fs.readdirSync(selfDir)) {
        if (!file.endsWith('.md')) continue;
        const filePath = path.join(selfDir, file);
        const content = fs.readFileSync(filePath, 'utf-8').replace(/\bBoss\b/g, 'Partner').replace(/\bboss\b/g, 'partner');
        fs.writeFileSync(filePath, content, 'utf-8');
      }
      added('misc/self/');
    }

    // Archive — retired material shipped for reference only; nothing activates it.
    const archiveTemplateDir = path.join(TEMPLATES_DIR, 'misc', 'archive');
    if (fs.existsSync(archiveTemplateDir)) {
      copyDirSync(archiveTemplateDir, path.join(resolvedDir, 'misc', 'archive'));
      added('misc/archive/ (reference only — don\'t use)');
    }

    // .claude/ — agents, commands, hooks, rules, scripts, templates copied whole;
    // skills copied selectively below.
    for (const dir of ['agents', 'commands', 'hooks', 'rules', 'scripts', 'templates']) {
      const src = path.join(TEMPLATES_DIR, '.claude', dir);
      if (fs.existsSync(src)) {
        copyDirSync(src, path.join(claudeDir, dir));
        added(`.claude/${dir}/`);
      }
    }

    if (selectedSkills.length > 0) {
      for (const skill of selectedSkills) {
        copyDirSync(path.join(TEMPLATES_DIR, '.claude', 'skills', skill), path.join(claudeDir, 'skills', skill));
      }
      added(`.claude/skills/ (${selectedSkills.length} selected)`);
    } else {
      skipped('.claude/skills/ — none selected, skipped');
    }

    // Settings: shared guardrails (committed) and personal comfort (gitignored).
    const options = { playwright: browser === 'mcp', playwrightCli: browser === 'cli', isolatedBrowser };
    const context = contextSettings({ compactPct, advisor });
    writeSettings(path.join(claudeDir, 'settings.json'), sharedSettings(), contextFile === 'shared' ? context : {});
    added('.claude/settings.json (secret guardrails, shared)');
    writeSettings(path.join(claudeDir, 'settings.local.json'), personalSettings(options), contextFile === 'local' ? context : {});
    added('.claude/settings.local.json (permissions, notifications, personal)');

    gitkeep(path.join(claudeDir, 'worktrees'));

    // .atlas/config.json — the workspace mode; secrets/ appears on first use (gitignored)
    const pkg = require(path.join(TEMPLATES_DIR, 'package.json'));
    const config = { mode, version: pkg.version };
    if (mode !== 'multi') config.project = project.name;
    writeFileSync(path.join(resolvedDir, '.atlas', 'config.json'), JSON.stringify(config, null, 2) + '\n');
    added(`.atlas/config.json (mode: ${mode})`);

    // Project memory: a map, a status, an env contract. Nothing else up front:
    // docs/ folders appear when the first decision, phase, or spec does.
    const writeIfAbsent = (file, content, label) => {
      if (fs.existsSync(file)) return skipped(`${label} already exists — kept`);
      writeFileSync(file, content);
      added(label);
    };
    if (mode === 'multi') {
      let index = workspace.template('index.md');
      if (project) {
        const files = workspace.projectFiles('multi', { name: project.name, stage: project.stage });
        for (const [file, content] of Object.entries(files)) {
          writeIfAbsent(path.join(resolvedDir, 'projects', project.name, file), content, `projects/${project.name}/${file}`);
        }
        index = workspace.upsertIndexRow(index, {
          Project: project.name, Stage: project.stage, Path: `projects/${project.name}`, Deploy: 'none', Status: 'nothing started yet',
        });
      } else {
        gitkeep(path.join(resolvedDir, 'projects'));
      }
      writeIfAbsent(path.join(resolvedDir, 'index.md'), index, 'index.md (project registry)');
      gitkeep(path.join(resolvedDir, 'general'));
      added('general/ (work that belongs to no project)');
    } else {
      const files = workspace.projectFiles(mode, { name: project.name, stage: project.stage });
      for (const [file, content] of Object.entries(files)) writeIfAbsent(path.join(resolvedDir, file), content, file);
      if (mode === 'project') {
        gitkeep(path.join(resolvedDir, 'repos'));
        added('repos/ (clone each code repo into repos/<name>/)');
      }
    }

    // Browser automation files
    if (options.playwright) {
      writeFileSync(path.join(resolvedDir, '.mcp.json'), generateMcpJson(options));
      added('.mcp.json');
      if (!isolatedBrowser) gitkeep(path.join(resolvedDir, 'misc', 'browser-storage'));
    }
    if (options.playwrightCli) {
      writeFileSync(path.join(resolvedDir, '.playwright', 'cli.config.json'), generatePlaywrightCliConfig(isolatedBrowser));
      added(`.playwright/cli.config.json (${browserProfile})`);
    }

    // External information: reference docs + the anthropics/skills submodule
    const eiDir = path.join(resolvedDir, 'docs', 'external-information');
    const eiRelative = path.relative(resolvedDir, eiDir).split(path.sep).join('/');
    const eiTemplateDir = path.join(TEMPLATES_DIR, 'docs', 'external-information');
    if (fs.existsSync(eiTemplateDir)) {
      ensureDir(eiDir);
      for (const file of fs.readdirSync(eiTemplateDir)) {
        const src = path.join(eiTemplateDir, file);
        if (fs.statSync(src).isFile() && file.endsWith('.md')) fs.copyFileSync(src, path.join(eiDir, file));
      }
      added(`${eiRelative}/ (reference docs)`);
    }

    if (!fs.existsSync(path.join(resolvedDir, '.git'))) {
      if (git(['init'], resolvedDir).status === 0) added('git init');
    }
    if (process.env.ATLAS_SKIP_SUBMODULE) {
      skipped(`${eiRelative}/skills submodule — skipped (ATLAS_SKIP_SUBMODULE)`);
    } else {
      // SSH first (matches the root repo), HTTPS as fallback for machines without GitHub SSH keys.
      const urls = ['git@github.com:anthropics/skills.git', 'https://github.com/anthropics/skills.git'];
      const ok = urls.some((url) => git(['submodule', 'add', '-b', 'main', url, `${eiRelative}/skills`], resolvedDir).status === 0);
      if (ok) added(`${eiRelative}/skills (submodule, tracks main)`);
      else {
        print(`  ${YELLOW}⚠${RESET} Could not add the skills submodule. Run manually:`);
        print(`  ${DIM}  git submodule add https://github.com/anthropics/skills.git ${eiRelative}/skills${RESET}`);
      }
    }

    // ─── Summary ──────────────────────────────────────────────────────────

    const browserLabel = browser === 'none' ? 'none' : `${browser === 'mcp' ? 'Playwright MCP' : 'Playwright CLI'} (${browserProfile})`;
    print();
    print(`${BRIGHT_ORANGE}${BOLD}  ${variant === 'vanilla' ? 'Project' : 'ATLAS'} scaffolded successfully!${RESET}`);
    print();
    print(`  ${ORANGE}${BOLD}CLAUDE.md:${RESET} ${variant}`);
    print(`  ${ORANGE}${BOLD}Mode:${RESET}      ${mode}${project ? ` (project: ${project.name}, ${project.stage})` : ''}`);
    print(`  ${ORANGE}${BOLD}Location:${RESET}  ${resolvedDir}`);
    if (partnerName) print(`  ${ORANGE}${BOLD}Partner:${RESET}   ${partnerName}`);
    print(`  ${ORANGE}${BOLD}Skills:${RESET}    ${selectedSkills.length > 0 ? `${selectedSkills.length} installed` : 'none'}`);
    print(`  ${ORANGE}${BOLD}Browser:${RESET}   ${browserLabel}`);
    print(`  ${ORANGE}${BOLD}Context:${RESET}   compact ${compactPct ? `at ${compactPct}%` : 'at default'}, advisor ${advisor || 'off'}`);
    print();
    print(`${DIM}  Next steps:${RESET}`);
    let step = 1;
    if (resolvedDir !== process.cwd()) {
      print(`  ${DIM}  ${step++}. cd ${path.relative(process.cwd(), resolvedDir) || '.'}${RESET}`);
    }
    if (browser === 'cli') print(`  ${DIM}  ${step++}. Install Playwright CLI: npm install -g @playwright/cli@latest${RESET}`);
    print(`  ${DIM}  ${step++}. Store API keys once, in your own terminal: node .claude/scripts/secrets.cjs set KEY${RESET}`);
    print(`  ${DIM}  ${step++}. Open in Claude Code${mode === 'multi' ? ' and run /atlas:project add <name>' : ' and run /atlas:get-to-know'}${RESET}`);
    if (variant !== 'vanilla') print(`  ${DIM}  ${step++}. Ask: "Who are you?" to activate ATLAS${RESET}`);
    print();

    // ─── Commit Prompt ────────────────────────────────────────────────────

    const commitAnswer = await prompter.ask('Would you like to commit these changes? (Y/n)');
    prompter.close();

    if (!['n', 'no'].includes(commitAnswer.toLowerCase())) {
      const addOk = git(['add', '-A'], resolvedDir).status === 0;
      const commitOk = addOk && git(['commit', '-m', 'feat: scaffold ATLAS workspace'], resolvedDir).status === 0;
      print(commitOk ? `  ${ORANGE}${BOLD}✓${RESET} Changes committed!` : `  ${YELLOW}⚠${RESET} Could not commit (is git user.name/email set?)`);
      print();
    }
  } catch (err) {
    prompter.close();
    console.error(`\n  Error: ${err.message}`);
    process.exit(1);
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHeader();
    printUsage();
    process.exit(0);
  }

  if (command === '--version' || command === '-v' || command === 'version') {
    const pkg = require(path.join(__dirname, '..', 'package.json'));
    print(pkg.version);
    process.exit(0);
  }

  if (command === 'new-project') {
    const folderArg = args[1];
    const targetDir = folderArg ? path.resolve(process.cwd(), folderArg) : process.cwd();
    scaffold(targetDir);
    return;
  }

  print();
  print(`${RED}  Unknown command: ${BOLD}${command}${RESET}`);
  printUsage();
  process.exit(1);
}

if (require.main === module) main();

module.exports = { dropLegacyHooks, mergeSettings, sharedSettings, personalSettings, contextSettings, mergeLines, detectMode };
