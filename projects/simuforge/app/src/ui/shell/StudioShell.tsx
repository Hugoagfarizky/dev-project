import { useEffect, useState } from 'react';
import { TopBar } from './TopBar';
import { StatusBar } from './StatusBar';
import { Splitter } from './Splitter';
import { Panel } from './Panel';
import { computeLayout, type StudioPreset } from './computeLayout';
import '../../styles/shell.css';

const initialCollapsed = {
  assets: false,
  monitor: true,
  program: true,
  console: true
};

export function StudioShell() {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight
  }));
  const [preset, setPreset] = useState<StudioPreset>('build');
  const [userCollapsed, setUserCollapsed] = useState(initialCollapsed);

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const layout = computeLayout({ width: viewport.width, height: viewport.height, preset });

  const collapsed = {
    assets: userCollapsed.assets || layout.collapsed.assets,
    monitor: userCollapsed.monitor || layout.collapsed.monitor,
    program: userCollapsed.program || layout.collapsed.program,
    console: userCollapsed.console || layout.collapsed.console
  };

  function togglePanel(panel: keyof typeof userCollapsed) {
    setUserCollapsed((previous) => ({ ...previous, [panel]: !previous[panel] }));
  }

  if (layout.tooSmall) {
    return (
      <div className="sf-shell sf-shell-too-small">
        <TopBar compact={true} preset={preset} onPresetChange={setPreset} />
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
      <TopBar compact={layout.compact} preset={preset} onPresetChange={setPreset} />

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
          <Panel title="World Hierarchy" summary="0 objects">
            <div className="sf-panel-empty">No objects yet</div>
          </Panel>
          <Splitter orientation="horizontal" />
          <Panel title="Asset Library" collapsed={collapsed.assets} onToggle={() => togglePanel('assets')} summary="3 primitives">
            <div className="sf-panel-empty">Cube, Sphere, Plane</div>
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
            <div className="sf-viewport-placeholder">Viewport</div>
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
          <Panel title="Inspector" summary="No selection">
            <div className="sf-panel-empty">Nothing selected</div>
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
    </div>
  );
}
