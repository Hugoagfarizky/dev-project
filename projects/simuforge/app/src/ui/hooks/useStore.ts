import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { StudioStore } from '../../editor/store.ts';
import type { StudioState } from '../../editor/state.ts';

interface SelectionCache<T> {
  store: StudioStore | null;
  state: StudioState | null;
  hasValue: boolean;
  value: T | undefined;
}

/**
 * Subscribes a component to a slice of the studio store.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return a referentially
 * stable value for an unchanged store snapshot. The cache guarantees that
 * contract, so selectors may derive objects or arrays without causing render
 * loops. Selectors must be pure functions of state (module-level constants are
 * preferred).
 */
export function useStudioStore<T>(store: StudioStore, selector: (state: StudioState) => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const cacheRef = useRef<SelectionCache<T>>({
    store: null,
    state: null,
    hasValue: false,
    value: undefined
  });

  const getSelection = useCallback(() => {
    const cache = cacheRef.current;
    const state = store.getSnapshot();

    if (cache.store !== store) {
      cache.store = store;
      cache.state = null;
      cache.hasValue = false;
      cache.value = undefined;
    }

    if (cache.hasValue && cache.state === state) {
      return cache.value as T;
    }

    const value = selectorRef.current(state);
    cache.state = state;
    cache.value = value;
    cache.hasValue = true;
    return value;
  }, [store]);

  return useSyncExternalStore(store.subscribe, getSelection);
}
