import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toReactFlowNodes,
  toReactFlowEdges,
  applyNodePosition,
  createCanonicalNode
} from '../../src/graph/adapter.ts';
import { serializeGraphDocument, parseGraphDocument } from '../../src/graph/serialization.ts';
import type { Graph, GraphNodeType } from '../../src/graph/types.ts';

function sampleGraph(): Graph {
  return {
    id: 'graph-1',
    name: 'Test Graph',
    nodes: [
      {
        id: 'node-start',
        type: 'onStart',
        position: { x: 10, y: 20 },
        config: { kind: 'onStart' }
      },
      {
        id: 'node-force',
        type: 'applyForce',
        position: { x: 200, y: 120 },
        config: {
          kind: 'applyForce',
          targetEntityId: 'ball-1',
          force: { x: 1, y: 2, z: 3 }
        }
      }
    ],
    edges: [
      {
        id: 'edge-1',
        sourceNodeId: 'node-start',
        sourcePortId: 'out',
        targetNodeId: 'node-force',
        targetPortId: 'in'
      }
    ]
  };
}

test('canonical nodes map to editor nodes with stable IDs and configuration', () => {
  const graph = sampleGraph();
  const nodes = toReactFlowNodes(graph);

  assert.equal(nodes.length, 2);
  assert.deepEqual(nodes.map((node) => node.id), ['node-start', 'node-force']);
  assert.deepEqual(nodes[0].position, { x: 10, y: 20 });
  assert.deepEqual(nodes[1].position, { x: 200, y: 120 });
  assert.equal(nodes[1].data.node.type, 'applyForce');
  assert.deepEqual(nodes[1].data.node.config, graph.nodes[1].config);
});

test('canonical edges map to editor edges with stable IDs and port handles', () => {
  const edges = toReactFlowEdges(sampleGraph());

  assert.equal(edges.length, 1);
  assert.deepEqual(
    {
      id: edges[0].id,
      source: edges[0].source,
      sourceHandle: edges[0].sourceHandle,
      target: edges[0].target,
      targetHandle: edges[0].targetHandle
    },
    {
      id: 'edge-1',
      source: 'node-start',
      sourceHandle: 'out',
      target: 'node-force',
      targetHandle: 'in'
    }
  );
});

test('selection state is editor-only and does not mutate the canonical graph', () => {
  const graph = sampleGraph();
  const before = JSON.stringify(graph);

  const nodes = toReactFlowNodes(graph, [], 'node-force');

  assert.equal(nodes[0].selected, false);
  assert.equal(nodes[1].selected, true);
  assert.equal(JSON.stringify(graph), before);
  assert.ok(!Object.prototype.hasOwnProperty.call(graph.nodes[0], 'selected'));
});

test('moving a node round-trips position without losing canonical information', () => {
  const graph = sampleGraph();
  const editorNodes = toReactFlowNodes(graph, [], 'node-force');
  const moved = applyNodePosition(graph, editorNodes[1].id, { x: 320, y: 240 });

  assert.deepEqual(moved.nodes[1].position, { x: 320, y: 240 });
  assert.equal(moved.nodes[1].type, 'applyForce');
  assert.deepEqual(moved.nodes[1].config, graph.nodes[1].config);
  assert.deepEqual(moved.edges, graph.edges);
  assert.equal(moved.nodes[0].id, 'node-start');
  assert.notEqual(moved, graph);
  assert.deepEqual(graph.nodes[1].position, { x: 200, y: 120 });
});

test('editor-only metadata is not serialized as canonical graph data', () => {
  const graph = sampleGraph();
  const nodes = toReactFlowNodes(graph, [], 'node-force');
  const edges = toReactFlowEdges(graph);

  // Editor state exists only on the derived objects.
  assert.equal(nodes[1].selected, true);
  assert.equal(edges[0].type, 'default');

  const document = JSON.parse(serializeGraphDocument(graph)) as {
    format: string;
    schemaVersion: number;
    graph: Record<string, unknown>;
  };

  assert.equal(document.format, 'simuforge.graph');
  assert.equal(document.schemaVersion, 1);
  assert.deepEqual(Object.keys(document.graph).sort(), ['edges', 'id', 'name', 'nodes']);

  for (const node of document.graph.nodes as Record<string, unknown>[]) {
    assert.deepEqual(Object.keys(node).sort(), ['config', 'id', 'position', 'type']);
    assert.ok(!('selected' in node));
    assert.ok(!('data' in node));
    assert.ok(!('positionAbsolute' in node));
  }

  for (const edge of document.graph.edges as Record<string, unknown>[]) {
    assert.deepEqual(
      Object.keys(edge).sort(),
      ['id', 'sourceNodeId', 'sourcePortId', 'targetNodeId', 'targetPortId']
    );
    assert.ok(!('source' in edge));
    assert.ok(!('sourceHandle' in edge));
  }

  const serialized = serializeGraphDocument(graph);
  assert.ok(!serialized.includes('"selected"'));
  assert.ok(!serialized.includes('"viewport"'));
  assert.ok(!serialized.includes('"sourceHandle"'));
  assert.ok(!serialized.includes('"positionAbsolute"'));
});

test('serialization round-trips supported canonical information', () => {
  const graph: Graph = {
    id: 'graph-2',
    name: 'Trigger Graph',
    nodes: [
      { id: 'start', type: 'onStart', position: { x: 0, y: 0 }, config: { kind: 'onStart' } },
      { id: 'manual', type: 'manualTrigger', position: { x: 100, y: 0 }, config: { kind: 'manualTrigger' } }
    ],
    edges: []
  };

  const parsed = parseGraphDocument(serializeGraphDocument(graph));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value?.graph, graph);
});

test('createCanonicalNode creates all six approved node types with valid defaults', () => {
  const types: GraphNodeType[] = [
    'onStart',
    'manualTrigger',
    'onPlaneContact',
    'applyForce',
    'applyImpulse',
    'clearForce'
  ];

  for (const type of types) {
    const node = createCanonicalNode(type, `node-${type}`, { x: 5, y: 6 });
    assert.equal(node.id, `node-${type}`);
    assert.equal(node.type, type);
    assert.equal(node.config.kind, type);
    assert.deepEqual(node.position, { x: 5, y: 6 });
  }

  const force = createCanonicalNode('applyForce', 'force-1');
  assert.deepEqual(force.config, {
    kind: 'applyForce',
    targetEntityId: '',
    force: { x: 0, y: 0, z: 0 }
  });
});
