import type { StudioStore } from '../editor/store.js';

export interface PerformanceSample {
  entityCount: number;
  meshCount: number;
  frameCount: number;
  medianFrameMs: number;
  p95FrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
  rendererErrors: number;
}

export async function samplePerformance(
  store: StudioStore,
  entityCount: number,
  frames = 120
): Promise<PerformanceSample> {
  // Create entities up to entityCount.
  const current = store.getSnapshot().project.world.entities.length;
  for (let i = current; i < entityCount; i += 1) {
    store.dispatch({ type: 'entity/create', entityType: 'cube' });
  }
  // Remove excess.
  while (store.getSnapshot().project.world.entities.length > entityCount) {
    const id = store.getSnapshot().project.world.entities[store.getSnapshot().project.world.entities.length - 1]?.id;
    if (id) store.dispatch({ type: 'entity/delete', id });
    else break;
  }

  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));

  const intervals: number[] = [];
  let last = performance.now();
  let count = 0;
  await new Promise<void>((resolve) => {
    function tick() {
      const now = performance.now();
      intervals.push(now - last);
      last = now;
      count += 1;
      if (count < frames) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)] ?? 0;
  const p95 = intervals[Math.floor(intervals.length * 0.95)] ?? 0;

  return {
    entityCount: store.getSnapshot().project.world.entities.length,
    meshCount: store.getSnapshot().project.world.entities.length,
    frameCount: intervals.length,
    medianFrameMs: median,
    p95FrameMs: p95,
    minFrameMs: intervals[0] ?? 0,
    maxFrameMs: intervals[intervals.length - 1] ?? 0,
    rendererErrors: 0
  };
}