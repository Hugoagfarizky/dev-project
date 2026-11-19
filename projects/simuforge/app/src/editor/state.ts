import type { AppError, WorldEntity } from '../world/types.ts';
import type { ProjectDocument } from '../project/types.ts';
import type { LogEntry } from '../console/types.ts';
import type { RuntimeBodies } from '../runtime/types.ts';
import type { GraphNodeType } from '../graph/types.ts';
import type { PythonSnapshot, PythonRuntimeStatus } from '../python/types.ts';
import type { ExecutionPlan } from '../runtime/graphExecution.ts';
import type { CircuitSolution } from '../electrical/solver.ts';
import type { ElectricalDiagnostic } from '../electrical/types.ts';
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
export interface PendingPythonExecution {
  requestId: string;
  entry: ExecutionQueueEntry;
  plan: ExecutionPlan;
  nodeId: string;
  index: number;
  scriptId: string;
  snapshot: PythonSnapshot;
  executedBefore: number;
  startedAt: string;
}

export interface PythonRunSummary {
  scriptId: string;
  scriptName: string;
  ok: boolean;
  durationMs: number;
  message: string | null;
  actionCount: number;
  at: string;
}

export interface PythonEditorState {
  selectedScriptId: string | null;
  runtimeStatus: PythonRuntimeStatus;
  runtimeDetail: string | null;
  loadRequest: number;
  lastRun: PythonRunSummary | null;
}

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
  /** Phase 07: a chain suspended on an async Python node. */
  pendingPython: PendingPythonExecution | null;
}

export type RuntimeElectricalStatus = 'idle' | 'solved' | 'invalid' | 'failed';

/**
 * Phase 08 transient electrical runtime slice. Holds the last valid DC solution,
 * live switch/source overrides, and solver diagnostics. Never persisted: the
 * authored circuit stays in `project.electrical` and entity components.
 */
export interface RuntimeElectricalState {
  status: RuntimeElectricalStatus;
  /** Last valid solution. Preserved when a later re-solve fails. */
  solution: CircuitSolution | null;
  diagnostics: readonly ElectricalDiagnostic[];
  /** Live switch overrides keyed by `entityId/componentId`. */
  switchStates: Record<string, boolean>;
  /** Live source voltage overrides keyed by `entityId/componentId`. */
  sourceVoltages: Record<string, number>;
  /** Number of solve attempts in this runtime session. */
  solveCount: number;
  /** Duration of the most recent solve attempt in milliseconds. */
  lastSolveMs: number;
}

export interface RuntimeState {
  status: RuntimeStatus;
  snapshot: RuntimeSnapshot | null;
  lastError: AppError | null;
  /** Runtime-only physics state; never persisted (ADR 0003). */
  bodies: RuntimeBodies;
  accumulatorSeconds: number;
  /** Simulation time in seconds (fixed-step count * dt). Transient. */
  elapsedSeconds: number;
  execution: RuntimeExecutionState;
  /** Runtime-only electrical state; never persisted (D-P08-03). */
  electrical: RuntimeElectricalState;
  /** Runtime-only robotics state; never persisted. */
  robotics: RuntimeRoboticsState;
  /** Runtime-only extension state; never persisted. */
  extensions: RuntimeExtensionState;
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
  /** Phase 07 Python authoring state. Canonical scripts live in project.python. */
  python?: PythonEditorState;
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
    contactKeys: [],
    pendingPython: null
  };
}

export function createDefaultElectricalState(): RuntimeElectricalState {
  return {
    status: 'idle',
    solution: null,
    diagnostics: [],
    switchStates: {},
    sourceVoltages: {},
    solveCount: 0,
    lastSolveMs: 0
  };
}

export type RuntimeRoboticsStatus = 'idle' | 'solved' | 'invalid' | 'failed';

export interface RuntimeRoboticsState {
  status: RuntimeRoboticsStatus;
  jointAngles: Record<string, number>;
  jointVelocities: Record<string, number>;
  actuatorStates: Record<string, { voltage: number; current: number; torque: number; speed: number }>;
  sensorReadings: Record<string, number | boolean>;
  diagnostics: readonly { code: string; severity: 'error' | 'warning'; message: string }[];
  solveCount: number;
  lastSolveMs: number;
}

export function createDefaultRoboticsState(): RuntimeRoboticsState {
  return {
    status: 'idle',
    jointAngles: {},
    jointVelocities: {},
    actuatorStates: {},
    sensorReadings: {},
    diagnostics: [],
    solveCount: 0,
    lastSolveMs: 0
  };
}

export type RuntimeExtensionStatus = 'idle' | 'loaded' | 'error';

export interface RuntimeExtensionState {
  status: RuntimeExtensionStatus;
  loadedExtensions: string[];
  enabledExtensions: string[];
  diagnostics: readonly import('../extensions/types.ts').ExtensionDiagnostic[];
  /** Transient values written by extension graph nodes, keyed by component id. */
  componentValues: Record<string, number>;
  /** Latest module outputs, keyed by `${extensionId}:${moduleId}`. */
  moduleOutputs: Record<string, number | string | boolean | null>;
  /** Number of hook invocations observed in this runtime session. */
  tickCount: number;
  lastTickMs: number;
}

export function createDefaultExtensionState(): RuntimeExtensionState {
  return {
    status: 'idle',
    loadedExtensions: [],
    enabledExtensions: [],
    diagnostics: [],
    componentValues: {},
    moduleOutputs: {},
    tickCount: 0,
    lastTickMs: 0
  };
}

export function createDefaultRuntimeState(): RuntimeState {
  return {
    status: 'editing',
    snapshot: null,
    lastError: null,
    bodies: {},
    accumulatorSeconds: 0,
    elapsedSeconds: 0,
    execution: createDefaultExecutionState(),
    electrical: createDefaultElectricalState(),
    robotics: createDefaultRoboticsState(),
    extensions: createDefaultExtensionState()
  };
}

export function createDefaultPythonState(): PythonEditorState {
  return {
    selectedScriptId: null,
    runtimeStatus: 'idle',
    runtimeDetail: null,
    loadRequest: 0,
    lastRun: null
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
