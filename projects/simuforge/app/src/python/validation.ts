import { PYTHON_SCRIPT_NAME_MAX_CHARS, PYTHON_SOURCE_MAX_CHARS } from './limits.ts';
import { PYTHON_CODES } from './types.ts';
import type { PythonProjectData, PythonScript } from './types.ts';

export interface PythonValidationResult {
  /** Normalized data, or null when the section is absent or unusable. */
  value: PythonProjectData | null;
  /** Human-readable warnings. Invalid scripts are stripped, never fatal. */
  warnings: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the optional `python` section of a project document.
 *
 * Same contract as the M2-E graph: bad Python data must never block opening a
 * project. Invalid scripts are dropped and reported as warnings; the rest of the
 * project opens normally.
 */
export function validatePythonProjectData(value: unknown): PythonValidationResult {
  if (value === undefined || value === null) {
    return { value: null, warnings: [] };
  }

  if (!isPlainObject(value)) {
    return {
      value: null,
      warnings: [`${PYTHON_CODES.INVALID}: python must be an object or null`]
    };
  }

  const scriptsValue = value['scripts'];
  if (!Array.isArray(scriptsValue)) {
    return {
      value: null,
      warnings: [`${PYTHON_CODES.INVALID}: python.scripts must be an array`]
    };
  }

  const warnings: string[] = [];
  const scripts: PythonScript[] = [];
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const item of scriptsValue) {
    const script = normalizeScript(item, ids, names, warnings);
    if (!script) {
      continue;
    }
    scripts.push(script);
    ids.add(script.id);
    names.add(script.name);
  }

  return { value: { scripts }, warnings };
}

function normalizeScript(
  value: unknown,
  ids: ReadonlySet<string>,
  names: ReadonlySet<string>,
  warnings: string[]
): PythonScript | null {
  if (!isPlainObject(value)) {
    warnings.push(`${PYTHON_CODES.INVALID}: dropped a Python script that is not an object`);
    return null;
  }

  const id = value['id'];
  if (typeof id !== 'string' || id.trim().length === 0) {
    warnings.push(`${PYTHON_CODES.INVALID}: dropped a Python script with an empty id`);
    return null;
  }
  if (ids.has(id)) {
    warnings.push(`${PYTHON_CODES.INVALID}: dropped duplicate Python script id ${id}`);
    return null;
  }

  const rawName = value['name'];
  if (typeof rawName !== 'string') {
    warnings.push(`${PYTHON_CODES.INVALID}: dropped Python script ${id} with a non-string name`);
    return null;
  }
  const name = rawName.trim();
  if (name.length === 0 || name.length > PYTHON_SCRIPT_NAME_MAX_CHARS) {
    warnings.push(
      `${PYTHON_CODES.INVALID}: dropped Python script ${id} with a name outside 1-${PYTHON_SCRIPT_NAME_MAX_CHARS} characters`
    );
    return null;
  }
  if (names.has(name)) {
    warnings.push(`${PYTHON_CODES.INVALID}: dropped Python script ${id} with duplicate name ${name}`);
    return null;
  }

  const source = value['source'];
  if (typeof source !== 'string') {
    warnings.push(`${PYTHON_CODES.INVALID}: dropped Python script ${id} with a non-string source`);
    return null;
  }
  if (source.length > PYTHON_SOURCE_MAX_CHARS) {
    warnings.push(
      `${PYTHON_CODES.INVALID}: dropped Python script ${id} because its source exceeds ${PYTHON_SOURCE_MAX_CHARS} characters`
    );
    return null;
  }

  return { id, name, source };
}

/** Returns the scripts of a project, tolerating a missing section. */
export function pythonScripts(data: PythonProjectData | null | undefined): readonly PythonScript[] {
  return data?.scripts ?? [];
}

/** Finds a script by id. */
export function findPythonScript(
  data: PythonProjectData | null | undefined,
  scriptId: string
): PythonScript | null {
  return pythonScripts(data).find((script) => script.id === scriptId) ?? null;
}
