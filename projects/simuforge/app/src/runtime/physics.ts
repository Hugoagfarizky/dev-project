import type { RigidBodyComponent, Transform, Vec3, WorldEntity } from '../world/types.ts';
import type { RuntimeBodies, RuntimeBody, RuntimeCollider } from './types.ts';

/** Owner-approved M1-C fixed timestep (1/60 s). */
export const FIXED_TIMESTEP_SECONDS = 1 / 60;

/** Owner-approved M1-C gravity acceleration (m/s^2). */
export const GRAVITY_ACCELERATION_Y = -9.81;

/**
 * Upper bound on a single rendered frame delta. Prevents a long stall (tab
 * backgrounded, breakpoint) from producing an unbounded step count.
 */
export const MAX_FRAME_DELTA_SECONDS = 0.25;

/** Runtime failure codes for the M1-D collision contract. */
export const COLLISION_INVALID_STATE = 'COLLISION_INVALID_STATE';
export const COLLISION_INVALID_COLLIDER = 'COLLISION_INVALID_COLLIDER';
export const RUNTIME_STEP_FAILED = 'RUNTIME_STEP_FAILED';

export interface SimulationFailure {
  code: string;
  message: string;
}

/** Thrown by the pure runtime layer when a step cannot be processed safely. */
export class CollisionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'CollisionError';
    this.code = code;
  }
}

export function toSimulationFailure(error: unknown): SimulationFailure {
  if (error instanceof CollisionError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { code: RUNTIME_STEP_FAILED, message: error.message };
  }
  return { code: RUNTIME_STEP_FAILED, message: 'Unknown runtime failure.' };
}

function findEnabledRigidBody(entity: WorldEntity): RigidBodyComponent | null {
  const components = entity.components ?? [];
  for (const component of components) {
    if (component.type === 'rigidBody' && component.enabled) {
      return component as RigidBodyComponent;
    }
  }
  return null;
}

function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function toRuntimeCollider(entityId: string, collider: RigidBodyComponent['collider']): RuntimeCollider {
  if (collider.kind === 'sphere') {
    if (typeof collider.size !== 'number' || !isPositiveFinite(collider.size)) {
      throw new CollisionError(
        COLLISION_INVALID_COLLIDER,
        `Sphere collider size for entity ${entityId} must be a finite number greater than zero.`
      );
    }
    return { kind: 'sphere', radius: collider.size };
  }

  if (collider.kind === 'box') {
    const size = collider.size;
    if (
      typeof size !== 'object' ||
      size === null ||
      !isPositiveFinite(size.x) ||
      !isPositiveFinite(size.y) ||
      !isPositiveFinite(size.z)
    ) {
      throw new CollisionError(
        COLLISION_INVALID_COLLIDER,
        `Box collider size for entity ${entityId} must be a Vec3 with finite values greater than zero.`
      );
    }
    return {
      kind: 'box',
      halfExtents: { x: size.x / 2, y: size.y / 2, z: size.z / 2 }
    };
  }

  return { kind: 'plane' };
}

/**
 * Derives runtime bodies from authored entities at Play. Entities without an
 * enabled rigid body do not participate. A `plane` collider is a static
 * infinite plane and is retained as a runtime body so dynamic bodies can
 * collide with it, but it is never integrated.
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
      useGravity: rigidBody.useGravity,
      collider: toRuntimeCollider(entity.id, rigidBody.collider)
    };
  }
  return bodies;
}

function cloneTransform(transform: Transform): Transform {
  return {
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale }
  };
}

function assertFiniteBody(body: RuntimeBody): void {
  const values = [
    body.transform.position.x,
    body.transform.position.y,
    body.transform.position.z,
    body.transform.rotation.x,
    body.transform.rotation.y,
    body.transform.rotation.z,
    body.transform.rotation.w,
    body.transform.scale.x,
    body.transform.scale.y,
    body.transform.scale.z,
    body.velocity.x,
    body.velocity.y,
    body.velocity.z
  ];
  if (!values.every((value) => Number.isFinite(value))) {
    throw new CollisionError(
      COLLISION_INVALID_STATE,
      `Runtime transform or velocity for entity ${body.entityId} is not finite.`
    );
  }

  if (body.collider.kind === 'sphere') {
    if (!isPositiveFinite(body.collider.radius)) {
      throw new CollisionError(
        COLLISION_INVALID_COLLIDER,
        `Sphere collider radius for entity ${body.entityId} must be a finite number greater than zero.`
      );
    }
    return;
  }

  if (body.collider.kind === 'box') {
    const halfExtents = body.collider.halfExtents;
    if (
      !isPositiveFinite(halfExtents.x) ||
      !isPositiveFinite(halfExtents.y) ||
      !isPositiveFinite(halfExtents.z)
    ) {
      throw new CollisionError(
        COLLISION_INVALID_COLLIDER,
        `Box collider half-extents for entity ${body.entityId} must be finite values greater than zero.`
      );
    }
  }
}

function lowestPointY(body: RuntimeBody): number {
  if (body.collider.kind === 'sphere') {
    return body.transform.position.y - body.collider.radius;
  }
  if (body.collider.kind === 'box') {
    return body.transform.position.y - body.collider.halfExtents.y;
  }
  return body.transform.position.y;
}

function restingCenterY(body: RuntimeBody, planeY: number): number {
  if (body.collider.kind === 'sphere') {
    return planeY + body.collider.radius;
  }
  if (body.collider.kind === 'box') {
    return planeY + body.collider.halfExtents.y;
  }
  return planeY;
}

/**
 * M1-D approved response: dynamic sphere/box bodies collide with static
 * infinite planes. Penetration is corrected positionally and the inbound
 * normal velocity is removed. Restitution and friction are zero, and angular
 * motion is not integrated or changed. Dynamic-vs-dynamic contacts are out of
 * scope for M1-D.
 *
 * Planes are sorted by entity id so multi-plane resolution is deterministic.
 */
function resolvePlaneCollisions(bodies: RuntimeBodies): void {
  const planes = Object.values(bodies)
    .filter((body) => body.collider.kind === 'plane')
    .sort((a, b) => (a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0));

  if (planes.length === 0) {
    return;
  }

  for (const body of Object.values(bodies)) {
    if (body.collider.kind === 'plane') {
      continue;
    }

    for (const plane of planes) {
      const planeY = plane.transform.position.y;
      if (lowestPointY(body) < planeY) {
        body.transform.position.y = restingCenterY(body, planeY);
        if (body.velocity.y < 0) {
          body.velocity.y = 0;
        }
      }
    }
  }
}

/**
 * Semi-implicit (symplectic) Euler step: velocity is integrated first, then
 * position uses the updated velocity. Plane colliders are static and are not
 * integrated. After integration, M1-D plane contacts are resolved. Pure and
 * deterministic; throws `CollisionError` when runtime state cannot be
 * processed safely.
 */
export function stepBodies(bodies: RuntimeBodies, deltaSeconds: number): RuntimeBodies {
  const next: RuntimeBodies = {};

  for (const [id, body] of Object.entries(bodies)) {
    assertFiniteBody(body);

    if (body.collider.kind === 'plane') {
      next[id] = {
        entityId: body.entityId,
        transform: cloneTransform(body.transform),
        velocity: { ...body.velocity },
        useGravity: body.useGravity,
        collider: body.collider
      };
      continue;
    }

    const velocity: Vec3 = { ...body.velocity };
    if (body.useGravity) {
      velocity.y += GRAVITY_ACCELERATION_Y * deltaSeconds;
    }

    const integrated: RuntimeBody = {
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
      useGravity: body.useGravity,
      collider: body.collider
    };

    assertFiniteBody(integrated);
    next[id] = integrated;
  }

  resolvePlaneCollisions(next);
  return next;
}

export interface SimulationAdvance {
  bodies: RuntimeBodies;
  accumulatorSeconds: number;
  steps: number;
  error?: SimulationFailure;
}

/**
 * Simple fixed-step accumulator. Frame deltas are clamped to
 * MAX_FRAME_DELTA_SECONDS and only whole FIXED_TIMESTEP_SECONDS are consumed;
 * the remainder carries into the next frame.
 *
 * If a step fails, the last valid bodies and accumulator are returned together
 * with a diagnostic so the reducer can pause without committing partial state.
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
    try {
      current = stepBodies(current, FIXED_TIMESTEP_SECONDS);
    } catch (error) {
      return {
        bodies: current,
        accumulatorSeconds: accumulator,
        steps,
        error: toSimulationFailure(error)
      };
    }
    accumulator -= FIXED_TIMESTEP_SECONDS;
    steps += 1;
  }

  return { bodies: current, accumulatorSeconds: accumulator, steps };
}
