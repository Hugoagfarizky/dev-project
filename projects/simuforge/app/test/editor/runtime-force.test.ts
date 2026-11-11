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
import { serializeProjectDocument } from '../../src/project/serialization.ts';
import {
  FIXED_TIMESTEP_SECONDS,
  FORCE_APPLIED,
  FORCE_CLEARED,
  FORCE_INVALID_INPUT,
  FORCE_INVALID_MASS,
  FORCE_INVALID_STATE,
  FORCE_INVALID_TARGET,
  IMPULSE_APPLIED,
  IMPULSE_INVALID_INPUT,
  IMPULSE_INVALID_STATE,
  IMPULSE_INVALID_TARGET,
  RUNTIME_NOT_ACTIVE
} from '../../src/runtime/physics.ts';
import type { Quat, RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_BALL_ID = '22222222-2222-4222-8222-222222222222';
const FLOOR_ID = '33333333-3333-4333-8333-333333333333';
const RIGID_BODY_ID = '44444444-4444-4444-8444-444444444444';
const FLOOR_RIGID_BODY_ID = '55555555-5555-4555-8555-555555555555';

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

function ballEntity(
  id: string = BALL_ID,
  overrides: Partial<RigidBodyComponent> = {},
  position: Vec3 = { x: 0, y: 5, z: 0 }
): WorldEntity {
  return {
    id,
    name: id,
    type: 'sphere',
    transform: {
      position: { ...position },
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
        id: '66666666-6666-4666-8666-666666666666',
        name: 'Force Test',
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
    idFactory: () => '77777777-7777-4777-8777-777777777777',
    clock: () => '2026-11-11T00:00:00.000Z'
  };
}

function play(state: StudioState = initialState()): StudioState {
  return reduceStudioState(state, { type: 'runtime/play' }, context());
}

function pause(state: StudioState): StudioState {
  return reduceStudioState(state, { type: 'runtime/pause' }, context());
}

function resume(state: StudioState): StudioState {
  return reduceStudioState(state, { type: 'runtime/resume' }, context());
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

function applyForce(state: StudioState, entityId: string, force: Vec3): StudioState {
  return reduceStudioState(state, { type: 'runtime/apply-force', entityId, force }, context());
}

function applyImpulse(state: StudioState, entityId: string, impulse: Vec3): StudioState {
  return reduceStudioState(state, { type: 'runtime/apply-impulse', entityId, impulse }, context());
}

function clearForce(state: StudioState, entityId?: string): StudioState {
  return reduceStudioState(
    state,
    entityId === undefined ? { type: 'runtime/clear-force' } : { type: 'runtime/clear-force', entityId },
    context()
  );
}

function lastLog(state: StudioState) {
  return state.logs[state.logs.length - 1];
}

test('runtime/apply-force while running stores a persistent force and logs info', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const applied = applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 });
  const body = applied.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(applied.runtime.status, 'running');
  assert.deepEqual(body.force, { x: 0, y: 10, z: 0 });
  assert.equal(lastLog(applied)?.severity, 'info');
  assert.equal(lastLog(applied)?.source, 'RUNTIME');
  assert.equal(lastLog(applied)?.code, FORCE_APPLIED);
  assert.equal(lastLog(applied)?.entityId, BALL_ID);

  const after = runSteps(applied, 10);
  assert.ok((after.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) > 5);
  assert.ok((after.runtime.bodies[BALL_ID]?.velocity.y ?? 0) > 0);
});

test('runtime/apply-force accumulates repeated applications', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const first = applyForce(running, BALL_ID, { x: 1, y: 2, z: 3 });
  const second = applyForce(first, BALL_ID, { x: 4, y: 5, z: 6 });

  assert.deepEqual(second.runtime.bodies[BALL_ID]?.force, { x: 5, y: 7, z: 9 });
  assert.equal(second.logs.filter((entry) => entry.code === FORCE_APPLIED).length, 2);
});

test('runtime/apply-force while paused stores the force without stepping', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const paused = pause(running);
  const applied = applyForce(paused, BALL_ID, { x: 0, y: 10, z: 0 });

  assert.equal(applied.runtime.status, 'paused');
  assert.deepEqual(applied.runtime.bodies[BALL_ID]?.force, { x: 0, y: 10, z: 0 });
  assert.equal(step(applied), applied);

  const afterResume = step(resume(applied));
  assert.ok((afterResume.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) > 5);
});

test('runtime/apply-impulse while running changes velocity immediately without moving the body', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const applied = applyImpulse(running, BALL_ID, { x: 0, y: 10, z: 0 });
  const body = applied.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(applied.runtime.status, 'running');
  assert.equal(body.velocity.y, 10);
  assert.equal(body.transform.position.y, 5);
  assert.equal(lastLog(applied)?.severity, 'info');
  assert.equal(lastLog(applied)?.code, IMPULSE_APPLIED);

  const after = step(applied);
  assert.ok((after.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) > 5);
  assert.equal(after.runtime.bodies[BALL_ID]?.velocity.y, 10);
});

test('runtime/apply-impulse while paused changes velocity immediately and resumes with it', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const paused = pause(running);
  const applied = applyImpulse(paused, BALL_ID, { x: 0, y: 10, z: 0 });

  assert.equal(applied.runtime.status, 'paused');
  assert.equal(applied.runtime.bodies[BALL_ID]?.velocity.y, 10);
  assert.equal(step(applied), applied);

  const afterResume = step(resume(applied));
  assert.ok((afterResume.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) > 5);
  assert.equal(afterResume.runtime.bodies[BALL_ID]?.velocity.y, 10);
});

test('runtime/clear-force stops persistent acceleration and logs info', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const withForce = applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 });
  const afterOne = step(withForce);
  const velocityBeforeClear = afterOne.runtime.bodies[BALL_ID]?.velocity.y;
  assert.ok(velocityBeforeClear !== undefined);

  const cleared = clearForce(afterOne, BALL_ID);
  assert.deepEqual(cleared.runtime.bodies[BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.equal(lastLog(cleared)?.severity, 'info');
  assert.equal(lastLog(cleared)?.code, FORCE_CLEARED);

  const afterTwo = step(cleared);
  assert.equal(afterTwo.runtime.bodies[BALL_ID]?.velocity.y, velocityBeforeClear);
});

test('runtime/clear-force clears all runtime forces when no target is specified', () => {
  const running = play(initialState([
    ballEntity(BALL_ID, { useGravity: false }),
    ballEntity(OTHER_BALL_ID, { useGravity: false }, { x: 2, y: 5, z: 0 }),
    floorEntity()
  ]));
  const withForces = applyForce(
    applyForce(running, BALL_ID, { x: 1, y: 0, z: 0 }),
    OTHER_BALL_ID,
    { x: 0, y: 2, z: 0 }
  );
  const cleared = clearForce(withForces);

  assert.deepEqual(cleared.runtime.bodies[BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.deepEqual(cleared.runtime.bodies[OTHER_BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.equal(lastLog(cleared)?.code, FORCE_CLEARED);
});

test('force and impulse are rejected while editing with warnings and no runtime mutation', () => {
  const state = initialState();
  const forceResult = applyForce(state, BALL_ID, { x: 0, y: 1, z: 0 });
  const impulseResult = applyImpulse(state, BALL_ID, { x: 0, y: 1, z: 0 });
  const clearResult = clearForce(state);

  for (const result of [forceResult, impulseResult, clearResult]) {
    assert.equal(result.runtime.status, 'editing');
    assert.deepEqual(result.runtime.bodies, {});
    assert.equal(result.runtime.lastError, null);
    assert.equal(lastLog(result)?.severity, 'warn');
    assert.equal(lastLog(result)?.code, RUNTIME_NOT_ACTIVE);
  }
});

test('invalid force input is a warning with no partial runtime commit', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const before = running.runtime.bodies;
  const result = applyForce(running, BALL_ID, { x: Number.NaN, y: 0, z: 0 });

  assert.equal(result.runtime.status, 'running');
  assert.equal(result.runtime.bodies, before);
  assert.equal(result.runtime.lastError, null);
  assert.equal(lastLog(result)?.severity, 'warn');
  assert.equal(lastLog(result)?.code, FORCE_INVALID_INPUT);
});

test('force rejects unknown and static targets with warnings and no partial runtime commit', () => {
  const running = play();
  const before = running.runtime.bodies;

  for (const entityId of ['missing-entity', FLOOR_ID]) {
    const result = applyForce(running, entityId, { x: 0, y: 1, z: 0 });
    assert.equal(result.runtime.status, 'running');
    assert.equal(result.runtime.bodies, before);
    assert.equal(result.runtime.lastError, null);
    assert.equal(lastLog(result)?.severity, 'warn');
    assert.equal(lastLog(result)?.code, FORCE_INVALID_TARGET);
  }
});

test('invalid impulse input is a warning with no partial runtime commit', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const before = running.runtime.bodies;
  const result = applyImpulse(running, BALL_ID, { x: 0, y: Number.POSITIVE_INFINITY, z: 0 });

  assert.equal(result.runtime.status, 'running');
  assert.equal(result.runtime.bodies, before);
  assert.equal(result.runtime.lastError, null);
  assert.equal(lastLog(result)?.severity, 'warn');
  assert.equal(lastLog(result)?.code, IMPULSE_INVALID_INPUT);
});

test('impulse rejects unknown and static targets with warnings and no partial runtime commit', () => {
  const running = play();
  const before = running.runtime.bodies;

  for (const entityId of ['missing-entity', FLOOR_ID]) {
    const result = applyImpulse(running, entityId, { x: 0, y: 1, z: 0 });
    assert.equal(result.runtime.status, 'running');
    assert.equal(result.runtime.bodies, before);
    assert.equal(result.runtime.lastError, null);
    assert.equal(lastLog(result)?.severity, 'warn');
    assert.equal(lastLog(result)?.code, IMPULSE_INVALID_TARGET);
  }
});

test('clear-force rejects unknown and static targets with warnings', () => {
  const running = play();
  const before = running.runtime.bodies;

  for (const entityId of ['missing-entity', FLOOR_ID]) {
    const result = clearForce(running, entityId);
    assert.equal(result.runtime.status, 'running');
    assert.equal(result.runtime.bodies, before);
    assert.equal(result.runtime.lastError, null);
    assert.equal(lastLog(result)?.severity, 'warn');
    assert.equal(lastLog(result)?.code, FORCE_INVALID_TARGET);
  }
});

test('an internal force failure pauses safely and preserves the last runtime state', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const body = running.runtime.bodies[BALL_ID];
  assert.ok(body);
  body.force = { x: Number.MAX_VALUE, y: 0, z: 0 };

  const failed = applyForce(running, BALL_ID, { x: Number.MAX_VALUE, y: 0, z: 0 });
  assert.equal(failed.runtime.status, 'paused');
  assert.equal(failed.runtime.bodies, running.runtime.bodies);
  assert.equal(failed.runtime.lastError?.code, FORCE_INVALID_STATE);
  assert.equal(lastLog(failed)?.severity, 'error');
  assert.equal(lastLog(failed)?.code, FORCE_INVALID_STATE);
});

test('an internal impulse failure pauses safely and preserves the last runtime state', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const body = running.runtime.bodies[BALL_ID];
  assert.ok(body);
  body.velocity.y = Number.MAX_VALUE;

  const failed = applyImpulse(running, BALL_ID, { x: 0, y: Number.MAX_VALUE, z: 0 });
  assert.equal(failed.runtime.status, 'paused');
  assert.equal(failed.runtime.bodies, running.runtime.bodies);
  assert.equal(failed.runtime.lastError?.code, IMPULSE_INVALID_STATE);
  assert.equal(lastLog(failed)?.severity, 'error');
  assert.equal(lastLog(failed)?.code, IMPULSE_INVALID_STATE);
});

test('play with an invalid authored mass reports a diagnostic and stays editing', () => {
  const invalid = initialState([ballEntity(BALL_ID, { mass: 0 }), floorEntity()]);
  const state = play(invalid);

  assert.equal(state.runtime.status, 'editing');
  assert.deepEqual(state.runtime.bodies, {});
  assert.equal(state.runtime.lastError?.code, FORCE_INVALID_MASS);
  assert.equal(lastLog(state)?.severity, 'error');
  assert.equal(lastLog(state)?.code, FORCE_INVALID_MASS);
});

test('runtime/reset clears force and impulse state and restores authored values', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const modified = runSteps(applyImpulse(
    applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 }),
    BALL_ID,
    { x: 0, y: 10, z: 0 }
  ), 10);
  assert.ok((modified.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) > 5);

  const reset = reduceStudioState(modified, { type: 'runtime/reset' }, context());
  const body = reset.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(reset.runtime.status, 'running');
  assert.deepEqual(body.force, { x: 0, y: 0, z: 0 });
  assert.equal(body.velocity.y, 0);
  assert.equal(body.transform.position.y, 5);
  assert.equal(reset.runtime.accumulatorSeconds, 0);
  assert.equal(reset.project.world.entities[0]?.transform.position.y, 5);
});

test('runtime/stop clears force and impulse state and returns to editing', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const modified = applyImpulse(
    applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 }),
    BALL_ID,
    { x: 0, y: 10, z: 0 }
  );
  const stopped = reduceStudioState(modified, { type: 'runtime/stop' }, context());

  assert.equal(stopped.runtime.status, 'editing');
  assert.deepEqual(stopped.runtime.bodies, {});
  assert.equal(stopped.runtime.snapshot, null);
  assert.equal(stopped.runtime.lastError, null);
  assert.equal(stopped.project.world.entities[0]?.transform.position.y, 5);
});

test('force and impulse do not mutate authored state or mark the project dirty', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const after = runSteps(applyImpulse(
    applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 }),
    BALL_ID,
    { x: 0, y: 10, z: 0 }
  ), 10);

  assert.equal(after.project.world.entities[0]?.transform.position.y, 5);
  assert.equal(after.persistence.revision, 0);
  assert.equal(after.persistence.status, 'clean');
});

test('serialized project excludes runtime force state', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const after = runSteps(applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 }), 10);
  const json = serializeProjectDocument(after.project);

  assert.equal(json.includes('"force"'), false);
  assert.equal(json.includes('"bodies"'), false);
  assert.equal(json.includes('"accumulatorSeconds"'), false);

  const parsed = JSON.parse(json) as { world: { entities: Array<{ transform: { position: { y: number } } }> } };
  assert.equal(parsed.world.entities[0]?.transform.position.y, 5);
});

test('structural edits remain blocked while a force is active', () => {
  const running = play(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  const withForce = applyForce(running, BALL_ID, { x: 0, y: 10, z: 0 });
  const blocked = reduceStudioState(withForce, {
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

test('force and impulse interact correctly with gravity and plane contact', () => {
  const running = play(initialState([
    ballEntity(BALL_ID, { useGravity: true }, { x: 0, y: 0.5, z: 0 }),
    floorEntity()
  ]));
  const withForce = applyForce(running, BALL_ID, { x: 0, y: -10, z: 0 });
  const after = runSteps(withForce, 10);
  const body = after.runtime.bodies[BALL_ID];
  assert.ok(body);

  assert.equal(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
  assert.deepEqual(body.force, { x: 0, y: -10, z: 0 });
});

test('store-driven force changes motion and records a runtime log', () => {
  const store = createStudioStore(initialState([ballEntity(BALL_ID, { useGravity: false }), floorEntity()]));
  store.dispatch({ type: 'runtime/play' });
  store.dispatch({ type: 'runtime/apply-force', entityId: BALL_ID, force: { x: 0, y: 10, z: 0 } });
  for (let index = 0; index < 30; index += 1) {
    store.dispatch({ type: 'runtime/step', deltaSeconds: FIXED_TIMESTEP_SECONDS });
  }

  const state = store.getSnapshot();
  assert.ok((state.runtime.bodies[BALL_ID]?.transform.position.y ?? 5) > 5);
  assert.equal(state.logs.some((entry) => entry.code === FORCE_APPLIED), true);
  assert.equal(state.project.world.entities[0]?.transform.position.y, 5);
  assert.equal(state.persistence.revision, 0);
});
