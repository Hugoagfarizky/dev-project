import type { WorldDocument } from '../world/types.js';

export type GizmoMode = 'translate' | 'rotate' | 'scale';

export interface CameraPose {
  alpha: number;
  beta: number;
  radius: number;
  target: { x: number; y: number; z: number };
}

export interface RendererDiagnostics {
  engineVersion: string;
  webGlVersion: number;
  meshCount: number;
  entityCount: number;
  contextLost: boolean;
}

export interface RendererEventSink {
  onPick(entityId: string | null): void;
  onTransformPreview(id: string, transform: import('../world/types.js').Transform): void;
  onTransformCommit(id: string, transform: import('../world/types.js').Transform): void;
  onCameraChange(pose: CameraPose): void;
  onError(error: { code: string; message: string }): void;
}

export interface RendererPort {
  mount(canvas: HTMLCanvasElement): Promise<RendererDiagnostics>;
  dispose(): void;
  resize(width: number, height: number): void;
  applyWorld(world: WorldDocument): void;
  applySelection(entityId: string | null): void;
  applyGizmoMode(mode: GizmoMode): void;
  applyGridVisible(visible: boolean): void;
  setEventSink(sink: RendererEventSink): void;
  frameSelection(entityId: string | null): void;
  frameWorld(): void;
  resetCamera(): void;
  getDiagnostics(): RendererDiagnostics;
  getIsDragging(): boolean;
  cancelGizmoDrag(): void;
}
