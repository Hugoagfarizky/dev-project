import type { Transform, Vec3 } from '../world/types.ts';

/**
 * Runtime-only body state for M1-C.
 *
 * Bodies are derived from authored `RigidBodyComponent` values when Play is
 * pressed and are never persisted (ADR 0003). Transforms here are a runtime
 * overlay; authored `project.world` state is not mutated while running.
 */
export interface RuntimeBody {
  entityId: string;
  transform: Transform;
  velocity: Vec3;
  useGravity: boolean;
}

export type RuntimeBodies = Record<string, RuntimeBody>;
