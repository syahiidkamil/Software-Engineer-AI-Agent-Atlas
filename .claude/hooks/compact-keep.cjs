#!/usr/bin/env node
// PreCompact: tell the compaction what the summary has to keep.
//
// Claude Code uses a PreCompact hook's stdout as instructions for the summary, for
// /compact and for automatic compaction alike. A summary written without them keeps
// "an update is in progress" and can drop which files the user approved, what they
// ruled out, and what was verified, and the session then re-does or re-asks.
//
// Exit code 2 would block the compaction, so every error is swallowed and the
// script always exits 0: a missing instruction costs a weaker summary, a blocked
// compaction costs the session.

const path = require('path');

const KEEP = `Keep these in the summary. Quote the user where their wording is short:
- What the user approved, and what they rejected or said to leave alone, each with the file, command or option it applies to. Mark anything approved and not yet done.
- Standing instructions the user gave in this conversation: what not to touch, what stays their own step (staging, committing, publishing), how many review rounds, how to report.
- The task in progress: what is done and verified (and by which command or check), what is done and not verified, what is left, and the next step.
- Decisions made, one line each, with the option that was rejected.
- Paths of the files created or changed, and of temporary files that still matter.
Leave out file contents and command output that can be read again from disk, and the discussion that led to a decision once the decision is recorded.`;

function readStdin() {
  if (process.stdin.isTTY) return Promise.resolve('');
  return new Promise((resolve) => {
    let data = '';
    const timer = setTimeout(() => resolve(data), 500);
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data);
    });
    process.stdin.on('error', () => resolve(data));
  });
}

/** In a multi-mode workspace, the project this session works on (null when it cannot be told). */
function sessionProject(input) {
  try {
    const lib = require(path.join(__dirname, '..', 'scripts', 'lib', 'atlas.cjs'));
    const root = lib.findRoot(__dirname);
    if (lib.readConfig(root).mode !== 'multi') return null;
    return require('./notify.cjs').inferMultiProject(root, input);
  } catch {
    return null;
  }
}

/**
 * The instructions for one compaction.
 * @param {{custom_instructions?: string|null}} input the hook's stdin
 * @param {string|null} project the session's project in a multi-mode workspace
 */
function instructions(input, project) {
  const parts = [KEEP];
  if (project) parts.push(`This session is working on the project "${project}" (projects/${project}/). Name it in the summary.`);
  // What the user typed after /compact is repeated, so it holds whether this text is added to theirs or replaces it.
  const own = typeof input.custom_instructions === 'string' ? input.custom_instructions.trim() : '';
  if (own) parts.push(`The user's own instructions for this compaction, which come first where the two disagree:\n${own}`);
  return parts.join('\n\n');
}

async function main() {
  let input = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    input = {};
  }
  if (!input || typeof input !== 'object') input = {};
  process.stdout.write(`${instructions(input, sessionProject(input))}\n`);
}

if (require.main === module) {
  main().catch(() => {}).finally(() => {
    process.exitCode = 0;
  });
}

module.exports = { instructions, KEEP };
