import type { StudioStore } from '../editor/store.js';
import type { RendererPort } from '../renderer/RendererPort.js';
import type { StudioState } from '../editor/state.js';

export function connectRendererToStore(store: StudioStore, renderer: RendererPort): () => void {
  renderer.setEventSink({
    onPick(entityId) {
      store.dispatch({ type: 'selection/set', id: entityId });
    },
    onTransformPreview(id, transform) {
      store.dispatch({ type: 'transform/set', id, transform, source: 'gizmo' });
    },
    onTransformCommit(id, transform) {
      store.dispatch({ type: 'transform/set', id, transform, source: 'gizmo' });
    },
    onCameraChange(pose) {
      store.dispatch({ type: 'camera/set', pose });
    },
    onError(error) {
      // The viewport surface owns fallback presentation; diagnostics remain available.
      void error;
    }
  });

  const unsubscribe = store.subscribe(() => {
    const state: StudioState = store.getSnapshot();
    renderer.applyWorld(state.project.world);
    renderer.applySelection(state.editor.selectedEntityId);
    renderer.applyGizmoMode(state.editor.gizmoMode);
    renderer.applyGridVisible(state.editor.gridVisible);
  });

  const state = store.getSnapshot();
  renderer.applyWorld(state.project.world);
  renderer.applySelection(state.editor.selectedEntityId);
  renderer.applyGizmoMode(state.editor.gizmoMode);
  renderer.applyGridVisible(state.editor.gridVisible);

  return unsubscribe;
}
