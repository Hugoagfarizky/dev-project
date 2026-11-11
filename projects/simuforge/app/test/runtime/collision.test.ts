import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLLISION_INVALID_COLLIDER,
  COLLISION_INVALID_STATE,
  FIXED_TIMESTEP_SECONDS,
  advanceSimulation,
  createRuntimeBodies,
  stepBodies
} from '../../src/runtime/physics.ts';
import type { Quat, RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_ID = '11111111-1111-4111-8111-111111111111';
const FLOOR_ID = '22222222-2222-4222-8222-222222222222';
const BOX_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_BALL_ID = '44444444-4444-4444-8444-444444444444';

const IDENTITY_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

function rigidBody(overrides: Partial<RigidBodyComponent> = {}): RigidBodyComponent {
  return {
    id: '55555555-5555-4555-8555-555555555555',
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
  components: RigidBodyComponent[],
  options: { rotation?: Quat; scale?: Vec3 } = {}
): WorldEntity {
  return {
    id,
    name: id,
    type,
    transform: {
      position: { ...position },
      rotation: { ...(options.rotation ?? IDENTITY_ROTATION) },
      scale: { ...(options.scale ?? UNIT_SCALE) }
    },
    metadata: {},
    components
  };
}

function ball(position: Vec3 = { x: 0, y: 5, z: 0 }, overrides: Partial<RigidBodyComponent> = {}): WorldEntity {
  return entity(BALL_ID, 'sphere', position, [rigidBody(overrides)]);
}

function floor(position: Vec3 = { x: 0, y: 0, z: 0 }, overrides: Partial<RigidBodyComponent> = {}): WorldEntity {
  return entity(FLOOR_ID, 'plane', position, [
    rigidBody({ collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } }, ...overrides })
  ]);
}

function box(position: Vec3 = { x: 0, y: 5, z: 0 }, overrides: Partial<RigidBodyComponent> = {}): WorldEntity {
  return entity(BOX_ID, 'cube', position, [
    rigidBody({ collider: { kind: 'box', size: { x: 2, y: 1, z: 2 } }, ...overrides })
  ]);
}

function close(actual: number, expected: number, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`
  );
}

function runSteps(entities: readonly WorldEntity[], count: number) {
  let simulation = { bodies: createRuntimeBodies(entities), accumulatorSeconds: 0 };
  for (let index = 0; index < count; index += 1) {
    simulation = advanceSimulation(simulation.bodies, simulation.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
  }
  return simulation;
}

test('createRuntimeBodies derives sphere radius, box half-extents, and plane colliders', () => {
  const bodies = createRuntimeBodies([
    ball(),
    box(),
    floor()
  ]);

  assert.deepEqual(bodies[BALL_ID]?.collider, { kind: 'sphere', radius: 0.5 });
  assert.deepEqual(bodies[BOX_ID]?.collider, { kind: 'box', halfExtents: { x: 1, y: 0.5, z: 1 } });
  assert.deepEqual(bodies[FLOOR_ID]?.collider, { kind: 'plane' });
});

test('a falling sphere rests on a plane at radius height and loses downward velocity', () => {
  const simulation = runSteps([ball(), floor()], 120);
  const body = simulation.bodies[BALL_ID];
  assert.ok(body);

  close(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
  assert.equal(simulation.error, undefined);
});

test('a falling box rests on a plane at half-height', () => {
  const simulation = runSteps([box(), floor()], 120);
  const body = simulation.bodies[BOX_ID];
  assert.ok(body);

  close(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
});

test('plane bodies are static under gravity', () => {
  const plane = floor({ x: 0, y: 0, z: 0 }, { useGravity: true, velocity: { x: 0, y: -1, z: 0 } });
  const bodies = createRuntimeBodies([plane]);
  const next = stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  const body = next[FLOOR_ID];
  assert.ok(body);

  assert.equal(body.transform.position.y, 0);
  assert.equal(body.velocity.y, -1);
});

test('a body moving away from the plane is not affected', () => {
  const moving = ball({ x: 0, y: 1, z: 0 }, { useGravity: false, velocity: { x: 0, y: 1, z: 0 } });
  const next = stepBodies(createRuntimeBodies([moving, floor()]), FIXED_TIMESTEP_SECONDS);
  const body = next[BALL_ID];
  assert.ok(body);

  close(body.transform.position.y, 1 + FIXED_TIMESTEP_SECONDS);
  assert.equal(body.velocity.y, 1);
});

test('a body starting below the plane is corrected to the surface', () => {
  const below = ball({ x: 0, y: -2, z: 0 }, { useGravity: false, velocity: { x: 0, y: 0, z: 0 } });
  const next = stepBodies(createRuntimeBodies([below, floor()]), FIXED_TIMESTEP_SECONDS);
  const body = next[BALL_ID];
  assert.ok(body);

  close(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
});

test('horizontal velocity is preserved on contact (zero friction)', () => {
  const sliding = ball({ x: 0, y: 0.4, z: 0 }, {
    useGravity: false,
    velocity: { x: 2, y: -1, z: 0 }
  });
  const next = stepBodies(createRuntimeBodies([sliding, floor()]), FIXED_TIMESTEP_SECONDS);
  const body = next[BALL_ID];
  assert.ok(body);

  close(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
  assert.equal(body.velocity.x, 2);
});

test('contact has no restitution and never produces upward velocity', () => {
  let simulation = { bodies: createRuntimeBodies([ball(), floor()]), accumulatorSeconds: 0 };
  let contactSeen = false;
  for (let index = 0; index < 180; index += 1) {
    simulation = advanceSimulation(simulation.bodies, simulation.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
    const body = simulation.bodies[BALL_ID];
    assert.ok(body);
    assert.ok(body.velocity.y <= 0);
    if (body.transform.position.y <= 0.5000001) {
      contactSeen = true;
      close(body.transform.position.y, 0.5, 1e-6);
    }
  }
  assert.equal(contactSeen, true);
});

test('a resting body remains at rest across further fixed steps', () => {
  const first = runSteps([ball(), floor()], 120);
  const resting = first.bodies[BALL_ID];
  assert.ok(resting);

  const next = stepBodies(first.bodies, FIXED_TIMESTEP_SECONDS);
  const body = next[BALL_ID];
  assert.ok(body);
  close(body.transform.position.y, 0.5);
  assert.equal(body.velocity.y, 0);
});

test('multiple planes resolve to the highest surface deterministically', () => {
  const low = floor({ x: 0, y: 0, z: 0 });
  const high = entity('00000000-0000-4000-8000-000000000001', 'plane', { x: 0, y: 2, z: 0 }, [
    rigidBody({ collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } } })
  ]);
  const simulation = runSteps([ball(), high, low], 120);
  const body = simulation.bodies[BALL_ID];
  assert.ok(body);

  close(body.transform.position.y, 2.5);
  assert.equal(body.velocity.y, 0);
});

test('plane rotation and scale do not change the collision height', () => {
  const tilted = floor({ x: 0, y: 1, z: 0 }, {
    collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } }
  });
  tilted.transform.rotation = { x: 0.3826834, y: 0, z: 0, w: 0.9238795 };
  tilted.transform.scale = { x: 5, y: 5, z: 5 };

  const simulation = runSteps([ball(), tilted], 120);
  const body = simulation.bodies[BALL_ID];
  assert.ok(body);
  close(body.transform.position.y, 1.5);
});

test('dynamic bodies do not collide with each other in M1-D', () => {
  const first = ball({ x: 0, y: 1, z: 0 }, { useGravity: false });
  const second = entity(OTHER_BALL_ID, 'sphere', { x: 0, y: 1, z: 0 }, [rigidBody({ useGravity: false })]);

  const next = stepBodies(createRuntimeBodies([first, second]), FIXED_TIMESTEP_SECONDS);
  assert.equal(next[BALL_ID]?.transform.position.y, 1);
  assert.equal(next[OTHER_BALL_ID]?.transform.position.y, 1);
});

test('a body without a plane still falls through (M1-C behavior preserved)', () => {
  const simulation = runSteps([ball()], 120);
  const body = simulation.bodies[BALL_ID];
  assert.ok(body);

  assert.ok(body.transform.position.y < 0);
  assert.ok(body.velocity.y < 0);
});

test('collision resolution is deterministic for identical inputs', () => {
  const a = advanceSimulation(createRuntimeBodies([ball(), floor()]), 0, 0.5);
  const b = advanceSimulation(createRuntimeBodies([ball(), floor()]), 0, 0.5);
  assert.deepEqual(a, b);
});

test('stepBodies does not mutate its input bodies while resolving collisions', () => {
  const bodies = createRuntimeBodies([ball(), floor()]);
  const before = JSON.parse(JSON.stringify(bodies));
  stepBodies(bodies, FIXED_TIMESTEP_SECONDS);
  assert.deepEqual(bodies, before);
});

test('non-finite runtime state returns a collision failure and the last valid state', () => {
  const bodies = createRuntimeBodies([ball(), floor()]);
  const body = bodies[BALL_ID];
  assert.ok(body);
  body.velocity.y = Number.NaN;

  const advance = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS);
  assert.equal(advance.steps, 0);
  assert.equal(advance.bodies, bodies);
  assert.equal(advance.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
  assert.equal(advance.error?.code, COLLISION_INVALID_STATE);
});

test('an invalid collider returns a collision failure instead of committing partial state', () => {
  const bodies = createRuntimeBodies([ball(), floor()]);
  const body = bodies[BALL_ID];
  assert.ok(body);
  body.collider = { kind: 'sphere', radius: 0 };

  const advance = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS);
  assert.equal(advance.steps, 0);
  assert.equal(advance.bodies, bodies);
  assert.equal(advance.error?.code, COLLISION_INVALID_COLLIDER);
});
