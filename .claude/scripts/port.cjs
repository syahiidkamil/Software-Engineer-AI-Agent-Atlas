#!/usr/bin/env node
// Is a port free? A cross-platform stand-in for `lsof -i :<port>`.
//   node .claude/scripts/port.cjs 3000 5173     -> "3000 in use" / "5173 free"; exit 1 if any is in use
// A port counts as in use when something answers on loopback (IPv4 or IPv6) or
// when binding it fails; checking both covers servers bound to 127.0.0.1 only.

const net = require('net');

function answers(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(400, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

function bindFails(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => resolve(err.code === 'EADDRINUSE' || err.code === 'EACCES'));
    server.listen({ port, host: '127.0.0.1', exclusive: true }, () => server.close(() => resolve(false)));
  });
}

async function inUse(port) {
  const [v4, v6, bind] = await Promise.all([answers('127.0.0.1', port), answers('::1', port), bindFails(port)]);
  return v4 || v6 || bind;
}

async function main() {
  const ports = process.argv.slice(2);
  if (!ports.length || ports.includes('--help') || ports.includes('-h')) {
    console.log('Usage: node .claude/scripts/port.cjs <port> [port...]   exit 1 if any port is in use');
    return;
  }
  let busy = 0;
  for (const p of ports) {
    const port = Number(p);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error(`not a port: ${p}`);
      process.exitCode = 2;
      return;
    }
    const used = await inUse(port);
    if (used) busy++;
    console.log(`${port} ${used ? 'in use' : 'free'}`);
  }
  process.exitCode = busy ? 1 : 0;
}

main();
