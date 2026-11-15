import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FIXED_TIMESTEP_SECONDS,
  advanceSimulation,
  contactPairKey,
  createRuntimeBodies,
  stepBodiesWithContacts
} from '../../src/runtime/physics.ts';
import type { Quat, RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_A = 'a-ball';
const BALL_B = 'b-ball';
const FLOOR_1 = 'p1-floor';
const FLOOR_2 = 'p2-floor';

const IDENTITY_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

function rigidBody(overrides: Partial<RigidBodyComponent> = {}): RigidBodyComponent {
  return {
    id: 'rigid-1',
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: false,
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
      scale: { ...UNIT_SCALE }
    },
    metadata: {},
    components
  };
}

function ball(id: string, position: Vec3, overrides: Partial<RigidBodyComponent> = {}): WorldEntity {
  return entity(id, 'sphere', position, [rigidBody(overrides)]);
}

function floor(id: string, y = 0): WorldEntity {
  return entity(id, 'plane', { x: 0, y, z: 0 }, [
    rigidBody({ collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } } })
  ]);
}

test('a rising edge is reported once and not re-fired while resting', () => {
  const bodies = createRuntimeBodies([ball(BALL_A, { x: 0, y: 0.4, z: 0 }), floor(FLOOR_1)]);
  const first = stepBodiesWithContacts(bodies, FIXED_TIMESTEP_SECONDS);

  assert.equal(first.contacts.length, 1);
  const contact = first.contacts[0];
  assert.equal(contact?.kind, 'planeContact');
  assert.equal(contact?.bodyEntityId, BALL_A);
  assert.equal(contact?.planeEntityId, FLOOR_1);
  assert.equal(contact?.stepIndex, 0);
  assert.equal(contact?.position.y, 0);
  assert.deepEqual(contact?.normal, { x: 0, y: 1, z: 0 });
  assert.equal(contact?.impactSpeed, 0);

  const second = stepBodiesWithContacts(
    first.bodies,
    FIXED_TIMESTEP_SECONDS,
    first.activeContactKeys,
    1
  );
  assert.equal(second.contacts.length, 0);
  assert.deepEqual(second.activeContactKeys, [contactPairKey(BALL_A, FLOOR_1)]);
});

test('impact speed captures the inbound normal velocity', () => {
  const bodies = createRuntimeBodies([
    ball(BALL_A, { x: 0, y: 0.5, z: 0 }, { velocity: { x: 0, y: -3, z: 0 } }),
    floor(FLOOR_1)
  ]);
  const step = stepBodiesWithContacts(bodies, FIXED_TIMESTEP_SECONDS);
  assert.equal(step.contacts[0]?.impactSpeed, 3);
  assert.equal(step.bodies[BALL_A]?.velocity.y, 0);
});

test('a pair that separates and re-contacts produces a new rising edge', () => {
  const bodies = createRuntimeBodies([ball(BALL_A, { x: 0, y: 0.4, z: 0 }), floor(FLOOR_1)]);
  const first = stepBodiesWithContacts(bodies, FIXED_TIMESTEP_SECONDS);
  assert.equal(first.contacts.length, 1);

  // Lift the body out of contact, then drop it back in.
  const lifted = {
    ...first.bodies,
    [BALL_A]: {
      ...first.bodies[BALL_A]!,
      transform: {
        ...first.bodies[BALL_A]!.transform,
        position: { x: 0, y: 3, z: 0 }
      }
    }
  };
  const separated = stepBodiesWithContacts(lifted, FIXED_TIMESTEP_SECONDS, first.activeContactKeys, 1);
  assert.equal(separated.contacts.length, 0);
  assert.deepEqual(separated.activeContactKeys, []);

  const recontacted = stepBodiesWithContacts(
    { ...separated.bodies, [BALL_A]: { ...separated.bodies[BALL_A]!, transform: { ...separated.bodies[BALL_A]!.transform, position: { x: 0, y: 0.4, z: 0 } } } },
    FIXED_TIMESTEP_SECONDS,
    separated.activeContactKeys,
    2
  );
  assert.equal(recontacted.contacts.length, 1);
});

test('body/plane pairs are independent and ordered deterministically', () => {
  const bodies = createRuntimeBodies([
    ball(BALL_B, { x: 0, y: 0.4, z: 0 }),
    ball(BALL_A, { x: 0, y: 0.4, z: 0 }),
    floor(FLOOR_2, 0),
    floor(FLOOR_1, 0)
  ]);
  const step = stepBodiesWithContacts(bodies, FIXED_TIMESTEP_SECONDS);

  assert.deepEqual(
    step.contacts.map((contact) => `${contact.bodyEntityId}:${contact.planeEntityId}`),
    [`${BALL_A}:${FLOOR_1}`, `${BALL_A}:${FLOOR_2}`, `${BALL_B}:${FLOOR_1}`, `${BALL_B}:${FLOOR_2}`]
  );
});

test('advanceSimulation dedupes a pair across multiple fixed steps', () => {
  const bodies = createRuntimeBodies([
    ball(BALL_A, { x: 0, y: 0.4, z: 0 }, { useGravity: true }),
    floor(FLOOR_1)
  ]);
  const advance = advanceSimulation(bodies, 0, FIXED_TIMESTEP_SECONDS * 3);

  assert.equal(advance.steps, 3);
  assert.equal(advance.contacts.length, 1);
  assert.equal(advance.contacts[0]?.stepIndex, 0);
  assert.deepEqual(advance.activeContactKeys, [contactPairKey(BALL_A, FLOOR_1)]);
});

test('advanceSimulation carries previous contact keys through a non-positive delta', () => {
  const bodies = createRuntimeBodies([ball(BALL_A, { x: 0, y: 2, z: 0 }), floor(FLOOR_1)]);
  const previous = [contactPairKey(BALL_A, FLOOR_1)];
  const advance = advanceSimulation(bodies, 0.01, 0, previous);
  assert.equal(advance.steps, 0);
  assert.equal(advance.contacts.length, 0);
  assert.deepEqual(advance.activeContactKeys, previous);
});

test('a world without planes reports no contacts', () => {
  const bodies = createRuntimeBodies([ball(BALL_A, { x: 0, y: 0.4, z: 0 })]);
  const step = stepBodiesWithContacts(bodies, FIXED_TIMESTEP_SECONDS);
  assert.equal(step.contacts.length, 0);
  assert.deepEqual(step.activeContactKeys, []);
});
