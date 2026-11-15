import type { AppError, WorldEntity } from '../world/types.ts';
import type { ProjectDocument } from '../project/types.ts';
import type { LogEntry } from '../console/types.ts';
import type { RuntimeBodies } from '../runtime/types.ts';
import type { GraphNodeType } from '../graph/types.ts';
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

export type ExecutionStatus = 'idle' | 'executing' | 'suspended';
export type ExecutionOutcome = 'completed' | 'failed' | 'skipped' | 'cancelled';

export interface ExecutionTriggerInfo {
  nodeId: string;
  type: GraphNodeType;
  at: string;
}

export interface ExecutionResultSummary {
  triggerNodeId: string;
  triggerType: GraphNodeType;
  outcome: ExecutionOutcome;
  nodeCount: number;
  failedNodeId: string | null;
  code: string | null;
  message: string | null;
  at: string;
}

/** One queued trigger activation. Session identity invalidates stale work. */
export interface ExecutionQueueEntry {
  id: string;
  sessionId: number;
  triggerNodeId: string;
  triggerType: GraphNodeType;
  bodyEntityId: string | null;
  planeEntityId: string | null;
}

/**
 * M2-C runtime execution slice. Transient only: never persisted (ADR 0003).
 * `sessionId` is monotonic and increments on Play-from-Editing and Stop/Reset.
 */
export interface RuntimeExecutionState {
  sessionId: number;
  status: ExecutionStatus;
  /** True when the graph passed execution readiness at Play. */
  enabled: boolean;
  queue: ExecutionQueueEntry[];
  lastTrigger: ExecutionTriggerInfo | null;
  lastResult: ExecutionResultSummary | null;
  droppedEvents: number;
  /** Active body/plane contact pairs from the previous physics command. */
  contactKeys: string[];
}

export interface RuntimeState {
  status: RuntimeStatus;
  snapshot: RuntimeSnapshot | null;
  lastError: AppError | null;
  /** Runtime-only physics state; never persisted (ADR 0003). */
  bodies: RuntimeBodies;
  accumulatorSeconds: number;
  execution: RuntimeExecutionState;
}

export interface EditorState {
  selectedEntityId: string | null;
  selectedGraphNodeId: string | null;
  /** Transient M2-C node highlight; never canonical graph data (D-M2C-09). */
  executingGraphNodeId: string | null;
  /** Increments on every executed node so the highlight can re-trigger. */
  executionSequence: number;
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
  /** M2-B in-memory graph document; not persisted in M2-B. */
  graph?: import('../graph/types.ts').Graph | null;
}

export function createDefaultExecutionState(): RuntimeExecutionState {
  return {
    sessionId: 0,
    status: 'idle',
    enabled: false,
    queue: [],
    lastTrigger: null,
    lastResult: null,
    droppedEvents: 0,
    contactKeys: []
  };
}

export function createDefaultRuntimeState(): RuntimeState {
  return {
    status: 'editing',
    snapshot: null,
    lastError: null,
    bodies: {},
    accumulatorSeconds: 0,
    execution: createDefaultExecutionState()
  };
}

export function createDefaultEditorState(): EditorState {
  return {
    selectedEntityId: null,
    selectedGraphNodeId: null,
    executingGraphNodeId: null,
    executionSequence: 0,
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
