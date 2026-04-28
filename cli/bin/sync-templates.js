#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// ─── Paths ───────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'templates');

// ─── Skills not bundled as defaults (domain-specific) ────────────────────────

const SKILLS_EXCLUDE = new Set([
  'postgresql-optimization',
  'postgresql-code-review',
  'supabase-postgres-best-practices',
]);

// ─── Mappings: source at repo root → bundled template path ───────────────────

const MAPPINGS = [
  { src: 'self', dest: 'self' },
  { src: 'context-templates', dest: 'context-templates' },
  { src: '.claude/agents', dest: '.claude/agents' },
  { src: '.claude/commands', dest: '.claude/commands' },
  { src: '.claude/hooks', dest: '.claude/hooks' },
  { src: '.claude/skills', dest: '.claude/skills', exclude: SKILLS_EXCLUDE },
];

// ─── Colors ──────────────────────────────────────────────────────────────────

const ORANGE = '\x1b[38;5;208m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ─── Utils ───────────────────────────────────────────────────────────────────

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function rmDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function copyDirSync(src, dest, exclude) {
  if (!fs.existsSync(src)) return 0;
  ensureDir(dest);
  let count = 0;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude && exclude.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      count += copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      count += 1;
    }
  }
  return count;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log(`${BOLD}${ORANGE}  Syncing CLI templates from repo root${RESET}`);
  console.log(`${DIM}  source: ${REPO_ROOT}${RESET}`);
  console.log(`${DIM}  target: ${TEMPLATES_DIR}${RESET}`);
  console.log();

  let totalFiles = 0;
  for (const { src, dest, exclude } of MAPPINGS) {
    const srcAbs = path.join(REPO_ROOT, src);
    const destAbs = path.join(TEMPLATES_DIR, dest);

    if (!fs.existsSync(srcAbs)) {
      console.log(`  ${DIM}- ${src} (skipped — not present at repo root)${RESET}`);
      continue;
    }

    rmDirIfExists(destAbs);
    const fileCount = copyDirSync(srcAbs, destAbs, exclude);
    totalFiles += fileCount;

    const excludeNote = exclude ? ` ${DIM}(excluded: ${[...exclude].join(', ')})${RESET}` : '';
    console.log(`  ${GREEN}✓${RESET} ${src}/ → templates/${dest}/ ${DIM}(${fileCount} files)${RESET}${excludeNote}`);
  }

  console.log();
  console.log(`${BOLD}${GREEN}  Synced ${totalFiles} files across ${MAPPINGS.length} mappings.${RESET}`);
}

try {
  main();
} catch (err) {
  console.error(`${RED}  Sync failed: ${err.message}${RESET}`);
  process.exit(1);
}
