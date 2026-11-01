#!/usr/bin/env node
// ATLAS secret store: enter a key once, reuse it in every project.
// Values never leave this script: it prints key NAMES only, reads values from
// stdin, and masks known values in the output of `run`.

const fs = require('fs');
const path = require('path');
const lib = require('./lib/atlas.cjs');

const HELP = `Usage: node .claude/scripts/secrets.cjs <command> [args]

  keys [project] [--env e]            key names and where each comes from (never values)
  set KEY [--project p] [--env e] [--from-file path]
                                      store a value: typed at a hidden prompt, piped on stdin, or read from a file
  unset KEY [--project p] [--env e]   remove a key from that scope
  link [project] [--env e] [--out .env.local] [--force]
                                      fill <out> next to every .env.example of the project; store values
                                      win, other existing values are kept (--force resets them too)
  check [project] [--env e]           which declared keys are missing; exit 1 if any
  run [project] [--env e] -- <cmd...> run a command with the project's keys in its env

Store (gitignored): .atlas/secrets/global.env, projects/<p>.env, projects/<p>@<env>.env
Priority: global < project < project@env. In repo/project mode the project argument
is optional; in multi mode it is required.

A value never goes on the command line, so it never lands in a chat, transcript or shell
history. Store one yourself:
  in your own terminal:        node .claude/scripts/secrets.cjs set OPENAI_API_KEY   (hidden prompt)
  from Claude Code, after copying the value to the clipboard:
                               ! pbpaste | node .claude/scripts/secrets.cjs set OPENAI_API_KEY
                               (Linux: wl-paste or xclip -o -selection clipboard;
                                Windows: powershell -c Get-Clipboard)
  from a file (keys, PEMs):    node .claude/scripts/secrets.cjs set KEY --from-file path/to/key.pem`;

// .env.local and friends: names the ATLAS .gitignore covers, so linked values are never committed
const OUT_NAME_RE = /^\.env(?:\.[a-z0-9_-]+)?\.local$|^\.env$/;

function parse(argv) {
  const dash = argv.indexOf('--');
  const head = dash === -1 ? argv : argv.slice(0, dash);
  const tail = dash === -1 ? [] : argv.slice(dash + 1);
  const opts = { _: [], tail };
  for (let i = 0; i < head.length; i++) {
    const a = head[i];
    if (a === '--force' || a === '--help' || a === '-h' || a === '--allow-empty') opts[a.replace(/^-+/, '')] = true;
    else if (['--project', '--env', '--out', '--from-file'].includes(a)) {
      if (head[i + 1] === undefined) throw new Error(`${a} needs a value`);
      opts[a.slice(2)] = head[++i];
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else opts._.push(a);
  }
  if (opts.env && !/^[a-z0-9][a-z0-9_-]*$/.test(opts.env)) throw new Error(`invalid --env "${opts.env}"`);
  return opts;
}

function context(projectArg, opts) {
  const root = lib.findRoot(__dirname);
  const config = lib.readConfig(root);
  const project = lib.resolveProject(root, config, projectArg);
  const layers = lib.secretLayers(root, project.name, opts.env);
  return { root, config, project, layers, store: lib.loadLayers(layers) };
}

/** .env.example files of a project: its own, and one per repos/<r>/ (and the root in repo mode). */
function exampleFiles(project) {
  const found = [];
  const own = path.join(project.dir, '.env.example');
  if (fs.existsSync(own)) found.push(own);
  const reposDir = path.join(project.dir, 'repos');
  if (fs.existsSync(reposDir)) {
    for (const e of fs.readdirSync(reposDir, { withFileTypes: true })) {
      const f = path.join(reposDir, e.name, '.env.example');
      if (e.isDirectory() && fs.existsSync(f)) found.push(f);
    }
  }
  return found;
}

function table(rows) {
  if (!rows.length) return;
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  for (const r of rows) console.log(r.map((cell, c) => String(cell).padEnd(widths[c])).join('  ').trimEnd());
}

function rel(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function cmdKeys(opts) {
  const root = lib.findRoot(__dirname);
  const config = lib.readConfig(root);
  if (opts._[0] || config.mode !== 'multi') {
    const { store } = context(opts._[0], opts);
    const rows = [...store.values.keys()].sort().map((k) => [k, store.source.get(k)]);
    if (!rows.length) return console.log('no keys stored yet');
    return table([['KEY', 'SOURCE'], ...rows]);
  }
  // multi mode, no project: show every scope
  const dir = lib.secretsDir(root);
  const scopes = [['global', path.join(dir, 'global.env')]];
  const projDir = path.join(dir, 'projects');
  if (fs.existsSync(projDir)) {
    for (const f of fs.readdirSync(projDir).filter((n) => n.endsWith('.env')).sort()) {
      scopes.push([`project:${f.replace(/\.env$/, '')}`, path.join(projDir, f)]);
    }
  }
  const rows = [];
  for (const [scope, file] of scopes) {
    for (const k of lib.parseEnv(lib.readIfExists(file)).keys()) rows.push([k, scope]);
  }
  if (!rows.length) return console.log('no keys stored yet');
  table([['KEY', 'SOURCE'], ...rows]);
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    process.stderr.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    let value = '';
    const onData = (buf) => {
      for (const ch of buf.toString('utf-8')) {
        if (ch === '\u0003') {
          stdin.setRawMode(false);
          process.stderr.write('\n');
          return reject(new Error('cancelled'));
        }
        if (ch === '\r' || ch === '\n' || ch === '\u0004') {
          const rest = buf.toString('utf-8').slice(buf.toString('utf-8').indexOf(ch) + 1);
          if (/\S/.test(rest)) {
            stdin.setRawMode(false);
            process.stderr.write('\n');
            return reject(new Error('that paste has several lines; store multi-line values with --from-file <path>'));
          }
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stderr.write('\n');
          return resolve(value);
        }
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    const timer = setTimeout(() => {
      reject(new Error('no value arrived on stdin. Pipe one in (pbpaste | ...), use --from-file, or run this in your own terminal'));
    }, 15000);
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(data.replace(/\r?\n$/, ''));
    });
  });
}

function targetFile(root, opts) {
  const dir = lib.secretsDir(root);
  if (!opts.project) {
    if (opts.env) throw new Error('--env needs --project');
    return { file: path.join(dir, 'global.env'), scope: 'global' };
  }
  const config = lib.readConfig(root);
  const { name } = lib.resolveProject(root, config, opts.project, { mustExist: false });
  const base = opts.env ? `${name}@${opts.env}` : name;
  return { file: path.join(dir, 'projects', `${base}.env`), scope: `project:${base}` };
}

async function cmdSet(opts) {
  const key = opts._[0];
  if (!key || !lib.ENV_KEY_RE.test(key)) throw new Error('set needs a KEY like OPENAI_API_KEY');
  if (opts._.length > 1) throw new Error('pass the value on stdin, never as an argument');
  const root = lib.findRoot(__dirname);
  const { file, scope } = targetFile(root, opts);
  let value;
  if (opts['from-file']) value = fs.readFileSync(path.resolve(opts['from-file']), 'utf-8').replace(/\r?\n$/, '');
  else if (process.stdin.isTTY) value = await readHidden(`Value for ${key} (${scope}, hidden): `);
  else value = await readStdin();
  if (!value && !opts['allow-empty']) throw new Error('empty value; nothing stored (use --allow-empty to store one)');
  const replaced = lib.updateEnvFile(file, key, value);
  console.log(`${key} ${replaced ? 'updated' : 'saved'} in ${scope} (value hidden)`);
  if (value && value.length < lib.MIN_MASK) {
    console.log(`note: values under ${lib.MIN_MASK} characters are too short to mask in \`run\` output`);
  }
}

function cmdUnset(opts) {
  const key = opts._[0];
  if (!key || !lib.ENV_KEY_RE.test(key)) throw new Error('unset needs a KEY');
  const root = lib.findRoot(__dirname);
  const { file, scope } = targetFile(root, opts);
  if (!fs.existsSync(file)) return console.log(`${key} not found in ${scope}`);
  const removed = lib.updateEnvFile(file, key, undefined);
  console.log(removed ? `${key} removed from ${scope}` : `${key} not found in ${scope}`);
}

function resolveKey(store, k) {
  if (store.values.has(k.name) && store.values.get(k.name) !== '') {
    return { value: store.values.get(k.name), status: 'filled', source: store.source.get(k.name) };
  }
  if (k.fallback) return { value: k.fallback, status: 'default', source: '.env.example' };
  return { value: undefined, status: 'missing', source: '' };
}

function cmdLink(opts) {
  const { root, project, store } = context(opts._[0], opts);
  const files = exampleFiles(project);
  if (!files.length) throw new Error(`no .env.example in ${rel(root, project.dir) || '.'} (declare the keys there first)`);
  const outName = opts.out || '.env.local';
  if (!OUT_NAME_RE.test(outName)) {
    throw new Error('--out must be .env, .env.local or .env.<name>.local: the names .gitignore keeps out of git');
  }
  let missing = 0;
  for (const example of files) {
    const outFile = path.join(path.dirname(example), outName);
    const existing = lib.parseEnv(lib.readIfExists(outFile));
    const declared = lib.parseEnvExample(fs.readFileSync(example, 'utf-8'));
    const rows = [];
    const lines = [
      `# Generated by .claude/scripts/secrets.cjs link from ${rel(root, example)}`,
      '# Values from the store are refreshed on every link; change them with secrets.cjs set. Never commit this file.',
    ];
    for (const k of declared) {
      const kept = existing.get(k.name);
      const fromStore = store.values.get(k.name);
      if (kept && !fromStore && !opts.force) {
        lines.push(`${k.name}=${lib.serializeEnvValue(kept)}`);
        rows.push([k.name, 'kept', 'existing value (not in the store)']);
        continue;
      }
      const r = resolveKey(store, k);
      if (r.status === 'filled' && kept && kept !== r.value) r.status = 'updated';
      if (r.status === 'missing') {
        missing++;
        lines.push(`${k.name}=`);
      } else lines.push(`${k.name}=${lib.serializeEnvValue(r.value)}`);
      rows.push([k.name, r.status, r.source]);
    }
    for (const [k, v] of existing) {
      if (!declared.some((d) => d.name === k)) {
        lines.push(`${k}=${lib.serializeEnvValue(v)}`);
        rows.push([k, 'kept', 'not in .env.example']);
      }
    }
    lib.writeFile(outFile, lines.join('\n') + '\n', 0o600);
    console.log(`\n${rel(root, outFile)}`);
    table([['KEY', 'STATUS', 'SOURCE'], ...rows]);
  }
  if (missing) {
    const flag = lib.readConfig(root).mode === 'multi' ? ` --project ${project.name}` : '';
    console.log(`\n${missing} missing. Store each one yourself (see secrets.cjs --help): node .claude/scripts/secrets.cjs set KEY${flag}`);
  }
}

function cmdCheck(opts) {
  const { root, config, project, store } = context(opts._[0], opts);
  const files = exampleFiles(project);
  if (!files.length) {
    console.error(`secrets: no .env.example in ${rel(root, project.dir) || '.'} (nothing declared to check)`);
    process.exitCode = 2;
    return;
  }
  let missing = 0;
  const declaredHere = new Set();
  for (const example of files) {
    const rows = [];
    for (const k of lib.parseEnvExample(fs.readFileSync(example, 'utf-8'))) {
      declaredHere.add(k.name);
      const r = resolveKey(store, k);
      if (r.status === 'missing') missing++;
      rows.push([k.name, r.status, r.source]);
    }
    console.log(`\n${rel(root, example)}${opts.env ? ` (env: ${opts.env})` : ''}`);
    table([['KEY', 'STATUS', 'SOURCE'], ...rows]);
  }
  // keys stored for this project but declared nowhere: likely stale, worth rotating out
  const unused = [...store.values.keys()].filter((k) => {
    const scope = store.source.get(k);
    if (scope === 'global') return !declaredAnywhere(root, config, k);
    return !declaredHere.has(k);
  });
  if (unused.length) console.log(`\nStored but not declared in any .env.example: ${unused.sort().join(', ')}`);
  console.log(missing ? `\n${missing} missing` : '\nall declared keys are available');
  process.exitCode = missing ? 1 : 0;
}

function declaredAnywhere(root, config, key) {
  const projects = config.mode === 'multi'
    ? lib.listProjects(root).map((n) => ({ name: n, dir: path.join(root, 'projects', n) }))
    : [{ name: config.project, dir: root }];
  return projects.some((p) =>
    exampleFiles(p).some((f) => lib.parseEnvExample(fs.readFileSync(f, 'utf-8')).some((k) => k.name === key))
  );
}

function cmdRun(opts) {
  if (!opts.tail.length) throw new Error('run needs a command after --');
  const { store } = context(opts._[0], opts);
  const env = { ...process.env };
  for (const [k, v] of store.values) env[k] = v;
  const [command, ...args] = opts.tail;
  const child = lib.spawnPortable(command, args, { env, stdio: ['inherit', 'pipe', 'pipe'] });
  const secrets = [...store.values.values()];
  const out = lib.createMasker(secrets, (s) => process.stdout.write(s));
  const err = lib.createMasker(secrets, (s) => process.stderr.write(s));
  child.stdout.on('data', (c) => out.push(c));
  child.stderr.on('data', (c) => err.push(c));
  child.on('error', (e) => {
    console.error(`could not start ${command}: ${e.message}`);
    process.exitCode = 127;
  });
  child.on('close', (code, signal) => {
    out.end();
    err.end();
    process.exitCode = signal ? 1 : code;
  });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = parse(rest);
  if (!command || command === 'help' || opts.help || command === '--help' || command === '-h') {
    console.log(HELP);
    return;
  }
  const commands = { keys: cmdKeys, set: cmdSet, unset: cmdUnset, link: cmdLink, check: cmdCheck, run: cmdRun };
  if (!commands[command]) throw new Error(`unknown command "${command}"\n\n${HELP}`);
  await commands[command](opts);
}

main().catch((err) => {
  console.error(`secrets: ${err.message}`);
  process.exit(1);
});
