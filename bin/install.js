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

// ─── Templates ───────────────────────────────────────────────────────────────
// The package root is the single source of truth: the CLI copies files from
// it and substitutes tokens — it never regenerates content. The only inline
// generator left is settings.local.json, whose shape depends on answers and
// has no stable root counterpart (root's copy is untracked and personal).

function readTemplate(...segments) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, ...segments), 'utf-8');
}

// variant maps 1:1 to a complete template file in claude_md_variants/
function generateClaudeMd(variant, partnerName, wrapInAtlas) {
  return readTemplate('claude_md_variants', `${variant}.md`)
    .replaceAll('{{PARTNER_NAME}}', partnerName)
    .replaceAll('{{SELF_PREFIX}}', wrapInAtlas ? 'atlas/' : '');
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

function generateSettingsJson(options = {}) {
  const allow = [
    'Bash(git log:*)',
    'Bash(lsof:*)',
    'Bash(mkdir:*)',
    'Bash(xargs ls:*)',
    'Bash(find:*)',
    'WebFetch(domain:www.anthropic.com)',
  ];

  if (options.playwrightCli) {
    allow.push('Bash(playwright-cli:*)');
  }

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

  // ${CLAUDE_PROJECT_DIR} resolves at hook-execution time, so the file stays
  // valid if the project is moved or shared — never bake in absolute paths.
  const hookCmd = (script) =>
    `node "\${CLAUDE_PROJECT_DIR:-$PWD}/.claude/hooks/${script}"`;

  const settings = {
    permissions: {
      allow,
      deny: [],
      ask: [],
      defaultMode: 'acceptEdits',
    },
    enableAllProjectMcpServers: true,
    hooks: {
      Stop: [
        {
          matcher: '',
          hooks: [
            {
              type: 'command',
              command: hookCmd('task-complete.js'),
            },
          ],
        },
      ],
      PreToolUse: [
        {
          matcher: 'AskUserQuestion',
          hooks: [
            {
              type: 'command',
              command: hookCmd('ask-user-input.js'),
            },
          ],
        },
      ],
    },
  };

  const enabledServers = [];
  if (options.playwright) enabledServers.push('playwright');
  if (options.postgres) enabledServers.push('postgres');
  if (enabledServers.length > 0) {
    settings.enabledMcpjsonServers = enabledServers;
  }

  return JSON.stringify(settings, null, 2) + '\n';
}

// ─── Scaffold ────────────────────────────────────────────────────────────────

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
        {
          label: 'Vanilla',
          desc: 'minimal CLAUDE.md — just NOTES.md + decision logs, no ATLAS identity',
          value: 'vanilla',
        },
        {
          label: 'ATLAS — autonomous',
          desc: 'ATLAS identity, works independently, no partner-approval loop',
          value: 'atlas-autonomous',
        },
        {
          label: 'ATLAS — collaborative',
          desc: 'ATLAS identity with partner review/commit loop (classic)',
          value: 'atlas-collaborative',
        },
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

    // 3. Project type
    const mode = await askChoice(prompter, 'Project type?', [
      {
        label: 'Single repo',
        desc: 'One project, ATLAS identity wrapped in atlas/ folder',
        value: 'single',
      },
      {
        label: 'Multi repo',
        desc: 'Workspace with repos/ folder for multiple projects',
        value: 'multi',
      },
    ]);

    // 4. Browser automation — asked before skills so the picker can pre-check
    // the playwright-cli skill when the CLI option is chosen. Playwright via
    // MCP server or via the CLI skill.
    const browser = await askChoice(prompter, 'Browser automation?', [
      {
        label: 'None',
        desc: 'skip browser automation',
        value: 'none',
      },
      {
        label: 'Playwright MCP',
        desc: 'MCP server in .mcp.json (mcp__playwright__* tools)',
        value: 'mcp',
      },
      {
        label: 'Playwright CLI',
        desc: 'playwright-cli skill driving the Playwright CLI via Bash',
        value: 'cli',
      },
    ]);

    // 4b. Browser profile — isolated keeps the profile in memory (fresh state
    // per session, safe for concurrent/parallel testing); persistent saves it
    // to disk so logins survive restarts.
    let browserProfile = 'isolated';
    if (browser !== 'none') {
      browserProfile = await askChoice(prompter, 'Browser profile?', [
        {
          label: 'Isolated',
          desc: 'fresh in-memory profile per session — enables concurrent/parallel testing',
          value: 'isolated',
        },
        {
          label: 'Persistent',
          desc: 'profile saved to disk — logins survive browser restarts',
          value: 'persistent',
        },
      ]);
    }
    const isolatedBrowser = browserProfile === 'isolated';

    // 5. Skills — interactive checkbox. Some skills are pre-checked from the
    // choices above; the user can still toggle any off:
    //   • super-product-owner, super-ui-ux-design, human-writing,
    //     frontend-design, adversarial-review — pre-checked for every flavor
    //     (product, design, writing, UI, and self-review work)
    //   • free-will — added for the autonomous flavor, which drops the
    //     partner-approval loop and leans on deliberate decisions instead
    //   • playwright-cli — added when Playwright CLI is the browser option
    const skillOptions = listSkills();
    let selectedSkills = [];
    if (skillOptions.length > 0) {
      const available = new Set(skillOptions.map((o) => o.value));
      const autoSkills = new Set([
        'super-product-owner',
        'super-ui-ux-design',
        'human-writing',
        'frontend-design',
        'adversarial-review',
      ]);
      if (variant === 'atlas-autonomous') autoSkills.add('free-will');
      if (browser === 'cli') autoSkills.add('playwright-cli');
      const preselected = [...autoSkills].filter((s) => available.has(s));
      selectedSkills = await askCheckbox(
        prompter,
        'Which skills to install?',
        skillOptions,
        preselected
      );
    }

    // 6. DESIGN.md template — visual identity skeleton in .claude/rules/
    const designAnswer = await prompter.ask(
      'Include the DESIGN.md template (visual identity rule in .claude/rules/)? (Y/n)'
    );
    const includeDesignMd = !['n', 'no'].includes(designAnswer.toLowerCase());

    // 7. PostgreSQL MCP server
    const postgresAnswer = await prompter.ask('Enable PostgreSQL MCP server? (y/N)');
    const postgres = ['y', 'yes'].includes(postgresAnswer.toLowerCase());

    // ─── Write Files ──────────────────────────────────────────────────────

    print();
    print(`${ORANGE}${BOLD}  Scaffolding ATLAS...${RESET}`);
    print();

    ensureDir(resolvedDir);

    // Single-repo mode wraps the ATLAS identity in atlas/; vanilla has no
    // identity to wrap, so everything stays at the project root.
    const wrapInAtlas = variant !== 'vanilla' && mode === 'single';
    const selfDir = wrapInAtlas
      ? path.join(resolvedDir, 'atlas', 'misc', 'self')
      : path.join(resolvedDir, 'misc', 'self');
    const archiveDir = wrapInAtlas
      ? path.join(resolvedDir, 'atlas', 'misc', 'archive')
      : path.join(resolvedDir, 'misc', 'archive');
    const claudeDir = path.join(resolvedDir, '.claude');

    // CLAUDE.md — copied from the chosen variant template
    writeFileSync(
      path.join(resolvedDir, 'CLAUDE.md'),
      generateClaudeMd(variant, partnerName, wrapInAtlas)
    );
    print(`  ${ORANGE}+${RESET} CLAUDE.md (${variant})`);

    // NOTES.md — straight copy from the package root
    writeFileSync(path.join(resolvedDir, 'NOTES.md'), readTemplate('NOTES.md'));
    print(`  ${ORANGE}+${RESET} NOTES.md`);

    // .gitignore — root .gitignore is the source; the published tarball ships
    // it as `gitignore` (npm strips dotted .gitignore files; see prepack).
    // Don't overwrite an existing one — preserve user-managed entries.
    const gitignorePath = path.join(resolvedDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      const gitignoreSource = fs.existsSync(path.join(TEMPLATES_DIR, '.gitignore'))
        ? '.gitignore'
        : 'gitignore';
      writeFileSync(gitignorePath, readTemplate(gitignoreSource));
      print(`  ${ORANGE}+${RESET} .gitignore`);
    } else {
      print(`  ${DIM}  .gitignore already exists — skipped${RESET}`);
    }

    // misc/self/ — ATLAS identity docs (vanilla has no identity, skip).
    // Renamed Boss -> Partner at copy time per the partner naming.
    if (variant !== 'vanilla') {
      const selfTemplateDir = path.join(TEMPLATES_DIR, 'misc', 'self');
      if (fs.existsSync(selfTemplateDir)) {
        copyDirSync(selfTemplateDir, selfDir);
        for (const file of fs.readdirSync(selfDir)) {
          if (!file.endsWith('.md')) continue;
          const filePath = path.join(selfDir, file);
          const content = fs
            .readFileSync(filePath, 'utf-8')
            .replace(/\bBoss\b/g, 'Partner')
            .replace(/\bboss\b/g, 'partner');
          fs.writeFileSync(filePath, content, 'utf-8');
        }
        print(`  ${ORANGE}+${RESET} ${wrapInAtlas ? 'atlas/' : ''}misc/self/`);
      }
    }

    // Archive — retired material (old context templates) shipped for reference
    // only; its README says don't use it, and nothing is activated from it.
    const archiveTemplateDir = path.join(TEMPLATES_DIR, 'misc', 'archive');
    if (fs.existsSync(archiveTemplateDir)) {
      copyDirSync(archiveTemplateDir, archiveDir);
      print(`  ${ORANGE}+${RESET} ${wrapInAtlas ? 'atlas/' : ''}misc/archive/ (reference only — don't use)`);
    }

    // .claude/ directory — agents, commands, hooks, rules are copied whole;
    // skills are copied selectively below. rules/ ships the DESIGN.md skeleton.
    const claudeTemplateDir = path.join(TEMPLATES_DIR, '.claude');
    if (fs.existsSync(claudeTemplateDir)) {
      const dirs = ['agents', 'commands', 'hooks', 'rules'];
      for (const dir of dirs) {
        const src = path.join(claudeTemplateDir, dir);
        if (fs.existsSync(src)) {
          copyDirSync(src, path.join(claudeDir, dir));
          print(`  ${ORANGE}+${RESET} .claude/${dir}/`);
        }
      }
    }

    // rules/ ships DESIGN.md; drop it if Boss declined the template
    if (!includeDesignMd) {
      fs.rmSync(path.join(claudeDir, 'rules', 'DESIGN.md'), { force: true });
      print(`  ${DIM}  .claude/rules/DESIGN.md — skipped${RESET}`);
    }

    // Skills — only the ones picked (plus playwright-cli if chosen as browser
    // automation)
    if (selectedSkills.length > 0) {
      for (const skill of selectedSkills) {
        copyDirSync(
          path.join(claudeTemplateDir, 'skills', skill),
          path.join(claudeDir, 'skills', skill)
        );
      }
      print(`  ${ORANGE}+${RESET} .claude/skills/ (${selectedSkills.length} selected)`);
    } else {
      print(`  ${DIM}  .claude/skills/ — none selected, skipped${RESET}`);
    }

    // Browser/MCP options — playwright/postgres keys match server names in
    // the root .mcp.json; playwrightCli only affects settings permissions.
    const mcpOptions = {
      playwright: browser === 'mcp',
      postgres,
      playwrightCli: browser === 'cli',
      isolatedBrowser,
    };

    // settings.local.json only — mirrors the root repo. A committed
    // settings.json would force one machine's permission set on every clone;
    // local settings stay personal.
    writeFileSync(
      path.join(claudeDir, 'settings.local.json'),
      generateSettingsJson(mcpOptions)
    );
    print(`  ${ORANGE}+${RESET} .claude/settings.local.json`);

    // .claude/worktrees/ — used by worktree-isolated agent runs
    gitkeep(path.join(claudeDir, 'worktrees'));
    print(`  ${ORANGE}+${RESET} .claude/worktrees/`);

    // .mcp.json — root .mcp.json filtered down to the selected servers
    if (mcpOptions.playwright || mcpOptions.postgres) {
      writeFileSync(
        path.join(resolvedDir, '.mcp.json'),
        generateMcpJson(mcpOptions)
      );
      print(`  ${ORANGE}+${RESET} .mcp.json`);
    }

    // Playwright CLI config — project-scoped profile, auto-loaded by the CLI
    // from .playwright/cli.config.json
    if (browser === 'cli') {
      writeFileSync(
        path.join(resolvedDir, '.playwright', 'cli.config.json'),
        generatePlaywrightCliConfig(isolatedBrowser)
      );
      print(`  ${ORANGE}+${RESET} .playwright/cli.config.json (${browserProfile})`);
    }

    // Common directories (both modes) — mirror the root repo layout
    gitkeep(path.join(resolvedDir, 'docs'));
    gitkeep(path.join(resolvedDir, 'docs', 'decision_logs'));
    gitkeep(path.join(resolvedDir, 'docs', 'learning-from-mistakes'));
    gitkeep(path.join(resolvedDir, 'docs', 'phases'));
    gitkeep(path.join(resolvedDir, 'docs', 'living-spec-docs'));
    gitkeep(path.join(resolvedDir, 'docs', 'living-test-cases'));
    print(`  ${ORANGE}+${RESET} docs/ (decision_logs, learning-from-mistakes, phases, living-spec-docs, living-test-cases)`);

    gitkeep(path.join(resolvedDir, 'misc', 'goals'));
    gitkeep(path.join(resolvedDir, 'misc', 'prompts'));
    gitkeep(path.join(resolvedDir, 'misc', 'prototypes'));
    gitkeep(path.join(resolvedDir, 'misc', 'screenshots'));
    gitkeep(path.join(resolvedDir, 'misc', 'test-runs'));
    // Empty starters that show the naming convention, same as the root repo
    writeFileSync(path.join(resolvedDir, 'misc', 'goals', 'develop-phase-01.md'), '');
    writeFileSync(path.join(resolvedDir, 'misc', 'prompts', 'prompt_01.md'), '');
    print(`  ${ORANGE}+${RESET} misc/ (goals, prompts, prototypes, screenshots, test-runs)`);

    // Persistent MCP profile lives in misc/browser-storage (gitignored);
    // isolated mode keeps the profile in memory, so no dir is needed.
    if (mcpOptions.playwright && !isolatedBrowser) {
      gitkeep(path.join(resolvedDir, 'misc', 'browser-storage'));
      print(`  ${ORANGE}+${RESET} misc/browser-storage/`);
    }

    // Multi-repo specific directories — CLAUDE.md placeholders copied from root
    if (mode === 'multi') {
      gitkeep(path.join(resolvedDir, 'repos', 'backend'));
      gitkeep(path.join(resolvedDir, 'repos', 'frontend'));
      for (const rel of [
        ['repos', 'CLAUDE.md'],
        ['repos', 'backend', 'CLAUDE.md'],
        ['repos', 'frontend', 'CLAUDE.md'],
      ]) {
        writeFileSync(path.join(resolvedDir, ...rel), readTemplate(...rel));
      }
      print(`  ${ORANGE}+${RESET} repos/ (CLAUDE.md placeholders for backend + frontend)`);
    }

    // External information (reference docs + skills submodule)
    const { execSync } = require('child_process');
    const eiDir = wrapInAtlas
      ? path.join(resolvedDir, 'atlas', 'docs', 'external-information')
      : path.join(resolvedDir, 'docs', 'external-information');
    const eiRelative = path.relative(resolvedDir, eiDir);

    // Reference docs shipped with the package (Claude hooks guide + reference)
    const eiTemplateDir = path.join(TEMPLATES_DIR, 'docs', 'external-information');
    if (fs.existsSync(eiTemplateDir)) {
      ensureDir(eiDir);
      for (const file of fs.readdirSync(eiTemplateDir)) {
        const src = path.join(eiTemplateDir, file);
        if (fs.statSync(src).isFile() && file.endsWith('.md')) {
          fs.copyFileSync(src, path.join(eiDir, file));
        }
      }
      print(`  ${ORANGE}+${RESET} ${eiRelative}/ (reference docs)`);
    }

    try {
      // Init git if not already
      if (!fs.existsSync(path.join(resolvedDir, '.git'))) {
        execSync('git init', { cwd: resolvedDir, stdio: 'ignore' });
        print(`  ${ORANGE}+${RESET} git init`);
      }

      // Only add skills submodule (claude-plugins-official is commented out).
      // SSH first (matches the root repo), HTTPS as fallback for machines
      // without GitHub SSH keys.
      const submoduleUrls = [
        'git@github.com:anthropics/skills.git',
        'https://github.com/anthropics/skills.git',
      ];
      let added = false;
      let lastErr;
      for (const url of submoduleUrls) {
        try {
          execSync(
            `git submodule add -b main ${url} "${eiRelative}/skills"`,
            { cwd: resolvedDir, stdio: 'ignore' }
          );
          added = true;
          break;
        } catch (err) {
          lastErr = err;
        }
      }
      if (!added) throw lastErr;
      print(`  ${ORANGE}+${RESET} ${eiRelative}/skills (submodule, tracks main)`);

      // Append commented-out claude-plugins-official to .gitmodules
      const gitmodulesPath = path.join(resolvedDir, '.gitmodules');
      const commentBlock = `# [submodule "${eiRelative}/claude-plugins-official"]\n# \tpath = ${eiRelative}/claude-plugins-official\n# \turl = git@github.com:anthropics/claude-plugins-official.git\n`;
      const existing = fs.readFileSync(gitmodulesPath, 'utf-8');
      fs.writeFileSync(gitmodulesPath, commentBlock + existing, 'utf-8');
      print(`  ${DIM}  ${eiRelative}/claude-plugins-official (commented out)${RESET}`);
    } catch (err) {
      print(`  ${YELLOW}⚠${RESET} Could not add git submodules (${err.message})`);
      print(`  ${DIM}  Run manually:${RESET}`);
      print(`  ${DIM}  git submodule add https://github.com/anthropics/skills.git ${eiRelative}/skills${RESET}`);
    }

    // ─── Summary ──────────────────────────────────────────────────────────

    const enabledMcp = ['playwright', 'postgres'].filter((k) => mcpOptions[k]);
    const browserLabel =
      browser === 'none'
        ? 'none'
        : `${browser === 'mcp' ? 'Playwright MCP' : 'Playwright CLI'} (${browserProfile})`;

    print();
    print(`${BRIGHT_ORANGE}${BOLD}  ${variant === 'vanilla' ? 'Project' : 'ATLAS'} scaffolded successfully!${RESET}`);
    print();
    print(`  ${ORANGE}${BOLD}CLAUDE.md:${RESET} ${variant}`);
    print(`  ${ORANGE}${BOLD}Mode:${RESET}      ${mode === 'single' ? 'Single repo' : 'Multi repo'}`);
    print(`  ${ORANGE}${BOLD}Location:${RESET}  ${resolvedDir}`);
    if (partnerName) {
      print(`  ${ORANGE}${BOLD}Partner:${RESET}   ${partnerName}`);
    }
    print(`  ${ORANGE}${BOLD}Skills:${RESET}    ${selectedSkills.length > 0 ? `${selectedSkills.length} installed` : 'none'}`);
    print(`  ${ORANGE}${BOLD}Browser:${RESET}   ${browserLabel}`);
    if (enabledMcp.length > 0) {
      print(`  ${ORANGE}${BOLD}MCP:${RESET}       ${enabledMcp.join(', ')}`);
    }
    print();
    print(`${DIM}  Next steps:${RESET}`);
    let step = 1;
    if (resolvedDir !== process.cwd()) {
      print(`  ${DIM}  ${step++}. cd ${path.relative(process.cwd(), resolvedDir) || '.'}${RESET}`);
    }
    if (browser === 'cli') {
      print(`  ${DIM}  ${step++}. Install Playwright CLI: npm install -g @playwright/cli@latest${RESET}`);
    }
    print(`  ${DIM}  ${step++}. Open in Claude Code and start building${RESET}`);
    if (variant !== 'vanilla') {
      print(`  ${DIM}  ${step++}. Ask: "Who are you?" to activate ATLAS${RESET}`);
    }
    print();

    // ─── Commit Prompt ────────────────────────────────────────────────────

    const commitAnswer = await prompter.ask('Would you like to commit these changes? (Y/n)');
    prompter.close();

    const declined = ['n', 'no'].includes(commitAnswer.toLowerCase());
    const shouldCommit = !declined;

    if (shouldCommit) {
      try {
        const { execSync: exec } = require('child_process');
        exec('git add -A', { cwd: resolvedDir, stdio: 'ignore' });
        exec('git commit -m "feat: scaffold ATLAS project structure"', {
          cwd: resolvedDir,
          stdio: 'ignore',
        });
        print(`  ${ORANGE}${BOLD}✓${RESET} Changes committed!`);
        print();
      } catch (commitErr) {
        print(`  ${YELLOW}⚠${RESET} Could not commit (${commitErr.message})`);
        print();
      }
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
    const targetDir = folderArg
      ? path.resolve(process.cwd(), folderArg)
      : process.cwd();
    scaffold(targetDir);
    return;
  }

  // Unknown command
  print();
  print(`${RED}  Unknown command: ${BOLD}${command}${RESET}`);
  printUsage();
  process.exit(1);
}

main();
