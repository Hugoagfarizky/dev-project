'use strict';
const fs = require('fs');
const path = require('path');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;
const PORT = 9421;

async function capture(size) {
  const chrome = await launch({ port: PORT, url: 'http://localhost:5173/', windowWidth: size.w, windowHeight: size.h });
  const cdp = await connectToPage(PORT, 'localhost:5173');
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await sleep(3000);
  // click presets
  for (const preset of ['Build', 'Program', 'Simulate']) {
    await cdp.evaluate(`(() => { const b = Array.from(document.querySelectorAll('.sf-preset-btn')).find(x => (x.textContent||'').trim() === ${JSON.stringify(preset)}); if (b) b.click(); return !!b; })()`);
    await sleep(600);
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, `i09-${size.w}x${size.h}-${preset.toLowerCase()}.png`), Buffer.from(shot.data, 'base64'));
    console.log('captured', size.w, size.h, preset);
  }
  cdp.close();
  await chrome.stop();
}

(async () => {
  await capture({ w: 1024, h: 640 });
  await capture({ w: 1440, h: 900 });
  console.log('VISUAL DONE');
})();