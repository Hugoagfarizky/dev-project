'use strict';

// SP-05 automated runner.
//
// Usage:
//   node run.js --cases proof --passes 2
//   node run.js --cases t01,t02,t04 --passes 1
//   node run.js --cases all --out <dir>          (full suite; not run yet)
//
// The runner owns Chrome, reloads the harness from disk for every case, and
// uses only CDP Input.dispatchMouseEvent for interaction. Assertion failures are
// recorded, never retried. Only transport/session failures are retried once.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { connectToPage, sleep, CdpError } = require('./lib/cdp');
const browserLib = require('./lib/browser');
const pageLib = require('./lib/page');
const gizmo = require('./lib/gizmo');
const { EvidenceStore } = require('./lib/evidence');
const { Checks } = require('./lib/assert');
const scenario = require('./lib/scenario');
const registry = require('./cases');

const RUNNER_VERSION = '1.0.0';
const DEFAULT_PORT = 9223;

function parseArgs(argv) {
  const options = {
    cases: 'proof',
    passes: 1,
    port: DEFAULT_PORT,
    out: null,
    attach: false,
    headed: true,
    stopOnFail: true,
    keepBrowser: false,
    windowWidth: 1400,
    windowHeight: 1000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(arg + ' requires a value');
      index += 1;
      return value;
    };
    switch (arg) {
      case '--cases': options.cases = next(); break;
      case '--passes': options.passes = Number(next()); break;
      case '--port': options.port = Number(next()); break;
      case '--out': options.out = next(); break;
      case '--attach': options.attach = true; break;
      case '--headless': options.headed = false; break;
      case '--continue-on-fail': options.stopOnFail = false; break;
      case '--keep-browser': options.keepBrowser = true; break;
      case '--window-size': {
        const [w, h] = next().split('x').map(Number);
        options.windowWidth = w;
        options.windowHeight = h;
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error('Unknown argument: ' + arg);
    }
  }
  if (!Number.isInteger(options.passes) || options.passes < 1) throw new Error('--passes must be an integer >= 1');
  if (!Number.isInteger(options.port) || options.port < 1) throw new Error('--port must be a valid port');
  return options;
}

function printHelp() {
  console.log([
    'SP-05 automated runner',
    '',
    '  --cases <selector>   proof | all | t01,t02,...   (default: proof)',
    '  --passes <n>         repetitions of each case   (default: 1)',
    '  --port <n>           CDP port for the owned Chrome instance (default: 9223)',
    '  --out <dir>          evidence directory',
    '  --attach             use an existing Chrome on --port instead of launching',
    '  --headless           accepted for completeness; visible Chrome is the evidence condition',
    '  --continue-on-fail   do not stop after the first failing case',
    '  --keep-browser       leave the launched Chrome running on exit',
    '  --window-size WxH    default 1400x1000'
  ].join('\n'));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function defaultOutDir(proof) {
  const base = path.resolve(__dirname, '..', '..', 'results');
  return path.join(base, 'sp-05-automated', proof ? 'proof' : 'full');
}

function isRecoverable(error) {
  if (!error) return false;
  const message = String(error.message || error);
  const patterns = [
    /WebSocket is closed/i,
    /WebSocket closed/i,
    /WebSocket (open|error)/i,
    /Timed out/i,
    /Target closed/i,
    /Session closed/i,
    /Execution context was destroyed/i,
    /Cannot find context/i,
    /Could not find object with given id/i,
    /Render frame was disposed/i,
    /Inspected target navigated or closed/i,
    /CDP endpoint/i,
    /ECONNREFUSED/i,
    /fetch failed/i
  ];
  return patterns.some((pattern) => pattern.test(message));
}

function validateExport(payload, checks) {
  const report = {
    harnessVersion: payload.harnessVersion || null,
    gizmoSpacePolicy: payload.gizmoSpacePolicy || null,
    declaredMethod: payload.provenancePolicy ? payload.provenancePolicy.declaredMethod : null,
    syntheticSeen: payload.inputTrace ? payload.inputTrace.syntheticSeen : null,
    entryCount: Array.isArray(payload.entries) ? payload.entries.length : 0,
    dragCount: payload.inputTrace && Array.isArray(payload.inputTrace.drags) ? payload.inputTrace.drags.length : 0,
    offenders: [],
    untrustedDrags: [],
    checkedAt: new Date().toISOString()
  };

  checks.ok('export: harnessVersion is 2.0', payload.harnessVersion === '2.0', report.harnessVersion);
  checks.ok(
    'export: gizmo space policy is world/world/local',
    !!(payload.gizmoSpacePolicy
      && payload.gizmoSpacePolicy.translate === 'world'
      && payload.gizmoSpacePolicy.rotate === 'world'
      && payload.gizmoSpacePolicy.scale === 'local'),
    report.gizmoSpacePolicy
  );
  checks.ok(
    'export: declared input method is cdp_trusted_input',
    report.declaredMethod === 'cdp_trusted_input',
    report.declaredMethod
  );
  checks.ok('export: no synthetic input observed', report.syntheticSeen === false, report.syntheticSeen);
  checks.ok('export: at least one entry was recorded', report.entryCount > 0, report.entryCount);

  if (Array.isArray(payload.entries)) {
    for (const entry of payload.entries) {
      const eligible = entry.inputMethod === 'cdp_trusted_input'
        && entry.sp05Eligible === true
        && entry.interactionManual === false
        && entry.interactionAutomated === true
        && entry.provenance
        && entry.provenance.approvedForSp05 === true
        && entry.provenance.syntheticSeen === false;
      if (!eligible) {
        report.offenders.push({
          testId: entry.testId,
          inputMethod: entry.inputMethod,
          sp05Eligible: entry.sp05Eligible,
          interactionManual: entry.interactionManual,
          interactionAutomated: entry.interactionAutomated,
          provenance: entry.provenance
        });
      }
    }
  }
  checks.ok(
    'export: every entry labels input as cdp_trusted_input and SP-05 eligible',
    report.offenders.length === 0,
    report.offenders
  );

  if (payload.inputTrace && Array.isArray(payload.inputTrace.drags)) {
    for (const drag of payload.inputTrace.drags) {
      if (drag.allTrusted !== true || drag.pointerType !== 'mouse') {
        report.untrustedDrags.push(drag);
      }
    }
  }
  checks.ok(
    'export: every harness-recorded drag is fully trusted mouse input',
    report.untrustedDrags.length === 0,
    report.untrustedDrags
  );

  if (payload.entries && payload.entries.length && report.dragCount > 0) {
    const last = payload.entries[payload.entries.length - 1];
    checks.ok(
      'export: last entry has a fully trusted drag record',
      !!(last.lastDrag && last.lastDrag.allTrusted === true && last.lastDrag.pointerType === 'mouse'),
      last.lastDrag
    );
  }

  return report;
}

async function runCaseOnce({ def, page, store, proof, pass, runId, browserInfo, harnessInfo, startedAt }) {
  const checks = new Checks(def.id);
  const ctx = {
    page,
    store,
    checks,
    proof,
    pass,
    caseDef: def,
    drags: [],
    observation: '',
    browser: browserInfo,
    harness: harnessInfo,
    shot: (officialName) => store.screenshot(page, officialName)
  };

  const filesBefore = store.files.length;
  const caseStarted = Date.now();
  let thrown = null;
  try {
    await def.run(ctx);
  } catch (error) {
    thrown = error;
    checks.fail('case execution: no uncaught error', { message: error.message, stack: error.stack });
  }

  let exportRecord = null;
  let exportPayload = null;
  let exportValidation = null;

  if (!thrown) {
    try {
      if (ctx.observation) await page.recordObservation(ctx.observation);
      await page.exportJson();
      exportRecord = await store.harnessExport(page, def.official.export);
      exportPayload = JSON.parse(fs.readFileSync(store.path(def.official.export), 'utf8'));
      exportValidation = validateExport(exportPayload, checks);
    } catch (error) {
      checks.fail('harness export captured and parsed', { message: error.message, stack: error.stack });
    }
  }

  const consoleSummary = page.consoleSummary();
  checks.ok(
    'no unexplained console errors',
    consoleSummary.errors.length === 0,
    consoleSummary.errors
  );

  let environment = null;
  try {
    environment = await scenario.environment(ctx);
  } catch (error) {
    checks.fail('environment snapshot captured', { message: error.message });
  }

  const summary = checks.summary();
  const artifacts = store.files.slice(filesBefore);
  const sidecar = {
    runner: { name: 'simuforge-sp05-cdp-runner', version: RUNNER_VERSION },
    case: { id: def.id, slug: def.slug, title: def.title, proofCase: def.proof === true },
    run: {
      runId,
      pass,
      proof,
      startedAt: new Date(startedAt).toISOString(),
      caseStartedAt: new Date(caseStarted).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - caseStarted
    },
    environment,
    result: summary.result,
    checks: summary,
    observation: ctx.observation,
    drags: ctx.drags,
    export: exportRecord,
    exportValidation,
    exportPayload,
    console: consoleSummary,
    artifacts,
    uncaughtError: thrown ? { message: thrown.message, stack: thrown.stack } : null
  };

  const auditRecord = store.writeJson(def.official.audit, sidecar);
  return { def, summary, sidecar, auditRecord, thrown };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runStartedAt = new Date().toISOString();
  const selected = registry.select(options.cases);
  const proof = options.cases === 'proof';
  const outDir = options.out ? path.resolve(options.out) : defaultOutDir(proof);
  const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex');

  const harnessPath = path.resolve(__dirname, '..', 'sp05.html');
  if (!fs.existsSync(harnessPath)) throw new Error('Harness not found at ' + harnessPath);
  const harnessInfo = {
    path: harnessPath,
    bytes: fs.statSync(harnessPath).size,
    sha256: sha256(harnessPath)
  };
  const url = pathToFileURL(harnessPath).href;

  console.log('SP-05 runner ' + RUNNER_VERSION);
  console.log('  runId   : ' + runId);
  console.log('  cases   : ' + selected.map((def) => def.id).join(', '));
  console.log('  passes  : ' + options.passes);
  console.log('  out     : ' + outDir);
  console.log('  harness : ' + harnessInfo.path + ' (' + harnessInfo.sha256.slice(0, 12) + ')');

  let browser = null;
  let cdp = null;
  let page = null;
  const results = [];
  const recoveries = [];
  let aborted = false;

  try {
    if (options.attach) {
      cdp = await connectToPage(options.port, 'sp05.html');
      browser = { version: 'attached', port: options.port, userAgent: null, stop: async () => {} };
    } else {
      browser = await browserLib.launch({
        port: options.port,
        url,
        windowWidth: options.windowWidth,
        windowHeight: options.windowHeight
      });
      cdp = await connectToPage(options.port, 'sp05.html');
    }
    page = await pageLib.attach(cdp, {
      url,
      driver: 'simuforge-sp05-cdp-runner',
      sessionId: runId,
      consoleAllowlist: []
    });
    await page.reload();
    console.log('  chrome  : ' + browser.version);

    for (let pass = 1; pass <= options.passes; pass += 1) {
      const store = new EvidenceStore({ dir: outDir, proof, pass, runId });
      for (const def of selected) {
        console.log('\n[' + def.id + '] pass ' + pass + '/' + options.passes + ' — ' + def.title);
        const startedAt = Date.now();
        let outcome = null;
        let attempt = 0;
        let lastError = null;

        while (attempt < 2) {
          attempt += 1;
          try {
            await page.reload();
            outcome = await runCaseOnce({
              def, page, store, proof, pass, runId,
              browserInfo: browser, harnessInfo, startedAt
            });
            break;
          } catch (error) {
            lastError = error;
            if (attempt >= 2 || !isRecoverable(error)) {
              outcome = {
                def,
                summary: {
                  caseId: def.id,
                  total: 1,
                  passed: 0,
                  failed: 1,
                  result: 'FAIL',
                  checks: [{ name: 'case execution: recoverable session failure', status: 'FAIL', detail: { message: error.message } }]
                },
                thrown: error
              };
              break;
            }
            recoveries.push({
              caseId: def.id,
              pass,
              attempt,
              message: error.message,
              recovery: 'reload and retry once',
              timestamp: new Date().toISOString()
            });
            console.log('    recoverable failure, reloading and retrying: ' + error.message);
            try {
              await page.reload();
            } catch (reloadError) {
              lastError = reloadError;
            }
          }
        }

        if (!outcome || !outcome.summary) {
          outcome = {
            def,
            summary: {
              caseId: def.id,
              total: 1,
              passed: 0,
              failed: 1,
              result: 'FAIL',
              checks: [{ name: 'case execution: no outcome', status: 'FAIL', detail: { message: lastError && lastError.message } }]
            },
            thrown: lastError
          };
        }

        results.push({
          caseId: def.id,
          slug: def.slug,
          pass,
          result: outcome.summary.result,
          checks: outcome.summary,
          durationMs: Date.now() - startedAt,
          attempts: attempt,
          artifacts: outcome.auditRecord ? [outcome.auditRecord] : []
        });

        const summary = outcome.summary;
        console.log('    ' + summary.result + ' (' + summary.passed + '/' + summary.total + ' checks)');
        if (summary.result !== 'PASS') {
          for (const check of summary.checks.filter((c) => c.status === 'FAIL')) {
            console.log('    FAIL ' + check.name + (check.detail ? ' :: ' + JSON.stringify(check.detail) : ''));
          }
        }

        if (summary.result !== 'PASS' && options.stopOnFail) {
          aborted = true;
          console.log('\nStopping after failing case ' + def.id + '.');
          break;
        }
      }

      store.cleanup();
      if (aborted) break;
    }

    const allPassed = results.length > 0 && results.every((result) => result.result === 'PASS') && !aborted;
    const summary = {
      runner: { name: 'simuforge-sp05-cdp-runner', version: RUNNER_VERSION },
      runId,
      proof,
      cases: selected.map((def) => def.id),
      passes: options.passes,
      port: options.port,
      browser: { version: browser ? browser.version : null, userAgent: browser ? browser.userAgent : null },
      harness: harnessInfo,
      inputMethod: 'cdp_trusted_input',
      interactionManual: false,
      startedAt: runStartedAt,
      completedAt: new Date().toISOString(),
      aborted,
      result: allPassed ? 'PASS' : 'FAIL',
      results,
      recoveries
    };
    fs.mkdirSync(outDir, { recursive: true });
    const summaryPath = path.join(outDir, 'run_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
    console.log('\nOverall: ' + summary.result);
    console.log('Summary: ' + summaryPath);
    return allPassed ? 0 : 1;
  } finally {
    if (page) page.dispose();
    if (cdp) cdp.close();
    if (browser && !options.attach && !options.keepBrowser) {
      try { await browser.stop(); } catch (_) {}
    }
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('\nRUNNER ERROR: ' + (error && error.stack ? error.stack : error));
    process.exit(2);
  });
