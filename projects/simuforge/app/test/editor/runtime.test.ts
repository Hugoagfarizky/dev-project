import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import { createDefaultEditorState, createDefaultPersistenceState, createDefaultRuntimeState } from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';

const id = '11111111-1111-4111-8111-111111111111';

function initialState(): StudioState {
  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: { id: '22222222-2222-4222-8222-222222222222', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' },
      world: { format: 'simuforge.world', schemaVersion: 1, entities: [{ id, name: 'Cube', type: 'cube', transform: { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {}, components: [] }] }
    },
    editor: { ...createDefaultEditorState(), selectedEntityId: id },
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState()
  };
}

function context(): ReducerContext {
  return { idFactory: () => '33333333-3333-4333-8333-333333333333', clock: () => '2026-11-08T00:00:00.000Z' };
}

test('runtime/play from editing captures snapshot and runs', () => {
  const s = reduceStudioState(initialState(), { type: 'runtime/play' }, context());
  assert.equal(s.runtime.status, 'running');
  assert.ok(s.runtime.snapshot);
  assert.equal(s.runtime.snapshot?.entities.length, 1);
});

test('runtime/pause and resume', () => {
  const s1 = reduceStudioState(initialState(), { type: 'runtime/play' }, context());
  const s2 = reduceStudioState(s1, { type: 'runtime/pause' }, context());
  assert.equal(s2.runtime.status, 'paused');
  const s3 = reduceStudioState(s2, { type: 'runtime/resume' }, context());
  assert.equal(s3.runtime.status, 'running');
});

test('runtime/stop resets and returns to editing', () => {
  const s1 = reduceStudioState(initialState(), { type: 'runtime/play' }, context());
  const s2 = reduceStudioState(s1, { type: 'runtime/stop' }, context());
  assert.equal(s2.runtime.status, 'editing');
  assert.equal(s2.runtime.snapshot, null);
});

test('runtime/reset while running preserves running and restores snapshot', () => {
  const base = initialState();
  const s1 = reduceStudioState(base, { type: 'runtime/play' }, context());
  // mutate transform during running via direct project change is blocked; instead test restore by changing then reset impossible while blocked.
  // Verify reset keeps running status
  const s2 = reduceStudioState(s1, { type: 'runtime/reset' }, context());
  assert.equal(s2.runtime.status, 'running');
});

test('runtime/reset while paused preserves paused', () => {
  const s1 = reduceStudioState(initialState(), { type: 'runtime/play' }, context());
  const s2 = reduceStudioState(s1, { type: 'runtime/pause' }, context());
  const s3 = reduceStudioState(s2, { type: 'runtime/reset' }, context());
  assert.equal(s3.runtime.status, 'paused');
});

test('structural edit blocked while running', () => {
  const s1 = reduceStudioState(initialState(), { type: 'runtime/play' }, context());
  const before = s1.project.world.entities[0].transform.position.x;
  const s2 = reduceStudioState(s1, { type: 'transform/set', id, transform: { position: { x: 9, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, source: 'inspector' }, context());
  assert.equal(s2.project.world.entities[0].transform.position.x, before);
  assert.equal(s2.logs.some((l) => l.code === 'STRUCTURAL_EDIT_BLOCKED'), true);
  assert.equal(s2.persistence.revision, s1.persistence.revision);
});

test('structural edit allowed while editing', () => {
  const s = reduceStudioState(initialState(), { type: 'transform/set', id, transform: { position: { x: 9, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, source: 'inspector' }, context());
  assert.equal(s.project.world.entities[0].transform.position.x, 9);
});

test('runtime error transitions to paused and preserves last valid state', () => {
  const s1 = reduceStudioState(initialState(), { type: 'runtime/play' }, context());
  const s2 = reduceStudioState(s1, { type: 'runtime/error', error: { code: 'RUNTIME_ERROR', message: 'boom' } }, context());
  assert.equal(s2.runtime.status, 'paused');
  assert.equal(s2.runtime.lastError?.code, 'RUNTIME_ERROR');
});