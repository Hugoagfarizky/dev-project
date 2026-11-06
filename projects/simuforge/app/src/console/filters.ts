import type { LogEntry, LogFilter } from './types.ts';

export function filterLogs(entries: readonly LogEntry[], filter: LogFilter = {}): readonly LogEntry[] {
  const search = filter.search?.trim().toLowerCase();

  return entries.filter((entry) => {
    if (filter.severity && entry.severity !== filter.severity) {
      return false;
    }

    if (filter.source && entry.source !== filter.source) {
      return false;
    }

    if (search) {
      const haystack = `${entry.message} ${entry.code ?? ''} ${entry.detail ?? ''}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }

    return true;
  });
}
