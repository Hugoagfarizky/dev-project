import type { StudioState } from './state.ts';
import type { WorldDocument, WorldEntity } from '../world/types.ts';
import type { ComponentResult } from '../electrical/solver.ts';
import { electricalOverrideKey } from '../runtime/electrical.ts';
import { isSwitchComponent, isVoltageSourceComponent } from '../world/components.ts';

export function selectWorld(state: StudioState): WorldDocument {
  return state.project.world;
}

export function selectEntities(state: StudioState): readonly WorldEntity[] {
  return state.project.world.entities;
}

/**
 * World as it should be rendered. While running/paused, runtime body transforms
 * overlay the authored transforms so simulation never mutates authored state.
 */
export function selectRenderWorld(state: StudioState): WorldDocument {
  const bodies = state.runtime.bodies;
  if (state.runtime.status === 'editing' || Object.keys(bodies).length === 0) {
    return state.project.world;
  }
  return {
    ...state.project.world,
    entities: state.project.world.entities.map((entity) => {
      const body = bodies[entity.id];
      return body ? { ...entity, transform: body.transform } : entity;
    })
  };
}

export function selectSelectedEntityId(state: StudioState): string | null {
  return state.editor.selectedEntityId;
}

export function selectSelectedEntity(state: StudioState): WorldEntity | null {
  const selectedId = state.editor.selectedEntityId;
  if (selectedId === null) {
    return null;
  }
  return state.project.world.entities.find((entity) => entity.id === selectedId) ?? null;
}

export function selectEntityCount(state: StudioState): number {
  return state.project.world.entities.length;
}

export function selectIsWorldEmpty(state: StudioState): boolean {
  return state.project.world.entities.length === 0;
}

export function selectGizmoMode(state: StudioState): StudioState['editor']['gizmoMode'] {
  return state.editor.gizmoMode;
}

export function selectGridVisible(state: StudioState): boolean {
  return state.editor.gridVisible;
}

export function selectActivePreset(state: StudioState): StudioState['editor']['activePreset'] {
  return state.editor.activePreset;
}

export function selectIsDirty(state: StudioState): boolean {
  return state.persistence.revision !== state.persistence.savedRevision;
}

export function selectSaveStatus(state: StudioState): StudioState['persistence']['status'] {
  return state.persistence.status;
}

export function selectLogs(state: StudioState): StudioState['logs'] {
  return state.logs;
}

export function selectRuntimeStatus(state: StudioState): StudioState['runtime']['status'] {
  return state.runtime.status;
}

export function selectGraph(state: StudioState): StudioState['graph'] {
  return state.graph ?? null;
}

export function selectSelectedGraphNodeId(state: StudioState): string | null {
  return state.editor.selectedGraphNodeId ?? null;
}

export function selectRuntimeBodies(state: StudioState): StudioState['runtime']['bodies'] {
  return state.runtime.bodies;
}

export function selectRuntimeExecution(state: StudioState): StudioState['runtime']['execution'] {
  return state.runtime.execution;
}

export function selectExecutionStatus(state: StudioState): StudioState['runtime']['execution']['status'] {
  return state.runtime.execution.status;
}

export function selectExecutingGraphNodeId(state: StudioState): string | null {
  return state.editor.executingGraphNodeId;
}

export function selectExecutionSequence(state: StudioState): number {
  return state.editor.executionSequence;
}

export function selectSelectedRuntimeBody(state: StudioState): StudioState['runtime']['bodies'][string] | null {
  const selectedId = state.editor.selectedEntityId;
  if (selectedId === null) return null;
  return state.runtime.bodies[selectedId] ?? null;
}

export function selectRuntimeElectrical(state: StudioState): StudioState['runtime']['electrical'] {
  return state.runtime.electrical;
}

export function selectElectricalComponentResult(
  state: StudioState,
  entityId: string,
  componentId: string
): ComponentResult | null {
  return (
    state.runtime.electrical.solution?.components.find(
      (result) => result.entityId === entityId && result.componentId === componentId
    ) ?? null
  );
}

/**
 * Live switch state: the runtime override when simulation is active, otherwise
 * the authored component value.
 */
export function selectEffectiveSwitchClosed(
  state: StudioState,
  entityId: string,
  componentId: string
): boolean | null {
  const entity = state.project.world.entities.find((item) => item.id === entityId);
  const component = entity?.components?.find((item) => item.id === componentId);
  if (!component || !isSwitchComponent(component)) {
    return null;
  }
  if (state.runtime.status === 'editing') {
    return component.closed;
  }
  return state.runtime.electrical.switchStates[electricalOverrideKey(entityId, componentId)] ?? component.closed;
}

/** Live source voltage: runtime override when active, else authored value. */
export function selectEffectiveSourceVoltage(
  state: StudioState,
  entityId: string,
  componentId: string
): number | null {
  const entity = state.project.world.entities.find((item) => item.id === entityId);
  const component = entity?.components?.find((item) => item.id === componentId);
  if (!component || !isVoltageSourceComponent(component)) {
    return null;
  }
  if (state.runtime.status === 'editing') {
    return component.voltage;
  }
  return state.runtime.electrical.sourceVoltages[electricalOverrideKey(entityId, componentId)] ?? component.voltage;
}
