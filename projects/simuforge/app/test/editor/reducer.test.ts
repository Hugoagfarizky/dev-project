import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState } from '../../src/editor/reducer.ts';
import { createDefaultEditorState, createDefaultPersistenceState } from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';
import type { StudioCommand } from '../../src/editor/commands.ts';

const id = '11111111-1111-4111-8111-111111111111';

function initialState(): StudioState {
  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: { id: '22222222-2222-4222-8222-222222222222', name: 'Test', createdAt: '2026-11-06T00:00:00.000Z', updatedAt: '2026-11-06T00:00:00.000Z' },
      world: { format: 'simuforge.world', schemaVersion: 1, entities: [{ id, name: 'Cube', type: 'cube', transform: { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }, metadata: {} }] }
    },
    editor: { ...createDefaultEditorState(), selectedEntityId: id },
    persistence: createDefaultPersistenceState(),
    logs: []
  };
}

test('delete selected clears selection', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'entity/delete', id });
  assert.equal(next.editor.selectedEntityId, null);
  assert.equal(next.project.world.entities.length, 0);
});

test('open resets editor state', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'project/open', document: state.project });
  assert.equal(next.editor.selectedEntityId, null);
  assert.equal(next.persistence.revision, 0);
  assert.equal(next.persistence.savedRevision, 0);
});

test('editor commands do not dirty', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'selection/set', id: null });
  assert.equal(next.persistence.revision, state.persistence.revision);
});

test('authored commands dirty once', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'entity/rename', id, name: 'Renamed' });
  assert.equal(next.persistence.revision, state.persistence.revision + 1);
  assert.notEqual(next, state);
});

test('invalid transform is rejected', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'transform/set', id, transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 0, y: 1, z: 1 } }, source: 'inspector' });
  assert.equal(next, state);
});
