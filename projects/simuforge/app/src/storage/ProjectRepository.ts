import type { ProjectDocument } from '../project/types.ts';
import type { AppError } from '../world/types.ts';

export interface ProjectRepository {
  list(): Promise<ProjectDocument[]>;
  get(id: string): Promise<ProjectDocument | null>;
  save(project: ProjectDocument): Promise<void>;
  delete(id: string): Promise<void>;
  isAvailable(): boolean;
}

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };