import { buildNetlist } from '../electrical/netlist.ts';
import { solveCircuit } from '../electrical/solver.ts';
import type { CircuitSolution } from '../electrical/solver.ts';
import { MAX_SOURCE_VOLTAGE } from '../electrical/types.ts';
import type { ElectricalDiagnostic, ElectricalDocument } from '../electrical/types.ts';
import { isElectricalComponentType, isSwitchComponent, isVoltageSourceComponent } from '../world/components.ts';
import type { WorldEntity } from '../world/types.ts';

/**
 * Phase 08 electrical runtime adapter.
 *
 * This module is pure: it never imports React, React Flow, Babylon, or browser
 * globals, and it never mutates authored entities. Runtime switch states and
 * source voltages are transient overrides applied to a cloned view of the world
 * before solving, so authored values are never rewritten by simulation.
 */

/** Runtime overrides keyed by `entityId/componentId`. */
export interface ElectricalOverrides {
  switchStates: Record<string, boolean>;
  sourceVoltages: Record<string, number>;
}

export type ElectricalSolveStatus = 'idle' | 'solved' | 'invalid';

export type ElectricalSolveOutcome =
  | { status: 'idle'; solution: null; diagnostics: readonly ElectricalDiagnostic[] }
  | { status: 'solved'; solution: CircuitSolution; diagnostics: readonly ElectricalDiagnostic[] }
  | { status: 'invalid'; solution: null; diagnostics: readonly ElectricalDiagnostic[] };

export function electricalOverrideKey(entityId: string, componentId: string): string {
  return `${entityId}/${componentId}`;
}

export function emptyElectricalOverrides(): ElectricalOverrides {
  return { switchStates: {}, sourceVoltages: {} };
}

/**
 * Seeds runtime overrides from authored component values so the runtime state is
 * self-contained and the Circuit tab can show live switch/source values.
 */
export function collectAuthoredElectricalOverrides(
  entities: readonly WorldEntity[]
): ElectricalOverrides {
  const switchStates: Record<string, boolean> = {};
  const sourceVoltages: Record<string, number> = {};

  for (const entity of entities) {
    for (const component of entity.components ?? []) {
      if (isSwitchComponent(component)) {
        switchStates[electricalOverrideKey(entity.id, component.id)] = component.closed;
      } else if (isVoltageSourceComponent(component)) {
        sourceVoltages[electricalOverrideKey(entity.id, component.id)] = component.voltage;
      }
    }
  }

  return { switchStates, sourceVoltages };
}

/**
 * Returns a world view with runtime overrides applied. Untouched entities and
 * components keep their identity, so callers can cheaply detect no-op solves.
 */
export function applyElectricalOverrides(
  entities: readonly WorldEntity[],
  overrides: ElectricalOverrides
): readonly WorldEntity[] {
  const hasSwitchOverrides = Object.keys(overrides.switchStates).length > 0;
  const hasSourceOverrides = Object.keys(overrides.sourceVoltages).length > 0;
  if (!hasSwitchOverrides && !hasSourceOverrides) {
    return entities;
  }

  return entities.map((entity) => {
    if (!entity.components || entity.components.length === 0) {
      return entity;
    }
    let changed = false;
    const components = entity.components.map((component) => {
      const key = electricalOverrideKey(entity.id, component.id);
      if (isSwitchComponent(component)) {
        const closed = overrides.switchStates[key];
        if (closed !== undefined && closed !== component.closed) {
          changed = true;
          return { ...component, closed };
        }
        return component;
      }
      if (isVoltageSourceComponent(component)) {
        const voltage = overrides.sourceVoltages[key];
        if (voltage !== undefined && voltage !== component.voltage) {
          changed = true;
          return { ...component, voltage };
        }
      }
      return component;
    });
    return changed ? { ...entity, components } : entity;
  });
}

export function hasElectricalComponents(entities: readonly WorldEntity[]): boolean {
  return entities.some((entity) =>
    (entity.components ?? []).some((component) => isElectricalComponentType(component.type))
  );
}

/** Phase 08 graph action: open/close a switch or set a source voltage. */
export type ElectricalAction =
  | { kind: 'switch'; entityId: string; componentId: string; closed: boolean }
  | { kind: 'sourceVoltage'; entityId: string; componentId: string; voltage: number };

export type ElectricalActionFailure = 'target' | 'value';

export type ElectricalActionResult =
  | { ok: true; overrides: ElectricalOverrides }
  | { ok: false; reason: ElectricalActionFailure; message: string };

/**
 * Applies one graph electrical action to a clone-on-write override map. Returns
 * the same overrides object when the value is unchanged, so callers can skip a
 * redundant re-solve. Authored components are never mutated.
 */
export function applyElectricalAction(
  entities: readonly WorldEntity[],
  overrides: ElectricalOverrides,
  action: ElectricalAction
): ElectricalActionResult {
  const entity = entities.find((item) => item.id === action.entityId);
  if (!entity) {
    return {
      ok: false,
      reason: 'target',
      message: `Entity ${action.entityId} does not exist.`
    };
  }

  const component = (entity.components ?? []).find((item) => item.id === action.componentId);
  if (!component) {
    return {
      ok: false,
      reason: 'target',
      message: `Component ${action.componentId} does not exist on entity ${action.entityId}.`
    };
  }
  if (!component.enabled) {
    return {
      ok: false,
      reason: 'target',
      message: `Component ${action.componentId} is disabled.`
    };
  }

  const key = electricalOverrideKey(action.entityId, action.componentId);

  if (action.kind === 'switch') {
    if (!isSwitchComponent(component)) {
      return {
        ok: false,
        reason: 'target',
        message: `Component ${action.componentId} is not a switch.`
      };
    }
    const current = overrides.switchStates[key] ?? component.closed;
    if (current === action.closed) {
      return { ok: true, overrides };
    }
    return {
      ok: true,
      overrides: {
        switchStates: { ...overrides.switchStates, [key]: action.closed },
        sourceVoltages: overrides.sourceVoltages
      }
    };
  }

  if (!isVoltageSourceComponent(component)) {
    return {
      ok: false,
      reason: 'target',
      message: `Component ${action.componentId} is not a voltage source.`
    };
  }
  if (!Number.isFinite(action.voltage) || Math.abs(action.voltage) > MAX_SOURCE_VOLTAGE) {
    return {
      ok: false,
      reason: 'value',
      message: `Voltage must be finite and within ±${MAX_SOURCE_VOLTAGE} V.`
    };
  }
  const current = overrides.sourceVoltages[key] ?? component.voltage;
  if (current === action.voltage) {
    return { ok: true, overrides };
  }
  return {
    ok: true,
    overrides: {
      switchStates: overrides.switchStates,
      sourceVoltages: { ...overrides.sourceVoltages, [key]: action.voltage }
    }
  };
}

/**
 * Builds the DC netlist and solves it. Invalid authored circuits return
 * `invalid` with diagnostics instead of throwing, so Play stays available
 * (D-P08-06). Unexpected exceptions are the caller's responsibility: the
 * reducer converts them into a paused runtime failure.
 */
export function solveElectricalCircuit(
  entities: readonly WorldEntity[],
  electrical: ElectricalDocument | null | undefined,
  overrides: ElectricalOverrides
): ElectricalSolveOutcome {
  if (!hasElectricalComponents(entities)) {
    return { status: 'idle', solution: null, diagnostics: [] };
  }

  const netlistResult = buildNetlist(applyElectricalOverrides(entities, overrides), electrical);
  if (!netlistResult.ok) {
    return { status: 'invalid', solution: null, diagnostics: netlistResult.diagnostics };
  }

  const solveResult = solveCircuit(netlistResult.netlist);
  if (!solveResult.ok) {
    return { status: 'invalid', solution: null, diagnostics: solveResult.diagnostics };
  }

  return { status: 'solved', solution: solveResult.solution, diagnostics: [] };
}
