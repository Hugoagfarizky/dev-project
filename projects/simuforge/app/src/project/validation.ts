import { validateWorldDocument } from '../world/validation.ts';
import type { AppError } from '../world/types.ts';
import { PROJECT_FORMAT, PROJECT_SCHEMA_VERSION } from './types.ts';
import type { ProjectDocument, ProjectValidationResult } from './types.ts';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(code: AppError['code'], message: string, path?: string, cause?: unknown): AppError {
  const error: AppError = { code, message };
  if (path !== undefined) {
    error.path = path;
  }
  if (cause !== undefined) {
    error.cause = cause;
  }
  return error;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export function validateProjectDocument(value: unknown): ProjectValidationResult {
  if (!isPlainObject(value)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'Project document must be an object') };
  }

  if (value.format !== PROJECT_FORMAT) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'format must be "simuforge.project"', 'format') };
  }

  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: fail('UNSUPPORTED_SCHEMA', 'schemaVersion must be 1', 'schemaVersion')
    };
  }

  if (!isPlainObject(value.project)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'project must be an object', 'project') };
  }

  const project = value.project;
  if (typeof project.id !== 'string' || !UUID_V4_PATTERN.test(project.id)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'project.id must be a UUID v4 string', 'project.id') };
  }

  if (typeof project.name !== 'string' || project.name.trim().length < 1 || project.name.trim().length > 128) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'project.name must be 1-128 characters after trimming', 'project.name') };
  }

  if (typeof project.createdAt !== 'string' || !isIsoTimestamp(project.createdAt)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'project.createdAt must be an ISO 8601 timestamp', 'project.createdAt') };
  }

  if (typeof project.updatedAt !== 'string' || !isIsoTimestamp(project.updatedAt)) {
    return { ok: false, error: fail('VALIDATION_FAILED', 'project.updatedAt must be an ISO 8601 timestamp', 'project.updatedAt') };
  }

  const worldResult = validateWorldDocument(value.world);
  if (!worldResult.ok) {
    const path = worldResult.error.path ? `world.${worldResult.error.path}` : 'world';
    return {
      ok: false,
      error: {
        ...worldResult.error,
        path
      }
    };
  }

  const normalized: ProjectDocument = {
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: {
      id: project.id,
      name: project.name.trim(),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    },
    world: worldResult.value
  };

  return { ok: true, value: normalized };
}
