import { useStudioStore } from '../hooks/useStore.js';
import { selectGraph } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import { createCanonicalNode } from '../../graph/adapter.js';
import type { Graph, GraphNodeType } from '../../graph/types.js';
import { Button } from '../common/Button';

const NODE_TYPES: GraphNodeType[] = [
  'onStart',
  'manualTrigger',
  'onPlaneContact',
  'applyForce',
  'applyImpulse',
  'clearForce'
];

interface NodePaletteProps {
  store: StudioStore;
}

export function NodePalette({ store }: NodePaletteProps) {
  const graph = useStudioStore(store, selectGraph);

  function addNode(type: GraphNodeType) {
    const currentGraph: Graph = graph ?? {
      id: crypto.randomUUID(),
      name: 'Untitled Graph',
      nodes: [],
      edges: []
    };
    const nextGraph: Graph = {
      ...currentGraph,
      nodes: [
        ...currentGraph.nodes,
        createCanonicalNode(type, crypto.randomUUID(), {
          x: 80 + currentGraph.nodes.length * 40,
          y: 80 + currentGraph.nodes.length * 40
        })
      ]
    };
    store.dispatch({ type: 'graph/set', graph: nextGraph });
  }

  return (
    <div className="sf-graph-palette" aria-label="Node palette">
      {NODE_TYPES.map((type) => (
        <Button key={type} variant="secondary" size="sm" onClick={() => addNode(type)}>
          {type}
        </Button>
      ))}
    </div>
  );
}