export type LogSeverity = 'info' | 'warn' | 'error';
export type LogSource = 'APP' | 'EDITOR' | 'RENDER' | 'IMPORT' | 'RUNTIME';

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: LogSeverity;
  source: LogSource;
  code?: string;
  message: string;
  detail?: string;
  entityId?: string;
}

export interface LogFilter {
  severity?: LogSeverity;
  source?: LogSource;
  search?: string;
}
