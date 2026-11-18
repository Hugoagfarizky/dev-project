import type { AppError, WorldDocument } from '../world/types.ts';
import type { Graph } from '../graph/types.ts';
import type { PythonProjectData } from '../python/types.ts';
import type { ElectricalDocument } from '../electrical/types.ts';

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
  /** Canonical visual-scripting graph (M2-E). Optional for backward compatibility. */
  graph?: Graph | null;
  /** Optional Python scripts (Phase 07). */
  python?: PythonProjectData | null;
  /**
   * Optional Phase 08 circuit wiring and schematic layout. Electrical
   * components themselves live on world entities. Kept optional under schema
   * v1 so projects without electrical data open unchanged.
   */
  electrical?: ElectricalDocument | null;
}

export type ProjectValidationResult =
  | { ok: true; value: ProjectDocument; warnings?: string[] }
  | { ok: false; error: AppError };
