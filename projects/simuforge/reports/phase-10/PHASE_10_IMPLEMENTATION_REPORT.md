# Phase 10 — Extensibility: Implementation & Verification Report

**Date:** 2026-11-19  
**Phase:** 10 — Extensibility  
**Status:** IMPLEMENTED — VALIDATED — PENDING PROJECT OWNER ACCEPTANCE  
**Planning commit:** `9d0ca892ad52cf654265f574dbe537d16d8d9a21`  
**Implementation commit:** `4184bf38fb00b28a65cf7877b065718f0eefd305`  
**Approved decisions:** D-P10-01..D-P10-07 (2026-11-18)

## 1. Verification summary

| Check | Result |
|---|---|
| Node version | v24.22.2 |
| npm version | 11.19.1 |
| `npm run check` | PASS |
| `npm test` | 362/362 PASS |
| `npm run build` | PASS (chunk-size and ineffective-dynamic-import warnings only) |
| Playwright (`--workers=1`) | 39/39 PASS |
| Phase 10 browser E2E (`phase10-extensions.spec.ts`) | 2/2 PASS |
| Extension unit/integration tests (`test/extensions/extensions.test.ts`) | 29/29 PASS |

## 2. Acceptance criteria (P10-0..P10-5)

| # | Criterion | Result | Evidence |
|---|---|---|---|
| P10-0 | Manifest schema, loader, registry, permission model | PASS | `src/extensions/types.ts`, `validation.ts`, `permissions.ts`, `registry.ts`; manifest/document tests |
| P10-1 | Custom components in registry, Inspector, serialization | PASS | `src/world/components.ts` dynamic registry; `ComponentsSection.tsx` extension group and generic fields; project round-trip tests |
| P10-2 | Custom simulation modules with lifecycle hooks | PASS | `src/extensions/host.ts`, `worker/extensionWorker.ts`, `controller.ts`; hook, timeout, crash, and permission tests |
| P10-3 | Visual Scripting and Python integration | PASS | `setExtensionValue`/`readExtensionValue` graph nodes; `ChainExecutionResult.extension`; Python `simulation.extensions` and `simulation.extension_value` |
| P10-4 | Extension manager UI, status, diagnostics, edit lock | PASS | `src/ui/extensions/ExtensionManager.tsx`; Extensions tab in `StudioShell.tsx`; browser E2E |
| P10-5 | Full validation matrix and regression | PASS | 362 unit/integration, 39 browser, 2 Phase 10 E2E; no prior-phase regressions |

## 3. Scope delivered

### Extension core (`src/extensions/`)

- `types.ts` — versioned manifest, project-local document, hooks, permissions, diagnostic codes, 250 ms hook budget, 5 s startup budget, 32-diagnostic cap.
- `validation.ts` — structural validation of untrusted manifests/entries/documents; UUID v4 ids; 256 KiB per-extension source cap; reserved built-in types rejected; module hooks and permissions cross-checked; duplicate component types across extensions warn (first registration wins).
- `permissions.ts` — deduplicated declarative permissions with host-side checks.
- `registry.ts` — registers extension components into the dynamic world registry, tracks ownership, refuses to shadow built-ins or another extension.
- `protocol.ts` — versioned worker protocol with response validation and output/log sanitization.
- `host.ts` — one dedicated worker per enabled module-bearing extension; startup reconciliation; per-hook timeout; crash/timeout termination; output namespacing `${extensionId}:${moduleId}`.
- `worker/extensionWorker.ts` — evaluates extension source with `new Function('registerModule', 'console', source)`; only manifest-declared modules and hooks are accepted.
- `controller.ts` — synchronizes registry, host, and store; dispatches lifecycle hooks; deduplicates runtime failures per session.
- `samples.ts` — `Oscillator Sample` (component `sampleOscillator`, module `oscillator`) used by the manager and E2E.

### Dynamic components and persistence

- `src/world/components.ts` adds an `extension` category, dynamic registration/unregistration, `isKnownComponentType`, `isDynamicComponentType`, and `isReservedComponentType`. Built-in definition order is unchanged.
- `src/world/validation.ts` keeps unknown component types and surfaces `UNKNOWN_COMPONENT_TYPE` warnings instead of failing the project load.
- Project schema remains v1. `extensions` is optional; extension documents are validated before the world so declared component types are known, then persisted and round-tripped.

### Runtime, graph, and Python

- `RuntimeExtensionState` tracks status, loaded/enabled ids, diagnostics, transient component values, module outputs, tick count, and last tick duration. It is reset on Play/Reset and never persisted.
- Graph node types `setExtensionValue` (requires `write:components`) and `readExtensionValue` (requires `read:world`). Both operate on transient values only; the authored component is never mutated. Graph validation accepts extension component types declared by the project.
- `ChainExecutionResult` carries extension state; both graph drain paths (direct trigger and Python resume) pass and commit it.
- Python snapshots expose installed extensions and transient extension values; bootstrap adds `simulation.extensions`, `simulation.extension_value(component_id)`, and the `Extension` view class.

### UI and observation

- New **Extensions** tab with the Extension Manager: install sample, install from JSON, enable/disable, remove, worker readiness, and diagnostics. Install/enable/remove are structural edits and are blocked while running.
- Add-component menu gains an **Extensions** group; extension components get a generic inspector editor for primitive fields.
- Graph palette includes the two extension nodes; the inspector resolves extension target entities and components; node renderer summarizes their configuration.
- Console gains the `EXTENSION` source filter. Host diagnostics are routed to the store: errors pause a running simulation; warnings are logged.

## 4. Permission model (D-P10-06)

| Permission | Enforced at |
|---|---|
| `run:simulation-hooks` | Host refuses to start a worker without it; required for any module declaration |
| `read:world` | Host strips `entities` and `values` from hook payloads; graph `readExtensionValue` requires it |
| `write:components` | Graph `setExtensionValue` requires it; only transient runtime values are written |
| `emit:events` | Declared and validated; reserved for future event sinks (no event bus in Phase 10) |

Declarations are never trusted implicitly: every capability is re-checked at the host call site, and worker responses are re-validated before use.

## 5. Lifecycle and failure handling

- One worker per enabled extension with modules; source or module changes restart the worker.
- Lifecycle mapping: new session while editing → `onStop`; Play from editing → `onPlay`; new session while running/paused → `onReset`; resume → `onPlay`; elapsed-time increase → `onTick`.
- A hung hook is terminated at the hook budget and reported as `EXTENSION_WORKER_TIMEOUT`.
- A worker crash during a hook is a fatal diagnostic: the runtime pauses and the last valid state is preserved.
- Hook exceptions and extension `console.error` output are warnings; failures are deduplicated per session.
- Invalid or stale worker messages are ignored and reported, never applied.
- Stop/Reset clear pending extension runtime values; the controller is disposed with the shell.

## 6. Testing

- `test/extensions/extensions.test.ts` — 29 tests: manifest/entry/document validation, permissions, protocol sanitization, dynamic registry ownership, worker host startup/hooks/permission filtering/timeout/init error/crash, crash-during-hook fatality, project round-trip, unknown-type degradation, reducer commands/failure deduplication, and graph node execution/permission checks.
- `test/world/components.test.ts` — dynamic registry extension and built-in-shadow rejection.
- `tests/browser/phase10-extensions.spec.ts` — installs the sample, verifies worker readiness and the extension component in the add-component menu; runs hooks while the simulation is running.
- `tests/browser/m2b-graph-editor.spec.ts` — palette count updated from 11 to 13.
- Full regression: 362/362 unit/integration and 39/39 browser tests pass; all prior phases remain green.

## 7. Known limitations

- The worker is defense-in-depth, not a hardened security sandbox. `new Function` code can reach worker globals and network APIs; only install trusted project-local extensions.
- No hard memory or CPU cap beyond the per-hook timeout; a pathological hook is terminated but cannot be pre-empted mid-allocation.
- Extension graph integration uses two fixed node types; arbitrary dynamic node registration is not implemented (the P10-3 risk noted in planning).
- A failed worker is not automatically restarted; disable/enable or reinstall to retry.
- The generic component editor edits primitive fields; nested `defaultConfig` objects are preserved but not editable.
- Graph nodes targeting a disabled extension pass validation and fail at runtime.
- No marketplace, signing, dependency resolution, or version negotiation.
- Python access to extensions is read-only.

## 8. Git and protected-state verification

- Implementation commit: `4184bf38fb00b28a65cf7877b065718f0eefd305` (38 files, Phase 10 only).
- Protected MVP-0 reports remain modified and unstaged; untracked root `package-lock.json` untouched; `wip/m1c-physics-scratch` remains at `a566c9826b1248d651725aabf6013ee128d9f624`.
- No force-push; no unrelated evidence files staged.

## 9. Acceptance

Phase 10 is **IMPLEMENTED — VALIDATED — PENDING PROJECT OWNER ACCEPTANCE**. Formal CLOSED status requires Project Owner acceptance. Phase 11 has not started and is not authorized.
