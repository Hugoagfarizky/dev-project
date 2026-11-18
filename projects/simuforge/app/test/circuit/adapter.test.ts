import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  circuitNodeId,
  parseCircuitNodeId,
  toCircuitEdges,
  toCircuitNodes
} from '../../src/ui/circuit/adapter.ts';
import type { ElectricalDocument } from '../../src/electrical/types.ts';
import { ELECTRICAL_FORMAT, ELECTRICAL_SCHEMA_VERSION } from '../../src/electrical/types.ts';
import type { CircuitSolution } from '../../src/electrical/solver.ts';
import type { Component, WorldEntity } from '../../src/world/types.ts';

const E1 = '11111111-1111-4111-8111-111111111111';
const E2 = '22222222-2222-4222-8222-222222222222';
const V1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const R1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const G1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

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

function documentWith(layout: ElectricalDocument['layout']): ElectricalDocument {
  return {
    format: ELECTRICAL_FORMAT,
    schemaVersion: ELECTRICAL_SCHEMA_VERSION,
    wires: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        from: { entityId: E1, componentId: V1, terminalId: 'positive' },
        to: { entityId: E2, componentId: R1, terminalId: 'a' }
      }
    ],
    layout
  };
}

test('circuit node ids round-trip', () => {
  const id = circuitNodeId(E1, R1);
  assert.equal(id, `${E1}/${R1}`);
  assert.deepEqual(parseCircuitNodeId(id), { entityId: E1, componentId: R1 });
  assert.equal(parseCircuitNodeId('missing-separator'), null);
  assert.equal(parseCircuitNodeId('/component'), null);
  assert.equal(parseCircuitNodeId('entity/'), null);
});

test('toCircuitNodes is deterministic and only includes electrical components', () => {
  const entities = [
    entity(E2, [
      { id: R1, type: 'resistor', enabled: true, resistance: 100 },
      { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', type: 'rigidBody', enabled: true, mass: 1, useGravity: true, collider: { kind: 'sphere', size: 0.5 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 } }
    ]),
    entity(E1, [{ id: V1, type: 'voltageSource', enabled: true, voltage: 10 }])
  ];

  const nodes = toCircuitNodes(entities, documentWith([]), null, E2, false);
  assert.deepEqual(nodes.map((node) => node.id), [circuitNodeId(E1, V1), circuitNodeId(E2, R1)]);
  assert.equal(nodes[0].type, 'circuitComponent');
  assert.equal(nodes[1].selected, true);
  assert.equal(nodes[0].data.label, 'Voltage Source');
  assert.equal(nodes[0].data.status, null);
});

test('toCircuitNodes prefers persisted layout and falls back to a grid', () => {
  const entities = [entity(E1, [{ id: V1, type: 'voltageSource', enabled: true, voltage: 10 }])];
  const withLayout = toCircuitNodes(
    entities,
    documentWith([{ entityId: E1, componentId: V1, x: 321, y: 123 }]),
    null,
    null,
    false
  );
  assert.deepEqual(withLayout[0].position, { x: 321, y: 123 });

  const withoutLayout = toCircuitNodes(entities, documentWith([]), null, null, false);
  assert.ok(withoutLayout[0].position.x > 0);
  assert.ok(withoutLayout[0].position.y > 0);
});

test('toCircuitNodes attaches live solution values', () => {
  const entities = [entity(E1, [{ id: V1, type: 'voltageSource', enabled: true, voltage: 10 }])];
  const solution: CircuitSolution = {
    nets: [],
    branches: [],
    components: [
      { entityId: E1, componentId: V1, type: 'voltageSource', status: 'solved', voltage: 10, current: -0.1, power: -1 }
    ],
    iterations: 1
  };
  const nodes = toCircuitNodes(entities, null, solution, null, true);
  assert.equal(nodes[0].data.status, 'solved');
  assert.equal(nodes[0].data.voltage, 10);
  assert.equal(nodes[0].data.current, -0.1);
  assert.equal(nodes[0].data.locked, true);
});

test('toCircuitEdges maps wires and skips unknown endpoints', () => {
  const entities = [
    entity(E1, [{ id: V1, type: 'voltageSource', enabled: true, voltage: 10 }]),
    entity(E2, [{ id: R1, type: 'resistor', enabled: true, resistance: 100 }])
  ];
  const nodes = toCircuitNodes(entities, documentWith([]), null, null, false);
  const edges = toCircuitEdges(documentWith([]), nodes);
  assert.equal(edges.length, 1);
  assert.equal(edges[0].source, circuitNodeId(E1, V1));
  assert.equal(edges[0].target, circuitNodeId(E2, R1));
  assert.equal(edges[0].sourceHandle, 'positive');
  assert.equal(edges[0].targetHandle, 'a');

  const orphan = documentWith([]);
  orphan.wires.push({
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    from: { entityId: E1, componentId: V1, terminalId: 'positive' },
    to: { entityId: '99999999-9999-4999-8999-999999999999', componentId: G1, terminalId: 'g' }
  });
  assert.equal(toCircuitEdges(orphan, nodes).length, 1);
  assert.equal(toCircuitEdges(null, nodes).length, 0);
});
