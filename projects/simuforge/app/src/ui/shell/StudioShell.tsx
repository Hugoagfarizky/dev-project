import { useEffect, useRef, useState } from 'react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { Splitter } from './Splitter';
import { Panel } from './Panel';
import { ViewportHost } from '../viewport/ViewportHost.js';
import { ProjectHub } from '../hub/ProjectHub.js';
import { ConsoleDrawer } from '../console/ConsoleDrawer.js';
import { IndexedDbProjectRepository } from '../../storage/IndexedDbProjectRepository.js';
import { LayoutStorage } from '../../storage/LayoutStorage.js';
import { WorldHierarchy } from '../panels/WorldHierarchy.js';
import { AssetLibrary } from '../panels/AssetLibrary.js';
import { Inspector } from '../panels/Inspector.js';
import { Dialog } from '../common/Dialog';
import { Button } from '../common/Button';
import { useStudioStore } from '../hooks/useStore.js';
import { useStudioShortcuts } from '../hooks/useStudioShortcuts.js';
import { useSimulationLoop } from '../hooks/useSimulationLoop.js';
import { selectEntities, selectSelectedEntityId, selectGridVisible, selectLogs, selectRuntimeStatus } from '../../editor/selectors.js';
import { serializeProjectDocument } from '../../project/serialization.js';
import type { ProjectDocument } from '../../project/types.js';
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
  const [showHub, setShowHub] = useState<boolean>(false);
  const repositoryRef = useRef<IndexedDbProjectRepository>(new IndexedDbProjectRepository());
  const layoutStorageRef = useRef<LayoutStorage>(new LayoutStorage());

  const entities = useStudioStore(store, selectEntities);
  const selectedId = useStudioStore(store, selectSelectedEntityId);
  const gridVisible = useStudioStore(store, selectGridVisible);
  const logs = useStudioStore(store, selectLogs);
  const runtimeStatus = useStudioStore(store, selectRuntimeStatus);
  useSimulationLoop(store, runtimeStatus === 'running');
  const autoExpandedRef = useRef(false);
  const rendererRef = useRef<import('../../renderer/RendererPort.js').RendererPort | null>(null);
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
    store.dispatch({ type: 'log/append', entry: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), severity: 'info', source: 'APP', code: 'APP_STARTED', message: 'SimuForge Studio started' } });
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
    isDragging: () => rendererRef.current?.getIsDragging() ?? false,
    cancelDrag: () => rendererRef.current?.cancelGizmoDrag(),
    gridVisible,
    onRename(id) {
      setRenamingId(id);
    },
    onDeleteRequest(id) {
      setDeleteTargetId(id);
    },
    onCancelDialog() {
      setDeleteTargetId(null);
    },
    onSetGizmoMode(mode) {
      store.dispatch({ type: 'gizmo/set-mode', mode });
    },
    onFrameSelection() {
      rendererRef.current?.frameSelection(selectedId);
    },
    onFrameWorld() {
      rendererRef.current?.frameWorld();
    },
    onToggleGrid(visible) {
      store.dispatch({ type: 'grid/set-visible', visible });
    },
    onClearSelection() {
      store.dispatch({ type: 'selection/set', id: null });
    },
    onSave() {
      void handleSave();
    },
    onOpen() {
      setShowHub(true);
    },
    onNewProject() {
      void handleNewProject('Untitled Simulation');
    }
  });

  async function handleNewProject(name: string) {
    store.dispatch({ type: 'project/new', name });
    const state = store.getSnapshot();
    const project = state.project;
    try {
      if (repositoryRef.current.isAvailable()) {
        await repositoryRef.current.save(project);
        layoutStorageRef.current.saveLastProjectId(project.project.id);
      }
    } catch (e) {
      console.error('save failed', e);
    }
    setShowHub(false);
  }

  async function handleOpenProject(project: ProjectDocument) {
    // cancel any active gizmo drag
    rendererRef.current?.cancelGizmoDrag?.();
    store.dispatch({ type: 'project/open', document: project as never });
    layoutStorageRef.current.saveLastProjectId(project.project.id);
    setShowHub(false);
  }

  async function handleImportFile(file: File): Promise<string | null> {
    try {
      const text = await file.text();
      const sizeError = (await import('../../project/validation.js')).checkProjectSize(new TextEncoder().encode(text).length);
      if (sizeError) return sizeError.message;
      const { parseProjectDocument } = await import('../../project/serialization.js');
      const result = parseProjectDocument(text);
      if (!result.ok) {
        store.dispatch({ type: 'log/append', entry: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), severity: 'error', source: 'IMPORT', code: result.error.code ?? 'IMPORT_FAILED', message: result.error.message } });
        return result.error.message;
      }
      rendererRef.current?.cancelGizmoDrag?.();
      store.dispatch({ type: 'project/open', document: result.value });
      if (repositoryRef.current.isAvailable()) {
        await repositoryRef.current.save(result.value);
        layoutStorageRef.current.saveLastProjectId(result.value.project.id);
      }
      setShowHub(false);
      return null;
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e);
      store.dispatch({ type: 'log/append', entry: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), severity: 'error', source: 'IMPORT', code: 'IMPORT_FAILED', message: msg } });
      return msg;
    }
  }

  async function handleSave() {
    const state = store.getSnapshot();
    const project = state.project;
    const now = new Date().toISOString();
    const toSave = { ...project, project: { ...project.project, updatedAt: now } };
    store.dispatch({ type: 'project/save-started' });
    try {
      if (!repositoryRef.current.isAvailable()) {
        store.dispatch({ type: 'project/save-failed', error: { code: 'STORAGE_UNAVAILABLE', message: 'Storage unavailable' } });
        store.dispatch({ type: 'log/append', entry: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), severity: 'error', source: 'APP', code: 'STORAGE_UNAVAILABLE', message: 'Storage unavailable' } });
        return;
      }
      await repositoryRef.current.save(toSave);
      store.dispatch({ type: 'project/save-succeeded', at: now, revision: state.persistence.revision });
      layoutStorageRef.current.saveLastProjectId(toSave.project.id);
    } catch (e) {
      const msg = String((e as { message?: string })?.message ?? e);
      store.dispatch({ type: 'project/save-failed', error: { code: 'STORAGE_WRITE_FAILED', message: msg } });
      store.dispatch({ type: 'log/append', entry: { id: crypto.randomUUID(), timestamp: new Date().toISOString(), severity: 'error', source: 'APP', code: 'STORAGE_WRITE_FAILED', message: msg } });
    }
  }

  function handleExport() {
    const state = store.getSnapshot();
    const json = serializeProjectDocument(state.project);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.project.project.name}.simuforge.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

  useEffect(() => {
    if (autoExpandedRef.current) return;
    const hasError = logs.some((entry) => entry.severity === 'error');
    if (hasError && collapsed.console) {
      autoExpandedRef.current = true;
      togglePanel('console');
    }
  }, [logs, collapsed.console]);

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

  if (showHub) {
    return (
      <div className="sf-shell">
        <ProjectHub
          repository={repositoryRef.current}
          storageAvailable={repositoryRef.current.isAvailable()}
          onOpen={handleOpenProject}
          onNew={handleNewProject}
          onImport={handleImportFile}
        />
      </div>
    );
  }

  if (layout.tooSmall) {
    return (
      <div className="sf-shell sf-shell-too-small">
        <TopBar compact={true} preset={preset} onPresetChange={handlePresetChange} runtimeStatus={runtimeStatus} onPlay={() => store.dispatch({ type: 'runtime/play' })} onPause={() => store.dispatch({ type: 'runtime/pause' })} onStop={() => store.dispatch({ type: 'runtime/stop' })} onReset={() => store.dispatch({ type: 'runtime/reset' })} />
        <div className="sf-window-too-small" role="status">
          <h1>Window too small</h1>
          <p>SimuForge requires a viewport of at least 1024 × 640.</p>
        </div>
        <StatusBar store={store} rendererRef={rendererRef} />
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
      <TopBar compact={layout.compact} preset={preset} onPresetChange={handlePresetChange} runtimeStatus={runtimeStatus} onPlay={() => store.dispatch({ type: 'runtime/play' })} onPause={() => store.dispatch({ type: 'runtime/pause' })} onStop={() => store.dispatch({ type: 'runtime/stop' })} onReset={() => store.dispatch({ type: 'runtime/reset' })} />

      <div className="sf-project-actions" style={{ position: 'absolute', top: 52, right: 8, display: 'flex', gap: 6, zIndex: 10 }}>
        <Button variant="secondary" size="sm" onClick={() => setShowHub(true)}>Project Hub</Button>
        <Button variant="secondary" size="sm" onClick={handleSave}>Save</Button>
        <Button variant="secondary" size="sm" onClick={handleExport}>Export</Button>
      </div>

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
            <ViewportHost store={store} rendererRef={rendererRef} />
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

      <Panel title="Console" collapsed={collapsed.console} onToggle={() => togglePanel('console')} summary="Console">
        <ConsoleDrawer store={store} expanded={!collapsed.console} onToggle={() => togglePanel('console')} />
      </Panel>

      <StatusBar store={store} rendererRef={rendererRef} />

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
