import type { StudioCommand } from './commands.ts';
import { reduceStudioState, type ReducerContext } from './reducer.ts';
import type { StudioState } from './state.ts';

export interface StudioStore {
  getSnapshot(): StudioState;
  subscribe(listener: () => void): () => void;
  dispatch(command: StudioCommand, context?: ReducerContext): void;
}

export function createStudioStore(
  initialState: StudioState,
  reducer: (state: StudioState, command: StudioCommand, context?: ReducerContext) => StudioState = reduceStudioState,
  context?: ReducerContext
): StudioStore {
  let snapshot = initialState;
  const listeners = new Set<() => void>();

  return {
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(command, overrideContext) {
      const next = reducer(snapshot, command, overrideContext ?? context);
      if (next !== snapshot) {
        snapshot = next;
        for (const listener of listeners) {
          listener();
        }
      }
    }
  };
}
