import { useEffect, useRef } from 'react';
import type { StudioStore } from '../../editor/store.js';

/**
 * Drives the M1-C fixed-step simulation while the runtime is running.
 * Each animation frame reports its delta to the reducer, which owns the
 * accumulator and only advances whole fixed timesteps.
 */
export function useSimulationLoop(store: StudioStore, running: boolean): void {
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (!running) {
      return;
    }

    let frame = 0;
    let last = performance.now();

    const tick = (now: number): void => {
      const deltaSeconds = (now - last) / 1000;
      last = now;
      storeRef.current.dispatch({ type: 'runtime/step', deltaSeconds });
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);
}
