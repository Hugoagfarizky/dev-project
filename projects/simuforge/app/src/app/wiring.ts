import type { StudioStore } from '../editor/store.js';
import type { RendererPort } from '../renderer/RendererPort.js';
import type { StudioState } from '../editor/state.js';

export function connectRendererToStore(
  store: StudioStore,
  renderer: RendererPort,
  options?: { onError?: (error: { code: string; message: string }) => void }
): () => void {
  renderer.setEventSink({
    onPick(entityId) {
      store.dispatch({ type: 'selection/set', id: entityId });
    },
    onTransformPreview(_id, _transform) {
      // Preview is transient and must not mutate authoritative world state
      // or dirty state (OD-I06-03). The viewport mesh already moves during
      // the gizmo drag; world state updates only on commit.
    },
    onTransformCommit(id, transform) {
      store.dispatch({ type: 'transform/set', id, transform, source: 'gizmo' });
    },
    onCameraChange(pose) {
      store.dispatch({ type: 'camera/set', pose });
    },
    onError(error) {
      options?.onError?.(error);
    }
  });

  const unsubscribe = store.subscribe(() => {
    const state: StudioState = store.getSnapshot();
    renderer.applyWorld(state.project.world);
    renderer.applySelection(state.editor.selectedEntityId);
    renderer.applyGizmoMode(state.editor.gizmoMode);
    renderer.applyGridVisible(state.editor.gridVisible);
    if (state.editor.camera === null) {
      renderer.resetCamera();
    }
  });

  const state = store.getSnapshot();
  renderer.applyWorld(state.project.world);
  renderer.applySelection(state.editor.selectedEntityId);
  renderer.applyGizmoMode(state.editor.gizmoMode);
  renderer.applyGridVisible(state.editor.gridVisible);

  return unsubscribe;
}
