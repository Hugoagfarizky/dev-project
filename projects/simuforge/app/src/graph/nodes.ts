import type { GraphNode, GraphNodeType, GraphPort, GraphPortDirection, GraphPortKind } from './types.ts';

export interface NodePortDefinition {
  id: string;
  direction: GraphPortDirection;
  kind: GraphPortKind;
}

export const NODE_PORT_DEFINITIONS: Record<GraphNodeType, readonly NodePortDefinition[]> = {
  onStart: [{ id: 'out', direction: 'output', kind: 'execution' }],
  manualTrigger: [{ id: 'out', direction: 'output', kind: 'execution' }],
  onPlaneContact: [{ id: 'out', direction: 'output', kind: 'execution' }],
  applyForce: [
    { id: 'in', direction: 'input', kind: 'execution' },
    { id: 'out', direction: 'output', kind: 'execution' }
  ],
  applyImpulse: [
    { id: 'in', direction: 'input', kind: 'execution' },
    { id: 'out', direction: 'output', kind: 'execution' }
  ],
  clearForce: [
    { id: 'in', direction: 'input', kind: 'execution' },
    { id: 'out', direction: 'output', kind: 'execution' }
  ]
};

export function getNodePortDefinitions(type: GraphNodeType): readonly NodePortDefinition[] {
  return NODE_PORT_DEFINITIONS[type];
}

export function findNodePort(
  type: GraphNodeType,
  portId: string
): NodePortDefinition | undefined {
  return NODE_PORT_DEFINITIONS[type].find((port) => port.id === portId);
}

export function createNodePorts(node: GraphNode): GraphPort[] {
  return getNodePortDefinitions(node.type).map((port) => ({
    id: `${node.id}:${port.id}`,
    nodeId: node.id,
    direction: port.direction,
    kind: port.kind
  }));
}