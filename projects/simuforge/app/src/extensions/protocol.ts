import type { ExtensionHook } from './types.ts';
import { EXTENSION_HOOKS } from './types.ts';

/**
 * Message protocol between the Studio main thread and one extension worker.
 *
 * The boundary is data-only and versioned. Only JSON-serializable values cross
 * it; the host re-validates every response because the worker is untrusted
 * (defense-in-depth, not a hardened security sandbox).
 */

export const EXTENSION_PROTOCOL_VERSION = 1;

export interface ExtensionModuleSpec {
  id: string;
  hooks: ExtensionHook[];
}

export interface ExtensionInitRequest {
  type: 'init';
  protocolVersion: number;
  extensionId: string;
  source: string;
  modules: ExtensionModuleSpec[];
}

export interface ExtensionWorldEntity {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
}

export interface ExtensionHookPayload {
  time: number;
  dt: number;
  /** Present only when the manifest grants `read:world`. */
  entities?: ExtensionWorldEntity[];
  /** Transient component values, keyed by component id. */
  values?: Record<string, number>;
}

export interface ExtensionHookRequest {
  type: 'hook';
  protocolVersion: number;
  requestId: string;
  hook: ExtensionHook;
  payload: ExtensionHookPayload;
}

export type ExtensionWorkerRequest = ExtensionInitRequest | ExtensionHookRequest;

export interface ExtensionReadyResponse {
  type: 'ready';
  protocolVersion: number;
  extensionId: string;
  modules: string[];
}

export interface ExtensionInitErrorResponse {
  type: 'init-error';
  protocolVersion: number;
  extensionId: string;
  message: string;
}

export type ExtensionOutputValue = number | string | boolean | null;

export interface ExtensionLogLine {
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ExtensionHookResultResponse {
  type: 'hook-result';
  protocolVersion: number;
  requestId: string;
  ok: boolean;
  outputs: Record<string, ExtensionOutputValue>;
  logs: ExtensionLogLine[];
  error: { message: string } | null;
}

export type ExtensionWorkerResponse =
  | ExtensionReadyResponse
  | ExtensionInitErrorResponse
  | ExtensionHookResultResponse;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOutputValue(value: unknown): value is ExtensionOutputValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

/** Sanitizes untrusted module outputs; non-primitive values are dropped. */
export function sanitizeExtensionOutputs(value: unknown): Record<string, ExtensionOutputValue> {
  const outputs: Record<string, ExtensionOutputValue> = {};
  if (!isPlainObject(value)) return outputs;
  for (const [key, item] of Object.entries(value)) {
    if (key.length === 0 || key.length > 128) continue;
    if (isOutputValue(item)) {
      outputs[key] = item;
    }
  }
  return outputs;
}

/** Sanitizes untrusted worker log lines. */
export function sanitizeExtensionLogs(value: unknown, maxLines = 20): ExtensionLogLine[] {
  if (!Array.isArray(value)) return [];
  const logs: ExtensionLogLine[] = [];
  for (const item of value) {
    if (logs.length >= maxLines) break;
    if (!isPlainObject(item)) continue;
    const level = item.level;
    if (level !== 'info' && level !== 'warn' && level !== 'error') continue;
    if (typeof item.message !== 'string') continue;
    logs.push({ level, message: item.message.slice(0, 2000) });
  }
  return logs;
}

/**
 * Validates one untrusted worker response. Returns null for anything that does
 * not match the versioned protocol, so a forged or stale message is ignored.
 */
export function validateWorkerResponse(value: unknown): ExtensionWorkerResponse | null {
  if (!isPlainObject(value)) return null;
  if (value.protocolVersion !== EXTENSION_PROTOCOL_VERSION) return null;

  if (value.type === 'ready') {
    if (typeof value.extensionId !== 'string' || !Array.isArray(value.modules)) return null;
    return {
      type: 'ready',
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      extensionId: value.extensionId,
      modules: value.modules.filter((id): id is string => typeof id === 'string')
    };
  }

  if (value.type === 'init-error') {
    if (typeof value.extensionId !== 'string' || typeof value.message !== 'string') return null;
    return {
      type: 'init-error',
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      extensionId: value.extensionId,
      message: value.message.slice(0, 2000)
    };
  }

  if (value.type === 'hook-result') {
    if (typeof value.requestId !== 'string' || typeof value.ok !== 'boolean') return null;
    const error =
      isPlainObject(value.error) && typeof value.error.message === 'string'
        ? { message: value.error.message.slice(0, 2000) }
        : null;
    return {
      type: 'hook-result',
      protocolVersion: EXTENSION_PROTOCOL_VERSION,
      requestId: value.requestId,
      ok: value.ok,
      outputs: sanitizeExtensionOutputs(value.outputs),
      logs: sanitizeExtensionLogs(value.logs),
      error
    };
  }

  return null;
}

export function isExtensionHook(value: unknown): value is ExtensionHook {
  return typeof value === 'string' && (EXTENSION_HOOKS as readonly string[]).includes(value);
}
