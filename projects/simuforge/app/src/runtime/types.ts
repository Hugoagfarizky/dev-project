import type { Transform, Vec3 } from '../world/types.ts';

/**
 * Runtime collider derived from the authored `RigidBodyComponent` at Play.
 *
 * - `sphere`: `radius` is the authored collider size.
 * - `box`: `halfExtents` is half of the authored collider size.
 * - `plane`: a static infinite horizontal plane at the body position with a
 *   +Y normal. Authored rotation and scale are not applied in M1-D.
 *
 * Collider sizes are treated as world-space values; authored transform scale
 * is not applied to colliders in M1-D.
 */
export type RuntimeCollider =
  | { kind: 'sphere'; radius: number }
  | { kind: 'box'; halfExtents: Vec3 }
  | { kind: 'plane' };

/**
 * Runtime-only body state for M1-C/M1-D/M1-E.
 *
 * Bodies are derived from authored `RigidBodyComponent` values when Play is
 * pressed and are never persisted (ADR 0003). Transforms here are a runtime
 * overlay; authored `project.world` state is not mutated while running.
 */
export interface RuntimeBody {
  entityId: string;
  transform: Transform;
  velocity: Vec3;
  /** Authored mass in kg, captured at Play and used for force/impulse. */
  mass: number;
  /**
   * Runtime-only accumulated force in newtons (kg*m/s^2). It is applied every
   * fixed step until cleared, Reset, or Stop. Never persisted (ADR 0003).
   */
  force: Vec3;
  useGravity: boolean;
  collider: RuntimeCollider;
}

export type RuntimeBodies = Record<string, RuntimeBody>;
