#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');
const os = require('os');

// Path to the audio file
const audioFile = path.join(__dirname, 'TASK_COMPLETE_VOICE.wav');

// Cross-platform audio playback
function playAudio() {
  const platform = os.platform();
  let command;

  switch (platform) {
    case 'win32':
      // Windows: Use PowerShell SoundPlayer
      command = `powershell -c "(New-Object Media.SoundPlayer '${audioFile}').PlaySync()"`;
      break;
    case 'darwin':
      // macOS: Use afplay
      command = `afplay "${audioFile}"`;
      break;
    case 'linux':
      // Linux: Try multiple options (most common first)
      command = `paplay "${audioFile}" || aplay "${audioFile}" || ffplay -nodisp -autoexit "${audioFile}"`;
      break;
    default:
      console.error('Unsupported platform:', platform);
      process.exit(1);
  }

  exec(command, (error) => {
    if (error) {
      console.error('Audio playback failed:', error.message);
      process.exit(1);
    }
  });
}

playAudio();