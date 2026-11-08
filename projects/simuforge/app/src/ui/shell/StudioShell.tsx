import { useEffect, useState } from 'react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { Splitter } from './Splitter';
import { Panel } from './Panel';
import { ViewportHost } from '../viewport/ViewportHost.js';
import { WorldHierarchy } from '../panels/WorldHierarchy.js';
import { AssetLibrary } from '../panels/AssetLibrary.js';
import { Inspector } from '../panels/Inspector.js';
import { Dialog } from '../common/Dialog';
import { useStudioStore } from '../hooks/useStore.js';
import { useStudioShortcuts } from '../hooks/useStudioShortcuts.js';
import { selectEntities, selectSelectedEntityId } from '../../editor/selectors.js';
import { computeLayout, resolveCollapsedPanels, type StudioPreset } from './computeLayout';
import type { StudioStore } from '../../editor/store.js';
import '../../styles/shell.css';

type PanelKey = 'assets' | 'monitor' | 'program' | 'console';
type UserOverride = boolean | null;

const initialUserOverrides: Record<PanelKey, UserOverride> = {
  assets: null,
  monitor: null,
  program: null,
  console: null
};

interface StudioShellProps {
  store: StudioStore;
}

export function StudioShell({ store }: StudioShellProps) {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight
  }));
  const [preset, setPreset] = useState<StudioPreset>('build');
  const [userOverrides, setUserOverrides] = useState<Record<PanelKey, UserOverride>>(initialUserOverrides);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const entities = useStudioStore(store, selectEntities);
  const selectedId = useStudioStore(store, selectSelectedEntityId);
  const selectedEntity = selectedId === null
    ? null
    : entities.find((entity) => entity.id === selectedId) ?? null;
  const deleteTarget = deleteTargetId === null
    ? null
    : entities.find((entity) => entity.id === deleteTargetId) ?? null;

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    if (renamingId !== null && !entities.some((entity) => entity.id === renamingId)) {
      setRenamingId(null);
    }
  }, [entities, renamingId]);

  useEffect(() => {
    if (deleteTargetId !== null && !entities.some((entity) => entity.id === deleteTargetId)) {
      setDeleteTargetId(null);
    }
  }, [entities, deleteTargetId]);

  useStudioShortcuts({
    selectedEntityId: selectedId,
    isRenaming: renamingId !== null,
    isDialogOpen: deleteTargetId !== null,
    onRename(id) {
      setRenamingId(id);
    },
    onDeleteRequest(id) {
      setDeleteTargetId(id);
    },
    onCancelDialog() {
      setDeleteTargetId(null);
    }
  });

  const layout = computeLayout({
    width: viewport.width,
    height: viewport.height,
    preset,
    userOverrides
  });

  const collapsed = resolveCollapsedPanels({
    presetCollapsed: layout.presetCollapsed,
    responsiveCollapsed: layout.responsiveCollapsed,
    userOverrides
  });

  function togglePanel(panel: PanelKey) {
    setUserOverrides((previous) => ({
      ...previous,
      [panel]: !collapsed[panel]
    }));
  }

  function handlePresetChange(nextPreset: StudioPreset) {
    setPreset(nextPreset);
    setUserOverrides({ ...initialUserOverrides });
  }

  function confirmDelete() {
    if (deleteTargetId === null) {
      return;
    }
    store.dispatch({ type: 'entity/delete', id: deleteTargetId });
    if (renamingId === deleteTargetId) {
      setRenamingId(null);
    }
    setDeleteTargetId(null);
  }

  if (layout.tooSmall) {
    return (
      <div className="sf-shell sf-shell-too-small">
        <TopBar compact={true} preset={preset} onPresetChange={handlePresetChange} />
        <div className="sf-window-too-small" role="status">
          <h1>Window too small</h1>
          <p>SimuForge requires a viewport of at least 1024 × 640.</p>
        </div>
        <StatusBar />
      </div>
    );
  }

  return (
    <div
      className="sf-shell"
      style={{
        gridTemplateRows: `48px 1fr ${collapsed.console ? 32 : layout.consoleHeight}px 24px`
      }}
    >
      <TopBar compact={layout.compact} preset={preset} onPresetChange={handlePresetChange} />

      <div
        className="sf-main"
        style={{
          gridTemplateColumns: `${layout.leftWidth}px 1px 1fr 1px ${layout.rightWidth}px`
        }}
      >
        <div
          className={`sf-left-dock ${collapsed.assets ? 'assets-collapsed' : ''}`.trim()}
          style={{
            gridTemplateRows: collapsed.assets ? '1fr 1px 32px' : '1fr 1px 220px'
          }}
        >
          <Panel
            title="World Hierarchy"
            summary={`${entities.length} ${entities.length === 1 ? 'object' : 'objects'}`}
            className="sf-hierarchy-panel"
          >
            <WorldHierarchy
              store={store}
              renamingId={renamingId}
              onStartRename={setRenamingId}
              onFinishRename={() => setRenamingId(null)}
              onRequestDelete={setDeleteTargetId}
            />
          </Panel>
          <Splitter orientation="horizontal" />
          <Panel title="Asset Library" collapsed={collapsed.assets} onToggle={() => togglePanel('assets')} summary="3 primitives">
            <AssetLibrary store={store} />
          </Panel>
        </div>

        <Splitter />

        <div
          className={`sf-center ${collapsed.program ? 'program-strip' : 'program-open'}`.trim()}
          style={{
            gridTemplateRows: collapsed.program
              ? '1fr 1px 32px'
              : `1fr 1px ${layout.programHeight}px`
          }}
        >
          <section className="sf-viewport" aria-label="Viewport">
            <ViewportHost store={store} />
          </section>
          <Splitter orientation="horizontal" />
          <Panel
            title="Program"
            collapsed={collapsed.program}
            onToggle={() => togglePanel('program')}
            summary="Planned"
            className="sf-planned-panel"
          >
            <div className="sf-planned-surface">Planned</div>
          </Panel>
        </div>

        <Splitter />

        <div
          className={`sf-right-dock ${preset === 'simulate' ? 'simulate' : ''}`.trim()}
          style={{
            gridTemplateRows: collapsed.monitor ? '1fr 1px 32px' : '1fr 1px 260px'
          }}
        >
          <Panel
            title="Inspector"
            summary={selectedEntity ? selectedEntity.name : 'No selection'}
            className="sf-inspector-panel"
          >
            <Inspector store={store} />
          </Panel>
          <Splitter orientation="horizontal" />
          <Panel title="Monitor" collapsed={collapsed.monitor} onToggle={() => togglePanel('monitor')} summary="Planned">
            <div className="sf-planned-surface">Planned</div>
          </Panel>
        </div>
      </div>

      <Panel title="Console" collapsed={collapsed.console} onToggle={() => togglePanel('console')} summary="No output">
        <div className="sf-panel-empty">No output yet</div>
      </Panel>

      <StatusBar />

      <Dialog
        open={deleteTarget !== null}
        title="Delete entity"
        tone="danger"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      >
        {deleteTarget ? (
          <p>
            Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
          </p>
        ) : null}
      </Dialog>
    </div>
  );
}
