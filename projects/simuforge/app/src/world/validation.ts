import type { AppError, Component, EntityType, Quat, Vec3, WorldDocument, WorldEntity } from './types.ts';
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

export function validateComponent(value: unknown, path: string): AppError | null {
  if (!isPlainObject(value)) {
    return fail('VALIDATION_FAILED', 'Component must be an object', path);
  }
  if (typeof value.id !== 'string' || !UUID_V4_PATTERN.test(value.id)) {
    return fail('VALIDATION_FAILED', 'id must be a UUID v4 string', `${path}.id`);
  }
  if (typeof value.type !== 'string' || value.type.length < 1) {
    return fail('VALIDATION_FAILED', 'type must be a non-empty string', `${path}.type`);
  }
  if (typeof value.enabled !== 'boolean') {
    return fail('VALIDATION_FAILED', 'enabled must be a boolean', `${path}.enabled`);
  }

  if (value.type === 'rigidBody') {
    if (typeof value.mass !== 'number' || !Number.isFinite(value.mass) || value.mass <= 0) {
      return fail('VALIDATION_FAILED', 'mass must be a finite number greater than zero', `${path}.mass`);
    }
    if (typeof value.useGravity !== 'boolean') {
      return fail('VALIDATION_FAILED', 'useGravity must be a boolean', `${path}.useGravity`);
    }
    if (!isPlainObject(value.collider)) {
      return fail('VALIDATION_FAILED', 'collider must be an object', `${path}.collider`);
    }
    const collider = value.collider as Record<string, unknown>;
    if (collider.kind !== 'sphere' && collider.kind !== 'box' && collider.kind !== 'plane') {
      return fail('VALIDATION_FAILED', 'collider.kind must be sphere, box, or plane', `${path}.collider.kind`);
    }
    if (collider.kind === 'sphere') {
      if (typeof collider.size !== 'number' || !Number.isFinite(collider.size) || collider.size <= 0) {
        return fail('VALIDATION_FAILED', 'sphere collider size must be a finite number greater than zero', `${path}.collider.size`);
      }
    } else {
      const sizeError = validateVec3(collider.size, `${path}.collider.size`);
      if (sizeError) return sizeError;
    }
    const velocityError = validateVec3(value.velocity, `${path}.velocity`);
    if (velocityError) return velocityError;
    const angularVelocityError = validateVec3(value.angularVelocity, `${path}.angularVelocity`);
    if (angularVelocityError) return angularVelocityError;
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

    if (entity.components !== undefined) {
      if (!Array.isArray(entity.components)) {
        return { ok: false, error: fail('VALIDATION_FAILED', 'components must be an array', `${entityPath}.components`) };
      }
      const seenComponentIds = new Set<string>();
      for (let cIndex = 0; cIndex < entity.components.length; cIndex += 1) {
        const component = entity.components[cIndex];
        const componentError = validateComponent(component, `${entityPath}.components[${cIndex}]`);
        if (componentError) {
          return { ok: false, error: componentError };
        }
        const comp = component as { id: string };
        if (seenComponentIds.has(comp.id)) {
          return { ok: false, error: fail('VALIDATION_FAILED', 'component id must be unique within the entity', `${entityPath}.components[${cIndex}].id`) };
        }
        seenComponentIds.add(comp.id);
      }
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
    metadata: { ...(entity.metadata as Record<string, unknown>) },
    components: Array.isArray(entity.components)
      ? (entity.components.map((component: unknown) => ({ ...(component as Record<string, unknown>) })) as Component[])
      : []
  })) as WorldEntity[];

  return {
    ok: true,
    value: {
      format: WORLD_FORMAT,
      schemaVersion: WORLD_SCHEMA_VERSION,
      entities: normalizedEntities
    }
  };
}
