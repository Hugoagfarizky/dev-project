import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAPH_DIAGNOSTIC_CODES,
  validateGraph
} from '../../src/graph/validation.ts';
import {
  serializeGraphDocument,
  parseGraphDocument
} from '../../src/graph/serialization.ts';
import type { Graph, GraphValidationContext } from '../../src/graph/types.ts';

const context: GraphValidationContext = {
  entities: [
    {
      id: 'ball-1',
      components: [{ type: 'rigidBody', enabled: true, collider: { kind: 'sphere' } }]
    },
    {
      id: 'floor-1',
      components: [{ type: 'rigidBody', enabled: true, collider: { kind: 'plane' } }]
    }
  ]
};

function graph(overrides: Partial<Graph> = {}): Graph {
  return {
    id: 'graph-1',
    name: 'Test Graph',
    nodes: [],
    edges: [],
    ...overrides
  };
}

function node(id: string, type: any, config: any) {
  return { id, type, config };
}

function edge(id: string, sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) {
  return { id, sourceNodeId, sourcePortId, targetNodeId, targetPortId };
}

test('valid empty graph passes', () => {
  const result = validateGraph(graph(), context);
  assert.equal(result.valid, true);
  assert.equal(result.diagnostics.length, 0);
});

test('duplicate node ids are reported', () => {
  const result = validateGraph(graph({
    nodes: [node('a', 'onStart', { kind: 'onStart' }), node('a', 'manualTrigger', { kind: 'manualTrigger' })]
  }), context);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.DUPLICATE_NODE_ID));
});

test('unsupported node type is reported', () => {
  const result = validateGraph(graph({
    nodes: [node('a', 'unknown', { kind: 'unknown' }) as any]
  }), context);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.UNSUPPORTED_NODE_TYPE));
});

test('applyForce requires finite vector and valid dynamic target', () => {
  const valid = validateGraph(graph({
    nodes: [node('a', 'applyForce', { kind: 'applyForce', targetEntityId: 'ball-1', force: { x: 1, y: 2, z: 3 } })]
  }), context);
  assert.equal(valid.valid, true);

  const invalidVector = validateGraph(graph({
    nodes: [node('a', 'applyForce', { kind: 'applyForce', targetEntityId: 'ball-1', force: { x: NaN, y: 0, z: 0 } })]
  }), context);
  assert.equal(invalidVector.valid, false);
  assert.ok(invalidVector.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.NON_FINITE_NUMBER));

  const staticTarget = validateGraph(graph({
    nodes: [node('a', 'applyForce', { kind: 'applyForce', targetEntityId: 'floor-1', force: { x: 0, y: 1, z: 0 } })]
  }), context);
  assert.equal(staticTarget.valid, false);
  assert.ok(staticTarget.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_ENTITY));
});

test('applyImpulse and clearForce require valid dynamic targets', () => {
  const impulse = validateGraph(graph({
    nodes: [node('a', 'applyImpulse', { kind: 'applyImpulse', targetEntityId: 'ball-1', impulse: { x: 0, y: 10, z: 0 } })]
  }), context);
  assert.equal(impulse.valid, true);

  const clear = validateGraph(graph({
    nodes: [node('a', 'clearForce', { kind: 'clearForce', targetEntityId: 'ball-1' })]
  }), context);
  assert.equal(clear.valid, true);
});

test('onPlaneContact requires a rigid body target', () => {
  const result = validateGraph(graph({
    nodes: [node('a', 'onPlaneContact', { kind: 'onPlaneContact', targetEntityId: 'missing' })]
  }), context);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_ENTITY));
});

test('valid connection passes and invalid endpoints fail', () => {
  const valid = validateGraph(graph({
    nodes: [
      node('a', 'onStart', { kind: 'onStart' }),
      node('b', 'applyForce', { kind: 'applyForce', targetEntityId: 'ball-1', force: { x: 0, y: 1, z: 0 } })
    ],
    edges: [edge('e1', 'a', 'out', 'b', 'in')]
  }), context);
  assert.equal(valid.valid, true);

  const missingNode = validateGraph(graph({
    nodes: [node('a', 'onStart', { kind: 'onStart' })],
    edges: [edge('e1', 'a', 'out', 'missing', 'in')]
  }), context);
  assert.equal(missingNode.valid, false);
  assert.ok(missingNode.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.MISSING_TARGET_NODE));

  const wrongDirection = validateGraph(graph({
    nodes: [
      node('a', 'onStart', { kind: 'onStart' }),
      node('b', 'applyForce', { kind: 'applyForce', targetEntityId: 'ball-1', force: { x: 0, y: 1, z: 0 } })
    ],
    edges: [edge('e1', 'a', 'out', 'b', 'out')]
  }), context);
  assert.equal(wrongDirection.valid, false);
  assert.ok(wrongDirection.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.PORT_DIRECTION_MISMATCH));
});

test('duplicate connections are reported', () => {
  const result = validateGraph(graph({
    nodes: [
      node('a', 'onStart', { kind: 'onStart' }),
      node('b', 'applyForce', { kind: 'applyForce', targetEntityId: 'ball-1', force: { x: 0, y: 1, z: 0 } })
    ],
    edges: [
      edge('e1', 'a', 'out', 'b', 'in'),
      edge('e2', 'a', 'out', 'b', 'in')
    ]
  }), context);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.DUPLICATE_CONNECTION));
});

test('cycles are rejected', () => {
  const result = validateGraph(graph({
    nodes: [
      node('a', 'applyForce', { kind: 'applyForce', targetEntityId: 'ball-1', force: { x: 0, y: 1, z: 0 } }),
      node('b', 'applyImpulse', { kind: 'applyImpulse', targetEntityId: 'ball-1', impulse: { x: 0, y: 1, z: 0 } })
    ],
    edges: [
      edge('e1', 'a', 'out', 'b', 'in'),
      edge('e2', 'b', 'out', 'a', 'in')
    ]
  }), context);
  assert.equal(result.valid, false);
  assert.ok(result.diagnostics.some((d) => d.code === GRAPH_DIAGNOSTIC_CODES.UNSUPPORTED_CYCLE));
});

test('serialization round trips a valid graph', () => {
  const input = graph({
    nodes: [node('a', 'onStart', { kind: 'onStart' })],
    edges: []
  });
  const text = serializeGraphDocument(input);
  const parsed = parseGraphDocument(text);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.value?.graph, input);
});

test('serialization rejects malformed JSON', () => {
  const parsed = parseGraphDocument('{not json');
  assert.equal(parsed.ok, false);
  assert.equal(parsed.error?.code, 'GRAPH_PARSE_ERROR');
});

test('validation does not mutate input', () => {
  const input = graph({
    nodes: [node('a', 'onStart', { kind: 'onStart' })]
  });
  const before = JSON.stringify(input);
  validateGraph(input, context);
  assert.equal(JSON.stringify(input), before);
});