import type { EntityType, Transform, Vec3, WorldDocument, WorldEntity } from './types.ts';

export const WORLD_FORMAT = 'simuforge.world' as const;
export const WORLD_SCHEMA_VERSION = 1 as const;
export const MIN_SCALE = 1e-3;

export function createVec3(x = 0, y = 0, z = 0): Vec3 {
  return { x, y, z };
}

export function identityQuaternion(): { x: number; y: number; z: number; w: number } {
  return { x: 0, y: 0, z: 0, w: 1 };
}

export function defaultTransform(entityType: EntityType): Transform {
  const position =
    entityType === 'plane' ? createVec3(0, 0, 0) : createVec3(0, 0.5, 0);

  return {
    position,
    rotation: identityQuaternion(),
    scale: createVec3(1, 1, 1)
  };
}

export function createWorldEntity(
  entityType: EntityType,
  id: string,
  name: string,
  transform: Transform = defaultTransform(entityType)
): WorldEntity {
  return {
    id,
    name,
    type: entityType,
    transform: cloneTransform(transform),
    metadata: {},
    components: []
  };
}

export function cloneTransform(transform: Transform): Transform {
  return {
    position: { ...transform.position },
    rotation: { ...transform.rotation },
    scale: { ...transform.scale }
  };
}

export function createEmptyWorld(): WorldDocument {
  return {
    format: WORLD_FORMAT,
    schemaVersion: WORLD_SCHEMA_VERSION,
    entities: []
  };
}
