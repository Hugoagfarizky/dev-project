import type { StudioStore } from '../../editor/store.js';

export type PrimitiveType = 'cube' | 'sphere' | 'plane';

export interface PrimitiveAction {
  type: PrimitiveType;
  label: string;
  glyph: string;
}

export const PRIMITIVE_ACTIONS: readonly PrimitiveAction[] = [
  { type: 'cube', label: 'Cube', glyph: '■' },
  { type: 'sphere', label: 'Sphere', glyph: '●' },
  { type: 'plane', label: 'Plane', glyph: '▬' }
];

export function createPrimitive(store: StudioStore, entityType: PrimitiveType): void {
  store.dispatch({ type: 'entity/create', entityType });
}
