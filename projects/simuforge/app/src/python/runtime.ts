import {
  PYTHON_CONSOLE_MAX_LINES,
  PYTHON_EXECUTION_TIMEOUT_MS,
  PYTHON_INTERRUPT_GRACE_MS,
  PYTHON_RESTART_MAX,
  PYTHON_RESTART_WINDOW_MS
} from './limits.ts';
import { PYTHON_PROTOCOL_VERSION } from './protocol.ts';
import type { PythonWorkerRequest, PythonWorkerResponse } from './protocol.ts';
import { sanitizePythonActions, sanitizePythonLogs } from './actions.ts';
import { parsePythonError } from './errors.ts';
import { PYTHON_CODES } from './types.ts';
import type {
  PythonErrorReport,
  PythonLogLine,
  PythonRunOutcome,
  PythonRuntimeStatus,
  PythonSnapshot
} from './types.ts';

const INIT_TIMEOUT_MS = 120_000;
const MAX_LOG_CHARS = 2000;
const PYTHON_CANCELLED_CODE = PYTHON_CODES.CANCELLED;

function abortError(code: string): PythonErrorReport {
  if (code === PYTHON_CODES.TIMEOUT) {
    return {
      name: 'TimeoutError',
      message: `The script exceeded its ${PYTHON_EXECUTION_TIMEOUT_MS} ms execution budget.`,
      line: null,
      traceback: ''
    };
  }
  return {
    name: 'CancelledError',
    message: 'The Python invocation was cancelled.',
    line: null,
    traceback: ''
  };
}

export interface PythonRuntimeOptions {
  /** Injectable for tests. Defaults to the bundled module worker. */
  createWorker?: () => Worker;
  /** Same-origin URL of the pinned Pyodide module. */
  pyodideUrl?: string;
  /** Same-origin index URL for Pyodide assets. */
  indexUrl?: string;
  timeoutMs?: number;
  interruptGraceMs?: number;
  restartMax?: number;
  restartWindowMs?: number;
  now?: () => number;
  onStatus?: (status: PythonRuntimeStatus, detail: string | null) => void;
  isCrossOriginIsolated?: () => boolean;
}

interface ActiveRun {
  requestId: string;
  startedAt: number;
  /** Set once the invocation is aborted; the eventual result is reported as this code. */
  abortCode: string | null;
  timeoutTimer: ReturnType<typeof setTimeout> | null;
  graceTimer: ReturnType<typeof setTimeout> | null;
  resolve: (outcome: PythonRunOutcome) => void;
}

interface WorkerLike {
  onmessage: ((event: MessageEvent<PythonWorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: PythonWorkerRequest): void;
  terminate(): void;
}

function defaultCreateWorker(): Worker {
  return new Worker(new URL('./worker/pythonWorker.ts', import.meta.url), { type: 'module' });
}

function failureOutcome(
  code: string,
  error: PythonErrorReport,
  logs: PythonLogLine[] = [],
  durationMs = 0
): PythonRunOutcome {
  return { ok: false, code, error, logs, durationMs };
}

/**
 * Main-thread client for the Python worker.
 *
 * Contract (D-P07-01, D-P07-02, D-P07-06):
 * - one invocation at a time;
 * - lazy, self-hosted, version-pinned Pyodide;
 * - timeout first interrupts, then terminates after a grace period;
 * - hard cancellation terminates and lazily restarts, budgeted to avoid thrash;
 * - the worker is treated as untrusted: every payload is re-validated here.
 */
export class PythonRuntime {
  private readonly options: Required<
    Pick<PythonRuntimeOptions, 'timeoutMs' | 'interruptGraceMs' | 'restartMax' | 'restartWindowMs' | 'now'>
  >;
  private readonly createWorker: () => Worker;
  private readonly pyodideUrl: string;
  private readonly indexUrl: string;
  private readonly isCrossOriginIsolated: () => boolean;
  private readonly onStatus: ((status: PythonRuntimeStatus, detail: string | null) => void) | undefined;

  private worker: WorkerLike | null = null;
  private initPromise: Promise<void> | null = null;
  private initResolve: (() => void) | null = null;
  private initReject: ((error: Error) => void) | null = null;
  private initTimer: ReturnType<typeof setTimeout> | null = null;
  private interruptBuffer: SharedArrayBuffer | null = null;
  private interruptView: Int32Array | null = null;
  private active: ActiveRun | null = null;
  private probeResolve: ((value: { before: Record<string, boolean>; after: Record<string, boolean> }) => void) | null =
    null;
  private terminations: number[] = [];
  private status: PythonRuntimeStatus = 'idle';
  private disposed = false;

  constructor(options: PythonRuntimeOptions = {}) {
    this.options = {
      timeoutMs: options.timeoutMs ?? PYTHON_EXECUTION_TIMEOUT_MS,
      interruptGraceMs: options.interruptGraceMs ?? PYTHON_INTERRUPT_GRACE_MS,
      restartMax: options.restartMax ?? PYTHON_RESTART_MAX,
      restartWindowMs: options.restartWindowMs ?? PYTHON_RESTART_WINDOW_MS,
      now: options.now ?? (() => Date.now())
    };
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.pyodideUrl = options.pyodideUrl ?? '/pyodide/pyodide.mjs';
    this.indexUrl = options.indexUrl ?? '/pyodide/';
    this.isCrossOriginIsolated =
      options.isCrossOriginIsolated ??
      (() => (globalThis as { crossOriginIsolated?: boolean }).crossOriginIsolated === true);
    this.onStatus = options.onStatus;
  }

  getStatus(): PythonRuntimeStatus {
    return this.status;
  }

  /** True when the interrupt buffer is available (cross-origin isolated page). */
  hasInterruptSupport(): boolean {
    return this.interruptView !== null;
  }

  /** True when Pyodide has finished loading in this runtime instance. */
  isReady(): boolean {
    return this.worker !== null && this.initPromise !== null && this.status !== 'loading';
  }

  private setStatus(status: PythonRuntimeStatus, detail: string | null = null): void {
    if (this.status === status && detail === null) {
      return;
    }
    this.status = status;
    this.onStatus?.(status, detail);
  }

  private canRestart(): boolean {
    const cutoff = this.options.now() - this.options.restartWindowMs;
    this.terminations = this.terminations.filter((at) => at >= cutoff);
    return this.terminations.length < this.options.restartMax;
  }

  /** Loads Pyodide on first use. Safe to call repeatedly. */
  ensureReady(): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error('The Python runtime has been disposed.'));
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    if (!this.canRestart()) {
      const error = new Error(
        `The Python runtime was restarted ${this.options.restartMax} times in the last ${
          this.options.restartWindowMs / 1000
        } s. Wait before running Python again.`
      );
      this.setStatus('error', error.message);
      return Promise.reject(error);
    }

    this.setStatus('loading');
    const worker = this.createWorker() as unknown as WorkerLike;
    this.worker = worker;
    worker.onmessage = (event) => this.handleMessage(event.data);
    worker.onerror = (event) => {
      this.failInit(new Error(event.message || 'The Python worker failed to load.'));
    };

    if (this.isCrossOriginIsolated() && typeof SharedArrayBuffer === 'function') {
      this.interruptBuffer = new SharedArrayBuffer(4);
      this.interruptView = new Int32Array(this.interruptBuffer);
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
    });

    this.initTimer = setTimeout(() => {
      this.failInit(new Error('The Python runtime did not initialize in time.'));
    }, INIT_TIMEOUT_MS);

    worker.postMessage({
      type: 'init',
      protocolVersion: PYTHON_PROTOCOL_VERSION,
      pyodideUrl: this.pyodideUrl,
      indexUrl: this.indexUrl,
      interruptBuffer: this.interruptBuffer
    });

    return this.initPromise;
  }

  private failInit(error: Error): void {
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
    const reject = this.initReject;
    this.initResolve = null;
    this.initReject = null;
    this.initPromise = null;
    this.destroyWorker();
    this.setStatus('error', error.message);
    reject?.(error);
  }

  private handleMessage(message: PythonWorkerResponse): void {
    if (message.type === 'ready') {
      if (this.initTimer) {
        clearTimeout(this.initTimer);
        this.initTimer = null;
      }
      const resolve = this.initResolve;
      this.initResolve = null;
      this.initReject = null;
      this.setStatus('ready');
      resolve?.();
      return;
    }

    if (message.type === 'init-error') {
      this.failInit(new Error(message.message));
      return;
    }

    if (message.type === 'probe-result') {
      const resolve = this.probeResolve;
      this.probeResolve = null;
      resolve?.({ before: message.before, after: message.after });
      return;
    }

    const active = this.active;
    if (!active || message.requestId !== active.requestId) {
      // Stale or forged response: a worker message is never trusted implicitly.
      return;
    }

    this.clearTimers(active);
    this.active = null;

    const durationMs = Math.max(0, Math.round(this.options.now() - active.startedAt));
    const logsResult = sanitizePythonLogs(message.logs, PYTHON_CONSOLE_MAX_LINES, MAX_LOG_CHARS);

    if (message.ok) {
      if (active.abortCode) {
        active.resolve(failureOutcome(active.abortCode, abortError(active.abortCode), logsResult.logs, durationMs));
        this.setStatus(active.abortCode === PYTHON_CODES.TIMEOUT ? 'timeout' : 'ready');
        return;
      }
      this.setStatus('ready');
      active.resolve({
        ok: true,
        actions: sanitizePythonActions(message.actions),
        logs: logsResult.logs,
        durationMs,
        truncated: message.truncated || logsResult.truncated
      });
      return;
    }

    const report = parsePythonError(message.name, message.message);
    const isInterrupt = /KeyboardInterrupt/.test(message.message);
    const code = active.abortCode ?? (isInterrupt ? PYTHON_CODES.CANCELLED : PYTHON_CODES.FAILED);
    this.setStatus(code === PYTHON_CODES.CANCELLED ? 'ready' : 'error', report.message);
    active.resolve(failureOutcome(code, report, logsResult.logs, durationMs));
  }

  private clearTimers(active: ActiveRun): void {
    if (active.timeoutTimer) {
      clearTimeout(active.timeoutTimer);
      active.timeoutTimer = null;
    }
    if (active.graceTimer) {
      clearTimeout(active.graceTimer);
      active.graceTimer = null;
    }
  }

  /** Runs one script. Rejects are never thrown; failures are returned. */
  async run(source: string, snapshot: PythonSnapshot): Promise<PythonRunOutcome> {
    try {
      await this.ensureReady();
    } catch (error) {
      return failureOutcome(PYTHON_CODES.UNAVAILABLE, {
        name: 'RuntimeUnavailable',
        message: error instanceof Error ? error.message : String(error),
        line: null,
        traceback: ''
      });
    }

    if (this.active) {
      return failureOutcome(PYTHON_CODES.UNAVAILABLE, {
        name: 'RuntimeBusy',
        message: 'Another Python invocation is still running.',
        line: null,
        traceback: ''
      });
    }

    const worker = this.worker;
    if (!worker) {
      return failureOutcome(PYTHON_CODES.UNAVAILABLE, {
        name: 'RuntimeUnavailable',
        message: 'The Python runtime is not initialized.',
        line: null,
        traceback: ''
      });
    }

    const requestId = `py-${this.options.now()}-${Math.random().toString(36).slice(2, 10)}`;
    this.setStatus('running');

    return new Promise<PythonRunOutcome>((resolve) => {
      const active: ActiveRun = {
        requestId,
        startedAt: this.options.now(),
        abortCode: null,
        timeoutTimer: null,
        graceTimer: null,
        resolve
      };
      this.active = active;

      active.timeoutTimer = setTimeout(() => {
        this.abort(active, PYTHON_CODES.TIMEOUT);
      }, this.options.timeoutMs);

      worker.postMessage({
        type: 'run',
        protocolVersion: PYTHON_PROTOCOL_VERSION,
        requestId,
        source,
        snapshot
      });
    });
  }

  /**
   * Aborts the active invocation. Interrupts when a shared buffer is available,
   * then terminates if the interpreter does not yield within the grace period.
   */
  private abort(active: ActiveRun, code: string): void {
    if (active.abortCode) {
      return;
    }
    active.abortCode = code;
    this.setStatus(code === PYTHON_CODES.TIMEOUT ? 'timeout' : 'ready');

    const interrupted = this.interrupt();
    if (!interrupted) {
      this.hardStop(active, code);
      return;
    }

    active.graceTimer = setTimeout(() => {
      this.hardStop(active, code);
    }, this.options.interruptGraceMs);
  }

  private interrupt(): boolean {
    if (!this.interruptView || !this.worker) {
      return false;
    }
    Atomics.store(this.interruptView, 0, 2);
    return true;
  }

  private hardStop(active: ActiveRun, code: string): void {
    if (this.active !== active) {
      return;
    }
    this.clearTimers(active);
    this.active = null;
    this.terminations.push(this.options.now());
    this.destroyWorker();
    this.setStatus(code === PYTHON_CODES.TIMEOUT ? 'timeout' : 'ready');
    active.resolve(
      failureOutcome(code, abortError(code), [], Math.max(0, Math.round(this.options.now() - active.startedAt)))
    );
  }

  /** Cancels the active invocation. Used by Stop and Reset. */
  cancel(): void {
    const active = this.active;
    if (!active) {
      return;
    }
    this.abort(active, PYTHON_CANCELLED_CODE);
  }

  /** Measures functional capability reachability inside the worker. */
  async probeCapabilities(): Promise<{ before: Record<string, boolean>; after: Record<string, boolean> }> {
    await this.ensureReady();
    const worker = this.worker;
    if (!worker) {
      return { before: {}, after: {} };
    }
    return new Promise((resolve) => {
      this.probeResolve = resolve;
      worker.postMessage({ type: 'probe', protocolVersion: PYTHON_PROTOCOL_VERSION });
    });
  }

  private destroyWorker(): void {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Termination of an already-dead worker is not an error.
      }
      this.worker = null;
    }
    this.initPromise = null;
    this.initResolve = null;
    this.initReject = null;
    this.interruptBuffer = null;
    this.interruptView = null;
    if (this.initTimer) {
      clearTimeout(this.initTimer);
      this.initTimer = null;
    }
  }

  dispose(): void {
    this.disposed = true;
    const active = this.active;
    if (active) {
      this.clearTimers(active);
      this.active = null;
      active.resolve(failureOutcome(PYTHON_CANCELLED_CODE, abortError(PYTHON_CANCELLED_CODE), [], 0));
    }
    this.destroyWorker();
    this.setStatus('idle');
  }
}

