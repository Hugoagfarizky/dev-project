'use strict';
// F-1 targeted re-capture: Program preset only, at 1024x640 and 1440x900.
// Overwrites only i09-<size>-program.png. Build/Simulate evidence is untouched.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;
const PORT = 9440;
const TARGET = 'localhost:5174';

async function capture(width, height) {
  const chrome = await launch({ port: PORT, url: 'http://localhost:5174/', windowWidth: width + 50, windowHeight: height + 100 });
  const cdp = await connectToPage(PORT, TARGET);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await sleep(2500);

  // click the Program preset by DOM order index 1 (labels are "B"/"P"/"S" at 1024, full words at 1440)
  await cdp.evaluate("(() => { const b = Array.from(document.querySelectorAll('.sf-preset-btn'))[1]; if (!b) return false; b.click(); return true; })()");
  await sleep(1500);

  const active = await cdp.evaluate("Array.from(document.querySelectorAll('.sf-preset-btn.active')).map(x => x.textContent.trim())");
  const dims = await cdp.evaluate("({ w: window.innerWidth, h: window.innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight })");
  // confirm the planned surface is rendered and visible inside the open Program panel
  const planned = await cdp.evaluate(`(() => {
    const panel = Array.from(document.querySelectorAll('.sf-panel')).find((p) => (p.querySelector('.sf-panel-title') || {}).textContent === 'Program');
    if (!panel) return { found: false };
    const surface = panel.querySelector('.sf-planned-surface');
    if (!surface) return { found: true, surface: false };
    const style = getComputedStyle(surface);
    const body = surface.closest('.sf-panel-body');
    const rect = surface.getBoundingClientRect();
    return {
      found: true,
      surface: true,
      text: surface.textContent.trim(),
      display: style.display,
      bodyDisplay: body ? getComputedStyle(body).display : null,
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      visible: style.display !== 'none' && getComputedStyle(surface).visibility !== 'hidden' && rect.width > 0 && rect.height > 0
    };
  })()`);

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const file = path.join(OUT, `i09-${width}x${height}-program.png`);
  fs.writeFileSync(file, buf);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  cdp.close();
  await chrome.stop();
  return { width, height, active, dims, planned, file: path.basename(file), hash, bytes: buf.length };
}

(async () => {
  const results = [];
  results.push(await capture(1024, 640));
  results.push(await capture(1440, 900));
  const record = { recapturedFor: 'F-1 planned-surface label', capturedAt: new Date().toISOString(), results };
  fs.writeFileSync(path.join(OUT, 'i09-visual-meta-program-fix.json'), JSON.stringify(record, null, 2));
  for (const r of results) console.log(JSON.stringify(r));
  console.log('PROGRAM RECAPTURE DONE');
})().catch((e) => { console.error('ERR', (e && e.stack) || e); process.exitCode = 1; });
