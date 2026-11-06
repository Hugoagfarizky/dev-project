import type { LogEntry } from './types.ts';

export class LogBuffer {
  private readonly capacity: number;
  private entries: LogEntry[] = [];

  constructor(capacity = 500) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('Log buffer capacity must be a positive integer');
    }
    this.capacity = capacity;
  }

  append(entry: LogEntry): void {
    this.entries.push(entry);
    if (this.entries.length > this.capacity) {
      this.entries.splice(0, this.entries.length - this.capacity);
    }
  }

  clear(): void {
    this.entries = [];
  }

  all(): readonly LogEntry[] {
    return [...this.entries];
  }

  size(): number {
    return this.entries.length;
  }
}

export function appendToLogBuffer(buffer: LogBuffer, entry: LogEntry): void {
  buffer.append(entry);
}

export function clearLogBuffer(buffer: LogBuffer): void {
  buffer.clear();
}
