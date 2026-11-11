import type { RigidBodyComponent, WorldEntity } from '../world/types.ts';
import type { RuntimeBodies } from './types.ts';

/** Owner-approved M1-C fixed timestep (1/60 s). */
export const FIXED_TIMESTEP_SECONDS = 1 / 60;

/** Owner-approved M1-C gravity acceleration (m/s^2). */
export const GRAVITY_ACCELERATION_Y = -9.81;

/**
 * Upper bound on a single rendered frame delta. Prevents a long stall (tab
 * backgrounded, breakpoint) from producing an unbounded step count.
 */
export const MAX_FRAME_DELTA_SECONDS = 0.25;

function findEnabledRigidBody(entity: WorldEntity): RigidBodyComponent | null {
  const components = entity.components ?? [];
  for (const component of components) {
    if (component.type === 'rigidBody' && component.enabled) {
      return component as RigidBodyComponent;
    }
  }
  return null;
}

/**
 * Derives runtime bodies from authored entities at Play. Entities without an
 * enabled rigid body do not participate in M1-C integration.
 */
export function createRuntimeBodies(entities: readonly WorldEntity[]): RuntimeBodies {
  const bodies: RuntimeBodies = {};
  for (const entity of entities) {
    const rigidBody = findEnabledRigidBody(entity);
    if (!rigidBody) {
      continue;
    }
    bodies[entity.id] = {
      entityId: entity.id,
      transform: {
        position: { ...entity.transform.position },
        rotation: { ...entity.transform.rotation },
        scale: { ...entity.transform.scale }
      },
      velocity: { ...rigidBody.velocity },
      useGravity: rigidBody.useGravity
    };
  }
  return bodies;
}

/**
 * Semi-implicit (symplectic) Euler step: velocity is integrated first, then
 * position uses the updated velocity. Pure and deterministic.
 */
export function stepBodies(bodies: RuntimeBodies, deltaSeconds: number): RuntimeBodies {
  const next: RuntimeBodies = {};
  for (const [id, body] of Object.entries(bodies)) {
    const velocity = { ...body.velocity };
    if (body.useGravity) {
      velocity.y += GRAVITY_ACCELERATION_Y * deltaSeconds;
    }
    next[id] = {
      entityId: body.entityId,
      transform: {
        position: {
          x: body.transform.position.x + velocity.x * deltaSeconds,
          y: body.transform.position.y + velocity.y * deltaSeconds,
          z: body.transform.position.z + velocity.z * deltaSeconds
        },
        rotation: { ...body.transform.rotation },
        scale: { ...body.transform.scale }
      },
      velocity,
      useGravity: body.useGravity
    };
  }
  return next;
}

export interface SimulationAdvance {
  bodies: RuntimeBodies;
  accumulatorSeconds: number;
  steps: number;
}

/**
 * Simple fixed-step accumulator. Frame deltas are clamped to
 * MAX_FRAME_DELTA_SECONDS and only whole FIXED_TIMESTEP_SECONDS are consumed;
 * the remainder carries into the next frame.
 */
export function advanceSimulation(
  bodies: RuntimeBodies,
  accumulatorSeconds: number,
  frameDeltaSeconds: number
): SimulationAdvance {
  if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds <= 0) {
    return { bodies, accumulatorSeconds, steps: 0 };
  }

  const clampedDelta = Math.min(frameDeltaSeconds, MAX_FRAME_DELTA_SECONDS);
  let accumulator = accumulatorSeconds + clampedDelta;
  let current = bodies;
  let steps = 0;

  while (accumulator >= FIXED_TIMESTEP_SECONDS) {
    current = stepBodies(current, FIXED_TIMESTEP_SECONDS);
    accumulator -= FIXED_TIMESTEP_SECONDS;
    steps += 1;
  }

  return { bodies: current, accumulatorSeconds: accumulator, steps };
}
