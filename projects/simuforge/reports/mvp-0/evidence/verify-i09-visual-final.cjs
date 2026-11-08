'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;

async function capture(size) {
  const chrome = await launch({ port: 9431, url: 'http://localhost:5173/', windowWidth: size.w + 50, windowHeight: size.h + 100 });
  const cdp = await connectToPage(9431, 'localhost:5173');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  // exact viewport emulation
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: size.w, height: size.h, deviceScaleFactor: 1, mobile: false });
  await sleep(2000);

  const labels = size.w === 1024 ? ['B', 'P', 'S'] : ['Build', 'Program', 'Simulate'];
  const names = ['build', 'program', 'simulate'];
  const results = [];
  for (let i = 0; i < labels.length; i++) {
    await cdp.evaluate(`(() => { const btns = Array.from(document.querySelectorAll('.sf-preset-btn')); if (btns[${i}]) { btns[${i}].click(); return true; } return false; })()`);
    // wait for render settle
    await sleep(1500);
    const active = await cdp.evaluate('Array.from(document.querySelectorAll(".sf-preset-btn.active")).map(x=>x.textContent.trim())');
    const dims = await cdp.evaluate('({w: window.innerWidth, h: window.innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight})');
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const file = path.join(OUT, `i09-${size.w}x${size.h}-${names[i]}.png`);
    fs.writeFileSync(file, buf);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    results.push({ preset: names[i], active, dims, file: path.basename(file), hash, bytes: buf.length });
    console.log(JSON.stringify(results[results.length - 1]));
  }
  cdp.close();
  await chrome.stop();
  return results;
}

(async () => {
  const r1 = await capture({ w: 1024, h: 640 });
  const r2 = await capture({ w: 1440, h: 900 });
  fs.writeFileSync(path.join(OUT, 'i09-visual-meta.json'), JSON.stringify({ r1, r2, timestamp: new Date().toISOString() }, null, 2));
  console.log('VISUAL FINAL DONE');
})();