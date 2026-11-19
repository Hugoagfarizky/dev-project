import type { ExtensionManifest, ExtensionPermission } from './types.ts';
import { EXTENSION_PERMISSIONS } from './types.ts';

export const PERMISSION_CODES = {
  DENIED: 'EXTENSION_PERMISSION_DENIED'
} as const;

export type PermissionCheck =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function permissionsFor(manifest: ExtensionManifest): ExtensionPermission[] {
  const declared = manifest.permissions ?? [];
  // Preserve declaration order, drop duplicates and unknown values. Unknown
  // values are rejected by manifest validation; this is a defensive filter.
  const result: ExtensionPermission[] = [];
  for (const permission of declared) {
    if (EXTENSION_PERMISSIONS.includes(permission) && !result.includes(permission)) {
      result.push(permission);
    }
  }
  return result;
}

/**
 * Host-side permission check (D-P10-06). The host never trusts a manifest field
 * implicitly: every capability is checked at the call site before data crosses
 * the worker boundary or a write is committed.
 */
export function hasPermission(manifest: ExtensionManifest, permission: ExtensionPermission): boolean {
  return permissionsFor(manifest).includes(permission);
}

export function checkPermission(
  manifest: ExtensionManifest,
  permission: ExtensionPermission
): PermissionCheck {
  if (hasPermission(manifest, permission)) {
    return { ok: true };
  }
  return {
    ok: false,
    code: PERMISSION_CODES.DENIED,
    message: `Extension "${manifest.name}" (${manifest.id}) did not declare the "${permission}" permission.`
  };
}
