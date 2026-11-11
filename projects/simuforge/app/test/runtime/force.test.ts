import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_TIMESTEP_SECONDS,
  GRAVITY_ACCELERATION_Y,
  FORCE_INVALID_INPUT,
  FORCE_INVALID_MASS,
  FORCE_INVALID_STATE,
  FORCE_INVALID_TARGET,
  ForceError,
  IMPULSE_INVALID_INPUT,
  IMPULSE_INVALID_MASS,
  IMPULSE_INVALID_STATE,
  IMPULSE_INVALID_TARGET,
  advanceSimulation,
  applyForce,
  applyImpulse,
  clearForce,
  createRuntimeBodies,
  stepBodies
} from '../../src/runtime/physics.ts';
import type { RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_BALL_ID = '22222222-2222-4222-8222-222222222222';
const FLOOR_ID = '33333333-3333-4333-8333-333333333333';

const IDENTITY_ROTATION = { x: 0, y: 0, z: 0, w: 1 };

function rigidBody(overrides: Partial<RigidBodyComponent> = {}): RigidBodyComponent {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: true,
    collider: { kind: 'sphere', size: 0.5 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...overrides
  };
}

function entity(
  id: string,
  type: WorldEntity['type'],
  position: Vec3,
  components: RigidBodyComponent[]
): WorldEntity {
  return {
    id,
    name: id,
    type,
    transform: {
      position: { ...position },
      rotation: { ...IDENTITY_ROTATION },
      scale: { x: 1, y: 1, z: 1 }
    },
    metadata: {},
    components
  };
}

function ball(overrides: Partial<RigidBodyComponent> = {}, position: Vec3 = { x: 0, y: 5, z: 0 }): WorldEntity {
  return entity(BALL_ID, 'sphere', position, [rigidBody(overrides)]);
}

function floor(): WorldEntity {
  return entity(FLOOR_ID, 'plane', { x: 0, y: 0, z: 0 }, [
    rigidBody({ collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } } })
  ]);
}

function close(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function runSteps(bodies: ReturnType<typeof createRuntimeBodies>, count: number) {
  let current = bodies;
  for (let index = 0; index < count; index += 1) {
    current = stepBodies(current, FIXED_TIMESTEP_SECONDS);
  }
  return current;
}

function expectForceError(
  action: () => unknown,
  code: string,
  severity: 'warn' | 'error'
): void {
  assert.throws(
    action,
    (error: unknown) =>
      error instanceof ForceError && error.code === code && error.severity === severity
  );
}

test('createRuntimeBodies captures mass and initializes a zero force accumulator', () => {
  const bodies = createRuntimeBodies([ball({ mass: 2.5 })]);
  const body = bodies[BALL_ID];
  assert.ok(body);

  assert.equal(body.mass, 2.5);
  assert.deepEqual(body.force, { x: 0, y: 0, z: 0 });
});

test('createRuntimeBodies rejects an invalid authored mass', () => {
  expectForceError(
    () => createRuntimeBodies([ball({ mass: 0 })]),
    FORCE_INVALID_MASS,
    'error'
  );
});

test('applyForce accumulates force without mutating its input bodies', () => {
  const bodies = createRuntimeBodies([ball({ useGravity: false })]);
  const first = applyForce(bodies, BALL_ID, { x: 1, y: 2, z: 3 });
  const second = applyForce(first, BALL_ID, { x: 4, y: 5, z: 6 });

  assert.deepEqual(bodies[BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.deepEqual(first[BALL_ID]?.force, { x: 1, y: 2, z: 3 });
  assert.deepEqual(second[BALL_ID]?.force, { x: 5, y: 7, z: 9 });
  assert.notEqual(second[BALL_ID], bodies[BALL_ID]);
});

test('a persistent force accelerates a body across fixed steps', () => {
  const bodies = applyForce(
    createRuntimeBodies([ball({ mass: 2, useGravity: false })]),
    BALL_ID,
    { x: 0, y: 10, z: 0 }
  );
  const after = runSteps(bodies, 60);
  const body = after[BALL_ID];
  assert.ok(body);

  const acceleration = 10 / 2;
  const expectedVelocity = acceleration * 60 * FIXED_TIMESTEP_SECONDS;
  const expectedPosition = 5 +
    acceleration * FIXED_TIMESTEP_SECONDS * FIXED_TIMESTEP_SECONDS * ((60 * 61) / 2);

  close(body.velocity.y, expectedVelocity);
  close(body.transform.position.y, expectedPosition);
  assert.deepEqual(body.force, { x: 0, y: 10, z: 0 });
});

test('force acceleration scales inversely with mass', () => {
  const light = applyForce(
    createRuntimeBodies([ball({ mass: 1, useGravity: false })]),
    BALL_ID,
    { x: 0, y: 8, z: 0 }
  );
  const heavy = applyForce(
    createRuntimeBodies([ball({ mass: 4, useGravity: false })]),
    BALL_ID,
    { x: 0, y: 8, z: 0 }
  );

  const lightBody = stepBodies(light, FIXED_TIMESTEP_SECONDS)[BALL_ID];
  const heavyBody = stepBodies(heavy, FIXED_TIMESTEP_SECONDS)[BALL_ID];
  assert.ok(lightBody && heavyBody);

  close(lightBody.velocity.y, (8 / 1) * FIXED_TIMESTEP_SECONDS);
  close(heavyBody.velocity.y, (8 / 4) * FIXED_TIMESTEP_SECONDS);
  close(lightBody.velocity.y, heavyBody.velocity.y * 4);
});

test('clearForce stops persistent acceleration without changing velocity', () => {
  const withForce = applyForce(
    createRuntimeBodies([ball({ mass: 2, useGravity: false })]),
    BALL_ID,
    { x: 0, y: 10, z: 0 }
  );
  const afterOne = stepBodies(withForce, FIXED_TIMESTEP_SECONDS);
  const velocityBeforeClear = afterOne[BALL_ID]?.velocity.y;
  assert.ok(velocityBeforeClear !== undefined);

  const cleared = clearForce(afterOne, BALL_ID);
  const afterTwo = stepBodies(cleared, FIXED_TIMESTEP_SECONDS);
  const body = afterTwo[BALL_ID];
  assert.ok(body);

  assert.deepEqual(cleared[BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.equal(body.velocity.y, velocityBeforeClear);
  close(
    body.transform.position.y,
    (afterOne[BALL_ID]?.transform.position.y ?? 0) + velocityBeforeClear * FIXED_TIMESTEP_SECONDS
  );
});

test('clearForce clears every runtime force when no target is specified', () => {
  const first = entity(BALL_ID, 'sphere', { x: 0, y: 5, z: 0 }, [rigidBody({ useGravity: false })]);
  const second = entity(OTHER_BALL_ID, 'sphere', { x: 2, y: 5, z: 0 }, [rigidBody({ useGravity: false })]);
  const bodies = createRuntimeBodies([first, second]);
  const withForces = applyForce(
    applyForce(bodies, BALL_ID, { x: 1, y: 0, z: 0 }),
    OTHER_BALL_ID,
    { x: 0, y: 2, z: 0 }
  );

  const cleared = clearForce(withForces);
  assert.deepEqual(cleared[BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.deepEqual(cleared[OTHER_BALL_ID]?.force, { x: 0, y: 0, z: 0 });
  assert.deepEqual(withForces[BALL_ID]?.force, { x: 1, y: 0, z: 0 });
});

test('applyImpulse changes velocity immediately by impulse over mass and leaves position unchanged', () => {
  const bodies = createRuntimeBodies([ball({ mass: 2, useGravity: false })]);
  const after = applyImpulse(bodies, BALL_ID, { x: 0, y: 10, z: 0 });
  const body = after[BALL_ID];
  assert.ok(body);

  assert.equal(body.velocity.y, 5);
  assert.equal(body.transform.position.y, 5);
  assert.equal(bodies[BALL_ID]?.velocity.y, 0);
  assert.notEqual(after[BALL_ID], bodies[BALL_ID]);
});

test('impulse is instantaneous and is not reapplied on subsequent steps', () => {
  const bodies = applyImpulse(
    createRuntimeBodies([ball({ mass: 3, useGravity: false })]),
    BALL_ID,
    { x: 0, y: 12, z: 0 }
  );
  const after = runSteps(bodies, 10);
  const body = after[BALL_ID];
  assert.ok(body);

  close(body.velocity.y, 4);
  close(body.transform.position.y, 5 + 4 * 10 * FIXED_TIMESTEP_SECONDS);
});

test('force combines with gravity and can cancel it exactly', () => {
  const mass = 2;
  const bodies = applyForce(
    createRuntimeBodies([ball({ mass, useGravity: true })]),
    BALL_ID,
    { x: 0, y: -mass * GRAVITY_ACCELERATION_Y, z: 0 }
  );
  const after = runSteps(bodies, 30);
  const body = after[BALL_ID];
  assert.ok(body);

  close(body.velocity.y, 0);
  close(body.transform.position.y, 5);
});

test('downward force on a resting body is absorbed by plane contact', () => {
  const bodies = applyForce(
    createRuntimeBodies([
      ball({ useGravity: false }, { x: 0, y: 0.5, z: 0 }),
      floor()
    ]),
    BALL_ID,
    { x: 0, y: -10, z: 0 }
  );
  const after = runSteps(bodies, 10);
  const body = after[BALL_ID];
  assert.ok(body);

  close(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
  assert.deepEqual(body.force, { x: 0, y: -10, z: 0 });
});

test('an upward force can lift a body off a plane', () => {
  const bodies = applyForce(
    createRuntimeBodies([
      ball({ useGravity: false }, { x: 0, y: 0.5, z: 0 }),
      floor()
    ]),
    BALL_ID,
    { x: 0, y: 10, z: 0 }
  );
  const after = runSteps(bodies, 10);
  const body = after[BALL_ID];
  assert.ok(body);

  assert.ok(body.transform.position.y > 0.5);
  assert.ok(body.velocity.y > 0);
});

test('force application rejects non-finite input with a warning', () => {
  const bodies = createRuntimeBodies([ball()]);
  for (const force of [
    { x: Number.NaN, y: 0, z: 0 },
    { x: 0, y: Number.POSITIVE_INFINITY, z: 0 },
    { x: 0, y: 0, z: Number.NEGATIVE_INFINITY }
  ]) {
    expectForceError(() => applyForce(bodies, BALL_ID, force), FORCE_INVALID_INPUT, 'warn');
  }
});

test('force application rejects unknown and static targets', () => {
  const bodies = createRuntimeBodies([ball(), floor()]);

  expectForceError(
    () => applyForce(bodies, 'missing-entity', { x: 0, y: 1, z: 0 }),
    FORCE_INVALID_TARGET,
    'warn'
  );
  expectForceError(
    () => applyForce(bodies, FLOOR_ID, { x: 0, y: 1, z: 0 }),
    FORCE_INVALID_TARGET,
    'warn'
  );
});

test('impulse application rejects non-finite input, unknown targets, and static targets', () => {
  const bodies = createRuntimeBodies([ball(), floor()]);

  expectForceError(
    () => applyImpulse(bodies, BALL_ID, { x: 0, y: Number.NaN, z: 0 }),
    IMPULSE_INVALID_INPUT,
    'warn'
  );
  expectForceError(
    () => applyImpulse(bodies, 'missing-entity', { x: 0, y: 1, z: 0 }),
    IMPULSE_INVALID_TARGET,
    'warn'
  );
  expectForceError(
    () => applyImpulse(bodies, FLOOR_ID, { x: 0, y: 1, z: 0 }),
    IMPULSE_INVALID_TARGET,
    'warn'
  );
});

test('invalid runtime mass fails force and impulse safely', () => {
  const bodies = createRuntimeBodies([ball()]);
  const body = bodies[BALL_ID];
  assert.ok(body);
  body.mass = 0;

  expectForceError(
    () => applyForce(bodies, BALL_ID, { x: 0, y: 1, z: 0 }),
    FORCE_INVALID_MASS,
    'error'
  );
  expectForceError(
    () => applyImpulse(bodies, BALL_ID, { x: 0, y: 1, z: 0 }),
    IMPULSE_INVALID_MASS,
    'error'
  );
});

test('non-finite runtime force fails a step without committing partial state', () => {
  const bodies = createRuntimeBodies([ball()]);
  const body = bodies[BALL_ID];
  assert.ok(body);
  body.force = { x: Number.NaN, y: 0, z: 0 };

  const advance = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS);
  assert.equal(advance.steps, 0);
  assert.equal(advance.bodies, bodies);
  assert.equal(advance.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
  assert.equal(advance.error?.code, FORCE_INVALID_STATE);
});

test('invalid runtime mass fails a step safely', () => {
  const bodies = createRuntimeBodies([ball()]);
  const body = bodies[BALL_ID];
  assert.ok(body);
  body.mass = -1;

  const advance = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS);
  assert.equal(advance.steps, 0);
  assert.equal(advance.bodies, bodies);
  assert.equal(advance.error?.code, FORCE_INVALID_MASS);
});

test('force and impulse simulation is deterministic for identical inputs', () => {
  const makeBodies = () => applyImpulse(
    applyForce(
      createRuntimeBodies([ball({ mass: 2, useGravity: false })]),
      BALL_ID,
      { x: 1, y: 2, z: 3 }
    ),
    BALL_ID,
    { x: 0, y: 4, z: 0 }
  );

  const first = runSteps(makeBodies(), 30);
  const second = runSteps(makeBodies(), 30);
  assert.deepEqual(first, second);
});

test('stepBodies does not mutate input bodies while a force is active', () => {
  const bodies = applyForce(
    createRuntimeBodies([ball({ mass: 2, useGravity: false })]),
    BALL_ID,
    { x: 1, y: 2, z: 3 }
  );
  const before = JSON.parse(JSON.stringify(bodies));
  stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  assert.deepEqual(bodies, before);
});
