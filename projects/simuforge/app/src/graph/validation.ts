import type {
  Graph,
  GraphDiagnostic,
  GraphEdge,
  GraphNode,
  GraphValidationContext,
  GraphValidationResult
} from './types.ts';
import { getNodePortDefinitions } from './nodes.ts';

export const GRAPH_DIAGNOSTIC_CODES = {
  MISSING_GRAPH_ID: 'GRAPH_MISSING_ID',
  MISSING_GRAPH_NAME: 'GRAPH_MISSING_NAME',
  EMPTY_NODE_ID: 'GRAPH_EMPTY_NODE_ID',
  DUPLICATE_NODE_ID: 'GRAPH_DUPLICATE_NODE_ID',
  UNSUPPORTED_NODE_TYPE: 'GRAPH_UNSUPPORTED_NODE_TYPE',
  INVALID_NODE_CONFIG: 'GRAPH_INVALID_NODE_CONFIG',
  MISSING_TARGET_ENTITY: 'GRAPH_MISSING_TARGET_ENTITY',
  INVALID_TARGET_ENTITY: 'GRAPH_INVALID_TARGET_ENTITY',
  NON_FINITE_NUMBER: 'GRAPH_NON_FINITE_NUMBER',
  EMPTY_EDGE_ID: 'GRAPH_EMPTY_EDGE_ID',
  DUPLICATE_EDGE_ID: 'GRAPH_DUPLICATE_EDGE_ID',
  MISSING_SOURCE_NODE: 'GRAPH_MISSING_SOURCE_NODE',
  MISSING_TARGET_NODE: 'GRAPH_MISSING_TARGET_NODE',
  MISSING_SOURCE_PORT: 'GRAPH_MISSING_SOURCE_PORT',
  MISSING_TARGET_PORT: 'GRAPH_MISSING_TARGET_PORT',
  PORT_DIRECTION_MISMATCH: 'GRAPH_PORT_DIRECTION_MISMATCH',
  PORT_KIND_MISMATCH: 'GRAPH_PORT_KIND_MISMATCH',
  DUPLICATE_CONNECTION: 'GRAPH_DUPLICATE_CONNECTION',
  UNSUPPORTED_CYCLE: 'GRAPH_UNSUPPORTED_CYCLE',
  MISSING_REQUIRED_PORT: 'GRAPH_MISSING_REQUIRED_PORT'
} as const;

function diagnostic(
  code: string,
  message: string,
  severity: 'error' | 'warning' = 'error',
  fields: Partial<GraphDiagnostic> = {}
): GraphDiagnostic {
  return { code, severity, message, ...fields };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isVec3(value: unknown): value is { x: number; y: number; z: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    isFiniteNumber((value as { x: unknown }).x) &&
    isFiniteNumber((value as { y: unknown }).y) &&
    isFiniteNumber((value as { z: unknown }).z)
  );
}

function validateNodeConfig(
  node: GraphNode,
  context: GraphValidationContext
): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = [];

  switch (node.config.kind) {
    case 'onStart':
    case 'manualTrigger':
      break;

    case 'onPlaneContact':
    case 'applyForce':
    case 'applyImpulse':
    case 'clearForce': {
      const config = node.config as { targetEntityId: unknown; force?: unknown; impulse?: unknown };
      if (typeof config.targetEntityId !== 'string' || config.targetEntityId.trim().length === 0) {
        diagnostics.push(
          diagnostic(
            GRAPH_DIAGNOSTIC_CODES.MISSING_TARGET_ENTITY,
            `Node ${node.id} requires a non-empty targetEntityId.`,
            'error',
            { nodeId: node.id, field: 'targetEntityId' }
          )
        );
        break;
      }

      const entity = context.entities.find((item) => item.id === config.targetEntityId);
      if (!entity) {
        diagnostics.push(
          diagnostic(
            GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_ENTITY,
            `Node ${node.id} references unknown entity ${config.targetEntityId}.`,
            'error',
            { nodeId: node.id, field: 'targetEntityId' }
          )
        );
        break;
      }

      const rigidBody = entity.components.find((component) => component.type === 'rigidBody' && component.enabled);
      if (!rigidBody) {
        diagnostics.push(
          diagnostic(
            GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_ENTITY,
            `Node ${node.id} target ${config.targetEntityId} has no enabled rigidBody component.`,
            'error',
            { nodeId: node.id, field: 'targetEntityId' }
          )
        );
        break;
      }

      if (rigidBody.collider?.kind === 'plane' && node.config.kind !== 'onPlaneContact') {
        diagnostics.push(
          diagnostic(
            GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_ENTITY,
            `Node ${node.id} target ${config.targetEntityId} is a static plane and cannot receive force or impulse.`,
            'error',
            { nodeId: node.id, field: 'targetEntityId' }
          )
        );
      }
      break;
    }

    default:
      diagnostics.push(
        diagnostic(
          GRAPH_DIAGNOSTIC_CODES.INVALID_NODE_CONFIG,
          `Node ${node.id} has an unsupported configuration kind.`,
          'error',
          { nodeId: node.id, field: 'config' }
        )
      );
      break;
  }

  if (node.config.kind === 'applyForce' && !isVec3((node.config as { force?: unknown }).force)) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.NON_FINITE_NUMBER,
        `Node ${node.id} force must be a finite Vec3.`,
        'error',
        { nodeId: node.id, field: 'force' }
      )
    );
  }

  if (node.config.kind === 'applyImpulse' && !isVec3((node.config as { impulse?: unknown }).impulse)) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.NON_FINITE_NUMBER,
        `Node ${node.id} impulse must be a finite Vec3.`,
        'error',
        { nodeId: node.id, field: 'impulse' }
      )
    );
  }

  return diagnostics;
}

function validateNode(node: GraphNode, context: GraphValidationContext): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = [];

  if (typeof node.id !== 'string' || node.id.trim().length === 0) {
    diagnostics.push(
      diagnostic(GRAPH_DIAGNOSTIC_CODES.EMPTY_NODE_ID, 'Node id must be a non-empty string.', 'error')
    );
  }

  if (!Object.prototype.hasOwnProperty.call(NODE_TYPE_SET, node.type)) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.UNSUPPORTED_NODE_TYPE,
        `Unsupported node type: ${String(node.type)}.`,
        'error',
        { nodeId: node.id }
      )
    );
    return diagnostics;
  }

  if (node.config.kind !== node.type) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.INVALID_NODE_CONFIG,
        `Node ${node.id} config kind must match node type ${node.type}.`,
        'error',
        { nodeId: node.id, field: 'config' }
      )
    );
  }

  diagnostics.push(...validateNodeConfig(node, context));
  return diagnostics;
}

const NODE_TYPE_SET: Record<string, true> = {
  onStart: true,
  manualTrigger: true,
  onPlaneContact: true,
  applyForce: true,
  applyImpulse: true,
  clearForce: true
};

function portDefinition(type: GraphNode['type'], portId: string) {
  return getNodePortDefinitions(type).find((port) => port.id === portId);
}

function validateEdge(
  edge: GraphEdge,
  nodesById: Map<string, GraphNode>
): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = [];

  if (typeof edge.id !== 'string' || edge.id.trim().length === 0) {
    diagnostics.push(
      diagnostic(GRAPH_DIAGNOSTIC_CODES.EMPTY_EDGE_ID, 'Edge id must be a non-empty string.', 'error')
    );
  }

  const sourceNode = nodesById.get(edge.sourceNodeId);
  const targetNode = nodesById.get(edge.targetNodeId);

  if (!sourceNode) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.MISSING_SOURCE_NODE,
        `Edge ${edge.id} references missing source node ${edge.sourceNodeId}.`,
        'error',
        { edgeId: edge.id }
      )
    );
  }

  if (!targetNode) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.MISSING_TARGET_NODE,
        `Edge ${edge.id} references missing target node ${edge.targetNodeId}.`,
        'error',
        { edgeId: edge.id }
      )
    );
  }

  if (sourceNode) {
    const sourcePort = portDefinition(sourceNode.type, edge.sourcePortId);
    if (!sourcePort) {
      diagnostics.push(
        diagnostic(
          GRAPH_DIAGNOSTIC_CODES.MISSING_SOURCE_PORT,
          `Edge ${edge.id} references missing source port ${edge.sourcePortId}.`,
          'error',
          { edgeId: edge.id }
        )
      );
    } else if (sourcePort.direction !== 'output') {
      diagnostics.push(
        diagnostic(
          GRAPH_DIAGNOSTIC_CODES.PORT_DIRECTION_MISMATCH,
          `Edge ${edge.id} source port ${edge.sourcePortId} is not an output port.`,
          'error',
          { edgeId: edge.id }
        )
      );
    }
  }

  if (targetNode) {
    const targetPort = portDefinition(targetNode.type, edge.targetPortId);
    if (!targetPort) {
      diagnostics.push(
        diagnostic(
          GRAPH_DIAGNOSTIC_CODES.MISSING_TARGET_PORT,
          `Edge ${edge.id} references missing target port ${edge.targetPortId}.`,
          'error',
          { edgeId: edge.id }
        )
      );
    } else if (targetPort.direction !== 'input') {
      diagnostics.push(
        diagnostic(
          GRAPH_DIAGNOSTIC_CODES.PORT_DIRECTION_MISMATCH,
          `Edge ${edge.id} target port ${edge.targetPortId} is not an input port.`,
          'error',
          { edgeId: edge.id }
        )
      );
    }

    if (sourceNode && targetNode) {
      const sourcePort = portDefinition(sourceNode.type, edge.sourcePortId);
      const targetPort = portDefinition(targetNode.type, edge.targetPortId);
      if (sourcePort && targetPort && sourcePort.kind !== targetPort.kind) {
        diagnostics.push(
          diagnostic(
            GRAPH_DIAGNOSTIC_CODES.PORT_KIND_MISMATCH,
            `Edge ${edge.id} connects incompatible port kinds.`,
            'error',
            { edgeId: edge.id }
          )
        );
      }
    }
  }

  return diagnostics;
}

function detectCycle(edges: GraphEdge[], nodeIds: Set<string>): boolean {
  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }
  for (const edge of edges) {
    if (adjacency.has(edge.sourceNodeId) && adjacency.has(edge.targetNodeId)) {
      adjacency.get(edge.sourceNodeId)?.push(edge.targetNodeId);
    }
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    stack.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (!visited.has(next)) {
        if (dfs(next)) return true;
      } else if (stack.has(next)) {
        return true;
      }
    }
    stack.delete(nodeId);
    return false;
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId) && dfs(nodeId)) {
      return true;
    }
  }
  return false;
}

export function validateGraph(graph: Graph, context: GraphValidationContext): GraphValidationResult {
  const diagnostics: GraphDiagnostic[] = [];

  if (typeof graph.id !== 'string' || graph.id.trim().length === 0) {
    diagnostics.push(
      diagnostic(GRAPH_DIAGNOSTIC_CODES.MISSING_GRAPH_ID, 'Graph id must be a non-empty string.', 'error')
    );
  }

  if (typeof graph.name !== 'string' || graph.name.trim().length === 0) {
    diagnostics.push(
      diagnostic(GRAPH_DIAGNOSTIC_CODES.MISSING_GRAPH_NAME, 'Graph name must be a non-empty string.', 'error')
    );
  }

  if (!Array.isArray(graph.nodes)) {
    diagnostics.push(diagnostic(GRAPH_DIAGNOSTIC_CODES.INVALID_NODE_CONFIG, 'Graph nodes must be an array.', 'error'));
    return { valid: false, diagnostics };
  }

  if (!Array.isArray(graph.edges)) {
    diagnostics.push(diagnostic(GRAPH_DIAGNOSTIC_CODES.INVALID_NODE_CONFIG, 'Graph edges must be an array.', 'error'));
    return { valid: false, diagnostics };
  }

  const nodeIds = new Set<string>();
  const duplicateNodes = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      duplicateNodes.add(node.id);
    } else {
      nodeIds.add(node.id);
    }
  }
  for (const id of duplicateNodes) {
    diagnostics.push(
      diagnostic(GRAPH_DIAGNOSTIC_CODES.DUPLICATE_NODE_ID, `Duplicate node id: ${id}.`, 'error', { nodeId: id })
    );
  }

  for (const node of graph.nodes) {
    diagnostics.push(...validateNode(node, context));
  }

  const edgeIds = new Set<string>();
  const duplicateEdges = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      duplicateEdges.add(edge.id);
    } else {
      edgeIds.add(edge.id);
    }
  }
  for (const id of duplicateEdges) {
    diagnostics.push(
      diagnostic(GRAPH_DIAGNOSTIC_CODES.DUPLICATE_EDGE_ID, `Duplicate edge id: ${id}.`, 'error', { edgeId: id })
    );
  }

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const seenConnections = new Set<string>();

  for (const edge of graph.edges) {
    diagnostics.push(...validateEdge(edge, nodesById));

    const connectionKey = `${edge.sourceNodeId}:${edge.sourcePortId}->${edge.targetNodeId}:${edge.targetPortId}`;
    if (seenConnections.has(connectionKey)) {
      diagnostics.push(
        diagnostic(
          GRAPH_DIAGNOSTIC_CODES.DUPLICATE_CONNECTION,
          `Duplicate connection: ${connectionKey}.`,
          'error',
          { edgeId: edge.id }
        )
      );
    } else {
      seenConnections.add(connectionKey);
    }
  }

  if (detectCycle(graph.edges, nodeIds)) {
    diagnostics.push(
      diagnostic(
        GRAPH_DIAGNOSTIC_CODES.UNSUPPORTED_CYCLE,
        'Graph contains an unsupported cycle. Loops are deferred beyond M2-A.',
        'error'
      )
    );
  }


  return {
    valid: diagnostics.every((item) => item.severity !== 'error'),
    diagnostics
  };
}