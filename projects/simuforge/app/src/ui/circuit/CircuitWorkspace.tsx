import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background,
  ConnectionMode,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useStore,
  type Connection,
  type EdgeChange,
  type Node as FlowNode,
  type NodeChange,
  type NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStudioStore } from '../hooks/useStore.js';
import type { StudioStore } from '../../editor/store.js';
import {
  selectEntities,
  selectRuntimeElectrical,
  selectRuntimeStatus,
  selectSelectedEntityId
} from '../../editor/selectors.js';
import { emptyElectricalOverrides, solveElectricalCircuit } from '../../runtime/electrical.js';
import { ELECTRICAL_COMPONENT_TYPES, componentLabel, createComponent } from '../../world/components.js';
import { Button } from '../common/Button.js';
import { CircuitNode } from './CircuitNode.js';
import {
  parseCircuitNodeId,
  toCircuitEdges,
  toCircuitNodes,
  type CircuitFlowNode
} from './adapter.js';

const nodeTypes = { circuitComponent: CircuitNode } satisfies NodeTypes;

function FitViewOnNodes({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);

  useEffect(() => {
    if (nodeCount === 0 || width === 0 || height === 0) return;
    const handle = window.setTimeout(() => {
      void fitView({ padding: 0.25, duration: 0 });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [fitView, nodeCount, width, height]);

  return null;
}

function addElectricalComponent(store: StudioStore, type: string): void {
  let entityId = store.getSnapshot().editor.selectedEntityId;
  if (!entityId) {
    const count = store.getSnapshot().project.world.entities.length;
    store.dispatch({
      type: 'entity/create',
      entityType: 'cube',
      position: { x: (count % 4) * 2, y: 0.5, z: 0 }
    });
    entityId = store.getSnapshot().editor.selectedEntityId;
    if (!entityId) {
      return;
    }
    store.dispatch({ type: 'entity/rename', id: entityId, name: componentLabel(type) });
  }

  const component = createComponent(type, crypto.randomUUID());
  if (!component) {
    return;
  }
  store.dispatch({ type: 'component/add', entityId, component });
}

function CircuitPalette({ store, locked }: { store: StudioStore; locked: boolean }) {
  return (
    <div className="sf-circuit-palette" data-testid="circuit-palette">
      <span className="sf-circuit-palette-label">Add component</span>
      {ELECTRICAL_COMPONENT_TYPES.map((type) => (
        <Button
          key={type}
          variant="secondary"
          size="sm"
          disabled={locked}
          data-testid={`circuit-add-${type}`}
          title={
            locked
              ? 'Stop the simulation to edit the circuit.'
              : 'Adds to the selected object, or creates a new circuit object.'
          }
          onClick={() => addElectricalComponent(store, type)}
        >
          {componentLabel(type)}
        </Button>
      ))}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  idle: 'No circuit',
  solved: 'Solved',
  invalid: 'Invalid circuit',
  failed: 'Solver failure',
  empty: 'No circuit'
};

interface CircuitWorkspaceProps {
  store: StudioStore;
}

export function CircuitWorkspace({ store }: CircuitWorkspaceProps) {
  const entities = useStudioStore(store, selectEntities);
  const electrical = useStudioStore(store, (state) => state.project.electrical ?? null);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  const runtimeElectrical = useStudioStore(store, selectRuntimeElectrical);
  const selectedEntityId = useStudioStore(store, selectSelectedEntityId);

  const locked = runtimeStatus !== 'editing';
  const solution = runtimeElectrical.solution;

  const nodes = useMemo(
    () => toCircuitNodes(entities, electrical, solution, selectedEntityId, locked),
    [entities, electrical, solution, selectedEntityId, locked]
  );
  const edges = useMemo(() => toCircuitEdges(electrical, nodes), [electrical, nodes]);

  const [flowNodes, setFlowNodes, onNodesChangeBase] = useNodesState<CircuitFlowNode>(nodes);
  const [flowEdges, setFlowEdges, onEdgesChangeBase] = useEdgesState(edges);
  const flowNodesRef = useRef(flowNodes);
  flowNodesRef.current = flowNodes;

  useEffect(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [nodes, edges, setFlowNodes, setFlowEdges]);

  const overview = useMemo(() => {
    if (runtimeStatus === 'editing') {
      const outcome = solveElectricalCircuit(entities, electrical, emptyElectricalOverrides());
      return {
        status: outcome.status,
        diagnostics: outcome.diagnostics,
        nets: outcome.status === 'solved' ? outcome.solution.nets.length : 0,
        branches: outcome.status === 'solved' ? outcome.solution.branches.length : 0
      };
    }
    return {
      status: runtimeElectrical.status,
      diagnostics: runtimeElectrical.diagnostics,
      nets: runtimeElectrical.solution?.nets.length ?? 0,
      branches: runtimeElectrical.solution?.branches.length ?? 0
    };
  }, [runtimeStatus, entities, electrical, runtimeElectrical]);

  const onNodesChange = useCallback(
    (changes: NodeChange<CircuitFlowNode>[]) => {
      onNodesChangeBase(changes);
      if (locked) return;
      for (const change of changes) {
        if (change.type !== 'remove') continue;
        const parsed = parseCircuitNodeId(change.id);
        if (parsed) {
          store.dispatch({
            type: 'component/remove',
            entityId: parsed.entityId,
            componentId: parsed.componentId
          });
        }
      }
    },
    [locked, onNodesChangeBase, store]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChangeBase(changes);
      if (locked) return;
      for (const change of changes) {
        if (change.type !== 'remove') continue;
        store.dispatch({ type: 'electrical/remove-wire', wireId: change.id });
      }
    },
    [locked, onEdgesChangeBase, store]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (locked) return;
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        return;
      }
      const source = parseCircuitNodeId(connection.source);
      const target = parseCircuitNodeId(connection.target);
      if (!source || !target) return;

      store.dispatch({
        type: 'electrical/add-wire',
        wire: {
          id: crypto.randomUUID(),
          from: {
            entityId: source.entityId,
            componentId: source.componentId,
            terminalId: connection.sourceHandle
          },
          to: {
            entityId: target.entityId,
            componentId: target.componentId,
            terminalId: connection.targetHandle
          }
        }
      });
    },
    [locked, store]
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, node: FlowNode) => {
      if (locked) return;
      const layout: { entityId: string; componentId: string; x: number; y: number }[] = [];
      for (const item of flowNodesRef.current) {
        const parsed = parseCircuitNodeId(item.id);
        if (!parsed) continue;
        const position = item.id === node.id ? node.position : item.position;
        layout.push({
          entityId: parsed.entityId,
          componentId: parsed.componentId,
          x: position.x,
          y: position.y
        });
      }
      store.dispatch({ type: 'electrical/set-layout', layout });
    },
    [locked, store]
  );

  const isEmpty = nodes.length === 0;
  const diagnostics = overview.diagnostics;

  return (
    <div className="sf-circuit-workspace">
      <CircuitPalette store={store} locked={locked} />
      {locked ? (
        <div className="sf-circuit-lock" role="status" data-testid="circuit-lock-banner">
          Circuit editing is locked while the simulation is running or paused.
        </div>
      ) : null}
      <div className="sf-circuit-editor">
        <div className="sf-circuit-status" data-testid="circuit-status">
          <span className={`sf-circuit-status-chip sf-circuit-status-${overview.status}`}>
            {STATUS_LABEL[overview.status] ?? overview.status}
          </span>
          <span className="sf-circuit-status-detail">
            {overview.nets} net(s) · {overview.branches} branch(es)
          </span>
          {runtimeElectrical.lastSolveMs > 0 ? (
            <span className="sf-circuit-status-detail">{runtimeElectrical.lastSolveMs.toFixed(1)} ms</span>
          ) : null}
        </div>
        <div className="sf-circuit-canvas">
          {isEmpty ? (
            <div className="sf-circuit-empty" data-testid="circuit-empty">
              No electrical components yet. Add a voltage source, resistor, switch, or ground from the palette.
            </div>
          ) : null}
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              const parsed = parseCircuitNodeId(node.id);
              if (parsed) {
                store.dispatch({ type: 'selection/set', id: parsed.entityId });
              }
            }}
            onPaneClick={() => store.dispatch({ type: 'selection/set', id: null })}
            nodesDraggable={!locked}
            nodesConnectable={!locked}
            nodesFocusable={!locked}
            edgesFocusable={!locked}
            deleteKeyCode={locked ? null : ['Delete', 'Backspace']}
            connectionMode={ConnectionMode.Loose}
            panOnDrag={[1, 2]}
            autoPanOnNodeDrag={false}
            minZoom={0.2}
            fitView
          >
            <Controls />
            <Background />
            <FitViewOnNodes nodeCount={flowNodes.length} />
          </ReactFlow>
        </div>
        {diagnostics.length > 0 ? (
          <div className="sf-circuit-diagnostics" role="status" data-testid="circuit-diagnostics">
            {diagnostics.slice(0, 6).map((diagnostic, index) => (
              <div
                key={`${diagnostic.code}-${index}`}
                className={`sf-circuit-diagnostic sf-circuit-diagnostic-${diagnostic.severity}`}
              >
                [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
