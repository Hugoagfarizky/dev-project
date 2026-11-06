export type EntityId = string;

export type EntityType = 'cube' | 'sphere' | 'plane';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export interface WorldEntity {
  id: EntityId;
  name: string;
  type: EntityType;
  transform: Transform;
  metadata: Record<string, unknown>;
}

export interface WorldDocument {
  format: 'simuforge.world';
  schemaVersion: 1;
  entities: WorldEntity[];
}

export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'INVALID_JSON'
  | 'UNSUPPORTED_SCHEMA'
  | 'INVALID_METADATA';

export interface AppError {
  code: AppErrorCode | string;
  message: string;
  path?: string;
  detail?: string;
  cause?: unknown;
}
