import type { StudioStore } from '../editor/store.js';
import type { ExtensionHost, ExtensionHostState } from './host.ts';
import type { ExtensionDiagnostic, ExtensionEntry, ExtensionHook } from './types.ts';
import { registerExtensionComponents, resetExtensionComponents } from './registry.ts';
import type { ExtensionHookPayload, ExtensionWorldEntity } from './protocol.ts';

export interface ExtensionControllerHandle {
  dispose(): void;
}

function entriesSignature(entries: readonly ExtensionEntry[]): string {
  return JSON.stringify(
    entries.map((entry) => ({
      id: entry.manifest.id,
      enabled: entry.enabled,
      manifest: entry.manifest,
      sourceLength: entry.source.length
    }))
  );
}

function errorDiagnostics(
  states: readonly ExtensionHostState[],
  diagnostics: readonly ExtensionDiagnostic[]
): ExtensionDiagnostic[] {
  const result = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').slice();
  for (const state of states) {
    if (state.status === 'error' && state.error) {
      result.push({
        code: 'EXTENSION_WORKER_FAILED',
        severity: 'error',
        message: state.error,
        extensionId: state.extensionId
      });
    }
  }
  return result;
}

/**
 * Keeps the extension registry, the worker host, and the store in sync.
 *
 * The controller is intentionally conservative: it does nothing when no
 * extension is installed, and it never blocks the fixed-step reducer. Worker
 * hooks run asynchronously between steps; a busy host drops a tick rather than
 * queueing unbounded work.
 */
export function attachExtensionController(store: StudioStore, host: ExtensionHost): ExtensionControllerHandle {
  let disposed = false;
  let lastSignature = '';
  let prevStatus = store.getSnapshot().runtime.status;
  let prevSession = store.getSnapshot().runtime.execution.sessionId;
  let prevElapsed = store.getSnapshot().runtime.elapsedSeconds;
  let hookInFlight = false;
  let syncing = false;
  const failureKeys = new Set<string>();

  function reportFailure(diagnostics: readonly ExtensionDiagnostic[]): void {
    const state = store.getSnapshot();
    if (state.runtime.status !== 'running') return;
    for (const diagnostic of diagnostics) {
      if (diagnostic.severity !== 'error') continue;
      const key = `${diagnostic.extensionId ?? 'unknown'}:${diagnostic.code}:${diagnostic.message}`;
      if (failureKeys.has(key)) continue;
      failureKeys.add(key);
      store.dispatch({
        type: 'runtime/extension-failure',
        code: diagnostic.code,
        message: diagnostic.message,
        ...(diagnostic.extensionId ? { extensionId: diagnostic.extensionId } : {})
      });
      return;
    }
  }

  function buildPayload(state: ReturnType<StudioStore['getSnapshot']>, dt: number): ExtensionHookPayload {
    const bodies = state.runtime.bodies;
    const entities: ExtensionWorldEntity[] = state.project.world.entities.map((entity) => {
      const body = bodies[entity.id];
      const position = body ? body.transform.position : entity.transform.position;
      return { id: entity.id, name: entity.name, position: { ...position } };
    });
    return {
      time: state.runtime.elapsedSeconds,
      dt,
      entities,
      values: { ...state.runtime.extensions.componentValues }
    };
  }

  function runHook(hook: ExtensionHook, dt: number): void {
    if (hookInFlight) return;
    if (host.listStates().every((state) => state.status !== 'ready')) return;
    hookInFlight = true;
    const payload = buildPayload(store.getSnapshot(), dt);
    void host
      .runHook(hook, payload)
      .then((result) => {
        if (disposed) return;
        store.dispatch({
          type: 'runtime/extension-output',
          outputs: result.outputs,
          diagnostics: result.diagnostics,
          lastTickMs: result.durationMs
        });
        reportFailure(result.diagnostics);
      })
      .catch((error) => {
        reportFailure([
          {
            code: 'EXTENSION_HOOK_FAILED',
            severity: 'error',
            message: error instanceof Error ? error.message : String(error)
          }
        ]);
      })
      .finally(() => {
        hookInFlight = false;
      });
  }

  function syncHost(entries: readonly ExtensionEntry[]): void {
    if (syncing) return;
    syncing = true;
    void host
      .sync(entries)
      .then((result) => {
        if (disposed) return;
        store.dispatch({
          type: 'runtime/extension-status',
          states: result.states,
          diagnostics: result.diagnostics
        });
        reportFailure(errorDiagnostics(result.states, result.diagnostics));
      })
      .catch((error) => {
        reportFailure([
          {
            code: 'EXTENSION_WORKER_FAILED',
            severity: 'error',
            message: error instanceof Error ? error.message : String(error)
          }
        ]);
      })
      .finally(() => {
        syncing = false;
      });
  }

  function pump(): void {
    if (disposed) return;
    const state = store.getSnapshot();
    const entries = state.project.extensions?.entries ?? [];

    if (entries.length === 0 && host.listStates().length === 0) {
      prevStatus = state.runtime.status;
      prevSession = state.runtime.execution.sessionId;
      prevElapsed = state.runtime.elapsedSeconds;
      return;
    }

    const signature = entriesSignature(entries);
    if (signature !== lastSignature) {
      lastSignature = signature;
      // Component types must be available before any graph validation or
      // Inspector render can resolve them.
      resetExtensionComponents();
      for (const entry of entries) {
        registerExtensionComponents(entry.manifest);
      }
      syncHost(entries);
    }

    const status = state.runtime.status;
    const session = state.runtime.execution.sessionId;
    const elapsed = state.runtime.elapsedSeconds;

    if (session !== prevSession) {
      if (status === 'editing') {
        // Stop returns to Editing and starts a new session.
        runHook('onStop', 0);
        failureKeys.clear();
      } else if (prevStatus === 'editing') {
        // Play from Editing starts a new session.
        runHook('onPlay', 0);
      } else {
        // Reset keeps the simulation Running/Paused but starts a new session.
        runHook('onReset', 0);
      }
    } else if (status === 'running') {
      if (prevStatus !== 'running') {
        // Resume (or a defensive restart) re-enters the play hook.
        runHook('onPlay', 0);
      } else if (elapsed > prevElapsed) {
        runHook('onTick', elapsed - prevElapsed);
      }
    } else if (status === 'editing' && prevStatus !== 'editing') {
      runHook('onStop', 0);
      failureKeys.clear();
    }

    prevStatus = status;
    prevSession = session;
    prevElapsed = elapsed;
  }

  const unsubscribe = store.subscribe(pump);
  pump();
  return {
    dispose() {
      disposed = true;
      unsubscribe();
      host.dispose();
    }
  };
}
