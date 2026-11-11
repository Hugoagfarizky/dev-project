import type { AppError, WorldEntity } from '../world/types.ts';
import type { ProjectDocument } from '../project/types.ts';
import type { LogEntry } from '../console/types.ts';
import type { RuntimeBodies } from '../runtime/types.ts';
import { createEmptyWorld } from '../world/defaults.ts';

export type GizmoMode = 'translate' | 'rotate' | 'scale';
export type Preset = 'build' | 'program' | 'simulate';

export interface CameraPose {
  alpha: number;
  beta: number;
  radius: number;
  target: { x: number; y: number; z: number };
}

export type RuntimeStatus = 'editing' | 'running' | 'paused';

export interface RuntimeSnapshot {
  entities: readonly WorldEntity[];
}

export interface RuntimeState {
  status: RuntimeStatus;
  snapshot: RuntimeSnapshot | null;
  lastError: AppError | null;
  /** Runtime-only physics state; never persisted (ADR 0003). */
  bodies: RuntimeBodies;
  accumulatorSeconds: number;
}

export interface EditorState {
  selectedEntityId: string | null;
  gizmoMode: GizmoMode;
  gridVisible: boolean;
  activePreset: Preset;
  camera: CameraPose | null;
}

export interface PersistenceState {
  revision: number;
  savedRevision: number;
  status: 'clean' | 'dirty' | 'saving' | 'save-failed';
  lastSavedAt: string | null;
  lastError: AppError | null;
}

export interface StudioState {
  project: ProjectDocument;
  editor: EditorState;
  persistence: PersistenceState;
  logs: readonly LogEntry[];
  runtime: RuntimeState;
}

export function createDefaultRuntimeState(): RuntimeState {
  return {
    status: 'editing',
    snapshot: null,
    lastError: null,
    bodies: {},
    accumulatorSeconds: 0
  };
}

export function createDefaultEditorState(): EditorState {
  return {
    selectedEntityId: null,
    gizmoMode: 'translate',
    gridVisible: true,
    activePreset: 'build',
    camera: null
  };
}

export function createDefaultPersistenceState(): PersistenceState {
  return {
    revision: 0,
    savedRevision: 0,
    status: 'clean',
    lastSavedAt: null,
    lastError: null
  };
}

export function createEmptyProject(id: string, name: string, createdAt: string): ProjectDocument {
  return {
    format: 'simuforge.project',
    schemaVersion: 1,
    project: {
      id,
      name,
      createdAt,
      updatedAt: createdAt
    },
    world: createEmptyWorld()
  };
}
