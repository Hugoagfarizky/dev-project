import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_TIMESTEP_SECONDS,
  GRAVITY_ACCELERATION_Y,
  MAX_FRAME_DELTA_SECONDS,
  advanceSimulation,
  createRuntimeBodies,
  stepBodies
} from '../../src/runtime/physics.ts';
import type { RigidBodyComponent, WorldEntity } from '../../src/world/types.ts';

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

function ball(overrides: Partial<WorldEntity> = {}): WorldEntity {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Ball',
    type: 'sphere',
    transform: {
      position: { x: 0, y: 5, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    },
    metadata: {},
    components: [rigidBody()],
    ...overrides
  };
}

function close(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(Math.abs(actual - expected) <= tolerance, `expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('createRuntimeBodies includes only entities with an enabled rigid body', () => {
  const enabled = ball();
  const disabled = ball({ id: '66666666-6666-4666-8666-666666666666', components: [rigidBody({ enabled: false })] });
  const plain = ball({ id: '77777777-7777-4777-8777-777777777777', components: [] });

  const bodies = createRuntimeBodies([enabled, disabled, plain]);

  assert.deepEqual(Object.keys(bodies), [enabled.id]);
});

test('createRuntimeBodies clones authored transform and velocity', () => {
  const entity = ball({ components: [rigidBody({ velocity: { x: 1, y: 2, z: 3 } })] });
  const bodies = createRuntimeBodies([entity]);
  const body = bodies[entity.id];
  assert.ok(body);

  body.transform.position.y = 99;
  body.velocity.x = 99;

  assert.equal(entity.transform.position.y, 5);
  assert.equal((entity.components?.[0] as RigidBodyComponent).velocity.x, 1);
});

test('stepBodies applies semi-implicit Euler gravity', () => {
  const bodies = createRuntimeBodies([ball()]);
  const next = stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  const body = next[ball().id];
  assert.ok(body);

  close(body.velocity.y, GRAVITY_ACCELERATION_Y * FIXED_TIMESTEP_SECONDS);
  close(body.transform.position.y, 5 + GRAVITY_ACCELERATION_Y * FIXED_TIMESTEP_SECONDS * FIXED_TIMESTEP_SECONDS);
});

test('stepBodies uses the updated velocity for position (not explicit Euler)', () => {
  const bodies = createRuntimeBodies([ball()]);
  const afterOne = stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  const afterTwo = stepBodies(afterOne, FIXED_TIMESTEP_SECONDS);
  const body = afterTwo[ball().id];
  assert.ok(body);

  const expectedVelocity = GRAVITY_ACCELERATION_Y * 2 * FIXED_TIMESTEP_SECONDS;
  const expectedPosition = 5 +
    GRAVITY_ACCELERATION_Y * FIXED_TIMESTEP_SECONDS * FIXED_TIMESTEP_SECONDS +
    expectedVelocity * FIXED_TIMESTEP_SECONDS;

  close(body.velocity.y, expectedVelocity);
  close(body.transform.position.y, expectedPosition);
});

test('stepBodies keeps bodies without gravity at constant velocity', () => {
  const entity = ball({ components: [rigidBody({ useGravity: false, velocity: { x: 2, y: 0, z: 0 } })] });
  const bodies = createRuntimeBodies([entity]);
  const next = stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  const body = next[entity.id];
  assert.ok(body);

  assert.equal(body.velocity.y, 0);
  close(body.transform.position.x, 2 * FIXED_TIMESTEP_SECONDS);
  assert.equal(body.transform.position.y, 5);
});

test('stepBodies does not mutate its input bodies', () => {
  const bodies = createRuntimeBodies([ball()]);
  const before = JSON.parse(JSON.stringify(bodies));
  stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  assert.deepEqual(bodies, before);
});

test('advanceSimulation consumes whole fixed steps', () => {
  const bodies = createRuntimeBodies([ball()]);
  const advance = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS * 2);

  assert.equal(advance.steps, 2);
  close(advance.accumulatorSeconds, 0);
});

test('advanceSimulation carries the sub-step remainder', () => {
  const bodies = createRuntimeBodies([ball()]);
  const first = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS / 2);
  assert.equal(first.steps, 0);
  close(first.accumulatorSeconds, FIXED_TIMESTEP_SECONDS / 2);

  const second = advanceSimulation(first.bodies, first.accumulatorSeconds, FIXED_TIMESTEP_SECONDS / 2);
  assert.equal(second.steps, 1);
  close(second.accumulatorSeconds, 0);
});

test('advanceSimulation clamps long frame deltas', () => {
  const bodies = createRuntimeBodies([ball()]);
  const advance = advanceSimulation(bodies, 0, 10);

  assert.equal(advance.steps, Math.round(MAX_FRAME_DELTA_SECONDS / FIXED_TIMESTEP_SECONDS));
  assert.ok(advance.accumulatorSeconds < FIXED_TIMESTEP_SECONDS);
});

test('advanceSimulation ignores non-positive and non-finite deltas', () => {
  const bodies = createRuntimeBodies([ball()]);
  for (const delta of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const advance = advanceSimulation(bodies, 0.01, delta);
    assert.equal(advance.steps, 0);
    assert.equal(advance.bodies, bodies);
    assert.equal(advance.accumulatorSeconds, 0.01);
  }
});

test('simulation is deterministic for identical inputs', () => {
  const bodies = createRuntimeBodies([ball()]);
  const a = advanceSimulation(bodies, 0, 0.5);
  const b = advanceSimulation(bodies, 0, 0.5);
  assert.deepEqual(a, b);
});

test('a ball falls under gravity after 30 fixed steps', () => {
  let simulation = { bodies: createRuntimeBodies([ball()]), accumulatorSeconds: 0 };
  for (let index = 0; index < 30; index += 1) {
    simulation = advanceSimulation(simulation.bodies, simulation.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
  }
  const body = simulation.bodies[ball().id];
  assert.ok(body);

  // sum(i = 1..30) * g * dt^2 = 465 * 9.81 / 3600
  close(body.velocity.y, -4.905);
  close(body.transform.position.y, 3.732875, 1e-6);
});
