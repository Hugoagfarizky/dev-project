import { useSyncExternalStore } from 'react';
import type { StudioStore } from '../../editor/store.ts';
import type { StudioState } from '../../editor/state.ts';

export function useStudioStore<T>(store: StudioStore, selector: (state: StudioState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getSnapshot())
  );
}
