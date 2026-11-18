import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GRAPH_DIAGNOSTIC_CODES,
  validateGraph
} from '../../src/graph/validation.ts';
import {
  GRAPH_EXECUTION_ERRORS,
  buildExecutionPlan,
  executeChain
} from '../../src/runtime/graphExecution.ts';
import { createRuntimeBodies } from '../../src/runtime/physics.ts';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import {
  createDefaultEditorState,
  createDefaultPersistenceState,
  createDefaultRuntimeState
} from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';
import type {
  Graph,
  GraphEdge,
  GraphNode,
  GraphValidationContext
} from '../../src/graph/types.ts';
import type { Component, WorldEntity } from '../../src/world/types.ts';
import type { ElectricalDocument, TerminalRef, Wire } from '../../src/electrical/types.ts';
import { ELECTRICAL_FORMAT, ELECTRICAL_SCHEMA_VERSION } from '../../src/electrical/types.ts';
import type { ElectricalOverrides } from '../../src/runtime/electrical.ts';
import {
  electricalOverrideKey,
  emptyElectricalOverrides
} from '../../src/runtime/electrical.ts';

const SOURCE_ENTITY = '11111111-1111-4111-8111-111111111111';
const RESISTOR_ENTITY = '33333333-3333-4333-8333-333333333333';
const SWITCH_ENTITY = '44444444-4444-4444-8444-444444444444';
const GROUND_ENTITY = '55555555-5555-4555-8555-555555555555';

const V1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const R1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const S1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const G1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const NOW = '2026-11-18T00:00:00.000Z';

function entity(id: string, components: Component[]): WorldEntity {
  return {
    id,
    name: id,
    type: 'cube',
    transform: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    },
    metadata: {},
    components
  };
}

function sourceEntity(voltage = 10): WorldEntity {
  return entity(SOURCE_ENTITY, [
    { id: V1, type: 'voltageSource', enabled: true, voltage }
  ]);
}

function switchEntity(closed = true): WorldEntity {
  return entity(SWITCH_ENTITY, [{ id: S1, type: 'switch', enabled: true, closed }]);
}

function resistorEntity(): WorldEntity {
  return entity(RESISTOR_ENTITY, [
    { id: R1, type: 'resistor', enabled: true, resistance: 100 }
  ]);
}

function groundEntity(): WorldEntity {
  return entity(GROUND_ENTITY, [{ id: G1, type: 'ground', enabled: true }]);
}

function node(id: string, type: GraphNode['type'], config: GraphNode['config']): GraphNode {
  return { id, type, config };
}

function edge(
  id: string,
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string
): GraphEdge {
  return { id, sourceNodeId, sourcePortId, targetNodeId, targetPortId };
}

function graph(nodes: GraphNode[], edges: GraphEdge[] = []): Graph {
  return { id: 'graph-1', name: 'Electrical Graph', nodes, edges };
}

function switchAction(closed: boolean, entityId = SWITCH_ENTITY, componentId = S1): GraphNode {
  return node('b-switch', 'setSwitch', {
    kind: 'setSwitch',
    targetEntityId: entityId,
    targetComponentId: componentId,
    closed
  });
}

function voltageAction(voltage: number, entityId = SOURCE_ENTITY, componentId = V1): GraphNode {
  return node('c-source', 'setSourceVoltage', {
    kind: 'setSourceVoltage',
    targetEntityId: entityId,
    targetComponentId: componentId,
    voltage
  });
}

function actionGraph(action: GraphNode): Graph {
  return graph(
    [node('a-trigger', 'onStart', { kind: 'onStart' }), action],
    [edge('e1', 'a-trigger', 'out', action.id, 'in')]
  );
}

const validationContext: GraphValidationContext = {
  entities: [
    { id: SOURCE_ENTITY, components: [{ id: V1, type: 'voltageSource', enabled: true }] },
    { id: SWITCH_ENTITY, components: [{ id: S1, type: 'switch', enabled: true }] },
    { id: RESISTOR_ENTITY, components: [{ id: R1, type: 'resistor', enabled: true }] }
  ]
};

function hasCode(result: ReturnType<typeof validateGraph>, code: string): boolean {
  return result.diagnostics.some((diagnostic) => diagnostic.code === code);
}

test('validateGraph accepts valid switch and source nodes', () => {
  const switchResult = validateGraph(graph([switchAction(false)]), validationContext);
  assert.equal(switchResult.valid, true, JSON.stringify(switchResult.diagnostics));

  const sourceResult = validateGraph(graph([voltageAction(24)]), validationContext);
  assert.equal(sourceResult.valid, true, JSON.stringify(sourceResult.diagnostics));
});

test('validateGraph rejects missing or unknown electrical targets', () => {
  const missingEntity = validateGraph(
    graph([switchAction(false, '', S1)]),
    validationContext
  );
  assert.ok(hasCode(missingEntity, GRAPH_DIAGNOSTIC_CODES.MISSING_TARGET_ENTITY));

  const unknownEntity = validateGraph(
    graph([switchAction(false, 'missing-entity', S1)]),
    validationContext
  );
  assert.ok(hasCode(unknownEntity, GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_ENTITY));

  const missingComponent = validateGraph(
    graph([switchAction(false, SWITCH_ENTITY, '')]),
    validationContext
  );
  assert.ok(hasCode(missingComponent, GRAPH_DIAGNOSTIC_CODES.MISSING_TARGET_COMPONENT));

  const unknownComponent = validateGraph(
    graph([switchAction(false, SWITCH_ENTITY, 'missing-component')]),
    validationContext
  );
  assert.ok(hasCode(unknownComponent, GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_COMPONENT));
});

test('validateGraph rejects mismatched, disabled, and invalid electrical targets', () => {
  const wrongType = validateGraph(
    graph([switchAction(false, SOURCE_ENTITY, V1)]),
    validationContext
  );
  assert.ok(hasCode(wrongType, GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_COMPONENT));

  const disabledContext: GraphValidationContext = {
    entities: [
      { id: SWITCH_ENTITY, components: [{ id: S1, type: 'switch', enabled: false }] }
    ]
  };
  const disabled = validateGraph(graph([switchAction(false)]), disabledContext);
  assert.ok(hasCode(disabled, GRAPH_DIAGNOSTIC_CODES.INVALID_TARGET_COMPONENT));

  const nonFinite = validateGraph(
    graph([voltageAction(Number.POSITIVE_INFINITY)]),
    validationContext
  );
  assert.ok(hasCode(nonFinite, GRAPH_DIAGNOSTIC_CODES.NON_FINITE_NUMBER));

  const outOfRange = validateGraph(graph([voltageAction(2_000_000)]), validationContext);
  assert.ok(hasCode(outOfRange, GRAPH_DIAGNOSTIC_CODES.NON_FINITE_NUMBER));
});

function chainOverrides(overrides?: ElectricalOverrides): ElectricalOverrides {
  return overrides ?? emptyElectricalOverrides();
}

test('executeChain applies electrical actions in plan order without touching bodies', () => {
  const g = graph(
    [
      node('a-trigger', 'onStart', { kind: 'onStart' }),
      switchAction(false),
      voltageAction(25)
    ],
    [
      edge('e1', 'a-trigger', 'out', 'b-switch', 'in'),
      edge('e2', 'b-switch', 'out', 'c-source', 'in')
    ]
  );
  const plan = buildExecutionPlan(g, 'a-trigger');
  assert.ok(plan.ok);
  const bodies = createRuntimeBodies([]);
  const overrides = chainOverrides();

  const result = executeChain(plan.plan!, g, bodies, {
    electrical: {
      entities: [switchEntity(true), sourceEntity(10)],
      overrides
    }
  });

  assert.equal(result.completed, true);
  assert.equal(result.failure, null);
  assert.equal(result.bodies, bodies);
  assert.notEqual(result.electrical, overrides);
  assert.equal(result.electrical?.switchStates[electricalOverrideKey(SWITCH_ENTITY, S1)], false);
  assert.equal(result.electrical?.sourceVoltages[electricalOverrideKey(SOURCE_ENTITY, V1)], 25);
  assert.deepEqual(
    result.executed.map((item) => item.nodeId),
    ['a-trigger', 'b-switch', 'c-source']
  );
  assert.match(result.executed[1]?.detail ?? '', /open/);
  assert.match(result.executed[2]?.detail ?? '', /25 V/);
});

test('executeChain keeps the override reference when nothing changes', () => {
  const g = actionGraph(switchAction(true));
  const plan = buildExecutionPlan(g, 'a-trigger');
  const overrides = chainOverrides();

  const result = executeChain(plan.plan!, g, createRuntimeBodies([]), {
    electrical: { entities: [switchEntity(true)], overrides }
  });

  assert.equal(result.completed, true);
  assert.equal(result.electrical, overrides);
});

test('executeChain fails atomically when the target component is gone', () => {
  const g = actionGraph(switchAction(false));
  const plan = buildExecutionPlan(g, 'a-trigger');
  const overrides = chainOverrides();
  const bodies = createRuntimeBodies([]);

  const result = executeChain(plan.plan!, g, bodies, {
    electrical: { entities: [sourceEntity(10)], overrides }
  });

  assert.equal(result.completed, false);
  assert.equal(result.electrical, overrides);
  assert.equal(result.bodies, bodies);
  assert.equal(result.failure?.code, GRAPH_EXECUTION_ERRORS.ELECTRICAL_TARGET);
  assert.deepEqual(result.executed.map((item) => item.nodeId), ['a-trigger']);
});

test('executeChain rejects an invalid runtime voltage', () => {
  const g = actionGraph(voltageAction(Number.POSITIVE_INFINITY));
  const plan = buildExecutionPlan(g, 'a-trigger');
  const overrides = chainOverrides();

  const result = executeChain(plan.plan!, g, createRuntimeBodies([]), {
    electrical: { entities: [sourceEntity(10)], overrides }
  });

  assert.equal(result.completed, false);
  assert.equal(result.failure?.code, GRAPH_EXECUTION_ERRORS.ELECTRICAL_VALUE);
});

test('executeChain requires an electrical context for electrical nodes', () => {
  const g = actionGraph(switchAction(false));
  const plan = buildExecutionPlan(g, 'a-trigger');
  const result = executeChain(plan.plan!, g, createRuntimeBodies([]));

  assert.equal(result.completed, false);
  assert.equal(result.electrical, null);
  assert.equal(result.failure?.code, GRAPH_EXECUTION_ERRORS.INVALID_NODE);
});

let wireCounter = 0;

function wire(from: TerminalRef, to: TerminalRef): Wire {
  wireCounter += 1;
  return {
    id: `00000000-0000-4000-8000-${wireCounter.toString(16).padStart(12, '0')}`,
    from,
    to
  };
}

function seriesCircuit(): ElectricalDocument {
  return {
    format: ELECTRICAL_FORMAT,
    schemaVersion: ELECTRICAL_SCHEMA_VERSION,
    wires: [
      wire(
        { entityId: SOURCE_ENTITY, componentId: V1, terminalId: 'positive' },
        { entityId: RESISTOR_ENTITY, componentId: R1, terminalId: 'a' }
      ),
      wire(
        { entityId: RESISTOR_ENTITY, componentId: R1, terminalId: 'b' },
        { entityId: SWITCH_ENTITY, componentId: S1, terminalId: 'a' }
      ),
      wire(
        { entityId: SWITCH_ENTITY, componentId: S1, terminalId: 'b' },
        { entityId: GROUND_ENTITY, componentId: G1, terminalId: 'g' }
      ),
      wire(
        { entityId: SOURCE_ENTITY, componentId: V1, terminalId: 'negative' },
        { entityId: GROUND_ENTITY, componentId: G1, terminalId: 'g' }
      )
    ],
    layout: []
  };
}

function circuitState(action: GraphNode): StudioState {
  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Circuit',
        createdAt: NOW,
        updatedAt: NOW
      },
      world: {
        format: 'simuforge.world',
        schemaVersion: 1,
        entities: [sourceEntity(10), resistorEntity(), switchEntity(true), groundEntity()]
      },
      electrical: seriesCircuit()
    },
    editor: createDefaultEditorState(),
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState(),
    graph: actionGraph(action)
  };
}

function context(): ReducerContext {
  let next = 0;
  let tick = 0;
  return {
    idFactory: () => `id-${++next}`,
    clock: () => NOW,
    now: () => {
      tick += 1;
      return tick;
    }
  };
}

function componentResult(state: StudioState, componentId: string) {
  return (
    state.runtime.electrical.solution?.components.find(
      (result) => result.componentId === componentId
    ) ?? null
  );
}

function authoredComponent(state: StudioState, entityId: string, componentId: string) {
  return state.project.world.entities
    .find((item) => item.id === entityId)
    ?.components?.find((item) => item.id === componentId);
}

test('Play runs a graph switch action against runtime overrides only', () => {
  const played = reduceStudioState(
    circuitState(switchAction(false)),
    { type: 'runtime/play' },
    context()
  );

  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.execution.enabled, true);
  assert.equal(
    played.runtime.electrical.switchStates[electricalOverrideKey(SWITCH_ENTITY, S1)],
    false
  );
  assert.equal((authoredComponent(played, SWITCH_ENTITY, S1) as { closed?: boolean }).closed, true);

  const resistor = componentResult(played, R1);
  assert.ok(Math.abs(resistor?.current ?? 1) < 1e-12);
  assert.equal(componentResult(played, S1)?.status, 'open');
  assert.ok(
    played.logs.some(
      (entry) => entry.code === 'GRAPH_NODE_EXECUTED' && /Switch/.test(entry.detail ?? '')
    )
  );
});

test('Play runs a graph source action and re-solves with the override', () => {
  const played = reduceStudioState(
    circuitState(voltageAction(20)),
    { type: 'runtime/play' },
    context()
  );

  assert.equal(
    played.runtime.electrical.sourceVoltages[electricalOverrideKey(SOURCE_ENTITY, V1)],
    20
  );
  assert.equal((authoredComponent(played, SOURCE_ENTITY, V1) as { voltage?: number }).voltage, 10);
  const resistor = componentResult(played, R1);
  assert.ok(Math.abs((resistor?.current ?? 0) - 0.2) < 1e-9);
});

test('an invalid electrical graph is skipped while Play still solves the authored circuit', () => {
  const played = reduceStudioState(
    circuitState(switchAction(false, 'missing-entity', S1)),
    { type: 'runtime/play' },
    context()
  );

  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.execution.enabled, false);
  assert.equal(played.runtime.electrical.status, 'solved');
  assert.equal(
    played.runtime.electrical.switchStates[electricalOverrideKey(SWITCH_ENTITY, S1)],
    true
  );
  const resistor = componentResult(played, R1);
  assert.ok(Math.abs((resistor?.current ?? 0) - 0.1) < 1e-9);
  assert.ok(played.logs.some((entry) => entry.code === 'GRAPH_EXECUTION_SKIPPED'));
});
