#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Detect project name from the closest CLAUDE.md or package.json
function getProjectName() {
  let dir = process.cwd();

  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) return pkg.name;
      } catch {}
    }

    const claudePath = path.join(dir, 'CLAUDE.md');
    if (fs.existsSync(claudePath)) {
      return path.basename(dir);
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.basename(process.cwd());
}

function notifyAskUserInput() {
  const platform = os.platform();
  const projectName = getProjectName();
  const message = `Question for ${projectName}`;

  if (platform === 'darwin') {
    exec(`say -v Alex "${message}"`);
  } else if (platform === 'win32') {
    exec(`powershell -c "Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${message}')"`);
  } else if (platform === 'linux') {
    exec(`espeak "${message}" || spd-say "${message}" || true`);
  }
}

notifyAskUserInput();
