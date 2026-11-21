#!/usr/bin/env node
// Knowledge notes: the small things a project taught (a gotcha, a non-obvious fact) that are too
// small for a decision log and would otherwise be found again the hard way.
//   list [project] [--json]     the index, built from the notes each time it is asked for
//   add [project] --title "..." --when "..." [--shared] [--force]    body on stdin
//   check [project] [--json]    format problems, likely duplicates, notes due for a re-check
//
// One note per file under <P>/docs/knowledge/. There is no index file: an index that is stored
// goes stale and two sessions writing it collide; one that is computed cannot do either.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lib = require('./lib/atlas.cjs');
const ws = require('./lib/workspace.cjs');

const NOTE_DIR = ['docs', 'knowledge'];
const LESSON_DIR = ['docs', 'learning-from-mistakes'];
const MAX_BODY_LINES = 40;
const MAX_SLUG = 60;
const RECHECK_DAYS = 90;
const DUE_AT_NOTES = 30;
const SIMILAR_AT = 0.6;
const STOPWORDS = new Set(('the a an and or of to in on for with is are was be it its this that when not no does do from by at as ' +
  'into until than then if but so only must should will can cannot').split(' '));

const HELP = `Usage: node .claude/scripts/knowledge.cjs <command> [project]

  list [project] [--json]
        one line per note with when to read it: the project's notes, the notes shared by all
        projects (multi mode), and the lessons in docs/learning-from-mistakes/.
        Multi mode without a project lists the shared notes and counts per project.
  add [project] --title "<the fact in one line>" --when "<what you would be doing when this matters>"
        the note's body comes from stdin. Refuses when a note with a similar title exists and
        prints its path, so the existing note is updated instead (--force adds anyway).
        --shared   write to the root docs/knowledge/ (true for more than one project)
  check [project] [--json]
        notes without a title or a "when" line, notes too long to be a note, likely duplicates,
        and notes not re-checked for ${RECHECK_DAYS} days. Says when the folder is due for /atlas:dream.

Notes are read on demand and never imported. Secret values never go in a note: name the key.
The project argument is required in multi mode and optional otherwise.`;

const root = lib.findRoot(__dirname);
const rel = (file) => path.relative(root, file).split(path.sep).join('/');

function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--json', '--help', '-h', '--shared', '--force'].includes(a)) opts[a.replace(/^-+/, '')] = true;
    else if (a === '--title' || a === '--when') {
      if (argv[i + 1] === undefined) throw new Error(`${a} needs a value`);
      opts[a.slice(2)] = argv[++i];
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts._.push(a);
  }
  return opts;
}

// ─── Reading ────────────────────────────────────────────────────────────────

function readNote(file) {
  const text = fs.readFileSync(file, 'utf-8').replace(/\r\n?/g, '\n');
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  const meta = {};
  for (const line of fm ? fm[1].split('\n') : []) {
    const m = /^([a-z]+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = m[2].trim();
  }
  const body = fm ? text.slice(fm[0].length) : text;
  const heading = /^#\s+(.+)$/m.exec(body);
  return {
    file: rel(file),
    slug: path.basename(file, '.md'),
    title: heading ? heading[1].trim() : '',
    when: meta.when || '',
    learned: meta.learned || '',
    checked: meta.checked || '',
    lines: body.split('\n').filter((l) => l.trim()).length,
  };
}

function notesIn(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.md') && e.name.toLowerCase() !== 'readme.md')
    .map((e) => e.name)
    .sort()
    .map((n) => readNote(path.join(dir, n)));
}

/** The folders one project reads from: its own notes, the shared ones (multi mode), the lessons. */
function scopes(opts) {
  const config = lib.readConfig(root);
  const multi = config.mode === 'multi';
  const name = opts._[0];
  const shared = multi ? path.join(root, ...NOTE_DIR) : null;
  if (multi && !name) return { multi, project: null, dir: null, shared, lessonDirs: [path.join(root, ...LESSON_DIR)] };
  const project = lib.resolveProject(root, config, name);
  const lessonDirs = [path.join(project.dir, ...LESSON_DIR)];
  if (multi) lessonDirs.push(path.join(root, ...LESSON_DIR));
  return { multi, project: project.name, dir: path.join(project.dir, ...NOTE_DIR), shared, lessonDirs };
}

function collect(opts) {
  const s = scopes(opts);
  return {
    ...s,
    notes: s.dir ? notesIn(s.dir) : [],
    sharedNotes: s.shared ? notesIn(s.shared) : [],
    lessons: s.lessonDirs.flatMap(notesIn),
  };
}

// ─── Duplicates ─────────────────────────────────────────────────────────────

function words(title) {
  return new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

function similarity(a, b) {
  const [x, y] = [words(a), words(b)];
  if (!x.size || !y.size) return 0;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / (x.size + y.size - shared);
}

function similarTo(title, slug, notes) {
  return notes.filter((n) => n.slug === slug || similarity(title, n.title) >= SIMILAR_AT);
}

/**
 * A file name from the title: whole words only, so a long title is not cut mid-word. A title
 * with no ASCII letters or digits (Japanese, Arabic) still gets a stable name.
 */
function fileSlug(title) {
  const full = lib.slugify(title).replace(/\./g, '-') || `note-${crypto.createHash('sha1').update(title).digest('hex').slice(0, 10)}`;
  if (full.length <= MAX_SLUG) return full;
  const cut = full.slice(0, MAX_SLUG + 1);
  return cut.slice(0, cut.lastIndexOf('-') > 0 ? cut.lastIndexOf('-') : MAX_SLUG).replace(/-+$/, '');
}

// ─── Commands ───────────────────────────────────────────────────────────────

function printGroup(heading, where, notes) {
  if (!notes.length) return;
  console.log(`\n${heading} (${notes.length}) — ${where}`);
  for (const n of notes) {
    console.log(`  ${n.file}`);
    console.log(`      ${n.title || '(no title)'}${n.when ? `\n      read when: ${n.when}` : ''}`);
  }
}

function list(opts) {
  const c = collect(opts);
  if (opts.json) return console.log(JSON.stringify({ project: c.project, notes: c.notes, shared: c.sharedNotes, lessons: c.lessons }, null, 2));
  if (c.project) printGroup(`Knowledge: ${c.project}`, `${rel(c.dir)}/`, c.notes);
  printGroup('Shared by all projects', c.shared ? `${rel(c.shared)}/` : '', c.sharedNotes);
  printGroup('Lessons', c.lessonDirs.map((d) => `${rel(d)}/`).join(', '), c.lessons);
  if (!c.project) {
    const counts = lib.listProjects(root).map((p) => [p, notesIn(path.join(root, 'projects', p, ...NOTE_DIR)).length]).filter(([, n]) => n);
    if (counts.length) console.log(`\nPer project: ${counts.map(([p, n]) => `${p} (${n})`).join(', ')}  — list <project> shows them`);
  }
  if (!c.notes.length && !c.sharedNotes.length && !c.lessons.length) console.log('no notes yet');
}

function add(opts) {
  if (!opts.title || !opts.when) throw new Error('add needs --title and --when');
  const oneLine = (s) => s.replace(/\s*[\r\n]+\s*/g, ' ').trim();
  opts.title = oneLine(opts.title);
  opts.when = oneLine(opts.when);
  if (!opts.title || !opts.when) throw new Error('add needs --title and --when');
  const c = collect(opts);
  if (!c.project && !opts.shared) throw new Error('multi-mode workspace: name a project, or pass --shared for a note true for several');
  const dir = opts.shared && c.shared ? c.shared : c.dir;
  const slug = fileSlug(opts.title);
  const clash = similarTo(opts.title, slug, [...c.notes, ...c.sharedNotes]);
  if (clash.length && !opts.force) {
    throw new Error(`a similar note exists; update it instead (or --force):\n${clash.map((n) => `  ${n.file}  ${n.title}`).join('\n')}`);
  }
  const body = fs.readFileSync(0, 'utf-8').trim();
  if (!body) throw new Error('the note body comes from stdin and was empty');
  let file = path.join(dir, `${slug}.md`);
  // a title mostly outside ASCII leaves little in the slug ("webhook"): a different fact with the same slug gets its own name
  const taken = fs.existsSync(file) && [...c.notes, ...c.sharedNotes].find((n) => n.file === rel(file));
  if (taken && taken.title !== opts.title) file = path.join(dir, `${slug}-${crypto.createHash('sha1').update(opts.title).digest('hex').slice(0, 6)}.md`);
  if (fs.existsSync(file)) throw new Error(`${rel(file)} already exists`);
  lib.writeFile(file, `---\nwhen: ${opts.when}\nlearned: ${ws.today()}\n---\n# ${opts.title}\n\n${body}\n`);
  console.log(`wrote ${rel(file)}`);
}

function daysSince(date) {
  const t = Date.parse(date);
  return Number.isNaN(t) ? Infinity : Math.floor((Date.now() - t) / 86400000);
}

function findings(c) {
  const out = [];
  const all = [...c.notes, ...c.sharedNotes];
  for (const n of all) {
    if (!n.title) out.push({ file: n.file, problem: 'no "# title" line' });
    if (!n.when) out.push({ file: n.file, problem: 'no "when:" line, so nothing says when to read it' });
    if (n.lines > MAX_BODY_LINES) out.push({ file: n.file, problem: `${n.lines} lines: too long for a note; it may be a decision log, a spec or a lesson` });
    if (daysSince(n.checked || n.learned) > RECHECK_DAYS) out.push({ file: n.file, problem: `not re-checked against the code for over ${RECHECK_DAYS} days` });
  }
  const pool = [...all, ...c.lessons];
  for (let i = 0; i < all.length; i++) {
    for (const other of pool.slice(i + 1)) { // pool starts with `all`, in the same order
      if (all[i].slug === other.slug || similarity(all[i].title, other.title) >= SIMILAR_AT) {
        out.push({ file: all[i].file, problem: `likely the same fact as ${other.file}` });
      }
    }
  }
  return out;
}

function check(opts) {
  const c = collect(opts);
  const found = findings(c);
  const count = c.notes.length + c.sharedNotes.length;
  const due = found.length > 0 || count > DUE_AT_NOTES;
  if (opts.json) return console.log(JSON.stringify({ project: c.project, notes: count, findings: found, due }, null, 2));
  for (const f of found) console.log(`${f.file}: ${f.problem}`);
  console.log(`${count} note${count === 1 ? '' : 's'}, ${found.length} finding${found.length === 1 ? '' : 's'}.${due ? ' Due for /atlas:dream.' : ''}`);
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = parse(rest);
  if (!command || command === 'help' || opts.help || opts.h || command === '--help') return console.log(HELP);
  const commands = { list, add, check };
  if (!commands[command]) throw new Error(`unknown command "${command}"`);
  commands[command](opts);
}

try {
  main();
} catch (err) {
  console.error(`knowledge: ${err.message}`);
  process.exit(1);
}
