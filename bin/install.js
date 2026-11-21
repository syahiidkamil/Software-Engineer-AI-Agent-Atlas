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
  print(`    swe-atlas update ${DIM}[folder-name] [--apply] [--take <path>] [--keep <path>] [--base <dir>] [--stage <dir>] [--json]${RESET}`);
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
  print(`    npx swe-atlas@latest update        ${DIM}# recommend what to update here; changes nothing${RESET}`);
  print(`    npx swe-atlas@latest update --apply ${DIM}# apply the safe part of that recommendation${RESET}`);
  print();
  print(`${BOLD}  update${RESET} ${DIM}compares a workspace with this package and sorts every file: safe to replace,${RESET}`);
  print(`  ${DIM}needs a merge, or yours (never touched). .claude/atlas-manifest.json draws that line.${RESET}`);
  print(`    --apply         ${DIM}write the safe items (new, unedited-and-changed, dropped) and the install record${RESET}`);
  print(`    --take <path>   ${DIM}overwrite a file or folder with the template's version; also installs a skill${RESET}`);
  print(`    --keep <path>   ${DIM}keep your version and stop reporting it${RESET}`);
  print(`    --base <dir>    ${DIM}the unpacked package you installed from, to tell your edits from template changes${RESET}`);
  print(`    --stage <dir>   ${DIM}write new/, base/ and merged/ copies of the files that need a decision${RESET}`);
  print(`    --variant <v>   ${DIM}vanilla | atlas-autonomous | atlas-collaborative, when the recorded or inferred one is wrong${RESET}`);
  print(`    --partner <n>   ${DIM}the name CLAUDE.md calls you, when the recorded or inferred one is wrong${RESET}`);
  print(`    --json          ${DIM}the plan as JSON${RESET}`);
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

// Set by new-project to the folder being scaffolded. Nothing below it is written through a
// symlink: the file behind one may be outside the folder (a shared dotfile, another repo).
let writeRoot = null;
function refuseSymlink(filePath) {
  if (!writeRoot) return;
  const rel = path.relative(writeRoot, filePath).split(path.sep).join('/');
  if (!rel || rel.startsWith('..')) return;
  const link = tpl.symlinkOn(writeRoot, rel);
  if (link) throw new Error(`refusing to write ${rel}: ${link} is a symlink, and the file behind it may be outside this folder`);
}

function writeFileSync(filePath, content) {
  refuseSymlink(filePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function gitkeep(dirPath) {
  refuseSymlink(path.join(dirPath, '.gitkeep'));
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
const tpl = require('./lib/template.js');
const updater = require('./lib/update.js');

// Who owns which path, and what earlier releases shipped that this one dropped.
const MANIFEST = tpl.loadManifest(TEMPLATES_DIR);

function readTemplate(...segments) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, ...segments), 'utf-8');
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

/**
 * .mcp.json with the chosen servers set and every other server of the user's kept.
 * Returns null when the existing file is in a shape this does not understand.
 */
function mergeMcpJson(existing, generated) {
  if (!existing) return generated;
  const mine = JSON.parse(existing);
  if (!isPlainObject(mine) || (mine.mcpServers !== undefined && !isPlainObject(mine.mcpServers))) return null;
  return jsonLike(existing, { ...mine, mcpServers: { ...(mine.mcpServers || {}), ...JSON.parse(generated).mcpServers } });
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
 * (permission rules) and of the shell (the guard hook), and a compaction is told
 * what its summary has to keep.
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
        // A deny rule has no exception, so `.env.*` would also hide .env.example (the contract):
        // the real ones are named. The shell hook covers every other .env.<name>.
        'Read(**/.env.staging)',
        'Read(**/.env.development)',
        'Read(**/.env.test)',
      ],
    },
    hooks: {
      PreToolUse: [hook('Bash', hookCmd('guard-secrets.cjs'))],
      // Its stdout becomes instructions for the compaction summary: approvals, constraints and progress survive it.
      PreCompact: [hook('', hookCmd('compact-keep.cjs'))],
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
 * objects merge, and scalars from `add` win (the user just chose them). A value
 * of the user's in a shape this does not expect (a hook event that is not a
 * list, `permissions` that is not an object) is left exactly as it is.
 */
function mergeSettings(base, add) {
  const out = { ...base };
  for (const [key, value] of Object.entries(add)) {
    const mine = base[key];
    const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
    if (key === 'hooks') {
      if (mine !== undefined && !isObject(mine)) continue;
      out.hooks = { ...(mine || {}) };
      for (const [event, groups] of Object.entries(value)) {
        if (out.hooks[event] !== undefined && !Array.isArray(out.hooks[event])) continue;
        const existing = [...(out.hooks[event] || [])];
        // a group of the user's whose `hooks` is not a list has no commands to compare, and stays as it is
        const commands = new Set(existing.flatMap((g) => (g && Array.isArray(g.hooks) ? g.hooks : []).map((h) => h && h.command)));
        for (const g of groups) if (!g.hooks.some((h) => commands.has(h.command))) existing.push(g);
        out.hooks[event] = existing;
      }
    } else if (Array.isArray(value)) {
      if (mine !== undefined && !Array.isArray(mine)) continue;
      out[key] = [...new Set([...(mine || []), ...value])];
    } else if (value && typeof value === 'object') {
      if (mine !== undefined && !isObject(mine)) continue;
      out[key] = mergeSettings(mine || {}, value);
    } else if (!(key === 'defaultMode' && base[key]) && !(key === 'enableAllProjectMcpServers' && typeof mine === 'boolean')) {
      // those two are the user's once set: a server ATLAS adds is enabled by name (enabledMcpjsonServers)
      out[key] = value;
    }
  }
  return out;
}

// Hooks and files an older ATLAS scaffolded that a later release replaced (the
// manifest's `removed` list). Left in place they double every notification and
// keep loading removed agents. Both are touched only on proof: a file when its
// content is what that release shipped, a hook when the script it runs was such
// a file and is not in the workspace any more.

const LEGACY_SCRIPT = /^\.claude\/hooks\/[\w-]+\.c?js$/;

/** A hook command that runs one of this workspace's own `scripts` (.claude/hooks/<name>.cjs or .js), not a path that merely ends alike. */
function hookCommandPattern(scripts) {
  const names = scripts.filter((rel) => LEGACY_SCRIPT.test(rel)).map((rel) => path.posix.basename(rel).replace('.', '\\.'));
  if (!names.length) return null;
  const projectDir = '(?:\\$\\{?CLAUDE_PROJECT_DIR[^/\\\\\\s]*[\\\\/]|\\.[\\\\/])?';
  // what may follow the name: the end, a space, a quote, or the shell character that starts the rest of the line
  return new RegExp(`(?:^|[\\s"'=])${projectDir}\\.claude[\\\\/]hooks[\\\\/](?:${names.join('|')})(?=$|[\\s"';&|<>)])`);
}

/**
 * The hook scripts of an older ATLAS that are not in this workspace: removed just now, or by a run
 * that stopped before it reached the settings. A hook that runs one of them runs nothing, so the
 * run that finishes the job drops it, whichever run deleted the file.
 */
function legacyScriptsGone(dir, kept = []) {
  return MANIFEST.removed.map((r) => r.path).filter((rel) => LEGACY_SCRIPT.test(rel)
    && !kept.some((k) => rel === k || rel.startsWith(`${k}/`))
    && !tpl.symlinkOn(dir, rel) && !fs.existsSync(path.join(dir, ...rel.split('/'))));
}

// `node x.cjs; my-logger` is one hook doing two things. Only the user can take it apart.
const COMPOUND_COMMAND = /[;&|\n`]|\$\(/;

/**
 * Settings without the hooks that ran `scripts`. Only those entries go: a group or an event
 * disappears only when removing them emptied it, and anything in another shape is left alone.
 * A command that runs such a script and then something else stays too, and is added to `mixed`
 * so the caller can name it: the script it calls is gone, the rest of the line is the user's.
 * `dropped` collects the commands that went.
 */
function dropLegacyHooks(settings, scripts, mixed = [], dropped = []) {
  const pattern = hookCommandPattern(scripts || []);
  if (!pattern || !settings.hooks || typeof settings.hooks !== 'object' || Array.isArray(settings.hooks)) return settings;
  const hooks = {};
  for (const [event, groups] of Object.entries(settings.hooks)) {
    if (!Array.isArray(groups)) {
      hooks[event] = groups;
      continue;
    }
    const kept = [];
    for (const g of groups) {
      if (!g || !Array.isArray(g.hooks)) {
        kept.push(g);
        continue;
      }
      const rest = g.hooks.filter((h) => {
        const command = h && typeof h.command === 'string' ? h.command : '';
        if (!pattern.test(command)) return true;
        (COMPOUND_COMMAND.test(command) ? mixed : dropped).push(command);
        return COMPOUND_COMMAND.test(command);
      });
      if (rest.length === g.hooks.length) kept.push(g);
      else if (rest.length) kept.push({ ...g, hooks: rest });
    }
    if (kept.length || !groups.length) hooks[event] = kept;
  }
  return { ...settings, hooks };
}

/**
 * Remove what an older scaffold left behind, and return the paths removed. A file goes only when
 * its content is exactly what that release shipped (the manifest carries the hashes) and the user
 * has not kept it. Anything else at one of those paths is the user's own: in a repo ATLAS never
 * touched, .claude/agents/code-review.md is their agent. A customized DESIGN.md is kept too.
 */
function removeLegacy(dir, report, kept = []) {
  const removed = [];
  const isKept = (rel) => kept.some((k) => rel === k || rel.startsWith(`${k}/`));
  for (const r of MANIFEST.removed) {
    const top = path.join(dir, ...r.path.split('/'));
    if (tpl.symlinkOn(dir, r.path) || !fs.existsSync(top)) continue;
    const rels = fs.statSync(top).isDirectory() ? tpl.walk(top).map((sub) => `${r.path}/${sub}`) : [r.path];
    const gone = rels.filter((rel) => !isKept(rel) && (r.sha256 || []).includes(tpl.hash(rel, fs.readFileSync(path.join(dir, ...rel.split('/'))))));
    for (const rel of gone) {
      fs.rmSync(path.join(dir, ...rel.split('/')));
      updater.pruneEmptyDirs(dir, rel);
    }
    removed.push(...gone);
    if (gone.length) report(`removed ${r.path} (${r.note})`);
    for (const rel of rels.filter((x) => !gone.includes(x))) report(`kept your ${rel} (an older ATLAS shipped a file at this path; this one is not that file)`);
  }
  // The 2.x DESIGN.md template goes the same way: only the file exactly as shipped. One with a
  // single line of the user's in it is their design system, placeholder or not.
  const designRel = '.claude/rules/DESIGN.md';
  const design = path.join(dir, ...designRel.split('/'));
  const unfilled = (MANIFEST.moves.find((m) => m.from === designRel) || {}).sha256 || [];
  if (fs.existsSync(design) && !tpl.obstacle(dir, designRel) && !isKept(designRel)) {
    if (unfilled.includes(tpl.hash(designRel, fs.readFileSync(design)))) {
      fs.rmSync(design);
      report('removed the unfilled .claude/rules/DESIGN.md template (it loaded in every session)');
    } else {
      report('kept your .claude/rules/DESIGN.md; make it path-scoped with /design:create-design-md or /atlas:mode');
    }
  }
  return removed;
}

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

/** JSON text in the indentation and line endings the file already has (two spaces and LF for a new one). */
function jsonLike(existing, value) {
  const indent = (/^([ \t]+)"/m.exec(existing || '') || [])[1] || 2;
  const text = JSON.stringify(value, null, indent) + '\n';
  return /\r\n/.test(existing || '') ? text.replace(/\n/g, '\r\n') : text;
}

/**
 * `retired`: legacy scripts removed in this run; the hooks that ran them go with them. Every other
 * hook is the user's. Returns the hook commands it `dropped`, and the `mixed` ones that ran such a
 * script inside a longer line: kept.
 */
function writeSettings(file, retired, ...parts) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf-8') : '';
  const mixed = [];
  const dropped = [];
  let current = {};
  if (text) {
    try {
      current = JSON.parse(text);
    } catch {
      current = null;
    }
    // preflight refuses both before the first write; this is for a caller that skipped it
    if (!isPlainObject(current)) throw new Error(`${file} is not a JSON object; fix or remove it and run again`);
    current = dropLegacyHooks(current, retired, mixed, dropped);
  }
  const merged = parts.reduce((acc, p) => mergeSettings(acc, p), current);
  writeFileSync(file, jsonLike(text, merged));
  return { mixed, dropped };
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
  const eol = /\r\n/.test(existing || '') ? '\r\n' : '\n'; // a CRLF file stays CRLF
  const base = (existing || '').replace(/\s*$/, '');
  return `${base ? `${base}${eol}${eol}` : ''}${block.join(eol)}${eol}`;
}

/**
 * The ATLAS lines a .gitattributes still needs. A pattern the file already decides line endings
 * for is the user's call (`*.md text eol=crlf`): a later line of ours would override it.
 */
function gitattributesLines(existing) {
  const decided = new Set((existing || '').split(/\r?\n/).map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && /\s(-?text\b|eol=|binary\b)/.test(l))
    .map((l) => l.split(/\s+/)[0]));
  // `*.md` is the one line of ours that reaches the user's own files. With a rule of theirs for
  // every file (`* text=auto eol=crlf`) it would overrule them on their documents, so it stays out.
  if (decided.has('*')) decided.add('*.md');
  return GITATTRIBUTES_LINES.filter((l) => l.startsWith('#') || !decided.has(l.split(/\s+/)[0]));
}

/** The mode an ATLAS workspace already has; otherwise a guess: a code repo means repo mode, a fresh folder multi. */
function detectMode(dir) {
  if (!fs.existsSync(dir)) return 'multi';
  const { mode } = readConfig(dir);
  if (MODE_OPTIONS.some((o) => o.value === mode)) return mode;
  const markers = [
    '.git', 'src', 'Makefile', 'CMakeLists.txt',
    'package.json', 'go.mod', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'Gemfile', 'composer.json',
    'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts', 'Package.swift', 'pubspec.yaml', // mobile, JVM
    'project.godot', 'ProjectSettings', // games (Godot, Unity)
    'main.tf', 'Pulumi.yaml', 'Chart.yaml', 'dbt_project.yml', 'mix.exs', 'deno.json', // infrastructure, data, others
  ];
  if (markers.some((m) => fs.existsSync(path.join(dir, m)))) return 'repo';
  // project files named after the project: .NET solutions and Xcode projects
  return fs.readdirSync(dir).some((n) => /\.(sln|csproj|xcodeproj|xcworkspace)$/.test(n)) ? 'repo' : 'multi';
}

/** .atlas/config.json as an object; {} when it is missing or cannot be read. */
function readConfig(dir) {
  try {
    const config = JSON.parse(fs.readFileSync(path.join(dir, '.atlas', 'config.json'), 'utf-8'));
    return isPlainObject(config) ? config : {};
  } catch {
    return {};
  }
}

function git(args, cwd) {
  return spawnSync('git', args, { cwd, stdio: 'ignore' });
}

/** A git command's output, or '' when it fails (not a repo, no git). */
function gitOutput(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
  return r.status === 0 ? r.stdout : '';
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

/** Every path new-project writes besides the template's own files, for the check before the first write. */
function fixedTargets({ mode, project, options, isolatedBrowser }) {
  const out = ['NOTES.md', '.gitignore', '.gitattributes', '.claude/settings.json', '.claude/settings.local.json',
    '.claude/worktrees/.gitkeep', '.atlas/config.json', MANIFEST.record];
  const files = project ? Object.keys(workspace.projectFiles(mode, { name: project.name, stage: project.stage })) : [];
  if (mode === 'multi') {
    out.push('index.md', 'general/.gitkeep', ...(project ? files.map((f) => `projects/${project.name}/${f}`) : ['projects/.gitkeep']));
  } else {
    out.push(...files, ...(mode === 'project' ? ['repos/.gitkeep'] : []));
  }
  if (options.playwright) out.push('.mcp.json', ...(isolatedBrowser ? [] : ['misc/browser-storage/.gitkeep']));
  if (options.playwrightCli) out.push('.playwright/cli.config.json');
  return out;
}

/**
 * Refuse before anything is written: a path that is or sits under a symlink (the file behind it
 * may be outside this folder), a folder where a file goes or the reverse, and a JSON file this
 * would merge into that does not parse.
 */
function preflight(dir, targets) {
  const problems = [];
  for (const rel of targets) {
    const o = tpl.obstacle(dir, rel);
    if (o && !problems.some((p) => p.startsWith(`${o.at} `))) problems.push(`${o.at} is ${o.why}`);
  }
  // .atlas/config.json too: read as {} it would be rewritten from the answers, without the keys it held
  for (const rel of targets.filter((t) => ['.claude/settings.json', '.claude/settings.local.json', '.mcp.json', '.atlas/config.json'].includes(t))) {
    const file = path.join(dir, ...rel.split('/'));
    if (problems.length || !fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const why = !text.trim() ? ' (it is empty: delete it, or put {} in it)'
        : text.charCodeAt(0) === 0xfeff ? ' (it starts with a byte-order mark: save it as UTF-8 without one)' : '';
      problems.push(`${rel} is not valid JSON${why}`);
      continue;
    }
    // settings are merged key by key, which needs an object; .mcp.json in another shape is kept as it is
    if (rel !== '.mcp.json' && !isPlainObject(parsed)) problems.push(`${rel} is not a JSON object (it holds ${JSON.stringify(parsed).slice(0, 20)})`);
  }
  if (problems.length) throw new Error(`nothing was written, because:\n    ${problems.join('\n    ')}\n  Fix or move these, then run again.`);
}

/**
 * Files already here that differ from the ones about to be written, where nothing says the file
 * is ATLAS's and untouched. They may be the user's (their own commit agent, a command they
 * edited), so replacing them is asked, once. Only a recorded hash that still matches is proof:
 * "this is an ATLAS workspace" says nothing about who wrote one file in it. A folder with a
 * shipped skill's name that holds none of that skill's files is asked about too.
 * Returns the paths to leave alone; a folder ends in "/".
 */
async function askAboutYourFiles(prompter, dir, toPlace, { prior, hadClaudeMd, isKept }) {
  const at = (rel) => path.join(dir, ...rel.split('/'));
  const yours = toPlace.filter(([rel, buf]) => {
    // "Overwrite existing ATLAS files?" was asked about CLAUDE.md by name and answered yes
    if ((hadClaudeMd && rel === 'CLAUDE.md') || isKept(rel) || !fs.existsSync(at(rel))) return false;
    const mine = tpl.hash(rel, fs.readFileSync(at(rel)));
    return mine !== tpl.hash(rel, buf) && !(prior && prior.files[rel] === mine);
  }).map(([rel]) => rel);
  const skills = [...new Set(toPlace.map(([rel]) => tpl.skillOf(rel)).filter(Boolean))];
  const folders = skills.filter((name) => {
    const folder = `.claude/skills/${name}`;
    if (isKept(folder) || (prior && prior.skills.includes(name)) || !fs.existsSync(at(folder))) return false;
    return fs.readdirSync(at(folder)).length > 0 && !toPlace.some(([rel]) => tpl.skillOf(rel) === name && fs.existsSync(at(rel)));
  }).map((name) => `.claude/skills/${name}/`);
  const all = [...yours, ...folders];
  if (!all.length) return [];
  const one = all.length === 1;
  print();
  print(`${YELLOW}  ${all.length} path${one ? '' : 's'} already here ${one ? 'differs' : 'differ'} from what ATLAS ships at the same place:${RESET}`);
  // every one of them: y replaces exactly what is named here, so none may hide behind "and N more"
  for (const rel of all) print(`    ${rel}`);
  if (!prior && hadClaudeMd) {
    print(`${DIM}  Nothing here records which of these an older ATLAS installed and which are yours.${RESET}`);
    print(`${DIM}  swe-atlas update sorts them one by one; y here replaces all of them.${RESET}`);
  }
  const answer = await prompter.ask(`Replace ${one ? 'it' : 'them'} with ATLAS's? (y/N — N keeps yours and writes everything else)`);
  print();
  return ['y', 'yes'].includes(answer.toLowerCase()) ? [] : all;
}

async function scaffold(targetDir) {
  printHeader();

  const resolvedDir = path.resolve(targetDir);
  print(`  ${ORANGE}${BOLD}Target:${RESET} ${resolvedDir}`);
  print();

  const prompter = createPrompter();
  let started = false; // true from the first write on

  try {
    // Guard: don't silently overwrite an existing scaffold
    const hadClaudeMd = fs.existsSync(path.join(resolvedDir, 'CLAUDE.md'));
    if (hadClaudeMd) {
      print(`${YELLOW}  CLAUDE.md already exists in the target directory.${RESET}`);
      print(`${DIM}  To bring an existing workspace up to date without losing edits, run: swe-atlas update${RESET}`);
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
    // An ATLAS workspace already has a name for its project: stored secrets are filed under it.
    const existingConfig = readConfig(resolvedDir);
    const defaultName = (typeof existingConfig.project === 'string' && existingConfig.project) || atlasLib.defaultProjectName(resolvedDir);
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
    writeRoot = resolvedDir;
    const claudeDir = path.join(resolvedDir, '.claude');
    const added = (label) => print(`  ${ORANGE}+${RESET} ${label}`);
    const skipped = (label) => print(`  ${DIM}  ${label}${RESET}`);
    const options = { playwright: browser === 'mcp', playwrightCli: browser === 'cli', isolatedBrowser };

    // Everything the template ships, as one set (bin/lib/template.js): the same
    // set `swe-atlas update` compares against, so the two cannot drift apart.
    const rendered = tpl.renderTemplate(TEMPLATES_DIR, { variant, partner: partnerName, mode, block: workspace.workspaceBlock });
    const chosenSkills = new Set(selectedSkills);
    const toPlace = [...rendered].filter(([rel]) => !tpl.skillOf(rel) || chosenSkills.has(tpl.skillOf(rel)));

    // Checked before the first write, so a refusal leaves the folder as it was. The paths first:
    // with .atlas a file or a link, reading the record fails for a reason that names neither.
    preflight(resolvedDir, [...toPlace.map(([rel]) => rel), ...fixedTargets({ mode, project, options, isolatedBrowser })]);
    const prior = tpl.readRecord(resolvedDir, MANIFEST);
    const kept = prior ? prior.kept : [];
    const isKept = (rel) => kept.some((k) => rel === k || rel.startsWith(`${k}/`));
    const hadGit = fs.existsSync(path.join(resolvedDir, '.git'));
    const dirtyBefore = hadGit && gitOutput(['status', '--porcelain'], resolvedDir).trim() !== '';
    // No git yet, but files: the first commit would take every one of them, whatever they are.
    const untracked = !hadGit && fs.readdirSync(resolvedDir).length > 0;
    const keepMine = new Set(await askAboutYourFiles(prompter, resolvedDir, toPlace, { prior, hadClaudeMd, isKept }));
    started = true;
    removeLegacy(resolvedDir, (msg) => print(`  ${YELLOW}-${RESET} ${msg}`), kept);
    const retired = legacyScriptsGone(resolvedDir, kept);

    // A skill is written whole or not at all: a folder the user kept, or one holding a file they
    // just said to keep, gets none of ATLAS's files beside theirs.
    const mineSkills = new Set([...chosenSkills].filter((name) => isKept(`.claude/skills/${name}`)
      || keepMine.has(`.claude/skills/${name}/`) || [...keepMine].some((rel) => tpl.skillOf(rel) === name)));
    const installed = {};
    for (const [rel, buf] of toPlace) {
      if (keepMine.has(rel) || isKept(rel) || mineSkills.has(tpl.skillOf(rel))) continue;
      tpl.place(resolvedDir, rel, buf, TEMPLATES_DIR);
      installed[rel] = tpl.hash(rel, buf);
    }
    const shipped = (prefix) => Object.keys(installed).some((rel) => rel.startsWith(prefix));
    const here = (rel) => fs.existsSync(path.join(resolvedDir, ...rel.split('/')));
    if ('CLAUDE.md' in installed) added(`CLAUDE.md (${variant}, ${mode} mode)`);
    if (keepMine.size) skipped(`${keepMine.size} path${keepMine.size === 1 ? '' : 's'} of yours kept (listed above); swe-atlas update lists them`);
    for (const name of mineSkills) skipped(`.claude/skills/${name}/ is yours: none of the ${name} skill's files were written into it`);
    // a path taken over with `update --keep` stays the user's here too
    const yours = (rel) => isKept(rel) && (skipped(`${rel} is marked as yours (update --keep): left as it is`), true);

    // NOTES.md is the user's from the first line on: seeded once, never overwritten.
    const writeIfAbsent = (file, content, label) => {
      if (fs.existsSync(file)) return skipped(`${label} already exists — kept`);
      writeFileSync(file, content);
      added(label);
    };
    writeIfAbsent(path.join(resolvedDir, 'NOTES.md'), readTemplate('NOTES.md'), 'NOTES.md');

    // .gitignore — the root .gitignore is the source; the published tarball
    // ships it as `gitignore` (npm strips dotted .gitignore files; see prepack).
    // An existing file is kept and only gains the ATLAS lines it lacks: secrets
    // must be ignored even in a repo that already has its own .gitignore.
    const gitignorePath = path.join(resolvedDir, '.gitignore');
    if (yours('.gitignore')) {
      // nothing to do
    } else if (fs.existsSync(gitignorePath)) {
      writeFileSync(gitignorePath, workspace.mergeGitignore(fs.readFileSync(gitignorePath, 'utf-8'), mode));
      added('.gitignore (ATLAS lines merged)');
    } else {
      const source = fs.existsSync(path.join(TEMPLATES_DIR, '.gitignore')) ? '.gitignore' : 'gitignore';
      writeFileSync(gitignorePath, workspace.mergeGitignore(readTemplate(source), mode));
      added('.gitignore');
    }
    const gitattributesPath = path.join(resolvedDir, '.gitattributes');
    const attrs = fs.existsSync(gitattributesPath) ? fs.readFileSync(gitattributesPath, 'utf-8') : '';
    if (!yours('.gitattributes')) {
      writeFileSync(gitattributesPath, mergeLines(attrs, gitattributesLines(attrs)));
      added('.gitattributes (LF for ATLAS files)');
    }

    // misc/self/ holds the ATLAS identity docs, with Boss renamed to Partner
    // (vanilla has no identity). misc/archive/ is retired material, reference only.
    if (shipped('misc/self/')) added('misc/self/');
    if (shipped('misc/archive/')) added('misc/archive/ (reference only — don\'t use)');
    for (const dir of tpl.CLAUDE_DIRS.filter((d) => d !== 'skills')) {
      if (shipped(`.claude/${dir}/`)) added(`.claude/${dir}/`);
    }
    const skillsWritten = selectedSkills.length - mineSkills.size;
    if (selectedSkills.length > 0) added(`.claude/skills/ (${skillsWritten} written)`);
    else skipped('.claude/skills/ — none selected, skipped');

    // Settings: shared guardrails (committed) and personal comfort (gitignored).
    const context = contextSettings({ compactPct, advisor });
    const mixedHooks = [];
    const settle = (file, { mixed, dropped }) => {
      mixedHooks.push(...mixed.map((command) => [file, command]));
      if (dropped.length) print(`  ${YELLOW}-${RESET} removed ${dropped.length} hook${dropped.length === 1 ? '' : 's'} from ${file}: the script ${dropped.length === 1 ? 'it' : 'they'} ran came with an older ATLAS and is gone`);
    };
    if (yours('.claude/settings.json')) {
      if (contextFile === 'shared' && (compactPct || advisor)) print(`  ${YELLOW}⚠${RESET} so the compaction/advisor choice was not saved; add it to .claude/settings.json yourself`);
    } else {
      settle('.claude/settings.json', writeSettings(path.join(claudeDir, 'settings.json'), retired, sharedSettings(), contextFile === 'shared' ? context : {}));
      added('.claude/settings.json (secret guardrails, compaction instructions; shared)');
    }
    settle('.claude/settings.local.json', writeSettings(path.join(claudeDir, 'settings.local.json'), retired, personalSettings(options), contextFile === 'local' ? context : {}));
    added('.claude/settings.local.json (permissions, notifications, personal)');
    for (const [file, command] of mixedHooks) {
      print(`  ${YELLOW}⚠${RESET} a hook in ${file} runs a script of an older ATLAS that is gone, inside a longer command. The hook was left as it is:`);
      print(`      ${command}`);
      print(`      ${DIM}Take the script out of that line yourself (what follows a ";" still runs, what follows "&&" does not).${RESET}`);
    }

    gitkeep(path.join(claudeDir, 'worktrees'));

    // .atlas/config.json — the workspace mode; secrets/ appears on first use (gitignored).
    // .atlas/installed.json — which template version is here and a hash of each file
    // as shipped, so `swe-atlas update` can tell your edits from template changes.
    const pkg = require(path.join(TEMPLATES_DIR, 'package.json'));
    // Keys this does not set (a project's own, or one a later version adds) stay as they are.
    const config = { ...existingConfig, mode };
    if (mode === 'multi') delete config.project;
    else config.project = project.name;
    const configPath = path.join(resolvedDir, '.atlas', 'config.json');
    writeFileSync(configPath, jsonLike(fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf-8') : '', config));
    added(`.atlas/config.json (mode: ${mode})`);
    // What an earlier run recorded stays true for every file this run did not write: the hash of
    // a file the user chose to keep, a skill that was not ticked again, a folder still unsure.
    const priorFiles = prior ? Object.entries(prior.files).filter(([rel]) => !(rel in installed) && !isKept(rel) && here(rel)) : [];
    const written = new Set(Object.keys(installed).map(tpl.skillOf).filter(Boolean));
    const still = (name) => !written.has(name) && !isKept(`.claude/skills/${name}`) && here(`.claude/skills/${name}`);
    const unsure = prior ? prior.unsure.filter(still) : [];
    // Files left for a decision came from an older version: `update` needs that package to merge them.
    const from = prior ? prior.pendingBase || prior.version : typeof existingConfig.version === 'string' && existingConfig.version;
    const pendingBase = (keepMine.size || unsure.length) && from && from !== pkg.version ? from : undefined;
    tpl.writeRecord(resolvedDir, MANIFEST, {
      version: pkg.version,
      variant,
      partner: partnerName,
      ...(pendingBase ? { pendingBase } : {}),
      blocks: [...new Set([...(prior ? prior.blocks : []), ...tpl.blockHashes(workspace.workspaceBlock)])].sort(),
      skills: [...new Set([...written, ...(prior ? prior.skills.filter(still) : [])])].sort(),
      ...(unsure.length ? { unsure } : {}),
      kept: [...kept].sort(),
      files: { ...Object.fromEntries(priorFiles), ...installed },
    });
    added(`${MANIFEST.record} (version ${pkg.version}, the baseline for swe-atlas update)`);

    // Project memory: a map, a status, an env contract. Nothing else up front:
    // docs/ folders appear when the first decision, phase, or spec does.
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

    // Browser automation files. Both are the user's once they exist: .mcp.json gains the
    // playwright server and keeps every other one, an existing CLI config is left as it is.
    if (options.playwright) {
      const mcpPath = path.join(resolvedDir, '.mcp.json');
      const before = fs.existsSync(mcpPath) ? fs.readFileSync(mcpPath, 'utf-8') : null;
      const generated = generateMcpJson(options);
      const merged = mergeMcpJson(before, generated);
      const entry = (text) => JSON.stringify(((JSON.parse(text) || {}).mcpServers || {}).playwright);
      const replaced = before !== null && merged !== null && entry(before) !== undefined && entry(before) !== entry(generated);
      if (merged === null) {
        print(`  ${YELLOW}⚠${RESET} .mcp.json is not in the usual shape, so it was left as it is. Add the playwright server yourself.`);
      } else {
        writeFileSync(mcpPath, merged);
        added(`.mcp.json (playwright server${replaced ? ' set to the profile chosen here, replacing the entry that was there' : ''}; your other servers stay)`);
      }
      if (!isolatedBrowser) gitkeep(path.join(resolvedDir, 'misc', 'browser-storage'));
    }
    if (options.playwrightCli) {
      writeIfAbsent(path.join(resolvedDir, '.playwright', 'cli.config.json'), generatePlaywrightCliConfig(isolatedBrowser), `.playwright/cli.config.json (${browserProfile})`);
    }

    // External information: reference docs + the anthropics/skills submodule
    const eiDir = path.join(resolvedDir, 'docs', 'external-information');
    const eiRelative = path.relative(resolvedDir, eiDir).split(path.sep).join('/');
    if (shipped(`${eiRelative}/`)) added(`${eiRelative}/ (reference docs)`);

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
    print(`  ${ORANGE}${BOLD}Skills:${RESET}    ${skillsWritten > 0 ? `${skillsWritten} installed` : 'none'}`);
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

    // `git add -A` takes everything. In a repo that already had uncommitted work, or a folder of
    // files that never had git, that would all land in a commit called "scaffold ATLAS workspace",
    // secrets and node_modules included. So there the default is no.
    if (dirtyBefore) print(`${YELLOW}  This repo had uncommitted changes before the scaffold; a commit now would include them.${RESET}`);
    if (untracked) print(`${YELLOW}  This folder already held files and had no git; a commit now would include every one of them that .gitignore does not cover.${RESET}`);
    const careful = dirtyBefore || untracked;
    const commitAnswer = (await prompter.ask(`Would you like to commit these changes? ${careful ? '(y/N)' : '(Y/n)'}`)).toLowerCase();
    prompter.close();

    if (careful ? ['y', 'yes'].includes(commitAnswer) : !['n', 'no'].includes(commitAnswer)) {
      const addOk = git(['add', '-A'], resolvedDir).status === 0;
      const commitOk = addOk && git(['commit', '-m', 'feat: scaffold ATLAS workspace'], resolvedDir).status === 0;
      print(commitOk ? `  ${ORANGE}${BOLD}✓${RESET} Changes committed!` : `  ${YELLOW}⚠${RESET} Could not commit (is git user.name/email set?)`);
      print();
    }
  } catch (err) {
    prompter.close();
    console.error(`\n  Error: ${err.message}`);
    // Every step reads what is on disk and writes what is missing, so the same command finishes the job
    if (started) console.error('  The run stopped partway: some files are written and others are not. Fix the cause and run the same command again; repeating it is safe.');
    process.exit(1);
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

function addedLines(before, after) {
  const have = new Set((before || '').split(/\r?\n/));
  const lines = after.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#') && !have.has(l));
  return `adds ${lines.length} line${lines.length === 1 ? '' : 's'}: ${lines.join(', ')}`;
}

/**
 * The files that only ever gain lines. Each takes the current text (null when
 * the file is missing) and returns what it should become; the user's own lines
 * are never removed.
 */
function additiveMergers() {
  return {
    '.gitignore': (current, mode) => {
      const source = fs.existsSync(path.join(TEMPLATES_DIR, '.gitignore')) ? '.gitignore' : 'gitignore';
      const text = workspace.mergeGitignore(current === null ? readTemplate(source) : current, mode);
      return { text, changed: text !== current, note: addedLines(current, text) };
    },
    '.gitattributes': (current) => {
      const text = mergeLines(current || '', gitattributesLines(current));
      return { text, changed: text !== (current || ''), note: addedLines(current, text) };
    },
    '.claude/settings.json': (current) => {
      let before = {};
      if (current) {
        try {
          before = JSON.parse(current);
        } catch {
          throw new Error('.claude/settings.json is not valid JSON; fix it and run again');
        }
        if (!isPlainObject(before)) throw new Error('.claude/settings.json is not a JSON object; fix it and run again');
      }
      // Nothing is removed here, hooks included: every workspace `update` accepts was scaffolded by
      // 3.0.0 or later, which never wired a retired script, so any hook in this file is the user's.
      const after = mergeSettings(before, sharedSettings());
      return {
        text: jsonLike(current, after),
        changed: JSON.stringify(after) !== JSON.stringify(before),
        note: 'adds the ATLAS lines that are missing (secret deny rules, the guard hook, the compaction hook); your own settings and hooks stay',
      };
    },
  };
}

function versionParts(v) {
  return String(v).split('.').map((n) => parseInt(n, 10) || 0);
}

function isOlder(a, b) {
  const [x, y] = [versionParts(a), versionParts(b)];
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
}

function parseUpdateArgs(args) {
  const opts = { take: [], keep: [] };
  const valued = { '--take': 'take', '--keep': 'keep', '--base': 'base', '--stage': 'stage', '--variant': 'variant', '--partner': 'partner' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (valued[arg]) {
      if (i + 1 >= args.length) throw new Error(`${arg} needs a value`);
      const value = args[++i];
      if (Array.isArray(opts[valued[arg]])) opts[valued[arg]].push(value);
      else opts[valued[arg]] = value;
    } else if (arg.startsWith('-')) throw new Error(`unknown option ${arg}`);
    else if (!opts.dir) opts.dir = arg;
    else throw new Error(`unexpected argument ${arg}`);
  }
  return opts;
}

/**
 * `swe-atlas update`: print the recommendation. Nothing is written unless
 * --apply, --take, --keep or --stage is given, and none of them can write a
 * path the manifest calls the user's.
 */
function runUpdate(args) {
  const opts = parseUpdateArgs(args);
  if (opts.help) {
    printUsage();
    return;
  }
  const root = path.resolve(process.cwd(), opts.dir || '.');
  if (root === path.resolve(TEMPLATES_DIR)) throw new Error('this folder is the swe-atlas package itself, not a workspace');
  // CLAUDE.md and .claude/ exist in any Claude Code repo; these are files only ATLAS writes.
  const markers = ['.atlas/installed.json', '.atlas/config.json', '.claude/scripts/lib/atlas.cjs'];
  if (!fs.existsSync(path.join(root, 'CLAUDE.md')) || !markers.some((m) => fs.existsSync(path.join(root, ...m.split('/'))))) {
    throw new Error(`${root} is not an ATLAS workspace (no CLAUDE.md, or none of ${markers.join(', ')}). To put ATLAS into this folder run: swe-atlas new-project`);
  }
  if (opts.base && !fs.existsSync(path.join(path.resolve(opts.base), 'claude_md_variants'))) {
    throw new Error(`--base ${opts.base} is not an unpacked swe-atlas package (no claude_md_variants/)`);
  }
  const plan = updater.plan(root, TEMPLATES_DIR, { variant: opts.variant, partner: opts.partner, base: opts.base, additive: additiveMergers() });
  if (isOlder(plan.to, plan.from)) {
    throw new Error(`this package is ${plan.to} and the workspace is already at ${plan.from}. Run: npx swe-atlas@latest update`);
  }
  if (opts.stage !== undefined && !opts.stage.trim()) throw new Error('--stage needs a folder');
  const staged = opts.stage ? updater.stage(plan, path.resolve(process.cwd(), opts.stage)) : null;
  const writing = opts.apply || opts.take.length || opts.keep.length;
  const applied = writing ? updater.apply(plan, { safe: Boolean(opts.apply), take: opts.take, keep: opts.keep }) : null;

  if (opts.json) {
    print(JSON.stringify({ ...updater.toJSON(plan), staged, applied }, null, 2));
    return;
  }
  print(updater.format(plan));
  if (staged) {
    print();
    const where = path.resolve(process.cwd(), opts.stage);
    if (staged.some((s) => s.base)) {
      print(`Staged ${staged.length} file(s) under ${where}: new/ is this template, base/ is what you installed, merged/ is a three-way merge.`);
    } else if (plan.hasBase) {
      print(`Staged ${staged.length} file(s) under ${where}: new/ is this template. The --base you passed ships none of these files, so there is no base/ or merged/ for them.`);
    } else {
      const fetch = updater.baseToFetch(plan);
      print(`Staged ${staged.length} file(s) under ${where}: new/ is this template. base/ and the three-way merged/ need the package you installed: unpack ${fetch ? `swe-atlas@${fetch}` : 'that version'} and add --base <dir>.`);
    }
    for (const s of staged.filter((x) => x.merged)) print(`  ${s.path}  — ${s.conflicts ? `${s.conflicts} conflict(s) to resolve` : 'merges cleanly'}`);
  }
  print();
  if (applied) {
    print(`Applied: ${applied.written.length} written, ${applied.removed.length} removed, ${applied.kept.length} kept as yours. ${applied.pending} still ${applied.pending === 1 ? 'needs' : 'need'} a decision.`);
    print(`Recorded in ${MANIFEST.record}. Run update again to see what is left.`);
  } else {
    print('Nothing was changed. --apply writes the safe items; --take <path> and --keep <path> settle the rest one by one.');
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

  if (command === 'update') {
    try {
      runUpdate(args.slice(1));
    } catch (err) {
      console.error(`\n  Error: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  print();
  print(`${RED}  Unknown command: ${BOLD}${command}${RESET}`);
  printUsage();
  process.exit(1);
}

if (require.main === module) main();

module.exports = {
  dropLegacyHooks, hookCommandPattern, legacyScriptsGone, mergeSettings, mergeMcpJson, sharedSettings, personalSettings, contextSettings,
  mergeLines, gitattributesLines, detectMode, additiveMergers, parseUpdateArgs, isOlder,
};
