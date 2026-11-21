// Workspace layout knowledge shared by the scaffolder (bin/install.js),
// project.cjs and mode.cjs: the project memory skeleton, the managed block in
// the root CLAUDE.md, the index.md registry, and the .gitignore lines per mode.

const fs = require('fs');
const path = require('path');
const lib = require('./atlas.cjs');

const TEMPLATES_DIR = path.join(__dirname, '..', '..', 'templates');
const STAGES = ['toy', 'mvp', 'production'];
const INDEX_COLUMNS = ['Project', 'One line', 'Stage', 'Stack', 'Path', 'Deploy', 'Status'];

const BLOCK_START = '<!-- atlas:workspace start (managed by /atlas:mode; keep both markers) -->';
const BLOCK_END = '<!-- atlas:workspace end -->';
const BLOCK_RE = /<!-- atlas:workspace start[^>]*-->[\s\S]*?<!-- atlas:workspace end -->/;

function template(...segments) {
  return fs.readFileSync(path.join(TEMPLATES_DIR, ...segments), 'utf-8');
}

/** Today in the machine's own time zone: toISOString() is UTC and reads a day early before 07:00 in UTC+7. */
function today() {
  const d = new Date();
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/**
 * The memory a new project starts with: map, status, env contract. Nothing else:
 * docs/ folders appear when the first decision, phase or spec does.
 * multi: files live in projects/<name>/ and the map is that folder's CLAUDE.md.
 * repo/project: files live at the root and the map is PROJECT.md (the root
 * CLAUDE.md is the identity and imports it).
 */
function projectFiles(mode, { name, stage = 'mvp', kind, oneLine, stack }) {
  if (!STAGES.includes(stage)) throw new Error(`stage must be one of: ${STAGES.join(', ')}`);
  const multi = mode === 'multi';
  const vars = {
    PROJECT: name,
    STAGE: stage,
    ONE_LINE: oneLine || '<what it is, for whom>',
    KIND: kind || '<web-app | backend-service | mobile-app | desktop-app | cli | library | game | data-ml | infrastructure | other>',
    STACK: stack || '<languages and frameworks, data stores, where it runs>',
    NOW: 'nothing started yet',
    DATE: today(),
    PROJECT_ARG: multi ? ` ${name}` : '',
    PROJECT_FLAG: multi ? ` --project ${name}` : '',
  };
  return {
    [multi ? 'CLAUDE.md' : 'PROJECT.md']: lib.render(template('project', 'CLAUDE.md'), vars),
    'STATUS.md': lib.render(template('project', 'STATUS.md'), vars),
    '.env.example': lib.render(template('project', 'env.example'), vars),
  };
}

function workspaceBlock(mode) {
  const line = mode === 'multi'
    ? '- @index.md - The projects in this workspace. Before working on one, read its `projects/<name>/CLAUDE.md` and `STATUS.md` (or run `/atlas:project open <name>`). Work that belongs to no project goes in `general/`'
    : '- @PROJECT.md - This project: what it is, its stage, stack, how to run it, and where it stands now';
  return `${BLOCK_START}\n${line}\n${BLOCK_END}`;
}

/** Put the mode's block into a CLAUDE.md: replace the managed block, or insert it after the Core Documents list. */
function setWorkspaceBlock(claudeMd, mode) {
  const block = workspaceBlock(mode);
  if (claudeMd.includes('{{WORKSPACE_BLOCK}}')) return claudeMd.replace('{{WORKSPACE_BLOCK}}', block);
  if (BLOCK_RE.test(claudeMd)) return claudeMd.replace(BLOCK_RE, block);
  const lines = claudeMd.split('\n');
  const heading = lines.findIndex((l) => /^##\s+Core Documents/.test(l));
  if (heading === -1) return `${claudeMd.replace(/\n*$/, '\n')}\n## Workspace\n\n${block}\n`;
  let at = heading + 1;
  while (at < lines.length && (lines[at].trim() === '' || lines[at].startsWith('- '))) at++;
  while (at > heading + 1 && lines[at - 1].trim() === '') at--;
  lines.splice(at, 0, block);
  return lines.join('\n');
}

// ─── index.md ───────────────────────────────────────────────────────────────

function cells(line) {
  return line.split('|').slice(1, -1).map((c) => c.trim());
}

function parseIndex(text) {
  const lines = (text || template('index.md')).replace(/\r\n?/g, '\n').split('\n');
  const header = lines.findIndex((l) => /^\|\s*Project\s*\|/.test(l));
  if (header === -1) throw new Error('index.md has no "| Project |" table');
  let end = header + 2;
  while (end < lines.length && lines[end].startsWith('|')) end++;
  const rows = lines.slice(header + 2, end).map(cells).map((c) =>
    Object.fromEntries(INDEX_COLUMNS.map((col, i) => [col, c[i] || '']))
  );
  return { before: lines.slice(0, header), rows, after: lines.slice(end) };
}

function renderIndex({ before, rows, after }) {
  const esc = (v) => String(v || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const table = [
    `| ${INDEX_COLUMNS.join(' | ')} |`,
    `|${INDEX_COLUMNS.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${INDEX_COLUMNS.map((c) => esc(r[c])).join(' | ')} |`),
  ];
  return [...before, ...table, ...after].join('\n');
}

function upsertIndexRow(text, row) {
  const parsed = parseIndex(text);
  const existing = parsed.rows.find((r) => r.Project === row.Project);
  if (existing) Object.assign(existing, Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)));
  else parsed.rows.push(Object.fromEntries(INDEX_COLUMNS.map((c) => [c, row[c] || ''])));
  parsed.rows.sort((a, b) => a.Project.localeCompare(b.Project));
  return renderIndex(parsed);
}

/** Read "Stage:" / "One line:" from a project map and "Now:" from a STATUS.md. */
function readLineValue(text, label) {
  // [ \t]*, not \s*: an empty "Now:" line must not swallow the line after it
  const m = new RegExp(`^${label}:[ \\t]*(.*)$`, 'mi').exec(text || '');
  return m ? m[1].trim() : '';
}

// ─── .gitignore ─────────────────────────────────────────────────────────────

/** Lines every ATLAS workspace needs ignored, whatever else the user has. */
function gitignoreLines(mode) {
  const lines = [
    '# ATLAS: local-only notes, at any depth (gitignored/, projects/<p>/gitignored/, ...)',
    'gitignored/',
    '# ATLAS: personal settings, secrets, env files',
    '.claude/settings.local.json',
    '.atlas/secrets/',
    '**/.env',
    '**/.env.local',
    '**/.env.*.local',
    '**/.env.production',
    '!**/.env.example',
    '# ATLAS: browser state and screenshots',
    '**/misc/.playwright/',
    '**/misc/screenshots/',
    '.playwright-cli/',
    '.playwright/profile/',
    'misc/browser-storage/',
  ];
  if (mode === 'project') lines.push('# ATLAS: code repos are their own git, never tracked by the workspace', 'repos/*/');
  if (mode === 'multi') lines.push('# ATLAS: code repos are their own git, never tracked by the workspace', 'projects/*/repos/*/');
  return lines;
}

/** Append whichever required lines are missing; never remove the user's lines. */
function mergeGitignore(existing, mode) {
  const have = new Set((existing || '').split(/\r?\n/).map((l) => l.trim()));
  const missing = gitignoreLines(mode).filter((l) => l.startsWith('#') || !have.has(l));
  const needed = missing.filter((l) => !l.startsWith('#'));
  if (!needed.length) return existing || '';
  // keep a comment only if a line under it is being added
  const out = [];
  for (let i = 0; i < missing.length; i++) {
    if (missing[i].startsWith('#')) {
      if (i + 1 < missing.length && !missing[i + 1].startsWith('#')) out.push(missing[i]);
    } else out.push(missing[i]);
  }
  const eol = /\r\n/.test(existing || '') ? '\r\n' : '\n'; // a CRLF file stays CRLF
  const base = (existing || '').replace(/\s*$/, '');
  return `${base ? `${base}${eol}${eol}` : ''}${out.join(eol)}${eol}`;
}

module.exports = {
  TEMPLATES_DIR,
  STAGES,
  INDEX_COLUMNS,
  BLOCK_RE,
  template,
  today,
  projectFiles,
  workspaceBlock,
  setWorkspaceBlock,
  parseIndex,
  renderIndex,
  upsertIndexRow,
  readLineValue,
  gitignoreLines,
  mergeGitignore,
};
