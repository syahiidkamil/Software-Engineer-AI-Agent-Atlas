#!/usr/bin/env node
// ATLAS database access through psql. Connections are registered by name in
// .atlas/secrets/databases.json (metadata only); each entry names the env key
// that holds its URL, resolved from the secret store. The URL is handed to psql
// through PG* environment variables, never on the command line.

const fs = require('fs');
const path = require('path');
const lib = require('./lib/atlas.cjs');

const HELP = `Usage: node .claude/scripts/db.cjs <command> [args]

  list                                  registered connections (never URLs)
  <name> -c "select 1"                  run one statement (any psql args pass through)
  <name> -f path/to/query.sql           run a file
  ping <name>                           connect and print database, user, server version
  add <name> --url-env KEY [--project p] [--env dev] [--readonly|--writable] [--disabled]
  enable <name> | disable <name>        switch an entry on or off
  remove <name>

Flags: --dry-run prints the psql command and which PG* variables would be set.
Read-only entries (the default when env is prod) start every transaction read-only, so an
accidental write fails. It is a guard, not enforcement: a session can switch it off. For a
hard guarantee, give prod a URL whose role only has SELECT. Output that is not going to a
terminal is masked, so the password never reaches a transcript. Registry:
.atlas/secrets/databases.json`;

const INSTALL_HINT = {
  darwin: 'brew install libpq && brew link --force libpq   (or: brew install postgresql)',
  linux: 'sudo apt install postgresql-client   (Fedora: sudo dnf install postgresql)',
  win32: 'install PostgreSQL from postgresql.org and select only "Command Line Tools", then add its bin folder to PATH',
};

const root = lib.findRoot(__dirname);
const registryFile = path.join(lib.secretsDir(root), 'databases.json');

function readRegistry() {
  const text = lib.readIfExists(registryFile);
  if (!text) return [];
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('databases.json must be a JSON array');
  return data;
}

function writeRegistry(entries) {
  lib.writeFile(registryFile, JSON.stringify(entries, null, 2) + '\n', 0o600);
}

function isProd(env) {
  return /^(prod|production|live)$/i.test(env || '');
}

function isReadonly(entry) {
  return entry.readonly === undefined ? isProd(entry.env) : Boolean(entry.readonly);
}

function findEntry(name) {
  const entry = readRegistry().find((e) => e.name === name);
  if (!entry) throw new Error(`no connection named "${name}" (see: node .claude/scripts/db.cjs list)`);
  return entry;
}

function list() {
  const entries = readRegistry();
  if (!entries.length) return console.log('no connections registered (add one with: db.cjs add <name> --url-env KEY)');
  const rows = [['NAME', 'PROJECT', 'ENV', 'ENABLED', 'READONLY', 'URL KEY']];
  for (const e of entries) {
    rows.push([e.name, e.project || '-', e.env || '-', e.enabled === false ? 'no' : 'yes', isReadonly(e) ? 'yes' : 'no', e.url_env]);
  }
  const widths = rows[0].map((_, c) => Math.max(...rows.map((r) => String(r[c]).length)));
  for (const r of rows) console.log(r.map((cell, c) => String(cell).padEnd(widths[c])).join('  ').trimEnd());
}

/** Turn a postgres:// URL into PG* variables. */
function urlToPgEnv(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error('the stored URL is not a valid postgres:// URL');
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error(`unsupported URL scheme ${u.protocol}`);
  const env = {};
  const params = u.searchParams;
  const host = u.hostname || params.get('host');
  if (host) env.PGHOST = decodeURIComponent(host.replace(/^\[|\]$/g, ''));
  if (u.port || params.get('port')) env.PGPORT = u.port || params.get('port');
  if (u.username || params.get('user')) env.PGUSER = decodeURIComponent(u.username || params.get('user'));
  if (u.password || params.get('password')) env.PGPASSWORD = decodeURIComponent(u.password || params.get('password'));
  const db = decodeURIComponent(u.pathname.replace(/^\//, '')) || params.get('dbname');
  if (db) env.PGDATABASE = db;
  if (params.get('sslmode')) env.PGSSLMODE = params.get('sslmode');
  if (params.get('sslrootcert')) env.PGSSLROOTCERT = params.get('sslrootcert');
  if (params.get('application_name')) env.PGAPPNAME = params.get('application_name');
  if (params.get('options')) env.PGOPTIONS = params.get('options');
  const more = { sslcert: 'PGSSLCERT', sslkey: 'PGSSLKEY', connect_timeout: 'PGCONNECT_TIMEOUT', target_session_attrs: 'PGTARGETSESSIONATTRS' };
  for (const [param, name] of Object.entries(more)) if (params.get(param)) env[name] = params.get(param);
  return env;
}

function connectionEnv(entry) {
  if (entry.enabled === false) {
    throw new Error(`connection "${entry.name}" is disabled (enable it with: db.cjs enable ${entry.name})`);
  }
  if (!entry.url_env) throw new Error(`connection "${entry.name}" has no url_env`);
  const layers = lib.secretLayers(root, entry.project, entry.env);
  const { values } = lib.loadLayers(layers);
  const url = values.get(entry.url_env) || process.env[entry.url_env];
  if (!url) {
    const scope = entry.project ? ` --project ${entry.project}` : '';
    throw new Error(`${entry.url_env} is not in the secret store. Ask the user to store it themselves (secrets.cjs --help shows how): node .claude/scripts/secrets.cjs set ${entry.url_env}${scope}${entry.env && entry.env !== 'dev' ? ` --env ${entry.env}` : ''}`);
  }
  const env = urlToPgEnv(url);
  if (isReadonly(entry)) {
    env.PGOPTIONS = `${env.PGOPTIONS ? `${env.PGOPTIONS} ` : ''}-c default_transaction_read_only=on`;
  }
  // everything this connection could echo back: the URL, its password, the other stored values
  const secrets = [url, env.PGPASSWORD, ...values.values()].filter(Boolean);
  return { pgEnv: env, secrets };
}

function runPsql(entry, args, dryRun) {
  const { pgEnv, secrets } = connectionEnv(entry);
  const psqlArgs = ['--no-psqlrc', '-v', 'ON_ERROR_STOP=1', ...args];
  if (dryRun) {
    console.log(`psql ${psqlArgs.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
    console.log(`env: ${Object.keys(pgEnv).sort().join(', ')}${isReadonly(entry) ? '  (read-only)' : ''}`);
    return;
  }
  if (!lib.which('psql')) {
    throw new Error(`psql not found. Install it: ${INSTALL_HINT[process.platform] || 'see postgresql.org/download'}`);
  }
  // PG* from the parent shell must not leak into this connection
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^PG[A-Z]+$/.test(k)));
  // a human at a terminal gets psql as-is; anything captured (an agent's Bash tool) is masked
  const captured = !process.stdout.isTTY;
  const child = lib.spawnPortable('psql', psqlArgs, {
    env: { ...env, ...pgEnv },
    stdio: captured ? ['inherit', 'pipe', 'pipe'] : 'inherit',
  });
  if (captured) {
    const out = lib.createMasker(secrets, (t) => process.stdout.write(t));
    const err = lib.createMasker(secrets, (t) => process.stderr.write(t));
    child.stdout.on('data', (c) => out.push(c));
    child.stderr.on('data', (c) => err.push(c));
    child.on('close', () => {
      out.end();
      err.end();
    });
  }
  child.on('error', (e) => {
    console.error(`db: ${e.message}`);
    process.exitCode = 127;
  });
  child.on('close', (code) => {
    process.exitCode = code === null ? 1 : code;
  });
}

function parseFlags(args, spec) {
  const out = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (spec.bool.includes(a)) out[a.slice(2)] = true;
    else if (spec.value.includes(a)) {
      if (args[i + 1] === undefined) throw new Error(`${a} needs a value`);
      out[a.slice(2)] = args[++i];
    } else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else out._.push(a);
  }
  return out;
}

function add(args) {
  const o = parseFlags(args, { bool: ['--readonly', '--writable', '--disabled'], value: ['--url-env', '--project', '--env'] });
  const name = o._[0];
  if (!name || !/^[a-z0-9][a-z0-9._-]*$/.test(name)) throw new Error('add needs a name like shop-dev');
  if (!o['url-env'] || !lib.ENV_KEY_RE.test(o['url-env'])) throw new Error('add needs --url-env KEY');
  if (o.readonly && o.writable) throw new Error('pick one of --readonly / --writable');
  const entries = readRegistry();
  if (entries.some((e) => e.name === name)) throw new Error(`"${name}" already exists`);
  const config = lib.readConfig(root);
  const project = o.project || (config.mode === 'multi' ? undefined : config.project);
  const entry = { name, project, env: o.env || 'dev', url_env: o['url-env'], enabled: !o.disabled };
  entry.readonly = o.readonly ? true : o.writable ? false : isProd(entry.env);
  if (!entry.project) delete entry.project;
  entries.push(entry);
  writeRegistry(entries);
  console.log(`added ${name} (${entry.env}, ${entry.readonly ? 'read-only' : 'writable'}, ${entry.enabled ? 'enabled' : 'disabled'})`);
}

function setEnabled(name, enabled) {
  const entries = readRegistry();
  const entry = entries.find((e) => e.name === name);
  if (!entry) throw new Error(`no connection named "${name}"`);
  entry.enabled = enabled;
  writeRegistry(entries);
  console.log(`${name} ${enabled ? 'enabled' : 'disabled'}`);
}

function remove(name) {
  const entries = readRegistry();
  const next = entries.filter((e) => e.name !== name);
  if (next.length === entries.length) throw new Error(`no connection named "${name}"`);
  writeRegistry(next);
  console.log(`removed ${name}`);
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const args = argv.filter((a) => a !== '--dry-run');
  const [command, ...rest] = args;
  if (!command || ['help', '--help', '-h'].includes(command)) return console.log(HELP);
  if (command === 'list') return list();
  if (command === 'add') return add(rest);
  if (command === 'enable' || command === 'disable') return setEnabled(rest[0], command === 'enable');
  if (command === 'remove') return remove(rest[0]);
  if (command === 'ping') {
    return runPsql(findEntry(rest[0]), ['-A', '-t', '-c', 'select current_database(), current_user, version()'], dryRun);
  }
  return runPsql(findEntry(command), rest, dryRun);
}

try {
  main();
} catch (err) {
  console.error(`db: ${err.message}`);
  process.exit(1);
}
