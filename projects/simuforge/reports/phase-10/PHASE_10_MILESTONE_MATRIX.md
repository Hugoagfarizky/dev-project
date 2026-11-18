# Phase 10 — Extensibility: Milestone Matrix

**Status:** PLANNING COMPLETE — PENDING PROJECT OWNER APPROVAL

## Milestones

### P10-0 — Extension foundation

- **Objective:** Manifest schema, loader, registry, permission model.
- **Scope:** `src/extensions/*`, manifest validation, registration API.
- **Dependencies:** Phase 09 closed.
- **Deliverables:** Manifest parser, extension registry, permission checks.
- **Acceptance:** Valid manifest loads; invalid manifest warns and is rejected.
- **Validation:** Unit tests.
- **Risks:** Schema design — keep minimal.

### P10-1 — Custom component registration

- **Objective:** Custom component types in registry, Inspector, serialization.
- **Scope:** `src/world/components.ts` (dynamic registration), validation, Inspector generic editor.
- **Dependencies:** P10-0.
- **Deliverables:** Custom components appear in palette/Inspector; serialize/persist.
- **Acceptance:** Custom component round-trips; unknown types warn but don't break loading.
- **Validation:** Unit + integration tests.
- **Risks:** Generic property editor UX.

### P10-2 — Custom simulation modules

- **Objective:** Extension modules hook into simulation lifecycle (onTick, onPlay, onStop, onReset).
- **Scope:** `src/runtime/extensions.ts`, physics integration, runtime state slice.
- **Dependencies:** P10-0.
- **Deliverables:** Hook interface, worker host, diagnostics.
- **Acceptance:** Module runs during simulation; failure pauses and preserves state.
- **Validation:** Unit + integration tests.
- **Risks:** Worker messaging overhead.

### P10-3 — Visual Scripting and Python integration

- **Objective:** Extensions can expose graph nodes and Python APIs.
- **Scope:** Graph node registration (dynamic), Python snapshot extension.
- **Dependencies:** P10-0, P10-1, P10-2.
- **Deliverables:** Dynamic graph node types from extensions; Python access to extension data.
- **Acceptance:** Extension-provided nodes execute; Python reads extension state.
- **Validation:** Graph tests + Python tests.
- **Risks:** Dynamic node registration complexity — may defer to v2.

### P10-4 — UI and observation

- **Objective:** Extension manager panel, status, diagnostics, edit lock.
- **Scope:** `src/ui/extensions/*`, StudioShell tab/panel, CSS.
- **Dependencies:** P10-0..P10-3.
- **Deliverables:** Manager UI, enable/disable, diagnostics.
- **Acceptance:** User can install/enable/disable/remove extensions; lock while running.
- **Validation:** Browser E2E smoke.
- **Risks:** UI complexity — reuse tab pattern.

### P10-5 — Testing and validation

- **Objective:** Full validation matrix and regression.
- **Scope:** New tests, E2E spec, report.
- **Dependencies:** P10-0..P10-4.
- **Deliverables:** Unit/integration/graph/browser tests, report.
- **Acceptance:** All tests pass; no regressions; build passes.
- **Validation:** Full suite.

## Completion conditions

All milestones complete only after implementation authorization. No milestone started yet.
