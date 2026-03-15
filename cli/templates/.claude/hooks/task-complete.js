#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Path to the audio file
const audioFile = path.join(__dirname, 'task-complete.wav');

// Detect project name from the closest CLAUDE.md or package.json
function getProjectName() {
  let dir = process.cwd();

  // Walk up to find project root indicators
  for (let i = 0; i < 10; i++) {
    // Try package.json
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        if (pkg.name) return pkg.name;
      } catch {}
    }

    // Try CLAUDE.md for project name hints
    const claudePath = path.join(dir, 'CLAUDE.md');
    if (fs.existsSync(claudePath)) {
      // Use the folder name as project name
      return path.basename(dir);
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Fallback to current directory name
  return path.basename(process.cwd());
}

function notifyComplete() {
  const platform = os.platform();
  const projectName = getProjectName();
  const message = `for ${projectName}`;

  if (platform === 'darwin') {
    // macOS: Play the wav first, then speak with say
    const playCmd = `afplay "${audioFile}" 2>/dev/null && say -v Alex "${message}"`;
    exec(playCmd, (error) => {
      if (error) {
        // Fallback to just say if wav fails
        exec(`say -v Alex "${message}"`);
      }
    });
  } else if (platform === 'win32') {
    // Windows: Play wav then use PowerShell TTS
    const playCmd = `powershell -c "(New-Object Media.SoundPlayer '${audioFile}').PlaySync(); Add-Type -AssemblyName System.Speech; (New-Object System.Speech.Synthesis.SpeechSynthesizer).Speak('${message}')"`;
    exec(playCmd, (error) => {
      if (error) {
        console.error('Audio playback failed:', error.message);
      }
    });
  } else if (platform === 'linux') {
    // Linux: Play wav then use espeak
    const playCmd = `(paplay "${audioFile}" || aplay "${audioFile}" || true) && (espeak "${message}" || spd-say "${message}" || true)`;
    exec(playCmd, (error) => {
      if (error) {
        console.error('Audio playback failed:', error.message);
      }
    });
  }
}

notifyComplete();
