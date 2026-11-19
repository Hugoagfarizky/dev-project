import type {
  ExtensionComponentDefinition,
  ExtensionDocument,
  ExtensionEntry,
  ExtensionHook,
  ExtensionManifest,
  ExtensionModuleDefinition,
  ExtensionPermission
} from './types.ts';
import {
  EXTENSION_API_VERSION,
  EXTENSION_DOCUMENT_VERSION,
  EXTENSION_FORMAT,
  EXTENSION_HOOKS,
  EXTENSION_PERMISSIONS,
  createEmptyExtensionDocument
} from './types.ts';
import { isReservedComponentType } from '../world/components.ts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const COMPONENT_TYPE_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

/** Upper bound on one extension's module source, in characters. */
export const EXTENSION_SOURCE_MAX_CHARS = 256 * 1024;

export interface ManifestValidationResult {
  ok: boolean;
  manifest?: ExtensionManifest;
  errors: string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHook(value: unknown): value is ExtensionHook {
  return typeof value === 'string' && (EXTENSION_HOOKS as readonly string[]).includes(value);
}

function isPermission(value: unknown): value is ExtensionPermission {
  return typeof value === 'string' && (EXTENSION_PERMISSIONS as readonly string[]).includes(value);
}

function validateComponents(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push('components must be an array.');
    return;
  }
  const seen = new Set<string>();
  for (const item of value) {
    if (!isPlainObject(item)) {
      errors.push('component must be an object.');
      continue;
    }
    const type = item.type;
    if (typeof type !== 'string' || !COMPONENT_TYPE_PATTERN.test(type)) {
      errors.push('component.type must be a namespaced identifier (letters, digits, _ . -).');
    } else {
      if (isReservedComponentType(type)) {
        errors.push(`component.type "${type}" is reserved by a built-in component.`);
      }
      if (seen.has(type)) {
        errors.push(`component.type "${type}" is declared more than once.`);
      }
      seen.add(type);
    }
    if (typeof item.label !== 'string' || item.label.trim().length === 0) {
      errors.push('component.label must be a non-empty string.');
    }
    if (item.category !== undefined && typeof item.category !== 'string') {
      errors.push('component.category must be a string if provided.');
    }
    if (item.description !== undefined && typeof item.description !== 'string') {
      errors.push('component.description must be a string if provided.');
    }
    if (item.defaultConfig !== undefined && !isPlainObject(item.defaultConfig)) {
      errors.push('component.defaultConfig must be a plain object if provided.');
    }
  }
}

function validateModules(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push('modules must be an array.');
    return;
  }
  const seen = new Set<string>();
  for (const item of value) {
    if (!isPlainObject(item)) {
      errors.push('module must be an object.');
      continue;
    }
    if (typeof item.id !== 'string' || item.id.trim().length === 0) {
      errors.push('module.id must be a non-empty string.');
    } else {
      if (seen.has(item.id)) {
        errors.push(`module.id "${item.id}" is declared more than once.`);
      }
      seen.add(item.id);
    }
    if (!Array.isArray(item.hooks)) {
      errors.push('module.hooks must be an array.');
      continue;
    }
    const hookSeen = new Set<string>();
    for (const hook of item.hooks) {
      if (!isHook(hook)) {
        errors.push(`module.hooks contains an unknown hook: ${String(hook)}.`);
      } else if (hookSeen.has(hook)) {
        errors.push(`module.hooks contains "${hook}" more than once.`);
      } else {
        hookSeen.add(hook);
      }
    }
  }
}

function validatePermissions(value: unknown, errors: string[]): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    errors.push('permissions must be an array.');
    return;
  }
  for (const permission of value) {
    if (!isPermission(permission)) {
      errors.push(`Unknown permission: ${String(permission)}.`);
    }
  }
}

/**
 * Validates an untrusted extension manifest. Everything crossing the project or
 * worker boundary is treated as input: unknown fields are ignored, known fields
 * are checked structurally, and capability declarations are cross-checked.
 */
export function validateManifest(value: unknown): ManifestValidationResult {
  if (!isPlainObject(value)) {
    return { ok: false, errors: ['Manifest must be an object.'] };
  }
  const errors: string[] = [];

  if (typeof value.id !== 'string' || !UUID_V4.test(value.id)) {
    errors.push('id must be a UUID v4 string.');
  }
  if (typeof value.name !== 'string' || value.name.trim().length === 0 || value.name.length > 128) {
    errors.push('name must be a non-empty string of at most 128 characters.');
  }
  if (typeof value.version !== 'string' || value.version.trim().length === 0 || value.version.length > 64) {
    errors.push('version must be a non-empty string of at most 64 characters.');
  }
  if (value.apiVersion !== undefined && value.apiVersion !== EXTENSION_API_VERSION) {
    errors.push(`apiVersion must be ${EXTENSION_API_VERSION} when provided.`);
  }
  if (value.author !== undefined && typeof value.author !== 'string') {
    errors.push('author must be a string if provided.');
  }

  validateComponents(value.components, errors);
  validateModules(value.modules, errors);
  validatePermissions(value.permissions, errors);

  const modules = Array.isArray(value.modules) ? value.modules : [];
  const permissions = Array.isArray(value.permissions) ? value.permissions : [];
  if (modules.length > 0 && !permissions.includes('run:simulation-hooks')) {
    errors.push('modules require the "run:simulation-hooks" permission.');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const manifest: ExtensionManifest = {
    id: value.id as string,
    name: (value.name as string).trim(),
    version: (value.version as string).trim(),
    apiVersion: EXTENSION_API_VERSION,
    ...(value.author !== undefined ? { author: value.author as string } : {}),
    components: (value.components as ExtensionComponentDefinition[] | undefined) ?? [],
    modules: (value.modules as ExtensionModuleDefinition[] | undefined) ?? [],
    permissions: (value.permissions as ExtensionPermission[] | undefined) ?? []
  };
  return { ok: true, manifest, errors: [] };
}

export interface ExtensionEntryValidation {
  ok: boolean;
  entry?: ExtensionEntry;
  errors: string[];
}

export function validateExtensionEntry(value: unknown): ExtensionEntryValidation {
  if (!isPlainObject(value)) {
    return { ok: false, errors: ['Extension entry must be an object.'] };
  }
  const manifestResult = validateManifest(value.manifest);
  if (!manifestResult.ok || !manifestResult.manifest) {
    return { ok: false, errors: manifestResult.errors };
  }
  const errors: string[] = [];
  if (typeof value.source !== 'string') {
    errors.push('source must be a string.');
  } else if (value.source.length > EXTENSION_SOURCE_MAX_CHARS) {
    errors.push(`source exceeds the ${EXTENSION_SOURCE_MAX_CHARS} character limit.`);
  }
  if (value.enabled !== undefined && typeof value.enabled !== 'boolean') {
    errors.push('enabled must be a boolean if provided.');
  }
  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    entry: {
      manifest: manifestResult.manifest,
      source: (value.source as string) ?? '',
      enabled: value.enabled === undefined ? true : (value.enabled as boolean)
    },
    errors: []
  };
}

export interface ExtensionDocumentValidation {
  value: ExtensionDocument;
  warnings: string[];
  knownComponentTypes: ReadonlySet<string>;
}

/**
 * Document validation. Extension storage is optional under project schema v1;
 * structural corruption is stripped with a warning so the project still opens
 * with its authored data intact (mirrors the Phase 08 electrical section).
 */
export function validateExtensionDocument(value: unknown): ExtensionDocumentValidation {
  const warnings: string[] = [];
  const knownComponentTypes = new Set<string>();

  if (value === undefined || value === null) {
    return { value: createEmptyExtensionDocument(), warnings, knownComponentTypes };
  }
  if (!isPlainObject(value)) {
    warnings.push('INVALID_EXTENSIONS: extension section must be an object; it was ignored.');
    return { value: createEmptyExtensionDocument(), warnings, knownComponentTypes };
  }
  if (value.format !== EXTENSION_FORMAT) {
    warnings.push('INVALID_EXTENSIONS: format must be "simuforge.extensions"; the section was ignored.');
    return { value: createEmptyExtensionDocument(), warnings, knownComponentTypes };
  }
  if (value.version !== EXTENSION_DOCUMENT_VERSION) {
    warnings.push('INVALID_EXTENSIONS: unsupported extension document version; the section was ignored.');
    return { value: createEmptyExtensionDocument(), warnings, knownComponentTypes };
  }
  if (!Array.isArray(value.entries)) {
    warnings.push('INVALID_EXTENSIONS: entries must be an array; the section was ignored.');
    return { value: createEmptyExtensionDocument(), warnings, knownComponentTypes };
  }

  const entries: ExtensionEntry[] = [];
  const seenIds = new Set<string>();
  for (let index = 0; index < value.entries.length; index += 1) {
    const result = validateExtensionEntry(value.entries[index]);
    if (!result.ok || !result.entry) {
      warnings.push(`INVALID_EXTENSION[${index}]: ${result.errors.join(' ')}`);
      continue;
    }
    if (seenIds.has(result.entry.manifest.id)) {
      warnings.push(`INVALID_EXTENSION[${index}]: duplicate extension id ${result.entry.manifest.id}.`);
      continue;
    }
    seenIds.add(result.entry.manifest.id);
    entries.push(result.entry);
    for (const component of result.entry.manifest.components ?? []) {
      if (knownComponentTypes.has(component.type)) {
        warnings.push(
          `INVALID_EXTENSION[${index}]: component type "${component.type}" is already provided by another extension; the later declaration will not register.`
        );
      } else {
        knownComponentTypes.add(component.type);
      }
    }
  }

  return {
    value: { format: EXTENSION_FORMAT, version: EXTENSION_DOCUMENT_VERSION, entries },
    warnings,
    knownComponentTypes
  };
}
