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

/** M1-E force/impulse failure and diagnostic codes. */
export const RUNTIME_NOT_ACTIVE = 'RUNTIME_NOT_ACTIVE';
export const FORCE_INVALID_INPUT = 'FORCE_INVALID_INPUT';
export const FORCE_INVALID_TARGET = 'FORCE_INVALID_TARGET';
export const FORCE_INVALID_MASS = 'FORCE_INVALID_MASS';
export const FORCE_INVALID_STATE = 'FORCE_INVALID_STATE';
export const FORCE_APPLIED = 'FORCE_APPLIED';
export const FORCE_CLEARED = 'FORCE_CLEARED';
export const IMPULSE_INVALID_INPUT = 'IMPULSE_INVALID_INPUT';
export const IMPULSE_INVALID_TARGET = 'IMPULSE_INVALID_TARGET';
export const IMPULSE_INVALID_MASS = 'IMPULSE_INVALID_MASS';
export const IMPULSE_INVALID_STATE = 'IMPULSE_INVALID_STATE';
export const IMPULSE_APPLIED = 'IMPULSE_APPLIED';

export interface SimulationFailure {
  code: string;
  message: string;
  /** Validation failures are warnings; runtime failures pause the simulation. */
  severity?: 'warn' | 'error';
}

/**
 * M2-C additive contact boundary. Physics behaviour is unchanged; the step
 * pipeline now reports rising-edge dynamic-body/static-plane contacts so the
 * graph runtime can fire On Plane Contact triggers (D-M2C-07).
 */
export interface PlaneContact {
  kind: 'planeContact';
  bodyEntityId: string;
  planeEntityId: string;
  stepIndex: number;
  position: Vec3;
  normal: Vec3;
  impactSpeed: number;
}

/** Stable key for one dynamic-body/static-plane pair. */
export function contactPairKey(bodyEntityId: string, planeEntityId: string): string {
  return `${bodyEntityId}::${planeEntityId}`;
}

const CONTACT_EPSILON = 1e-9;

/** Base class for deterministic runtime failures. */
export class RuntimeError extends Error {
  readonly code: string;
  readonly severity: 'warn' | 'error';

  constructor(code: string, message: string, severity: 'warn' | 'error' = 'error') {
    super(message);
    this.name = 'RuntimeError';
    this.code = code;
    this.severity = severity;
  }
}

/** Thrown by the pure runtime layer when a step cannot be processed safely. */
export class CollisionError extends RuntimeError {
  constructor(code: string, message: string) {
    super(code, message, 'error');
    this.name = 'CollisionError';
  }
}

/** Thrown when a force or impulse cannot be applied safely. */
export class ForceError extends RuntimeError {
  constructor(code: string, message: string, severity: 'warn' | 'error' = 'error') {
    super(code, message, severity);
    this.name = 'ForceError';
  }
}

export function toSimulationFailure(error: unknown): SimulationFailure {
  if (error instanceof RuntimeError) {
    return { code: error.code, message: error.message, severity: error.severity };
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

function isFiniteVec3(value: Vec3): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    Number.isFinite(value.x) &&
    Number.isFinite(value.y) &&
    Number.isFinite(value.z)
  );
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
    if (!isPositiveFinite(rigidBody.mass)) {
      throw new ForceError(
        FORCE_INVALID_MASS,
        `Rigid body mass for entity ${entity.id} must be a finite number greater than zero.`
      );
    }
    bodies[entity.id] = {
      entityId: entity.id,
      transform: {
        position: { ...entity.transform.position },
        rotation: { ...entity.transform.rotation },
        scale: { ...entity.transform.scale }
      },
      velocity: { ...rigidBody.velocity },
      mass: rigidBody.mass,
      force: { x: 0, y: 0, z: 0 },
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

function cloneRuntimeBody(body: RuntimeBody): RuntimeBody {
  return {
    entityId: body.entityId,
    transform: cloneTransform(body.transform),
    velocity: { ...body.velocity },
    mass: body.mass,
    force: { ...body.force },
    useGravity: body.useGravity,
    collider: body.collider
  };
}

function requireDynamicTarget(
  bodies: RuntimeBodies,
  entityId: string,
  invalidTargetCode: string
): RuntimeBody {
  const body = bodies[entityId];
  if (!body) {
    throw new ForceError(
      invalidTargetCode,
      `No runtime body exists for entity ${entityId}.`,
      'warn'
    );
  }
  if (body.collider.kind === 'plane') {
    throw new ForceError(
      invalidTargetCode,
      `Entity ${entityId} is a static plane and cannot receive force or impulse.`,
      'warn'
    );
  }
  return body;
}

/**
 * Adds a world-space force in newtons to the body's runtime force accumulator.
 * The accumulated force is applied every fixed step until `clearForce`, Reset,
 * or Stop. The input bodies are not mutated.
 */
export function applyForce(bodies: RuntimeBodies, entityId: string, force: Vec3): RuntimeBodies {
  if (!isFiniteVec3(force)) {
    throw new ForceError(
      FORCE_INVALID_INPUT,
      'Force must be a Vec3 with finite x, y, and z components.',
      'warn'
    );
  }

  const body = requireDynamicTarget(bodies, entityId, FORCE_INVALID_TARGET);
  if (!isPositiveFinite(body.mass)) {
    throw new ForceError(
      FORCE_INVALID_MASS,
      `Runtime mass for entity ${entityId} must be a finite number greater than zero.`
    );
  }
  if (!isFiniteVec3(body.force)) {
    throw new ForceError(
      FORCE_INVALID_STATE,
      `Runtime force for entity ${entityId} is not finite.`
    );
  }

  const next = cloneRuntimeBody(body);
  next.force = {
    x: body.force.x + force.x,
    y: body.force.y + force.y,
    z: body.force.z + force.z
  };
  if (!isFiniteVec3(next.force)) {
    throw new ForceError(
      FORCE_INVALID_STATE,
      `Accumulated force for entity ${entityId} is not finite.`
    );
  }

  return { ...bodies, [entityId]: next };
}

/**
 * Applies an instantaneous impulse in newton-seconds (kg*m/s) to a body's
 * velocity: `delta-v = impulse / mass`. Position is unchanged at application
 * time. The input bodies are not mutated.
 */
export function applyImpulse(bodies: RuntimeBodies, entityId: string, impulse: Vec3): RuntimeBodies {
  if (!isFiniteVec3(impulse)) {
    throw new ForceError(
      IMPULSE_INVALID_INPUT,
      'Impulse must be a Vec3 with finite x, y, and z components.',
      'warn'
    );
  }

  const body = requireDynamicTarget(bodies, entityId, IMPULSE_INVALID_TARGET);
  if (!isPositiveFinite(body.mass)) {
    throw new ForceError(
      IMPULSE_INVALID_MASS,
      `Runtime mass for entity ${entityId} must be a finite number greater than zero.`
    );
  }
  if (!isFiniteVec3(body.velocity)) {
    throw new ForceError(
      IMPULSE_INVALID_STATE,
      `Runtime velocity for entity ${entityId} is not finite.`
    );
  }

  const next = cloneRuntimeBody(body);
  next.velocity = {
    x: body.velocity.x + impulse.x / body.mass,
    y: body.velocity.y + impulse.y / body.mass,
    z: body.velocity.z + impulse.z / body.mass
  };
  if (!isFiniteVec3(next.velocity)) {
    throw new ForceError(
      IMPULSE_INVALID_STATE,
      `Resulting velocity for entity ${entityId} is not finite.`
    );
  }

  return { ...bodies, [entityId]: next };
}

/**
 * Clears the runtime force accumulator for one dynamic body, or for every body
 * when `entityId` is omitted. The input bodies are not mutated.
 */
export function clearForce(bodies: RuntimeBodies, entityId?: string): RuntimeBodies {
  if (entityId !== undefined) {
    const body = requireDynamicTarget(bodies, entityId, FORCE_INVALID_TARGET);
    const next = cloneRuntimeBody(body);
    next.force = { x: 0, y: 0, z: 0 };
    return { ...bodies, [entityId]: next };
  }

  const next: RuntimeBodies = {};
  for (const [id, body] of Object.entries(bodies)) {
    const clone = cloneRuntimeBody(body);
    clone.force = { x: 0, y: 0, z: 0 };
    next[id] = clone;
  }
  return next;
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

  if (body.collider.kind !== 'plane') {
    if (!isPositiveFinite(body.mass)) {
      throw new ForceError(
        FORCE_INVALID_MASS,
        `Runtime mass for entity ${body.entityId} must be a finite number greater than zero.`
      );
    }
    if (!isFiniteVec3(body.force)) {
      throw new ForceError(
        FORCE_INVALID_STATE,
        `Runtime force for entity ${body.entityId} is not finite.`
      );
    }
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

interface ResolvedPlaneContacts {
  contacts: Array<Omit<PlaneContact, 'stepIndex'>>;
  activeContactKeys: string[];
}

/**
 * M1-D approved response: dynamic sphere/box bodies collide with static
 * infinite planes. Penetration is corrected positionally and the inbound
 * normal velocity is removed. Restitution and friction are zero, and angular
 * motion is not integrated or changed. Dynamic-vs-dynamic contacts are out of
 * scope for M1-D.
 *
 * Planes and dynamic bodies are sorted by entity id so multi-plane resolution
 * and contact reporting are deterministic. A contact is a rising edge only when
 * the pair was absent from the previous step's active set (D-M2C-07).
 */
function resolvePlaneCollisions(
  bodies: RuntimeBodies,
  previousContactKeys: ReadonlySet<string>
): ResolvedPlaneContacts {
  const planes = Object.values(bodies)
    .filter((body) => body.collider.kind === 'plane')
    .sort((a, b) => (a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0));

  if (planes.length === 0) {
    return { contacts: [], activeContactKeys: [] };
  }

  const dynamicBodies = Object.values(bodies)
    .filter((body) => body.collider.kind !== 'plane')
    .sort((a, b) => (a.entityId < b.entityId ? -1 : a.entityId > b.entityId ? 1 : 0));

  const contacts: Array<Omit<PlaneContact, 'stepIndex'>> = [];
  const activeContactKeys: string[] = [];

  for (const body of dynamicBodies) {
    for (const plane of planes) {
      const planeY = plane.transform.position.y;
      const lowestBeforeResolution = lowestPointY(body);
      if (lowestBeforeResolution > planeY + CONTACT_EPSILON) {
        continue;
      }

      const wasPenetrating = lowestBeforeResolution < planeY;
      const impactSpeed = wasPenetrating ? Math.max(0, -body.velocity.y) : 0;
      if (wasPenetrating) {
        body.transform.position.y = restingCenterY(body, planeY);
        if (body.velocity.y < 0) {
          body.velocity.y = 0;
        }
      }

      const key = contactPairKey(body.entityId, plane.entityId);
      activeContactKeys.push(key);
      if (!previousContactKeys.has(key)) {
        contacts.push({
          kind: 'planeContact',
          bodyEntityId: body.entityId,
          planeEntityId: plane.entityId,
          position: {
            x: body.transform.position.x,
            y: planeY,
            z: body.transform.position.z
          },
          normal: { x: 0, y: 1, z: 0 },
          impactSpeed
        });
      }
    }
  }

  return { contacts, activeContactKeys };
}

export interface StepContactsResult {
  bodies: RuntimeBodies;
  /** Rising-edge contacts for this step only. */
  contacts: PlaneContact[];
  /** Every body/plane pair in contact after this step. */
  activeContactKeys: string[];
}

/**
 * Semi-implicit (symplectic) Euler step: velocity is integrated first, then
 * position uses the updated velocity. Plane colliders are static and are not
 * integrated. After integration, M1-D plane contacts are resolved and M2-C
 * rising-edge contacts are reported. Pure and deterministic; throws
 * `CollisionError` when runtime state cannot be processed safely.
 */
export function stepBodiesWithContacts(
  bodies: RuntimeBodies,
  deltaSeconds: number,
  previousContactKeys: readonly string[] = [],
  stepIndex = 0
): StepContactsResult {
  const next: RuntimeBodies = {};

  for (const [id, body] of Object.entries(bodies)) {
    assertFiniteBody(body);

    if (body.collider.kind === 'plane') {
      next[id] = cloneRuntimeBody(body);
      continue;
    }

    const velocity: Vec3 = { ...body.velocity };
    velocity.x += (body.force.x / body.mass) * deltaSeconds;
    velocity.y += (
      (body.force.y / body.mass) + (body.useGravity ? GRAVITY_ACCELERATION_Y : 0)
    ) * deltaSeconds;
    velocity.z += (body.force.z / body.mass) * deltaSeconds;

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
      mass: body.mass,
      force: { ...body.force },
      useGravity: body.useGravity,
      collider: body.collider
    };

    assertFiniteBody(integrated);
    next[id] = integrated;
  }

  const resolution = resolvePlaneCollisions(next, new Set(previousContactKeys));
  return {
    bodies: next,
    contacts: resolution.contacts.map((contact) => ({ ...contact, stepIndex })),
    activeContactKeys: resolution.activeContactKeys
  };
}

/** Backwards-compatible step used by the M1-C/M1-D physics surface. */
export function stepBodies(bodies: RuntimeBodies, deltaSeconds: number): RuntimeBodies {
  return stepBodiesWithContacts(bodies, deltaSeconds).bodies;
}

export interface SimulationAdvance {
  bodies: RuntimeBodies;
  accumulatorSeconds: number;
  steps: number;
  /** Rising-edge contacts aggregated in step order, deduped per pair. */
  contacts: PlaneContact[];
  /** Contact pairs still active after the final step. */
  activeContactKeys: string[];
  error?: SimulationFailure;
}

/**
 * Simple fixed-step accumulator. Frame deltas are clamped to
 * MAX_FRAME_DELTA_SECONDS and only whole FIXED_TIMESTEP_SECONDS are consumed;
 * the remainder carries into the next frame.
 *
 * M2-C contact reporting is additive: `previousContactKeys` carries the pair set
 * from the prior command so rising edges can be detected, and multiple fixed
 * steps in one frame collapse to the first contact per pair.
 *
 * If a step fails, the last valid bodies and accumulator are returned together
 * with a diagnostic so the reducer can pause without committing partial state.
 */
export function advanceSimulation(
  bodies: RuntimeBodies,
  accumulatorSeconds: number,
  frameDeltaSeconds: number,
  previousContactKeys: readonly string[] = []
): SimulationAdvance {
  if (!Number.isFinite(frameDeltaSeconds) || frameDeltaSeconds <= 0) {
    return {
      bodies,
      accumulatorSeconds,
      steps: 0,
      contacts: [],
      activeContactKeys: [...previousContactKeys]
    };
  }

  const clampedDelta = Math.min(frameDeltaSeconds, MAX_FRAME_DELTA_SECONDS);
  let accumulator = accumulatorSeconds + clampedDelta;
  let current = bodies;
  let steps = 0;
  let activeContactKeys = [...previousContactKeys];
  const contacts: PlaneContact[] = [];
  const seenPairs = new Set<string>();

  while (accumulator >= FIXED_TIMESTEP_SECONDS) {
    try {
      const step = stepBodiesWithContacts(current, FIXED_TIMESTEP_SECONDS, activeContactKeys, steps);
      current = step.bodies;
      activeContactKeys = step.activeContactKeys;
      for (const contact of step.contacts) {
        const key = contactPairKey(contact.bodyEntityId, contact.planeEntityId);
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          contacts.push(contact);
        }
      }
    } catch (error) {
      return {
        bodies: current,
        accumulatorSeconds: accumulator,
        steps,
        contacts,
        activeContactKeys,
        error: toSimulationFailure(error)
      };
    }
    accumulator -= FIXED_TIMESTEP_SECONDS;
    steps += 1;
  }

  return { bodies: current, accumulatorSeconds: accumulator, steps, contacts, activeContactKeys };
}
