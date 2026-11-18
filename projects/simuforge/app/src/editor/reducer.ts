import { createWorldEntity } from '../world/defaults.ts';
import { cloneComponents, isSwitchComponent, isVoltageSourceComponent } from '../world/components.ts';
import { validateTransform, validateComponent } from '../world/validation.ts';
import { validateElectricalDocument } from '../electrical/validation.ts';
import { ELECTRICAL_CODES, createEmptyElectricalDocument } from '../electrical/types.ts';
import type { ElectricalDiagnostic, ElectricalDocument } from '../electrical/types.ts';
import {
  collectAuthoredElectricalOverrides,
  electricalOverrideKey,
  solveElectricalCircuit
} from '../runtime/electrical.ts';
import type { ElectricalOverrides } from '../runtime/electrical.ts';
import { transformsEqual } from '../world/transform.ts';
import { createDefaultRuntimeState, createDefaultPythonState, createDefaultElectricalState, createEmptyProject } from './state.ts';
import {
  advanceSimulation,
  applyForce,
  applyImpulse,
  clearForce,
  createRuntimeBodies,
  FORCE_APPLIED,
  FORCE_CLEARED,
  IMPULSE_APPLIED,
  RUNTIME_NOT_ACTIVE,
  toSimulationFailure
} from '../runtime/physics.ts';
import {
  EXECUTION_QUEUE_CAPACITY,
  GRAPH_EXECUTION_CODES,
  buildExecutionPlan,
  evaluateExecutionReadiness,
  executeChain,
  hasOutgoingEdge,
  matchContactTriggers,
  selectManualTriggerNode,
  selectTriggerNodes
} from '../runtime/graphExecution.ts';
import type { SimulationFailure } from '../runtime/physics.ts';
import type { RuntimeBodies } from '../runtime/types.ts';
import { validateGraph } from '../graph/validation.ts';
import type { StudioCommand } from './commands.ts';
import type {
  CameraPose,
  ExecutionOutcome,
  ExecutionQueueEntry,
  ExecutionResultSummary,
  PendingPythonExecution,
  RuntimeExecutionState,
  StudioState
} from './state.ts';
import type { EntityType, RigidBodyComponent, WorldEntity } from '../world/types.ts';
import type { Graph, GraphNodeType, GraphValidationContext } from '../graph/types.ts';
import { PYTHON_FIXED_DT_SECONDS, PYTHON_SOURCE_MAX_CHARS } from '../python/limits.ts';
import { findPythonScript, pythonScripts } from '../python/validation.ts';
import type { PythonSnapshot } from '../python/types.ts';
import type { PythonRunOutcome } from '../python/types.ts';
import { PYTHON_CODES } from '../python/types.ts';

export interface ReducerContext {
  idFactory: () => string;
  clock: () => string;
  /** Optional monotonic millisecond timer used for solver evidence. */
  now?: () => number;
}

const defaultContext: ReducerContext = {
  idFactory: () => crypto.randomUUID(),
  clock: () => new Date().toISOString(),
  now: () => (typeof performance === 'undefined' ? Date.now() : performance.now())
};

const DEFAULT_NAME_BASE: Record<EntityType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  plane: 'Plane'
};

const MAX_ENTITY_NAME_LENGTH = 128;

function normalizeEntityName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_ENTITY_NAME_LENGTH) {
    return null;
  }
  return trimmed;
}

function defaultEntityName(entities: readonly WorldEntity[], entityType: EntityType): string {
  const base = DEFAULT_NAME_BASE[entityType];
  const used = new Set(entities.map((entity) => entity.name));
  if (!used.has(base)) {
    return base;
  }
  let suffix = 2;
  while (used.has(`${base} ${suffix}`)) {
    suffix += 1;
  }
  return `${base} ${suffix}`;
}

function sameCamera(a: CameraPose | null, b: CameraPose | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.alpha === b.alpha &&
    a.beta === b.beta &&
    a.radius === b.radius &&
    a.target.x === b.target.x &&
    a.target.y === b.target.y &&
    a.target.z === b.target.z
  );
}

function markDirty(state: StudioState): StudioState {
  return {
    ...state,
    persistence: {
      ...state.persistence,
      revision: state.persistence.revision + 1,
      status: 'dirty'
    }
  };
}

function replaceEntity(
  entities: readonly WorldEntity[],
  id: string,
  update: (entity: WorldEntity) => WorldEntity
): WorldEntity[] {
  return entities.map((entity) => (entity.id === id ? update(entity) : entity));
}

function cloneEntity(entity: WorldEntity): WorldEntity {
  return {
    ...entity,
    transform: {
      position: { ...entity.transform.position },
      rotation: { ...entity.transform.rotation },
      scale: { ...entity.transform.scale }
    },
    components: cloneComponents(entity.components)
  };
}

const STRUCTURAL_COMMANDS = new Set<string>([
  'entity/create',
  'entity/delete',
  'entity/rename',
  'transform/set',
  'component/add',
  'component/remove',
  'component/set',
  'electrical/set',
  'electrical/add-wire',
  'electrical/remove-wire',
  'electrical/set-layout',
  'demo/load-scenario',
  'graph/set',
  'python/create-script',
  'python/rename-script',
  'python/delete-script',
  'python/set-source'
]);

function appendRuntimeBlockedLog(state: StudioState): StudioState {
  return {
    ...state,
    logs: [...state.logs, {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      severity: 'warn' as const,
      source: 'RUNTIME' as const,
      code: 'STRUCTURAL_EDIT_BLOCKED',
      message: 'Structural edit blocked while simulation is running or paused.'
    }].slice(-500)
  };
}

/**
 * Runtime failure contract (M1-B): preserve the last valid state, pause safely,
 * and report a diagnostic. Collision failures are surfaced the same way.
 * M1-E validation failures use `severity: 'warn'` and leave runtime state
 * untouched; internal failures remain errors and pause the simulation.
 */
function appendRuntimeFailureLog(
  state: StudioState,
  failure: SimulationFailure,
  context: ReducerContext,
  status: 'editing' | 'paused'
): StudioState {
  const severity = failure.severity ?? 'error';
  const entry = {
    id: context.idFactory(),
    timestamp: context.clock(),
    severity,
    source: 'RUNTIME' as const,
    code: failure.code,
    message: failure.message
  };

  if (severity === 'warn') {
    return {
      ...state,
      logs: [...state.logs, entry].slice(-500)
    };
  }

  return {
    ...state,
    runtime: {
      ...state.runtime,
      status,
      lastError: { code: failure.code, message: failure.message }
    },
    logs: [...state.logs, entry].slice(-500)
  };
}

function appendRuntimeInfoLog(
  state: StudioState,
  context: ReducerContext,
  entry: { code: string; message: string; entityId?: string; detail?: string; source?: 'APP' | 'EDITOR' | 'RENDER' | 'IMPORT' | 'RUNTIME' | 'PYTHON' | 'ELECTRICAL' }
): StudioState {
  return {
    ...state,
    logs: [...state.logs, {
      id: context.idFactory(),
      timestamp: context.clock(),
      severity: 'info' as const,
      source: (entry.source ?? 'RUNTIME') as any,
      code: entry.code,
      message: entry.message,
      ...(entry.entityId ? { entityId: entry.entityId } : {}),
      ...(entry.detail ? { detail: entry.detail } : {})
    }].slice(-500)
  };
}

function appendExecutionLog(
  state: StudioState,
  context: ReducerContext,
  entry: {
    severity: 'info' | 'warn' | 'error';
    code: string;
    message: string;
    entityId?: string;
    detail?: string;
    source?: 'APP' | 'EDITOR' | 'RENDER' | 'IMPORT' | 'RUNTIME' | 'PYTHON' | 'ELECTRICAL';
  }
): StudioState {
  return {
    ...state,
    logs: [...state.logs, {
      id: context.idFactory(),
      timestamp: context.clock(),
      severity: entry.severity,
      source: (entry.source ?? 'RUNTIME') as any,
      code: entry.code,
      message: entry.message,
      ...(entry.entityId ? { entityId: entry.entityId } : {}),
      ...(entry.detail ? { detail: entry.detail } : {})
    }].slice(-500)
  };
}

function appendElectricalWarnings(
  state: StudioState,
  context: ReducerContext,
  warnings: readonly string[]
): StudioState {
  let next = state;
  for (const warning of warnings) {
    next = appendExecutionLog(next, context, {
      severity: 'warn',
      code: 'ELECTRICAL_INVALID_SECTION',
      message: warning,
      source: 'ELECTRICAL'
    });
  }
  return next;
}

function writeElectricalDocument(
  state: StudioState,
  context: ReducerContext,
  document: ElectricalDocument | null
): StudioState {
  const result = validateElectricalDocument(document, state.project.world.entities);
  const next = markDirty({
    ...state,
    project: { ...state.project, electrical: result.value }
  });
  return appendElectricalWarnings(next, context, result.warnings);
}

function pruneElectricalForEntity(
  document: ElectricalDocument | null | undefined,
  entityId: string
): ElectricalDocument | null | undefined {
  if (!document) {
    return document;
  }
  return {
    ...document,
    wires: document.wires.filter(
      (wire) => wire.from.entityId !== entityId && wire.to.entityId !== entityId
    ),
    layout: document.layout.filter((entry) => entry.entityId !== entityId)
  };
}

function pruneElectricalForComponent(
  document: ElectricalDocument | null | undefined,
  entityId: string,
  componentId: string
): ElectricalDocument | null | undefined {
  if (!document) {
    return document;
  }
  return {
    ...document,
    wires: document.wires.filter(
      (wire) =>
        !(wire.from.entityId === entityId && wire.from.componentId === componentId) &&
        !(wire.to.entityId === entityId && wire.to.componentId === componentId)
    ),
    layout: document.layout.filter(
      (entry) => !(entry.entityId === entityId && entry.componentId === componentId)
    )
  };
}

function appendElectricalDiagnostics(
  state: StudioState,
  context: ReducerContext,
  diagnostics: readonly ElectricalDiagnostic[]
): StudioState {
  const seen = new Set<string>();
  let next = state;
  let logged = 0;

  for (const diagnostic of diagnostics) {
    const key = `${diagnostic.code}:${diagnostic.message}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (logged >= 8) {
      next = appendExecutionLog(next, context, {
        severity: 'warn',
        code: ELECTRICAL_CODES.INVALID_CIRCUIT,
        message: `Electrical diagnostics truncated: ${diagnostics.length - logged} additional issue(s).`,
        source: 'ELECTRICAL'
      });
      break;
    }
    next = appendExecutionLog(next, context, {
      severity: 'warn',
      code: diagnostic.code,
      message: diagnostic.message,
      source: 'ELECTRICAL'
    });
    logged += 1;
  }

  return next;
}

interface ElectricalSolveOptions {
  /** Pause the runtime when the solver throws unexpectedly (D-P08-06). */
  pauseOnUnexpectedFailure: boolean;
  /** Log a successful solve. Used on Play and Reset, not on every toggle. */
  logSolved: boolean;
}

/**
 * Solves the DC circuit for the current runtime overrides and commits the
 * result atomically. Invalid circuits keep the last valid solution and never
 * pause physics; unexpected solver exceptions pause and preserve state.
 */
function solveElectricalRuntime(
  state: StudioState,
  context: ReducerContext,
  overrides: ElectricalOverrides,
  options: ElectricalSolveOptions
): StudioState {
  const now = context.now ?? (() => Date.now());
  const startedAt = now();
  const previous = state.runtime.electrical;

  let outcome: ReturnType<typeof solveElectricalCircuit>;
  let failureMessage: string | null = null;
  try {
    outcome = solveElectricalCircuit(state.project.world.entities, state.project.electrical, overrides);
  } catch (error) {
    outcome = { status: 'invalid', solution: null, diagnostics: [] };
    failureMessage = error instanceof Error ? error.message : String(error);
  }
  const durationMs = Math.max(0, now() - startedAt);

  const status: StudioState['runtime']['electrical']['status'] = failureMessage
    ? 'failed'
    : outcome.status;
  const solution =
    outcome.status === 'solved' ? outcome.solution : status === 'idle' ? null : previous.solution;
  const attempted = !(status === 'idle');

  let next: StudioState = {
    ...state,
    runtime: {
      ...state.runtime,
      lastError: failureMessage
        ? { code: ELECTRICAL_CODES.SOLVE_FAILED, message: failureMessage }
        : status === 'solved'
          ? null
          : state.runtime.lastError,
      electrical: {
        status,
        solution,
        diagnostics: outcome.diagnostics,
        switchStates: overrides.switchStates,
        sourceVoltages: overrides.sourceVoltages,
        solveCount: previous.solveCount + (attempted ? 1 : 0),
        lastSolveMs: durationMs
      }
    }
  };

  if (status === 'solved' && options.logSolved) {
    next = appendExecutionLog(next, context, {
      severity: 'info',
      code: ELECTRICAL_CODES.SOLVED,
      message: `Electrical circuit solved: ${outcome.solution?.nets.length ?? 0} net(s), ${outcome.solution?.branches.length ?? 0} branch(es) in ${durationMs.toFixed(1)} ms.`,
      source: 'ELECTRICAL'
    });
  }

  if (status === 'invalid') {
    next = appendElectricalDiagnostics(next, context, outcome.diagnostics);
  }

  if (status === 'failed') {
    const message = failureMessage ?? 'Unknown solver failure';
    next = appendExecutionLog(next, context, {
      severity: 'error',
      code: ELECTRICAL_CODES.SOLVE_FAILED,
      message: `Electrical solver failed unexpectedly: ${message}`,
      detail: 'Last valid electrical state preserved.',
      source: 'ELECTRICAL'
    });

    if (options.pauseOnUnexpectedFailure && next.runtime.status === 'running') {
      next = {
        ...next,
        runtime: {
          ...next.runtime,
          status: 'paused',
          execution: {
            ...next.runtime.execution,
            status: next.runtime.execution.queue.length > 0 ? 'suspended' : 'idle'
          }
        }
      };
    }
  }

  return next;
}

function chainElectricalContext(state: StudioState): {
  entities: StudioState['project']['world']['entities'];
  overrides: ElectricalOverrides;
} {
  return {
    entities: state.project.world.entities,
    overrides: {
      switchStates: state.runtime.electrical.switchStates,
      sourceVoltages: state.runtime.electrical.sourceVoltages
    }
  };
}

/**
 * Commits the electrical overrides produced by a graph chain. No-op when the
 * chain changed nothing, so ordinary graphs never trigger a redundant solve.
 * Invalid results warn and preserve the last solution; unexpected failures
 * pause the runtime (D-P08-06).
 */
function commitChainElectrical(
  state: StudioState,
  context: ReducerContext,
  chain: { electrical: ElectricalOverrides | null },
  input: { overrides: ElectricalOverrides }
): StudioState {
  if (!chain.electrical || chain.electrical === input.overrides) {
    return state;
  }
  return solveElectricalRuntime(state, context, chain.electrical, {
    pauseOnUnexpectedFailure: true,
    logSolved: false
  });
}

function graphValidationContext(state: StudioState): GraphValidationContext {
  return {
    entities: state.project.world.entities.map((entity) => ({
      id: entity.id,
      components: entity.components ?? []
    })),
    scriptIds: pythonScripts(state.project.python).map((script) => script.id)
  };
}

function buildPythonSnapshot(state: StudioState): PythonSnapshot {
  const byId = new Map(state.project.world.entities.map((entity) => [entity.id, entity]));
  const entities = Object.values(state.runtime.bodies)
    .map((body) => {
      const entity = byId.get(body.entityId);
      return {
        id: body.entityId,
        name: entity?.name ?? body.entityId,
        position: { ...body.transform.position },
        velocity: { ...body.velocity }
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    entities,
    time: state.runtime.elapsedSeconds,
    dt: PYTHON_FIXED_DT_SECONDS
  };
}

function toPythonNodeOutcome(outcome: PythonRunOutcome): import('../runtime/graphExecution.ts').PythonNodeOutcome {
  if (outcome.ok) {
    return { ok: true, actions: outcome.actions, durationMs: outcome.durationMs };
  }
  return {
    ok: false,
    durationMs: outcome.durationMs,
    code: outcome.code,
    message: outcome.error.message,
    line: outcome.error.line
  };
}

function withExecutionStatus(
  state: StudioState,
  status: RuntimeExecutionState['status']
): StudioState {
  if (state.runtime.execution.status === status) {
    return state;
  }
  return {
    ...state,
    runtime: {
      ...state.runtime,
      execution: { ...state.runtime.execution, status }
    }
  };
}

function executionSummary(
  entry: ExecutionQueueEntry,
  outcome: ExecutionOutcome,
  nodeCount: number,
  failedNodeId: string | null,
  code: string | null,
  message: string | null,
  context: ReducerContext
): ExecutionResultSummary {
  return {
    triggerNodeId: entry.triggerNodeId,
    triggerType: entry.triggerType,
    outcome,
    nodeCount,
    failedNodeId,
    code,
    message,
    at: context.clock()
  };
}

interface ExecutionEnqueueInput {
  sessionId: number;
  triggerNodeId: string;
  triggerType: GraphNodeType;
  bodyEntityId?: string;
  planeEntityId?: string;
}

/**
 * D-M2C-04: bounded FIFO. When full, the newest incoming event is dropped and a
 * warning names the trigger. Manual activations are never coalesced.
 */
function enqueueExecution(
  state: StudioState,
  context: ReducerContext,
  input: ExecutionEnqueueInput
): StudioState {
  const execution = state.runtime.execution;
  if (execution.queue.length >= EXECUTION_QUEUE_CAPACITY) {
    const withCount = {
      ...state,
      runtime: {
        ...state.runtime,
        execution: { ...execution, droppedEvents: execution.droppedEvents + 1 }
      }
    };
    return appendExecutionLog(withCount, context, {
      severity: 'warn',
      code: GRAPH_EXECUTION_CODES.QUEUE_OVERFLOW,
      message: `Dropped ${input.triggerType} trigger ${input.triggerNodeId}: execution queue is full (${EXECUTION_QUEUE_CAPACITY}).`,
      detail: `session ${input.sessionId}`
    });
  }

  const entry: ExecutionQueueEntry = {
    id: context.idFactory(),
    sessionId: input.sessionId,
    triggerNodeId: input.triggerNodeId,
    triggerType: input.triggerType,
    bodyEntityId: input.bodyEntityId ?? null,
    planeEntityId: input.planeEntityId ?? null
  };

  return {
    ...state,
    runtime: {
      ...state.runtime,
      execution: {
        ...execution,
        status: state.runtime.status === 'paused' ? 'suspended' : execution.status,
        queue: [...execution.queue, entry]
      }
    }
  };
}

/**
 * Drains the FIFO queue while Running. Chains are atomic (D-M2C-01), so this is
 * synchronous. Paused sessions never reach the drain. Stale-session entries are
 * rejected defensively even though cancellation clears the queue synchronously.
 */
function drainExecution(
  state: StudioState,
  context: ReducerContext,
  resume?: { requestId: string; outcome: PythonRunOutcome }
): StudioState {
  let working = state;

  // --- resolve a suspended Python chain if a result arrived ---------------
  const pending = working.runtime.execution.pendingPython;
  if (resume) {
    if (!pending || pending.requestId !== resume.requestId) {
      return state;
    }
    if (pending.entry.sessionId !== working.runtime.execution.sessionId) {
      return state;
    }

    // Surface the script's console output under the PYTHON source.
    for (const line of resume.outcome.logs ?? []) {
      working = appendExecutionLog(working, context, {
        severity: line.level === 'error' ? 'error' : line.level === 'warn' ? 'warn' : 'info',
        code: PYTHON_CODES.COMPLETED,
        message: line.message,
        source: 'PYTHON'
      } as any);
    }

    working = {
      ...working,
      runtime: {
        ...working.runtime,
        execution: { ...working.runtime.execution, pendingPython: null }
      }
    };

    const nodeOutcome = toPythonNodeOutcome(resume.outcome);
    const electricalContext = chainElectricalContext(working);
    const chain = executeChain(pending.plan, working.graph as Graph, working.runtime.bodies, {
      startIndex: pending.index,
      python: { nodeId: pending.nodeId, outcome: nodeOutcome },
      electrical: electricalContext
    });
    working = commitChainElectrical(working, context, chain, electricalContext);

    let editor = working.editor;
    for (const result of chain.executed) {
      editor = {
        ...editor,
        executingGraphNodeId: result.nodeId,
        executionSequence: editor.executionSequence + 1
      };
      working = appendExecutionLog(
        { ...working, editor },
        context,
        {
          severity: 'info',
          code: GRAPH_EXECUTION_CODES.NODE_EXECUTED,
          message: `Node ${result.nodeId} (${result.type}) executed.`,
          ...(result.entityId ? { entityId: result.entityId } : {}),
          ...(result.detail ? { detail: result.detail } : {})
        }
      );
    }

    const executedTotal = pending.executedBefore + chain.executed.length;

    if (chain.suspension) {
      const suspension = chain.suspension;
      const node = (working.graph as Graph).nodes.find((n) => n.id === suspension.nodeId);
      const scriptId = node && node.config.kind === 'runPython' ? node.config.scriptId : '';
      const script = findPythonScript(working.project.python, scriptId);
      if (!script) {
        const failure = {
          nodeId: suspension.nodeId,
          type: 'runPython' as GraphNodeType,
          code: PYTHON_CODES.SCRIPT_MISSING,
          message: `Python script ${scriptId || '(none)'} is not available.`,
          severity: 'error' as const
        };
        working = appendExecutionLog(
          {
            ...working,
            editor,
            runtime: {
              ...working.runtime,
              bodies: chain.bodies,
              status: 'paused',
              execution: {
                ...working.runtime.execution,
                status: working.runtime.execution.queue.length > 0 ? 'suspended' : 'idle',
                queue: working.runtime.execution.queue,
                lastResult: executionSummary(
                  pending.entry,
                  'failed',
                  executedTotal,
                  failure.nodeId,
                  failure.code,
                  failure.message,
                  context
                )
              }
            }
          },
          context,
          {
            severity: 'error',
            code: GRAPH_EXECUTION_CODES.FAILED,
            message: `Graph execution failed at node ${failure.nodeId} (runPython): ${failure.code} ${failure.message}`,
            detail: 'Runtime paused automatically.'
          }
        );
        return working;
      }
      const snapshot = buildPythonSnapshot(working);
      const nextPending: PendingPythonExecution = {
        requestId: context.idFactory(),
        entry: pending.entry,
        plan: pending.plan,
        nodeId: suspension.nodeId,
        index: suspension.index,
        scriptId,
        snapshot,
        executedBefore: executedTotal,
        startedAt: context.clock()
      };
      working = appendExecutionLog(
        {
          ...working,
          editor,
          runtime: {
            ...working.runtime,
            bodies: chain.bodies,
            execution: {
              ...working.runtime.execution,
              status: 'executing',
              pendingPython: nextPending
            }
          }
        },
        context,
        {
          severity: 'info',
          code: PYTHON_CODES.STARTED,
          message: `Python node ${suspension.nodeId} started script "${script.name}".`,
          detail: 'Chain suspended until the Python runtime responds.'
        }
      );
      return working;
    }

    if (chain.failure) {
      const failure = chain.failure;
      const paused = failure.severity === 'error';
      working = appendExecutionLog(
        {
          ...working,
          editor,
          runtime: {
            ...working.runtime,
            bodies: chain.bodies,
            status: paused ? 'paused' : working.runtime.status,
            execution: {
              ...working.runtime.execution,
              status: paused
                ? working.runtime.execution.queue.length > 0
                  ? 'suspended'
                  : 'idle'
                : 'idle',
              queue: working.runtime.execution.queue,
              lastResult: executionSummary(
                pending.entry,
                'failed',
                executedTotal,
                failure.nodeId,
                failure.code,
                failure.message,
                context
              )
            }
          }
        },
        context,
        {
          severity: failure.severity,
          code: GRAPH_EXECUTION_CODES.FAILED,
          message: `Graph execution failed at node ${failure.nodeId} (${failure.type}): ${failure.code} ${failure.message}`,
          ...(paused ? { detail: 'Runtime paused automatically.' } : {})
        }
      );
      if (paused) {
        return working;
      }
    } else {
      working = appendExecutionLog(
        {
          ...working,
          editor,
          runtime: {
            ...working.runtime,
            bodies: chain.bodies,
            execution: {
              ...working.runtime.execution,
              status: 'idle',
              queue: working.runtime.execution.queue,
              lastResult: executionSummary(
                pending.entry,
                'completed',
                executedTotal,
                null,
                null,
                null,
                context
              )
            }
          }
        },
        context,
        {
          severity: 'info',
          code: GRAPH_EXECUTION_CODES.COMPLETED,
          message: `Graph execution completed: ${executedTotal} node(s) from trigger ${pending.entry.triggerNodeId}.`
        }
      );
    }
  } else if (pending) {
    return withExecutionStatus(working, 'executing');
  }

  // --- normal drain --------------------------------------------------------
  if (working.runtime.status !== 'running') {
    return withExecutionStatus(
      working,
      working.runtime.execution.queue.length > 0 ? 'suspended' : 'idle'
    );
  }

  const graph = working.graph ?? null;
  if (!graph || !working.runtime.execution.enabled) {
    return withExecutionStatus(working, 'idle');
  }

  while (working.runtime.execution.queue.length > 0) {
    if (working.runtime.execution.pendingPython) {
      break;
    }
    const execution = working.runtime.execution;
    const entry = execution.queue[0] as ExecutionQueueEntry;
    const remaining = execution.queue.slice(1);

    if (entry.sessionId !== execution.sessionId) {
      working = appendExecutionLog(
        {
          ...working,
          runtime: {
            ...working.runtime,
            execution: {
              ...execution,
              queue: remaining,
              status: remaining.length > 0 ? 'suspended' : 'idle'
            }
          }
        },
        context,
        {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.CANCELLED,
          message: `Discarded stale ${entry.triggerType} trigger ${entry.triggerNodeId} from session ${entry.sessionId}.`,
          detail: `current session ${execution.sessionId}`
        }
      );
      continue;
    }

    const planResult = buildExecutionPlan(graph, entry.triggerNodeId);
    if (!planResult.ok || !planResult.plan) {
      const reason = planResult.error?.message ?? 'Execution plan could not be built.';
      working = appendExecutionLog(
        {
          ...working,
          runtime: {
            ...working.runtime,
            execution: {
              ...execution,
              queue: remaining,
              status: remaining.length > 0 ? 'suspended' : 'idle',
              lastResult: executionSummary(
                entry,
                'skipped',
                0,
                null,
                planResult.error?.code ?? GRAPH_EXECUTION_CODES.SKIPPED,
                reason,
                context
              )
            }
          }
        },
        context,
        {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.SKIPPED,
          message: `Graph execution skipped for trigger ${entry.triggerNodeId}: ${reason}`
        }
      );
      continue;
    }

    const plan = planResult.plan;
    working = appendExecutionLog(
      {
        ...working,
        runtime: {
          ...working.runtime,
          execution: {
            ...execution,
            queue: remaining,
            status: 'executing',
            lastTrigger: {
              nodeId: entry.triggerNodeId,
              type: entry.triggerType,
              at: context.clock()
            }
          }
        }
      },
      context,
      {
        severity: 'info',
        code: GRAPH_EXECUTION_CODES.TRIGGERED,
        message: `Graph triggered by ${entry.triggerType} node ${entry.triggerNodeId} (session ${execution.sessionId}).`,
        ...(entry.bodyEntityId ? { entityId: entry.bodyEntityId } : {}),
        ...(entry.planeEntityId ? { detail: `plane ${entry.planeEntityId}` } : {})
      }
    );

    const electricalContext = chainElectricalContext(working);
    const chain = executeChain(plan, graph, working.runtime.bodies, {
      electrical: electricalContext
    });
    working = commitChainElectrical(working, context, chain, electricalContext);

    let editor = working.editor;
    for (const result of chain.executed) {
      editor = {
        ...editor,
        executingGraphNodeId: result.nodeId,
        executionSequence: editor.executionSequence + 1
      };
      working = appendExecutionLog(
        { ...working, editor },
        context,
        {
          severity: 'info',
          code: GRAPH_EXECUTION_CODES.NODE_EXECUTED,
          message: `Node ${result.nodeId} (${result.type}) executed.`,
          ...(result.entityId ? { entityId: result.entityId } : {}),
          ...(result.detail ? { detail: result.detail } : {})
        }
      );
    }

    const executedTotal = chain.executed.length;

    if (chain.suspension) {
      const suspension = chain.suspension;
      const node = graph.nodes.find((n) => n.id === suspension.nodeId);
      const scriptId = node && node.config.kind === 'runPython' ? node.config.scriptId : '';
      const script = findPythonScript(working.project.python, scriptId);
      if (!script) {
        const failure = {
          nodeId: suspension.nodeId,
          type: 'runPython' as GraphNodeType,
          code: PYTHON_CODES.SCRIPT_MISSING,
          message: `Python script ${scriptId || '(none)'} is not available.`,
          severity: 'error' as const
        };
        working = appendExecutionLog(
          {
            ...working,
            editor,
            runtime: {
              ...working.runtime,
              bodies: chain.bodies,
              status: 'paused',
              execution: {
                ...working.runtime.execution,
                status: remaining.length > 0 ? 'suspended' : 'idle',
                queue: remaining,
                lastResult: executionSummary(
                  entry,
                  'failed',
                  executedTotal,
                  failure.nodeId,
                  failure.code,
                  failure.message,
                  context
                )
              }
            }
          },
          context,
          {
            severity: 'error',
            code: GRAPH_EXECUTION_CODES.FAILED,
            message: `Graph execution failed at node ${failure.nodeId} (runPython): ${failure.code} ${failure.message}`,
            detail: 'Runtime paused automatically.'
          }
        );
        break;
      }
      const snapshot = buildPythonSnapshot(working);
      const nextPending: PendingPythonExecution = {
        requestId: context.idFactory(),
        entry,
        plan,
        nodeId: suspension.nodeId,
        index: suspension.index,
        scriptId,
        snapshot,
        executedBefore: executedTotal,
        startedAt: context.clock()
      };
      working = appendExecutionLog(
        {
          ...working,
          editor,
          runtime: {
            ...working.runtime,
            bodies: chain.bodies,
            execution: {
              ...working.runtime.execution,
              status: 'executing',
              queue: remaining,
              pendingPython: nextPending
            }
          }
        },
        context,
        {
          severity: 'info',
          code: PYTHON_CODES.STARTED,
          message: `Python node ${suspension.nodeId} started script "${script.name}".`,
          detail: 'Chain suspended until the Python runtime responds.'
        }
      );
      break;
    }

    if (chain.failure) {
      const failure = chain.failure;
      const paused = failure.severity === 'error';
      working = appendExecutionLog(
        {
          ...working,
          editor,
          runtime: {
            ...working.runtime,
            bodies: chain.bodies,
            status: paused ? 'paused' : working.runtime.status,
            execution: {
              ...working.runtime.execution,
              status: paused
                ? remaining.length > 0
                  ? 'suspended'
                  : 'idle'
                : 'idle',
              queue: remaining,
              lastResult: executionSummary(
                entry,
                'failed',
                chain.executed.length,
                failure.nodeId,
                failure.code,
                failure.message,
                context
              )
            }
          }
        },
        context,
        {
          severity: failure.severity,
          code: GRAPH_EXECUTION_CODES.FAILED,
          message: `Graph execution failed at node ${failure.nodeId} (${failure.type}): ${failure.code} ${failure.message}`,
          ...(paused ? { detail: 'Runtime paused automatically.' } : {})
        }
      );
      if (paused) {
        break;
      }
      continue;
    }

    working = appendExecutionLog(
      {
        ...working,
        editor,
        runtime: {
          ...working.runtime,
          bodies: chain.bodies,
          execution: {
            ...working.runtime.execution,
            status: 'idle',
            queue: remaining,
            lastResult: executionSummary(
              entry,
              'completed',
              chain.executed.length,
              null,
              null,
              null,
              context
            )
          }
        }
      },
      context,
      {
        severity: 'info',
        code: GRAPH_EXECUTION_CODES.COMPLETED,
        message: `Graph execution completed: ${chain.executed.length} node(s) from trigger ${entry.triggerNodeId}.`
      }
    );
  }

  return working;
}


export function reduceStudioState(
  state: StudioState,
  command: StudioCommand,
  context: ReducerContext = defaultContext
): StudioState {
  if (STRUCTURAL_COMMANDS.has(command.type) && state.runtime.status !== 'editing') {
    return appendRuntimeBlockedLog(state);
  }

  switch (command.type) {
    case 'project/new': {
      if (command.name.trim().length < 1) {
        return state;
      }
      const now = context.clock();
      const project = createEmptyProject(context.idFactory(), command.name.trim(), now);
      project.python = { scripts: [] };
      return {
        project,
        editor: {
          selectedEntityId: null,
          selectedGraphNodeId: null,
          executingGraphNodeId: null,
          executionSequence: 0,
          gizmoMode: 'translate',
          gridVisible: true,
          activePreset: 'build',
          camera: null
        },
        persistence: {
          revision: 1,
          savedRevision: 0,
          status: 'dirty',
          lastSavedAt: null,
          lastError: null
        },
        logs: [...state.logs],
        runtime: createDefaultRuntimeState(),
        graph: null,
        python: createDefaultPythonState()
      };
    }

    case 'project/open': {
      const incomingGraph = command.document.graph ?? null;
      let restoredGraph: Graph | null = null;
      let graphWarning: string | null = null;
      if (incomingGraph) {
        const graphContext: GraphValidationContext = {
          entities: command.document.world.entities.map((entity) => ({
            id: entity.id,
            components: entity.components ? entity.components.map((c) => ({ ...c })) : []
          })),
          scriptIds: (command.document.python?.scripts ?? []).map((script) => script.id)
        };
        const result = validateGraph(incomingGraph, graphContext);
        if (result.valid) {
          restoredGraph = incomingGraph;
        } else {
          const diag = result.diagnostics.find((d) => d.severity === 'error') ?? result.diagnostics[0];
          graphWarning = diag ? `${diag.code}: ${diag.message}` : 'Graph is invalid.';
        }
      }

      const openedState: StudioState = {
        project: {
          format: command.document.format,
          schemaVersion: command.document.schemaVersion,
          project: { ...command.document.project },
          world: {
            format: command.document.world.format,
            schemaVersion: command.document.world.schemaVersion,
            entities: command.document.world.entities.map((entity) => ({
              id: entity.id,
              name: entity.name,
              type: entity.type,
              transform: {
                position: { ...entity.transform.position },
                rotation: { ...entity.transform.rotation },
                scale: { ...entity.transform.scale }
              },
              metadata: { ...entity.metadata },
              components: cloneComponents(entity.components)
            }))
          },
          ...(restoredGraph ? { graph: restoredGraph } : {}),
          ...(command.document.python ? { python: command.document.python } : {}),
          ...(command.document.electrical !== undefined
            ? {
                electrical: command.document.electrical
                  ? (JSON.parse(JSON.stringify(command.document.electrical)) as ElectricalDocument)
                  : null
              }
            : {})
        },
        editor: {
          selectedEntityId: null,
          selectedGraphNodeId: null,
          executingGraphNodeId: null,
          executionSequence: 0,
          gizmoMode: 'translate',
          gridVisible: true,
          activePreset: 'build',
          camera: null
        },
        persistence: {
          revision: 0,
          savedRevision: 0,
          status: 'clean',
          lastSavedAt: null,
          lastError: null
        },
        logs: [...state.logs],
        runtime: createDefaultRuntimeState(),
        graph: restoredGraph,
        python: createDefaultPythonState()
      };

      if (graphWarning) {
        return appendExecutionLog(openedState, context, {
          severity: 'warn',
          code: 'GRAPH_INVALID',
          message: `Graph skipped on open: ${graphWarning}`
        });
      }
      return openedState;
    }

    case 'project/save-started': {
      if (state.persistence.status === 'saving') {
        return state;
      }
      return {
        ...state,
        persistence: {
          ...state.persistence,
          status: 'saving',
          lastError: null
        }
      };
    }

    case 'project/save-succeeded': {
      return {
        ...state,
        persistence: {
          ...state.persistence,
          savedRevision: command.revision,
          status: 'clean',
          lastSavedAt: command.at,
          lastError: null
        }
      };
    }

    case 'project/save-failed': {
      return {
        ...state,
        persistence: {
          ...state.persistence,
          status: 'save-failed',
          lastError: command.error
        }
      };
    }

    case 'entity/create': {
      const id = context.idFactory();
      const name = defaultEntityName(state.project.world.entities, command.entityType);
      const entity = createWorldEntity(command.entityType, id, name, command.position ? {
        position: { ...command.position },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 }
      } : undefined);

      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: [...state.project.world.entities, entity]
          }
        },
        editor: {
          ...state.editor,
          selectedEntityId: id
        }
      });
    }

    case 'entity/delete': {
      const exists = state.project.world.entities.some((entity) => entity.id === command.id);
      if (!exists) {
        return state;
      }
      const prunedElectrical = pruneElectricalForEntity(state.project.electrical, command.id);
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: state.project.world.entities.filter((entity) => entity.id !== command.id)
          },
          ...(prunedElectrical !== undefined ? { electrical: prunedElectrical } : {})
        },
        editor: state.editor.selectedEntityId === command.id
          ? { ...state.editor, selectedEntityId: null }
          : state.editor
      });
    }

    case 'entity/rename': {
      const entity = state.project.world.entities.find((item) => item.id === command.id);
      if (!entity) {
        return state;
      }
      const name = normalizeEntityName(command.name);
      if (name === null || name === entity.name) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.id, (item) => ({ ...item, name }))
          }
        }
      });
    }

    case 'transform/set': {
      const entity = state.project.world.entities.find((item) => item.id === command.id);
      if (!entity) {
        return state;
      }
      const error = validateTransform(command.transform, `entities.${command.id}.transform`);
      if (error) {
        return state;
      }
      if (transformsEqual(entity.transform, command.transform)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.id, (item) => ({
              ...item,
              transform: {
                position: { ...command.transform.position },
                rotation: { ...command.transform.rotation },
                scale: { ...command.transform.scale }
              }
            }))
          }
        }
      });
    }

    case 'component/add': {
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return state;
      }
      const error = validateComponent(command.component, `entities.${command.entityId}.components`);
      if (error) {
        return state;
      }
      const existing = entity.components ?? [];
      if (existing.some((component) => component.id === command.component.id)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.entityId, (item) => ({
              ...item,
              components: [...(item.components ?? []), { ...command.component }]
            }))
          }
        }
      });
    }

    case 'component/remove': {
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return state;
      }
      const existing = entity.components ?? [];
      if (!existing.some((component) => component.id === command.componentId)) {
        return state;
      }
      const prunedElectrical = pruneElectricalForComponent(
        state.project.electrical,
        command.entityId,
        command.componentId
      );
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.entityId, (item) => ({
              ...item,
              components: (item.components ?? []).filter((component) => component.id !== command.componentId)
            }))
          },
          ...(prunedElectrical !== undefined ? { electrical: prunedElectrical } : {})
        }
      });
    }

    case 'component/set': {
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      if (!entity) {
        return state;
      }
      const error = validateComponent(command.component, `entities.${command.entityId}.components`);
      if (error) {
        return state;
      }
      const existing = entity.components ?? [];
      if (!existing.some((component) => component.id === command.component.id)) {
        return state;
      }
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: replaceEntity(state.project.world.entities, command.entityId, (item) => ({
              ...item,
              components: (item.components ?? []).map((component) =>
                component.id === command.component.id ? { ...command.component } : component
              )
            }))
          }
        }
      });
    }

    case 'electrical/set': {
      return writeElectricalDocument(state, context, command.document);
    }

    case 'electrical/add-wire': {
      const document = state.project.electrical ?? createEmptyElectricalDocument();
      if (document.wires.some((wire) => wire.id === command.wire.id)) {
        return state;
      }
      return writeElectricalDocument(state, context, {
        ...document,
        wires: [...document.wires, command.wire]
      });
    }

    case 'electrical/remove-wire': {
      const document = state.project.electrical;
      if (!document || !document.wires.some((wire) => wire.id === command.wireId)) {
        return state;
      }
      return writeElectricalDocument(state, context, {
        ...document,
        wires: document.wires.filter((wire) => wire.id !== command.wireId)
      });
    }

    case 'electrical/set-layout': {
      const document = state.project.electrical ?? createEmptyElectricalDocument();
      return writeElectricalDocument(state, context, {
        ...document,
        layout: command.layout
      });
    }

    case 'selection/set': {
      if (command.id !== null && !state.project.world.entities.some((entity) => entity.id === command.id)) {
        return state;
      }
      if (command.id === state.editor.selectedEntityId) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, selectedEntityId: command.id }
      };
    }

    case 'gizmo/set-mode': {
      if (command.mode === state.editor.gizmoMode) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, gizmoMode: command.mode }
      };
    }

    case 'grid/set-visible': {
      if (command.visible === state.editor.gridVisible) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, gridVisible: command.visible }
      };
    }

    case 'preset/set': {
      if (command.preset === state.editor.activePreset) {
        return state;
      }
      return {
        ...state,
        editor: { ...state.editor, activePreset: command.preset }
      };
    }

    case 'camera/set': {
      if (sameCamera(state.editor.camera, command.pose)) {
        return state;
      }
      return {
        ...state,
        editor: {
          ...state.editor,
          camera: command.pose
            ? {
                alpha: command.pose.alpha,
                beta: command.pose.beta,
                radius: command.pose.radius,
                target: { ...command.pose.target }
              }
            : null
        }
      };
    }

    case 'python/create-script': {
      if (!state.project.python) {
        state = { ...state, project: { ...state.project, python: { scripts: [] } } };
      }
      const scripts = pythonScripts(state.project.python);
      const name = (command.name && command.name.trim().length > 0 ? command.name.trim() : `Script ${scripts.length + 1}`);
      const id = context.idFactory();
      const source = '# Write Python here. API: from simuforge import world, simulation\nworld.log("hello from python")\n';
      const nextScripts = [...scripts, { id, name, source }];
      const next = markDirty({
        ...state,
        project: { ...state.project, python: { scripts: nextScripts } },
        python: { ...(state.python ?? createDefaultPythonState()), selectedScriptId: id }
      });
      return next;
    }

    case 'python/rename-script': {
      const scripts = pythonScripts(state.project.python);
      const nextScripts = scripts.map((script) =>
        script.id === command.scriptId ? { ...script, name: command.name.trim() } : script
      );
      // validate name
      const target = nextScripts.find((s) => s.id === command.scriptId);
      if (!target || target.name.length === 0 || target.name.length > 128) {
        return state;
      }
      // duplicate name check
      const duplicate = nextScripts.some((s) => s.id !== command.scriptId && s.name === target.name);
      if (duplicate) {
        return state;
      }
      return markDirty({
        ...state,
        project: { ...state.project, python: { scripts: nextScripts } }
      });
    }

    case 'python/delete-script': {
      const scripts = pythonScripts(state.project.python);
      const nextScripts = scripts.filter((script) => script.id !== command.scriptId);
      const selected = state.python?.selectedScriptId === command.scriptId
        ? (nextScripts[0]?.id ?? null)
        : (state.python?.selectedScriptId ?? null);
      return markDirty({
        ...state,
        project: { ...state.project, python: { scripts: nextScripts } },
        python: { ...(state.python ?? createDefaultPythonState()), selectedScriptId: selected }
      });
    }

    case 'python/set-source': {
      if (command.source.length > PYTHON_SOURCE_MAX_CHARS) {
        return appendExecutionLog(state, context, {
          severity: 'warn',
          code: PYTHON_CODES.SOURCE_TOO_LARGE,
          message: `Python source exceeds ${PYTHON_SOURCE_MAX_CHARS} characters.`
        });
      }
      const scripts = pythonScripts(state.project.python);
      const nextScripts = scripts.map((script) =>
        script.id === command.scriptId ? { ...script, source: command.source } : script
      );
      return markDirty({
        ...state,
        project: { ...state.project, python: { scripts: nextScripts } }
      });
    }

    case 'python/select-script': {
      return {
        ...state,
        python: { ...(state.python ?? createDefaultPythonState()), selectedScriptId: command.scriptId }
      };
    }

    case 'python/load-runtime': {
      const python = state.python ?? createDefaultPythonState();
      return {
        ...state,
        python: { ...python, loadRequest: python.loadRequest + 1, runtimeStatus: 'loading', runtimeDetail: null }
      };
    }

    case 'python/runtime-status': {
      const python = state.python ?? createDefaultPythonState();
      return {
        ...state,
        python: { ...python, runtimeStatus: command.status, runtimeDetail: command.detail }
      };
    }

    case 'runtime/python-result': {
      const outcome = command.outcome;
      const python = state.python ?? createDefaultPythonState();
      const pendingScriptId = state.runtime.execution.pendingPython?.scriptId ?? '';
      const pendingScript = findPythonScript(state.project.python, pendingScriptId);
      const summary = {
        scriptId: pendingScriptId,
        scriptName: pendingScript?.name ?? '',
        ok: outcome.ok,
        durationMs: outcome.durationMs,
        message: outcome.ok ? null : outcome.error.message,
        actionCount: outcome.ok ? outcome.actions.length : 0,
        at: context.clock()
      };
      const nextPython = { ...python, lastRun: summary };
      const next = { ...state, python: nextPython };
      return drainExecution(next, context, { requestId: command.requestId, outcome: command.outcome });
    }

    case 'log/append': {
      return {
        ...state,
        logs: [...state.logs, command.entry].slice(-500)
      };
    }

    case 'log/clear': {
      if (state.logs.length === 0) {
        return state;
      }
      return {
        ...state,
        logs: []
      };
    }

    case 'runtime/play': {
      if (state.runtime.status === 'editing') {
        const snapshot = { entities: state.project.world.entities.map(cloneEntity) };
        let bodies: RuntimeBodies;
        try {
          bodies = createRuntimeBodies(snapshot.entities);
        } catch (error) {
          return appendRuntimeFailureLog(state, toSimulationFailure(error), context, 'editing');
        }

        // D-M2C-02: a new Editing -> Running transition starts a new session.
        const sessionId = state.runtime.execution.sessionId + 1;
        const graph = state.graph ?? null;
        let next: StudioState = {
          ...state,
          editor: { ...state.editor, executingGraphNodeId: null },
          runtime: {
            status: 'running',
            snapshot,
            lastError: null,
            bodies,
            accumulatorSeconds: 0,
          elapsedSeconds: 0,
            execution: {
              sessionId,
              status: 'idle',
              enabled: false,
              queue: [],
            pendingPython: null,
              lastTrigger: null,
              lastResult: null,
              droppedEvents: state.runtime.execution.droppedEvents,
              contactKeys: []
            },
            electrical: createDefaultElectricalState()
          }
        };

        // D-P08-06: an invalid authored circuit warns and disables electrical
        // solving, but Play and the physics/graph runtime stay available.
        next = solveElectricalRuntime(
          next,
          context,
          collectAuthoredElectricalOverrides(snapshot.entities),
          { pauseOnUnexpectedFailure: true, logSolved: true }
        );
        if (next.runtime.status === 'paused') {
          return next;
        }

        if (!graph) {
          return next;
        }

        const readiness = evaluateExecutionReadiness(graph, graphValidationContext(state));
        if (!readiness.ready) {
          // D-M2C-06: Play stays usable; execution is skipped in full.
          const reason = readiness.reasons.join(' ');
          return appendExecutionLog(
            {
              ...next,
              runtime: {
                ...next.runtime,
                execution: {
                  ...next.runtime.execution,
                  enabled: false,
                  lastResult: {
                    triggerNodeId: readiness.triggerNodeIds[0] ?? '',
                    triggerType: 'onStart',
                    outcome: 'skipped',
                    nodeCount: 0,
                    failedNodeId: null,
                    code: GRAPH_EXECUTION_CODES.SKIPPED,
                    message: reason,
                    at: context.clock()
                  }
                }
              }
            },
            context,
            {
              severity: 'warn',
              code: GRAPH_EXECUTION_CODES.SKIPPED,
              message: `Graph execution skipped: ${reason}`,
              detail: 'Physics-only simulation continues.'
            }
          );
        }

        next = {
          ...next,
          runtime: {
            ...next.runtime,
            execution: { ...next.runtime.execution, enabled: true }
          }
        };

        for (const warning of readiness.warnings) {
          next = appendExecutionLog(next, context, {
            severity: 'warn',
            code: GRAPH_EXECUTION_CODES.WARNING,
            message: warning
          });
        }

        for (const trigger of selectTriggerNodes(graph, 'onStart')) {
          if (!hasOutgoingEdge(graph, trigger.id)) {
            continue;
          }
          next = enqueueExecution(next, context, {
            sessionId,
            triggerNodeId: trigger.id,
            triggerType: 'onStart'
          });
        }

        return drainExecution(next, context);
      }
      if (state.runtime.status === 'paused') {
        // Resume is not a new session and must not re-fire On Start (D-M2C-02).
        return drainExecution(
          { ...state, runtime: { ...state.runtime, status: 'running' } },
          context
        );
      }
      return state;
    }

    case 'runtime/pause': {
      if (state.runtime.status === 'running') {
        return {
          ...state,
          runtime: {
            ...state.runtime,
            status: 'paused',
            execution: {
              ...state.runtime.execution,
              status: state.runtime.execution.queue.length > 0 ? 'suspended' : 'idle'
            }
          }
        };
      }
      return state;
    }

    case 'runtime/resume': {
      if (state.runtime.status === 'paused') {
        // D-M2C-03: queued manual triggers drain only after resume.
        return drainExecution(
          { ...state, runtime: { ...state.runtime, status: 'running' } },
          context
        );
      }
      return state;
    }

    case 'runtime/stop': {
      if (state.runtime.status === 'editing') {
        return state;
      }
      const hadQueued = state.runtime.execution.queue.length > 0;
      const cancelledEntry = state.runtime.execution.queue[0];
      const sessionId = state.runtime.execution.sessionId + 1;

      // Reset before leaving runtime
      let next = state;
      if (state.runtime.snapshot) {
        const restored = state.runtime.snapshot.entities.map(cloneEntity);
        next = {
          ...state,
          project: {
            ...state.project,
            world: { ...state.project.world, entities: restored }
          }
        };
      }

      next = {
        ...next,
        editor: { ...next.editor, executingGraphNodeId: null },
        runtime: {
          ...createDefaultRuntimeState(),
          execution: { ...createDefaultRuntimeState().execution, sessionId }
        }
      };

      if (hadQueued && cancelledEntry) {
        next = appendExecutionLog(next, context, {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.CANCELLED,
          message: `Graph execution cancelled on Stop: ${state.runtime.execution.queue.length} queued trigger(s) discarded.`,
          detail: `last queued trigger ${cancelledEntry.triggerNodeId}`
        });
      }
      return next;
    }

    case 'runtime/reset': {
      if (state.runtime.status === 'editing' || !state.runtime.snapshot) {
        return state;
      }
      const restored = state.runtime.snapshot.entities.map(cloneEntity);
      let bodies: RuntimeBodies;
      try {
        bodies = createRuntimeBodies(state.runtime.snapshot.entities);
      } catch (error) {
        return appendRuntimeFailureLog(state, toSimulationFailure(error), context, 'paused');
      }

      const hadQueued = state.runtime.execution.queue.length > 0;
      const cancelledEntry = state.runtime.execution.queue[0];
      const sessionId = state.runtime.execution.sessionId + 1;

      let next: StudioState = {
        ...state,
        project: {
          ...state.project,
          world: { ...state.project.world, entities: restored }
        },
        editor: { ...state.editor, executingGraphNodeId: null },
        runtime: {
          ...state.runtime,
          bodies,
          accumulatorSeconds: 0,
          elapsedSeconds: 0,
          execution: {
            ...state.runtime.execution,
            sessionId,
            status: 'idle',
            queue: [],
            pendingPython: null,
            lastTrigger: null,
            lastResult: hadQueued && cancelledEntry
              ? executionSummary(
                  cancelledEntry,
                  'cancelled',
                  0,
                  null,
                  GRAPH_EXECUTION_CODES.CANCELLED,
                  'reset',
                  context
                )
              : state.runtime.execution.lastResult,
            contactKeys: []
          }
        }
      };

      if (hadQueued) {
        next = appendExecutionLog(next, context, {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.CANCELLED,
          message: `Graph execution cancelled on Reset: ${state.runtime.execution.queue.length} queued trigger(s) discarded.`,
          detail: 'On Start does not re-fire on Reset (D-M2C-02).'
        });
      }

      // Reset discards runtime switch/source overrides and re-solves from the
      // authored circuit. The previous solution is not reused.
      next = solveElectricalRuntime(
        {
          ...next,
          runtime: { ...next.runtime, electrical: createDefaultElectricalState() }
        },
        context,
        collectAuthoredElectricalOverrides(restored),
        { pauseOnUnexpectedFailure: true, logSolved: true }
      );
      return next;
    }

    case 'runtime/step': {
      if (state.runtime.status !== 'running') {
        return state;
      }
      if (Object.keys(state.runtime.bodies).length === 0) {
        return state;
      }
      const advance = advanceSimulation(
        state.runtime.bodies,
        state.runtime.accumulatorSeconds,
        command.deltaSeconds,
        state.runtime.execution.contactKeys
      );
      if (advance.error) {
        return appendRuntimeFailureLog(
          {
            ...state,
            runtime: {
              ...state.runtime,
              bodies: advance.bodies,
              accumulatorSeconds: advance.accumulatorSeconds,
          elapsedSeconds: state.runtime.elapsedSeconds + advance.steps / 60,
              execution: {
                ...state.runtime.execution,
                contactKeys: advance.activeContactKeys,
                status: state.runtime.execution.queue.length > 0 ? 'suspended' : 'idle'
              }
            }
          },
          advance.error,
          context,
          'paused'
        );
      }
      if (advance.steps === 0 && advance.accumulatorSeconds === state.runtime.accumulatorSeconds) {
        return state;
      }

      let next: StudioState = {
        ...state,
        runtime: {
          ...state.runtime,
          bodies: advance.bodies,
          accumulatorSeconds: advance.accumulatorSeconds,
          execution: {
            ...state.runtime.execution,
            contactKeys: advance.activeContactKeys
          }
        }
      };

      // D-M2C-07: rising-edge contacts fire matching On Plane Contact triggers.
      if (advance.contacts.length > 0 && next.graph && next.runtime.execution.enabled) {
        const matches = matchContactTriggers(next.graph, advance.contacts);
        for (const match of matches) {
          next = enqueueExecution(next, context, {
            sessionId: next.runtime.execution.sessionId,
            triggerNodeId: match.node.id,
            triggerType: 'onPlaneContact',
            bodyEntityId: match.contact.bodyEntityId,
            planeEntityId: match.contact.planeEntityId
          });
        }
        next = drainExecution(next, context);
      }

      return next;
    }

    case 'runtime/apply-force': {
      if (state.runtime.status === 'editing') {
        return appendRuntimeFailureLog(
          state,
          {
            code: RUNTIME_NOT_ACTIVE,
            message: 'Force can only be applied while the simulation is running or paused.',
            severity: 'warn'
          },
          context,
          'editing'
        );
      }
      try {
        const bodies = applyForce(state.runtime.bodies, command.entityId, command.force);
        return appendRuntimeInfoLog(
          { ...state, runtime: { ...state.runtime, bodies } },
          context,
          {
            code: FORCE_APPLIED,
            message: `Force applied to entity ${command.entityId}.`,
            entityId: command.entityId,
            detail: `F=(${command.force.x}, ${command.force.y}, ${command.force.z}) N`
          }
        );
      } catch (error) {
        return appendRuntimeFailureLog(state, toSimulationFailure(error), context, 'paused');
      }
    }

    case 'runtime/apply-impulse': {
      if (state.runtime.status === 'editing') {
        return appendRuntimeFailureLog(
          state,
          {
            code: RUNTIME_NOT_ACTIVE,
            message: 'Impulse can only be applied while the simulation is running or paused.',
            severity: 'warn'
          },
          context,
          'editing'
        );
      }
      try {
        const bodies = applyImpulse(state.runtime.bodies, command.entityId, command.impulse);
        return appendRuntimeInfoLog(
          { ...state, runtime: { ...state.runtime, bodies } },
          context,
          {
            code: IMPULSE_APPLIED,
            message: `Impulse applied to entity ${command.entityId}.`,
            entityId: command.entityId,
            detail: `J=(${command.impulse.x}, ${command.impulse.y}, ${command.impulse.z}) N*s`
          }
        );
      } catch (error) {
        return appendRuntimeFailureLog(state, toSimulationFailure(error), context, 'paused');
      }
    }

    case 'runtime/clear-force': {
      if (state.runtime.status === 'editing') {
        return appendRuntimeFailureLog(
          state,
          {
            code: RUNTIME_NOT_ACTIVE,
            message: 'Forces can only be cleared while the simulation is running or paused.',
            severity: 'warn'
          },
          context,
          'editing'
        );
      }
      try {
        const bodies = clearForce(state.runtime.bodies, command.entityId);
        return appendRuntimeInfoLog(
          { ...state, runtime: { ...state.runtime, bodies } },
          context,
          {
            code: FORCE_CLEARED,
            message: command.entityId
              ? `Force cleared for entity ${command.entityId}.`
              : 'All runtime forces cleared.',
            ...(command.entityId ? { entityId: command.entityId } : {})
          }
        );
      } catch (error) {
        return appendRuntimeFailureLog(state, toSimulationFailure(error), context, 'paused');
      }
    }

    case 'runtime/set-switch': {
      if (state.runtime.status === 'editing') {
        return state;
      }
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      const component = entity?.components?.find((item) => item.id === command.componentId);
      if (!component || !isSwitchComponent(component) || !component.enabled) {
        return state;
      }
      const key = electricalOverrideKey(command.entityId, command.componentId);
      const current = state.runtime.electrical.switchStates[key] ?? component.closed;
      if (current === command.closed) {
        return state;
      }
      return solveElectricalRuntime(
        state,
        context,
        {
          switchStates: { ...state.runtime.electrical.switchStates, [key]: command.closed },
          sourceVoltages: state.runtime.electrical.sourceVoltages
        },
        { pauseOnUnexpectedFailure: true, logSolved: false }
      );
    }

    case 'runtime/set-source-voltage': {
      if (state.runtime.status === 'editing') {
        return state;
      }
      if (!Number.isFinite(command.voltage) || Math.abs(command.voltage) > 1_000_000) {
        return state;
      }
      const entity = state.project.world.entities.find((item) => item.id === command.entityId);
      const component = entity?.components?.find((item) => item.id === command.componentId);
      if (!component || !isVoltageSourceComponent(component) || !component.enabled) {
        return state;
      }
      const key = electricalOverrideKey(command.entityId, command.componentId);
      const current = state.runtime.electrical.sourceVoltages[key] ?? component.voltage;
      if (current === command.voltage) {
        return state;
      }
      return solveElectricalRuntime(
        state,
        context,
        {
          switchStates: state.runtime.electrical.switchStates,
          sourceVoltages: { ...state.runtime.electrical.sourceVoltages, [key]: command.voltage }
        },
        { pauseOnUnexpectedFailure: true, logSolved: false }
      );
    }

    case 'runtime/graph-trigger': {
      if (state.runtime.status === 'editing') {
        return appendExecutionLog(state, context, {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.MANUAL_TRIGGER_INACTIVE,
          message: 'Manual Trigger requires a running or paused simulation.'
        });
      }

      const graph = state.graph ?? null;
      if (!graph) {
        return appendExecutionLog(state, context, {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.SKIPPED,
          message: 'Manual Trigger ignored: no graph exists.'
        });
      }
      if (!state.runtime.execution.enabled) {
        return appendExecutionLog(state, context, {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.SKIPPED,
          message: 'Manual Trigger ignored: graph execution was skipped for this session.'
        });
      }

      const trigger = selectManualTriggerNode(graph, command.triggerNodeId);
      if (!trigger) {
        return appendExecutionLog(state, context, {
          severity: 'warn',
          code: GRAPH_EXECUTION_CODES.MANUAL_TRIGGER_MISSING,
          message: 'Manual Trigger ignored: the graph has no manualTrigger node.'
        });
      }

      // D-M2C-03: while Paused the activation is queued; drainExecution holds it.
      const next = enqueueExecution(state, context, {
        sessionId: state.runtime.execution.sessionId,
        triggerNodeId: trigger.id,
        triggerType: 'manualTrigger'
      });
      return drainExecution(next, context);
    }

    case 'demo/load-scenario': {
      if (state.runtime.status !== 'editing') {
        return appendRuntimeFailureLog(
          state,
          {
            code: 'DEMO_LOAD_BLOCKED',
            message: 'Demo scenario can only be loaded while editing.',
            severity: 'warn'
          },
          context,
          state.runtime.status === 'paused' ? 'paused' : 'paused'
        );
      }

      const floorId = context.idFactory();
      const ballId = context.idFactory();
      const floorRigidBodyId = context.idFactory();
      const ballRigidBodyId = context.idFactory();

      const floorEntity: WorldEntity = {
        id: floorId,
        name: 'Demo Floor',
        type: 'plane',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        metadata: {},
        components: [
          {
            id: floorRigidBodyId,
            type: 'rigidBody',
            enabled: true,
            mass: 1,
            useGravity: false,
            collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } },
            velocity: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 }
          } as RigidBodyComponent
        ]
      };

      const ballEntity: WorldEntity = {
        id: ballId,
        name: 'Demo Ball',
        type: 'sphere',
        transform: {
          position: { x: 0, y: 5, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        },
        metadata: {},
        components: [
          {
            id: ballRigidBodyId,
            type: 'rigidBody',
            enabled: true,
            mass: 1,
            useGravity: true,
            collider: { kind: 'sphere', size: 0.5 },
            velocity: { x: 0, y: 0, z: 0 },
            angularVelocity: { x: 0, y: 0, z: 0 }
          } as RigidBodyComponent
        ]
      };

      const nextEntities = [...state.project.world.entities, floorEntity, ballEntity];
      return {
        ...state,
        project: {
          ...state.project,
          world: { ...state.project.world, entities: nextEntities }
        },
        editor: { ...state.editor, selectedEntityId: ballId },
        logs: [...state.logs, {
          id: context.idFactory(),
          timestamp: context.clock(),
          severity: 'info' as const,
          source: 'EDITOR' as const,
          code: 'DEMO_LOADED',
          message: 'Demo scenario loaded.'
        }].slice(-500)
      };
    }

    case 'graph/set': {
      return markDirty({ ...state, graph: command.graph });
    }

    case 'graph/select-node': {
      return { ...state, editor: { ...state.editor, selectedGraphNodeId: command.nodeId } };
    }

    case 'runtime/error': {
      if (state.runtime.status === 'editing') {
        return state;
      }
      return {
        ...state,
        runtime: {
          ...state.runtime,
          status: 'paused',
          lastError: command.error,
          execution: {
            ...state.runtime.execution,
            status: state.runtime.execution.queue.length > 0 ? 'suspended' : 'idle'
          }
        }
      };
    }

    default:
      return state;
  }
}
