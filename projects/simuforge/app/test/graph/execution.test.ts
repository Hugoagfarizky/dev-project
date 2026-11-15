import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildExecutionPlan,
  evaluateExecutionReadiness,
  executeChain,
  matchContactTriggers,
  selectManualTriggerNode,
  selectTriggerNodes
} from '../../src/runtime/graphExecution.ts';
import { createRuntimeBodies } from '../../src/runtime/physics.ts';
import type { RuntimeBodies } from '../../src/runtime/types.ts';
import type { Graph, GraphNode, GraphValidationContext } from '../../src/graph/types.ts';
import type { Quat, RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_ID = 'ball-1';
const OTHER_BALL_ID = 'ball-2';
const FLOOR_ID = 'floor-1';

const IDENTITY_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };
const UNIT_SCALE: Vec3 = { x: 1, y: 1, z: 1 };

function rigidBody(overrides: Partial<RigidBodyComponent> = {}): RigidBodyComponent {
  return {
    id: 'rigid-1',
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: false,
    collider: { kind: 'sphere', size: 0.5 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...overrides
  };
}

function entity(
  id: string,
  type: WorldEntity['type'],
  position: Vec3,
  components: RigidBodyComponent[]
): WorldEntity {
  return {
    id,
    name: id,
    type,
    transform: {
      position: { ...position },
      rotation: { ...IDENTITY_ROTATION },
      scale: { ...UNIT_SCALE }
    },
    metadata: {},
    components
  };
}

function ball(id = BALL_ID, position: Vec3 = { x: 0, y: 2, z: 0 }): WorldEntity {
  return entity(id, 'sphere', position, [rigidBody()]);
}

function floor(id = FLOOR_ID): WorldEntity {
  return entity(id, 'plane', { x: 0, y: 0, z: 0 }, [
    rigidBody({ useGravity: false, collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } } })
  ]);
}

const context: GraphValidationContext = {
  entities: [
    { id: BALL_ID, components: [{ type: 'rigidBody', enabled: true, collider: { kind: 'sphere' } }] },
    { id: OTHER_BALL_ID, components: [{ type: 'rigidBody', enabled: true, collider: { kind: 'sphere' } }] },
    { id: FLOOR_ID, components: [{ type: 'rigidBody', enabled: true, collider: { kind: 'plane' } }] }
  ]
};

function node(id: string, type: GraphNode['type'], config: GraphNode['config']): GraphNode {
  return { id, type, config };
}

function edge(id: string, sourceNodeId: string, targetNodeId: string) {
  return { id, sourceNodeId, sourcePortId: 'out', targetNodeId, targetPortId: 'in' };
}

function graph(nodes: GraphNode[], edges: Graph['edges'] = []): Graph {
  return { id: 'graph-1', name: 'Execution Test', nodes, edges };
}

function forceNode(id: string, targetEntityId: string, y: number): GraphNode {
  return node(id, 'applyForce', {
    kind: 'applyForce',
    targetEntityId,
    force: { x: 0, y, z: 0 }
  });
}

test('plan is topological and uses node id as tie-break', () => {
  const nodes = [
    node('trigger', 'onStart', { kind: 'onStart' }),
    node('a', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 1, z: 0 } }),
    node('b', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 2, z: 0 } }),
    node('c', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 3, z: 0 } })
  ];
  // Deliberately scrambled edge-array order. Fan-in at c.
  const edges = [
    edge('e1', 'b', 'c'),
    edge('e2', 'trigger', 'b'),
    edge('e3', 'a', 'c'),
    edge('e4', 'trigger', 'a')
  ];

  const result = buildExecutionPlan(graph(nodes, edges), 'trigger');
  assert.equal(result.ok, true);
  assert.deepEqual(result.plan?.order, ['trigger', 'a', 'b', 'c']);
});

test('plan ordering is independent of edge-array insertion order', () => {
  const nodes = [
    node('trigger', 'onStart', { kind: 'onStart' }),
    node('a', 'applyImpulse', { kind: 'applyImpulse', targetEntityId: BALL_ID, impulse: { x: 0, y: 1, z: 0 } }),
    node('b', 'applyImpulse', { kind: 'applyImpulse', targetEntityId: BALL_ID, impulse: { x: 0, y: 2, z: 0 } })
  ];
  const forward = buildExecutionPlan(
    graph(nodes, [edge('e1', 'trigger', 'a'), edge('e2', 'trigger', 'b')]),
    'trigger'
  );
  const reverse = buildExecutionPlan(
    graph(nodes, [edge('e2', 'trigger', 'b'), edge('e1', 'trigger', 'a')]),
    'trigger'
  );
  assert.deepEqual(forward.plan?.order, reverse.plan?.order);
  assert.deepEqual(forward.plan?.order, ['trigger', 'a', 'b']);
});

test('plan excludes nodes unreachable from the firing trigger', () => {
  const nodes = [
    node('trigger', 'onStart', { kind: 'onStart' }),
    node('a', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 1, z: 0 } }),
    node('manual', 'manualTrigger', { kind: 'manualTrigger' }),
    node('other', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 9, z: 0 } })
  ];
  const result = buildExecutionPlan(
    graph(nodes, [
      edge('e1', 'trigger', 'a'),
      edge('e2', 'manual', 'other')
    ]),
    'trigger'
  );
  assert.deepEqual(result.plan?.order, ['trigger', 'a']);
});

test('a node appears at most once per trigger even with multiple predecessors', () => {
  const nodes = [
    node('trigger', 'onStart', { kind: 'onStart' }),
    node('a', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 1, z: 0 } }),
    node('b', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 2, z: 0 } }),
    node('c', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 3, z: 0 } })
  ];
  const result = buildExecutionPlan(
    graph(nodes, [
      edge('e1', 'trigger', 'a'),
      edge('e2', 'trigger', 'b'),
      edge('e3', 'a', 'c'),
      edge('e4', 'b', 'c')
    ]),
    'trigger'
  );
  const order = result.plan?.order ?? [];
  assert.equal(new Set(order).size, order.length);
  assert.equal(order.filter((id) => id === 'c').length, 1);
  assert.ok(order.indexOf('c') > order.indexOf('a'));
  assert.ok(order.indexOf('c') > order.indexOf('b'));
});

test('non-trigger or missing trigger is rejected', () => {
  const nodes = [
    node('a', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 1, z: 0 } })
  ];
  assert.equal(buildExecutionPlan(graph(nodes), 'a').ok, false);
  assert.equal(buildExecutionPlan(graph(nodes), 'missing').ok, false);
});

test('readiness requires a trigger with an outgoing edge', () => {
  const triggerless = evaluateExecutionReadiness(
    graph([node('a', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 1, z: 0 } })]),
    context
  );
  assert.equal(triggerless.ready, false);
  assert.ok(triggerless.reasons.some((reason) => reason.includes('No trigger node')));

  const inert = evaluateExecutionReadiness(
    graph([node('trigger', 'onStart', { kind: 'onStart' })]),
    context
  );
  assert.equal(inert.ready, false);
  assert.ok(inert.reasons.some((reason) => reason.includes('outgoing edge')));
});

test('readiness reports validation errors and unreachable action warnings', () => {
  const invalid = evaluateExecutionReadiness(
    graph(
      [node('trigger', 'onStart', { kind: 'onStart' }), forceNode('a', 'ghost', 1)],
      [edge('e1', 'trigger', 'a')]
    ),
    context
  );
  assert.equal(invalid.ready, false);
  assert.ok(invalid.reasons.some((reason) => reason.includes('GRAPH_INVALID_TARGET_ENTITY')));

  const validWithUnreachable = evaluateExecutionReadiness(
    graph(
      [node('trigger', 'onStart', { kind: 'onStart' }), forceNode('a', BALL_ID, 1), forceNode('orphan', BALL_ID, 2)],
      [edge('e1', 'trigger', 'a')]
    ),
    context
  );
  assert.equal(validWithUnreachable.ready, true);
  assert.equal(validWithUnreachable.warnings.length, 1);
  assert.ok(validWithUnreachable.warnings[0]?.includes('orphan'));
});

test('executeChain delegates Apply Force to the M1-E API without mutating input', () => {
  const bodies = createRuntimeBodies([ball()]);
  const before = JSON.parse(JSON.stringify(bodies));
  const plan = buildExecutionPlan(
    graph(
      [node('trigger', 'onStart', { kind: 'onStart' }), forceNode('a', BALL_ID, 5)],
      [edge('e1', 'trigger', 'a')]
    ),
    'trigger'
  );
  assert.ok(plan.plan);

  const result = executeChain(plan.plan, graph(
    [node('trigger', 'onStart', { kind: 'onStart' }), forceNode('a', BALL_ID, 5)],
    [edge('e1', 'trigger', 'a')]
  ), bodies);

  assert.equal(result.completed, true);
  assert.equal(result.failure, null);
  assert.equal(result.bodies[BALL_ID]?.force.y, 5);
  assert.deepEqual(bodies, before);
  assert.equal(result.executed.length, 2);
  assert.equal(result.executed[1]?.detail, 'F=(0, 5, 0) N');
});

test('executeChain delegates Apply Impulse and Clear Force to the M1-E API', () => {
  const bodies = createRuntimeBodies([ball()]);
  const nodes = [
    node('trigger', 'onStart', { kind: 'onStart' }),
    node('impulse', 'applyImpulse', {
      kind: 'applyImpulse',
      targetEntityId: BALL_ID,
      impulse: { x: 0, y: 10, z: 0 }
    }),
    node('clear', 'clearForce', { kind: 'clearForce', targetEntityId: BALL_ID })
  ];
  const g = graph(nodes, [edge('e1', 'trigger', 'impulse'), edge('e2', 'impulse', 'clear')]);
  const plan = buildExecutionPlan(g, 'trigger');
  assert.ok(plan.plan);

  const result = executeChain(plan.plan, g, bodies);
  assert.equal(result.completed, true);
  assert.equal(result.bodies[BALL_ID]?.velocity.y, 10);
  assert.equal(result.bodies[BALL_ID]?.force.y, 0);
});

test('a failed node stops the chain, commits nothing for itself, and keeps earlier nodes', () => {
  const bodies = createRuntimeBodies([ball()]);
  const nodes = [
    node('trigger', 'onStart', { kind: 'onStart' }),
    forceNode('first', BALL_ID, 5),
    forceNode('second', 'ghost', 9),
    forceNode('third', BALL_ID, 1)
  ];
  const g = graph(nodes, [
    edge('e1', 'trigger', 'first'),
    edge('e2', 'first', 'second'),
    edge('e3', 'second', 'third')
  ]);
  const plan = buildExecutionPlan(g, 'trigger');
  assert.ok(plan.plan);

  const result = executeChain(plan.plan, g, bodies);
  assert.equal(result.completed, false);
  assert.equal(result.failure?.nodeId, 'second');
  assert.equal(result.failure?.code, 'FORCE_INVALID_TARGET');
  assert.equal(result.failure?.severity, 'warn');
  assert.equal(result.bodies[BALL_ID]?.force.y, 5);
  assert.deepEqual(
    result.executed.map((item) => item.nodeId),
    ['trigger', 'first']
  );
});

test('an internal runtime error is reported with error severity and no partial commit', () => {
  const bodies = createRuntimeBodies([ball()]);
  bodies[BALL_ID] = { ...bodies[BALL_ID]!, force: { x: Number.NaN, y: 0, z: 0 } };
  const before = structuredClone(bodies);
  const nodes = [node('trigger', 'onStart', { kind: 'onStart' }), forceNode('a', BALL_ID, 1)];
  const g = graph(nodes, [edge('e1', 'trigger', 'a')]);
  const plan = buildExecutionPlan(g, 'trigger');
  assert.ok(plan.plan);

  const result = executeChain(plan.plan, g, bodies);
  assert.equal(result.completed, false);
  assert.equal(result.failure?.severity, 'error');
  assert.equal(result.failure?.code, 'FORCE_INVALID_STATE');
  assert.deepEqual(bodies, before);
});

test('contact triggers match either the dynamic body or the plane', () => {
  const nodes = [
    node('body', 'onPlaneContact', { kind: 'onPlaneContact', targetEntityId: BALL_ID }),
    node('plane', 'onPlaneContact', { kind: 'onPlaneContact', targetEntityId: FLOOR_ID })
  ];
  const matches = matchContactTriggers(graph(nodes), [
    { bodyEntityId: OTHER_BALL_ID, planeEntityId: FLOOR_ID },
    { bodyEntityId: BALL_ID, planeEntityId: 'floor-2' }
  ]);

  assert.equal(matches.length, 2);
  assert.equal(matches[0]?.node.id, 'body');
  assert.equal(matches[0]?.contact.bodyEntityId, BALL_ID);
  assert.equal(matches[1]?.node.id, 'plane');
  assert.equal(matches[1]?.contact.bodyEntityId, OTHER_BALL_ID);
});

test('manual trigger selection prefers a valid node and otherwise uses lowest id', () => {
  const g = graph([
    node('z-manual', 'manualTrigger', { kind: 'manualTrigger' }),
    node('a-manual', 'manualTrigger', { kind: 'manualTrigger' }),
    node('force', 'applyForce', { kind: 'applyForce', targetEntityId: BALL_ID, force: { x: 0, y: 1, z: 0 } })
  ]);
  assert.equal(selectManualTriggerNode(g)?.id, 'a-manual');
  assert.equal(selectManualTriggerNode(g, 'z-manual')?.id, 'z-manual');
  assert.equal(selectManualTriggerNode(g, 'force')?.id, 'a-manual');
  assert.equal(selectManualTriggerNode(graph([])), null);
});

test('trigger selection is sorted by node id', () => {
  const g = graph([
    node('b', 'onStart', { kind: 'onStart' }),
    node('a', 'onStart', { kind: 'onStart' })
  ]);
  assert.deepEqual(selectTriggerNodes(g, 'onStart').map((item) => item.id), ['a', 'b']);
});

test('body maps are not shared between execution results', () => {
  const bodies: RuntimeBodies = createRuntimeBodies([ball()]);
  const nodes = [node('trigger', 'onStart', { kind: 'onStart' }), forceNode('a', BALL_ID, 2)];
  const g = graph(nodes, [edge('e1', 'trigger', 'a')]);
  const plan = buildExecutionPlan(g, 'trigger');
  assert.ok(plan.plan);
  const result = executeChain(plan.plan, g, bodies);
  assert.notEqual(result.bodies, bodies);
  assert.equal(bodies[BALL_ID]?.force.y, 0);
});
