import type { PythonErrorReport } from './types.ts';

const EXEC_LINE = /File "<exec>", line (\d+)/g;
const ANY_LINE = /line (\d+)/g;

/**
 * Turns a raw Pyodide error into a user-facing report.
 *
 * Pyodide wraps user tracebacks inside its own frames, so the script line has to
 * be recovered from the `<exec>` frame rather than from the last `line N` in the
 * text. The exception line is the final non-empty traceback line.
 */
export function parsePythonError(name: string, rawMessage: string): PythonErrorReport {
  const traceback = String(rawMessage ?? '');
  const line = lastMatch(traceback, EXEC_LINE) ?? lastMatch(traceback, ANY_LINE);

  const lines = traceback
    .split('\n')
    .map((lineText) => lineText.trimEnd())
    .filter((lineText) => lineText.trim().length > 0);
  const exceptionLine = lines.length > 0 ? (lines[lines.length - 1] as string).trim() : '';
  const message = exceptionLine.length > 0 ? exceptionLine : `${name}: unknown error`;

  return {
    name: name.length > 0 ? name : inferName(message),
    message,
    line,
    traceback
  };
}

function lastMatch(text: string, pattern: RegExp): number | null {
  let result: number | null = null;
  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) {
      result = value;
    }
  }
  return result;
}

function inferName(message: string): string {
  const match = /^([A-Za-z_][\w.]*(?:Error|Exception|Interrupt|Exit))\b/.exec(message);
  return match?.[1] ?? 'PythonError';
}
