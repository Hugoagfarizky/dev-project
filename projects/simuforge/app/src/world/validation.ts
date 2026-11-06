import type { AppError, EntityType, Quat, Vec3, WorldDocument, WorldEntity } from './types.ts';
import { MIN_SCALE, WORLD_FORMAT, WORLD_SCHEMA_VERSION } from './defaults.ts';
import { normalizeQuaternion, quaternionLength } from './transform.ts';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(code: AppError['code'], message: string, path?: string): AppError {
  const error: AppError = { code, message };
  if (path !== undefined) {
    error.path = path;
  }
  return error;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateVec3(value: unknown, path: string): AppError | null {
  if (!isPlainObject(value)) {
    return fail('VALIDATION_FAILED', 'Expected a vector object', path);
  }
  if (!isFiniteNumber(value.x)) {
    return fail('VALIDATION_FAILED', 'x must be a finite number', `${path}.x`);
  }
  if (!isFiniteNumber(value.y)) {
    return fail('VALIDATION_FAILED', 'y must be a finite number', `${path}.y`);
  }
  if (!isFiniteNumber(value.z)) {
    return fail('VALIDATION_FAILED', 'z must be a finite number', `${path}.z`);
  }
  return null;
}

function validateQuat(value: unknown, path: string): AppError | null {
  if (!isPlainObject(value)) {
    return fail('VALIDATION_FAILED', 'Expected a quaternion object', path);
  }
  if (!isFiniteNumber(value.x) || !isFiniteNumber(value.y) || !isFiniteNumber(value.z) || !isFiniteNumber(value.w)) {
    return fail('VALIDATION_FAILED', 'Quaternion components must be finite numbers', path);
  }
  const length = quaternionLength(value as unknown as Quat);
  if (!Number.isFinite(length) || length === 0) {
    return fail('VALIDATION_FAILED', 'Quaternion length must be greater than zero', path);
  }
  return null;
}

export function validateTransform(value: unknown, path: string): AppError | null {
  if (!isPlainObject(value)) {
    return fail('VALIDATION_FAILED', 'Expected a transform object', path);
  }
  const positionError = validateVec3(value.position, `${path}.position`);
  if (positionError) return positionError;
  const rotationError = validateQuat(value.rotation, `${path}.rotation`);
  if (rotationError) return rotationError;
  const scaleError = validateVec3(value.scale, `${path}.scale`);
  if (scaleError) return scaleError;

  const scale = value.scale as Vec3;
  for (const axis of ['x', 'y', 'z'] as const) {
    if (scale[axis] < MIN_SCALE) {
      return fail('VALIDATION_FAILED', `${axis} scale must be at least ${MIN_SCALE}`, `${path}.scale.${axis}`);
    }
  }

  return null;
}

export function validateWorldDocument(value: unknown): { ok: true; value: WorldDocument } | { ok: false; error: AppError } {
  if (!isPlainObject(value)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'World document must be an object') };
  }

  if (value.format !== 'simuforge.world') {
    return { ok: false, error: fail('VALIDATION_FAILED', 'format must be "simuforge.world"', 'format') };
  }

  if (value.schemaVersion !== WORLD_SCHEMA_VERSION) {
    return { ok: false, error: fail('UNSUPPORTED_SCHEMA', 'schemaVersion must be 1', 'schemaVersion') };
  }

  if (!Array.isArray(value.entities)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'entities must be an array', 'entities') };
  }

  const seenIds = new Set<string>();

  for (let index = 0; index < value.entities.length; index += 1) {
    const entity = value.entities[index];
    const entityPath = `entities[${index}]`;

    if (!isPlainObject(entity)) {
      return { ok: false, error: fail('VALIDATION_FAILED', 'Entity must be an object', entityPath) };
    }

    if (typeof entity.id !== 'string' || !UUID_V4_PATTERN.test(entity.id)) {
      return { ok: false, error: fail('VALIDATION_FAILED', 'id must be a UUID v4 string', `${entityPath}.id`) };
    }

    if (seenIds.has(entity.id)) {
      return { ok: false, error: fail('VALIDATION_FAILED', 'id must be unique within the document', `${entityPath}.id`) };
    }
    seenIds.add(entity.id);

    if (typeof entity.name !== 'string' || entity.name.length < 1 || entity.name.length > 128) {
      return { ok: false, error: fail('VALIDATION_FAILED', 'name must be 1-128 characters', `${entityPath}.name`) };
    }

    if (entity.type !== 'cube' && entity.type !== 'sphere' && entity.type !== 'plane') {
      return { ok: false, error: fail('VALIDATION_FAILED', 'type must be cube, sphere, or plane', `${entityPath}.type`) };
    }

    const transformError = validateTransform(entity.transform, `${entityPath}.transform`);
    if (transformError) {
      return { ok: false, error: transformError };
    }

    if (!isPlainObject(entity.metadata)) {
      return { ok: false, error: fail('VALIDATION_FAILED', 'metadata must be a plain object', `${entityPath}.metadata`) };
    }
  }

  const normalizedEntities: WorldEntity[] = value.entities.map((entity) => ({
    id: entity.id as string,
    name: entity.name as string,
    type: entity.type as EntityType,
    transform: {
      position: { ...(entity.transform as { position: Vec3 }).position },
      rotation: normalizeQuaternion((entity.transform as { rotation: Quat }).rotation),
      scale: { ...(entity.transform as { scale: Vec3 }).scale }
    },
    metadata: { ...(entity.metadata as Record<string, unknown>) }
  }));

  return {
    ok: true,
    value: {
      format: WORLD_FORMAT,
      schemaVersion: WORLD_SCHEMA_VERSION,
      entities: normalizedEntities
    }
  };
}
