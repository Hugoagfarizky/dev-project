'use strict';

// Official SP-07 quaternion / transform conversion runner.
//
// Executes the SP-07 procedure against the real Babylon.js 9.32.1 engine in
// Google Chrome, records a numeric log and machine-readable results, and
// verifies SHA-256 integrity. No acceptance criterion is decided by the
// harness; all PASS/FAIL decisions are made here from the measured values.

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

const { TOLERANCES, RUNNER, SCREENSHOTS } = config;

const HARNESS = path.resolve(__dirname, '..', '..', 'sp07.html');
const DEFAULT_PORT = 9247;
const Q_TOL = TOLERANCES.quaternionComponent;
const V_TOL = TOLERANCES.vectorComponent;
const LEN_TOL = TOLERANCES.quaternionLength;
const ANG_TOL = TOLERANCES.angleDegrees;
const GIMBAL_COMP = TOLERANCES.gimbalComponent;
const GIMBAL_DEG = TOLERANCES.gimbalDegrees;

function parseArgs(argv) {
  const opts = {
    port: DEFAULT_PORT,
    out: null,
    windowWidth: 1400,
    windowHeight: 1000,
    keepBrowser: false,
    attach: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { const v = argv[++i]; if (v === undefined) throw new Error(a + ' requires a value'); return v; };
    if (a === '--port') opts.port = Number(next());
    else if (a === '--out') opts.out = next();
    else if (a === '--window-size') {
      const [w, h] = next().split('x').map(Number);
      opts.windowWidth = w; opts.windowHeight = h;
    } else if (a === '--keep-browser') opts.keepBrowser = true;
    else if (a === '--attach') opts.attach = true;
    else if (a === '--help' || a === '-h') {
      console.log('SP-07 official runner');
      console.log('  --port <n>            CDP port (default 9247)');
      console.log('  --out <dir>           evidence directory');
      console.log('  --window-size WxH     default 1400x1000');
      console.log('  --keep-browser        leave Chrome running');
      console.log('  --attach              attach to an existing Chrome');
      process.exit(0);
    } else {
      throw new Error('Unknown argument: ' + a);
    }
  }
  if (!Number.isInteger(opts.port) || opts.port <= 0) throw new Error('Invalid --port');
  if (!Number.isFinite(opts.windowWidth) || !Number.isFinite(opts.windowHeight)) throw new Error('Invalid --window-size; expected WxH');
  return opts;
}

function nowIso() { return new Date().toISOString(); }

function maxAbs(a) { return Math.max(...a.map((v) => Math.abs(v))); }

function maxAbs2(a, b) {
  return Math.max(...a.map((v, i) => Math.abs(v - b[i])));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const runId = 'sp07-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');
  const outDir = opts.out
    ? path.resolve(opts.out)
    : path.resolve(__dirname, '..', '..', '..', 'results', 'sp-07', runId);

  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
    throw new Error('Evidence directory is not empty; refusing to overwrite existing evidence: ' + outDir);
  }

  const store = new EvidenceStore({ dir: outDir, proof: false, pass: 1, runId });
  const results = {
    schemaVersion: RUNNER.resultsSchemaVersion,
    caseId: 'SP-07',
    runId,
    purpose: 'Official SP-07 quaternion / transform conversion execution',
    status: 'RUNNING',
    startedAt: nowIso(),
    completedAt: null,
    runner: { ...RUNNER },
    harness: null,
    environment: null,
    config: {
      configVersion: RUNNER.configVersion,
      tolerances: { ...TOLERANCES },
      toleranceBasis: 'POC_01_WORLD_EDITOR.md E-12/E-15 (1e-6 per component; quaternion length within 1e-6 of 1).',
      screenshots: SCREENSHOTS.slice()
    },
    preflight: null,
    scenarios: [],
    acceptance: {},
    console: null,
    completedChecks: 0
  };

  const numericLog = {
    schemaVersion: RUNNER.numericLogSchemaVersion,
    runId,
    configVersion: RUNNER.configVersion,
    harnessSha256: null,
    tolerance: TOLERANCES.quaternionComponent,
    toleranceBasis: 'POC_01_WORLD_EDITOR.md E-12/E-15',
    environment: null,
    measurements: null
  };

  let browser = null;
  let cdp = null;
  let page = null;

  function scenarioRecord(id, title, checks) {
    const summary = checks.summary();
    const record = {
      id,
      title,
      status: summary.result,
      checks: summary,
      timestamp: nowIso()
    };
    results.scenarios.push(record);
    return record;
  }

  try {
    console.log('SP-07 official runner');
    console.log('  runId   :', runId);
    console.log('  out     :', outDir);

    if (!opts.attach) {
      browser = await browserLib.launch({
        port: opts.port,
        url: pathToFileURL(HARNESS).href,
        windowWidth: opts.windowWidth,
        windowHeight: opts.windowHeight
      });
    } else {
      browser = { version: null, userAgent: null, stop: async () => {} };
    }

    cdp = await connectToPage(opts.port, 'sp07.html');
    page = await pageLib.attach(cdp, {
      url: pathToFileURL(HARNESS).href,
      driver: 'simuforge-sp07-official',
      sessionId: runId,
      consoleAllowlist: []
    });

    // Reload from disk so the page runs with Runtime enabled and console captured.
    const loaded = cdp.waitForEvent('Page.loadEventFired', 30000).catch(() => null);
    await cdp.send('Page.reload', { ignoreCache: true });
    await loaded;

    const readyDeadline = Date.now() + 30000;
    let ready = false;
    while (Date.now() < readyDeadline) {
      ready = await cdp.evaluate('!!(window.__sp07Ready && window.__sp07Diagnostics)', { timeoutMs: 4000 });
      if (ready) break;
      await sleep(150);
    }
    if (!ready) throw new Error('Harness did not become ready within 30000 ms');

    await page.declareProvenance();

    const harnessInfo = {
      path: HARNESS,
      sha256: sha256File(HARNESS)
    };
    results.harness = harnessInfo;
    numericLog.harnessSha256 = harnessInfo.sha256;

    const env = await cdp.evaluate('window.__sp07Diagnostics.getEnvironment()');
    results.environment = {
      browser: browser.version,
      userAgent: browser.userAgent,
      node: process.version,
      babylonVersion: env.babylonVersion,
      useRightHandedSystem: env.useRightHandedSystem,
      engineWebGLVersion: env.engineWebGLVersion,
      canvas: env.canvas,
      timestamp: nowIso()
    };
    numericLog.environment = results.environment;

    // Preflight.
    const preflightChecks = new Checks('SP-07-PREFLIGHT');
    preflightChecks.ok('PREFLIGHT: Babylon 9.32.1', env.babylonVersion === '9.32.1', env.babylonVersion);
    preflightChecks.ok('PREFLIGHT: right-handed system', env.useRightHandedSystem === true, env.useRightHandedSystem);
    preflightChecks.ok('PREFLIGHT: diagnostics ready', !!env, env);
    results.preflight = preflightChecks.summary();
    if (!preflightChecks.passed) throw new Error('Preflight failed');

    console.log('  harness :', harnessInfo.path, '(' + harnessInfo.sha256.slice(0, 12) + ')');
    console.log('  babylon :', env.babylonVersion, 'rh=' + env.useRightHandedSystem);

    // Single measurement pass: all Babylon math runs in the page context.
    const measurementExpr = `(() => {
      const d = window.__sp07Diagnostics;
      const S45 = Math.sin(Math.PI/4);
      const C45 = Math.cos(Math.PI/4);
      const qPrimary = d.quatAxisAngle([0,1,0], Math.PI/2);
      const rotatedX = d.quatRotateVector(qPrimary, [1,0,0]);
      const eulerPrimary = d.quatToEuler(qPrimary);
      const backPrimary = d.quatYawPitchRoll(eulerPrimary[1], eulerPrimary[0], eulerPrimary[2]);
      const deltaPrimary = d.quatSignInsensitiveDelta(qPrimary, backPrimary);
      const anglePrimary = d.quatAngleDeg(qPrimary, backPrimary);
      const qLengthPrimary = d.quatLength(qPrimary);
      const qMatchesYaw90 = d.quatSignInsensitiveDelta(qPrimary, d.quatYawPitchRoll(Math.PI/2, 0, 0)) <= 1e-12;

      const roundTripCases = [
        ['identity', d.quatYawPitchRoll(0, 0, 0)],
        ['yaw45', d.quatYawPitchRoll(Math.PI/4, 0, 0)],
        ['yaw90', d.quatYawPitchRoll(Math.PI/2, 0, 0)],
        ['pitch30', d.quatYawPitchRoll(0, Math.PI/6, 0)],
        ['yaw45_pitch30', d.quatYawPitchRoll(Math.PI/4, Math.PI/6, 0)],
        ['yaw20_pitch35_roll10', d.quatYawPitchRoll(20*Math.PI/180, 35*Math.PI/180, 10*Math.PI/180)],
        ['yaw-60', d.quatYawPitchRoll(-Math.PI/3, 0, 0)],
        ['pitch-45', d.quatYawPitchRoll(0, -Math.PI/4, 0)],
        ['roll80', d.quatYawPitchRoll(0, 0, 80*Math.PI/180)],
        ['combined_12_-23_47', d.quatYawPitchRoll(12*Math.PI/180, -23*Math.PI/180, 47*Math.PI/180)]
      ].map(function (pair) {
        const name = pair[0]; const q = pair[1];
        const e = d.quatToEuler(q);
        const back = d.quatYawPitchRoll(e[1], e[0], e[2]);
        return {
          name: name,
          q: q,
          euler: e,
          back: back,
          delta: d.quatSignInsensitiveDelta(q, back),
          angleDeg: d.quatAngleDeg(q, back)
        };
      });

      const gimbalCases = [
        { yawDeg: 30, pitchDeg: 89.999, rollDeg: 20 },
        { yawDeg: 30, pitchDeg: 90, rollDeg: 20 },
        { yawDeg: 30, pitchDeg: -90, rollDeg: 20 },
        { yawDeg: 30, pitchDeg: -89.999, rollDeg: 20 },
        { yawDeg: 0, pitchDeg: 90, rollDeg: 0 },
        { yawDeg: 45, pitchDeg: 89.9999, rollDeg: -10 }
      ].map(function (c) {
        const q = d.quatYawPitchRoll(c.yawDeg*Math.PI/180, c.pitchDeg*Math.PI/180, c.rollDeg*Math.PI/180);
        const e = d.quatToEuler(q);
        const back = d.quatYawPitchRoll(e[1], e[0], e[2]);
        return {
          yawDeg: c.yawDeg,
          pitchDeg: c.pitchDeg,
          rollDeg: c.rollDeg,
          q: q,
          euler: e,
          back: back,
          delta: d.quatSignInsensitiveDelta(q, back),
          angleDeg: d.quatAngleDeg(q, back)
        };
      });

      const transformCases = [
        { name: 'identity_point', position: [0,0,0], rotation: d.quatYawPitchRoll(0,0,0), scale: [1,1,1], point: [1,0,0] },
        { name: 'yaw90_point', position: [0,0,0], rotation: qPrimary, scale: [1,1,1], point: [1,0,0] },
        { name: 'translated_scaled', position: [2,3,4], rotation: d.quatYawPitchRoll(Math.PI/4, Math.PI/6, 0), scale: [2,0.5,1.5], point: [1,0,0] },
        { name: 'roll_then_scale', position: [-1,0.5,2], rotation: d.quatYawPitchRoll(0,0,Math.PI/3), scale: [0.5,2,1], point: [0,1,0] }
      ].map(function (c) {
        const manualScale = [c.point[0]*c.scale[0], c.point[1]*c.scale[1], c.point[2]*c.scale[2]];
        const manualRot = d.quatRotateVector(c.rotation, manualScale);
        const manual = [manualRot[0]+c.position[0], manualRot[1]+c.position[1], manualRot[2]+c.position[2]];
        const actual = d.composeTRS(c.position, c.rotation, c.scale, c.point);
        return {
          name: c.name,
          position: c.position,
          rotation: c.rotation,
          scale: c.scale,
          point: c.point,
          expected: manual,
          actual: actual,
          delta: Math.max(Math.abs(actual[0]-manual[0]), Math.abs(actual[1]-manual[1]), Math.abs(actual[2]-manual[2]))
        };
      });

      const vectorConsistency = [
        { q: qPrimary, v: [1,0,0] },
        { q: d.quatYawPitchRoll(Math.PI/4, Math.PI/6, -Math.PI/8), v: [0.3, -0.7, 1.2] },
        { q: d.quatYawPitchRoll(0,0,0), v: [2, -1, 0.5] }
      ].map(function (c) {
        const viaMatrix = d.quatRotateVector(c.q, c.v);
        // Independent quaternion rotation using the shared rotateVector helper
        // is not available in-page; reuse the matrix path twice is identical,
        // so instead compare the matrix result against a manual quaternion
        // rotation computed here.
        const q = c.q;
        const v = c.v;
        const qv = [q[0], q[1], q[2]];
        const t = [2*(qv[1]*v[2]-qv[2]*v[1]), 2*(qv[2]*v[0]-qv[0]*v[2]), 2*(qv[0]*v[1]-qv[1]*v[0])];
        const cross = [qv[1]*t[2]-qv[2]*t[1], qv[2]*t[0]-qv[0]*t[2], qv[0]*t[1]-qv[1]*t[0]];
        const manual = [v[0]+q[3]*t[0]+cross[0], v[1]+q[3]*t[1]+cross[1], v[2]+q[3]*t[2]+cross[2]];
        const delta = Math.max(Math.abs(viaMatrix[0]-manual[0]), Math.abs(viaMatrix[1]-manual[1]), Math.abs(viaMatrix[2]-manual[2]));
        return { q: q, vector: v, viaMatrix: viaMatrix, manual: manual, delta: delta };
      });

      const validity = [qPrimary]
        .concat(roundTripCases.map(function (c) { return c.q; }))
        .concat(gimbalCases.map(function (c) { return c.q; }))
        .map(function (q) {
          return { q: q, length: d.quatLength(q), finite: q.every(function (x) { return Number.isFinite(x); }) };
        });

      return {
        environment: d.getEnvironment(),
        qPrimary: qPrimary,
        rotatedX: rotatedX,
        eulerPrimary: eulerPrimary,
        backPrimary: backPrimary,
        deltaPrimary: deltaPrimary,
        anglePrimary: anglePrimary,
        qLengthPrimary: qLengthPrimary,
        qMatchesYaw90: qMatchesYaw90,
        roundTripCases: roundTripCases,
        gimbalCases: gimbalCases,
        transformCases: transformCases,
        vectorConsistency: vectorConsistency,
        validity: validity
      };
    })()`;

    const data = await cdp.evaluate(measurementExpr, { timeoutMs: 60000 });
    numericLog.measurements = data;

    // ---- Q-01 : right-handed quaternion application (A-07) ----
    const q01 = new Checks('SP-07-Q01');
    const qPrimary = data.qPrimary;
    const rotatedX = data.rotatedX;
    q01.ok('Q-01: quaternion is finite', qPrimary.every((x) => Number.isFinite(x)), qPrimary);
    q01.ok('Q-01: quaternion length within 1e-9 of 1', Math.abs(data.qLengthPrimary - 1) <= 1e-9, { length: data.qLengthPrimary, tolerance: 1e-9 });
    q01.ok('Q-01: quaternion matches 90 deg yaw about +Y', data.qMatchesYaw90 === true, { delta: data.deltaPrimary });
    q01.vectorClose('Q-01: q applied to +X equals -Z (A-07)', rotatedX, [0, 0, -1], V_TOL);
    q01.ok('Q-01: +X rotates to -Z, not +Z', rotatedX[2] < -0.999999, rotatedX);
    scenarioRecord('Q-01', 'Right-handed quaternion application (A-07)', q01);

    // ---- Q-02 : Euler extraction (A-08) ----
    const q02 = new Checks('SP-07-Q02');
    const eP = data.eulerPrimary;
    q02.vectorClose('Q-02: toEulerAngles x (pitch) is 0', [eP[0]], [0], Q_TOL);
    q02.vectorClose('Q-02: toEulerAngles y (yaw) is pi/2 (A-08)', [eP[1]], [Math.PI / 2], Q_TOL);
    q02.vectorClose('Q-02: toEulerAngles z (roll) is 0', [eP[2]], [0], Q_TOL);
    q02.ok('Q-02: Euler components are finite', eP.every((x) => Number.isFinite(x)), eP);
    scenarioRecord('Q-02', 'Euler extraction consistency (A-08)', q02);

    // ---- Q-03 : round-trip conversion ----
    const q03 = new Checks('SP-07-Q03');
    for (const c of data.roundTripCases) {
      q03.ok('Q-03 round-trip: ' + c.name + ' component delta <= 1e-6',
        c.delta <= Q_TOL, { name: c.name, delta: c.delta, tolerance: Q_TOL });
      q03.ok('Q-03 round-trip: ' + c.name + ' angle <= 1e-4 deg',
        c.angleDeg <= ANG_TOL, { name: c.name, angleDeg: c.angleDeg, tolerance: ANG_TOL });
    }
    q03.ok('Q-03: all round-trip cases pass',
      data.roundTripCases.every((c) => c.delta <= Q_TOL && c.angleDeg <= ANG_TOL),
      { count: data.roundTripCases.length });
    scenarioRecord('Q-03', 'Quaternion/Euler round-trip conversion', q03);

    // ---- Q-04 : gimbal lock ----
    const q04 = new Checks('SP-07-Q04');
    for (const c of data.gimbalCases) {
      q04.ok('Q-04 gimbal: pitch ' + c.pitchDeg + ' deg orientation round-trips',
        c.delta <= GIMBAL_COMP && c.angleDeg <= GIMBAL_DEG,
        { pitchDeg: c.pitchDeg, yawDeg: c.yawDeg, rollDeg: c.rollDeg, delta: c.delta, angleDeg: c.angleDeg, euler: c.euler, tolerance: GIMBAL_COMP });
      q04.ok('Q-04 gimbal: pitch ' + c.pitchDeg + ' deg reports pitch magnitude pi/2',
        Math.abs(Math.abs(c.euler[0]) - Math.PI / 2) <= Q_TOL,
        { pitchDeg: c.pitchDeg, eulerPitch: c.euler[0], tolerance: Q_TOL });
    }
    q04.ok('Q-04: pitch near +90 deg reports finite Euler',
      data.gimbalCases.filter((c) => Math.abs(c.pitchDeg) >= 89.999).every((c) => c.euler.every((x) => Number.isFinite(x))),
      { count: data.gimbalCases.length });
    q04.ok('Q-04: all gimbal cases round-trip within gimbal tolerance',
      data.gimbalCases.every((c) => c.delta <= GIMBAL_COMP && c.angleDeg <= GIMBAL_DEG),
      { count: data.gimbalCases.length, tolerance: GIMBAL_COMP });
    scenarioRecord('Q-04', 'Gimbal-lock behaviour (pitch near +/-90 deg)', q04);

    // ---- Q-05 : transform composition (supporting) ----
    const q05 = new Checks('SP-07-Q05');
    for (const c of data.transformCases) {
      q05.ok('Q-05 transform: ' + c.name + ' composeTRS matches manual TRS',
        c.delta <= V_TOL, { name: c.name, delta: c.delta, tolerance: V_TOL });
    }
    for (const c of data.vectorConsistency) {
      q05.ok('Q-05 vector: matrix path matches manual quaternion rotation',
        c.delta <= V_TOL, { delta: c.delta, tolerance: V_TOL });
    }
    q05.ok('Q-05: all transform composition cases pass',
      data.transformCases.every((c) => c.delta <= V_TOL) && data.vectorConsistency.every((c) => c.delta <= V_TOL),
      { transformCount: data.transformCases.length, vectorCount: data.vectorConsistency.length });
    scenarioRecord('Q-05', 'TRS transform composition (supporting)', q05);

    // ---- Q-06 : quaternion validity ----
    const q06 = new Checks('SP-07-Q06');
    for (const v of data.validity) {
      q06.ok('Q-06 validity: finite components', v.finite, v);
      q06.ok('Q-06 validity: length within 1e-6 of 1', Math.abs(v.length - 1) <= LEN_TOL, { length: v.length, tolerance: LEN_TOL });
    }
    q06.ok('Q-06: all quaternions valid', data.validity.every((v) => v.finite && Math.abs(v.length - 1) <= LEN_TOL), { count: data.validity.length });
    scenarioRecord('Q-06', 'Quaternion validity (finite, unit length)', q06);

    // Acceptance mapping.
    const a07Pass = q01.passed;
    const a08Pass = q02.passed && q03.passed && q04.passed;

    results.acceptance['A-07'] = {
      status: a07Pass ? 'PASS' : 'FAIL',
      evidence: ['Q-01'],
      evidenceStatus: { 'Q-01': q01.passed ? 'PASS' : 'FAIL' },
      checkCount: q01.summary().total,
      failedChecks: q01.failed.map((c) => c.name),
      note: 'A quaternion authored directly in the right-handed scene rotates +X to -Z for a positive 90 deg Y rotation.'
    };
    results.acceptance['A-08'] = {
      status: a08Pass ? 'PASS' : 'FAIL',
      evidence: ['Q-02', 'Q-03', 'Q-04'],
      evidenceStatus: {
        'Q-02': q02.passed ? 'PASS' : 'FAIL',
        'Q-03': q03.passed ? 'PASS' : 'FAIL',
        'Q-04': q04.passed ? 'PASS' : 'FAIL'
      },
      checkCount: q02.summary().total + q03.summary().total + q04.summary().total,
      failedChecks: q02.failed.concat(q03.failed).concat(q04.failed).map((c) => c.name),
      note: 'quaternion.toEulerAngles() returns x=pitch, y=yaw, z=roll consistent with YXZ display; round-trip within 1e-6; gimbal-lock behaviour measured and documented.'
    };

    results.acceptance['SP-07-SUPPORTING'] = {
      status: (q05.passed && q06.passed) ? 'PASS' : 'FAIL',
      evidence: ['Q-05', 'Q-06'],
      evidenceStatus: { 'Q-05': q05.passed ? 'PASS' : 'FAIL', 'Q-06': q06.passed ? 'PASS' : 'FAIL' },
      checkCount: q05.summary().total + q06.summary().total,
      failedChecks: q05.failed.concat(q06.failed).map((c) => c.name),
      note: 'Supporting only: TRS composition consistency and quaternion validity. Not an A-07/A-08 criterion.'
    };

    results.completedChecks = results.scenarios.reduce((n, s) => n + s.checks.total, 0);

    // Capture one supporting screenshot.
    const shot = await store.screenshot(page, SCREENSHOTS[0]);

    // Console summary.
    const consoleSummary = page.consoleSummary();
    results.console = {
      total: consoleSummary.total,
      warnings: consoleSummary.warnings,
      errors: consoleSummary.errors,
      exceptions: page.exceptions.slice(),
      logEntries: page.logEntries.slice()
    };

    // Write numeric log.
    store.writeJson('sp-07_numeric_log.json', numericLog);

    // Write results.
    results.status = (a07Pass && a08Pass) ? 'PASS' : 'FAIL';
    results.completedAt = nowIso();
    store.writeJson('sp-07_results.json', results);

    // Manifest + integrity.
    const manifestName = 'sp-07_evidence_manifest.json';
    const files = fs.readdirSync(outDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name !== manifestName)
      .map((e) => e.name).sort();
    const manifestFiles = files.map((name) => {
      const full = path.join(outDir, name);
      return { name, bytes: fs.statSync(full).size, sha256: sha256File(full) };
    });
    const manifest = {
      runId,
      generatedAt: nowIso(),
      directory: outDir,
      files: manifestFiles
    };
    fs.writeFileSync(path.join(outDir, manifestName), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    const manifestRecord = store.register(manifestName, { kind: 'manifest' });

    // Integrity verification.
    let mismatches = 0;
    for (const f of manifestFiles) {
      const full = path.join(outDir, f.name);
      if (sha256File(full) !== f.sha256) mismatches += 1;
    }
    const integrity = {
      verified: mismatches === 0,
      fileCount: manifestFiles.length,
      mismatches: [],
      manifestSha256: sha256File(path.join(outDir, manifestName)),
      checkedAt: nowIso()
    };
    if (mismatches > 0) {
      // recompute mismatch list
      const bad = [];
      for (const f of manifestFiles) {
        const full = path.join(outDir, f.name);
        if (sha256File(full) !== f.sha256) bad.push(f.name);
      }
      integrity.mismatches = bad;
    }
    fs.writeFileSync(path.join(outDir, 'sp-07_integrity.json'), JSON.stringify(integrity, null, 2) + '\n', 'utf8');
    store.register('sp-07_integrity.json', { kind: 'integrity' });

    console.log('');
    for (const s of results.scenarios) {
      console.log('  ' + s.id + ' ' + s.status + ' ' + s.checks.passed + '/' + s.checks.total);
    }
    console.log('');
    console.log('  A-07 ' + results.acceptance['A-07'].status);
    console.log('  A-08 ' + results.acceptance['A-08'].status);
    console.log('  supporting ' + results.acceptance['SP-07-SUPPORTING'].status);
    console.log('');
    console.log('Overall: ' + results.status);
    console.log('Results: ' + path.join(outDir, 'sp-07_results.json'));
    console.log('Manifest: ' + path.join(outDir, manifestName));
    console.log('Integrity: ' + (integrity.verified ? 'VERIFIED' : 'FAILED'));

    store.cleanup();

    if (!opts.keepBrowser) {
      if (cdp) cdp.close();
      if (browser) await browser.stop();
    }

    process.exit(results.status === 'PASS' ? 0 : 1);
  } catch (error) {
    results.status = 'BLOCKED';
    results.completedAt = nowIso();
    try {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'sp-07_results.json'), JSON.stringify(results, null, 2) + '\n', 'utf8');
    } catch (_) {}
    console.error('FATAL:', error && error.stack ? error.stack : error);
    try { if (cdp) cdp.close(); } catch (_) {}
    try { if (browser && !opts.keepBrowser) await browser.stop(); } catch (_) {}
    try { store.cleanup(); } catch (_) {}
    process.exit(2);
  }
}

main();
