import { validateWorldDocument } from '../world/validation.ts';
import { validateGraph } from '../graph/validation.ts';
import type { AppError } from '../world/types.ts';
import { PROJECT_FORMAT, PROJECT_SCHEMA_VERSION } from './types.ts';
import type { ProjectDocument, ProjectValidationResult } from './types.ts';
import type { Graph } from '../graph/types.ts';
import type { GraphValidationContext } from '../graph/types.ts';

const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ONE_MIB = 1024 * 1024;

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
    return { ok: false, error: fail('INVALID_DOCUMENT', 'Project document must be an object') };
  }

  if (value.format !== PROJECT_FORMAT) {
    return { ok: false, error: fail('UNKNOWN_PROJECT_FORMAT', 'format must be "simuforge.project"', 'format') };
  }

  if (value.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    return {
      ok: false,
      error: fail('UNSUPPORTED_PROJECT_SCHEMA_VERSION', 'schemaVersion must be 1', 'schemaVersion')
    };
  }

  if (!isPlainObject(value.project)) {
    return { ok: false, error: fail('INVALID_PROJECT_METADATA', 'project must be an object', 'project') };
  }

  const project = value.project;
  if (typeof project.id !== 'string' || !UUID_V4_PATTERN.test(project.id)) {
    return { ok: false, error: fail('INVALID_PROJECT_ID', 'project.id must be a UUID v4 string', 'project.id') };
  }

  if (typeof project.name !== 'string' || project.name.trim().length < 1 || project.name.trim().length > 128) {
    return { ok: false, error: fail('INVALID_PROJECT_NAME', 'project.name must be 1-128 characters after trimming', 'project.name') };
  }

  if (typeof project.createdAt !== 'string' || !isIsoTimestamp(project.createdAt)) {
    return { ok: false, error: fail('INVALID_PROJECT_TIMESTAMP', 'project.createdAt must be an ISO 8601 timestamp', 'project.createdAt') };
  }

  if (typeof project.updatedAt !== 'string' || !isIsoTimestamp(project.updatedAt)) {
    return { ok: false, error: fail('INVALID_PROJECT_TIMESTAMP', 'project.updatedAt must be an ISO 8601 timestamp', 'project.updatedAt') };
  }

  if (Date.parse(project.updatedAt) < Date.parse(project.createdAt)) {
    return { ok: false, error: fail('INVALID_PROJECT_TIMESTAMP', 'project.updatedAt must be greater than or equal to project.createdAt', 'project.updatedAt') };
  }

  const worldResult = validateWorldDocument(value.world);
  if (!worldResult.ok) {
    const path = worldResult.error.path ? `world.${worldResult.error.path}` : 'world';
    return {
      ok: false,
      error: {
        ...worldResult.error,
        code: 'INVALID_WORLD',
        path
      }
    };
  }

  // Optional graph (M2-E). Validate against the project's actual entities; an
  // invalid graph is stripped (not fatal) and reported via warnings so the rest
  // of a valid project can still open.
  let normalizedGraph: Graph | null | undefined;
  const warnings: string[] = [];
  if (value.graph !== undefined && value.graph !== null) {
    if (typeof value.graph !== 'object' || Array.isArray(value.graph)) {
      normalizedGraph = null;
      warnings.push('INVALID_GRAPH: graph must be an object or null');
    } else {
      const graphContext: GraphValidationContext = {
        entities: worldResult.value.entities.map((entity) => ({
          id: entity.id,
          components: entity.components ?? []
        }))
      };
      const graphResult = validateGraph(value.graph as Graph, graphContext);
      if (!graphResult.valid) {
        const diag = graphResult.diagnostics.find((d) => d.severity === 'error') ?? graphResult.diagnostics[0];
        normalizedGraph = null;
        warnings.push(diag ? `${diag.code}: ${diag.message}` : 'Graph is invalid.');
      } else {
        normalizedGraph = value.graph as Graph;
      }
    }
  } else if (value.graph === null) {
    normalizedGraph = null;
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
    world: worldResult.value,
    ...(normalizedGraph !== undefined ? { graph: normalizedGraph } : {})
  };

  return { ok: true, value: normalized, ...(warnings.length ? { warnings } : {}) };
}

export function checkProjectSize(bytes: number): AppError | null {
  if (bytes > ONE_MIB) {
    return fail('FILE_TOO_LARGE', `File exceeds 1 MiB (${bytes} bytes)`);
  }
  return null;
}