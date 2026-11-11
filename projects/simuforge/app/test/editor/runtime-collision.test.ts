import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import { createStudioStore } from '../../src/editor/store.ts';
import {
  createDefaultEditorState,
  createDefaultPersistenceState,
  createDefaultRuntimeState
} from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';
import { selectRenderWorld } from '../../src/editor/selectors.ts';
import { serializeProjectDocument } from '../../src/project/serialization.ts';
import { COLLISION_INVALID_COLLIDER, FIXED_TIMESTEP_SECONDS } from '../../src/runtime/physics.ts';
import type { Quat, RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_ID = '11111111-1111-4111-8111-111111111111';
const FLOOR_ID = '22222222-2222-4222-8222-222222222222';
const RIGID_BODY_ID = '33333333-3333-4333-8333-333333333333';
const FLOOR_RIGID_BODY_ID = '44444444-4444-4444-8444-444444444444';

const IDENTITY_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

function rigidBody(
  id: string,
  collider: RigidBodyComponent['collider'],
  overrides: Partial<RigidBodyComponent> = {}
): RigidBodyComponent {
  return {
    id,
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: true,
    collider,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...overrides
  };
}

function ballEntity(overrides: Partial<RigidBodyComponent> = {}): WorldEntity {
  return {
    id: BALL_ID,
    name: 'Ball',
    type: 'sphere',
    transform: {
      position: { x: 0, y: 5, z: 0 },
      rotation: { ...IDENTITY_ROTATION },
      scale: { ...UNIT_SCALE }
    },
    metadata: {},
    components: [rigidBody(RIGID_BODY_ID, { kind: 'sphere', size: 0.5 }, overrides)]
  };
}

function floorEntity(): WorldEntity {
  return {
    id: FLOOR_ID,
    name: 'Floor',
    type: 'plane',
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { ...IDENTITY_ROTATION },
      scale: { ...UNIT_SCALE }
    },
    metadata: {},
    components: [rigidBody(FLOOR_RIGID_BODY_ID, { kind: 'plane', size: { x: 100, y: 1, z: 100 } })]
  };
}

function initialState(entities: WorldEntity[] = [ballEntity(), floorEntity()]): StudioState {
  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Collision Test',
        createdAt: '2026-11-11T00:00:00.000Z',
        updatedAt: '2026-11-11T00:00:00.000Z'
      },
      world: {
        format: 'simuforge.world',
        schemaVersion: 1,
        entities
      }
    },
    editor: { ...createDefaultEditorState(), selectedEntityId: BALL_ID },
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState()
  };
}

function context(): ReducerContext {
  return {
    idFactory: () => '66666666-6666-4666-8666-666666666666',
    clock: () => '2026-11-11T00:00:00.000Z'
  };
}

function play(state: StudioState = initialState()): StudioState {
  return reduceStudioState(state, { type: 'runtime/play' }, context());
}

function step(state: StudioState, deltaSeconds = FIXED_TIMESTEP_SECONDS): StudioState {
  return reduceStudioState(state, { type: 'runtime/step', deltaSeconds }, context());
}

function runSteps(state: StudioState, count: number): StudioState {
  let current = state;
  for (let index = 0; index < count; index += 1) {
    current = step(current);
  }
  return current;
}

test('play and fixed steps stop the ball on the floor without mutating authored state', () => {
  const state = runSteps(play(), 120);
  const body = state.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
  assert.equal(state.project.world.entities[0]?.transform.position.y, 5);
  assert.equal(state.project.world.entities[1]?.transform.position.y, 0);
});

test('runtime/step does not mark the project dirty after a collision', () => {
  const state = runSteps(play(), 120);
  assert.equal(state.persistence.revision, 0);
  assert.equal(state.persistence.status, 'clean');
});

test('serialized project excludes runtime collision state', () => {
  const state = runSteps(play(), 120);
  const json = serializeProjectDocument(state.project);

  assert.equal(json.includes('"bodies"'), false);
  assert.equal(json.includes('"accumulatorSeconds"'), false);
  assert.equal(json.includes('"halfExtents"'), false);
  assert.equal(json.includes('"radius"'), false);

  const parsed = JSON.parse(json) as { world: { entities: Array<{ transform: { position: { y: number } } }> } };
  assert.equal(parsed.world.entities[0]?.transform.position.y, 5);
});

test('selectRenderWorld overlays the collided runtime position', () => {
  const state = runSteps(play(), 120);
  const rendered = selectRenderWorld(state);
  assert.equal(rendered.entities[0]?.transform.position.y, 0.5);
  assert.equal(state.project.world.entities[0]?.transform.position.y, 5);
});

test('runtime/reset restores the pre-collision runtime body', () => {
  const collided = runSteps(play(), 120);
  const reset = reduceStudioState(collided, { type: 'runtime/reset' }, context());
  const body = reset.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(reset.runtime.status, 'running');
  assert.equal(body.transform.position.y, 5);
  assert.equal(body.velocity.y, 0);
  assert.equal(reset.runtime.accumulatorSeconds, 0);
  assert.equal(reset.project.world.entities[0]?.transform.position.y, 5);
});

test('runtime/stop clears runtime collision state and restores authored state', () => {
  const collided = runSteps(play(), 120);
  const stopped = reduceStudioState(collided, { type: 'runtime/stop' }, context());

  assert.equal(stopped.runtime.status, 'editing');
  assert.deepEqual(stopped.runtime.bodies, {});
  assert.equal(stopped.runtime.snapshot, null);
  assert.equal(stopped.project.world.entities[0]?.transform.position.y, 5);
});

test('pause after contact freezes the resting body', () => {
  const collided = runSteps(play(), 120);
  const paused = reduceStudioState(collided, { type: 'runtime/pause' }, context());
  const stepped = step(paused);
  assert.equal(stepped, paused);
  assert.equal(stepped.runtime.bodies[BALL_ID]?.transform.position.y, 0.5);
});

test('resume after contact keeps the body resting on the floor', () => {
  const collided = runSteps(play(), 120);
  const paused = reduceStudioState(collided, { type: 'runtime/pause' }, context());
  const resumed = reduceStudioState(paused, { type: 'runtime/resume' }, context());
  const afterResume = step(resumed);
  const body = afterResume.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
});

test('structural edits remain blocked after a collision', () => {
  const collided = runSteps(play(), 120);
  const blocked = reduceStudioState(collided, {
    type: 'transform/set',
    id: BALL_ID,
    transform: {
      position: { x: 9, y: 9, z: 9 },
      rotation: { ...IDENTITY_ROTATION },
      scale: { ...UNIT_SCALE }
    },
    source: 'inspector'
  }, context());

  assert.equal(blocked.project.world.entities[0]?.transform.position.y, 5);
  assert.equal(blocked.logs.some((entry) => entry.code === 'STRUCTURAL_EDIT_BLOCKED'), true);
});

test('collision failure pauses safely, preserves the last valid state, and logs diagnostics', () => {
  const running = play();
  const body = running.runtime.bodies[BALL_ID];
  assert.ok(body);
  body.collider = { kind: 'sphere', radius: 0 };

  const failed = step(running);
  assert.equal(failed.runtime.status, 'paused');
  assert.equal(failed.runtime.bodies[BALL_ID]?.transform.position.y, 5);
  assert.equal(failed.runtime.bodies[BALL_ID]?.velocity.y, 0);
  assert.equal(failed.runtime.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
  assert.equal(failed.runtime.lastError?.code, COLLISION_INVALID_COLLIDER);
  assert.equal(failed.logs.length, 1);
  assert.equal(failed.logs[0]?.severity, 'error');
  assert.equal(failed.logs[0]?.source, 'RUNTIME');
  assert.equal(failed.logs[0]?.code, COLLISION_INVALID_COLLIDER);
  assert.equal(failed.project.world.entities[0]?.transform.position.y, 5);
});

test('stop recovers from a collision failure', () => {
  const running = play();
  const body = running.runtime.bodies[BALL_ID];
  assert.ok(body);
  body.velocity.y = Number.NaN;

  const failed = step(running);
  assert.equal(failed.runtime.status, 'paused');

  const stopped = reduceStudioState(failed, { type: 'runtime/stop' }, context());
  assert.equal(stopped.runtime.status, 'editing');
  assert.deepEqual(stopped.runtime.bodies, {});
  assert.equal(stopped.runtime.lastError, null);
  assert.equal(stopped.project.world.entities[0]?.transform.position.y, 5);
});

test('play with an invalid authored collider reports a diagnostic and stays editing', () => {
  const invalid = initialState([ballEntity({ collider: { kind: 'sphere', size: 0 } }), floorEntity()]);
  const state = play(invalid);

  assert.equal(state.runtime.status, 'editing');
  assert.deepEqual(state.runtime.bodies, {});
  assert.equal(state.runtime.lastError?.code, COLLISION_INVALID_COLLIDER);
  assert.equal(state.logs.length, 1);
  assert.equal(state.logs[0]?.code, COLLISION_INVALID_COLLIDER);
});

test('store-driven collision is deterministic across identical runs', () => {
  const first = createStudioStore(initialState());
  const second = createStudioStore(initialState());
  for (const store of [first, second]) {
    store.dispatch({ type: 'runtime/play' });
    for (let index = 0; index < 120; index += 1) {
      store.dispatch({ type: 'runtime/step', deltaSeconds: FIXED_TIMESTEP_SECONDS });
    }
  }

  assert.deepEqual(first.getSnapshot().runtime.bodies, second.getSnapshot().runtime.bodies);
  assert.equal(first.getSnapshot().runtime.bodies[BALL_ID]?.transform.position.y, 0.5);
});
