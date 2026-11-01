const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const path = require('path');
const { workspace, write, read, exists, script } = require('./helpers.cjs');

const SECRET = 'sk-test-value-1234567890';

function multiWorkspace() {
  const root = workspace({ mode: 'multi' });
  const r = script('project.cjs', ['add', 'shop', '--stage', 'mvp', '--one-line', 'a storefront', '--stack', 'Next.js | Postgres'], { root });
  assert.equal(r.status, 0, r.stderr);
  return root;
}

test('project: add creates the skeleton and registers it; status refreshes', () => {
  const root = multiWorkspace();
  assert.ok(exists(root, 'projects/shop/CLAUDE.md'));
  assert.ok(exists(root, 'projects/shop/STATUS.md'));
  assert.ok(exists(root, 'projects/shop/.env.example'));
  assert.ok(!exists(root, 'projects/shop/docs'), 'docs/ grows later, not up front');
  assert.match(read(root, 'index.md'), /\| shop \| a storefront \| mvp \| Next\.js \/ Postgres \| projects\/shop \| none \| nothing started yet \|/);

  write(root, 'projects/shop/STATUS.md', '# Status: shop\n\nNow: building checkout\n');
  assert.equal(script('project.cjs', ['status'], { root }).status, 0);
  assert.match(read(root, 'index.md'), /building checkout/);
  assert.match(read(root, 'index.md'), /Next\.js \/ Postgres/, 'hand-written Stack survives a refresh');

  assert.notEqual(script('project.cjs', ['add', 'shop'], { root }).status, 0, 'duplicate refused');
  assert.notEqual(script('project.cjs', ['add', 'general'], { root }).status, 0, 'reserved name refused');
  const list = JSON.parse(script('project.cjs', ['list', '--json'], { root }).stdout);
  assert.equal(list[0].Project, 'shop');
});

test('project: refuses in single-project modes', () => {
  const root = workspace({ mode: 'project', project: 'solo' });
  const r = script('project.cjs', ['add', 'x'], { root });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /atlas:mode multi/);
});

test('mode: current and set rewrite config, CLAUDE.md block, and .gitignore', () => {
  const root = workspace({ mode: 'project', project: 'solo' }, {
    'CLAUDE.md': '# CLAUDE.md\n\n## Core Documents\n\n- @NOTES.md - notes\n\n## How I Work\n',
    '.gitignore': 'node_modules/\n',
  });
  assert.match(script('mode.cjs', ['current'], { root }).stdout, /mode: project\nproject: solo/);
  const dry = script('mode.cjs', ['set', 'multi', '--dry-run'], { root });
  assert.match(dry.stdout, /would write/);
  assert.equal(JSON.parse(read(root, '.atlas/config.json')).mode, 'project', 'dry run writes nothing');

  assert.equal(script('mode.cjs', ['set', 'multi'], { root }).status, 0);
  assert.deepEqual(JSON.parse(read(root, '.atlas/config.json')), { mode: 'multi' });
  assert.match(read(root, 'CLAUDE.md'), /@index\.md/);
  assert.match(read(root, '.gitignore'), /^node_modules\/\n[\s\S]*projects\/\*\/repos\/\*\//);

  assert.equal(script('mode.cjs', ['set', 'repo', '--project', 'solo'], { root }).status, 0);
  assert.match(read(root, 'CLAUDE.md'), /@PROJECT\.md/);
  assert.doesNotMatch(read(root, 'CLAUDE.md'), /@index\.md/);
  assert.equal(read(root, 'CLAUDE.md').match(/atlas:workspace start/g).length, 1);
  assert.notEqual(script('mode.cjs', ['set', 'galaxy'], { root }).status, 0);
});

test('secrets: set from stdin, list names only, never print values', () => {
  const root = multiWorkspace();
  let r = script('secrets.cjs', ['set', 'OPENAI_API_KEY'], { root, input: `${SECRET}\n` });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, new RegExp(SECRET));
  r = script('secrets.cjs', ['set', 'SHOP_DB', '--project', 'shop'], { root, input: 'postgres://u:p@h/db' });
  assert.equal(r.status, 0, r.stderr);
  assert.notEqual(script('secrets.cjs', ['set', 'X', 'value-as-arg'], { root }).status, 0, 'values never as arguments');
  assert.notEqual(script('secrets.cjs', ['set', 'EMPTY'], { root, input: '' }).status, 0, 'empty refused');

  r = script('secrets.cjs', ['keys'], { root });
  assert.match(r.stdout, /OPENAI_API_KEY\s+global/);
  assert.match(r.stdout, /SHOP_DB\s+project:shop/);
  assert.doesNotMatch(r.stdout, new RegExp(SECRET));
  assert.match(read(root, '.atlas/secrets/global.env'), new RegExp(`OPENAI_API_KEY=${SECRET}`));
  assert.notEqual(script('secrets.cjs', ['keys', 'nope'], { root }).status, 0);
  assert.notEqual(script('secrets.cjs', ['check'], { root }).status, 0, 'multi mode needs a project');
});

test('secrets: link fills .env.local next to each .env.example, keeps existing values', () => {
  const root = multiWorkspace();
  script('secrets.cjs', ['set', 'OPENAI_API_KEY'], { root, input: SECRET });
  script('secrets.cjs', ['set', 'SHOP_DB', '--project', 'shop'], { root, input: 'postgres://u:p@h/db' });
  write(root, 'projects/shop/.env.example', '# llm\nOPENAI_API_KEY=\nSHOP_DB=\nPORT=3000\nMISSING_ONE=\n');
  write(root, 'projects/shop/repos/web/.env.example', 'OPENAI_API_KEY=\n');
  write(root, 'projects/shop/repos/web/.env.local', 'OPENAI_API_KEY=already-here\nEXTRA=1\n');

  const r = script('secrets.cjs', ['link', 'shop'], { root });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout, new RegExp(SECRET));
  assert.match(r.stdout, /MISSING_ONE\s+missing/);
  const local = read(root, 'projects/shop/.env.local');
  assert.match(local, new RegExp(`OPENAI_API_KEY=${SECRET}`));
  assert.match(local, /SHOP_DB='?postgres:\/\/u:p@h\/db'?/);
  assert.match(local, /PORT=3000/);
  const web = read(root, 'projects/shop/repos/web/.env.local');
  assert.match(web, /EXTRA=1/);

  // store values win: a rotated key reaches every .env.local on the next link
  assert.match(web, new RegExp(`OPENAI_API_KEY=${SECRET}`), 'store value replaces the stale one');
  script('secrets.cjs', ['set', 'OPENAI_API_KEY'], { root, input: 'sk-rotated-0987654321' });
  const relinked = script('secrets.cjs', ['link', 'shop'], { root });
  assert.match(relinked.stdout, /OPENAI_API_KEY\s+updated/);
  assert.match(read(root, 'projects/shop/.env.local'), /OPENAI_API_KEY=sk-rotated-0987654321/);
  assert.match(read(root, 'projects/shop/repos/web/.env.local'), /EXTRA=1/, 'keys outside the store are kept');
});

test('secrets: link only writes gitignored env names', () => {
  const root = multiWorkspace();
  write(root, 'projects/shop/.env.example', 'API_KEY=\n');
  for (const bad of ['package.json', '.env.sample', '.env.development', '../x.env', '.env.example']) {
    const r = script('secrets.cjs', ['link', 'shop', '--out', bad], { root });
    assert.notEqual(r.status, 0, `--out ${bad} must be refused`);
  }
  for (const ok of ['.env', '.env.local', '.env.development.local']) {
    assert.equal(script('secrets.cjs', ['link', 'shop', '--out', ok], { root }).status, 0, `--out ${ok}`);
  }
});

test('secrets: set from a file keeps multi-line values; check without .env.example exits 2', () => {
  const root = multiWorkspace();
  const pem = '-----BEGIN KEY-----\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLI\n-----END KEY-----';
  const file = write(root, 'key.pem', `${pem}\n`);
  assert.equal(script('secrets.cjs', ['set', 'PEM', '--project', 'shop', '--from-file', file], { root }).status, 0);
  const check = `const f = require("fs").readFileSync(${JSON.stringify(file)}, "utf-8").replace(/\\n$/, ""); process.stdout.write(process.env.PEM === f ? "same" : "different")`;
  const r = script('secrets.cjs', ['run', 'shop', '--', process.execPath, '-e', check], { root });
  assert.equal(r.stdout, 'same');
  require('fs').rmSync(require('path').join(root, 'projects', 'shop', '.env.example'));
  assert.equal(script('secrets.cjs', ['check', 'shop'], { root }).status, 2);
});

test('secrets: check reports missing keys with exit 1 and env layers override', () => {
  const root = multiWorkspace();
  write(root, 'projects/shop/.env.example', 'API_KEY=\n');
  let r = script('secrets.cjs', ['check', 'shop'], { root });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /API_KEY\s+missing/);
  script('secrets.cjs', ['set', 'API_KEY', '--project', 'shop', '--env', 'prod'], { root, input: 'prod-key-123456' });
  assert.equal(script('secrets.cjs', ['check', 'shop'], { root }).status, 1, 'prod layer not used without --env');
  r = script('secrets.cjs', ['check', 'shop', '--env', 'prod'], { root });
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /API_KEY\s+filled\s+project:shop@prod/);
  assert.ok(exists(root, '.atlas/secrets/projects/shop@prod.env'), 'env layer cannot collide with a project named shop.prod');
});

test('secrets: run injects keys into the child and masks them in its output', () => {
  const root = multiWorkspace();
  script('secrets.cjs', ['set', 'API_KEY', '--project', 'shop'], { root, input: SECRET });
  const r = script('secrets.cjs', ['run', 'shop', '--', process.execPath, '-e', 'console.log("key=" + process.env.API_KEY); console.error(process.env.API_KEY.length); process.exit(3)'], { root });
  assert.equal(r.status, 3, 'exit code propagates');
  assert.equal(r.stdout.trim(), 'key=****');
  assert.equal(r.stderr.trim(), String(SECRET.length));
});

test('db: output captured by an agent is masked, even what psql echoes back', () => {
  const fs = require('fs');
  const root = multiWorkspace();
  script('secrets.cjs', ['set', 'SHOP_DEV_URL', '--project', 'shop'], { root, input: 'postgresql://app:pw-very-secret-77@localhost:5432/shop' });
  script('db.cjs', ['add', 'shop-dev', '--project', 'shop', '--url-env', 'SHOP_DEV_URL'], { root });
  // a fake psql that leaks its connection settings, like `\\! env` would
  const bin = path.join(root, 'fakebin');
  fs.mkdirSync(bin);
  const impl = write(root, 'fakebin/psql-impl.cjs', 'console.log("password=" + process.env.PGPASSWORD + " db=" + process.env.PGDATABASE)');
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(bin, 'psql.cmd'), `@"${process.execPath}" "${impl}" %*\r\n`);
  } else {
    fs.writeFileSync(path.join(bin, 'psql'), `#!/bin/sh\nexec "${process.execPath}" "${impl}" "$@"\n`, { mode: 0o755 });
  }
  const r = script('db.cjs', ['shop-dev', '-c', 'select 1'], { root, env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trim(), 'password=**** db=shop');
});

test('db: registry add/list/enable/disable, readonly defaults, URL never printed', () => {
  const root = multiWorkspace();
  script('secrets.cjs', ['set', 'SHOP_DEV_URL', '--project', 'shop'], { root, input: 'postgresql://app:s3cr%40t@db.internal:6543/shop?sslmode=require' });
  assert.equal(script('db.cjs', ['add', 'shop-dev', '--project', 'shop', '--url-env', 'SHOP_DEV_URL'], { root }).status, 0);
  assert.equal(script('db.cjs', ['add', 'shop-prod', '--project', 'shop', '--env', 'prod', '--url-env', 'SHOP_PROD_URL', '--disabled'], { root }).status, 0);
  const list = script('db.cjs', ['list'], { root }).stdout;
  assert.match(list, /shop-dev\s+shop\s+dev\s+yes\s+no/);
  assert.match(list, /shop-prod\s+shop\s+prod\s+no\s+yes/);
  assert.doesNotMatch(list, /postgres/);

  const dry = script('db.cjs', ['shop-dev', '-c', 'select 1', '--dry-run'], { root });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /psql --no-psqlrc -v ON_ERROR_STOP=1 -c "select 1"/);
  assert.match(dry.stdout, /env: PGDATABASE, PGHOST, PGPASSWORD, PGPORT, PGSSLMODE, PGUSER/);
  assert.doesNotMatch(dry.stdout, /s3cr|db\.internal/);

  const refused = script('db.cjs', ['shop-prod', '-c', 'select 1', '--dry-run'], { root });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /disabled/);
  script('db.cjs', ['enable', 'shop-prod'], { root });
  const missing = script('db.cjs', ['shop-prod', '-c', 'select 1', '--dry-run'], { root });
  assert.match(missing.stderr, /SHOP_PROD_URL is not in the secret store/);
  script('secrets.cjs', ['set', 'SHOP_PROD_URL', '--project', 'shop', '--env', 'prod'], { root, input: 'postgres://ro@prod/shop' });
  const ro = script('db.cjs', ['shop-prod', '-c', 'select 1', '--dry-run'], { root });
  assert.match(ro.stdout, /PGOPTIONS.*\(read-only\)/);
});

test('port: reports a bound port as in use and a free one as free', async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const busy = server.address().port;
  const r = await new Promise((resolve) => {
    const { spawn } = require('child_process');
    const child = spawn(process.execPath, [path.join(__dirname, '..', '.claude', 'scripts', 'port.cjs'), String(busy)]);
    let out = '';
    child.stdout.on('data', (c) => (out += c));
    child.on('close', (code) => resolve({ code, out }));
  });
  server.close();
  assert.equal(r.code, 1);
  assert.equal(r.out.trim(), `${busy} in use`);
});

test('every script answers --help with exit 0', () => {
  const root = workspace({ mode: 'repo' });
  for (const s of ['secrets.cjs', 'db.cjs', 'project.cjs', 'mode.cjs', 'port.cjs']) {
    const r = script(s, ['--help'], { root });
    assert.equal(r.status, 0, `${s}: ${r.stderr}`);
    assert.match(r.stdout, /Usage/);
  }
});
