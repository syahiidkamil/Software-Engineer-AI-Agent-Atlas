#!/usr/bin/env node
// PreToolUse guard for Bash: keep secret values out of the transcript.
// Blocks commands that touch the secret store (.atlas/secrets) or a real env file
// (.env, .env.local, .env.production, ...). Exceptions: a single call to a
// secrets.cjs subcommand that never prints values (keys, set, unset, link, check),
// and metadata-only commands on env files (ls, git rm --cached, git check-ignore).
// .env.example / .sample / .template and source files like .env.ts stay readable.
//
// Best-effort by design: it stops the commands an agent plausibly runs by
// accident, not a command built to get around it, and not tools that load .env
// implicitly. Permission deny rules cover the Read/Edit tools; `secrets.cjs run`
// masks values in output.

const CHAIN = /[;&|<>`$()\n\r]/; // anything that can chain, substitute, or redirect
const ENV_FILE_RE = /(?:^|[\s'"=:;|&<>(\\/])\.env(?!\.(?:example|sample|template|d\.ts|ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|json|ya?ml|toml)(?:$|[\s'";|&<>)]))(?:\.[A-Za-z0-9_.-]+)?(?=$|[\s'";|&<>)\\/*?[])/;
const STORE_RE = /\.atlas[\\/]+(?:secrets|[*?[])/;
const STORE_FILES_RE = /(?:^|[\s'"\\/])(?:secrets[\\/]|global\.env|databases\.json)/;
const SAFE_SECRETS_CMD = /^\s*node\s+["']?(?:[^\s"']*[\\/])?\.claude[\\/]scripts[\\/]secrets\.cjs["']?\s+(?:keys|set|unset|link|check)\b/;
const SAFE_ENV_META = /^\s*(?:ls(?:\s+-[A-Za-z]+)*|git\s+(?:rm\s+(?:-r\s+)?--cached|check-ignore(?:\s+-v)?|ls-files)|test\s+-[ef]|stat)\s/;

function touchesStore(command) {
  if (STORE_RE.test(command)) return true;
  // "cd .atlas && cat secrets/global.env", "cat .atlas/*/global.env"
  return /\.atlas\b/.test(command) && STORE_FILES_RE.test(command);
}

function decide(command) {
  if (typeof command !== 'string' || !command) return null;
  const store = touchesStore(command);
  const envFile = ENV_FILE_RE.test(command);
  if (!store && !envFile) return null;
  if (!CHAIN.test(command)) {
    if (SAFE_SECRETS_CMD.test(command)) return null;
    if (!store && SAFE_ENV_META.test(command)) return null;
  }
  return (
    'Blocked by the ATLAS secret guard: this command touches the secret store or an env file, ' +
    'which would put secret values in the transcript. Work with key names instead: ' +
    '`node .claude/scripts/secrets.cjs keys|check|link` and `secrets.cjs run <project> -- <cmd>` ' +
    '(values injected and masked), `node .claude/scripts/db.cjs` for databases. ' +
    'To change .gitignore or docs that mention env files, use the Edit tool. ' +
    'If a value is missing, ask the user to store it themselves (see `secrets.cjs --help`); ' +
    'never ask them to paste a key into chat.'
  );
}

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

async function main() {
  if (process.argv.includes('--dry-run')) {
    const cmd = process.argv.slice(process.argv.indexOf('--dry-run') + 1).join(' ');
    console.log(decide(cmd) ? 'deny' : 'allow');
    return;
  }
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return; // not our input to judge; permission rules still apply
  }
  if (input.tool_name !== 'Bash') return;
  const reason = decide(input.tool_input && input.tool_input.command);
  if (!reason) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    })
  );
}

if (require.main === module) main();

module.exports = { decide };
