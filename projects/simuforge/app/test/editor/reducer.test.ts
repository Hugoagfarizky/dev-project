import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import { createDefaultEditorState, createDefaultPersistenceState } from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';

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

function emptyState(): StudioState {
  return {
    ...initialState(),
    project: {
      ...initialState().project,
      world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
    },
    editor: createDefaultEditorState()
  };
}

function context(...ids: string[]): ReducerContext {
  let index = 0;
  return {
    idFactory: () => ids[Math.min(index++, ids.length - 1)],
    clock: () => '2026-11-08T00:00:00.000Z'
  };
}

test('delete selected clears selection', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'entity/delete', id });
  assert.equal(next.editor.selectedEntityId, null);
  assert.equal(next.project.world.entities.length, 0);
});

test('delete of a non-selected entity preserves the valid selection', () => {
  const state = initialState();
  const otherId = '33333333-3333-4333-8333-333333333333';
  const withTwo = reduceStudioState(state, { type: 'entity/create', entityType: 'sphere' }, context(otherId));
  const next = reduceStudioState({ ...withTwo, editor: { ...withTwo.editor, selectedEntityId: otherId } }, { type: 'entity/delete', id });
  assert.equal(next.editor.selectedEntityId, otherId);
  assert.equal(next.project.world.entities.length, 1);
  assert.equal(next.project.world.entities[0]?.id, otherId);
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

test('entity/create selects the new entity', () => {
  const state = emptyState();
  const newId = '44444444-4444-4444-8444-444444444444';
  const next = reduceStudioState(state, { type: 'entity/create', entityType: 'cube' }, context(newId));
  assert.equal(next.project.world.entities.length, 1);
  assert.equal(next.project.world.entities[0]?.id, newId);
  assert.equal(next.editor.selectedEntityId, newId);
});

test('entity/create uses the POC-01 default transforms', () => {
  const state = emptyState();
  const next = reduceStudioState(state, { type: 'entity/create', entityType: 'plane' }, context('44444444-4444-4444-8444-444444444444'));
  assert.deepEqual(next.project.world.entities[0]?.transform, {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 }
  });
});

test('default names use the numeric suffix sequence', () => {
  let state = emptyState();
  const ctx = context('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3');
  state = reduceStudioState(state, { type: 'entity/create', entityType: 'cube' }, ctx);
  state = reduceStudioState(state, { type: 'entity/create', entityType: 'cube' }, ctx);
  state = reduceStudioState(state, { type: 'entity/create', entityType: 'cube' }, ctx);
  assert.deepEqual(state.project.world.entities.map((entity) => entity.name), ['Cube', 'Cube 2', 'Cube 3']);
  assert.equal(new Set(state.project.world.entities.map((entity) => entity.id)).size, 3);
});

test('default name suffix is applied per primitive base name and skips used names', () => {
  let state = emptyState();
  const cubesContext = context('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
  state = reduceStudioState(state, { type: 'entity/create', entityType: 'sphere' }, cubesContext);
  state = reduceStudioState(state, { type: 'entity/create', entityType: 'sphere' }, cubesContext);
  state = reduceStudioState(state, { type: 'entity/create', entityType: 'plane' }, context('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3'));
  assert.deepEqual(state.project.world.entities.map((entity) => entity.name), ['Sphere', 'Sphere 2', 'Plane']);

  const renamed = reduceStudioState(state, { type: 'entity/rename', id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', name: 'Sphere 3' });
  const next = reduceStudioState(renamed, { type: 'entity/create', entityType: 'sphere' }, context('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb4'));
  assert.deepEqual(next.project.world.entities.map((entity) => entity.name), ['Sphere', 'Sphere 3', 'Plane', 'Sphere 2']);
});

test('entity/create keeps editor references stable and only replaces the world', () => {
  const state = emptyState();
  const next = reduceStudioState(state, { type: 'entity/create', entityType: 'cube' }, context('cccccccc-cccc-4ccc-8ccc-cccccccccccc'));
  assert.notEqual(next.project, state.project);
  assert.notEqual(next.project.world, state.project.world);
  assert.equal(next.project.project, state.project.project);
  assert.notEqual(next.editor, state.editor);
  assert.equal(next.persistence.revision, state.persistence.revision + 1);
});

test('rename trims whitespace and preserves entity id and transform', () => {
  const state = initialState();
  const before = state.project.world.entities[0];
  const next = reduceStudioState(state, { type: 'entity/rename', id, name: '  Hero Cube  ' });
  const after = next.project.world.entities[0];
  assert.equal(after?.name, 'Hero Cube');
  assert.equal(after?.id, before?.id);
  assert.deepEqual(after?.transform, before?.transform);
  assert.equal(after?.type, before?.type);
});

test('rename rejects empty, whitespace-only and over-length names', () => {
  const state = initialState();
  for (const name of ['', '   ', '\t\n', 'x'.repeat(129)]) {
    const next = reduceStudioState(state, { type: 'entity/rename', id, name });
    assert.equal(next, state, `expected state identity for ${JSON.stringify(name)}`);
  }
});

test('rename accepts names up to 128 characters after trimming', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'entity/rename', id, name: `  ${'x'.repeat(128)}  ` });
  assert.equal(next.project.world.entities[0]?.name.length, 128);
});

test('rename allows duplicate names and keeps identity by id', () => {
  const state = initialState();
  const otherId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const withOther = reduceStudioState(state, { type: 'entity/create', entityType: 'sphere' }, context(otherId));
  const next = reduceStudioState(withOther, { type: 'entity/rename', id: otherId, name: 'Cube' });
  assert.deepEqual(next.project.world.entities.map((entity) => entity.name), ['Cube', 'Cube']);
  assert.deepEqual(next.project.world.entities.map((entity) => entity.id), [id, otherId]);
});

test('rename to the same normalized name is a no-op', () => {
  const state = initialState();
  const next = reduceStudioState(state, { type: 'entity/rename', id, name: '  Cube  ' });
  assert.equal(next, state);
});

test('selection, gizmo, grid and preset updates preserve domain references', () => {
  const state = initialState();
  const commands = [
    { type: 'selection/set', id: null },
    { type: 'gizmo/set-mode', mode: 'rotate' },
    { type: 'grid/set-visible', visible: false },
    { type: 'preset/set', preset: 'simulate' }
  ] as const;

  let next = state;
  for (const command of commands) {
    next = reduceStudioState(next, command);
    assert.equal(next.project, state.project);
    assert.equal(next.project.world, state.project.world);
    assert.equal(next.project.world.entities, state.project.world.entities);
    assert.equal(next.persistence, state.persistence);
    assert.equal(next.logs, state.logs);
  }
});

test('camera updates only replace the camera pose', () => {
  const state = initialState();
  const next = reduceStudioState(state, {
    type: 'camera/set',
    pose: { alpha: 1, beta: 1.2, radius: 8, target: { x: 0, y: 0.5, z: 0 } }
  });
  assert.notEqual(next, state);
  assert.equal(next.project, state.project);
  assert.equal(next.project.world, state.project.world);
  assert.equal(next.project.world.entities, state.project.world.entities);
  assert.notEqual(next.editor, state.editor);
  assert.deepEqual(next.editor.camera, { alpha: 1, beta: 1.2, radius: 8, target: { x: 0, y: 0.5, z: 0 } });

  const same = reduceStudioState(next, {
    type: 'camera/set',
    pose: { alpha: 1, beta: 1.2, radius: 8, target: { x: 0, y: 0.5, z: 0 } }
  });
  assert.equal(same, next);
});

test('rename and transform only replace the matching entity object', () => {
  const state = initialState();
  const otherId = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const withOther = reduceStudioState(state, { type: 'entity/create', entityType: 'sphere' }, context(otherId));
  const originalOther = withOther.project.world.entities.find((entity) => entity.id === otherId);

  const renamed = reduceStudioState(withOther, { type: 'entity/rename', id, name: 'Renamed' });
  assert.equal(renamed.project.world.entities.find((entity) => entity.id === otherId), originalOther);
  assert.notEqual(renamed.project.world.entities.find((entity) => entity.id === id), state.project.world.entities[0]);

  const transformed = reduceStudioState(renamed, {
    type: 'transform/set',
    id: otherId,
    source: 'inspector',
    transform: { position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }
  });
  assert.equal(transformed.project.world.entities.find((entity) => entity.id === id), renamed.project.world.entities.find((entity) => entity.id === id));
  assert.notEqual(transformed.project.world.entities.find((entity) => entity.id === otherId), originalOther);
});

test('log updates preserve project and editor references', () => {
  const state = initialState();
  const next = reduceStudioState(state, {
    type: 'log/append',
    entry: { id: 'log-1', severity: 'info', source: 'EDITOR', message: 'Hello', timestamp: '2026-11-08T00:00:00.000Z' }
  });
  assert.equal(next.project, state.project);
  assert.equal(next.editor, state.editor);
  assert.equal(next.logs.length, 1);
});

test('save-status updates preserve domain references', () => {
  const state = initialState();
  const started = reduceStudioState(state, { type: 'project/save-started' });
  const succeeded = reduceStudioState(started, { type: 'project/save-succeeded', at: '2026-11-08T00:00:00.000Z', revision: 1 });
  const failed = reduceStudioState(succeeded, { type: 'project/save-failed', error: { code: 'SAVE_FAILED', message: 'boom' } });

  for (const next of [started, succeeded, failed]) {
    assert.equal(next.project, state.project);
    assert.equal(next.project.world, state.project.world);
    assert.equal(next.project.world.entities, state.project.world.entities);
    assert.equal(next.editor, state.editor);
    assert.equal(next.logs, state.logs);
  }
  assert.equal(started.persistence.status, 'saving');
  assert.equal(succeeded.persistence.status, 'clean');
  assert.equal(failed.persistence.status, 'save-failed');
});
