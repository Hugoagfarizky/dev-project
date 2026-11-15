import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  type Connection,
  type EdgeChange,
  type Node as FlowNode,
  type NodeTypes
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useStudioStore } from '../hooks/useStore.js';
import {
  selectEntities,
  selectExecutingGraphNodeId,
  selectExecutionSequence,
  selectGraph,
  selectRuntimeExecution,
  selectRuntimeStatus,
  selectSelectedGraphNodeId
} from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { RuntimeExecutionState } from '../../editor/state.js';
import { toReactFlowNodes, toReactFlowEdges, applyNodePosition } from '../../graph/adapter.js';
import { GRAPH_DIAGNOSTIC_CODES, validateGraph } from '../../graph/validation.js';
import { selectTriggerNodes } from '../../runtime/graphExecution.js';
import type { GraphDiagnostic, GraphValidationContext } from '../../graph/types.js';
import { GraphNodeRenderer } from './GraphNodeRenderer.js';
import { Button } from '../common/Button.js';

const nodeTypes = { default: GraphNodeRenderer } satisfies NodeTypes;

function describeExecution(execution: RuntimeExecutionState): string {
  const queued = execution.queue.length > 0 ? ` · ${execution.queue.length} queued` : '';
  if (execution.status === 'suspended') {
    return `Execution: suspended${queued}`;
  }
  if (execution.status === 'executing') {
    return `Execution: executing${queued}`;
  }

  const result = execution.lastResult;
  if (!result) {
    return `Execution: ${execution.status}${queued}`;
  }

  switch (result.outcome) {
    case 'completed':
      return `Execution: completed · ${result.nodeCount} node(s)${queued}`;
    case 'failed':
      return `Execution: failed · ${result.failedNodeId ?? 'node'}${result.code ? ` · ${result.code}` : ''}${queued}`;
    case 'skipped':
      return `Execution: skipped${result.message ? ` · ${result.message}` : ''}${queued}`;
    case 'cancelled':
      return `Execution: cancelled${result.message ? ` · ${result.message}` : ''}${queued}`;
  }
}

function FitViewOnNodeCount({ nodeCount }: { nodeCount: number }) {
  const { fitView } = useReactFlow();
  const width = useStore((state) => state.width);
  const height = useStore((state) => state.height);

  useEffect(() => {
    if (nodeCount === 0 || width === 0 || height === 0) return;
    const handle = window.setTimeout(() => {
      void fitView({ padding: 0.2, duration: 0 });
    }, 0);
    return () => window.clearTimeout(handle);
  }, [fitView, nodeCount, width, height]);

  return null;
}

interface GraphEditorProps {
  store: StudioStore;
}

export function GraphEditor({ store }: GraphEditorProps) {
  const graph = useStudioStore(store, selectGraph);
  const selectedGraphNodeId = useStudioStore(store, selectSelectedGraphNodeId);
  const entities = useStudioStore(store, selectEntities);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  const execution = useStudioStore(store, selectRuntimeExecution);
  const executingGraphNodeId = useStudioStore(store, selectExecutingGraphNodeId);
  const executionSequence = useStudioStore(store, selectExecutionSequence);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const selectedGraphNodeIdRef = useRef(selectedGraphNodeId);
  selectedGraphNodeIdRef.current = selectedGraphNodeId;

  const manualTriggers = useMemo(
    () => (graph ? selectTriggerNodes(graph, 'manualTrigger') : []),
    [graph]
  );
  const selectedIsManualTrigger = selectedGraphNodeId !== null && manualTriggers.some(
    (node) => node.id === selectedGraphNodeId
  );
  const manualTriggerDisabled = runtimeStatus === 'editing' || manualTriggers.length === 0;

  // D-M2C-09: transient highlight only. The class is applied to the rendered
  // node for a short pulse and removed on timeout or cleanup; it never enters
  // the canonical graph.
  useEffect(() => {
    const container = editorRef.current;
    if (!container || !executingGraphNodeId) {
      return;
    }
    const wrapper = Array.from(container.querySelectorAll<HTMLElement>('.react-flow__node')).find(
      (element) => element.getAttribute('data-id') === executingGraphNodeId
    );
    const node = wrapper?.querySelector<HTMLElement>('.sf-graph-node');
    if (!node) {
      return;
    }
    node.classList.add('sf-graph-node-executing');
    const timer = window.setTimeout(() => {
      node.classList.remove('sf-graph-node-executing');
    }, 700);
    return () => {
      window.clearTimeout(timer);
      node.classList.remove('sf-graph-node-executing');
    };
  }, [executionSequence, executingGraphNodeId]);

  const validationContext = useMemo<GraphValidationContext>(() => ({
    entities: entities.map((entity) => ({
      id: entity.id,
      components: entity.components ?? []
    }))
  }), [entities]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(
    toReactFlowNodes(graph, [], selectedGraphNodeId).map((node) => ({
      ...node,
      data: { ...node.data, store }
    }))
  );
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(toReactFlowEdges(graph));
  const [diagnostics, setDiagnostics] = useState<GraphDiagnostic[]>([]);

  const onSelectionChange = useCallback(({ nodes }: { nodes: { id: string }[] }) => {
    store.dispatch({ type: 'graph/select-node', nodeId: nodes.length === 1 ? nodes[0]?.id ?? null : null });
  }, [store]);

  useEffect(() => {
    const result = graph ? validateGraph(graph, validationContext) : { valid: true, diagnostics: [] };
    setDiagnostics(result.diagnostics);
    setNodes(
      toReactFlowNodes(graph, result.diagnostics, selectedGraphNodeIdRef.current).map((node) => ({
        ...node,
        data: { ...node.data, store }
      }))
    );
    setEdges(toReactFlowEdges(graph));
    // Selection is transient editor state: it must not rebuild node identity while
    // React Flow is dragging, so the selected id is read from a ref instead of
    // being an effect dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, validationContext, setNodes, setEdges]);

  const onNodesChange = useCallback((changes: Parameters<typeof onNodesChangeBase>[0]) => {
    onNodesChangeBase(changes);
    if (!graph) return;

    const removedNodeIds = new Set<string>();
    for (const change of changes) {
      if (change.type === 'remove') {
        removedNodeIds.add(change.id);
      }
    }

    if (removedNodeIds.size === 0) return;

    const nextGraph = {
      ...graph,
      nodes: graph.nodes.filter((node) => !removedNodeIds.has(node.id)),
      edges: graph.edges.filter(
        (edge) => !removedNodeIds.has(edge.sourceNodeId) && !removedNodeIds.has(edge.targetNodeId)
      )
    };
    if (selectedGraphNodeId && removedNodeIds.has(selectedGraphNodeId)) {
      store.dispatch({ type: 'graph/select-node', nodeId: null });
    }
    store.dispatch({ type: 'graph/set', graph: nextGraph });
  }, [graph, onNodesChangeBase, selectedGraphNodeId, store]);

  const onNodeDragStop = useCallback((_: unknown, node: FlowNode) => {
    if (!graph) return;
    store.dispatch({ type: 'graph/set', graph: applyNodePosition(graph, node.id, node.position) });
  }, [graph, store]);

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

    const edge = {
      id: `edge-${crypto.randomUUID()}`,
      sourceNodeId: connection.source,
      sourcePortId: connection.sourceHandle,
      targetNodeId: connection.target,
      targetPortId: connection.targetHandle
    };
    const nextGraph = { ...graph, edges: [...graph.edges, edge] };

    // Reuse canonical validation. Node configuration errors elsewhere in the graph
    // must not block a structurally valid connection, so only diagnostics that
    // belong to the new edge (or the graph-level cycle check) reject it.
    const result = validateGraph(nextGraph, validationContext);
    const connectionDiagnostics = result.diagnostics.filter(
      (diagnostic) =>
        diagnostic.edgeId === edge.id ||
        diagnostic.code === GRAPH_DIAGNOSTIC_CODES.UNSUPPORTED_CYCLE
    );

    if (connectionDiagnostics.length > 0) {
      setDiagnostics(connectionDiagnostics);
      return;
    }

    store.dispatch({ type: 'graph/set', graph: nextGraph });
  }, [graph, store, validationContext]);

  const isEmpty = !graph || graph.nodes.length === 0;

  return (
    <div className="sf-graph-editor" ref={editorRef}>
      <div className="sf-graph-execution-bar">
        <span
          className="sf-graph-execution-status"
          role="status"
          data-testid="graph-execution-status"
          title={describeExecution(execution)}
        >
          {describeExecution(execution)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          data-testid="graph-manual-trigger"
          disabled={manualTriggerDisabled}
          title={
            manualTriggers.length === 0
              ? 'Add a Manual Trigger node to enable this control.'
              : 'Queue a Manual Trigger execution.'
          }
          onClick={() => {
            store.dispatch({
              type: 'runtime/graph-trigger',
              ...(selectedIsManualTrigger && selectedGraphNodeId
                ? { triggerNodeId: selectedGraphNodeId }
                : {})
            });
          }}
        >
          Manual Trigger
        </Button>
      </div>
      <div className="sf-graph-canvas">
        {isEmpty ? (
          <div className="sf-graph-empty">Empty graph. Add a node from the palette.</div>
        ) : null}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onNodeClick={(_, node) => {
            store.dispatch({ type: 'graph/select-node', nodeId: node.id });
          }}
          onPaneClick={() => store.dispatch({ type: 'graph/select-node', nodeId: null })}
          deleteKeyCode={['Delete', 'Backspace']}
          panOnDrag={[1, 2]}
          autoPanOnNodeDrag={false}
          minZoom={0.2}
          fitView
        >
          <Controls />
          <Background />
          <FitViewOnNodeCount nodeCount={nodes.length} />
        </ReactFlow>
      </div>
      {diagnostics.length > 0 ? (
        <div className="sf-graph-diagnostics" role="status">
          {diagnostics.map((diagnostic, index) => (
            <div key={index} className={`sf-graph-diagnostic sf-graph-diagnostic-${diagnostic.severity}`}>
              [{diagnostic.severity}] {diagnostic.code}: {diagnostic.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
