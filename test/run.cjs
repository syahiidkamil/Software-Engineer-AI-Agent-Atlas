#!/usr/bin/env node
// Runs every test/*.test.cjs with node:test. A runner instead of a shell glob,
// so `npm test` behaves the same under cmd.exe, PowerShell, and sh.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const files = fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.cjs')).sort().map((f) => path.join(__dirname, f));
const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
