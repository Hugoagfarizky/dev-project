'use strict';

// Owns the Chrome process used for SP-05 evidence capture.
// A dedicated profile and a dedicated debugging port are mandatory: input is
// throttled to roughly 5 s/event if the page is treated as occluded, so the
// anti-throttling flags below are part of the measurement conditions, not an
// optimisation.

const { spawn, execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { CdpError, waitForVersion, sleep } = require('./cdp');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe')
].filter(Boolean);

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('Google Chrome was not found. Set CHROME_PATH or install Chrome.');
}

async function portInUse(port) {
  try {
    const response = await fetch('http://127.0.0.1:' + port + '/json/version', { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch (_) {
    return false;
  }
}

async function launch({ port = 9223, url, windowWidth = 1400, windowHeight = 1000, windowX = 60, windowY = 40 } = {}) {
  if (!url) throw new Error('launch() requires a page url');
  if (await portInUse(port)) {
    throw new CdpError('CDP port ' + port + ' is already in use. Refusing to share a browser session; pass --port with a free port.');
  }

  const chrome = findChrome();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sp05-chrome-'));
  const args = [
    '--remote-debugging-port=' + port,
    '--remote-debugging-address=127.0.0.1',
    '--user-data-dir=' + profileDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=CalculateNativeWinOcclusion',
    '--window-size=' + windowWidth + ',' + windowHeight,
    '--window-position=' + windowX + ',' + windowY,
    url
  ];

  const child = spawn(chrome, args, { stdio: 'ignore', windowsHide: false });
  child.on('error', () => { /* surfaced by the version wait below */ });

  let version;
  try {
    version = await waitForVersion(port, 30000);
  } catch (err) {
    stopProcess(child, profileDir);
    throw err;
  }

  return {
    port,
    chrome,
    profileDir,
    child,
    version: version.Browser,
    userAgent: version['User-Agent'] || null,
    stop() {
      return stopProcess(child, profileDir);
    }
  };
}

function stopProcess(child, profileDir) {
  if (!child) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGKILL');
    }
  } catch (_) {
    // Process may already be gone.
  }

  // Best effort cleanup; Chrome may still hold a lock for a moment.
  if (profileDir) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        fs.rmSync(profileDir, { recursive: true, force: true });
        break;
      } catch (_) {
        execFileSync(process.platform === 'win32' ? 'cmd' : 'sh',
          process.platform === 'win32' ? ['/c', 'ping', '-n', '1', '-w', '300', '127.0.0.1'] : ['-c', 'sleep 0.3'],
          { stdio: 'ignore' });
      }
    }
  }
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

module.exports = {
  findChrome,
  launch,
  portInUse,
  sha256File,
  sleep
};
