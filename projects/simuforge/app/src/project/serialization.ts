import { serializeWorldDocument } from '../world/serialization.ts';
import { PROJECT_FORMAT, PROJECT_SCHEMA_VERSION } from './types.ts';
import { validateProjectDocument } from './validation.ts';
import type { ProjectDocument } from './types.ts';

export function serializeProjectDocument(project: ProjectDocument): string {
  return JSON.stringify({
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    project: {
      id: project.project.id,
      name: project.project.name,
      createdAt: project.project.createdAt,
      updatedAt: project.project.updatedAt
    },
    world: JSON.parse(serializeWorldDocument(project.world))
  });
}

export function parseProjectDocument(json: string): ReturnType<typeof validateProjectDocument> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'INVALID_JSON',
        message: 'Project document contains invalid JSON',
        cause
      }
    };
  }

  return validateProjectDocument(parsed);
}
