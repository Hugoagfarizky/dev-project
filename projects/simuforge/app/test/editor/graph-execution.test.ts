import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import {
  createDefaultEditorState,
  createDefaultPersistenceState,
  createDefaultRuntimeState
} from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';
import {
  FIXED_TIMESTEP_SECONDS,
  FORCE_INVALID_STATE,
  FORCE_INVALID_TARGET
} from '../../src/runtime/physics.ts';
import type { Graph, GraphNode } from '../../src/graph/types.ts';
import type { LogEntry } from '../../src/console/types.ts';
import type { Quat, RigidBodyComponent, Vec3, WorldEntity } from '../../src/world/types.ts';

const BALL_A = 'a-ball';
const BALL_B = 'b-ball';
const FLOOR_ID = 'floor-1';
const NOW = '2026-11-15T00:00:00.000Z';

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

function ball(id = BALL_A, position: Vec3 = { x: 0, y: 5, z: 0 }, overrides: Partial<RigidBodyComponent> = {}): WorldEntity {
  return entity(id, 'sphere', position, [rigidBody(overrides)]);
}

function floor(): WorldEntity {
  return entity(FLOOR_ID, 'plane', { x: 0, y: 0, z: 0 }, [
    rigidBody({ collider: { kind: 'plane', size: { x: 100, y: 1, z: 100 } } })
  ]);
}

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

function impulseNode(id: string, targetEntityId: string, y: number): GraphNode {
  return node(id, 'applyImpulse', {
    kind: 'applyImpulse',
    targetEntityId,
    impulse: { x: 0, y, z: 0 }
  });
}

function initialState(options: {
  entities?: WorldEntity[];
  graph?: Graph | null;
} = {}): StudioState {
  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: {
        id: 'project-1',
        name: 'Test Project',
        createdAt: NOW,
        updatedAt: NOW
      },
      world: {
        format: 'simuforge.world',
        schemaVersion: 1,
        entities: options.entities ?? [ball()]
      }
    },
    editor: createDefaultEditorState(),
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState(),
    graph: options.graph ?? null
  };
}

function context(): ReducerContext {
  let next = 0;
  return {
    idFactory: () => `id-${++next}`,
    clock: () => NOW
  };
}

function dispatch(state: StudioState, command: Parameters<typeof reduceStudioState>[1]): StudioState {
  return reduceStudioState(state, command, context());
}

function play(state: StudioState): StudioState {
  return dispatch(state, { type: 'runtime/play' });
}

function pause(state: StudioState): StudioState {
  return dispatch(state, { type: 'runtime/pause' });
}

function resume(state: StudioState): StudioState {
  return dispatch(state, { type: 'runtime/resume' });
}

function reset(state: StudioState): StudioState {
  return dispatch(state, { type: 'runtime/reset' });
}

function stop(state: StudioState): StudioState {
  return dispatch(state, { type: 'runtime/stop' });
}

function step(state: StudioState, deltaSeconds = FIXED_TIMESTEP_SECONDS): StudioState {
  return dispatch(state, { type: 'runtime/step', deltaSeconds });
}

function manualTrigger(state: StudioState, triggerNodeId?: string): StudioState {
  return dispatch(
    state,
    triggerNodeId
      ? { type: 'runtime/graph-trigger', triggerNodeId }
      : { type: 'runtime/graph-trigger' }
  );
}

function runtimeLogs(state: StudioState): LogEntry[] {
  return state.logs.filter((entry) => entry.source === 'RUNTIME');
}

function codes(state: StudioState): string[] {
  return runtimeLogs(state).map((entry) => entry.code ?? '');
}

function forceY(state: StudioState, entityId = BALL_A): number {
  return state.runtime.bodies[entityId]?.force.y ?? 0;
}

function velocityY(state: StudioState, entityId = BALL_A): number {
  return state.runtime.bodies[entityId]?.velocity.y ?? 0;
}

function onStartForceGraph(force = 5): Graph {
  return graph(
    [node('start', 'onStart', { kind: 'onStart' }), forceNode('force', BALL_A, force)],
    [edge('e1', 'start', 'force')]
  );
}

function manualImpulseGraph(impulse = 10): Graph {
  return graph(
    [node('manual', 'manualTrigger', { kind: 'manualTrigger' }), impulseNode('impulse', BALL_A, impulse)],
    [edge('e1', 'manual', 'impulse')]
  );
}

test('On Start fires once per Editing -> Running and not on resume', () => {
  const played = play(initialState({ graph: onStartForceGraph(5) }));

  assert.equal(played.runtime.status, 'running');
  assert.equal(forceY(played), 5);
  assert.equal(played.runtime.execution.sessionId, 1);
  assert.equal(played.runtime.execution.lastResult?.outcome, 'completed');
  assert.equal(played.runtime.execution.lastTrigger?.type, 'onStart');
  assert.deepEqual(codes(played), [
    'GRAPH_TRIGGERED',
    'GRAPH_NODE_EXECUTED',
    'GRAPH_NODE_EXECUTED',
    'GRAPH_EXECUTION_COMPLETED'
  ]);

  const paused = pause(played);
  const resumed = resume(paused);
  assert.equal(forceY(resumed), 5);
  assert.equal(codes(resumed).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);
  assert.equal(resumed.runtime.execution.sessionId, 1);
});

test('Reset and Stop do not re-fire On Start and bump the session', () => {
  const played = play(initialState({ graph: onStartForceGraph(5) }));
  const resetState = reset(played);

  assert.equal(resetState.runtime.status, 'running');
  assert.equal(resetState.runtime.execution.sessionId, 2);
  assert.equal(codes(resetState).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);

  const stopped = stop(resetState);
  assert.equal(stopped.runtime.status, 'editing');
  assert.equal(stopped.runtime.execution.sessionId, 3);
  assert.equal(stopped.runtime.execution.queue.length, 0);
  assert.equal(codes(stopped).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);
});

test('multiple On Start nodes fire in node-id order', () => {
  const g = graph(
    [
      node('b-start', 'onStart', { kind: 'onStart' }),
      node('a-start', 'onStart', { kind: 'onStart' }),
      forceNode('force', BALL_A, 1)
    ],
    [
      edge('e1', 'b-start', 'force'),
      edge('e2', 'a-start', 'force')
    ]
  );
  const played = play(initialState({ graph: g }));
  assert.equal(forceY(played), 2);
  const triggered = runtimeLogs(played).filter((entry) => entry.code === 'GRAPH_TRIGGERED');
  assert.equal(triggered.length, 2);
  assert.ok(triggered[0]?.message.includes('a-start'));
  assert.ok(triggered[1]?.message.includes('b-start'));
});

test('Manual Trigger executes immediately while Running and can repeat', () => {
  const played = play(initialState({ graph: manualImpulseGraph(10) }));
  const first = manualTrigger(played);
  assert.equal(velocityY(first), 10);
  assert.equal(first.runtime.execution.lastTrigger?.type, 'manualTrigger');
  assert.equal(first.runtime.execution.lastResult?.outcome, 'completed');

  const second = manualTrigger(first);
  assert.equal(velocityY(second), 20);
  assert.equal(codes(second).filter((code) => code === 'GRAPH_EXECUTION_COMPLETED').length, 2);
});

test('Manual Trigger while Paused queues and executes only after resume', () => {
  const paused = pause(play(initialState({ graph: manualImpulseGraph(10) })));
  const queued = manualTrigger(paused);

  assert.equal(queued.runtime.status, 'paused');
  assert.equal(queued.runtime.execution.queue.length, 1);
  assert.equal(queued.runtime.execution.status, 'suspended');
  assert.equal(velocityY(queued), 0);
  assert.equal(codes(queued).filter((code) => code === 'GRAPH_TRIGGERED').length, 0);

  const resumed = resume(queued);
  assert.equal(resumed.runtime.execution.queue.length, 0);
  assert.equal(resumed.runtime.execution.status, 'idle');
  assert.equal(velocityY(resumed), 10);
  assert.equal(codes(resumed).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);
});

test('queued manual triggers drain in FIFO order', () => {
  const g = graph(
    [
      node('a-manual', 'manualTrigger', { kind: 'manualTrigger' }),
      node('b-manual', 'manualTrigger', { kind: 'manualTrigger' }),
      impulseNode('a-impulse', BALL_A, 1),
      impulseNode('b-impulse', BALL_A, 10)
    ],
    [
      edge('e1', 'a-manual', 'a-impulse'),
      edge('e2', 'b-manual', 'b-impulse')
    ]
  );

  const paused = pause(play(initialState({ graph: g })));
  const one = manualTrigger(paused, 'a-manual');
  const two = manualTrigger(one, 'b-manual');
  const three = manualTrigger(two, 'a-manual');
  assert.equal(three.runtime.execution.queue.length, 3);

  const resumed = resume(three);
  assert.equal(velocityY(resumed), 12);
  const triggered = runtimeLogs(resumed).filter((entry) => entry.code === 'GRAPH_TRIGGERED');
  assert.equal(triggered.length, 3);
  assert.ok(triggered[0]?.message.includes('a-manual'));
  assert.ok(triggered[1]?.message.includes('b-manual'));
  assert.ok(triggered[2]?.message.includes('a-manual'));
});

test('queue overflow drops the newest event and warns', () => {
  const paused = pause(play(initialState({ graph: manualImpulseGraph(1) })));
  let queued = paused;
  for (let index = 0; index < 65; index += 1) {
    queued = manualTrigger(queued);
  }

  assert.equal(queued.runtime.execution.queue.length, 64);
  assert.equal(queued.runtime.execution.droppedEvents, 1);
  const overflow = runtimeLogs(queued).filter((entry) => entry.code === 'GRAPH_QUEUE_OVERFLOW');
  assert.equal(overflow.length, 1);
  assert.equal(overflow[0]?.severity, 'warn');
  assert.ok(overflow[0]?.message.includes('manualTrigger'));

  const resumed = resume(queued);
  assert.equal(velocityY(resumed), 64);
  assert.equal(codes(resumed).filter((code) => code === 'GRAPH_EXECUTION_COMPLETED').length, 64);
});

test('On Plane Contact fires on a rising edge and not while resting', () => {
  const g = graph(
    [
      node('contact', 'onPlaneContact', { kind: 'onPlaneContact', targetEntityId: BALL_A }),
      forceNode('force', BALL_A, 1)
    ],
    [edge('e1', 'contact', 'force')]
  );
  const state = initialState({
    entities: [ball(BALL_A, { x: 0, y: 0.4, z: 0 }), floor()],
    graph: g
  });

  const played = play(state);
  assert.equal(codes(played).filter((code) => code === 'GRAPH_TRIGGERED').length, 0);

  const first = step(played);
  assert.equal(forceY(first), 1);
  assert.equal(first.runtime.execution.lastTrigger?.type, 'onPlaneContact');
  assert.equal(codes(first).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);

  const second = step(first);
  assert.equal(forceY(second), 1);
  assert.equal(codes(second).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);
});

test('On Plane Contact can match the plane entity id', () => {
  const g = graph(
    [
      node('contact', 'onPlaneContact', { kind: 'onPlaneContact', targetEntityId: FLOOR_ID }),
      forceNode('force', BALL_A, 2)
    ],
    [edge('e1', 'contact', 'force')]
  );
  const state = initialState({
    entities: [ball(BALL_A, { x: 0, y: 0.4, z: 0 }), floor()],
    graph: g
  });

  const stepped = step(play(state));
  assert.equal(forceY(stepped), 2);
  assert.equal(stepped.runtime.execution.lastTrigger?.type, 'onPlaneContact');
});

test('invalid graph skips execution with a warning while physics remains usable', () => {
  const g = graph(
    [node('start', 'onStart', { kind: 'onStart' }), forceNode('force', 'ghost', 5)],
    [edge('e1', 'start', 'force')]
  );
  const state = initialState({ entities: [ball(BALL_A, { x: 0, y: 5, z: 0 }, { useGravity: true })], graph: g });

  const played = play(state);
  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.execution.enabled, false);
  assert.equal(played.runtime.execution.lastResult?.outcome, 'skipped');
  assert.equal(codes(played).filter((code) => code === 'GRAPH_EXECUTION_SKIPPED').length, 1);
  assert.equal(codes(played).filter((code) => code === 'GRAPH_TRIGGERED').length, 0);

  const stepped = step(played, FIXED_TIMESTEP_SECONDS * 2);
  assert.ok((stepped.runtime.bodies[BALL_A]?.transform.position.y ?? 0) < 5);
});

test('a graph without a trigger skips execution with a warning', () => {
  const g = graph([forceNode('force', BALL_A, 5)]);
  const played = play(initialState({ graph: g }));
  assert.equal(played.runtime.execution.enabled, false);
  assert.equal(played.runtime.execution.lastResult?.outcome, 'skipped');
  assert.equal(codes(played).filter((code) => code === 'GRAPH_EXECUTION_SKIPPED').length, 1);
});

test('Play without a graph does not emit graph execution logs', () => {
  const played = play(initialState());
  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.execution.enabled, false);
  assert.equal(runtimeLogs(played).length, 0);
});

test('Manual Trigger warns while Editing and when no manual trigger node exists', () => {
  const editing = manualTrigger(initialState({ graph: manualImpulseGraph() }));
  assert.equal(codes(editing).includes('GRAPH_MANUAL_TRIGGER_INACTIVE'), true);

  const played = play(initialState({ graph: onStartForceGraph() }));
  const missing = manualTrigger(played);
  assert.equal(codes(missing).includes('GRAPH_MANUAL_TRIGGER_MISSING'), true);
  assert.equal(codes(missing).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);
});

test('Stop cancels queued execution, clears the queue, and bumps the session', () => {
  const paused = pause(play(initialState({ graph: manualImpulseGraph(10) })));
  const queued = manualTrigger(manualTrigger(paused));
  assert.equal(queued.runtime.execution.queue.length, 2);

  const stopped = stop(queued);
  assert.equal(stopped.runtime.status, 'editing');
  assert.equal(stopped.runtime.execution.queue.length, 0);
  assert.equal(stopped.runtime.execution.status, 'idle');
  assert.equal(stopped.runtime.execution.sessionId, queued.runtime.execution.sessionId + 1);
  assert.equal(stopped.editor.executingGraphNodeId, null);
  assert.equal(codes(stopped).filter((code) => code === 'GRAPH_EXECUTION_CANCELLED').length, 1);
});

test('Reset cancels queued execution, preserves mode, and does not re-fire On Start', () => {
  const g = graph(
    [
      node('start', 'onStart', { kind: 'onStart' }),
      node('manual', 'manualTrigger', { kind: 'manualTrigger' }),
      forceNode('force', BALL_A, 1),
      impulseNode('impulse', BALL_A, 10)
    ],
    [
      edge('e1', 'start', 'force'),
      edge('e2', 'manual', 'impulse')
    ]
  );
  const paused = pause(play(initialState({ graph: g })));
  const queued = manualTrigger(paused);
  assert.equal(queued.runtime.execution.queue.length, 1);

  const resetState = reset(queued);
  assert.equal(resetState.runtime.status, 'paused');
  assert.equal(resetState.runtime.execution.queue.length, 0);
  assert.equal(resetState.runtime.execution.sessionId, queued.runtime.execution.sessionId + 1);
  assert.equal(codes(resetState).filter((code) => code === 'GRAPH_EXECUTION_CANCELLED').length, 1);
  assert.equal(codes(resetState).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);

  const resumed = resume(resetState);
  assert.equal(velocityY(resumed), 0);
  assert.equal(codes(resumed).filter((code) => code === 'GRAPH_TRIGGERED').length, 1);
});

test('stale-session queued work is rejected without mutating the current session', () => {
  const running = play(initialState({ graph: manualImpulseGraph(10) }));
  const execution = running.runtime.execution;
  const stale: StudioState = {
    ...running,
    runtime: {
      ...running.runtime,
      status: 'paused',
      execution: {
        ...execution,
        status: 'suspended',
        queue: [
          {
            id: 'stale-1',
            sessionId: execution.sessionId - 1,
            triggerNodeId: 'manual',
            triggerType: 'manualTrigger',
            bodyEntityId: null,
            planeEntityId: null
          }
        ]
      }
    }
  };

  const resumed = resume(stale);
  assert.equal(resumed.runtime.execution.queue.length, 0);
  assert.equal(velocityY(resumed), 0);
  assert.equal(codes(resumed).filter((code) => code === 'GRAPH_TRIGGERED').length, 0);
  assert.equal(codes(resumed).filter((code) => code === 'GRAPH_EXECUTION_CANCELLED').length, 1);
});

test('a warn-severity node failure stops the chain, keeps earlier nodes, and does not pause', () => {
  const g = graph(
    [
      node('manual', 'manualTrigger', { kind: 'manualTrigger' }),
      forceNode('first', BALL_A, 5),
      forceNode('bad', BALL_B, 9),
      forceNode('third', BALL_A, 1)
    ],
    [
      edge('e1', 'manual', 'first'),
      edge('e2', 'first', 'bad'),
      edge('e3', 'bad', 'third')
    ]
  );
  const state = initialState({ entities: [ball(BALL_A), ball(BALL_B)], graph: g });
  const played = play(state);

  // Simulate defense-in-depth: the graph validated at Play, but the runtime
  // target is no longer available when the trigger fires.
  const withoutB: StudioState = {
    ...played,
    runtime: {
      ...played.runtime,
      bodies: { ...played.runtime.bodies, [BALL_B]: undefined as never }
    }
  };
  const triggered = manualTrigger(withoutB);

  assert.equal(triggered.runtime.status, 'running');
  assert.equal(forceY(triggered, BALL_A), 5);
  assert.equal(triggered.runtime.execution.lastResult?.outcome, 'failed');
  assert.equal(triggered.runtime.execution.lastResult?.failedNodeId, 'bad');
  assert.equal(triggered.runtime.execution.lastResult?.code, FORCE_INVALID_TARGET);
  const failed = runtimeLogs(triggered).filter((entry) => entry.code === 'GRAPH_EXECUTION_FAILED');
  assert.equal(failed.length, 1);
  assert.equal(failed[0]?.severity, 'warn');
  assert.equal(triggered.runtime.execution.status, 'idle');
});

test('an error-severity node failure stops the chain and auto-pauses the runtime', () => {
  const g = graph(
    [
      node('manual', 'manualTrigger', { kind: 'manualTrigger' }),
      impulseNode('first', BALL_A, 3),
      forceNode('bad', BALL_A, 9),
      impulseNode('third', BALL_A, 9)
    ],
    [
      edge('e1', 'manual', 'first'),
      edge('e2', 'first', 'bad'),
      edge('e3', 'bad', 'third')
    ]
  );
  const played = play(initialState({ graph: g }));
  const broken: StudioState = {
    ...played,
    runtime: {
      ...played.runtime,
      bodies: {
        ...played.runtime.bodies,
        [BALL_A]: {
          ...played.runtime.bodies[BALL_A]!,
          force: { x: Number.NaN, y: 0, z: 0 }
        }
      }
    }
  };

  const triggered = manualTrigger(broken);
  assert.equal(triggered.runtime.status, 'paused');
  assert.equal(velocityY(triggered), 3);
  assert.equal(triggered.runtime.execution.lastResult?.outcome, 'failed');
  assert.equal(triggered.runtime.execution.lastResult?.code, FORCE_INVALID_STATE);
  const failed = runtimeLogs(triggered).filter((entry) => entry.code === 'GRAPH_EXECUTION_FAILED');
  assert.equal(failed[0]?.severity, 'error');
  assert.ok(failed[0]?.message.includes('bad'));
});

test('execution highlight is transient editor state and advances per node', () => {
  const played = play(initialState({ graph: onStartForceGraph(5) }));
  assert.equal(played.editor.executingGraphNodeId, 'force');
  assert.equal(played.editor.executionSequence, 2);
  assert.equal(played.graph?.nodes.find((item) => item.id === 'force')?.type, 'applyForce');
});
