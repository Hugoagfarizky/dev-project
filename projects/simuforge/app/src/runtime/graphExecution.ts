import type {
  Graph,
  GraphDiagnostic,
  GraphNode,
  GraphNodeId,
  GraphNodeType,
  GraphValidationContext
} from '../graph/types.ts';
import { validateGraph } from '../graph/validation.ts';
import { RuntimeError, applyForce, applyImpulse, clearForce, toSimulationFailure } from './physics.ts';
import type { SimulationFailure } from './physics.ts';
import type { RuntimeBodies } from './types.ts';
import { applyPythonActions } from '../python/actions.ts';
import type { PythonAction } from '../python/types.ts';
import { applyElectricalAction } from './electrical.ts';
import type { ElectricalOverrides } from './electrical.ts';
import type { WorldEntity } from '../world/types.ts';

/**
 * M2-C graph execution engine.
 *
 * This module is pure: it reads the canonical graph model and the runtime body
 * map, and returns explicit results. It never imports React, React Flow,
 * Babylon, or browser globals, and it never mutates its inputs.
 */

/** D-M2C-04: bounded FIFO queue capacity. */
export const EXECUTION_QUEUE_CAPACITY = 64;

/** Console codes required by D-M2C-09 and the M2-C technical review. */
export const GRAPH_EXECUTION_CODES = {
  TRIGGERED: 'GRAPH_TRIGGERED',
  NODE_EXECUTED: 'GRAPH_NODE_EXECUTED',
  COMPLETED: 'GRAPH_EXECUTION_COMPLETED',
  CANCELLED: 'GRAPH_EXECUTION_CANCELLED',
  FAILED: 'GRAPH_EXECUTION_FAILED',
  SKIPPED: 'GRAPH_EXECUTION_SKIPPED',
  WARNING: 'GRAPH_EXECUTION_WARNING',
  QUEUE_OVERFLOW: 'GRAPH_QUEUE_OVERFLOW',
  MANUAL_TRIGGER_MISSING: 'GRAPH_MANUAL_TRIGGER_MISSING',
  MANUAL_TRIGGER_INACTIVE: 'GRAPH_MANUAL_TRIGGER_INACTIVE'
} as const;

export const GRAPH_EXECUTION_ERRORS = {
  INVALID_TRIGGER: 'GRAPH_EXECUTION_INVALID_TRIGGER',
  CYCLE: 'GRAPH_EXECUTION_CYCLE',
  NODE_MISSING: 'GRAPH_EXECUTION_NODE_MISSING',
  INVALID_NODE: 'GRAPH_EXECUTION_INVALID_NODE',
  PYTHON_FAILED: 'GRAPH_EXECUTION_PYTHON_FAILED',
  ELECTRICAL_TARGET: 'GRAPH_EXECUTION_ELECTRICAL_TARGET',
  ELECTRICAL_VALUE: 'GRAPH_EXECUTION_ELECTRICAL_VALUE'
} as const;

const TRIGGER_TYPES: Record<GraphNodeType, true | undefined> = {
  onStart: true,
  manualTrigger: true,
  onPlaneContact: true,
  applyForce: undefined,
  applyImpulse: undefined,
  clearForce: undefined,
  runPython: undefined,
  setSwitch: undefined,
  setSourceVoltage: undefined
};

const ACTION_TYPES: Record<GraphNodeType, true | undefined> = {
  onStart: undefined,
  manualTrigger: undefined,
  onPlaneContact: undefined,
  applyForce: true,
  applyImpulse: true,
  clearForce: true,
  runPython: true,
  setSwitch: true,
  setSourceVoltage: true
};

export function isTriggerNodeType(type: GraphNodeType): boolean {
  return TRIGGER_TYPES[type] === true;
}

export function isActionNodeType(type: GraphNodeType): boolean {
  return ACTION_TYPES[type] === true;
}

function byNodeId(a: GraphNode, b: GraphNode): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** All trigger nodes of one type, sorted by node id for deterministic firing. */
export function selectTriggerNodes(graph: Graph, type: GraphNodeType): GraphNode[] {
  return graph.nodes.filter((node) => node.type === type).slice().sort(byNodeId);
}

export function hasOutgoingEdge(graph: Graph, nodeId: GraphNodeId): boolean {
  return graph.edges.some((edge) => edge.sourceNodeId === nodeId);
}

/**
 * Resolves the manual trigger to fire. A preferred node id is honoured only when
 * it names a manual trigger; otherwise the lowest-id manual trigger is used.
 */
export function selectManualTriggerNode(graph: Graph, preferredNodeId?: string | null): GraphNode | null {
  const manualTriggers = selectTriggerNodes(graph, 'manualTrigger');
  if (preferredNodeId) {
    const preferred = manualTriggers.find((node) => node.id === preferredNodeId);
    if (preferred) {
      return preferred;
    }
  }
  return manualTriggers[0] ?? null;
}

export interface ExecutionReadiness {
  ready: boolean;
  diagnostics: GraphDiagnostic[];
  /** Blocking reasons. Empty when the graph can execute. */
  reasons: string[];
  /** Non-blocking notes, such as unreachable action nodes. */
  warnings: string[];
  triggerNodeIds: string[];
  executableTriggerNodeIds: string[];
}

/**
 * Execution readiness is distinct from authoring validation. D-M2C-06 keeps Play
 * allowed even when readiness fails: the caller skips graph execution in full.
 */
export function evaluateExecutionReadiness(
  graph: Graph,
  context: GraphValidationContext
): ExecutionReadiness {
  const diagnostics = validateGraph(graph, context).diagnostics;
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  const reasons = errors.map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`);

  const triggerNodes = graph.nodes.filter((node) => isTriggerNodeType(node.type)).slice().sort(byNodeId);
  const triggerNodeIds = triggerNodes.map((node) => node.id);
  const executableTriggerNodeIds = triggerNodes
    .filter((node) => hasOutgoingEdge(graph, node.id))
    .map((node) => node.id);

  if (triggerNodeIds.length === 0) {
    reasons.push('No trigger node exists.');
  } else if (executableTriggerNodeIds.length === 0) {
    reasons.push('No trigger node has an outgoing edge.');
  }

  const reachable = new Set<string>();
  for (const triggerNodeId of executableTriggerNodeIds) {
    for (const nodeId of collectReachableNodeIds(graph, triggerNodeId)) {
      reachable.add(nodeId);
    }
  }

  const warnings = graph.nodes
    .filter((node) => isActionNodeType(node.type) && !reachable.has(node.id))
    .slice()
    .sort(byNodeId)
    .map((node) => `Action node ${node.id} (${node.type}) is not reachable from any trigger.`);

  return {
    ready: reasons.length === 0,
    diagnostics,
    reasons,
    warnings,
    triggerNodeIds,
    executableTriggerNodeIds
  };
}

/**
 * Node ids reachable from a trigger by following execution edges forward.
 * Reachability is a set; ordering is decided by the topological plan.
 */
export function collectReachableNodeIds(graph: Graph, triggerNodeId: GraphNodeId): Set<string> {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, string[]>();
  for (const node of graph.nodes) {
    outgoing.set(node.id, []);
  }
  for (const edge of graph.edges) {
    if (!nodesById.has(edge.sourceNodeId) || !nodesById.has(edge.targetNodeId)) {
      continue;
    }
    outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId);
  }
  for (const targets of outgoing.values()) {
    targets.sort(compareIds);
  }

  const reachable = new Set<string>();
  if (!nodesById.has(triggerNodeId)) {
    return reachable;
  }

  const queue: string[] = [triggerNodeId];
  reachable.add(triggerNodeId);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const target of outgoing.get(current) ?? []) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  return reachable;
}

export interface ExecutionPlan {
  triggerNodeId: GraphNodeId;
  triggerType: GraphNodeType;
  /** Deterministic topological order of nodes reachable from the trigger. */
  order: GraphNodeId[];
}

export interface ExecutionPlanResult {
  ok: boolean;
  plan?: ExecutionPlan;
  error?: { code: string; message: string };
}

function insertSorted(ids: string[], id: string): void {
  let index = 0;
  while (index < ids.length && compareIds(ids[index] as string, id) <= 0) {
    index += 1;
  }
  ids.splice(index, 0, id);
}

/**
 * Builds a deterministic topological plan for one trigger (D-M2C-05).
 *
 * Only nodes reachable from the trigger are included. Kahn's algorithm is used
 * with node id as the tie-breaker, so edge-array insertion order and canvas
 * position cannot influence execution order. A fan-in node therefore runs only
 * after every reachable predecessor path has completed.
 */
export function buildExecutionPlan(graph: Graph, triggerNodeId: GraphNodeId): ExecutionPlanResult {
  const trigger = graph.nodes.find((node) => node.id === triggerNodeId);
  if (!trigger) {
    return {
      ok: false,
      error: {
        code: GRAPH_EXECUTION_ERRORS.INVALID_TRIGGER,
        message: `Trigger node ${triggerNodeId} does not exist.`
      }
    };
  }
  if (!isTriggerNodeType(trigger.type)) {
    return {
      ok: false,
      error: {
        code: GRAPH_EXECUTION_ERRORS.INVALID_TRIGGER,
        message: `Node ${triggerNodeId} is not a trigger node.`
      }
    };
  }

  const reachable = collectReachableNodeIds(graph, triggerNodeId);
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const nodeId of reachable) {
    indegree.set(nodeId, 0);
    outgoing.set(nodeId, []);
  }

  for (const edge of graph.edges) {
    if (!reachable.has(edge.sourceNodeId) || !reachable.has(edge.targetNodeId)) {
      continue;
    }
    outgoing.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    indegree.set(edge.targetNodeId, (indegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const ready: string[] = [];
  for (const [nodeId, degree] of indegree) {
    if (degree === 0) {
      ready.push(nodeId);
    }
  }
  ready.sort(compareIds);

  const order: string[] = [];
  while (ready.length > 0) {
    const current = ready.shift() as string;
    order.push(current);
    for (const target of outgoing.get(current) ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) {
        insertSorted(ready, target);
      }
    }
  }

  if (order.length !== reachable.size) {
    return {
      ok: false,
      error: {
        code: GRAPH_EXECUTION_ERRORS.CYCLE,
        message: 'Graph execution plan could not be ordered because the reachable graph contains a cycle.'
      }
    };
  }

  return {
    ok: true,
    plan: {
      triggerNodeId,
      triggerType: trigger.type,
      order
    }
  };
}

export interface NodeExecutionResult {
  nodeId: GraphNodeId;
  type: GraphNodeType;
  status: 'executed';
  entityId?: string;
  detail?: string;
}

export interface ExecutionFailure {
  nodeId: GraphNodeId;
  type: GraphNodeType;
  code: string;
  message: string;
  severity: 'warn' | 'error';
}

export interface ChainExecutionResult {
  /** Bodies after the last successful node. A failed node commits nothing. */
  bodies: RuntimeBodies;
  /**
   * Electrical overrides after the last successful node. Null when the caller
   * supplied no electrical context. Reference-equal to the input overrides when
   * no electrical node changed anything, so callers can skip a re-solve.
   */
  electrical: ElectricalOverrides | null;
  executed: NodeExecutionResult[];
  failure: ExecutionFailure | null;
  completed: boolean;
  /**
   * Set when the chain stopped before an asynchronous node. The caller resumes
   * with the same plan and index once the runtime returns an outcome.
   */
  suspension?: ChainSuspension;
}

/** Result of one Python invocation, as the chain sees it. */
export interface PythonNodeOutcome {
  ok: boolean;
  actions?: readonly PythonAction[];
  durationMs: number;
  code?: string;
  message?: string;
  line?: number | null;
}

export interface ChainSuspension {
  nodeId: GraphNodeId;
  index: number;
}

export interface ChainExecutionOptions {
  /** Index in the plan to start from. Defaults to 0. */
  startIndex?: number;
  /** Outcome for the Python node at `startIndex`, supplied when resuming. */
  python?: { nodeId: GraphNodeId; outcome: PythonNodeOutcome };
  /**
   * Phase 08: enables `setSwitch` and `setSourceVoltage`. The entities are the
   * authored world; overrides are the current transient runtime values.
   */
  electrical?: {
    entities: readonly WorldEntity[];
    overrides: ElectricalOverrides;
  };
}

function actionDetail(node: GraphNode): string {
  switch (node.config.kind) {
    case 'applyForce':
      return `F=(${node.config.force.x}, ${node.config.force.y}, ${node.config.force.z}) N`;
    case 'applyImpulse':
      return `J=(${node.config.impulse.x}, ${node.config.impulse.y}, ${node.config.impulse.z}) N*s`;
    case 'clearForce':
      return 'Force accumulator cleared.';
    case 'runPython':
      return 'Python script executed.';
    case 'setSwitch':
      return `Switch ${node.config.targetEntityId}/${node.config.targetComponentId} → ${node.config.closed ? 'closed' : 'open'}`;
    case 'setSourceVoltage':
      return `Source ${node.config.targetEntityId}/${node.config.targetComponentId} → ${node.config.voltage} V`;
    default:
      return '';
  }
}

/**
 * Applies one action node through the existing M1-E runtime APIs. Physics is not
 * duplicated here. The M1-E functions clone-and-throw, so a failed node cannot
 * partially commit.
 */
export function applyAction(bodies: RuntimeBodies, node: GraphNode): RuntimeBodies {
  switch (node.config.kind) {
    case 'applyForce':
      return applyForce(bodies, node.config.targetEntityId, node.config.force);
    case 'applyImpulse':
      return applyImpulse(bodies, node.config.targetEntityId, node.config.impulse);
    case 'clearForce':
      return clearForce(bodies, node.config.targetEntityId);
    default:
      throw new RuntimeError(
        GRAPH_EXECUTION_ERRORS.INVALID_NODE,
        `Node ${node.id} (${node.type}) is not an executable action node.`
      );
  }
}

function actionEntityId(node: GraphNode): string | undefined {
  switch (node.config.kind) {
    case 'applyForce':
    case 'applyImpulse':
    case 'clearForce':
    case 'onPlaneContact':
    case 'setSwitch':
    case 'setSourceVoltage':
      return node.config.targetEntityId;
    default:
      return undefined;
  }
}

/**
 * Executes a plan sequentially and atomically per node (D-M2C-01, D-M2C-08).
 * Any node failure stops the chain; successful earlier nodes are retained.
 *
 * Phase 07 adds one asynchronous node type. `runPython` cannot be executed here
 * because it needs the worker; the chain stops and reports a suspension instead.
 * The caller resumes with `{ startIndex, python }` once the runtime answers, so
 * ordering stays deterministic and the simulation keeps stepping meanwhile.
 */
export function executeChain(
  plan: ExecutionPlan,
  graph: Graph,
  bodies: RuntimeBodies,
  options: ChainExecutionOptions = {}
): ChainExecutionResult {
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const executed: NodeExecutionResult[] = [];
  let current = bodies;
  let electrical = options.electrical?.overrides ?? null;
  const startIndex = options.startIndex ?? 0;

  for (let index = startIndex; index < plan.order.length; index += 1) {
    const nodeId = plan.order[index] as string;
    const node = nodesById.get(nodeId);
    if (!node) {
      return {
        bodies: current,
        electrical,
        executed,
        failure: {
          nodeId,
          type: plan.triggerType,
          code: GRAPH_EXECUTION_ERRORS.NODE_MISSING,
          message: `Execution plan references missing node ${nodeId}.`,
          severity: 'error'
        },
        completed: false
      };
    }

    if (isTriggerNodeType(node.type)) {
      executed.push({ nodeId: node.id, type: node.type, status: 'executed', detail: 'trigger' });
      continue;
    }

    if (node.config.kind === 'runPython') {
      const resume = options.python;
      if (!resume || resume.nodeId !== node.id) {
        return {
          bodies: current,
          electrical,
          executed,
          failure: null,
          completed: false,
          suspension: { nodeId: node.id, index }
        };
      }

      if (!resume.outcome.ok) {
        return {
          bodies: current,
          electrical,
          executed,
          failure: {
            nodeId: node.id,
            type: node.type,
            code: resume.outcome.code ?? GRAPH_EXECUTION_ERRORS.PYTHON_FAILED,
            message: resume.outcome.message ?? 'Python execution failed.',
            severity: 'error'
          },
          completed: false
        };
      }

      try {
        current = applyPythonActions(current, resume.outcome.actions ?? []);
      } catch (error) {
        const failure: SimulationFailure = toSimulationFailure(error);
        return {
          bodies: current,
          electrical,
          executed,
          failure: {
            nodeId: node.id,
            type: node.type,
            code: failure.code,
            message: failure.message,
            severity: failure.severity ?? 'error'
          },
          completed: false
        };
      }

      const actionCount = resume.outcome.actions?.length ?? 0;
      executed.push({
        nodeId: node.id,
        type: node.type,
        status: 'executed',
        detail: `Python script · ${actionCount} action(s) · ${Math.round(resume.outcome.durationMs)} ms`
      });
      continue;
    }

    if (node.config.kind === 'setSwitch' || node.config.kind === 'setSourceVoltage') {
      if (!options.electrical || electrical === null) {
        return {
          bodies: current,
          electrical,
          executed,
          failure: {
            nodeId: node.id,
            type: node.type,
            code: GRAPH_EXECUTION_ERRORS.INVALID_NODE,
            message: `Node ${node.id} (${node.type}) requires an electrical runtime context.`,
            severity: 'error'
          },
          completed: false
        };
      }

      const action =
        node.config.kind === 'setSwitch'
          ? {
              kind: 'switch' as const,
              entityId: node.config.targetEntityId,
              componentId: node.config.targetComponentId,
              closed: node.config.closed
            }
          : {
              kind: 'sourceVoltage' as const,
              entityId: node.config.targetEntityId,
              componentId: node.config.targetComponentId,
              voltage: node.config.voltage
            };

      const result = applyElectricalAction(options.electrical.entities, electrical, action);
      if (!result.ok) {
        return {
          bodies: current,
          electrical,
          executed,
          failure: {
            nodeId: node.id,
            type: node.type,
            code:
              result.reason === 'value'
                ? GRAPH_EXECUTION_ERRORS.ELECTRICAL_VALUE
                : GRAPH_EXECUTION_ERRORS.ELECTRICAL_TARGET,
            message: result.message,
            severity: 'error'
          },
          completed: false
        };
      }

      electrical = result.overrides;
      executed.push({
        nodeId: node.id,
        type: node.type,
        status: 'executed',
        entityId: node.config.targetEntityId,
        detail: actionDetail(node)
      });
      continue;
    }

    try {
      const next = applyAction(current, node);
      current = next;
      const entityId = actionEntityId(node);
      executed.push({
        nodeId: node.id,
        type: node.type,
        status: 'executed',
        ...(entityId ? { entityId } : {}),
        detail: actionDetail(node)
      });
    } catch (error) {
      const failure: SimulationFailure = toSimulationFailure(error);
      return {
        bodies: current,
        electrical,
        executed,
        failure: {
          nodeId: node.id,
          type: node.type,
          code: failure.code,
          message: failure.message,
          severity: failure.severity ?? 'error'
        },
        completed: false
      };
    }
  }

  return { bodies: current, electrical, executed, failure: null, completed: true };
}

export interface PlaneContactPayload {
  bodyEntityId: string;
  planeEntityId: string;
}

/**
 * Matches On Plane Contact triggers against rising-edge contact events. The
 * payload carries both ids, so a node may target either the dynamic body or the
 * plane (D-M2C-07). Results are ordered by contact, then trigger node id.
 */
export function matchContactTriggers(
  graph: Graph,
  contacts: readonly PlaneContactPayload[]
): Array<{ node: GraphNode; contact: PlaneContactPayload }> {
  const triggers = selectTriggerNodes(graph, 'onPlaneContact');
  if (triggers.length === 0 || contacts.length === 0) {
    return [];
  }

  const sortedContacts = contacts.slice().sort((a, b) => {
    const bodyOrder = compareIds(a.bodyEntityId, b.bodyEntityId);
    return bodyOrder !== 0 ? bodyOrder : compareIds(a.planeEntityId, b.planeEntityId);
  });

  const matches: Array<{ node: GraphNode; contact: PlaneContactPayload }> = [];
  for (const contact of sortedContacts) {
    for (const node of triggers) {
      if (node.config.kind !== 'onPlaneContact') {
        continue;
      }
      if (
        node.config.targetEntityId === contact.bodyEntityId ||
        node.config.targetEntityId === contact.planeEntityId
      ) {
        matches.push({ node, contact });
      }
    }
  }
  return matches;
}
