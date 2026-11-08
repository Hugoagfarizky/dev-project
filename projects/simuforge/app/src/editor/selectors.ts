import type { StudioState } from './state.ts';
import type { WorldDocument, WorldEntity } from '../world/types.ts';

export function selectWorld(state: StudioState): WorldDocument {
  return state.project.world;
}

export function selectEntities(state: StudioState): readonly WorldEntity[] {
  return state.project.world.entities;
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
