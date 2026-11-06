import type { StudioState } from './state.ts';

export function isDirty(state: StudioState): boolean {
  return state.persistence.revision !== state.persistence.savedRevision;
}

export function markDirtyRevision(state: StudioState): StudioState {
  return {
    ...state,
    persistence: {
      ...state.persistence,
      revision: state.persistence.revision + 1,
      status: 'dirty'
    }
  };
}
