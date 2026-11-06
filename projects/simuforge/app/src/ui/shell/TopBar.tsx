interface TopBarProps {
  compact?: boolean;
  preset: 'build' | 'program' | 'simulate';
  onPresetChange: (preset: 'build' | 'program' | 'simulate') => void;
}

const presets: Array<'build' | 'program' | 'simulate'> = ['build', 'program', 'simulate'];

export function TopBar({ compact = false, preset, onPresetChange }: TopBarProps) {
  return (
    <header className={`sf-topbar ${compact ? 'sf-topbar-compact' : ''}`.trim()}>
      <div className="sf-brand">
        <span className="sf-brand-mark" aria-hidden="true">SF</span>
        {!compact ? (
          <div>
            <div className="sf-brand-name">SimuForge</div>
            <div className="sf-brand-tag">Build. Program. Simulate.</div>
          </div>
        ) : null}
      </div>

      <nav className="sf-menu" aria-label="Main menu">
        <button type="button" className="sf-menu-item">File</button>
        <button type="button" className="sf-menu-item">Edit</button>
        <button type="button" className="sf-menu-item">View</button>
      </nav>

      <div className="sf-project">
        <span className="sf-project-name">Untitled Simulation</span>
        {!compact ? <span className="sf-project-meta">Not saved</span> : null}
      </div>

      <div className="sf-top-center">
        <div className="sf-preset" role="group" aria-label="Layout preset">
          {presets.map((item) => (
            <button
              key={item}
              type="button"
              className={`sf-preset-btn ${preset === item ? 'active' : ''}`}
              onClick={() => onPresetChange(item)}
              aria-pressed={preset === item}
            >
              {compact ? item.charAt(0).toUpperCase() : item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <span className="sf-state-pill" aria-label="Runtime state">Editing</span>
      </div>

      <div className="sf-top-right">
        <span className="sf-save-state">Not saved</span>
      </div>
    </header>
  );
}
