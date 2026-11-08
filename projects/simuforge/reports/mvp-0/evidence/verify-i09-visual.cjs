'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;

async function capture(size) {
  const chrome = await launch({ port: 9430, url: 'http://localhost:5173/', windowWidth: size.w, windowHeight: size.h });
  const cdp = await connectToPage(9430, 'localhost:5173');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await sleep(3000);

  const labels = size.w === 1024 ? ['B', 'P', 'S'] : ['Build', 'Program', 'Simulate'];
  const names = ['build', 'program', 'simulate'];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const name = names[i];
    // click by index to be safe
    await cdp.evaluate(`(() => { const btns = Array.from(document.querySelectorAll('.sf-preset-btn')); if (btns[${i}]) { btns[${i}].click(); return true; } return false; })()`);
    await sleep(1200);
    const active = await cdp.evaluate('Array.from(document.querySelectorAll(".sf-preset-btn.active")).map(x=>x.textContent.trim())');
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    const buf = Buffer.from(shot.data, 'base64');
    const file = path.join(OUT, `i09-${size.w}x${size.h}-${name}.png`);
    fs.writeFileSync(file, buf);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const dims = await cdp.evaluate('({w: window.innerWidth, h: window.innerHeight})');
    console.log(`captured ${size.w}x${size.h} ${name}: active=${JSON.stringify(active)} sha256=${hash} dims=${JSON.stringify(dims)}`);
  }
  cdp.close();
  await chrome.stop();
}

(async () => {
  await capture({ w: 1024, h: 640 });
  await capture({ w: 1440, h: 900 });
  console.log('VISUAL DONE');
})();