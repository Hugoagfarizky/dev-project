/**
 * Phase 10 extension domain types.
 *
 * These types are runtime-agnostic and data-only. Manifests, project entries,
 * and worker payloads are all JSON-serializable so the extension boundary can be
 * validated like any other untrusted project input.
 */

export const EXTENSION_FORMAT = 'simuforge.extensions' as const;
export const EXTENSION_DOCUMENT_VERSION = 1 as const;
export const EXTENSION_API_VERSION = 1 as const;

export type ExtensionPermission =
  | 'read:world'
  | 'write:components'
  | 'run:simulation-hooks'
  | 'emit:events';

export const EXTENSION_PERMISSIONS: readonly ExtensionPermission[] = [
  'read:world',
  'write:components',
  'run:simulation-hooks',
  'emit:events'
];

export type ExtensionHook = 'onPlay' | 'onTick' | 'onStop' | 'onReset';

export const EXTENSION_HOOKS: readonly ExtensionHook[] = ['onPlay', 'onTick', 'onStop', 'onReset'];

export interface ExtensionComponentDefinition {
  /** Unique, extension-namespaced component type. Must not collide with a built-in. */
  type: string;
  label: string;
  category?: string;
  description?: string;
  /** Default configuration merged into every new component instance. */
  defaultConfig?: Record<string, unknown>;
}

export interface ExtensionModuleDefinition {
  id: string;
  hooks: ExtensionHook[];
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  /** Optional for backward compatibility; defaults to 1. Only 1 is accepted. */
  apiVersion?: number;
  author?: string;
  components?: ExtensionComponentDefinition[];
  modules?: ExtensionModuleDefinition[];
  permissions?: ExtensionPermission[];
}

/** One project-local extension: manifest plus module source code. */
export interface ExtensionEntry {
  manifest: ExtensionManifest;
  /** Module source evaluated inside the extension worker. Empty for component-only extensions. */
  source: string;
  enabled: boolean;
}

/** Persisted, project-local extension storage (D-P10-05). */
export interface ExtensionDocument {
  format: typeof EXTENSION_FORMAT;
  version: typeof EXTENSION_DOCUMENT_VERSION;
  entries: ExtensionEntry[];
}

export function createEmptyExtensionDocument(): ExtensionDocument {
  return { format: EXTENSION_FORMAT, version: EXTENSION_DOCUMENT_VERSION, entries: [] };
}

export type ExtensionRuntimeStatus = 'idle' | 'loaded' | 'error';

export interface ExtensionDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  extensionId?: string;
}

export interface LoadedExtension {
  manifest: ExtensionManifest;
  enabled: boolean;
  status: 'loaded' | 'error';
  error?: string;
}

export const EXTENSION_CODES = {
  INSTALLED: 'EXTENSION_INSTALLED',
  UPDATED: 'EXTENSION_UPDATED',
  REMOVED: 'EXTENSION_REMOVED',
  ENABLED: 'EXTENSION_ENABLED',
  DISABLED: 'EXTENSION_DISABLED',
  INVALID_MANIFEST: 'EXTENSION_INVALID_MANIFEST',
  UNKNOWN_COMPONENT: 'EXTENSION_UNKNOWN_COMPONENT',
  PERMISSION_DENIED: 'EXTENSION_PERMISSION_DENIED',
  WORKER_STARTED: 'EXTENSION_WORKER_STARTED',
  WORKER_FAILED: 'EXTENSION_WORKER_FAILED',
  WORKER_TIMEOUT: 'EXTENSION_WORKER_TIMEOUT',
  WORKER_CRASHED: 'EXTENSION_WORKER_CRASHED',
  INVALID_MESSAGE: 'EXTENSION_INVALID_MESSAGE',
  HOOK_FAILED: 'EXTENSION_HOOK_FAILED',
  COMPONENT_VALUE_SET: 'EXTENSION_COMPONENT_VALUE_SET'
} as const;

/** Default per-hook budget for a single extension worker response. */
export const EXTENSION_HOOK_TIMEOUT_MS = 250;
/** Startup budget for loading a worker and evaluating its module source. */
export const EXTENSION_INIT_TIMEOUT_MS = 5000;
/** Cap on retained extension diagnostics in the runtime slice. */
export const EXTENSION_MAX_DIAGNOSTICS = 32;
