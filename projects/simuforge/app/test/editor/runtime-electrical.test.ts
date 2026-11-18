import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reduceStudioState, type ReducerContext } from '../../src/editor/reducer.ts';
import {
  createDefaultEditorState,
  createDefaultPersistenceState,
  createDefaultRuntimeState
} from '../../src/editor/state.ts';
import type { StudioState } from '../../src/editor/state.ts';
import type { Component, WorldEntity } from '../../src/world/types.ts';
import type { ElectricalDocument, TerminalRef, Wire } from '../../src/electrical/types.ts';
import { ELECTRICAL_FORMAT, ELECTRICAL_SCHEMA_VERSION } from '../../src/electrical/types.ts';
import {
  selectEffectiveSourceVoltage,
  selectEffectiveSwitchClosed,
  selectElectricalComponentResult
} from '../../src/editor/selectors.ts';

const SOURCE_ENTITY = '11111111-1111-4111-8111-111111111111';
const RESISTOR_ENTITY = '33333333-3333-4333-8333-333333333333';
const SWITCH_ENTITY = '44444444-4444-4444-8444-444444444444';
const GROUND_ENTITY = '55555555-5555-4555-8555-555555555555';

const V1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const R1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const S1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const G1 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

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

function ref(entityId: string, componentId: string, terminalId: string): TerminalRef {
  return { entityId, componentId, terminalId };
}

let wireCounter = 0;

function wire(from: TerminalRef, to: TerminalRef): Wire {
  wireCounter += 1;
  return {
    id: `00000000-0000-4000-8000-${wireCounter.toString(16).padStart(12, '0')}`,
    from,
    to
  };
}

function electrical(wires: Wire[]): ElectricalDocument {
  return {
    format: ELECTRICAL_FORMAT,
    schemaVersion: ELECTRICAL_SCHEMA_VERSION,
    wires,
    layout: []
  };
}

function context(): ReducerContext {
  let tick = 0;
  let index = 0;
  return {
    idFactory: () => `log-${++index}`,
    clock: () => '2026-11-18T00:00:00.000Z',
    now: () => {
      tick += 1;
      return tick;
    }
  };
}

interface CircuitOptions {
  withGround?: boolean;
  switchClosed?: boolean;
}

function circuitState(options: CircuitOptions = {}): StudioState {
  const { withGround = true, switchClosed = true } = options;
  const entities: WorldEntity[] = [
    entity(SOURCE_ENTITY, [{ id: V1, type: 'voltageSource', enabled: true, voltage: 10 }]),
    entity(RESISTOR_ENTITY, [{ id: R1, type: 'resistor', enabled: true, resistance: 100 }]),
    entity(SWITCH_ENTITY, [{ id: S1, type: 'switch', enabled: true, closed: switchClosed }])
  ];
  const wires: Wire[] = [
    wire(ref(SOURCE_ENTITY, V1, 'positive'), ref(RESISTOR_ENTITY, R1, 'a')),
    wire(ref(RESISTOR_ENTITY, R1, 'b'), ref(SWITCH_ENTITY, S1, 'a')),
    wire(ref(SOURCE_ENTITY, V1, 'negative'), withGround ? ref(GROUND_ENTITY, G1, 'g') : ref(SWITCH_ENTITY, S1, 'b'))
  ];
  if (withGround) {
    entities.push(entity(GROUND_ENTITY, [{ id: G1, type: 'ground', enabled: true }]));
    wires.push(wire(ref(SWITCH_ENTITY, S1, 'b'), ref(GROUND_ENTITY, G1, 'g')));
  }

  return {
    project: {
      format: 'simuforge.project',
      schemaVersion: 1,
      project: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Circuit',
        createdAt: '2026-11-18T00:00:00.000Z',
        updatedAt: '2026-11-18T00:00:00.000Z'
      },
      world: { format: 'simuforge.world', schemaVersion: 1, entities },
      electrical: electrical(wires)
    },
    editor: createDefaultEditorState(),
    persistence: createDefaultPersistenceState(),
    logs: [],
    runtime: createDefaultRuntimeState()
  };
}

function plainState(): StudioState {
  const state = circuitState();
  return {
    ...state,
    project: {
      ...state.project,
      world: { format: 'simuforge.world', schemaVersion: 1, entities: [entity(SOURCE_ENTITY, [])] },
      electrical: null
    }
  };
}

function play(state: StudioState, ctx: ReducerContext = context()): StudioState {
  return reduceStudioState(state, { type: 'runtime/play' }, ctx);
}

function codes(state: StudioState): string[] {
  return state.logs.map((entry) => entry.code ?? '');
}

function componentResult(state: StudioState, componentId: string) {
  return state.runtime.electrical.solution?.components.find(
    (result) => result.componentId === componentId
  ) ?? null;
}

test('Play solves a valid DC circuit and seeds runtime overrides', () => {
  const played = play(circuitState());
  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.electrical.status, 'solved');
  assert.equal(played.runtime.electrical.solveCount, 1);

  const resistor = componentResult(played, R1);
  assert.ok(resistor);
  assert.ok(Math.abs((resistor.current ?? 0) - 0.1) < 1e-9);
  assert.ok(Math.abs((resistor.power ?? 0) - 1) < 1e-9);

  assert.equal(played.runtime.electrical.switchStates[`${SWITCH_ENTITY}/${S1}`], true);
  assert.equal(played.runtime.electrical.sourceVoltages[`${SOURCE_ENTITY}/${V1}`], 10);
  assert.ok(codes(played).includes('ELECTRICAL_SOLVED'));
});

test('Play with an invalid circuit warns, disables solving, and keeps running', () => {
  const played = play(circuitState({ withGround: false }));
  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.electrical.status, 'invalid');
  assert.equal(played.runtime.electrical.solution, null);
  assert.ok(played.runtime.electrical.diagnostics.length > 0);
  assert.ok(codes(played).includes('ELECTRICAL_NO_GROUND'));
  const warning = played.logs.find((entry) => entry.code === 'ELECTRICAL_NO_GROUND');
  assert.equal(warning?.severity, 'warn');
  assert.equal(warning?.source, 'ELECTRICAL');
});

test('Play without electrical components keeps the electrical slice idle', () => {
  const played = play(plainState());
  assert.equal(played.runtime.status, 'running');
  assert.equal(played.runtime.electrical.status, 'idle');
  assert.equal(played.runtime.electrical.solveCount, 0);
  assert.equal(played.logs.some((entry) => entry.source === 'ELECTRICAL'), false);
});

test('opening a switch re-solves without mutating the authored component', () => {
  const ctx = context();
  const played = play(circuitState(), ctx);
  const toggled = reduceStudioState(
    played,
    { type: 'runtime/set-switch', entityId: SWITCH_ENTITY, componentId: S1, closed: false },
    ctx
  );

  assert.equal(toggled.runtime.electrical.status, 'solved');
  assert.equal(toggled.runtime.electrical.solveCount, 2);
  const resistor = componentResult(toggled, R1);
  assert.ok(Math.abs(resistor?.current ?? 1) < 1e-12);
  const switchResult = componentResult(toggled, S1);
  assert.equal(switchResult?.status, 'open');
  assert.ok(Math.abs((switchResult?.voltage ?? 0) - 10) < 1e-9);

  const authored = toggled.project.world.entities
    .find((item) => item.id === SWITCH_ENTITY)
    ?.components?.find((item) => item.id === S1);
  assert.equal((authored as { closed?: boolean }).closed, true);
  assert.equal(toggled.runtime.electrical.switchStates[`${SWITCH_ENTITY}/${S1}`], false);
});

test('setting a runtime source voltage re-solves with the override', () => {
  const ctx = context();
  const played = play(circuitState(), ctx);
  const changed = reduceStudioState(
    played,
    { type: 'runtime/set-source-voltage', entityId: SOURCE_ENTITY, componentId: V1, voltage: 20 },
    ctx
  );

  const resistor = componentResult(changed, R1);
  assert.ok(Math.abs((resistor?.current ?? 0) - 0.2) < 1e-9);
  const authored = changed.project.world.entities
    .find((item) => item.id === SOURCE_ENTITY)
    ?.components?.find((item) => item.id === V1);
  assert.equal((authored as { voltage?: number }).voltage, 10);
});

test('runtime electrical commands are ignored while editing', () => {
  const state = circuitState();
  const ctx = context();
  assert.equal(
    reduceStudioState(state, { type: 'runtime/set-switch', entityId: SWITCH_ENTITY, componentId: S1, closed: false }, ctx),
    state
  );
  assert.equal(
    reduceStudioState(state, { type: 'runtime/set-source-voltage', entityId: SOURCE_ENTITY, componentId: V1, voltage: 20 }, ctx),
    state
  );
});

test('runtime electrical commands reject non-electrical and invalid values', () => {
  const ctx = context();
  const played = play(circuitState(), ctx);
  assert.equal(
    reduceStudioState(played, { type: 'runtime/set-switch', entityId: RESISTOR_ENTITY, componentId: R1, closed: false }, ctx),
    played
  );
  assert.equal(
    reduceStudioState(played, { type: 'runtime/set-source-voltage', entityId: SOURCE_ENTITY, componentId: V1, voltage: Number.NaN }, ctx),
    played
  );
});

test('Reset restores authored overrides and re-solves', () => {
  const ctx = context();
  const played = play(circuitState(), ctx);
  const toggled = reduceStudioState(
    played,
    { type: 'runtime/set-switch', entityId: SWITCH_ENTITY, componentId: S1, closed: false },
    ctx
  );
  const reset = reduceStudioState(toggled, { type: 'runtime/reset' }, ctx);

  assert.equal(reset.runtime.electrical.status, 'solved');
  assert.equal(reset.runtime.electrical.switchStates[`${SWITCH_ENTITY}/${S1}`], true);
  assert.equal(reset.runtime.electrical.solveCount, 1);
  const resistor = componentResult(reset, R1);
  assert.ok(Math.abs((resistor?.current ?? 0) - 0.1) < 1e-9);
});

test('Stop clears transient electrical state', () => {
  const played = play(circuitState());
  const stopped = reduceStudioState(played, { type: 'runtime/stop' }, context());
  assert.equal(stopped.runtime.electrical.status, 'idle');
  assert.equal(stopped.runtime.electrical.solution, null);
  assert.deepEqual(stopped.runtime.electrical.switchStates, {});
});

test('an invalid runtime change preserves the last valid solution and keeps running', () => {
  const base = circuitState();
  // Replace the series wiring with a dangling switch: source -> resistor ->
  // ground, plus a switch whose second terminal connects to nothing. Opening it
  // creates an isolated net, which is invalid but must not discard the solution.
  const dangling: StudioState = {
    ...base,
    project: {
      ...base.project,
      electrical: electrical([
        wire(ref(SOURCE_ENTITY, V1, 'positive'), ref(RESISTOR_ENTITY, R1, 'a')),
        wire(ref(RESISTOR_ENTITY, R1, 'b'), ref(GROUND_ENTITY, G1, 'g')),
        wire(ref(SOURCE_ENTITY, V1, 'negative'), ref(GROUND_ENTITY, G1, 'g')),
        wire(ref(RESISTOR_ENTITY, R1, 'b'), ref(SWITCH_ENTITY, S1, 'a'))
      ])
    }
  };

  const ctx = context();
  const played = play(dangling, ctx);
  assert.equal(played.runtime.electrical.status, 'solved');
  const before = componentResult(played, R1);
  assert.ok(before);

  const toggled = reduceStudioState(
    played,
    { type: 'runtime/set-switch', entityId: SWITCH_ENTITY, componentId: S1, closed: false },
    ctx
  );
  assert.equal(toggled.runtime.status, 'running');
  assert.equal(toggled.runtime.electrical.status, 'invalid');
  assert.deepEqual(toggled.runtime.electrical.solution, played.runtime.electrical.solution);
  assert.ok(codes(toggled).includes('ELECTRICAL_FLOATING_NET'));
});

test('an unexpected solver exception pauses and preserves the last valid solution', () => {
  const ctx = context();
  const played = play(circuitState(), ctx);
  const before = played.runtime.electrical.solution;
  assert.ok(before);

  const throwing: Component = {
    id: R1,
    type: 'resistor',
    enabled: true,
    get resistance(): number {
      throw new Error('boom');
    }
  } as Component;
  const broken: StudioState = {
    ...played,
    project: {
      ...played.project,
      world: {
        ...played.project.world,
        entities: played.project.world.entities.map((item) =>
          item.id === RESISTOR_ENTITY ? { ...item, components: [throwing] } : item
        )
      }
    }
  };

  const failed = reduceStudioState(
    broken,
    { type: 'runtime/set-switch', entityId: SWITCH_ENTITY, componentId: S1, closed: false },
    ctx
  );

  assert.equal(failed.runtime.status, 'paused');
  assert.equal(failed.runtime.electrical.status, 'failed');
  assert.deepEqual(failed.runtime.electrical.solution, before);
  assert.equal(failed.runtime.lastError?.code, 'ELECTRICAL_SOLVE_FAILED');
  const error = failed.logs.find((entry) => entry.code === 'ELECTRICAL_SOLVE_FAILED');
  assert.equal(error?.severity, 'error');
  assert.match(error?.message ?? '', /boom/);
});

test('selectors expose live switch, source, and component values', () => {
  const ctx = context();
  const played = play(circuitState(), ctx);
  assert.equal(selectEffectiveSwitchClosed(played, SWITCH_ENTITY, S1), true);
  assert.equal(selectEffectiveSourceVoltage(played, SOURCE_ENTITY, V1), 10);
  assert.ok(Math.abs((selectElectricalComponentResult(played, RESISTOR_ENTITY, R1)?.current ?? 0) - 0.1) < 1e-9);

  const changed = reduceStudioState(
    played,
    { type: 'runtime/set-source-voltage', entityId: SOURCE_ENTITY, componentId: V1, voltage: 5 },
    ctx
  );
  assert.equal(selectEffectiveSourceVoltage(changed, SOURCE_ENTITY, V1), 5);
  assert.equal(selectEffectiveSwitchClosed(played, SOURCE_ENTITY, V1), null);
});
