import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateElectricalDocument } from '../../src/electrical/validation.ts';
import { buildNetlist } from '../../src/electrical/netlist.ts';
import { solveCircuit } from '../../src/electrical/solver.ts';
import {
  ELECTRICAL_FORMAT,
  ELECTRICAL_SCHEMA_VERSION,
  createEmptyElectricalDocument
} from '../../src/electrical/types.ts';
import type {
  ElectricalDocument,
  ElectricalLayoutEntry,
  TerminalRef,
  Wire
} from '../../src/electrical/types.ts';
import type { Component, WorldEntity } from '../../src/world/types.ts';
import { parseProjectDocument, serializeProjectDocument } from '../../src/project/serialization.ts';

const E1 = '11111111-1111-4111-8111-111111111111';
const E2 = '22222222-2222-4222-8222-222222222222';
const E3 = '33333333-3333-4333-8333-333333333333';
const E4 = '44444444-4444-4444-8444-444444444444';

const V1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const R1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const R2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const S1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const G1 = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const V2 = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

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

function source(id: string, voltage: number): Component {
  return { id, type: 'voltageSource', enabled: true, voltage };
}

function resistor(id: string, resistance: number, enabled = true): Component {
  return { id, type: 'resistor', enabled, resistance };
}

function switchComponent(id: string, closed: boolean): Component {
  return { id, type: 'switch', enabled: true, closed };
}

function ground(id: string): Component {
  return { id, type: 'ground', enabled: true };
}

function ref(entityId: string, componentId: string, terminalId: string): TerminalRef {
  return { entityId, componentId, terminalId };
}

let wireCounter = 0;

function wire(from: TerminalRef, to: TerminalRef): Wire {
  wireCounter += 1;
  const suffix = wireCounter.toString(16).padStart(12, '0');
  return { id: `00000000-0000-4000-8000-${suffix}`, from, to };
}

function documentWith(wires: Wire[], layout: ElectricalLayoutEntry[] = []): ElectricalDocument {
  return {
    format: ELECTRICAL_FORMAT,
    schemaVersion: ELECTRICAL_SCHEMA_VERSION,
    wires,
    layout
  };
}

function solve(entities: WorldEntity[], electrical: ElectricalDocument) {
  const netlistResult = buildNetlist(entities, electrical);
  if (!netlistResult.ok) {
    return { netlistResult, solveResult: null } as const;
  }
  return { netlistResult, solveResult: solveCircuit(netlistResult.netlist) } as const;
}

function seriesEntities(): WorldEntity[] {
  return [
    entity(E1, [source(V1, 10)]),
    entity(E2, [resistor(R1, 100)]),
    entity(E3, [resistor(R2, 100)]),
    entity(E4, [ground(G1)])
  ];
}

function seriesDocument(): ElectricalDocument {
  return documentWith([
    wire(ref(E1, V1, 'positive'), ref(E2, R1, 'a')),
    wire(ref(E2, R1, 'b'), ref(E3, R2, 'a')),
    wire(ref(E3, R2, 'b'), ref(E4, G1, 'g')),
    wire(ref(E1, V1, 'negative'), ref(E4, G1, 'g'))
  ]);
}

test('validates wires and layout deterministically', () => {
  const entities = seriesEntities();
  const electrical = seriesDocument();
  electrical.layout = [
    { entityId: E2, componentId: R1, x: 120, y: 40 },
    { entityId: E1, componentId: V1, x: 20, y: 40 }
  ];
  const result = validateElectricalDocument(electrical, entities);
  assert.ok(result.value);
  assert.equal(result.value.wires.length, 4);
  assert.equal(result.diagnostics.length, 0);
  assert.deepEqual(result.value.layout.map((entry) => entry.entityId), [E1, E2]);
});

const E9_UNKNOWN = '99999999-9999-4999-8999-999999999999';

test('reports unknown terminals but retains the wire', () => {
  const entities = seriesEntities();
  const bad = documentWith([wire(ref(E1, V1, 'positive'), ref(E9_UNKNOWN, V1, 'negative'))]);
  const result = validateElectricalDocument(bad, entities);
  assert.ok(result.value);
  assert.equal(result.value.wires.length, 1);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_UNKNOWN_TERMINAL'));
});

test('strips a structurally invalid section with a warning', () => {
  const result = validateElectricalDocument({ format: 'wrong' }, seriesEntities());
  assert.equal(result.value, null);
  assert.equal(result.warnings.length, 1);
});

test('detects duplicate and self wires as diagnostics', () => {
  const entities = seriesEntities();
  const connection = wire(ref(E1, V1, 'positive'), ref(E2, R1, 'a'));
  const duplicate = { ...connection, id: '12345678-1234-4234-8234-123456789012' };
  const self = wire(ref(E2, R1, 'a'), ref(E2, R1, 'a'));
  const result = validateElectricalDocument(documentWith([connection, duplicate, self]), entities);
  assert.ok(result.value);
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_DUPLICATE_WIRE'));
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_SELF_WIRE'));
});

test('solves a series circuit', () => {
  const { netlistResult, solveResult } = solve(seriesEntities(), seriesDocument());
  assert.equal(netlistResult.ok, true);
  assert.ok(solveResult?.ok);
  if (!solveResult?.ok) return;

  const r1 = solveResult.solution.components.find((component) => component.componentId === R1);
  const r2 = solveResult.solution.components.find((component) => component.componentId === R2);
  const v1 = solveResult.solution.components.find((component) => component.componentId === V1);
  assert.ok(r1 && r2 && v1);
  assert.ok(Math.abs((r1.voltage ?? 0) - 5) < 1e-9);
  assert.ok(Math.abs((r1.current ?? 0) - 0.05) < 1e-9);
  assert.ok(Math.abs((r1.power ?? 0) - 0.25) < 1e-9);
  assert.ok(Math.abs((r2.voltage ?? 0) - 5) < 1e-9);
  assert.ok(Math.abs((v1.voltage ?? 0) - 10) < 1e-9);
  assert.ok(Math.abs((v1.current ?? 0) + 0.05) < 1e-9);
  assert.ok(Math.abs((v1.power ?? 0) + 0.5) < 1e-9);
});

test('solves a parallel circuit', () => {
  const entities = [
    entity(E1, [source(V1, 10)]),
    entity(E2, [resistor(R1, 100)]),
    entity(E3, [resistor(R2, 100)]),
    entity(E4, [ground(G1)])
  ];
  const electrical = documentWith([
    wire(ref(E1, V1, 'positive'), ref(E2, R1, 'a')),
    wire(ref(E1, V1, 'positive'), ref(E3, R2, 'a')),
    wire(ref(E2, R1, 'b'), ref(E4, G1, 'g')),
    wire(ref(E3, R2, 'b'), ref(E4, G1, 'g')),
    wire(ref(E1, V1, 'negative'), ref(E4, G1, 'g'))
  ]);
  const { netlistResult, solveResult } = solve(entities, electrical);
  assert.equal(netlistResult.ok, true);
  assert.ok(solveResult?.ok);
  if (!solveResult?.ok) return;

  const r1 = solveResult.solution.components.find((component) => component.componentId === R1);
  const r2 = solveResult.solution.components.find((component) => component.componentId === R2);
  const v1 = solveResult.solution.components.find((component) => component.componentId === V1);
  assert.ok(r1 && r2 && v1);
  assert.ok(Math.abs((r1.current ?? 0) - 0.1) < 1e-9);
  assert.ok(Math.abs((r2.current ?? 0) - 0.1) < 1e-9);
  assert.ok(Math.abs((v1.current ?? 0) + 0.2) < 1e-9);
});

test('solves a voltage divider', () => {
  const entities = [
    entity(E1, [source(V1, 12)]),
    entity(E2, [resistor(R1, 1000)]),
    entity(E3, [resistor(R2, 2000)]),
    entity(E4, [ground(G1)])
  ];
  const { solveResult } = solve(entities, seriesDocument());
  assert.ok(solveResult?.ok);
  if (!solveResult?.ok) return;

  const r1 = solveResult.solution.components.find((component) => component.componentId === R1);
  const r2 = solveResult.solution.components.find((component) => component.componentId === R2);
  assert.ok(r1 && r2);
  assert.ok(Math.abs((r1.current ?? 0) - 0.004) < 1e-12);
  assert.ok(Math.abs((r1.power ?? 0) - 0.016) < 1e-12);
  assert.ok(Math.abs((r2.voltage ?? 0) - 8) < 1e-9);
  assert.ok(Math.abs((r2.power ?? 0) - 0.032) < 1e-12);
});

test('open switch blocks current without floating the node', () => {
  const entities = [
    entity(E1, [source(V1, 10)]),
    entity(E2, [resistor(R1, 100)]),
    entity(E3, [switchComponent(S1, false)]),
    entity(E4, [ground(G1)])
  ];
  const electrical = documentWith([
    wire(ref(E1, V1, 'positive'), ref(E2, R1, 'a')),
    wire(ref(E2, R1, 'b'), ref(E3, S1, 'a')),
    wire(ref(E3, S1, 'b'), ref(E4, G1, 'g')),
    wire(ref(E1, V1, 'negative'), ref(E4, G1, 'g'))
  ]);
  const { netlistResult, solveResult } = solve(entities, electrical);
  assert.equal(netlistResult.ok, true);
  assert.ok(solveResult?.ok);
  if (!solveResult?.ok) return;

  const r1 = solveResult.solution.components.find((component) => component.componentId === R1);
  const s1 = solveResult.solution.components.find((component) => component.componentId === S1);
  assert.ok(r1 && s1);
  assert.ok(Math.abs(r1.current ?? 1) < 1e-12);
  assert.equal(s1.status, 'open');
  assert.ok(Math.abs((s1.voltage ?? 0) - 10) < 1e-9);
});

test('detects a shorted ideal source', () => {
  const entities = [entity(E1, [source(V1, 10)]), entity(E4, [ground(G1)])];
  const electrical = documentWith([
    wire(ref(E1, V1, 'positive'), ref(E1, V1, 'negative')),
    wire(ref(E1, V1, 'negative'), ref(E4, G1, 'g'))
  ]);
  const { netlistResult } = solve(entities, electrical);
  assert.equal(netlistResult.ok, false);
  if (!netlistResult.ok) {
    assert.ok(netlistResult.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_SHORTED_SOURCE'));
  }
});

test('detects floating nets', () => {
  const entities = [
    entity(E1, [source(V1, 10)]),
    entity(E2, [resistor(R1, 100)]),
    entity(E3, [resistor(R2, 100)]),
    entity(E4, [ground(G1)])
  ];
  const electrical = documentWith([
    wire(ref(E1, V1, 'positive'), ref(E2, R1, 'a')),
    wire(ref(E2, R1, 'b'), ref(E4, G1, 'g')),
    wire(ref(E1, V1, 'negative'), ref(E4, G1, 'g'))
  ]);
  const { netlistResult } = solve(entities, electrical);
  assert.equal(netlistResult.ok, false);
  if (!netlistResult.ok) {
    assert.ok(netlistResult.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_FLOATING_NET'));
  }
});

test('detects a missing ground', () => {
  const entities = [entity(E1, [source(V1, 10)]), entity(E2, [resistor(R1, 100)])];
  const electrical = documentWith([
    wire(ref(E1, V1, 'positive'), ref(E2, R1, 'a')),
    wire(ref(E1, V1, 'negative'), ref(E2, R1, 'b'))
  ]);
  const { netlistResult } = solve(entities, electrical);
  assert.equal(netlistResult.ok, false);
  if (!netlistResult.ok) {
    assert.ok(netlistResult.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_NO_GROUND'));
  }
});

test('detects parallel ideal sources', () => {
  const entities = [
    entity(E1, [source(V1, 10)]),
    entity(E2, [source(V2, 10)]),
    entity(E4, [ground(G1)])
  ];
  const electrical = documentWith([
    wire(ref(E1, V1, 'positive'), ref(E2, V2, 'positive')),
    wire(ref(E1, V1, 'negative'), ref(E4, G1, 'g')),
    wire(ref(E2, V2, 'negative'), ref(E4, G1, 'g'))
  ]);
  const { netlistResult } = solve(entities, electrical);
  assert.equal(netlistResult.ok, false);
  if (!netlistResult.ok) {
    assert.ok(netlistResult.diagnostics.some((diagnostic) => diagnostic.code === 'ELECTRICAL_PARALLEL_SOURCES'));
  }
});

test('disabled components are ignored by the solver', () => {
  const entities = [
    entity(E1, [source(V1, 10)]),
    entity(E2, [resistor(R1, 100)]),
    entity(E3, [resistor(R2, 100, false)]),
    entity(E4, [ground(G1)])
  ];
  const { netlistResult, solveResult } = solve(entities, seriesDocument());
  assert.equal(netlistResult.ok, true);
  assert.ok(solveResult?.ok);
  if (!solveResult?.ok) return;

  const r2 = solveResult.solution.components.find((component) => component.componentId === R2);
  assert.equal(r2?.status, 'disabled');
  const r1 = solveResult.solution.components.find((component) => component.componentId === R1);
  assert.ok(Math.abs(r1?.current ?? 1) < 1e-12);
});

test('solver output is deterministic', () => {
  const first = solve(seriesEntities(), seriesDocument());
  const second = solve(seriesEntities(), seriesDocument());
  assert.deepEqual(first.solveResult, second.solveResult);
});

test('empty electrical document is valid and creates no nets', () => {
  const result = validateElectricalDocument(createEmptyElectricalDocument(), []);
  assert.ok(result.value);
  assert.equal(result.value.wires.length, 0);
  const netlist = buildNetlist([], result.value);
  assert.equal(netlist.ok, true);
  if (netlist.ok) {
    assert.equal(netlist.netlist.nets.length, 0);
    const solution = solveCircuit(netlist.netlist);
    assert.equal(solution.ok, true);
  }
});

test('project round-trip preserves the electrical section', () => {
  const entities = seriesEntities();
  const electrical = seriesDocument();
  const project = {
    format: 'simuforge.project' as const,
    schemaVersion: 1 as const,
    project: {
      id: '99999999-9999-4999-8999-999999999999',
      name: 'Circuit',
      createdAt: '2026-11-06T00:00:00.000Z',
      updatedAt: '2026-11-06T00:00:00.000Z'
    },
    world: { format: 'simuforge.world' as const, schemaVersion: 1 as const, entities },
    electrical
  };

  const parsed = parseProjectDocument(serializeProjectDocument(project));
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.value.electrical, electrical);
  }
});

test('a project without electrical data stays valid and omits the section', () => {
  const parsed = parseProjectDocument(
    serializeProjectDocument({
      format: 'simuforge.project',
      schemaVersion: 1,
      project: {
        id: '99999999-9999-4999-8999-999999999999',
        name: 'Plain',
        createdAt: '2026-11-06T00:00:00.000Z',
        updatedAt: '2026-11-06T00:00:00.000Z'
      },
      world: { format: 'simuforge.world', schemaVersion: 1, entities: [] }
    })
  );
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.electrical, undefined);
  }
});
