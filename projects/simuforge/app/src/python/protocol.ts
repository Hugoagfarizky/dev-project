import type { PythonSnapshot } from './types.ts';

/**
 * Message protocol between the Studio main thread and the Python worker.
 *
 * The boundary is data-only and versioned: only JSON-serializable values cross
 * it. No host object (React, Babylon, store, DOM node) is ever posted, and the
 * main thread re-validates everything the worker sends back.
 */

export const PYTHON_PROTOCOL_VERSION = 1;

export interface PythonInitRequest {
  type: 'init';
  protocolVersion: number;
  /** Same-origin URL of the pinned Pyodide module. */
  pyodideUrl: string;
  /** Same-origin index URL used to resolve Pyodide assets. */
  indexUrl: string;
  /**
   * Shared interrupt buffer. Only available when the page is cross-origin
   * isolated; otherwise cancellation falls back to termination.
   */
  interruptBuffer: SharedArrayBuffer | null;
}

export interface PythonRunRequest {
  type: 'run';
  protocolVersion: number;
  requestId: string;
  source: string;
  snapshot: PythonSnapshot;
}

export interface PythonInterruptRequest {
  type: 'interrupt';
}

export interface PythonProbeRequest {
  type: 'probe';
  protocolVersion: number;
}

export type PythonWorkerRequest =
  | PythonInitRequest
  | PythonRunRequest
  | PythonInterruptRequest
  | PythonProbeRequest;

export interface PythonReadyResponse {
  type: 'ready';
  protocolVersion: number;
  version: string;
  loadMs: number;
  initMs: number;
  /** Names of host globals that were shadowed during hardening. */
  hardened: string[];
}

export interface PythonInitErrorResponse {
  type: 'init-error';
  message: string;
}

export interface PythonResultResponse {
  type: 'result';
  protocolVersion: number;
  requestId: string;
  ok: true;
  /** Untrusted payload; sanitized by `sanitizePythonActions`. */
  actions: unknown;
  /** Untrusted payload; sanitized by `sanitizePythonLogs`. */
  logs: unknown;
  durationMs: number;
  truncated: boolean;
}

export interface PythonFailureResponse {
  type: 'result';
  protocolVersion: number;
  requestId: string;
  ok: false;
  name: string;
  message: string;
  traceback: string;
  durationMs: number;
  logs: unknown;
}

export interface PythonProbeResponse {
  type: 'probe-result';
  protocolVersion: number;
  /**
   * Functional reachability of dangerous capabilities, measured by actually
   * attempting them inside the worker rather than by reading properties.
   * `before` is captured prior to hardening, `after` following it; a hardened
   * worker must report every entry in `after` as false.
   */
  before: Record<string, boolean>;
  after: Record<string, boolean>;
}

export type PythonWorkerResponse =
  | PythonReadyResponse
  | PythonInitErrorResponse
  | PythonResultResponse
  | PythonFailureResponse
  | PythonProbeResponse;
