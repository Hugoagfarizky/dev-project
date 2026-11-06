import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudioStore } from '../../src/editor/store.ts';
import { reduceStudioState } from '../../src/editor/reducer.ts';
import type { StudioState } from '../../src/editor/state.ts';

function initialState(): StudioState {
  return {
    project: { format: 'simuforge.project', schemaVersion: 1, project: { id: '22222222-2222-4222-8222-222222222222', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' }, world: { format: 'simuforge.world', schemaVersion: 1, entities: [] } },
    editor: { selectedEntityId: null, gizmoMode: 'translate', gridVisible: true, activePreset: 'build', camera: null },
    persistence: { revision: 0, savedRevision: 0, status: 'clean', lastSavedAt: null, lastError: null },
    logs: []
  };
}

test('snapshot identity is stable until a change', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  const first = store.getSnapshot();
  store.dispatch({ type: 'selection/set', id: null });
  const second = store.getSnapshot();
  assert.equal(first, second);
});

test('subscribers are not notified on no-op', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  store.dispatch({ type: 'selection/set', id: null });
  assert.equal(notifications, 0);
  unsubscribe();
});

test('unsubscribe works', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  unsubscribe();
  store.dispatch({ type: 'project/new', name: 'New Project' });
  assert.equal(notifications, 0);
});
