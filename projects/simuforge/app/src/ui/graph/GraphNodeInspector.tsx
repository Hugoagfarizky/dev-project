import { useStudioStore } from '../hooks/useStore.js';
import { selectGraph, selectSelectedGraphNodeId } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import type { Graph, GraphNode } from '../../graph/types.js';

interface GraphNodeInspectorProps {
  store: StudioStore;
}

function updateNode(graph: Graph | null, nodeId: string, updater: (node: GraphNode) => GraphNode): Graph | null {
  if (!graph) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((node) => (node.id === nodeId ? updater(node) : node))
  };
}

export function GraphNodeInspector({ store }: GraphNodeInspectorProps) {
  const graph = useStudioStore(store, selectGraph) as Graph | null;
  const selectedId = useStudioStore(store, selectSelectedGraphNodeId);
  const node = graph?.nodes.find((item) => item.id === selectedId) ?? null;

  if (!node) {
    return <div className="sf-graph-inspector-empty">No graph node selected.</div>;
  }

  function setConfig(nextConfig: GraphNode['config']) {
    const nextGraph = updateNode(graph, node!.id, (current) => ({ ...current, config: nextConfig }));
    store.dispatch({ type: 'graph/set', graph: nextGraph });
  }

  return (
    <div className="sf-graph-inspector">
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Node</span>
        <span className="sf-inspector-value">{node.id}</span>
      </div>
      <div className="sf-inspector-row">
        <span className="sf-inspector-label">Type</span>
        <span className="sf-inspector-value">{node.type}</span>
      </div>

      {node.config.kind === 'onPlaneContact' ||
      node.config.kind === 'applyForce' ||
      node.config.kind === 'applyImpulse' ||
      node.config.kind === 'clearForce' ? (
        <label className="sf-inspector-row">
          <span className="sf-inspector-label">Target entity ID</span>
          <input
            type="text"
            value={node.config.targetEntityId}
            onChange={(event) =>
              setConfig({ ...node.config, targetEntityId: event.target.value } as GraphNode['config'])
            }
          />
        </label>
      ) : null}

      {node.config.kind === 'applyForce' ? (
        <>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <label key={axis} className="sf-inspector-row">
              <span className="sf-inspector-label">Force {axis.toUpperCase()}</span>
              <input
                type="number"
                value={(node.config as { force: { x: number; y: number; z: number } }).force[axis]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  const config = node.config as { kind: 'applyForce'; targetEntityId: string; force: { x: number; y: number; z: number } };
                  setConfig({
                    ...config,
                    force: { ...config.force, [axis]: Number.isFinite(value) ? value : 0 }
                  } as any);
                }}
              />
            </label>
          ))}
        </>
      ) : null}

      {node.config.kind === 'applyImpulse' ? (
        <>
          {(['x', 'y', 'z'] as const).map((axis) => (
            <label key={axis} className="sf-inspector-row">
              <span className="sf-inspector-label">Impulse {axis.toUpperCase()}</span>
              <input
                type="number"
                value={(node.config as { impulse: { x: number; y: number; z: number } }).impulse[axis]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  const config = node.config as { kind: 'applyImpulse'; targetEntityId: string; impulse: { x: number; y: number; z: number } };
                  setConfig({
                    ...config,
                    impulse: { ...config.impulse, [axis]: Number.isFinite(value) ? value : 0 }
                  } as any);
                }}
              />
            </label>
          ))}
        </>
      ) : null}
    </div>
  );
}