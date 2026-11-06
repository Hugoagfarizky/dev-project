import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LogBuffer } from '../../src/console/logBuffer.ts';
import { filterLogs } from '../../src/console/filters.ts';
import type { LogEntry } from '../../src/console/types.ts';

function entry(id: string, severity: LogEntry['severity'], message: string): LogEntry {
  return { id, timestamp: '2026-11-06T00:00:00.000Z', severity, source: 'APP', message };
}

test('log buffer caps and drops oldest', () => {
  const buffer = new LogBuffer(2);
  buffer.append(entry('1', 'info', 'first'));
  buffer.append(entry('2', 'info', 'second'));
  buffer.append(entry('3', 'info', 'third'));
  assert.equal(buffer.size(), 2);
  assert.deepEqual(buffer.all().map((item) => item.id), ['2', '3']);
});

test('severity filter works', () => {
  const entries = [entry('1', 'info', 'info message'), entry('2', 'error', 'error message')];
  const filtered = filterLogs(entries, { severity: 'error' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '2');
});

test('search works', () => {
  const entries = [entry('1', 'info', 'alpha'), entry('2', 'info', 'beta')];
  const filtered = filterLogs(entries, { search: 'beta' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, '2');
});

test('clear keeps filter behavior available', () => {
  const buffer = new LogBuffer(10);
  buffer.append(entry('1', 'info', 'message'));
  buffer.clear();
  assert.equal(buffer.size(), 0);
  const filtered = filterLogs(buffer.all(), { severity: 'info' });
  assert.equal(filtered.length, 0);
});