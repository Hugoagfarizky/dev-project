'use strict';
const fs = require('fs');
const path = require('path');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;
const PORT = 9420;
const URL = 'http://localhost:5173/';

async function main() {
  const chrome = await launch({ port: PORT, url: URL, windowWidth: 1440, windowHeight: 900 });
  let cdp;
  try {
    cdp = await connectToPage(PORT, 'localhost:5173');
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await sleep(2000);

    await cdp.evaluate(`
      window.__getStore = function () {
        const root = document.querySelector('.sf-shell') || document.getElementById('root');
        if (!root) return null;
        const fiberKey = Object.keys(root).find((key) => key.startsWith('__reactFiber$'));
        let fiber = fiberKey ? root[fiberKey] : null;
        while (fiber) {
          const props = fiber.memoizedProps;
          if (props && props.store && typeof props.store.dispatch === 'function') return props.store;
          fiber = fiber.return;
        }
        return null;
      };
      true;
    `);

    // wait for renderer
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      const ok = await cdp.evaluate('!!(window.__getStore() && window.__simuforgeRenderer && window.__simuforgeRenderer.scene && document.querySelector("canvas"))');
      if (ok) break;
      await sleep(200);
    }

    const results = [];
    for (const target of [0, 10, 50, 100]) {
      // reset to empty
      await cdp.evaluate(`(() => { const s = __getStore(); while (s.getSnapshot().project.world.entities.length > 0) { const id = s.getSnapshot().project.world.entities[s.getSnapshot().project.world.entities.length-1].id; s.dispatch({ type: 'entity/delete', id }); } return true; })()`);
      await sleep(300);
      // create up to target
      await cdp.evaluate(`(() => { const s = __getStore(); for (let i = s.getSnapshot().project.world.entities.length; i < ${target}; i++) s.dispatch({ type: 'entity/create', entityType: 'cube' }); return true; })()`);
      await sleep(500);

      const metrics = await cdp.evaluate(`(async () => {
        await new Promise((r) => requestAnimationFrame(() => r()));
        const intervals = [];
        let last = performance.now();
        let count = 0;
        await new Promise((resolve) => {
          function tick() {
            const now = performance.now();
            intervals.push(now - last);
            last = now;
            count++;
            if (count < 120) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
        intervals.sort((a,b) => a-b);
        const store = __getStore();
        const r = window.__simuforgeRenderer;
        return {
          entityCount: store.getSnapshot().project.world.entities.length,
          meshCount: r.meshes.size,
          frameCount: intervals.length,
          medianFrameMs: intervals[Math.floor(intervals.length/2)],
          p95FrameMs: intervals[Math.floor(intervals.length*0.95)],
          minFrameMs: intervals[0],
          maxFrameMs: intervals[intervals.length-1],
          webGlVersion: r.getDiagnostics().webGlVersion,
          contextLost: r.getDiagnostics().contextLost
        };
      })()`, 60000);

      results.push(metrics);
      console.log('count', target, JSON.stringify(metrics));
    }

    fs.writeFileSync(path.join(OUT, 'i09-perf-result.json'), JSON.stringify({ results, browser: chrome.version, userAgent: chrome.userAgent, timestamp: new Date().toISOString() }, null, 2));
    console.log('PERF DONE');
  } finally {
    if (cdp) cdp.close();
    await chrome.stop();
  }
}

main().catch((e) => { console.error('PERF ERROR', e && e.stack || e); process.exitCode = 1; });