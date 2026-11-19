import type { ExtensionEntry, ExtensionHook, ExtensionDiagnostic } from './types.ts';
import { EXTENSION_CODES, EXTENSION_HOOK_TIMEOUT_MS, EXTENSION_INIT_TIMEOUT_MS } from './types.ts';
import { checkPermission } from './permissions.ts';
import type {
  ExtensionHookPayload,
  ExtensionOutputValue,
  ExtensionWorkerRequest,
  ExtensionWorkerResponse
} from './protocol.ts';
import {
  EXTENSION_PROTOCOL_VERSION,
  validateWorkerResponse
} from './protocol.ts';

/**
 * Minimal structural worker interface. The real browser Worker satisfies it;
 * unit tests inject a deterministic fake so the protocol and lifecycle can be
 * exercised without a browser.
 */
export interface ExtensionWorkerLike {
  postMessage(message: ExtensionWorkerRequest): void;
  terminate(): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
}

export type ExtensionHostStatus = 'idle' | 'starting' | 'ready' | 'error';

export interface ExtensionHostState {
  extensionId: string;
  status: ExtensionHostStatus;
  modules: string[];
  error: string | null;
}

export interface ExtensionHookRunResult {
  /** Outputs keyed by `${extensionId}:${moduleId}`. */
  outputs: Record<string, ExtensionOutputValue>;
  diagnostics: ExtensionDiagnostic[];
  durationMs: number;
  /** True when at least one worker was asked to run the hook. */
  ran: boolean;
}

export interface ExtensionSyncResult {
  diagnostics: ExtensionDiagnostic[];
  states: ExtensionHostState[];
}

export interface ExtensionHostOptions {
  createWorker?: () => ExtensionWorkerLike;
  timeoutMs?: number;
  /** Separate, larger budget for worker startup and module evaluation. */
  initTimeoutMs?: number;
  now?: () => number;
  onDiagnostic?: (diagnostic: ExtensionDiagnostic) => void;
}

interface PendingRequest {
  requestId: string;
  hook: ExtensionHook;
  timer: ReturnType<typeof setTimeout>;
  resolve: (result: { ok: boolean; outputs: Record<string, ExtensionOutputValue>; error: string | null }) => void;
}

interface WorkerSlot {
  entry: ExtensionEntry;
  signature: string;
  worker: ExtensionWorkerLike | null;
  status: ExtensionHostStatus;
  modules: string[];
  error: string | null;
  pending: Map<string, PendingRequest>;
  initTimer: ReturnType<typeof setTimeout> | null;
  initResolve: ((state: ExtensionHostState) => void) | null;
}

function defaultCreateWorker(): ExtensionWorkerLike {
  return new Worker(new URL('./worker/extensionWorker.ts', import.meta.url), {
    type: 'module'
  }) as unknown as ExtensionWorkerLike;
}

function entrySignature(entry: ExtensionEntry): string {
  const modules = (entry.manifest.modules ?? [])
    .map((module) => `${module.id}:${module.hooks.slice().sort().join(',')}`)
    .sort()
    .join('|');
  return `${entry.manifest.id}|${entry.enabled ? 1 : 0}|${modules}|${entry.source.length}|${entry.source}`;
}

/**
 * Main-thread host for extension workers.
 *
 * Responsibilities:
 * - reconcile one worker per enabled extension that declares modules;
 * - enforce declarative permissions at the boundary before sending world data;
 * - validate every worker message, bound every hook by a timeout, and terminate
 *   crashed or hung workers;
 * - never throw into the caller: failures become diagnostics.
 */
export class ExtensionHost {
  private readonly createWorker: () => ExtensionWorkerLike;
  private readonly timeoutMs: number;
  private readonly initTimeoutMs: number;
  private readonly now: () => number;
  private readonly onDiagnostic: ((diagnostic: ExtensionDiagnostic) => void) | undefined;
  private slots = new Map<string, WorkerSlot>();
  private hookInFlight = 0;
  private disposed = false;

  constructor(options: ExtensionHostOptions = {}) {
    this.createWorker = options.createWorker ?? defaultCreateWorker;
    this.timeoutMs = options.timeoutMs ?? EXTENSION_HOOK_TIMEOUT_MS;
    this.initTimeoutMs = options.initTimeoutMs ?? EXTENSION_INIT_TIMEOUT_MS;
    this.now = options.now ?? (() => Date.now());
    this.onDiagnostic = options.onDiagnostic;
  }

  isBusy(): boolean {
    return this.hookInFlight > 0;
  }

  listStates(): ExtensionHostState[] {
    return Array.from(this.slots.values())
      .map((slot) => this.stateOf(slot))
      .sort((a, b) => (a.extensionId < b.extensionId ? -1 : a.extensionId > b.extensionId ? 1 : 0));
  }

  /** Reconciles workers against the project's extension entries. */
  async sync(entries: readonly ExtensionEntry[]): Promise<ExtensionSyncResult> {
    if (this.disposed) {
      return { diagnostics: [], states: [] };
    }
    const diagnostics: ExtensionDiagnostic[] = [];
    const wanted = new Map<string, ExtensionEntry>();
    for (const entry of entries) {
      const hasModules = (entry.manifest.modules ?? []).length > 0;
      if (!entry.enabled || !hasModules || entry.source.trim().length === 0) {
        continue;
      }
      const permission = checkPermission(entry.manifest, 'run:simulation-hooks');
      if (!permission.ok) {
        diagnostics.push({
          code: permission.code,
          severity: 'warning',
          message: permission.message,
          extensionId: entry.manifest.id
        });
        continue;
      }
      wanted.set(entry.manifest.id, entry);
    }

    // Stop workers that are gone, disabled, or whose source/modules changed.
    for (const [extensionId, slot] of Array.from(this.slots.entries())) {
      const next = wanted.get(extensionId);
      if (!next || entrySignature(next) !== slot.signature) {
        this.destroySlot(slot);
        this.slots.delete(extensionId);
      }
    }

    const starts: Promise<ExtensionHostState>[] = [];
    for (const [extensionId, entry] of wanted) {
      if (this.slots.has(extensionId)) continue;
      const slot: WorkerSlot = {
        entry,
        signature: entrySignature(entry),
        worker: null,
        status: 'idle',
        modules: [],
        error: null,
        pending: new Map(),
        initTimer: null,
        initResolve: null
      };
      this.slots.set(extensionId, slot);
      starts.push(this.startSlot(slot, diagnostics));
    }

    await Promise.all(starts);
    for (const slot of this.slots.values()) {
      if (slot.status === 'error' && slot.error) {
        diagnostics.push({
          code: EXTENSION_CODES.WORKER_FAILED,
          severity: 'error',
          message: slot.error,
          extensionId: slot.entry.manifest.id
        });
      }
    }
    return { diagnostics, states: this.listStates() };
  }

  private stateOf(slot: WorkerSlot): ExtensionHostState {
    return {
      extensionId: slot.entry.manifest.id,
      status: slot.status,
      modules: slot.modules.slice(),
      error: slot.error
    };
  }

  private startSlot(slot: WorkerSlot, diagnostics: ExtensionDiagnostic[]): Promise<ExtensionHostState> {
    slot.status = 'starting';
    slot.error = null;
    let worker: ExtensionWorkerLike;
    try {
      worker = this.createWorker();
    } catch (error) {
      slot.status = 'error';
      slot.error = `Extension worker could not start: ${error instanceof Error ? error.message : String(error)}`;
      diagnostics.push({
        code: EXTENSION_CODES.WORKER_FAILED,
        severity: 'error',
        message: slot.error,
        extensionId: slot.entry.manifest.id
      });
      return Promise.resolve(this.stateOf(slot));
    }

    slot.worker = worker;
    worker.onmessage = (event) => this.handleMessage(slot, event.data);
    worker.onerror = (event) => {
      this.failSlot(slot, event.message || 'Extension worker crashed.');
    };

    return new Promise<ExtensionHostState>((resolve) => {
      slot.initResolve = resolve;
      slot.initTimer = setTimeout(() => {
        this.failSlot(slot, `Extension worker did not initialize within ${this.initTimeoutMs} ms.`);
      }, this.initTimeoutMs);

      const modules = (slot.entry.manifest.modules ?? []).map((module) => ({
        id: module.id,
        hooks: module.hooks.slice()
      }));
      worker.postMessage({
        type: 'init',
        protocolVersion: EXTENSION_PROTOCOL_VERSION,
        extensionId: slot.entry.manifest.id,
        source: slot.entry.source,
        modules
      });
    });
  }

  private settleInit(slot: WorkerSlot): void {
    if (slot.initTimer) {
      clearTimeout(slot.initTimer);
      slot.initTimer = null;
    }
    const resolve = slot.initResolve;
    slot.initResolve = null;
    resolve?.(this.stateOf(slot));
  }

  private handleMessage(slot: WorkerSlot, data: unknown): void {
    const message: ExtensionWorkerResponse | null = validateWorkerResponse(data);
    if (!message) {
      this.emitDiagnostic({
        code: EXTENSION_CODES.INVALID_MESSAGE,
        severity: 'warning',
        message: 'An extension worker sent an invalid message; it was ignored.',
        extensionId: slot.entry.manifest.id
      });
      return;
    }

    if (message.type === 'ready') {
      if (message.extensionId !== slot.entry.manifest.id) return;
      slot.status = 'ready';
      slot.modules = message.modules;
      slot.error = null;
      this.settleInit(slot);
      return;
    }

    if (message.type === 'init-error') {
      if (message.extensionId !== slot.entry.manifest.id) return;
      this.failSlot(slot, `Extension failed to initialize: ${message.message}`);
      return;
    }

    const pending = slot.pending.get(message.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    slot.pending.delete(message.requestId);
    pending.resolve({ ok: message.ok, outputs: message.outputs, error: message.error?.message ?? null });
  }

  private failSlot(slot: WorkerSlot, message: string): void {
    slot.status = 'error';
    slot.error = message;
    for (const [requestId, pending] of slot.pending) {
      clearTimeout(pending.timer);
      pending.resolve({ ok: false, outputs: {}, error: message });
      slot.pending.delete(requestId);
    }
    this.settleInit(slot);
    this.destroySlot(slot);
    this.emitDiagnostic({
      code: EXTENSION_CODES.WORKER_FAILED,
      severity: 'error',
      message,
      extensionId: slot.entry.manifest.id
    });
  }

  private destroySlot(slot: WorkerSlot): void {
    if (slot.initTimer) {
      clearTimeout(slot.initTimer);
      slot.initTimer = null;
    }
    if (slot.worker) {
      try {
        slot.worker.terminate();
      } catch {
        // Terminating an already-dead worker is not an error.
      }
      slot.worker = null;
    }
  }

  private emitDiagnostic(diagnostic: ExtensionDiagnostic): void {
    this.onDiagnostic?.(diagnostic);
  }

  /**
   * Runs one lifecycle/tick hook on every ready worker that declares it.
   * Never throws. A hung worker is terminated and reported.
   */
  async runHook(hook: ExtensionHook, payload: ExtensionHookPayload): Promise<ExtensionHookRunResult> {
    const startedAt = this.now();
    const diagnostics: ExtensionDiagnostic[] = [];
    const outputs: Record<string, ExtensionOutputValue> = {};
    const targets: Array<{ slot: WorkerSlot; worker: ExtensionWorkerLike }> = [];

    for (const slot of this.slots.values()) {
      if (slot.status !== 'ready' || !slot.worker) continue;
      const declaresHook = (slot.entry.manifest.modules ?? []).some(
        (module) => module.hooks.includes(hook) && slot.modules.includes(module.id)
      );
      if (!declaresHook) continue;
      targets.push({ slot, worker: slot.worker });
    }

    if (targets.length === 0) {
      return { outputs, diagnostics, durationMs: 0, ran: false };
    }

    this.hookInFlight += 1;
    try {
      const results = await Promise.all(
        targets.map(({ slot, worker }) => this.runOnSlot(slot, worker, hook, payload, diagnostics))
      );
      for (const result of results) {
        for (const [key, value] of Object.entries(result.outputs)) {
          outputs[`${result.extensionId}:${key}`] = value;
        }
      }
    } finally {
      this.hookInFlight -= 1;
    }

    return {
      outputs,
      diagnostics,
      durationMs: Math.max(0, Math.round(this.now() - startedAt)),
      ran: true
    };
  }

  private runOnSlot(
    slot: WorkerSlot,
    worker: ExtensionWorkerLike,
    hook: ExtensionHook,
    payload: ExtensionHookPayload,
    diagnostics: ExtensionDiagnostic[]
  ): Promise<{ extensionId: string; outputs: Record<string, ExtensionOutputValue> }> {
    const extensionId = slot.entry.manifest.id;
    const canReadWorld = checkPermission(slot.entry.manifest, 'read:world').ok;
    const filteredPayload: ExtensionHookPayload = {
      time: payload.time,
      dt: payload.dt,
      ...(canReadWorld && payload.entities ? { entities: payload.entities } : {}),
      ...(canReadWorld && payload.values ? { values: payload.values } : {})
    };

    const requestId = `ext-${this.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        slot.pending.delete(requestId);
        this.failSlot(
          slot,
          `Extension "${slot.entry.manifest.name}" exceeded its ${this.timeoutMs} ms ${hook} budget and was stopped.`
        );
        diagnostics.push({
          code: EXTENSION_CODES.WORKER_TIMEOUT,
          severity: 'error',
          message: slot.error ?? 'Extension worker timed out.',
          extensionId
        });
        resolve({ extensionId, outputs: {} });
      }, this.timeoutMs);

      slot.pending.set(requestId, {
        requestId,
        hook,
        timer,
        resolve: (result) => {
          if (!result.ok && result.error) {
            // A worker that crashed or was terminated mid-hook is a fatal
            // runtime failure, not a recoverable hook exception: the controller
            // must pause the simulation (D-P10-02, D-P10-07).
            const fatal = slot.status === 'error';
            diagnostics.push({
              code: fatal ? EXTENSION_CODES.WORKER_FAILED : EXTENSION_CODES.HOOK_FAILED,
              severity: fatal ? 'error' : 'warning',
              message: `Extension "${slot.entry.manifest.name}" ${hook}: ${result.error}`,
              extensionId
            });
          }
          resolve({ extensionId, outputs: result.outputs });
        }
      });

      try {
        worker.postMessage({
          type: 'hook',
          protocolVersion: EXTENSION_PROTOCOL_VERSION,
          requestId,
          hook,
          payload: filteredPayload
        });
      } catch (error) {
        clearTimeout(timer);
        slot.pending.delete(requestId);
        resolve({ extensionId, outputs: {} });
        diagnostics.push({
          code: EXTENSION_CODES.WORKER_FAILED,
          severity: 'error',
          message: `Extension "${slot.entry.manifest.name}" could not receive ${hook}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          extensionId
        });
      }
    });
  }

  dispose(): void {
    this.disposed = true;
    for (const slot of this.slots.values()) {
      this.destroySlot(slot);
      for (const pending of slot.pending.values()) {
        clearTimeout(pending.timer);
      }
      slot.pending.clear();
    }
    this.slots.clear();
  }
}
