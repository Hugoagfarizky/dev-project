import type { AppError, WorldDocument } from '../world/types.ts';

export const PROJECT_FORMAT = 'simuforge.project' as const;
export const PROJECT_SCHEMA_VERSION = 1 as const;

export interface ProjectMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDocument {
  format: typeof PROJECT_FORMAT;
  schemaVersion: typeof PROJECT_SCHEMA_VERSION;
  project: ProjectMetadata;
  world: WorldDocument;
}

export type ProjectValidationResult =
  | { ok: true; value: ProjectDocument }
  | { ok: false; error: AppError };
