import type { Edge, Node } from '@xyflow/react';
import type { ElectricalDocument } from '../../electrical/types.ts';
import type { CircuitSolution, ComponentSolutionStatus } from '../../electrical/solver.ts';
import type { ElectricalComponent, WorldEntity } from '../../world/types.ts';
import { componentLabel, isElectricalComponent } from '../../world/components.ts';

/**
 * Presentation adapter between the canonical electrical document and React
 * Flow. React Flow node/edge objects are derived on demand and never stored as
 * canonical state (D-P08-02).
 */

export interface CircuitNodeData extends Record<string, unknown> {
  entityId: string;
  componentId: string;
  component: ElectricalComponent;
  label: string;
  status: ComponentSolutionStatus | null;
  voltage: number | null;
  current: number | null;
  power: number | null;
  /** Runtime edit lock: no dragging, wiring, or deletion. */
  locked: boolean;
}

export type CircuitFlowNode = Node<CircuitNodeData>;
export type CircuitFlowEdge = Edge;

const DEFAULT_COLUMNS = 3;
const DEFAULT_X = 90;
const DEFAULT_Y = 70;
const DEFAULT_X_GAP = 230;
const DEFAULT_Y_GAP = 150;

export function circuitNodeId(entityId: string, componentId: string): string {
  return `${entityId}/${componentId}`;
}

export function parseCircuitNodeId(id: string): { entityId: string; componentId: string } | null {
  const separator = id.indexOf('/');
  if (separator <= 0 || separator === id.length - 1) {
    return null;
  }
  return { entityId: id.slice(0, separator), componentId: id.slice(separator + 1) };
}

function compareIds(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function toCircuitNodes(
  entities: readonly WorldEntity[],
  electrical: ElectricalDocument | null | undefined,
  solution: CircuitSolution | null,
  selectedEntityId: string | null,
  locked: boolean
): CircuitFlowNode[] {
  const layout = new Map<string, { x: number; y: number }>();
  for (const entry of electrical?.layout ?? []) {
    layout.set(circuitNodeId(entry.entityId, entry.componentId), { x: entry.x, y: entry.y });
  }

  const results = new Map<string, CircuitSolution['components'][number]>();
  for (const result of solution?.components ?? []) {
    results.set(circuitNodeId(result.entityId, result.componentId), result);
  }

  const nodes: CircuitFlowNode[] = [];
  let index = 0;

  for (const entity of entities.slice().sort((a, b) => compareIds(a.id, b.id))) {
    const components = (entity.components ?? [])
      .filter(isElectricalComponent)
      .slice()
      .sort((a, b) => compareIds(a.id, b.id));

    for (const component of components) {
      const id = circuitNodeId(entity.id, component.id);
      const position =
        layout.get(id) ?? {
          x: DEFAULT_X + (index % DEFAULT_COLUMNS) * DEFAULT_X_GAP,
          y: DEFAULT_Y + Math.floor(index / DEFAULT_COLUMNS) * DEFAULT_Y_GAP
        };
      const result = results.get(id) ?? null;

      nodes.push({
        id,
        type: 'circuitComponent',
        position,
        selected: selectedEntityId === entity.id,
        data: {
          entityId: entity.id,
          componentId: component.id,
          component,
          label: componentLabel(component.type),
          status: result?.status ?? null,
          voltage: result?.voltage ?? null,
          current: result?.current ?? null,
          power: result?.power ?? null,
          locked
        }
      });
      index += 1;
    }
  }

  return nodes;
}

export function toCircuitEdges(
  electrical: ElectricalDocument | null | undefined,
  nodes: readonly CircuitFlowNode[]
): CircuitFlowEdge[] {
  if (!electrical) {
    return [];
  }

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges: CircuitFlowEdge[] = [];

  for (const wire of electrical.wires) {
    const source = circuitNodeId(wire.from.entityId, wire.from.componentId);
    const target = circuitNodeId(wire.to.entityId, wire.to.componentId);
    if (!nodeIds.has(source) || !nodeIds.has(target)) {
      continue;
    }
    edges.push({
      id: wire.id,
      source,
      target,
      sourceHandle: wire.from.terminalId,
      targetHandle: wire.to.terminalId
    });
  }

  return edges;
}
