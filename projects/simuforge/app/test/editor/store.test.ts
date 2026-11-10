import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStudioStore } from '../../src/editor/store.ts';
import { reduceStudioState } from '../../src/editor/reducer.ts';
import { createDefaultEditorState, createDefaultPersistenceState, createDefaultRuntimeState } from '../../src/editor/state.ts';
import { selectEntities, selectSelectedEntityId } from '../../src/editor/selectors.ts';
import type { StudioState } from '../../src/editor/state.ts';
import type { ReducerContext } from '../../src/editor/reducer.ts';

function initialState(): StudioState {
  return {
    project: { format: 'simuforge.project', schemaVersion: 1, project: { id: '22222222-2222-4222-8222-222222222222', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' }, world: { format: 'simuforge.world', schemaVersion: 1, entities: [] } },
    editor: createDefaultEditorState(),
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState()
  };
}

function context(id: string): ReducerContext {
  return { idFactory: () => id, clock: () => '2026-11-08T00:00:00.000Z' };
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

test('repeated getSnapshot calls return the same reference', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  assert.equal(store.getSnapshot(), store.getSnapshot());
  store.dispatch({ type: 'camera/set', pose: { alpha: 1, beta: 1, radius: 5, target: { x: 0, y: 0, z: 0 } } });
  assert.equal(store.getSnapshot(), store.getSnapshot());
});

test('camera-only updates do not replace domain state', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  const before = store.getSnapshot();
  store.dispatch({ type: 'camera/set', pose: { alpha: 1, beta: 1, radius: 5, target: { x: 0, y: 0, z: 0 } } });
  const after = store.getSnapshot();
  assert.notEqual(after, before);
  assert.equal(after.project, before.project);
  assert.equal(after.project.world, before.project.world);
  assert.equal(after.project.world.entities, before.project.world.entities);
  assert.equal(after.persistence, before.persistence);
  assert.equal(after.logs, before.logs);
});

test('selection-only updates do not replace world or entity references', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  const newId = '44444444-4444-4444-8444-444444444444';
  store.dispatch({ type: 'entity/create', entityType: 'cube' }, context(newId));
  const before = store.getSnapshot();
  store.dispatch({ type: 'selection/set', id: null });
  const after = store.getSnapshot();
  assert.equal(after.project, before.project);
  assert.equal(after.project.world, before.project.world);
  assert.equal(after.project.world.entities, before.project.world.entities);
  assert.equal(selectEntities(after), selectEntities(before));
  assert.equal(selectSelectedEntityId(after), null);
});

test('entity-only updates replace only changed entity references', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  const first = '44444444-4444-4444-8444-444444444444';
  const second = '55555555-5555-4555-8555-555555555555';
  const ctx = (() => {
    const ids = [first, second];
    let index = 0;
    return { idFactory: () => ids[index++] as string, clock: () => '2026-11-08T00:00:00.000Z' };
  })();
  store.dispatch({ type: 'entity/create', entityType: 'cube' }, ctx);
  store.dispatch({ type: 'entity/create', entityType: 'cube' }, ctx);
  const before = store.getSnapshot();
  const untouched = before.project.world.entities[1];
  store.dispatch({ type: 'entity/rename', id: first, name: 'Renamed' });
  const after = store.getSnapshot();
  assert.equal(after.project.world.entities[1], untouched);
  assert.notEqual(after.project.world.entities[0], before.project.world.entities[0]);
  assert.equal(after.project.world.entities[0]?.name, 'Renamed');
  assert.equal(after.project.world.entities[0]?.id, first);
  assert.equal(after.persistence.revision, before.persistence.revision + 1);
});

test('each subscription listener is called once per committed change', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  let countA = 0;
  let countB = 0;
  const unsubscribeA = store.subscribe(() => { countA += 1; });
  const unsubscribeB = store.subscribe(() => { countB += 1; });
  store.dispatch({ type: 'camera/set', pose: { alpha: 1, beta: 1, radius: 5, target: { x: 0, y: 0, z: 0 } } });
  assert.equal(countA, 1);
  assert.equal(countB, 1);
  store.dispatch({ type: 'camera/set', pose: { alpha: 1, beta: 1, radius: 5, target: { x: 0, y: 0, z: 0 } } });
  assert.equal(countA, 1);
  assert.equal(countB, 1);
  unsubscribeA();
  unsubscribeB();
});

test('snapshot mutations never leak into the previous snapshot', () => {
  const store = createStudioStore(initialState(), reduceStudioState);
  const before = store.getSnapshot();
  store.dispatch({ type: 'entity/create', entityType: 'cube' }, context('66666666-6666-4666-8666-666666666666'));
  const after = store.getSnapshot();
  assert.equal(before.project.world.entities.length, 0);
  assert.equal(after.project.world.entities.length, 1);
  assert.notEqual(before.project.world, after.project.world);
});
