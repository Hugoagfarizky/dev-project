import { applyForce, applyImpulse, clearForce } from '../runtime/physics.ts';
import type { RuntimeBodies } from '../runtime/types.ts';
import { PYTHON_ACTION_MAX_COUNT } from './limits.ts';
import type { PythonAction, PythonLogLine } from './types.ts';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readVec3(value: unknown): { x: number; y: number; z: number } | null {
  if (Array.isArray(value) && value.length === 3) {
    const [x, y, z] = value;
    return isFiniteNumber(x) && isFiniteNumber(y) && isFiniteNumber(z) ? { x, y, z } : null;
  }
  if (typeof value === 'object' && value !== null) {
    const candidate = value as { x?: unknown; y?: unknown; z?: unknown };
    return isFiniteNumber(candidate.x) && isFiniteNumber(candidate.y) && isFiniteNumber(candidate.z)
      ? { x: candidate.x, y: candidate.y, z: candidate.z }
      : null;
  }
  return null;
}

/**
 * Validates worker-originated actions before they reach the simulation.
 *
 * The worker is treated as untrusted: user code may reach the JS bridge, so
 * every message is re-validated here. Unknown fields are dropped and malformed
 * actions are discarded rather than trusted.
 */
export function sanitizePythonActions(value: unknown): PythonAction[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const actions: PythonAction[] = [];
  for (const item of value.slice(0, PYTHON_ACTION_MAX_COUNT)) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const entityId = record['entityId'];
    if (typeof entityId !== 'string' || entityId.length === 0) {
      continue;
    }
    const type = record['type'];
    if (type === 'applyForce' || type === 'applyImpulse') {
      const vector = readVec3(record['vector']);
      if (vector) {
        actions.push({ type, entityId, vector });
      }
      continue;
    }
    if (type === 'clearForces') {
      actions.push({ type: 'clearForces', entityId });
    }
  }
  return actions;
}

/** Validates worker-originated log lines, dropping anything malformed. */
export function sanitizePythonLogs(
  value: unknown,
  maxLines: number,
  maxChars: number
): { logs: PythonLogLine[]; truncated: boolean } {
  if (!Array.isArray(value)) {
    return { logs: [], truncated: false };
  }
  const logs: PythonLogLine[] = [];
  let truncated = value.length > maxLines;
  for (const item of value.slice(0, maxLines)) {
    if (typeof item !== 'object' || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const rawMessage = record['message'];
    if (typeof rawMessage !== 'string') {
      continue;
    }
    if (rawMessage.length > maxChars) {
      truncated = true;
    }
    const level = record['level'];
    logs.push({
      level: level === 'warn' || level === 'error' ? level : 'info',
      message: rawMessage.length > maxChars ? rawMessage.slice(0, maxChars) : rawMessage
    });
  }
  return { logs, truncated };
}

/**
 * Applies a script's actions atomically through the existing M1-E APIs.
 *
 * The M1-E helpers clone-and-throw, so the caller's `bodies` is never mutated.
 * If any action throws, the caller must discard the returned value and keep the
 * pre-call bodies: a failed Python node commits nothing (D-P07-04).
 */
export function applyPythonActions(
  bodies: RuntimeBodies,
  actions: readonly PythonAction[]
): RuntimeBodies {
  let current = bodies;
  for (const action of actions) {
    switch (action.type) {
      case 'applyForce':
        current = applyForce(current, action.entityId, action.vector);
        break;
      case 'applyImpulse':
        current = applyImpulse(current, action.entityId, action.vector);
        break;
      case 'clearForces':
        current = clearForce(current, action.entityId);
        break;
      default: {
        const exhaustive: never = action;
        throw new Error(`Unsupported Python action: ${JSON.stringify(exhaustive)}`);
      }
    }
  }
  return current;
}
