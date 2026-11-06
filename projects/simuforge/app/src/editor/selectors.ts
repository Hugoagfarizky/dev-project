import type { StudioState } from './state.ts';
import type { WorldEntity } from '../world/types.ts';

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

export function selectIsDirty(state: StudioState): boolean {
  return state.persistence.revision !== state.persistence.savedRevision;
}

export function selectSaveStatus(state: StudioState): StudioState['persistence']['status'] {
  return state.persistence.status;
}
