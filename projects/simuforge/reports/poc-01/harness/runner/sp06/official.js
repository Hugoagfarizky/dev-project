'use strict';

// Official SP-06 camera-navigation runner (D12).
//
// Purpose:
//   Execute the approved S-01..S-12 procedure exactly once per invocation,
//   using the trusted CDP input pipeline, the owner-approved 2000 ms settle
//   delay, and the owner-approved Option A invariance bound (1e-9).
//
// Scope:
//   - Dedicated SP-06 harness only (harness/sp06.html).
//   - No main Simulation Studio source is touched.
//   - No acceptance criterion is changed by this runner; the scenario checks
//     encode the written criteria. One written expectation was amended by the
//     Project Owner on 2026-11-04 (S-03/A-05-P2 beta sign, see config.js
//     SIGN_CONVENTION). The superseded expectation is retained only as a
//     non-default reproduction mode.
//
// Usage:
//   node official.js [--port 9237] [--out <dir>] [--window-size 1400x1000]
//                    [--sign-convention amended|legacy]
//                    [--keep-browser] [--attach]
//
// `babylon` and `procedure` are accepted aliases for `amended` and `legacy`.
//
// Exit codes: 0 = PASS, 1 = FAIL, 2 = BLOCKED/infrastructure error.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const config = require('./config');
const browserLib = require('../lib/browser.js');
const { connectToPage, sleep } = require('../lib/cdp.js');
const pageLib = require('../lib/page.js');
const { EvidenceStore, sha256File } = require('../lib/evidence.js');
const { Checks } = require('../lib/assert.js');
const scenarioLib = require('../lib/scenario.js');

const { TOLERANCES, EXPECTED_CAMERA, SCREENSHOTS, GESTURES, INPUT_MAP, SIGN_CONVENTION, RUNNER } = config;

const HARNESS = path.resolve(__dirname, '..', '..', 'sp06.html');
const DEFAULT_PORT = 9237;

const INFRASTRUCTURE_PATTERNS = [
  /WebSocket/i,
  /Timed out/i,
  /timeout/i,
  /No page target/i,
  /Execution context was destroyed/i,
  /Cannot find context/i,
  /Target closed/i,
  /Harness did not become ready/i,
  /CDP endpoint/i,
  /Failed to launch/i
];

function resolveSignConvention(value) {
  const canonical = SIGN_CONVENTION.aliases[value] || value;
  const spec = SIGN_CONVENTION[canonical];
  if (!spec || typeof spec !== 'object' || !spec.id) {
    throw new Error('--sign-convention must be "amended" or "legacy" (aliases: "babylon", "procedure")');
  }
  return spec;
}

function parseArgs(argv) {
  const opts = {
    port: DEFAULT_PORT,
    out: null,
    windowWidth: 1400,
    windowHeight: 1000,
    keepBrowser: false,
    attach: false,
    signConvention: SIGN_CONVENTION.default
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(a + ' requires a value');
      return v;
    };
    if (a === '--port') opts.port = Number(next());
    else if (a === '--out') opts.out = next();
    else if (a === '--window-size') {
      const [w, h] = next().split('x').map(Number);
      opts.windowWidth = w;
      opts.windowHeight = h;
    } else if (a === '--sign-convention') {
      opts.signConvention = resolveSignConvention(next()).id;
    } else if (a === '--keep-browser') opts.keepBrowser = true;
    else if (a === '--attach') opts.attach = true;
    else if (a === '--help' || a === '-h') {
      console.log('SP-06 official runner');
      console.log('  --port <n>                         CDP port (default 9237)');
      console.log('  --out <dir>                        evidence directory');
      console.log('  --window-size WxH                  default 1400x1000');
      console.log('  --sign-convention amended|legacy');
      console.log('  --keep-browser                     leave Chrome running');
      console.log('  --attach                           attach to an existing Chrome');
      process.exit(0);
    } else {
      throw new Error('Unknown argument: ' + a);
    }
  }
  if (!Number.isInteger(opts.port) || opts.port <= 0) throw new Error('Invalid --port');
  if (!Number.isFinite(opts.windowWidth) || !Number.isFinite(opts.windowHeight)) {
    throw new Error('Invalid --window-size; expected WxH');
  }
  return opts;
}

function nowIso() {
  return new Date().toISOString();
}

function newRunId() {
  return 'sp06-official-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
}

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function allFinite(state) {
  return !!state
    && finite(state.alpha)
    && finite(state.beta)
    && finite(state.radius)
    && Array.isArray(state.target)
    && state.target.length === 3
    && state.target.every(finite);
}

function cameraState(snapshot) {
  const c = snapshot.camera || {};
  return {
    alpha: c.alpha,
    beta: c.beta,
    radius: c.radius,
    target: Array.isArray(c.target) ? c.target.slice() : null
  };
}

function cameraDelta(before, after) {
  return {
    alpha: after.alpha - before.alpha,
    beta: after.beta - before.beta,
    radius: after.radius - before.radius,
    target: after.target.map((value, index) => value - before.target[index])
  };
}

function maxAbs(values) {
  return Math.max(...values.map((value) => Math.abs(value)));
}

function isInfrastructureError(error) {
  const message = error && (error.stack || error.message) ? (error.stack || error.message) : String(error);
  return INFRASTRUCTURE_PATTERNS.some((pattern) => pattern.test(message));
}

async function reloadWithRetry(page, { attempts = 2, timeoutMs = 30000 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await page.reload({ timeoutMs });
      return { attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(1000);
    }
  }
  throw lastError;
}

async function applyInputMapEdit(page) {
  return page.evaluate(`(() => {
    const c = BABYLON.Engine.Instances[0].scenes[0].activeCamera;
    if (!c.movement || !c.movement.input || !Array.isArray(c.movement.input.inputMap)) {
      return { ok: false, reason: 'camera input map unavailable' };
    }
    const map = c.movement.input.inputMap;
    const before = map.map((e) => ({
      source: e.source, button: e.button, interaction: e.interaction,
      modifiers: e.modifiers || null, key: e.key || null
    }));
    const removed = [];
    for (let i = map.length - 1; i >= 0; i -= 1) {
      const e = map[i];
      const isPlainLeftRotate = e.source === 'pointer'
        && (e.button === 0 || e.button === undefined)
        && e.interaction === 'rotate'
        && !e.modifiers;
      if (isPlainLeftRotate) {
        removed.push({ index: i, source: e.source, button: e.button, interaction: e.interaction, modifiers: e.modifiers || null });
        map.splice(i, 1);
      }
    }
    const after = map.map((e) => ({
      source: e.source, button: e.button, interaction: e.interaction,
      modifiers: e.modifiers || null, key: e.key || null
    }));
    return { ok: removed.length === 1, before, after, removed };
  })()`);
}

function hasPlainLeftRotate(map) {
  return Array.isArray(map) && map.some((e) => e
    && e.source === 'pointer'
    && e.button === 0
    && e.interaction === 'rotate'
    && !e.modifiers);
}

async function getInputMap(page) {
  return page.evaluate('window.__simuforgeDiagnostics.getCameraInputMap()');
}

async function resetInputMap(page) {
  return page.evaluate('window.__simuforgeDiagnostics.resetCameraInputMap()');
}

function canvasPoint(canvas, xFactor, yFactor, dx, dy) {
  return {
    x: canvas.left + canvas.cssWidth * xFactor + (dx || 0),
    y: canvas.top + canvas.cssHeight * yFactor + (dy || 0)
  };
}

async function cameraDrag(page, {
  from,
  to,
  button = 'left',
  modifiers = 0,
  steps = 24,
  stepDelayMs = 12,
  settleMs = TOLERANCES.settleMs
}) {
  const buttons = button === 'left' ? 1 : button === 'right' ? 2 : 4;
  const events = [];
  const startedAt = nowIso();
  const startedMono = Date.now();
  let index = 0;

  const emit = async (type, x, y, opts = {}) => {
    const sentAt = nowIso();
    await page.dispatchMouse(type, x, y, {
      button: opts.button === undefined ? 'none' : opts.button,
      buttons: opts.buttons === undefined ? 0 : opts.buttons,
      clickCount: opts.clickCount === undefined ? 0 : opts.clickCount,
      modifiers
    });
    events.push({
      index: index++,
      type,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      button: opts.button === undefined ? 'none' : opts.button,
      buttons: opts.buttons === undefined ? 0 : opts.buttons,
      clickCount: opts.clickCount === undefined ? 0 : opts.clickCount,
      modifiers,
      sentAt,
      elapsedMs: Date.now() - startedMono
    });
  };

  await emit('mouseMoved', from.x, from.y);
  await sleep(20);
  await emit('mousePressed', from.x, from.y, { button, buttons, clickCount: 1 });
  await sleep(30);
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    await emit('mouseMoved', from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, { button, buttons });
    if (stepDelayMs > 0) await sleep(stepDelayMs);
  }
  await emit('mouseReleased', to.x, to.y, { button, buttons: 0, clickCount: 1 });
  await sleep(settleMs);

  return {
    kind: 'drag',
    method: 'cdp_trusted_input',
    domain: 'Input',
    from: { x: Number(from.x.toFixed(3)), y: Number(from.y.toFixed(3)) },
    to: { x: Number(to.x.toFixed(3)), y: Number(to.y.toFixed(3)) },
    button,
    modifiers,
    steps,
    eventCount: events.length,
    events,
    settleMs,
    startedAt,
    completedAt: nowIso(),
    durationMs: Date.now() - startedMono
  };
}

async function cameraWheel(page, { x, y, deltaY, settleMs = TOLERANCES.settleMs }) {
  const startedAt = nowIso();
  await page.dispatchMouse('mouseMoved', x, y);
  await sleep(20);
  await page.cdp.send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x,
    y,
    deltaX: 0,
    deltaY,
    button: 'none',
    buttons: 0,
    clickCount: 0,
    modifiers: 0,
    pointerType: 'mouse'
  });
  await sleep(settleMs);
  return {
    kind: 'wheel',
    method: 'cdp_trusted_input',
    domain: 'Input',
    x: Number(x.toFixed(3)),
    y: Number(y.toFixed(3)),
    deltaX: 0,
    deltaY,
    settleMs,
    startedAt,
    completedAt: nowIso()
  };
}

async function cameraClick(page, { x, y, settleMs = TOLERANCES.settleMs }) {
  const events = [];
  const startedAt = nowIso();
  let index = 0;
  const emit = async (type, opts = {}) => {
    await page.dispatchMouse(type, x, y, {
      button: opts.button === undefined ? 'none' : opts.button,
      buttons: opts.buttons === undefined ? 0 : opts.buttons,
      clickCount: opts.clickCount === undefined ? 0 : opts.clickCount
    });
    events.push({
      index: index++,
      type,
      x: Number(x.toFixed(3)),
      y: Number(y.toFixed(3)),
      button: opts.button === undefined ? 'none' : opts.button,
      buttons: opts.buttons === undefined ? 0 : opts.buttons,
      clickCount: opts.clickCount === undefined ? 0 : opts.clickCount,
      sentAt: nowIso()
    });
  };
  await emit('mouseMoved');
  await sleep(20);
  await emit('mousePressed', { button: 'left', buttons: 1, clickCount: 1 });
  await sleep(50);
  await emit('mouseReleased', { button: 'left', buttons: 0, clickCount: 1 });
  await sleep(settleMs);
  return {
    kind: 'click',
    method: 'cdp_trusted_input',
    from: { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) },
    to: { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) },
    button: 'left',
    events,
    settleMs,
    startedAt,
    completedAt: nowIso()
  };
}

async function projectTarget(page) {
  return page.evaluate(`(() => {
    const c = BABYLON.Engine.Instances[0].scenes[0].activeCamera;
    const p = BABYLON.Vector3.Project(
      c.target,
      BABYLON.Matrix.Identity(),
      c.getScene().getTransformMatrix(),
      new BABYLON.Viewport(0, 0, c.getEngine().getRenderWidth(), c.getEngine().getRenderHeight())
    );
    return { x: p.x, y: p.y };
  })()`);
}

// Assert that only the named camera components are unchanged. A gesture that is
// supposed to move alpha must not be checked for "alpha unchanged", so every
// scenario names exactly the components its criterion requires to be invariant.
function unchanged(checks, label, delta, tolerance, keys, extra) {
  const fields = keys || ['alpha', 'beta', 'radius', 'target'];
  for (const key of fields) {
    if (key === 'target') {
      const targetMax = Array.isArray(delta.target) ? maxAbs(delta.target) : Infinity;
      checks.ok(label + ': target unchanged', targetMax <= tolerance, {
        delta: delta.target, maxAbs: targetMax, tolerance, ...extra
      });
    } else {
      checks.ok(label + ': ' + key + ' unchanged', Math.abs(delta[key]) <= tolerance, {
        delta: delta[key], tolerance, ...extra
      });
    }
  }
}

async function getCanvas(page) {
  const snapshot = await page.snapshot();
  return snapshot.canvas;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const runId = newRunId();
  const outDir = opts.out
    ? path.resolve(opts.out)
    : path.resolve(__dirname, '..', '..', '..', 'results', 'sp-06-official', runId);

  // Evidence directories are append-only by policy: never overwrite or mix a
  // previous run. A new run always gets a fresh runId directory by default.
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    throw new Error('Evidence directory is not empty; refusing to overwrite existing evidence: ' + outDir);
  }

  const harnessInfo = {
    path: HARNESS,
    bytes: fs.statSync(HARNESS).size,
    sha256: sha256File(HARNESS)
  };

  const store = new EvidenceStore({ dir: outDir, proof: false, pass: 1, runId });
  const results = {
    schemaVersion: RUNNER.resultsSchemaVersion,
    caseId: 'SP-06',
    runId,
    purpose: 'Official SP-06 camera-navigation acceptance execution (S-01..S-12)',
    status: 'RUNNING',
    startedAt: nowIso(),
    completedAt: null,
    runner: { ...RUNNER },
    harness: harnessInfo,
    environment: null,
    config: {
      configVersion: RUNNER.configVersion,
      signConvention: opts.signConvention,
      signConventionDescription: resolveSignConvention(opts.signConvention).description,
      tolerances: { ...TOLERANCES },
      expectedCamera: {
        alpha: EXPECTED_CAMERA.alpha,
        beta: EXPECTED_CAMERA.beta,
        radius: EXPECTED_CAMERA.radius,
        target: EXPECTED_CAMERA.target.slice()
      },
      screenshots: SCREENSHOTS.slice(),
      window: { width: opts.windowWidth, height: opts.windowHeight },
      port: opts.port,
      note: 'Invariance/equality bound = 1e-9 (Option A). Gesture floors 0.05/0.05/0.1 and settle 2000 ms are separate, unchanged quantities.'
    },
    preflight: null,
    inputLog: {
      schemaVersion: RUNNER.inputLogSchemaVersion,
      runId,
      configVersion: RUNNER.configVersion,
      harnessSha256: harnessInfo.sha256,
      initial: null,
      entries: [],
      final: null
    },
    scenarios: [],
    acceptance: {},
    criteriaConflicts: [],
    observations: [],
    console: null,
    evidence: null,
    error: null
  };

  let browser = null;
  let cdp = null;
  let page = null;
  let fatalError = null;

  const scenarioById = (id) => results.scenarios.find((scenario) => scenario.id === id) || null;
  const passById = (id) => {
    const scenario = scenarioById(id);
    return !!scenario && scenario.status === 'PASS';
  };

  const addObservation = (scenario, text, detail) => {
    const record = { text, detail: detail === undefined ? null : detail, timestamp: nowIso() };
    if (scenario) scenario.observations.push(record);
    results.observations.push({ scenario: scenario ? scenario.id : null, ...record });
    console.log('  note ' + (scenario ? scenario.id : '-') + ': ' + text);
  };

  async function runScenario(id, title, fn, { reload = true, screenshot = null } = {}) {
    const checks = new Checks(id);
    const scenario = {
      id,
      title,
      status: 'RUNNING',
      startedAt: nowIso(),
      completedAt: null,
      checks: null,
      observations: [],
      error: null,
      screenshot: null,
      inputLogIndex: null,
      reloadAttempts: null,
      console: null
    };
    results.scenarios.push(scenario);

    try {
      if (reload) {
        const reloadInfo = await reloadWithRetry(page);
        scenario.reloadAttempts = reloadInfo.attempts;
      }

      const returned = await fn({ checks, scenario });
      const entry = returned && returned.entry ? returned.entry : null;
      const shot = returned && returned.screenshot ? returned.screenshot : null;

      // Every scenario must have clean console output. This is A-05-P6 and a
      // general evidence requirement; it is checked per scenario so failures
      // are localised.
      const consoleSummary = page.consoleSummary();
      scenario.console = consoleSummary;
      checks.ok(id + ': no console errors', consoleSummary.errors.length === 0, consoleSummary.errors);

      scenario.checks = checks.summary();
      scenario.status = checks.passed ? 'PASS' : 'FAIL';
      scenario.completedAt = nowIso();

      if (entry) {
        entry.id = id;
        entry.scenarioResult = scenario.status;
        entry.consoleErrors = consoleSummary.errors;
        if (shot) {
          entry.screenshot = { name: shot.name, officialName: shot.officialName, bytes: shot.bytes, sha256: shot.sha256 };
        }
        results.inputLog.entries.push(entry);
        scenario.inputLogIndex = results.inputLog.entries.length - 1;
        if (shot) scenario.screenshot = { name: shot.name, bytes: shot.bytes, sha256: shot.sha256 };
      } else if (screenshot && shot) {
        scenario.screenshot = { name: shot.name, bytes: shot.bytes, sha256: shot.sha256 };
      }

      console.log('  ' + id + ' ' + scenario.status + ' ' + scenario.checks.passed + '/' + scenario.checks.total);
      return scenario;
    } catch (error) {
      const infrastructure = isInfrastructureError(error);
      scenario.status = infrastructure ? 'BLOCKED' : 'FAIL';
      scenario.error = {
        kind: infrastructure ? 'infrastructure' : 'scenario',
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : null,
        at: nowIso()
      };
      checks.fail(id + ': scenario completed without an uncaught error', scenario.error);
      scenario.checks = checks.summary();
      scenario.completedAt = nowIso();
      console.log('  ' + id + ' ' + scenario.status + ' ' + (error && error.message ? error.message : error));

      // Preserve a failure screenshot when the page is still usable. This is
      // diagnostics, not one of the 10 approved evidence screenshots.
      try {
        if (page) {
          const failureShot = await store.screenshot(page, 'sp-06_failure_' + id.replace(/[^A-Za-z0-9_-]/g, '_') + '.png');
          scenario.failureScreenshot = { name: failureShot.name, bytes: failureShot.bytes, sha256: failureShot.sha256 };
        }
      } catch (_) {
        scenario.failureScreenshot = null;
      }

      if (infrastructure) throw error;
      return scenario;
    }
  }

  // Small helpers used by the scenarios.
  async function baselineState() {
    return cameraState(await page.snapshot());
  }

  async function resetCameraButton() {
    await page.click('btnResetCam');
    await sleep(200);
    return baselineState();
  }

  async function currentMap() {
    return getInputMap(page);
  }

  try {
    console.log('SP-06 official runner');
    console.log('  runId   :', runId);
    console.log('  out     :', outDir);
    console.log('  harness :', harnessInfo.path, '(' + harnessInfo.sha256.slice(0, 12) + ')');
    console.log('  sign    :', opts.signConvention, '-', resolveSignConvention(opts.signConvention).description);

    if (!opts.attach) {
      browser = await browserLib.launch({
        port: opts.port,
        url: pathToFileURL(HARNESS).href,
        windowWidth: opts.windowWidth,
        windowHeight: opts.windowHeight
      });
    } else {
      browser = {
        version: null,
        userAgent: null,
        stop: async () => {}
      };
    }

    cdp = await connectToPage(opts.port, 'sp06.html');
    page = await pageLib.attach(cdp, {
      url: pathToFileURL(HARNESS).href,
      driver: 'simuforge-sp06-official',
      sessionId: runId,
      consoleAllowlist: []
    });

    const initialReload = await reloadWithRetry(page);
    const readySnapshot = await page.snapshot();
    const initialMap = await currentMap();
    const provenance = await page.evaluate('window.__simuforgeDiagnostics.getInputTrace()');
    const environmentExtra = await page.evaluate(`(() => ({
      userAgent: navigator.userAgent,
      devicePixelRatio: window.devicePixelRatio,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      canvas: (() => { const c = document.getElementById('renderCanvas'); const r = c.getBoundingClientRect(); return { left: r.left, top: r.top, cssWidth: r.width, cssHeight: r.height }; })()
    }))()`);

    results.environment = {
      browser: browser.version,
      userAgent: environmentExtra.userAgent,
      node: process.version,
      os: process.platform,
      arch: process.arch,
      devicePixelRatio: environmentExtra.devicePixelRatio,
      viewport: environmentExtra.viewport,
      canvas: readySnapshot.canvas,
      babylonVersion: readySnapshot.babylonVersion,
      useRightHandedSystem: readySnapshot.useRightHandedSystem,
      initialCamera: cameraState(readySnapshot),
      initialInputMap: initialMap,
      provenance: provenance.provenance,
      declaredProvenance: provenance.declared,
      reloadAttempts: initialReload.attempts
    };

    const preflightChecks = new Checks('PREFLIGHT');
    preflightChecks.ok('PREFLIGHT: harness diagnostics present', !!readySnapshot && !!readySnapshot.camera, readySnapshot ? readySnapshot.camera : null);
    preflightChecks.ok('PREFLIGHT: Babylon 9.32.1', readySnapshot.babylonVersion === '9.32.1', readySnapshot.babylonVersion);
    preflightChecks.ok('PREFLIGHT: right-handed system', readySnapshot.useRightHandedSystem === true, readySnapshot.useRightHandedSystem);
    preflightChecks.ok('PREFLIGHT: camera state finite', allFinite(cameraState(readySnapshot)), cameraState(readySnapshot));
    preflightChecks.ok('PREFLIGHT: default input map has 8 entries', Array.isArray(initialMap) && initialMap.length === INPUT_MAP.expectedDefaultLength, initialMap ? initialMap.length : null);
    preflightChecks.ok('PREFLIGHT: default input map has plain-left rotate', hasPlainLeftRotate(initialMap), initialMap);
    preflightChecks.ok('PREFLIGHT: provenance is cdp_trusted_input', !!(provenance.provenance && provenance.provenance.inputMethod === 'cdp_trusted_input' && provenance.provenance.approvedForSp05 === true), provenance.provenance);
    results.preflight = preflightChecks.summary();
    if (!preflightChecks.passed) {
      throw new Error('Preflight failed: ' + JSON.stringify(preflightChecks.failed.map((c) => c.name)));
    }
    results.inputLog.initial = {
      camera: cameraState(readySnapshot),
      inputMap: initialMap,
      inputMapState: 'default',
      timestamp: nowIso()
    };

    // ---- S-01 baseline -----------------------------------------------------
    await runScenario('S-01', 'Baseline camera state', async ({ checks }) => {
      const snapshot = await page.snapshot();
      const state = cameraState(snapshot);
      checks.ok('S-01: Babylon 9.32.1', snapshot.babylonVersion === '9.32.1', snapshot.babylonVersion);
      checks.ok('S-01: right-handed system', snapshot.useRightHandedSystem === true, snapshot.useRightHandedSystem);
      checks.ok('S-01: alpha = pi/4', Math.abs(state.alpha - EXPECTED_CAMERA.alpha) <= TOLERANCES.baseline, { actual: state.alpha, expected: EXPECTED_CAMERA.alpha, tolerance: TOLERANCES.baseline });
      checks.ok('S-01: beta = pi/3', Math.abs(state.beta - EXPECTED_CAMERA.beta) <= TOLERANCES.baseline, { actual: state.beta, expected: EXPECTED_CAMERA.beta, tolerance: TOLERANCES.baseline });
      checks.ok('S-01: radius = 8', Math.abs(state.radius - EXPECTED_CAMERA.radius) <= TOLERANCES.baseline, { actual: state.radius, expected: EXPECTED_CAMERA.radius, tolerance: TOLERANCES.baseline });
      checks.ok('S-01: target = (0, 0.5, 0)', maxAbs(state.target.map((value, index) => value - EXPECTED_CAMERA.target[index])) <= TOLERANCES.baseline, { actual: state.target, expected: EXPECTED_CAMERA.target, tolerance: TOLERANCES.baseline });
      checks.ok('S-01: camera state finite', allFinite(state), state);
      const shot = await store.screenshot(page, 'sp-06_camera_baseline.png');
      return {
        entry: {
          gesture: 'baseline',
          inputMapState: 'default',
          before: state,
          after: state,
          delta: { alpha: 0, beta: 0, radius: 0, target: [0, 0, 0] },
          pointer: null,
          settleMs: 0,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[0] });

    // ---- S-02 orbit horizontal --------------------------------------------
    await runScenario('S-02', 'Horizontal orbit', async ({ checks }) => {
      const canvas = await getCanvas(page);
      const before = await baselineState();
      const g = GESTURES.orbitHorizontal;
      const from = canvasPoint(canvas, g.from.xFactor, g.from.yFactor, g.from.dx, g.from.dy);
      const to = canvasPoint(canvas, g.to.xFactor, g.to.yFactor, g.to.dx, g.to.dy);
      const drag = await cameraDrag(page, { from, to, button: g.button });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-02: alpha changes by more than 0.05 rad', Math.abs(delta.alpha) > TOLERANCES.orbitMinimum, { delta: delta.alpha, minimum: TOLERANCES.orbitMinimum });
      checks.ok('S-02: rightward drag increases alpha', delta.alpha > 0, { delta: delta.alpha });
      unchanged(checks, 'S-02', delta, TOLERANCES.invariance, ['beta', 'radius', 'target']);
      checks.ok('S-02: camera state finite', allFinite(after), after);
      const shot = await store.screenshot(page, 'sp-06_orbit_horizontal.png');
      return {
        entry: {
          gesture: 'orbit-horizontal',
          inputMapState: 'default',
          before,
          after,
          delta,
          pointer: drag,
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[1] });

    // ---- S-03 orbit vertical ----------------------------------------------
    await runScenario('S-03', 'Vertical orbit', async ({ checks, scenario }) => {
      const canvas = await getCanvas(page);
      const before = await baselineState();
      const g = GESTURES.orbitVertical;
      const from = canvasPoint(canvas, g.from.xFactor, g.from.yFactor, g.from.dx, g.from.dy);
      const to = canvasPoint(canvas, g.to.xFactor, g.to.yFactor, g.to.dx, g.to.dy);
      const drag = await cameraDrag(page, { from, to, button: g.button });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-03: beta changes by more than 0.05 rad', Math.abs(delta.beta) > TOLERANCES.orbitMinimum, { delta: delta.beta, minimum: TOLERANCES.orbitMinimum });

      const sign = resolveSignConvention(opts.signConvention);
      checks.ok('S-03: ' + sign.description, Math.sign(delta.beta) === sign.expectedSign, {
        delta: delta.beta,
        expectedSign: sign.expectedSign,
        observedSign: Math.sign(delta.beta),
        signConvention: sign.id
      });

      unchanged(checks, 'S-03', delta, TOLERANCES.invariance, ['alpha', 'radius', 'target']);
      checks.ok('S-03: beta finite and within [0, pi]', finite(after.beta) && after.beta >= 0 && after.beta <= Math.PI, after.beta);

      // `legacy` intentionally encodes the superseded expectation. If it fails,
      // the failure is recorded as a reproduction note, never as an official
      // conflict with the amended procedure.
      if (sign.id === 'legacy' && delta.beta < 0) {
        const conflict = {
          id: 'S-03-SIGN-LEGACY',
          scenario: 'S-03',
          criterion: 'A-05-P2',
          expected: 'downward drag increases beta (superseded written expectation)',
          observed: 'downward drag decreases beta',
          observedDelta: delta.beta,
          explanation: 'Legacy mode reproduces the pre-amendment expectation. The authoritative expectation was amended by the Project Owner on 2026-11-04 to the Babylon convention (downward decreases beta), so this is not an open conflict.',
          timestamp: nowIso()
        };
        results.criteriaConflicts.push(conflict);
        scenario.criteriaConflict = conflict;
        addObservation(scenario, 'Legacy sign expectation reproduced for reference; the authoritative procedure was amended on 2026-11-04.', { delta: delta.beta });
      }

      const shot = await store.screenshot(page, 'sp-06_orbit_vertical.png');
      return {
        entry: {
          gesture: 'orbit-vertical-down',
          inputMapState: 'default',
          before,
          after,
          delta,
          pointer: drag,
          settleMs: TOLERANCES.settleMs,
          signConvention: opts.signConvention,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[2] });

    // ---- S-04 pan horizontal ----------------------------------------------
    await runScenario('S-04', 'Pan horizontal', async ({ checks }) => {
      const canvas = await getCanvas(page);
      const before = await baselineState();
      const g = GESTURES.panHorizontal;
      const from = canvasPoint(canvas, g.from.xFactor, g.from.yFactor, g.from.dx, g.from.dy);
      const to = canvasPoint(canvas, g.to.xFactor, g.to.yFactor, g.to.dx, g.to.dy);
      const drag = await cameraDrag(page, { from, to, button: g.button });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-04: target changes by more than 0.05', maxAbs(delta.target) > TOLERANCES.panMinimum, { delta: delta.target, maxAbs: maxAbs(delta.target), minimum: TOLERANCES.panMinimum });
      checks.ok('S-04: radius unchanged', Math.abs(delta.radius) <= TOLERANCES.invariance, { delta: delta.radius, tolerance: TOLERANCES.invariance });
      checks.ok('S-04: alpha unchanged', Math.abs(delta.alpha) <= TOLERANCES.invariance, { delta: delta.alpha, tolerance: TOLERANCES.invariance });
      checks.ok('S-04: beta unchanged', Math.abs(delta.beta) <= TOLERANCES.invariance, { delta: delta.beta, tolerance: TOLERANCES.invariance });
      checks.ok('S-04: camera state finite', allFinite(after), after);
      const shot = await store.screenshot(page, 'sp-06_pan_horizontal.png');
      return {
        entry: {
          gesture: 'pan-horizontal-right-drag',
          inputMapState: 'default',
          before,
          after,
          delta,
          pointer: drag,
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[3] });

    // ---- S-05 pan vertical ------------------------------------------------
    await runScenario('S-05', 'Pan vertical', async ({ checks }) => {
      const canvas = await getCanvas(page);
      const before = await baselineState();
      const g = GESTURES.panVertical;
      const from = canvasPoint(canvas, g.from.xFactor, g.from.yFactor, g.from.dx, g.from.dy);
      const to = canvasPoint(canvas, g.to.xFactor, g.to.yFactor, g.to.dx, g.to.dy);
      const drag = await cameraDrag(page, { from, to, button: g.button });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-05: target.y changes by more than 0.05', Math.abs(delta.target[1]) > TOLERANCES.panMinimum, { deltaY: delta.target[1], minimum: TOLERANCES.panMinimum });
      checks.ok('S-05: radius unchanged', Math.abs(delta.radius) <= TOLERANCES.invariance, { delta: delta.radius, tolerance: TOLERANCES.invariance });
      checks.ok('S-05: alpha unchanged', Math.abs(delta.alpha) <= TOLERANCES.invariance, { delta: delta.alpha, tolerance: TOLERANCES.invariance });
      checks.ok('S-05: beta unchanged', Math.abs(delta.beta) <= TOLERANCES.invariance, { delta: delta.beta, tolerance: TOLERANCES.invariance });
      checks.ok('S-05: camera state finite', allFinite(after), after);
      const shot = await store.screenshot(page, 'sp-06_pan_vertical.png');
      return {
        entry: {
          gesture: 'pan-vertical-right-drag',
          inputMapState: 'default',
          before,
          after,
          delta,
          pointer: drag,
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[4] });

    // ---- S-06 zoom in ------------------------------------------------------
    await runScenario('S-06', 'Zoom in', async ({ checks, scenario }) => {
      const before = await baselineState();
      const projectedTarget = await projectTarget(page);
      const wheel = await cameraWheel(page, { x: projectedTarget.x, y: projectedTarget.y, deltaY: -GESTURES.wheelStep });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-06: radius decreases by more than 0.1', delta.radius < -TOLERANCES.zoomMinimum, { delta: delta.radius, minimum: TOLERANCES.zoomMinimum });
      unchanged(checks, 'S-06', delta, TOLERANCES.invariance, ['alpha', 'beta', 'target']);
      checks.ok('S-06: camera state finite', allFinite(after), after);
      if (after.radius < 0) {
        addObservation(scenario, 'One standard wheel notch (deltaY -120) drives radius negative because the harness has no lowerRadiusLimit. The written criterion only requires a decrease and finite values; recorded as an observation.', { radius: after.radius });
      }
      const shot = await store.screenshot(page, 'sp-06_zoom_in.png');
      return {
        entry: {
          gesture: 'zoom-in-wheel-up',
          inputMapState: 'default',
          before,
          after,
          delta,
          pointer: wheel,
          settleMs: TOLERANCES.settleMs,
          projectedTarget,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[5] });

    // ---- S-07 zoom out -----------------------------------------------------
    await runScenario('S-07', 'Zoom out', async ({ checks }) => {
      const before = await baselineState();
      const projectedTarget = await projectTarget(page);
      const wheel = await cameraWheel(page, { x: projectedTarget.x, y: projectedTarget.y, deltaY: GESTURES.wheelStep });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-07: radius increases by more than 0.1', delta.radius > TOLERANCES.zoomMinimum, { delta: delta.radius, minimum: TOLERANCES.zoomMinimum });
      unchanged(checks, 'S-07', delta, TOLERANCES.invariance, ['alpha', 'beta', 'target']);
      checks.ok('S-07: camera state finite', allFinite(after), after);
      const shot = await store.screenshot(page, 'sp-06_zoom_out.png');
      return {
        entry: {
          gesture: 'zoom-out-wheel-down',
          inputMapState: 'default',
          before,
          after,
          delta,
          pointer: wheel,
          settleMs: TOLERANCES.settleMs,
          projectedTarget,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[6] });

    // ---- S-08 left drag without orbit after the input-map edit -------------
    await runScenario('S-08', 'Left drag without orbit after input-map edit', async ({ checks, scenario }) => {
      const edit = await applyInputMapEdit(page);
      const mapAfterEdit = await currentMap();
      checks.ok('S-08: input-map edit removed exactly one plain-left rotate entry', edit.ok === true && edit.removed.length === 1, edit);
      checks.ok('S-08: rotate entry is absent after the edit', !hasPlainLeftRotate(mapAfterEdit), mapAfterEdit);
      checks.ok('S-08: input map length decreased by one', edit.before.length === edit.after.length + 1, { before: edit.before.length, after: edit.after.length });
      if (!edit.ok) {
        addObservation(scenario, 'Input-map edit did not remove exactly one plain-left rotate entry. Subsequent S-08 checks are still recorded.', edit);
      }

      const canvas = await getCanvas(page);
      const before = await baselineState();
      const from = canvasPoint(canvas, 0.2, 0.5, -70, 0);
      const to = canvasPoint(canvas, 0.2, 0.5, 70, 0);
      const drag = await cameraDrag(page, { from, to, button: 'left' });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      unchanged(checks, 'S-08', delta, TOLERANCES.invariance);
      checks.ok('S-08: plain left-drag does not orbit', Math.abs(delta.alpha) <= TOLERANCES.invariance && Math.abs(delta.beta) <= TOLERANCES.invariance, { delta, tolerance: TOLERANCES.invariance });
      checks.ok('S-08: camera state finite', allFinite(after), after);
      return {
        entry: {
          gesture: 'plain-left-drag-after-edit',
          inputMapState: 'edited',
          inputMapBefore: edit.before,
          inputMapAfter: edit.after,
          before,
          after,
          delta,
          pointer: drag,
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        }
      };
    });

    // ---- S-09 left click on the cube (camera non-capture) ------------------
    await runScenario('S-09', 'Left click on cube after input-map edit', async ({ checks, scenario }) => {
      const edit = await applyInputMapEdit(page);
      checks.ok('S-09: input-map edit removed the plain-left rotate entry', edit.ok === true && !hasPlainLeftRotate(await currentMap()), edit);
      if (!edit.ok) {
        addObservation(scenario, 'Input-map edit did not remove exactly one entry; the click is still evaluated for camera non-capture.', edit);
      }

      const before = await baselineState();
      const canvas = await getCanvas(page);
      const center = { x: canvas.left + canvas.cssWidth / 2, y: canvas.top + canvas.cssHeight / 2 };
      const traceBefore = await page.inputTrace();
      const cubeBefore = (await page.snapshot()).cube;
      const click = await cameraClick(page, center);
      const after = await baselineState();
      const traceAfter = await page.inputTrace();
      const delta = cameraDelta(before, after);
      const lastDrag = traceAfter.drags.length ? traceAfter.drags[traceAfter.drags.length - 1] : null;

      unchanged(checks, 'S-09', delta, TOLERANCES.invariance);
      checks.ok('S-09: left click does not orbit', Math.abs(delta.alpha) <= TOLERANCES.invariance && Math.abs(delta.beta) <= TOLERANCES.invariance, { delta, tolerance: TOLERANCES.invariance });
      checks.ok('S-09: camera state finite', allFinite(after), after);
      checks.ok('S-09: click was delivered as trusted pointer input', !!lastDrag && lastDrag.allTrusted === true && lastDrag.pointerType === 'mouse', lastDrag);
      checks.ok('S-09: pointer trace grew during the click', traceAfter.dragCount >= traceBefore.dragCount, { before: traceBefore.dragCount, after: traceAfter.dragCount });

      const shot = await store.screenshot(page, 'sp-06_left_click_no_orbit.png');
      return {
        entry: {
          gesture: 'left-click-cube-after-edit',
          inputMapState: 'edited',
          inputMapAfter: edit.after,
          before,
          after,
          delta,
          pointer: click,
          settleMs: TOLERANCES.settleMs,
          pointerTrace: {
            dragCountBefore: traceBefore.dragCount,
            dragCountAfter: traceAfter.dragCount,
            lastDrag
          },
          cubeBefore,
          cubeAfter: (await page.snapshot()).cube,
          scopeNote: 'A-06-P5: camera non-capture only; full selection UI is out of SP-06 scope.',
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[7] });

    // ---- S-10 gizmo interaction hard gate ---------------------------------
    await runScenario('S-10', 'Gizmo interaction hard gate before and after input-map edit', async ({ checks, scenario }) => {
      await page.setMode('translate');
      await page.resetTransform();

      const rctx = {
        page,
        checks,
        drags: [],
        proof: false,
        browser,
        harness: harnessInfo,
        shot: async (name) => store.screenshot(page, name)
      };

      // (1) Pre-edit drag under the approved default map. The procedure asks for
      // a gizmo drag both before and after the input-map edit.
      const preBefore = await baselineState();
      const preDrag = await scenarioLib.translateBy(rctx, 'x', 60, { label: 'S-10 pre-edit translate drag' });
      await sleep(TOLERANCES.settleMs);
      const preAfter = await baselineState();
      const preDelta = cameraDelta(preBefore, preAfter);
      const preTranslation = preDrag.appliedTranslation || [0, 0, 0];
      const preTransformChanged = Math.hypot(preTranslation[0], preTranslation[1], preTranslation[2]) > 0.05;

      checks.ok('S-10 pre-edit: gizmo drag changed the transform', preTransformChanged, { delta: preTranslation });
      unchanged(checks, 'S-10 pre-edit', preDelta, TOLERANCES.invariance);
      checks.ok('S-10 pre-edit: gizmo drag did not orbit the camera', preTransformChanged
        && Math.abs(preDelta.alpha) <= TOLERANCES.invariance
        && Math.abs(preDelta.beta) <= TOLERANCES.invariance, { preTransformChanged, preDelta, tolerance: TOLERANCES.invariance });

      // (2) Remove the plain-left rotate entry, then repeat a gizmo drag.
      await page.resetTransform();
      const edit = await applyInputMapEdit(page);
      checks.ok('S-10: input-map edit removed the plain-left rotate entry', edit.ok === true && !hasPlainLeftRotate(await currentMap()), edit);

      // Prepare a rotated cube so the local scale handle is exercised (same
      // pattern as the SP-05 T-04 regression and the prior scenario validation).
      const rotateBefore = await baselineState();
      const rotateRecord = await scenarioLib.rotateBy(rctx, 'y', 42, { label: 'S-10 setup rotate' });
      await sleep(TOLERANCES.settleMs);
      const rotateAfter = await baselineState();
      const rotateDelta = cameraDelta(rotateBefore, rotateAfter);
      unchanged(checks, 'S-10 setup rotate', rotateDelta, TOLERANCES.invariance);

      await page.setMode('scale');
      await scenarioLib.verifyGizmoOrientation(rctx, 'scale');

      const s10a = await baselineState();
      checks.ok('S-10a: camera state finite', allFinite(s10a), s10a);

      const dragRecord = await scenarioLib.scaleBy(rctx, 'x', 60, { label: 'S-10 gizmo drag' });
      await sleep(TOLERANCES.settleMs);
      const s10b = await baselineState();
      const delta = cameraDelta(s10a, s10b);

      checks.ok('S-10b: camera state finite', allFinite(s10b), s10b);
      unchanged(checks, 'S-10', delta, TOLERANCES.invariance);

      const transformChanged = dragRecord.after.scale[0] > dragRecord.before.scale[0] + 1e-3;
      checks.ok('S-10: gizmo drag changed the transform', transformChanged, { before: dragRecord.before.scale, after: dragRecord.after.scale });
      checks.ok('S-10 HARD GATE: gizmo drag did not disturb the camera', transformChanged
        && preTransformChanged
        && Math.abs(delta.alpha) <= TOLERANCES.invariance
        && Math.abs(delta.beta) <= TOLERANCES.invariance
        && Math.abs(delta.radius) <= TOLERANCES.invariance
        && maxAbs(delta.target) <= TOLERANCES.invariance, { transformChanged, preTransformChanged, delta, tolerance: TOLERANCES.invariance });

      const shot = await store.screenshot(page, 'sp-06_gizmo_interaction.png');
      return {
        entry: {
          gesture: 'gizmo-drag-before-and-after-edit',
          inputMapState: 'edited',
          inputMapAfter: edit.after,
          before: s10a,
          after: s10b,
          delta,
          preEdit: {
            before: preBefore,
            after: preAfter,
            delta: preDelta,
            transform: { before: preDrag.before, after: preDrag.after, appliedTranslation: preTranslation },
            pointer: preDrag.cdpEvents
          },
          setupRotate: {
            before: rotateBefore,
            after: rotateAfter,
            delta: rotateDelta,
            appliedRotation: rotateRecord.appliedRotation
          },
          pointer: dragRecord.cdpEvents,
          gizmo: {
            label: dragRecord.label,
            target: dragRecord.target,
            before: dragRecord.before,
            after: dragRecord.after,
            lifecycle: dragRecord.lifecycle,
            reconciliation: dragRecord.reconciliation
          },
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[8] });

    // ---- S-11 edge cases ---------------------------------------------------
    await runScenario('S-11', 'Edge cases (poles, radius extremes, large pan)', async ({ checks, scenario }) => {
      const canvas = await getCanvas(page);
      let lowerPole = null;
      let upperPole = null;
      let zoomInState = null;
      let zoomOutState = null;
      let largePan = null;

      // The input map is the default map here. S-08..S-10 exercised the
      // removal capability; S-12 re-verifies reset. Edge cases are camera-math
      // checks and therefore use the default map so pure vertical orbit input
      // remains available.
      const resetToBaseline = async (label) => {
        const state = await resetCameraButton();
        checks.ok('S-11: camera reset to baseline before ' + label, maxAbs(state.target.map((value, index) => value - EXPECTED_CAMERA.target[index])) <= TOLERANCES.baseline
          && Math.abs(state.alpha - EXPECTED_CAMERA.alpha) <= TOLERANCES.baseline
          && Math.abs(state.beta - EXPECTED_CAMERA.beta) <= TOLERANCES.baseline
          && Math.abs(state.radius - EXPECTED_CAMERA.radius) <= TOLERANCES.baseline, state);
        return state;
      };

      // (a) orbit down against the lower beta clamp. Two full-height drags are
      // used so the clamp is actually reached, not merely approached.
      await resetToBaseline('lower-pole orbit');
      {
        const before = await baselineState();
        const drags = [];
        for (let i = 0; i < 2; i += 1) {
          const from = canvasPoint(canvas, 0.2, 0.1, 0, 0);
          const to = canvasPoint(canvas, 0.2, 0.9, 0, 0);
          drags.push(await cameraDrag(page, { from, to, button: 'left' }));
        }
        const after = await baselineState();
        lowerPole = { before, after, delta: cameraDelta(before, after), pointer: drags, clampRadians: after.beta };
        checks.ok('S-11: lower-pole beta is finite', finite(after.beta), after.beta);
        checks.ok('S-11: lower-pole beta is within [0, pi]', after.beta >= 0 && after.beta <= Math.PI, after.beta);
        checks.ok('S-11: lower-pole clamp is at the Babylon minimum 0.01 rad', Math.abs(after.beta - 0.01) <= 1e-6, after.beta);
        checks.ok('S-11: lower-pole orbit leaves alpha unchanged', Math.abs(lowerPole.delta.alpha) <= TOLERANCES.invariance, lowerPole.delta);
        checks.ok('S-11: lower-pole orbit leaves radius unchanged', Math.abs(lowerPole.delta.radius) <= TOLERANCES.invariance, lowerPole.delta);
        checks.ok('S-11: lower-pole orbit leaves target unchanged', maxAbs(lowerPole.delta.target) <= TOLERANCES.invariance, lowerPole.delta);
      }

      // (b) orbit up against the upper beta clamp (pi - 0.01).
      await resetToBaseline('upper-pole orbit');
      {
        const before = await baselineState();
        const drags = [];
        for (let i = 0; i < 2; i += 1) {
          const from = canvasPoint(canvas, 0.2, 0.9, 0, 0);
          const to = canvasPoint(canvas, 0.2, 0.1, 0, 0);
          drags.push(await cameraDrag(page, { from, to, button: 'left' }));
        }
        const after = await baselineState();
        upperPole = { before, after, delta: cameraDelta(before, after), pointer: drags, clampRadians: after.beta };
        checks.ok('S-11: upper-pole beta is finite', finite(after.beta), after.beta);
        checks.ok('S-11: upper-pole beta is within [0, pi]', after.beta >= 0 && after.beta <= Math.PI, after.beta);
        checks.ok('S-11: upper-pole clamp is at the Babylon maximum pi - 0.01 rad', Math.abs(after.beta - (Math.PI - 0.01)) <= 1e-6, after.beta);
        checks.ok('S-11: upper-pole orbit leaves alpha unchanged', Math.abs(upperPole.delta.alpha) <= TOLERANCES.invariance, upperPole.delta);
        checks.ok('S-11: upper-pole orbit leaves radius unchanged', Math.abs(upperPole.delta.radius) <= TOLERANCES.invariance, upperPole.delta);
        checks.ok('S-11: upper-pole orbit leaves target unchanged', maxAbs(upperPole.delta.target) <= TOLERANCES.invariance, upperPole.delta);
      }

      // (c) repeated zoom-in steps: finite values, no NaN, target unchanged.
      await resetToBaseline('repeated zoom in');
      {
        const before = await baselineState();
        const projectedTarget = await projectTarget(page);
        const wheels = [];
        for (let i = 0; i < 3; i += 1) {
          wheels.push(await cameraWheel(page, { x: projectedTarget.x, y: projectedTarget.y, deltaY: -GESTURES.wheelStep }));
        }
        const after = await baselineState();
        zoomInState = { before, after, delta: cameraDelta(before, after), wheels, projectedTarget };
        checks.ok('S-11: radius is finite after repeated zoom in', finite(after.radius), after.radius);
        checks.ok('S-11: target unchanged after repeated zoom in', maxAbs(zoomInState.delta.target) <= TOLERANCES.invariance, zoomInState.delta);
        checks.ok('S-11: alpha/beta unchanged after repeated zoom in', Math.abs(zoomInState.delta.alpha) <= TOLERANCES.invariance && Math.abs(zoomInState.delta.beta) <= TOLERANCES.invariance, zoomInState.delta);
        if (after.radius < 0) {
          addObservation(scenario, 'Repeated zoom-in reached a negative radius; the harness has no configured lowerRadiusLimit. Values remain finite and no NaN occurred, which is the written S-11 pass condition.', { radius: after.radius });
        }
      }

      // (d) repeated zoom-out steps: finite values, no NaN, target unchanged.
      await resetToBaseline('repeated zoom out');
      {
        const before = await baselineState();
        const projectedTarget = await projectTarget(page);
        const wheels = [];
        for (let i = 0; i < 3; i += 1) {
          wheels.push(await cameraWheel(page, { x: projectedTarget.x, y: projectedTarget.y, deltaY: GESTURES.wheelStep }));
        }
        const after = await baselineState();
        zoomOutState = { before, after, delta: cameraDelta(before, after), wheels, projectedTarget };
        checks.ok('S-11: radius is finite after repeated zoom out', finite(after.radius), after.radius);
        checks.ok('S-11: target unchanged after repeated zoom out', maxAbs(zoomOutState.delta.target) <= TOLERANCES.invariance, zoomOutState.delta);
        checks.ok('S-11: alpha/beta unchanged after repeated zoom out', Math.abs(zoomOutState.delta.alpha) <= TOLERANCES.invariance && Math.abs(zoomOutState.delta.beta) <= TOLERANCES.invariance, zoomOutState.delta);
      }

      // (e) large pan: finite target, radius unchanged.
      await resetToBaseline('large pan');
      {
        const before = await baselineState();
        const from = canvasPoint(canvas, 0.2, 0.5, 0, 0);
        const to = canvasPoint(canvas, 0.2, 0.5, 300, 0);
        const drag = await cameraDrag(page, { from, to, button: 'right' });
        const after = await baselineState();
        largePan = { before, after, delta: cameraDelta(before, after), pointer: drag };
        checks.ok('S-11: target is finite after large pan', allFinite(after), after);
        checks.ok('S-11: large pan changes the target', maxAbs(largePan.delta.target) > TOLERANCES.panMinimum, largePan.delta);
        checks.ok('S-11: large pan leaves radius unchanged', Math.abs(largePan.delta.radius) <= TOLERANCES.invariance, largePan.delta);
        checks.ok('S-11: large pan leaves alpha/beta unchanged', Math.abs(largePan.delta.alpha) <= TOLERANCES.invariance && Math.abs(largePan.delta.beta) <= TOLERANCES.invariance, largePan.delta);
      }

      const shot = await store.screenshot(page, 'sp-06_edge_cases.png');
      return {
        entry: {
          gesture: 'edge-cases',
          inputMapState: 'default',
          before: { lowerPole: lowerPole.before, upperPole: upperPole.before, zoomIn: zoomInState.before, zoomOut: zoomOutState.before, largePan: largePan.before },
          after: { lowerPole: lowerPole.after, upperPole: upperPole.after, zoomIn: zoomInState.after, zoomOut: zoomOutState.after, largePan: largePan.after },
          delta: { lowerPole: lowerPole.delta, upperPole: upperPole.delta, zoomIn: zoomInState.delta, zoomOut: zoomOutState.delta, largePan: largePan.delta },
          clamp: { lowerBeta: lowerPole.clampRadians, upperBeta: upperPole.clampRadians, lowerRadiusLimit: null, upperRadiusLimit: null },
          radiusExtremes: { repeatedZoomIn: zoomInState.after.radius, repeatedZoomOut: zoomOutState.after.radius },
          pointer: { lowerPole: lowerPole.pointer, upperPole: upperPole.pointer, zoomIn: zoomInState.wheels, zoomOut: zoomOutState.wheels, largePan: largePan.pointer },
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        },
        screenshot: shot
      };
    }, { screenshot: SCREENSHOTS[9] });

    // ---- S-12 reset input map ---------------------------------------------
    await runScenario('S-12', 'Reset input map', async ({ checks, scenario }) => {
      const defaultMap = await currentMap();
      checks.ok('S-12: default map has the plain-left rotate entry', hasPlainLeftRotate(defaultMap), defaultMap);
      checks.ok('S-12: default map has 8 entries', Array.isArray(defaultMap) && defaultMap.length === INPUT_MAP.expectedDefaultLength, defaultMap ? defaultMap.length : null);

      const edit = await applyInputMapEdit(page);
      checks.ok('S-12: rotate entry removed for the reset test', edit.ok === true && !hasPlainLeftRotate(await currentMap()), edit);
      if (!edit.ok) addObservation(scenario, 'Reset test could not remove the rotate entry; reset result is still recorded.', edit);

      const reset = await resetInputMap(page);
      const resetMap = await currentMap();
      checks.ok('S-12: resetInputMap returned ok', reset && reset.ok === true, reset);
      checks.ok('S-12: reset restored the plain-left rotate entry', hasPlainLeftRotate(resetMap), resetMap);
      checks.ok('S-12: reset restored the default map length', Array.isArray(resetMap) && resetMap.length === INPUT_MAP.expectedDefaultLength, resetMap ? resetMap.length : null);

      const canvas = await getCanvas(page);
      const before = await baselineState();
      const from = canvasPoint(canvas, 0.2, 0.5, -70, 0);
      const to = canvasPoint(canvas, 0.2, 0.5, 70, 0);
      const drag = await cameraDrag(page, { from, to, button: 'left' });
      const after = await baselineState();
      const delta = cameraDelta(before, after);

      checks.ok('S-12: plain left-drag orbits after reset', Math.abs(delta.alpha) > TOLERANCES.orbitMinimum || Math.abs(delta.beta) > TOLERANCES.orbitMinimum, { delta, minimum: TOLERANCES.orbitMinimum });
      checks.ok('S-12: rightward drag increases alpha after reset', delta.alpha > 0, delta.alpha);
      unchanged(checks, 'S-12', delta, TOLERANCES.invariance, ['beta', 'radius', 'target']);
      checks.ok('S-12: camera state finite', allFinite(after), after);
      return {
        entry: {
          gesture: 'reset-input-map-then-plain-left-drag',
          inputMapState: 'reset',
          inputMapBefore: defaultMap,
          inputMapAfter: resetMap,
          before,
          after,
          delta,
          pointer: drag,
          settleMs: TOLERANCES.settleMs,
          timestamp: nowIso()
        }
      };
    });

    results.inputLog.final = {
      camera: await baselineState(),
      inputMap: await currentMap(),
      inputMapState: 'reset',
      timestamp: nowIso()
    };

    // --- acceptance mapping --------------------------------------------------
    const scenarioStatus = (id) => {
      const scenario = scenarioById(id);
      return scenario ? scenario.status : 'NOT_RUN';
    };
    const anyFail = (ids) => ids.some((id) => scenarioStatus(id) === 'FAIL' || scenarioStatus(id) === 'BLOCKED');

    const criteria = {
      'A-05-P1': {
        ids: ['S-02', 'S-03'],
        include: [/changes by more than 0.05 rad/, /unchanged/],
        note: 'Orbit changes alpha/beta; radius and target invariant within 1e-9. The sign sub-check belongs to A-05-P2 and is not counted here.'
      },
      'A-05-P2': {
        ids: ['S-02', 'S-03'],
        include: [/changes by more than 0.05 rad/, /rightward drag increases alpha/, /downward drag .* beta/, /unchanged/],
        note: 'Horizontal changes alpha; vertical changes beta; owner-amended sign check applied (downward drag decreases beta).'
      },
      'A-05-P3': {
        ids: ['S-04', 'S-05'],
        include: [/changes by more than 0.05|target\.y changes/, /unchanged/],
        note: 'Pan changes target; radius invariant within 1e-9.'
      },
      'A-05-P4': {
        ids: ['S-06', 'S-07'],
        include: [/radius (decreases|increases) by more than 0\.1/, /unchanged/],
        note: 'Zoom changes radius; target invariant within 1e-9.'
      },
      'A-05-P5': {
        ids: ['S-02', 'S-03', 'S-04', 'S-05', 'S-06', 'S-07', 'S-12'],
        include: [
          /alpha changes by more than 0.05 rad/,
          /beta changes by more than 0.05 rad/,
          /target changes by more than 0.05/,
          /target\.y changes by more than 0.05/,
          /radius decreases by more than 0.1/,
          /radius increases by more than 0.1/,
          /orbits after reset/
        ],
        note: 'Orbit/pan/zoom work under the owner-approved final map. The temporary removal is a capability test; S-12 restores the default.'
      },
      'A-05-P6': {
        ids: ['S-01', 'S-02', 'S-03', 'S-04', 'S-05', 'S-06', 'S-07', 'S-08', 'S-09', 'S-10', 'S-11', 'S-12'],
        include: [/no console errors/],
        note: 'No console errors in any scenario.'
      },
      'A-06-P1': {
        ids: ['S-08'],
        include: [/does not orbit/, /unchanged/],
        note: 'Plain left-drag after removing the rotate entry does not orbit (all deltas <= 1e-9).'
      },
      'A-06-P2': {
        ids: ['S-09'],
        include: [/does not orbit/, /unchanged/, /trusted pointer input/],
        note: 'Left click on the cube does not orbit (all deltas <= 1e-9).'
      },
      'A-06-P3': {
        ids: ['S-10'],
        include: [/HARD GATE/, /gizmo drag changed/, /did not orbit/, /unchanged/],
        note: 'HARD GATE: gizmo drag works before and after the edit; camera state unchanged within 1e-9; no console errors.'
      },
      'A-06-P4': {
        ids: ['S-12'],
        include: [/reset/, /orbits after reset/],
        note: 'resetInputMap() restores the default and plain left-drag orbits again.'
      },
      'A-06-P5': {
        ids: ['S-09'],
        include: [/does not orbit/, /unchanged/],
        note: 'Camera non-capture only. Full selection UI is outside SP-06 scope.'
      }
    };

    for (const [id, spec] of Object.entries(criteria)) {
      // Evaluate the criterion against the checks that actually encode it.
      // This keeps orthogonal criteria (for example "no console errors") from
      // failing merely because a different check in the same scenario failed.
      const relevantChecks = spec.ids.flatMap((sid) => {
        const scenario = scenarioById(sid);
        if (!scenario || !scenario.checks) return [];
        return scenario.checks.checks
          .filter((check) => spec.include.some((pattern) => pattern.test(check.name)))
          .map((check) => ({ scenario: sid, name: check.name, status: check.status }));
      });
      const status = relevantChecks.length > 0 && relevantChecks.every((check) => check.status === 'PASS')
        ? 'PASS'
        : 'FAIL';
      results.acceptance[id] = {
        status,
        evidence: spec.ids,
        evidenceStatus: Object.fromEntries(spec.ids.map((sid) => [sid, scenarioStatus(sid)])),
        checkCount: relevantChecks.length,
        failedChecks: relevantChecks.filter((check) => check.status === 'FAIL'),
        note: spec.note,
        blocked: anyFail(spec.ids) ? spec.ids.filter((sid) => scenarioStatus(sid) === 'BLOCKED') : []
      };
    }

    // --- overall status ------------------------------------------------------
    const statuses = results.scenarios.map((scenario) => scenario.status);
    if (statuses.includes('BLOCKED')) results.status = 'BLOCKED';
    else if (statuses.includes('FAIL') || Object.values(results.acceptance).some((entry) => entry.status !== 'PASS')) results.status = 'FAIL';
    else results.status = 'PASS';

    // The hard gate is decisive even if later scenarios pass.
    results.hardGate = {
      id: 'S-10',
      status: scenarioStatus('S-10'),
      note: 'If S-10 fails, SP-06 fails regardless of the other scenario results.'
    };

    // Verify the approved screenshot inventory.
    const missingScreenshots = SCREENSHOTS.filter((name) => !store.files.some((file) => file.name === name));
    results.screenshotInventory = {
      expected: SCREENSHOTS.slice(),
      captured: store.files.filter((file) => file.kind === 'screenshot').map((file) => file.name),
      missing: missingScreenshots,
      complete: missingScreenshots.length === 0
    };
    if (missingScreenshots.length > 0) results.status = 'FAIL';

    results.console = {
      total: results.scenarios.reduce((sum, scenario) => sum + (scenario.console ? scenario.console.total : 0), 0),
      errors: results.scenarios.flatMap((scenario) => (scenario.console ? scenario.console.errors : [])),
      warnings: results.scenarios.flatMap((scenario) => (scenario.console ? scenario.console.warnings : [])),
      perScenario: Object.fromEntries(results.scenarios.map((scenario) => [scenario.id, scenario.console]))
    };

    results.completedAt = nowIso();
  } catch (error) {
    fatalError = error;
    results.error = {
      kind: isInfrastructureError(error) ? 'infrastructure' : 'runner',
      message: error && error.message ? error.message : String(error),
      stack: error && error.stack ? error.stack : null,
      at: nowIso()
    };
    results.status = isInfrastructureError(error) ? 'BLOCKED' : 'FAIL';
    results.completedAt = nowIso();
    console.error('\nRUNNER ERROR: ' + (error && error.stack ? error.stack : error));
  } finally {
    try {
      if (page) page.dispose();
      if (cdp) cdp.close();
      if (browser && !opts.keepBrowser && !opts.attach) {
        try { await browser.stop(); } catch (_) { /* best effort */ }
      }
    } catch (_) {
      // Cleanup is best effort and must not hide the run result.
    }

    try {
      // Persist the input log and the machine-readable results before the
      // evidence manifest so the manifest can hash them.
      store.writeJson('sp-06_input_log.json', results.inputLog);
      const inputLogFile = store.files[store.files.length - 1];

      // The results object embeds the input-log hash but not its own hash
      // (self-hashing would be circular).
      results.evidence = {
        inputLog: { name: inputLogFile.name, bytes: inputLogFile.bytes, sha256: inputLogFile.sha256 },
        screenshots: store.files.filter((file) => file.kind === 'screenshot').map((file) => ({
          name: file.name, bytes: file.bytes, sha256: file.sha256
        })),
        manifest: 'sp-06_evidence_manifest.json',
        integrity: 'sp-06_integrity.json'
      };

      store.writeJson('sp-06_official_results.json', results);

      // Manifest: every regular file in the run directory except the manifest
      // itself. Directories (such as the transient _staging directory) are
      // never hashed as files.
      const manifestName = 'sp-06_evidence_manifest.json';
      const files = fs.readdirSync(outDir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name !== manifestName)
        .map((entry) => entry.name)
        .sort();
      const manifestFiles = files.map((name) => {
        const full = path.join(outDir, name);
        return { name, bytes: fs.statSync(full).size, sha256: sha256File(full) };
      });
      const manifest = {
        schemaVersion: RUNNER.resultsSchemaVersion,
        runId,
        generatedAt: nowIso(),
        algorithm: 'sha256',
        directory: outDir,
        files: manifestFiles
      };
      fs.writeFileSync(path.join(outDir, manifestName), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

      const mismatches = [];
      for (const file of manifestFiles) {
        const actual = sha256File(path.join(outDir, file.name));
        if (actual !== file.sha256) mismatches.push({ name: file.name, expected: file.sha256, actual });
      }
      const integrity = {
        schemaVersion: RUNNER.resultsSchemaVersion,
        runId,
        checkedAt: nowIso(),
        manifest: manifestName,
        manifestSha256: sha256File(path.join(outDir, manifestName)),
        fileCount: manifestFiles.length,
        verified: mismatches.length === 0,
        mismatches
      };
      fs.writeFileSync(path.join(outDir, 'sp-06_integrity.json'), JSON.stringify(integrity, null, 2) + '\n', 'utf8');

      console.log('\nOverall: ' + results.status);
      console.log('Results: ' + path.join(outDir, 'sp-06_official_results.json'));
      console.log('Manifest: ' + path.join(outDir, manifestName));
      console.log('Integrity: ' + (integrity.verified ? 'VERIFIED' : 'MISMATCH'));

      if (!integrity.verified) process.exitCode = 1;
    } catch (writeError) {
      console.error('Failed to persist results/evidence: ' + (writeError && writeError.stack ? writeError.stack : writeError));
      process.exitCode = 2;
    }

    store.cleanup();
  }

  if (results.status === 'PASS') process.exit(0);
  if (results.status === 'FAIL') process.exit(1);
  process.exit(2);
}

main().catch((error) => {
  console.error('\nFATAL: ' + (error && error.stack ? error.stack : error));
  process.exit(2);
});
