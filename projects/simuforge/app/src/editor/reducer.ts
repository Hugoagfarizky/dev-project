import { createWorldEntity } from '../world/defaults.ts';
import { validateTransform, validateComponent } from '../world/validation.ts';
import { transformsEqual } from '../world/transform.ts';
import { createDefaultRuntimeState, createEmptyProject } from './state.ts';
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
import type { GraphNodeType, GraphValidationContext } from '../graph/types.ts';
import type { StudioCommand } from './commands.ts';
import type {
  CameraPose,
  ExecutionOutcome,
  ExecutionQueueEntry,
  ExecutionResultSummary,
  RuntimeExecutionState,
  StudioState
} from './state.ts';
import type { EntityType, RigidBodyComponent, WorldEntity } from '../world/types.ts';

export interface ReducerContext {
  idFactory: () => string;
  clock: () => string;
}

const defaultContext: ReducerContext = {
  idFactory: () => crypto.randomUUID(),
  clock: () => new Date().toISOString()
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
    components: entity.components ? entity.components.map((component) => ({ ...component })) : []
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
  'demo/load-scenario',
  'graph/set'
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
  entry: { code: string; message: string; entityId?: string; detail?: string }
): StudioState {
  return {
    ...state,
    logs: [...state.logs, {
      id: context.idFactory(),
      timestamp: context.clock(),
      severity: 'info' as const,
      source: 'RUNTIME' as const,
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
  }
): StudioState {
  return {
    ...state,
    logs: [...state.logs, {
      id: context.idFactory(),
      timestamp: context.clock(),
      severity: entry.severity,
      source: 'RUNTIME' as const,
      code: entry.code,
      message: entry.message,
      ...(entry.entityId ? { entityId: entry.entityId } : {}),
      ...(entry.detail ? { detail: entry.detail } : {})
    }].slice(-500)
  };
}

function graphValidationContext(state: StudioState): GraphValidationContext {
  return {
    entities: state.project.world.entities.map((entity) => ({
      id: entity.id,
      components: entity.components ?? []
    }))
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
function drainExecution(state: StudioState, context: ReducerContext): StudioState {
  if (state.runtime.status !== 'running') {
    return withExecutionStatus(
      state,
      state.runtime.execution.queue.length > 0 ? 'suspended' : 'idle'
    );
  }

  const graph = state.graph ?? null;
  if (!graph || !state.runtime.execution.enabled) {
    return withExecutionStatus(state, 'idle');
  }

  let working = state;

  while (working.runtime.execution.queue.length > 0) {
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

    const chain = executeChain(plan, graph, working.runtime.bodies);

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
                ? remaining.length > 0 ? 'suspended' : 'idle'
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
        runtime: createDefaultRuntimeState()
      };
    }

    case 'project/open': {
      return {
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
              components: entity.components ? entity.components.map((c) => ({ ...c })) : []
            }))
          }
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
        runtime: createDefaultRuntimeState()
      };
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
      return markDirty({
        ...state,
        project: {
          ...state.project,
          world: {
            ...state.project.world,
            entities: state.project.world.entities.filter((entity) => entity.id !== command.id)
          }
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
          }
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
            execution: {
              sessionId,
              status: 'idle',
              enabled: false,
              queue: [],
              lastTrigger: null,
              lastResult: null,
              droppedEvents: state.runtime.execution.droppedEvents,
              contactKeys: []
            }
          }
        };

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
          execution: {
            ...state.runtime.execution,
            sessionId,
            status: 'idle',
            queue: [],
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
      return { ...state, graph: command.graph };
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
