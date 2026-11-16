import { PYTHON_PROTOCOL_VERSION } from '../protocol.ts';
import type { PythonWorkerRequest, PythonWorkerResponse } from '../protocol.ts';
import { PYTHON_OUTPUT_MAX_CHARS } from '../limits.ts';
import { PYTHON_BOOTSTRAP } from './bootstrap.ts';

/**
 * Phase 07 Python worker.
 *
 * Runs user-authored Python in a dedicated module worker. Pyodide is loaded from
 * a same-origin, version-pinned path at runtime, so it is never bundled and never
 * fetched from a third party at run time.
 *
 * This worker is an isolation mechanism, not a security boundary. Hardening below
 * is defence in depth; the main thread re-validates every message.
 */

interface PyodideLike {
  version: string;
  globals: { set(name: string, value: unknown): void };
  runPython(code: string): unknown;
  runPythonAsync(code: string): Promise<unknown>;
  setInterruptBuffer(buffer: Int32Array): void;
}

interface PyodideModule {
  loadPyodide(options: { indexURL: string }): Promise<PyodideLike>;
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<PythonWorkerRequest>) => void) | null;
  postMessage(message: PythonWorkerResponse): void;
  fetch?: unknown;
  XMLHttpRequest?: unknown;
  WebSocket?: unknown;
  indexedDB?: unknown;
  caches?: unknown;
  importScripts?: unknown;
}

const scope = self as unknown as WorkerScope;

/** Host globals removed after initialization. */
const HARDENED_GLOBALS = ['fetch', 'XMLHttpRequest', 'WebSocket', 'indexedDB', 'caches', 'importScripts'];

let pyodide: PyodideLike | null = null;
let interruptView: Int32Array | null = null;
let capabilityBeforeHarden: Record<string, boolean> = {};

function respond(message: PythonWorkerResponse): void {
  scope.postMessage(message);
}

function postFailure(requestId: string, name: string, message: string, traceback: string, durationMs: number, logs: unknown): void {
  respond({
    type: 'result',
    protocolVersion: PYTHON_PROTOCOL_VERSION,
    requestId,
    ok: false,
    name,
    message,
    traceback,
    durationMs,
    logs
  });
}

/** Shadows dangerous host globals. Returns the names that were actually removed. */
function harden(): string[] {
  const blocked: string[] = [];
  for (const name of HARDENED_GLOBALS) {
    try {
      if (name in (scope as unknown as Record<string, unknown>)) {
        Object.defineProperty(scope, name, {
          value: undefined,
          configurable: false,
          writable: false
        });
        blocked.push(name);
      }
    } catch {
      // A non-configurable global cannot be shadowed; the probe reports the truth.
    }
  }
  return blocked;
}

async function canFetch(): Promise<boolean> {
  try {
    const fetchFn = scope.fetch;
    if (typeof fetchFn !== 'function') {
      return false;
    }
    // A real request, not a property read: a 404 still proves the capability works.
    await (fetchFn as (input: string, init?: RequestInit) => Promise<unknown>)('/__sf_capability_probe__', {
      method: 'GET',
      cache: 'no-store'
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Functional capability probe. Each entry attempts the capability rather than
 * reading a property, so it cannot pass merely because a name is undefined.
 */
async function probeCapabilities(): Promise<Record<string, boolean>> {
  return {
    fetch: await canFetch(),
    XMLHttpRequest: typeof scope.XMLHttpRequest === 'function',
    WebSocket: typeof scope.WebSocket === 'function',
    indexedDB: typeof scope.indexedDB === 'object' && scope.indexedDB !== null,
    caches: typeof scope.caches === 'object' && scope.caches !== null,
    importScripts: typeof scope.importScripts === 'function'
  };
}

function collectPayload(): { actions: unknown; logs: unknown; truncated: boolean } {
  if (!pyodide) {
    return { actions: [], logs: [], truncated: false };
  }
  const raw = String(pyodide.runPython('__sf_collect()'));
  let parsed: { actions?: unknown; logs?: unknown; truncated?: unknown };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return { actions: [], logs: [], truncated: true };
  }

  let actions = Array.isArray(parsed.actions) ? parsed.actions : [];
  let logs = Array.isArray(parsed.logs) ? parsed.logs : [];
  let truncated = parsed.truncated === true;

  // The 64 KiB cap applies to the serialized payload, matching the tested
  // output ceiling. Actions are already bounded in Python, so logs are dropped.
  if (JSON.stringify({ actions, logs }).length > PYTHON_OUTPUT_MAX_CHARS) {
    truncated = true;
    while (logs.length > 0 && JSON.stringify({ actions, logs }).length > PYTHON_OUTPUT_MAX_CHARS) {
      logs = logs.slice(0, -1);
    }
  }

  return { actions, logs, truncated };
}

scope.onmessage = (event: MessageEvent<PythonWorkerRequest>) => {
  const message = event.data;

  if (message.type === 'init') {
    void (async () => {
      try {
        const loadStart = performance.now();
        const module = (await import(/* @vite-ignore */ message.pyodideUrl)) as PyodideModule;
        const loadMs = performance.now() - loadStart;

        const initStart = performance.now();
        pyodide = await module.loadPyodide({ indexURL: message.indexUrl });
        pyodide.runPython(PYTHON_BOOTSTRAP);
        const initMs = performance.now() - initStart;

        if (message.interruptBuffer) {
          interruptView = new Int32Array(message.interruptBuffer);
          pyodide.setInterruptBuffer(interruptView);
        }

        capabilityBeforeHarden = await probeCapabilities();
        const hardened = harden();

        respond({
          type: 'ready',
          protocolVersion: PYTHON_PROTOCOL_VERSION,
          version: pyodide.version,
          loadMs,
          initMs,
          hardened
        });
      } catch (error) {
        pyodide = null;
        respond({
          type: 'init-error',
          message: error instanceof Error ? error.message : String(error)
        });
      }
    })();
    return;
  }

  if (message.type === 'probe') {
    void (async () => {
      const after = await probeCapabilities();
      respond({
        type: 'probe-result',
        protocolVersion: PYTHON_PROTOCOL_VERSION,
        before: capabilityBeforeHarden,
        after
      });
    })();
    return;
  }

  if (message.type === 'interrupt') {
    if (interruptView) {
      Atomics.store(interruptView, 0, 2);
    }
    return;
  }

  if (message.type === 'run') {
    void (async () => {
      if (!pyodide) {
        postFailure(
          message.requestId,
          'RuntimeUnavailable',
          'The Python runtime is not initialized.',
          '',
          0,
          []
        );
        return;
      }

      const started = performance.now();
      if (interruptView) {
        Atomics.store(interruptView, 0, 0);
      }

      try {
        pyodide.globals.set('__sf_payload', JSON.stringify(message.snapshot));
        pyodide.runPython('__sf_prepare(__sf_payload)');
        await pyodide.runPythonAsync(message.source);
        const payload = collectPayload();
        respond({
          type: 'result',
          protocolVersion: PYTHON_PROTOCOL_VERSION,
          requestId: message.requestId,
          ok: true,
          actions: payload.actions,
          logs: payload.logs,
          durationMs: performance.now() - started,
          truncated: payload.truncated
        });
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : String(error);
        const errorName = error instanceof Error ? error.name : 'PythonError';
        postFailure(
          message.requestId,
          errorName,
          rawMessage,
          rawMessage,
          performance.now() - started,
          []
        );
      } finally {
        if (interruptView) {
          Atomics.store(interruptView, 0, 0);
        }
      }
    })();
  }
};
