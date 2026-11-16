import type { Vec3 } from '../world/types.ts';

/**
 * Phase 07 Python domain types.
 *
 * These are deliberately runtime-agnostic: nothing here mentions Pyodide, a
 * worker, or a browser. The canonical project, the graph, and the reducer use
 * these shapes, so the Python runtime can be replaced without touching them.
 */

/** One user-authored Python script. Persisted in the project document. */
export interface PythonScript {
  id: string;
  name: string;
  source: string;
}

/** Persisted Python section of a project document. */
export interface PythonProjectData {
  scripts: PythonScript[];
}

/** Read-only entity view handed to a script. */
export interface PythonEntitySnapshot {
  id: string;
  name: string;
  position: Vec3;
  velocity: Vec3;
}

/** Immutable snapshot a script may read for one invocation. */
export interface PythonSnapshot {
  entities: PythonEntitySnapshot[];
  /** Simulation time in seconds at the moment the node started. */
  time: number;
  /** Fixed simulation timestep in seconds. */
  dt: number;
}

/**
 * Declarative effect a script may request. The worker never mutates host state;
 * the main thread validates and applies these through the existing M1-E APIs.
 */
export type PythonAction =
  | { type: 'applyForce'; entityId: string; vector: Vec3 }
  | { type: 'applyImpulse'; entityId: string; vector: Vec3 }
  | { type: 'clearForces'; entityId: string };

export type PythonLogLevel = 'info' | 'warn' | 'error';

export interface PythonLogLine {
  level: PythonLogLevel;
  message: string;
}

export interface PythonErrorReport {
  name: string;
  /** Exception line only, e.g. `ZeroDivisionError: division by zero`. */
  message: string;
  /** 1-based line number in the user script, when it can be recovered. */
  line: number | null;
  traceback: string;
}

export interface PythonRunSuccess {
  ok: true;
  actions: PythonAction[];
  logs: PythonLogLine[];
  durationMs: number;
  /** True when the runtime dropped log lines or capped the payload. */
  truncated: boolean;
}

export interface PythonRunFailure {
  ok: false;
  code: string;
  error: PythonErrorReport;
  logs: PythonLogLine[];
  durationMs: number;
}

export type PythonRunOutcome = PythonRunSuccess | PythonRunFailure;

/** Console codes for Python execution. */
export const PYTHON_CODES = {
  STARTED: 'PYTHON_STARTED',
  COMPLETED: 'PYTHON_COMPLETED',
  FAILED: 'PYTHON_FAILED',
  TIMEOUT: 'PYTHON_TIMEOUT',
  CANCELLED: 'PYTHON_CANCELLED',
  UNAVAILABLE: 'PYTHON_UNAVAILABLE',
  ACTION_FAILED: 'PYTHON_ACTION_FAILED',
  OUTPUT_TRUNCATED: 'PYTHON_OUTPUT_TRUNCATED',
  INVALID: 'PYTHON_INVALID',
  SOURCE_TOO_LARGE: 'PYTHON_SOURCE_TOO_LARGE',
  SCRIPT_MISSING: 'PYTHON_SCRIPT_MISSING'
} as const;

/** Runtime availability shown in the editor and the monitor. */
export type PythonRuntimeStatus = 'idle' | 'loading' | 'ready' | 'running' | 'timeout' | 'error';
