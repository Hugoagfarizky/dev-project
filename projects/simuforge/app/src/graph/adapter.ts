import type { Node, Edge } from '@xyflow/react';
import type { Graph, GraphNode, GraphDiagnostic } from './types.ts';
import { getNodePortDefinitions } from './nodes.ts';

export interface GraphEditorNodeData extends Record<string, unknown> {
  node: GraphNode;
  diagnostics: GraphDiagnostic[];
}

export type GraphEditorNode = Node<GraphEditorNodeData>;
export type GraphEditorEdge = Edge;

export function toReactFlowNodes(
  graph: Graph | null | undefined,
  diagnostics: GraphDiagnostic[] = [],
  selectedNodeId: string | null = null
): GraphEditorNode[] {
  if (!graph) return [];
  return graph.nodes.map((node) => ({
    id: node.id,
    type: 'default',
    position: node.position ?? { x: 0, y: 0 },
    selected: node.id === selectedNodeId,
    data: {
      node,
      diagnostics: diagnostics.filter((diagnostic) => diagnostic.nodeId === node.id)
    }
  }));
}

export function toReactFlowEdges(graph: Graph | null | undefined): GraphEditorEdge[] {
  if (!graph) return [];
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceNodeId,
    sourceHandle: edge.sourcePortId,
    target: edge.targetNodeId,
    targetHandle: edge.targetPortId,
    type: 'default'
  }));
}

export function applyNodePosition(graph: Graph, nodeId: string, position: { x: number; y: number }): Graph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      node.id === nodeId ? { ...node, position } : node
    )
  };
}

export function createCanonicalNode(
  type: GraphNode['type'],
  id: string,
  position: { x: number; y: number } = { x: 0, y: 0 }
): GraphNode {
  const configByType: Record<GraphNode['type'], GraphNode['config']> = {
    onStart: { kind: 'onStart' },
    manualTrigger: { kind: 'manualTrigger' },
    onPlaneContact: { kind: 'onPlaneContact', targetEntityId: '' },
    applyForce: { kind: 'applyForce', targetEntityId: '', force: { x: 0, y: 0, z: 0 } },
    applyImpulse: { kind: 'applyImpulse', targetEntityId: '', impulse: { x: 0, y: 0, z: 0 } },
    clearForce: { kind: 'clearForce', targetEntityId: '' }
  };

  return {
    id,
    type,
    position,
    config: configByType[type]
  };
}

export function portHandleId(nodeId: string, portId: string): string {
  return `${nodeId}:${portId}`;
}

export function getNodePortDefinitionsForEditor(type: GraphNode['type']) {
  return getNodePortDefinitions(type);
}