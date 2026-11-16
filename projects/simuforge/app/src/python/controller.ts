import type { StudioStore } from '../editor/store.js';
import { PythonRuntime } from './runtime.ts';
import { findPythonScript } from './validation.ts';
import type { PendingPythonExecution } from '../editor/state.ts';
import type { PythonRunOutcome } from './types.ts';

export interface PythonControllerHandle {
  dispose(): void;
}

export function attachPythonController(store: StudioStore, runtime: PythonRuntime): PythonControllerHandle {
  let handledLoad = 0;
  let inFlight: { requestId: string; settled: boolean } | null = null;

  function pump() {
    const state = store.getSnapshot();
    const python = state.python;
    if (python && python.loadRequest > handledLoad) {
      handledLoad = python.loadRequest;
      void runtime
        .ensureReady()
        .then(() => {
          store.dispatch({ type: 'python/runtime-status', status: runtime.getStatus(), detail: null });
        })
        .catch((error) => {
          store.dispatch({
            type: 'python/runtime-status',
            status: 'error',
            detail: error instanceof Error ? error.message : String(error)
          });
        });
    }

    const pending = state.runtime.execution.pendingPython;

    if (inFlight && !inFlight.settled && (!pending || pending.requestId !== inFlight.requestId)) {
      runtime.cancel();
      inFlight = null;
    }

    if (pending && (!inFlight || inFlight.requestId !== pending.requestId)) {
      const script = findPythonScript(state.project.python, pending.scriptId);
      if (!script) {
        return;
      }
      const run = { requestId: pending.requestId, settled: false };
      inFlight = run;
      void runtime.run(script.source, pending.snapshot).then((outcome: PythonRunOutcome) => {
        run.settled = true;
        store.dispatch({ type: 'runtime/python-result', requestId: pending.requestId, outcome });
      });
    }
  }

  const unsubscribe = store.subscribe(pump);
  pump();
  return {
    dispose() {
      unsubscribe();
      runtime.dispose();
    }
  };
}

export function pythonEditorState(state: { python?: { loadRequest: number } } | null): number {
  return state?.python?.loadRequest ?? 0;
}

export function isPendingPython(value: PendingPythonExecution | null | undefined): value is PendingPythonExecution {
  return value != null;
}