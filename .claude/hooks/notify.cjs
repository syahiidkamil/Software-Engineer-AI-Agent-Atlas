#!/usr/bin/env node
// Speak a short notice when Claude finishes or needs you:
//   "<first word> <initials> <event>"  e.g. "saori sh done", "bank bama ask input", "shop done"
//
//   node notify.cjs done | "ask input" | permission   [--dry-run]
//
// Name: ATLAS_NOTIFY_NAME, else (multi mode) the project this session is working
// on, inferred from the hook input, else the workspace folder name.
// Opt out with ATLAS_NOTIFY=off. A notification must never fail the hook, so
// every error is swallowed and the script always exits 0.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const lib = require(path.join(__dirname, '..', 'scripts', 'lib', 'atlas.cjs'));

const TRANSCRIPT_TAIL_BYTES = 512 * 1024;

/** "saori-hibana" -> "saori sh"; "shop" -> "shop"; "bankAssetManagement" -> "bank bam". */
function spokenName(name) {
  const words = String(name)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_.\s/@]+/)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0];
  return `${words[0]} ${words.map((w) => w[0]).join('')}`;
}

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

const PROJECT_PATH_RE = /(?:^|[\\/\s"'=])projects[\\/]([a-z0-9][a-z0-9._-]*)[\\/]/g;

/** Last project referenced by a path, scanning the strings from newest to oldest. */
function lastProjectIn(strings, known) {
  for (const s of strings) {
    const hits = [...String(s).matchAll(PROJECT_PATH_RE)].map((m) => m[1]).filter((n) => known.has(n));
    if (hits.length) return hits[hits.length - 1];
  }
  return null;
}

/** Strings from tool calls in the transcript tail, newest first. */
function toolStrings(transcriptPath) {
  const stat = fs.statSync(transcriptPath);
  const start = Math.max(0, stat.size - TRANSCRIPT_TAIL_BYTES);
  const fd = fs.openSync(transcriptPath, 'r');
  const buf = Buffer.alloc(stat.size - start);
  fs.readSync(fd, buf, 0, buf.length, start);
  fs.closeSync(fd);
  const lines = buf.toString('utf-8').split('\n').reverse();
  const out = [];
  for (const line of lines) {
    if (!line.includes('"tool_use"')) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // first line of the tail may be cut mid-record
    }
    const content = (entry.message && entry.message.content) || [];
    for (const block of [...content].reverse()) {
      if (block.type !== 'tool_use' || !block.input) continue;
      const i = block.input;
      for (const v of [i.file_path, i.notebook_path, i.path, i.command, i.pattern]) if (typeof v === 'string') out.push(v);
    }
  }
  return out;
}

function inferMultiProject(root, input) {
  const known = new Set(lib.listProjects(root));
  if (!known.size) return null;
  if (input.cwd) {
    const [top, name] = path.relative(root, input.cwd).split(path.sep);
    if (top === 'projects' && known.has(name)) return name;
  }
  if (input.transcript_path && fs.existsSync(input.transcript_path)) {
    return lastProjectIn(toolStrings(input.transcript_path), known);
  }
  return null;
}

function resolveName(root, input) {
  if (process.env.ATLAS_NOTIFY_NAME) return process.env.ATLAS_NOTIFY_NAME;
  try {
    if (lib.readConfig(root).mode === 'multi') {
      const project = inferMultiProject(root, input);
      if (project) return project;
    }
  } catch {
    // fall through to the folder name
  }
  return path.basename(root);
}

/** Speech candidates per OS, first available wins. Arguments are arrays: no shell strings. */
function speakers(message) {
  if (process.platform === 'darwin') return [['say', [message]]];
  if (process.platform === 'win32') {
    const script = '$m=$env:ATLAS_NOTIFY_MSG; try { Add-Type -AssemblyName System.Speech; ' +
      '(New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak($m) } catch { [console]::beep(880,250) }';
    return [
      ['powershell', ['-NoProfile', '-NonInteractive', '-Command', script]],
      ['pwsh', ['-NoProfile', '-NonInteractive', '-Command', script]],
    ];
  }
  return [
    ['spd-say', ['--wait', message]],
    ['espeak-ng', [message]],
    ['espeak', [message]],
    ['notify-send', ['Claude Code', message]],
  ];
}

function bell() {
  try {
    if (process.platform !== 'win32') fs.writeFileSync('/dev/tty', '\x07');
  } catch {
    // no controlling terminal; nothing else to try
  }
}

function speak(message, dryRun) {
  const choice = speakers(message).find(([bin]) => lib.which(bin));
  if (dryRun) {
    console.log(`message: ${message}`);
    console.log(`via: ${choice ? choice[0] : 'terminal bell'}`);
    return;
  }
  if (!choice) return bell();
  const [bin, args] = choice;
  const child = spawn(lib.which(bin), args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, ATLAS_NOTIFY_MSG: message },
  });
  child.on('error', bell);
  child.unref();
}

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const event = argv.filter((a) => a !== '--dry-run').join(' ').trim() || 'done';
  if (/^(off|0|false|no)$/i.test(process.env.ATLAS_NOTIFY || '') && !dryRun) return;
  let input = {};
  try {
    const raw = await readStdin();
    if (raw.trim()) input = JSON.parse(raw);
  } catch {
    input = {};
  }
  const root = lib.findRoot(__dirname);
  const name = spokenName(resolveName(root, input));
  speak([name, event.toLowerCase()].filter(Boolean).join(' '), dryRun);
}

if (require.main === module) {
  main().catch(() => {}).finally(() => {
    process.exitCode = 0;
  });
}

module.exports = { spokenName, lastProjectIn, inferMultiProject };
