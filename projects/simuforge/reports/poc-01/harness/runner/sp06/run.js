'use strict';

// SP-06 harness smoke runner (validation only; not full SP-06 execution).
// Usage: node run.js [--port 9225] [--out <dir>]

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const RUNNER = path.resolve(__dirname, '..'); // runner/
const HARNESS = path.resolve(__dirname, '..', '..', 'sp06.html');

const browserLib = require(path.join(RUNNER, 'lib', 'browser.js'));
const { connectToPage } = require(path.join(RUNNER, 'lib', 'cdp.js'));
const pageLib = require(path.join(RUNNER, 'lib', 'page.js'));
const { EvidenceStore } = require(path.join(RUNNER, 'lib', 'evidence.js'));

function parseArgs(argv) {
  const opts = { port: 9225, out: null, windowWidth: 1400, windowHeight: 1000 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(a + ' requires a value'); return v; };
    if (a === '--port') opts.port = Number(next());
    else if (a === '--out') opts.out = next();
    else if (a === '--window-size') { const [w, h] = next().split('x').map(Number); opts.windowWidth = w; opts.windowHeight = h; }
    else if (a === '--help' || a === '-h') { console.log('SP-06 smoke runner\n  --port <n>  --out <dir>  --window-size WxH'); process.exit(0); }
    else throw new Error('Unknown argument: ' + a);
  }
  return opts;
}

function sha256File(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const outDir = opts.out ? path.resolve(opts.out) : path.resolve(__dirname, '..', '..', '..', 'results', 'sp-06-smoke');
  const runId = 'sp06-smoke-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const url = pathToFileURL(HARNESS).href;
  const harnessInfo = { path: HARNESS, bytes: fs.statSync(HARNESS).size, sha256: sha256File(HARNESS) };

  console.log('SP-06 smoke runner');
  console.log('  runId   :', runId);
  console.log('  out     :', outDir);
  console.log('  harness :', harnessInfo.path, '(' + harnessInfo.sha256.slice(0, 12) + ')');

  let browser = null, cdp = null, page = null, store = null;
  const checks = [];
  const ok = (name, pass, detail) => { checks.push({ name, status: pass ? 'PASS' : 'FAIL', detail }); console.log('  ' + (pass ? 'PASS' : 'FAIL') + ' ' + name); };

  try {
    browser = await browserLib.launch({ port: opts.port, url, windowWidth: opts.windowWidth, windowHeight: opts.windowHeight });
    cdp = await connectToPage(opts.port, 'sp06.html');
    page = await pageLib.attach(cdp, { url, driver: 'simuforge-sp06-smoke', sessionId: runId, consoleAllowlist: [] });
    await page.reload();
    console.log('  chrome  :', browser.version);

    store = new (require(path.join(RUNNER, 'lib', 'evidence.js')).EvidenceStore)({ dir: outDir, proof: false, pass: 1, runId });

    const snap = await page.snapshot();
    ok('Harness Babylon version is 9.32.1', snap.babylonVersion === '9.32.1', snap.babylonVersion);
    ok('Right-handed system active', snap.useRightHandedSystem === true, snap.useRightHandedSystem);
    ok('Camera state available', !!(snap.camera && Number.isFinite(snap.camera.alpha)), snap.camera);

    // Gizmo policy verified per mode (gizmos are lazy)
    await page.setMode('translate');
    const tSnap = await page.snapshot();
    ok('Translate gizmo world space', tSnap.gizmos.positionSpaceWorld === true, tSnap.gizmos.positionSpaceWorld);
    await page.setMode('rotate');
    const rSnap = await page.snapshot();
    ok('Rotate gizmo world space', rSnap.gizmos.rotationSpaceWorld === true, rSnap.gizmos.rotationSpaceWorld);
    await page.setMode('scale');
    const sSnap = await page.snapshot();
    ok('Scale gizmo local space', sSnap.gizmos.scaleSpaceLocal === true, sSnap.gizmos.scaleSpaceLocal);

    // camera diagnostics
    const camState = await page.evaluate('window.__simuforgeDiagnostics.getCameraState()');
    ok('getCameraState() works', !!(camState && Number.isFinite(camState.alpha)), camState);

    const inputMap = await page.evaluate('window.__simuforgeDiagnostics.getCameraInputMap()');
    ok('getCameraInputMap() works', Array.isArray(inputMap) && inputMap.length > 0, inputMap ? inputMap.length : null);

    // reset input map
    const resetRes = await page.evaluate('window.__simuforgeDiagnostics.resetCameraInputMap()');
    ok('resetCameraInputMap() works', resetRes && resetRes.ok === true, resetRes);

    // screenshot
    const shot = await store.screenshot(page, 'sp-06_smoke.png');
    ok('Screenshot captured', fs.existsSync(shot.path), shot.name);

    // console
    const consoleSummary = page.consoleSummary();
    ok('No console errors', consoleSummary.errors.length === 0, consoleSummary.errors);

    const allPassed = checks.every((c) => c.status === 'PASS');
    const summary = {
      runner: { name: 'simuforge-sp06-smoke', version: '0.1.0' },
      runId,
      purpose: 'harness smoke test (not SP-06 acceptance)',
      harness: harnessInfo,
      browser: { version: browser.version },
      checks,
      result: allPassed ? 'PASS' : 'FAIL',
      completedAt: new Date().toISOString(),
      note: 'Smoke test only. Not official SP-06 evidence. SP-06 remains NO-GO.'
    };
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'sp-06_smoke_summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
    store.cleanup();

    console.log('\nOverall: ' + summary.result);
    console.log('Summary: ' + path.join(outDir, 'sp-06_smoke_summary.json'));
    return allPassed ? 0 : 1;
  } finally {
    if (page) page.dispose();
    if (cdp) cdp.close();
    if (browser && !opts.attach && !opts.keepBrowser) { try { await browser.stop(); } catch (_) {} }
  }
}

main().then((code) => process.exit(code)).catch((e) => { console.error('\nRUNNER ERROR: ' + (e && e.stack ? e.stack : e)); process.exit(2); });
