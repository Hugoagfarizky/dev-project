import { WORLD_FORMAT, WORLD_SCHEMA_VERSION, cloneTransform } from './defaults.ts';
import { validateWorldDocument } from './validation.ts';
import type { WorldDocument } from './types.ts';

export function serializeWorldDocument(world: WorldDocument): string {
  return JSON.stringify({
    format: WORLD_FORMAT,
    schemaVersion: WORLD_SCHEMA_VERSION,
    entities: world.entities.map((entity) => ({
      id: entity.id,
      name: entity.name,
      type: entity.type,
      transform: cloneTransform(entity.transform),
      metadata: { ...entity.metadata }
    }))
  });
}

export function parseWorldDocument(json: string): ReturnType<typeof validateWorldDocument> & { jsonError?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    return {
      ok: false,
      error: {
        code: 'INVALID_JSON',
        message: 'World document contains invalid JSON',
        cause
      }
    };
  }

  return validateWorldDocument(parsed);
}
