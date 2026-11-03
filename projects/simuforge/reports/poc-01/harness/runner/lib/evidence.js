'use strict';

// Evidence capture: screenshots, harness JSON export, sidecar audit records.
//
// File naming keeps the official SP-05 convention. A proof run adds a
// `proof_` prefix and a `_passN` suffix so proof artifacts can never be
// mistaken for the official T-01..T-06 evidence set.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { sleep } = require('./cdp');

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function splitExt(name) {
  const ext = path.extname(name);
  if (!ext) return { base: name, ext: '' };
  return { base: name.slice(0, -ext.length), ext };
}

class EvidenceStore {
  constructor({ dir, proof = false, pass = 1, runId = null }) {
    this.dir = ensureDir(dir);
    this.proof = proof;
    this.pass = pass;
    this.runId = runId;
    this.files = [];
    this.stagingRoot = ensureDir(path.join(this.dir, '_staging'));
  }

  name(officialName) {
    const { base, ext } = splitExt(officialName);
    if (!this.proof) return base + ext;
    return 'proof_' + base + '_pass' + this.pass + ext;
  }

  path(officialName) {
    return path.join(this.dir, this.name(officialName));
  }

  register(officialName, extra = {}) {
    const full = this.path(officialName);
    const record = {
      name: this.name(officialName),
      officialName,
      path: full,
      bytes: fs.existsSync(full) ? fs.statSync(full).size : null,
      sha256: fs.existsSync(full) ? sha256File(full) : null,
      ...extra
    };
    this.files.push(record);
    return record;
  }

  async screenshot(page, officialName) {
    if (page && typeof page.resetPanelScroll === 'function') {
      await page.resetPanelScroll();
    }
    const target = this.path(officialName);
    const result = await page.cdp.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true,
      captureBeyondViewport: false
    }, 30000);
    if (!result || !result.data) throw new Error('Page.captureScreenshot returned no data');
    fs.writeFileSync(target, Buffer.from(result.data, 'base64'));
    return this.register(officialName, { kind: 'screenshot' });
  }

  writeJson(officialName, data) {
    const target = this.path(officialName);
    fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n', 'utf8');
    return this.register(officialName, { kind: 'json' });
  }

  // Capture the harness's own export. The harness downloads a fixed filename
  // via a blob URL, so download interception is the only way to obtain the
  // exact bytes it produced without rewriting the page. Each export gets a
  // unique staging directory and only the exact expected filename is accepted;
  // unrelated browser downloads are never mistaken for evidence.
  async harnessExport(page, officialName, { timeoutMs = 20000 } = {}) {
    const staging = fs.mkdtempSync(path.join(this.stagingRoot, 'export-'));
    const expected = 'sp-05_transform_log.json';
    const expectedPath = path.join(staging, expected);

    let behaviorSet = false;
    // This Chrome build cancels downloads when Browser.setDownloadBehavior is
    // used with a custom path (verified 2026-11-02), while the per-page method
    // works. Prefer Page.setDownloadBehavior and fall back to the Browser
    // domain only if the page-domain call is unavailable.
    try {
      await page.cdp.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: staging
      });
      behaviorSet = true;
    } catch (_) {
      try {
        await page.cdp.send('Browser.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: staging,
          eventsEnabled: true
        });
        behaviorSet = true;
      } catch (_) {
        behaviorSet = false;
      }
    }
    if (!behaviorSet) throw new Error('Could not configure a download path for the harness export');

    await page.exportJson();

    const deadline = Date.now() + timeoutMs;
    let lastSize = -1;
    let stableTicks = 0;
    while (Date.now() < deadline) {
      if (fs.existsSync(expectedPath) && !fs.existsSync(expectedPath + '.crdownload')) {
        const size = fs.statSync(expectedPath).size;
        if (size > 0 && size === lastSize) {
          stableTicks += 1;
          if (stableTicks >= 2) break;
        } else {
          stableTicks = 0;
        }
        lastSize = size;
      }
      await sleep(100);
    }

    if (!fs.existsSync(expectedPath)) {
      const observed = fs.readdirSync(staging);
      throw new Error('Harness did not produce ' + expected + ' within ' + timeoutMs + ' ms; staging contains: ' + JSON.stringify(observed));
    }

    const target = this.path(officialName);
    fs.copyFileSync(expectedPath, target);
    try {
      fs.rmSync(staging, { recursive: true, force: true });
    } catch (_) {
      // Leftover staging files are cleaned by cleanup() at the end of the pass.
    }
    return this.register(officialName, { kind: 'harness-export', source: expected });
  }

  cleanup() {
    try {
      fs.rmSync(this.stagingRoot, { recursive: true, force: true });
    } catch (_) {
      // Staging cleanup is best effort.
    }
  }

  manifest() {
    return {
      directory: this.dir,
      proof: this.proof,
      pass: this.pass,
      runId: this.runId,
      files: this.files.slice()
    };
  }
}

module.exports = {
  EvidenceStore,
  ensureDir,
  sha256File
};
