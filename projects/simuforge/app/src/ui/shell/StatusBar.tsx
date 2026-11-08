import { useStudioStore } from '../hooks/useStore.js';
import { selectSelectedEntityId, selectEntities, selectGizmoMode, selectSaveStatus } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';

interface StatusBarProps {
  store: StudioStore;
  rendererRef?: { current: { getDiagnostics?: () => { webGlVersion: number; contextLost: boolean } } | null };
}

export function StatusBar({ store, rendererRef }: StatusBarProps) {
  const selectedId = useStudioStore(store, selectSelectedEntityId);
  const entities = useStudioStore(store, selectEntities);
  const mode = useStudioStore(store, selectGizmoMode);
  const saveStatus = useStudioStore(store, selectSaveStatus);
  const diag = rendererRef?.current?.getDiagnostics?.();
  const webGl = diag ? `WebGL ${diag.webGlVersion}` : 'WebGL';
  const contextLost = diag?.contextLost ? ' (lost)' : '';

  return (
    <footer className="sf-statusbar" aria-label="Status bar">
      <span className="sf-status-item">Selection: {selectedId ? 'Selected' : 'None'}</span>
      <span className="sf-status-item">Entities: {entities.length}</span>
      <span className="sf-status-item">Tool: {mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
      <span className="sf-status-spacer" />
      <span className="sf-status-item">{webGl}{contextLost}</span>
      <span className="sf-status-item">Save: {saveStatus}</span>
    </footer>
  );
}