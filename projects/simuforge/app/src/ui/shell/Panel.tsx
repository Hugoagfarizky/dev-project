import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  summary?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

export function Panel({ title, summary, collapsed = false, onToggle, children, className = '', headerExtra }: PanelProps) {
  return (
    <section className={`sf-panel ${className}`.trim()}>
      <header className="sf-panel-header">
        <button
          type="button"
          className="sf-panel-toggle"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${title}`}
        >
          <span className="sf-panel-title">{title}</span>
          {collapsed && summary ? <span className="sf-panel-summary">{summary}</span> : null}
          <span className="sf-panel-chevron" aria-hidden="true">{collapsed ? '\u203A' : '\u2039'}</span>
        </button>
        {headerExtra ? <div className="sf-panel-header-extra">{headerExtra}</div> : null}
      </header>
      {!collapsed ? <div className="sf-panel-body">{children}</div> : null}
    </section>
  );
}
