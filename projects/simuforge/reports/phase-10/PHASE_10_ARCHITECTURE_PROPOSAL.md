# Phase 10 — Extensibility: Architecture Proposal

**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL  
**Date:** 2026-11-18

## 1. Module boundaries

- `src/extensions/` (new): manifest schema, loader, registry, permission model, worker host.
- `src/world/components.ts`: extend registry to support dynamically registered component types.
- `src/world/types.ts`: `AnyComponent` remains union; custom components validated generically.
- `src/world/validation.ts`: generic structural validation + extension-provided type validation.
- `src/runtime/extensions.ts` (new): hook interface (onTick, onPlay, onStop, onReset).
- `src/runtime/physics.ts`: call extension hooks in `advanceSimulation`.
- `src/editor/state.ts`: `RuntimeExtensionState` slice (transient).
- `src/ui/extensions/` (new): extension manager panel, custom component palette entries.
- `src/ui/shell/StudioShell.tsx`: extension manager tab or panel.
- `src/console/types.ts`: add `EXTENSION` source.

## 2. Data models

### Extension manifest
```
{
  id: string (UUID),
  name: string,
  version: string,
  author?: string,
  components: [ { type, label, category, terminals, defaultConfig } ],
  modules: [ { id, hooks: ['onTick','onPlay','onStop','onReset'] } ],
  permissions: [ 'read:world', 'write:components', 'run:simulation-hooks', 'emit:events' ]
}
```

### Custom component
Stored as a normal component with `type` = manifest-defined type string. Configuration is a
JSON object validated by the extension's declared schema (basic structural validation fallback).

### Extension runtime state (transient)
```
RuntimeExtensionState {
  status: 'idle' | 'loaded' | 'error'
  loadedExtensions: string[]
  enabledExtensions: string[]
  diagnostics: readonly { code, severity, message }[]
}
```

## 3. Integration with existing lifecycle

- Load: on project open, load project-local extensions; register component types.
- Play: initialize extension modules; call `onPlay`.
- Step: call `onTick` per fixed step.
- Stop/Reset: call `onStop`/`onReset`; discard runtime state.
- Invalid extension: warn, disable, allow Play (mirror D-P08-06).

## 4. Renderer and UI

- Extension manager panel (list, enable/disable, remove, diagnostics).
- Custom components appear in component palette by category.
- Inspector renders generic property editor for custom component config (JSON-based v1).
- Extension status in Console (`EXTENSION` source).

## 5. Persistence

- Schema v1 retained. Extension manifest stored project-locally (embedded or sidecar file).
- Custom component instances stored as normal components in `project.world`.
- Extension runtime state never persisted.

## 6. Error handling and failure recovery

- Extension load failure: warn, disable, continue.
- Extension runtime failure: pause simulation, preserve last valid state, log diagnostic.
- Permission violation: block and log.
- Reuse `toSimulationFailure` pattern.

## 7. Performance and browser compatibility

- Extension code in Web Worker (reuse Python worker infrastructure).
- Message-based protocol; avoid main-thread blocking.
- Cap extension tick budget; watchdog for hung extensions.

## 8. Testing strategy

- Unit: manifest validation, registration, permission checks, hook invocation.
- Integration: load/disable/unload lifecycle, invalid extension handling.
- E2E: install extension, use custom component, run simulation.
- Regression: full suite.

## 9. Risks and alternatives

- **Risk:** Extension code as untrusted input — mitigated by worker isolation + permissions.
- **Alternative:** Main-thread eval — rejected (blocks UI).
- **Risk:** API instability — mitigated by minimal v1 API.
- **Risk:** Backward compat — unknown types produce warnings, not failures (Phase 08 pattern).
