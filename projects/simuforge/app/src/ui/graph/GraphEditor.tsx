import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Connection,
  type EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStudioStore } from '../hooks/useStore.js';
import { selectGraph } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import { toReactFlowNodes, toReactFlowEdges, applyNodePosition } from '../../graph/adapter.js';
import { validateGraph } from '../../graph/validation.js';
import type { GraphDiagnostic } from '../../graph/types.js';
import { GraphNodeRenderer } from './GraphNodeRenderer.js';

const nodeTypes = { default: GraphNodeRenderer } as any;

interface GraphEditorProps {
  store: StudioStore;
}

export function GraphEditor({ store }: GraphEditorProps) {
  const graph = useStudioStore(store, selectGraph);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(
    toReactFlowNodes(graph, []).map((node) => ({
      ...node,
      data: { ...node.data, store, onSelect: (id: string) => store.dispatch({ type: 'graph/select-node', nodeId: id }) }
    }))
  );
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(toReactFlowEdges(graph));
  const [diagnostics, setDiagnostics] = useState<GraphDiagnostic[]>([]);

  const onSelectionChange = useCallback(({ nodes }: { nodes: { id: string }[] }) => {
    store.dispatch({ type: 'graph/select-node', nodeId: nodes.length === 1 ? nodes[0]?.id ?? null : null });
  }, [store]);

  useEffect(() => {
    const result = graph ? validateGraph(graph, { entities: [] }) : { valid: true, diagnostics: [] };
    setDiagnostics(result.diagnostics);
    setNodes(
      toReactFlowNodes(graph, result.diagnostics).map((node) => ({
        ...node,
        data: { ...node.data, store, onSelect: (id: string) => store.dispatch({ type: 'graph/select-node', nodeId: id }) }
      }))
    );
    setEdges(toReactFlowEdges(graph));
  }, [graph, setNodes, setEdges]);

  const onNodesChange = useCallback((changes: any) => {
    onNodesChangeBase(changes);
    for (const change of changes) {
      if (change.type === 'position' && change.position && graph) {
        const nextGraph = applyNodePosition(graph, change.id, change.position);
        store.dispatch({ type: 'graph/set', graph: nextGraph });
      }
    }
  }, [graph, onNodesChangeBase, store]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChangeBase(changes);
    if (!graph) return;
    let nextGraph = graph;
    for (const change of changes) {
      if (change.type === 'remove') {
        nextGraph = {
          ...nextGraph,
          edges: nextGraph.edges.filter((edge) => edge.id !== change.id)
        };
      }
    }
    if (nextGraph !== graph) {
      store.dispatch({ type: 'graph/set', graph: nextGraph });
    }
  }, [graph, onEdgesChangeBase, store]);

  const onConnect = useCallback((connection: Connection) => {
    if (!graph || !connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
      return;
    }
    const edgeId = `edge-${graph.edges.length + 1}`;
    const nextGraph = {
      ...graph,
      edges: [
        ...graph.edges,
        {
          id: edgeId,
          sourceNodeId: connection.source,
          sourcePortId: connection.sourceHandle,
          targetNodeId: connection.target,
          targetPortId: connection.targetHandle
        }
      ]
    };
    const result = validateGraph(nextGraph, { entities: [] });
    if (result.valid) {
      store.dispatch({ type: 'graph/set', graph: nextGraph });
    } else {
      setDiagnostics(result.diagnostics);
    }
  }, [graph, store]);

  const isEmpty = !graph || graph.nodes.length === 0;

  return (
    <div className="sf-graph-editor" style={{ width: '100%', height: 420 }}>
      {isEmpty ? (
        <div className="sf-graph-empty">Empty graph. Add a node from the palette.</div>
      ) : null}
      <button
        type="button"
        data-testid="select-first-graph-node"
        onClick={() => {
          const first = graph?.nodes[0];
          if (first) store.dispatch({ type: 'graph/select-node', nodeId: first.id });
        }}
      >
        Select Node
      </button>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeClick={(_, node) => {
          console.log('NODE_CLICK', node.id);
          store.dispatch({ type: 'graph/select-node', nodeId: node.id });
        }}
        onPaneClick={() => store.dispatch({ type: 'graph/select-node', nodeId: null })}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
      {diagnostics.length > 0 ? (
        <div className="sf-graph-diagnostics" role="status">
          {diagnostics.map((diagnostic, index) => (
            <div key={index} className={`sf-graph-diagnostic sf-graph-diagnostic-${diagnostic.severity}`}>
              {diagnostic.code}: {diagnostic.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}