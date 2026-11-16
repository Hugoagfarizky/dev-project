/* POC 4 runner: serves the harness, drives Chromium, and writes evidence. */

import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../../app/package.json', import.meta.url));
const { chromium } = require('playwright');

const HARNESS_DIR = fileURLToPath(new URL('.', import.meta.url));
const EVIDENCE_DIR = fileURLToPath(new URL('../evidence/', import.meta.url));
const PYODIDE_VERSION = '314.0.8';
const PYODIDE_CDN = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const PYODIDE_LOCAL = '/pyodide/';
const PORT = 4180;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);
      const pathname = decodeURIComponent(url.pathname);

      // Same-origin proxy for the pinned Pyodide distribution. Keeping the
      // runtime same-origin avoids cross-origin script/CORP complications under
      // COEP while preserving a single pinned upstream version.
      if (pathname.startsWith('/pyodide/')) {
        const upstream = `${PYODIDE_CDN}${pathname.slice('/pyodide/'.length)}`;
        const upstreamResponse = await fetch(upstream);
        if (!upstreamResponse.ok) {
          response.writeHead(502);
          response.end(`upstream ${upstreamResponse.status}`);
          return;
        }
        const body = Buffer.from(await upstreamResponse.arrayBuffer());
        response.writeHead(200, {
          'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/octet-stream',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'credentialless',
          'Cache-Control': 'no-store'
        });
        response.end(body);
        return;
      }

      const file = normalize(join(HARNESS_DIR, pathname === '/' ? '/index.html' : pathname));
      if (!file.startsWith(HARNESS_DIR)) {
        response.writeHead(403);
        response.end('forbidden');
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cache-Control': 'no-store'
      });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

async function installRpc(page) {
  await page.evaluate(() => {
    window.__poc = {
      worker: null,
      interruptBuffer: null,
      results: {},
      seq: 0,
      ready: null,
      currentId: null,
      async init(options) {
        this.terminate();
        const started = performance.now();
        const worker = new Worker('python-worker.js', { type: 'module' });
        this.worker = worker;
        let shared = null;
        if (options.interrupt) {
          shared = new SharedArrayBuffer(4);
          this.interruptBuffer = new Int32Array(shared);
        } else {
          this.interruptBuffer = null;
        }
        const ready = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Python initialization timed out.')), 180000);
          worker.onmessage = (event) => {
            if (event.data.type === 'ready') {
              clearTimeout(timer);
              resolve(event.data);
            } else if (event.data.type === 'init-error') {
              clearTimeout(timer);
              reject(new Error(event.data.message));
            }
          };
          worker.onerror = (event) => {
            clearTimeout(timer);
            reject(new Error(event.message || 'Worker failed to load.'));
          };
          worker.postMessage({
            type: 'init',
            pyodideUrl: options.pyodideUrl,
            indexURL: options.indexUrl,
            interruptBuffer: shared
          });
        });
        this.ready = ready;
        return { ...ready, totalMs: performance.now() - started };
      },
      startRun(code) {
        const id = ++this.seq;
        this.results[id] = null;
        this.currentId = id;
        const started = performance.now();
        this.worker.onmessage = (event) => {
          const message = event.data;
          if (message.type === 'result' || message.type === 'error') {
            this.results[message.id] = { ...message, wallMs: performance.now() - started };
          }
        };
        this.worker.onerror = (event) => {
          this.results[id] = {
            type: 'error',
            id,
            name: 'WorkerError',
            message: String(event.message || 'Worker error.'),
            stack: '',
            ms: performance.now() - started,
            wallMs: performance.now() - started
          };
        };
        this.worker.postMessage({ type: 'run', id, code });
        return id;
      },
      interrupt() {
        if (this.interruptBuffer) {
          Atomics.store(this.interruptBuffer, 0, 2);
          return true;
        }
        return false;
      },
      lockdown() {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Lockdown timed out.')), 5000);
          this.worker.onmessage = (event) => {
            if (event.data.type === 'lockdown') {
              clearTimeout(timer);
              resolve(event.data);
            }
          };
          this.worker.postMessage({ type: 'lockdown' });
        });
      },
      terminate() {
        if (this.worker) {
          this.worker.terminate();
          this.worker = null;
        }
        this.interruptBuffer = null;
      },
      alive() {
        return Boolean(this.worker);
      }
    };
  });
}

async function waitResult(page, id, timeout = 60000) {
  await page.waitForFunction(
    (runId) => {
      const value = window.__poc && window.__poc.results[runId];
      return value !== null && value !== undefined;
    },
    id,
    { timeout }
  );
  return page.evaluate((runId) => window.__poc.results[runId], id);
}

function numericValue(result) {
  if (!result || result.type !== 'result') return Number.NaN;
  return Number(result.value);
}

async function main() {
  await mkdir(EVIDENCE_DIR, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on('console', (message) => consoleMessages.push(`${message.type()}: ${message.text()}`));
  page.on('pageerror', (error) => consoleMessages.push(`pageerror: ${error.message}`));

  const evidence = {
    poc: 'POC-04',
    title: 'Python runtime in a Web Worker',
    generatedAt: new Date().toISOString(),
    browser: '',
    pyodide: {
      version: PYODIDE_VERSION,
      url: `${PYODIDE_CDN}pyodide.mjs`,
      source: 'jsDelivr CDN, pinned version'
    },
    isolation: null,
    scenarios: [],
    observations: {},
    console: consoleMessages
  };

  const record = (id, status, assertions, details = {}) => {
    evidence.scenarios.push({ id, status, assertions, details });
    return status;
  };

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="poc-status"]');
    await installRpc(page);

    evidence.browser = `Chromium ${browser.version()}`;
    evidence.isolation = await page.evaluate(() => window.__pocIsolation());

    // --- Scenario 1: initialization -------------------------------------------------
    await page.evaluate(() => window.__pocSetStatus('Initializing Pyodide…'));
    const init = await page.evaluate(
      ({ pyodideUrl, indexUrl }) => window.__poc.init({ pyodideUrl, indexUrl, interrupt: true }),
      { pyodideUrl: `${PYODIDE_LOCAL}pyodide.mjs`, indexUrl: PYODIDE_LOCAL }
    );
    evidence.pyodide.reportedVersion = init.version;
    evidence.pyodide.loadMs = Math.round(init.loadMs);
    evidence.pyodide.initMs = Math.round(init.initMs);
    evidence.pyodide.totalStartupMs = Math.round(init.totalMs);
    evidence.pyodide.interruptBufferAttached = init.interruptBufferAttached;
    await page.evaluate((text) => {
      window.__pocSetStatus('Python ready');
      window.__pocSetOutput(text);
    }, `Pyodide ${init.version} ready\nworker load: ${Math.round(init.loadMs)} ms\ninterpreter init: ${Math.round(init.initMs)} ms\ntotal: ${Math.round(init.totalMs)} ms`);
    await page.screenshot({ path: join(EVIDENCE_DIR, 'poc04-ready.png') });

    record(
      'init',
      init.version && init.totalMs > 0 ? 'passed' : 'failed',
      {
        initSucceeded: Boolean(init.version),
        versionReported: init.version === PYODIDE_VERSION,
        interruptBufferAttached: Boolean(init.interruptBufferAttached)
      },
      {
        loadMs: Math.round(init.loadMs),
        initMs: Math.round(init.initMs),
        totalMs: Math.round(init.totalMs),
        crossOriginIsolated: init.crossOriginIsolated
      }
    );

    // --- Scenario 2: simple execution ----------------------------------------------
    const simpleId = await page.evaluate(() => window.__poc.startRun('sum(range(200000))'));
    const simple = await waitResult(page, simpleId);
    const simpleValue = numericValue(simple);
    record(
      'simple-execution',
      simple.type === 'result' && simpleValue === 19999900000 ? 'passed' : 'failed',
      {
        resultReturned: simple.type === 'result',
        resultCorrect: simpleValue === 19999900000
      },
      { value: simple.value, executionMs: Math.round(simple.ms), wallMs: Math.round(simple.wallMs) }
    );

    // --- Scenario 3: messaging round-trip -------------------------------------------
    const roundTrips = [];
    for (let index = 0; index < 20; index += 1) {
      const id = await page.evaluate(() => window.__poc.startRun('1 + 1'));
      const result = await waitResult(page, id, 15000);
      roundTrips.push(result.wallMs);
    }
    const averageRoundTrip = roundTrips.reduce((sum, value) => sum + value, 0) / roundTrips.length;
    record(
      'messaging-round-trip',
      averageRoundTrip < 100 ? 'passed' : 'failed',
      { averageUnder100ms: averageRoundTrip < 100 },
      {
        samples: roundTrips.map((value) => Math.round(value * 100) / 100),
        averageMs: Math.round(averageRoundTrip * 100) / 100
      }
    );

    // --- Scenario 4: syntax error reporting ----------------------------------------
    const syntaxId = await page.evaluate(() => window.__poc.startRun('def broken(:\n    pass'));
    const syntax = await waitResult(page, syntaxId);
    const syntaxText = `${syntax.message ?? ''}\n${syntax.stack ?? ''}`;
    record(
      'syntax-error',
      syntax.type === 'error' && /SyntaxError/.test(syntaxText) ? 'passed' : 'failed',
      {
        errorReturned: syntax.type === 'error',
        syntaxErrorNamed: /SyntaxError/.test(syntaxText)
      },
      { name: syntax.name, message: String(syntax.message).slice(0, 500), ms: Math.round(syntax.ms) }
    );

    // --- Scenario 5: runtime error reporting ---------------------------------------
    const runtimeId = await page.evaluate(() => window.__poc.startRun('1 / 0'));
    const runtimeError = await waitResult(page, runtimeId);
    const runtimeText = `${runtimeError.message ?? ''}\n${runtimeError.stack ?? ''}`;
    record(
      'runtime-error',
      runtimeError.type === 'error' && /ZeroDivisionError/.test(runtimeText) ? 'passed' : 'failed',
      {
        errorReturned: runtimeError.type === 'error',
        zeroDivisionNamed: /ZeroDivisionError/.test(runtimeText),
        tracebackHasLine: /line \d+/.test(runtimeText)
      },
      { name: runtimeError.name, message: String(runtimeError.message).slice(0, 500), ms: Math.round(runtimeError.ms) }
    );

    // --- Scenario 6: capability probe ----------------------------------------------
    const probeCode = [
      'import json',
      'import js',
      'names = ["window", "document", "fetch", "XMLHttpRequest", "WebSocket", "indexedDB",',
      '         "localStorage", "sessionStorage", "location", "navigator", "caches",',
      '         "importScripts", "postMessage"]',
      'out = {}',
      'for name in names:',
      '    try:',
      '        value = getattr(js, name)',
      '        out[name] = "present" if value is not None else "none"',
      '    except Exception:',
      '        out[name] = "absent"',
      'json.dumps(out)'
    ].join('\n');
    const probeId = await page.evaluate((code) => window.__poc.startRun(code), probeCode);
    const probe = await waitResult(page, probeId);
    let capabilities = {};
    try {
      capabilities = JSON.parse(probe.value);
    } catch {
      capabilities = { parseError: String(probe.value) };
    }
    evidence.observations.capabilities = capabilities;
    record(
      'capability-probe',
      capabilities.window === 'absent' && capabilities.document === 'absent' ? 'passed' : 'failed',
      {
        domUnavailable: capabilities.window === 'absent' && capabilities.document === 'absent',
        networkReachable: capabilities.fetch === 'present',
        storageReachable: capabilities.indexedDB === 'present'
      },
      { capabilities }
    );

    // --- Scenario 6b: capability lockdown ------------------------------------------
    const lockdown = await page.evaluate(() => window.__poc.lockdown());
    const lockedProbeId = await page.evaluate((code) => window.__poc.startRun(code), probeCode);
    const lockedProbe = await waitResult(page, lockedProbeId);
    let lockedCapabilities = {};
    try {
      lockedCapabilities = JSON.parse(lockedProbe.value);
    } catch {
      lockedCapabilities = { parseError: String(lockedProbe.value) };
    }
    const stillWorksId = await page.evaluate(() => window.__poc.startRun('6 * 7'));
    const stillWorks = await waitResult(page, stillWorksId);
    const blockedValue = (value) => value === 'absent' || value === 'none';
    evidence.observations.capabilitiesAfterLockdown = lockedCapabilities;
    evidence.observations.lockdownBlocked = lockdown.blocked;
    record(
      'capability-lockdown',
      blockedValue(lockedCapabilities.fetch) &&
        blockedValue(lockedCapabilities.WebSocket) &&
        blockedValue(lockedCapabilities.indexedDB) &&
        numericValue(stillWorks) === 42
        ? 'passed'
        : 'failed',
      {
        fetchBlocked: blockedValue(lockedCapabilities.fetch),
        websocketBlocked: blockedValue(lockedCapabilities.WebSocket),
        indexedDbBlocked: blockedValue(lockedCapabilities.indexedDB),
        runtimeStillWorks: numericValue(stillWorks) === 42
      },
      { blocked: lockdown.blocked, capabilitiesAfterLockdown: lockedCapabilities, stillWorks: stillWorks.value }
    );

    // --- Scenario 7: memory observation --------------------------------------------
    const memoryBefore = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
    const allocId = await page.evaluate(() =>
      window.__poc.startRun('import builtins\nbuiltins.__poc_big = [0] * 5000000\n"allocated"')
    );
    await waitResult(page, allocId);
    const memoryAfterAlloc = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
    const freeId = await page.evaluate(() =>
      window.__poc.startRun('import builtins, gc\ndel builtins.__poc_big\ngc.collect()\n"freed"')
    );
    await waitResult(page, freeId);
    const memoryAfterFree = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
    evidence.observations.memory = {
      beforeBytes: memoryBefore,
      afterAllocBytes: memoryAfterAlloc,
      afterFreeBytes: memoryAfterFree,
      note: 'performance.memory reports the JS heap; Pyodide Wasm memory is not fully represented.'
    };
    record(
      'memory',
      memoryBefore !== null ? 'passed' : 'failed',
      { heapMeasured: memoryBefore !== null },
      evidence.observations.memory
    );

    // --- Scenario 8: UI responsiveness ---------------------------------------------
    await page.evaluate(() => window.__pocResetHeartbeat());
    const busyId = await page.evaluate(() =>
      window.__poc.startRun('total = 0\nfor i in range(30000000):\n    total += i\ntotal')
    );
    const busy = await waitResult(page, busyId, 120000);
    const heartbeat = await page.evaluate(() => window.__pocHeartbeat());
    await page.evaluate((text) => {
      window.__pocSetStatus('Main thread responsive during Python execution');
      window.__pocSetOutput(text);
    }, `Python busy loop: ${Math.round(busy.ms)} ms\nframes rendered: ${heartbeat.frames}\nmax frame gap: ${Math.round(heartbeat.maxGapMs)} ms`);
    await page.screenshot({ path: join(EVIDENCE_DIR, 'poc04-responsive.png') });
    record(
      'ui-responsiveness',
      heartbeat.frames > 10 && heartbeat.maxGapMs < 250 ? 'passed' : 'failed',
      {
        framesRendered: heartbeat.frames > 10,
        maxFrameGapUnder250ms: heartbeat.maxGapMs < 250
      },
      { frames: heartbeat.frames, maxGapMs: Math.round(heartbeat.maxGapMs * 100) / 100, busyMs: Math.round(busy.ms) }
    );

    // --- Scenario 9: interrupt (SharedArrayBuffer) ---------------------------------
    const interruptStart = Date.now();
    const loopId = await page.evaluate(() => window.__poc.startRun('while True:\n    pass'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const interruptSent = await page.evaluate(() => window.__poc.interrupt());
    let interruptResult = null;
    try {
      interruptResult = await waitResult(page, loopId, 8000);
    } catch {
      interruptResult = { type: 'timeout', message: 'Interrupt did not stop the loop.' };
    }
    const interruptMs = Date.now() - interruptStart;
    const interruptText = `${interruptResult.message ?? ''}\n${interruptResult.stack ?? ''}`;
    const survivedId = await page.evaluate(() => window.__poc.startRun('3 + 3'));
    const survived = await waitResult(page, survivedId, 15000);
    await page.evaluate((text) => {
      window.__pocSetStatus('Interrupt stopped the loop; worker survived');
      window.__pocSetOutput(text);
    }, `Interrupt sent: ${interruptSent}\nstopped in: ${interruptMs} ms\nerror: ${interruptResult.name}\nsurvived: ${survived.value}`);
    await page.screenshot({ path: join(EVIDENCE_DIR, 'poc04-interrupt.png') });
    record(
      'interrupt',
      interruptSent && /KeyboardInterrupt/.test(interruptText) && numericValue(survived) === 6 ? 'passed' : 'failed',
      {
        interruptSent,
        loopInterrupted: /KeyboardInterrupt/.test(interruptText),
        workerSurvived: numericValue(survived) === 6
      },
      {
        stopMs: interruptMs,
        errorName: interruptResult.name,
        errorMessage: String(interruptResult.message).slice(0, 500),
        survivedValue: survived.value
      }
    );

    // --- Scenario 10: hard cancellation (terminate) --------------------------------
    const terminateStart = Date.now();
    await page.evaluate(() => window.__poc.startRun('while True:\n    pass'));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await page.evaluate(() => window.__poc.terminate());
    const terminateMs = Date.now() - terminateStart;
    const aliveAfterTerminate = await page.evaluate(() => window.__poc.alive());
    const restarted = await page.evaluate(
      ({ pyodideUrl, indexUrl }) => window.__poc.init({ pyodideUrl, indexUrl, interrupt: true }),
      { pyodideUrl: `${PYODIDE_LOCAL}pyodide.mjs`, indexUrl: PYODIDE_LOCAL }
    );
    const afterRestartId = await page.evaluate(() => window.__poc.startRun('2 + 2'));
    const afterRestart = await waitResult(page, afterRestartId, 20000);
    await page.evaluate((text) => {
      window.__pocSetStatus('Hard cancel terminated the worker; restart succeeded');
      window.__pocSetOutput(text);
    }, `terminate completed in: ${terminateMs} ms\nworker alive: ${aliveAfterTerminate}\nrestart: ${Math.round(restarted.totalMs)} ms\nresult after restart: ${afterRestart.value}`);
    await page.screenshot({ path: join(EVIDENCE_DIR, 'poc04-terminate.png') });
    record(
      'terminate',
      !aliveAfterTerminate && numericValue(afterRestart) === 4 ? 'passed' : 'failed',
      {
        workerStopped: !aliveAfterTerminate,
        restartSucceeded: numericValue(afterRestart) === 4
      },
      {
        terminateMs,
        restartMs: Math.round(restarted.totalMs),
        resultAfterRestart: afterRestart.value
      }
    );

    // --- Scenario 11: output truncation --------------------------------------------
    const outputId = await page.evaluate(() => window.__poc.startRun("'x' * 200000"));
    const output = await waitResult(page, outputId);
    record(
      'output-truncation',
      output.type === 'result' && output.truncated === true && String(output.value).length === 65536
        ? 'passed'
        : 'failed',
      {
        truncatedFlag: output.truncated === true,
        cappedAt65536: String(output.value).length === 65536
      },
      { valueLength: String(output.value).length, truncated: output.truncated }
    );

    evidence.allPassed = evidence.scenarios.every((scenario) => scenario.status === 'passed');
  } catch (error) {
    evidence.error = String(error && error.stack ? error.stack : error);
    evidence.allPassed = false;
  } finally {
    evidence.console = consoleMessages;
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    await new Promise((resolve) => server.close(resolve));
    await writeFile(
      join(EVIDENCE_DIR, 'poc04-results.json'),
      `${JSON.stringify(evidence, null, 2)}\n`,
      'utf8'
    );
  }

  console.log(`POC 4 evidence written to ${join(EVIDENCE_DIR, 'poc04-results.json')}`);
  console.log(`allPassed: ${evidence.allPassed}`);
}

await main();
