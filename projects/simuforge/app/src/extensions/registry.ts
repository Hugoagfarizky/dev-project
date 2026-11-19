import type { AnyComponent, ComponentId } from '../world/types.ts';
import {
  registerDynamicComponentDefinition,
  unregisterDynamicComponentDefinition
} from '../world/components.ts';
import type { ComponentDefinition } from '../world/components.ts';
import type { ExtensionEntry, ExtensionManifest, LoadedExtension } from './types.ts';

/** component type -> owning extension id */
const COMPONENT_OWNERS = new Map<string, string>();

function cloneConfig(value: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function toDefinition(manifest: ExtensionManifest): ComponentDefinition[] {
  return (manifest.components ?? []).map((component) => ({
    type: component.type,
    label: component.label,
    category: 'extension' as const,
    description: component.description ?? `Extension component from ${manifest.name}.`,
    terminals: [],
    create: (id: ComponentId): AnyComponent =>
      ({
        id,
        type: component.type,
        enabled: true,
        ...cloneConfig(component.defaultConfig)
      }) as AnyComponent
  }));
}

/**
 * Registers an extension's component definitions in the world registry. A type
 * already owned by another extension is rejected rather than silently
 * overwritten. Returns the types that were actually registered.
 */
export function registerExtensionComponents(manifest: ExtensionManifest): string[] {
  const registered: string[] = [];
  for (const definition of toDefinition(manifest)) {
    const owner = COMPONENT_OWNERS.get(definition.type);
    if (owner && owner !== manifest.id) {
      continue;
    }
    registerDynamicComponentDefinition(definition);
    COMPONENT_OWNERS.set(definition.type, manifest.id);
    registered.push(definition.type);
  }
  return registered;
}

export function unregisterExtensionComponents(extensionId: string): void {
  for (const [type, owner] of COMPONENT_OWNERS) {
    if (owner === extensionId) {
      unregisterDynamicComponentDefinition(type);
      COMPONENT_OWNERS.delete(type);
    }
  }
}

export function extensionOwnerOfComponentType(type: string): string | null {
  return COMPONENT_OWNERS.get(type) ?? null;
}

export function resetExtensionComponents(): void {
  for (const type of COMPONENT_OWNERS.keys()) {
    unregisterDynamicComponentDefinition(type);
  }
  COMPONENT_OWNERS.clear();
}

export class ExtensionRegistry {
  private extensions = new Map<string, LoadedExtension>();

  register(entry: ExtensionEntry): LoadedExtension {
    const ext: LoadedExtension = {
      manifest: entry.manifest,
      enabled: entry.enabled,
      status: 'loaded'
    };
    this.extensions.set(entry.manifest.id, ext);
    registerExtensionComponents(entry.manifest);
    return ext;
  }

  unregister(id: string): void {
    this.extensions.delete(id);
    unregisterExtensionComponents(id);
  }

  get(id: string): LoadedExtension | undefined {
    return this.extensions.get(id);
  }

  list(): LoadedExtension[] {
    return Array.from(this.extensions.values());
  }

  setEnabled(id: string, enabled: boolean): void {
    const ext = this.extensions.get(id);
    if (ext) ext.enabled = enabled;
  }

  reset(): void {
    this.extensions.clear();
    resetExtensionComponents();
  }
}

export const globalExtensionRegistry = new ExtensionRegistry();
