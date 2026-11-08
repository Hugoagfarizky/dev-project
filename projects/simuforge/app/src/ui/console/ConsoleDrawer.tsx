import { useState } from 'react';
import { useStudioStore } from '../hooks/useStore.js';
import { selectLogs } from '../../editor/selectors.js';
import type { StudioStore } from '../../editor/store.js';
import { filterLogs } from '../../console/filters.js';
import type { LogEntry, LogSeverity, LogSource } from '../../console/types.js';

interface ConsoleDrawerProps {
  store: StudioStore;
  expanded: boolean;
  onToggle: () => void;
}

const SEVERITIES: (LogSeverity | 'all')[] = ['all', 'info', 'warn', 'error'];
const SOURCES: (LogSource | 'all')[] = ['all', 'APP', 'EDITOR', 'RENDER', 'IMPORT'];

export function ConsoleDrawer({ store, expanded, onToggle }: ConsoleDrawerProps) {
  const logs = useStudioStore(store, selectLogs);
  const [severity, setSeverity] = useState<LogSeverity | 'all'>('all');
  const [source, setSource] = useState<LogSource | 'all'>('all');
  const [search, setSearch] = useState('');

  const filter: { severity?: LogSeverity; source?: LogSource; search?: string } = { search };
  if (severity !== 'all') filter.severity = severity;
  if (source !== 'all') filter.source = source;
  const filtered = filterLogs(logs, filter);

  function clear() {
    store.dispatch({ type: 'log/clear' });
  }

  if (!expanded) {
    return (
      <button type="button" className="sf-console-toggle" onClick={onToggle} aria-expanded={false}>
        Console ({logs.length})
      </button>
    );
  }

  return (
    <section className="sf-console-drawer" aria-label="Console">
      <div className="sf-console-toolbar">
        <button type="button" onClick={onToggle} aria-expanded={true}>Collapse</button>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as LogSeverity | 'all')} aria-label="Severity filter">
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value as LogSource | 'all')} aria-label="Source filter">
          {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search logs" />
        <button type="button" onClick={clear}>Clear</button>
      </div>
      <div className="sf-console-list" role="log" aria-live="polite">
        {filtered.length === 0 ? (
          <div className="sf-console-empty">No output</div>
        ) : (
          filtered.map((entry) => <ConsoleRow key={entry.id} entry={entry} />)
        )}
      </div>
    </section>
  );
}

function ConsoleRow({ entry }: { entry: LogEntry }) {
  return (
    <div className={`sf-console-row sf-console-${entry.severity}`}>
      <span className="sf-console-time">{entry.timestamp}</span>
      <span className="sf-console-severity">{entry.severity.toUpperCase()}</span>
      <span className="sf-console-source">{entry.source}</span>
      {entry.code ? <span className="sf-console-code">{entry.code}</span> : null}
      <span className="sf-console-message">{entry.message}</span>
    </div>
  );
}