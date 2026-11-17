# Phase 07 — Python Runtime: Official Closure Report

**Date:** 2026-11-17  
**Phase:** 07 — Python Runtime  
**Status:** CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-17)  
**Accepted implementation commit:** `26a16ef6efb24a43dede2b616485fb01e50a7962` (`main` = `origin/main` at acceptance)  
**Decision record:** [`PHASE_07_DECISION_PACKAGE.md`](PHASE_07_DECISION_PACKAGE.md)  
**Gate evidence:** [`../poc-04/POC_04_PYTHON_RUNTIME_REPORT.md`](../poc-04/POC_04_PYTHON_RUNTIME_REPORT.md)  
**ADR:** [`../../../../docs/decisions/0004-python-runtime-and-execution-model.md`](../../../../docs/decisions/0004-python-runtime-and-execution-model.md)

## 1. Project Owner acceptance

The Project Owner explicitly accepted Phase 07 on **2026-11-17**:

- All **7 Phase 07 acceptance criteria** are **PASS**.
- The Python Worker is **defense-in-depth, not a hardened security sandbox**.
- **Remote or untrusted Python execution is unsupported.**
- There is **no hard memory cap**; watchdog, interrupt, and termination are best-effort.
- **Console auto-collapse at 1280×720 with the Program panel open** is an accepted responsive-layout
  limitation.

Phase 07 is therefore recorded as **CLOSED — PASS**. No further Phase 07 work is authorized or
outstanding.

## 2. Accepted baseline and evidence

The accepted implementation is commit `26a16ef` (`Complete Phase 07 real Pyodide acceptance and runtime
fixes`). Final validation on that baseline:

| Check | Result |
|---|---|
| Unit / integration suite (`npm test`) | **271/271 PASS** |
| Browser suite (`playwright test --workers=1`) | **34/34 PASS** |
| Dedicated Phase 07 browser E2E (`phase7-e2e.spec.ts`) | **6/6 PASS** |
| Phase 07 runtime unit tests (`test/python/runtime.test.ts`) | **13/13 PASS** |
| Type check | **PASS** |
| Architecture boundary checks | **PASS** |
| Token contrast checks | **PASS** |
| Production build (`npm run build`) | **PASS** |

Real Pyodide execution was required for acceptance and was confirmed in the browser: calling
`apply_impulse((6, 0, 0))` from a script produced `velocity.x = 6.000` on the target entity.

The browser suite must be run serially (`--workers=1`); the Playwright specs use fixed physics-timing
waits and can fail transiently under concurrent CPU contention. This is a test-harness constraint, not
a Phase 07 defect.

## 3. Acceptance criteria — 7/7 PASS

The approved definition of done in
[`PHASE_07_DECISION_PACKAGE.md`](PHASE_07_DECISION_PACKAGE.md) §D-P07-08 (11 numbered requirements) is
recorded here as seven acceptance criteria, each covering its related requirements.

| # | Criterion | Result | Evidence |
|---|---|---|---|
| 1 | **Runtime lifecycle and UI state.** The Python surface is `Planned`/`Unavailable` before the runtime is ready, shows `Loading` during lazy startup, and exposes explicit runtime status. | PASS | `PythonPanel.tsx`; runtime status tests; `phase7-e2e.spec.ts` |
| 2 | **Script authoring and persistence.** A user can create, rename, edit, and delete a Python script, and the source persists across save and reopen. | PASS | `test/python/python.test.ts`; `phase7-e2e.spec.ts` (save/reopen scenario) |
| 3 | **Controlled API execution.** A `runPython` node executes on a graph trigger, reads entity position/velocity from a snapshot, and can request apply-force, apply-impulse, or clear-forces actions, which the main thread validates and applies. | PASS | `phase7-e2e.spec.ts` (real Pyodide impulse scenario); `test/python/runtime.test.ts`; `test/graph/*` |
| 4 | **Error reporting and failure atomicity.** Syntax and runtime errors appear in the Console with source `PYTHON` and a line number; no partial actions are applied; the chain stops under the existing failure contract. | PASS | `phase7-e2e.spec.ts` (runtime error scenario); `test/python/runtime.test.ts` |
| 5 | **Timeout and cancellation.** An infinite-loop script is interrupted within the execution budget; the UI stays responsive and the runtime recovers; `Stop` and `Reset` cancel active calls and discard late results; `Pause` does not apply a Python result until resume. | PASS | `test/python/runtime.test.ts` (timeout, interrupt, cancel, restart); `phase7-e2e.spec.ts` (timeout and Stop/Reset scenarios) |
| 6 | **Resource limits.** Source larger than 64 KiB is rejected with a validation message; output larger than 64 KiB is truncated with a warning; actions and Console lines are capped. | PASS | `src/python/limits.ts`; `test/python/python.test.ts`; `test/python/runtime.test.ts` |
| 7 | **Backward compatibility and regression.** Projects without Python data open and run unchanged; invalid Python data warns without blocking the project; existing node types, graph execution, physics lifecycle, and persistence behave unchanged; full regression passes. | PASS | `phase7-e2e.spec.ts` (missing/invalid script reference scenario); full 271/271 unit and 34/34 browser runs |

## 4. Accepted limitations

These limitations are accepted by the Project Owner and do not block closure:

1. **The Worker is defense-in-depth, not a hardened security sandbox.** Capability shadowing, a strict
   CSP, a data-only protocol, and message validation reduce risk; they do not create a security
   boundary against hostile code.
2. **Remote or untrusted Python execution is unsupported.** Python scripts are treated as
   user-authored project content, not as an untrusted-code execution service.
3. **There is no hard memory cap.** Watchdog, interrupt, and termination are best-effort protections;
   a script that exhausts memory can still degrade or terminate the Worker.
4. **Console auto-collapses at 1280×720 with the Program panel open.** This is an accepted
   responsive-layout limitation. Acceptance evidence was captured at 1440×900, where the layout does
   not force the Console closed. MVP layout logic was not changed for Phase 07.

## 5. Delivered scope

- Python project model, validation, and persistence (`python?` section with named scripts).
- Pinned, self-hosted Pyodide Web Worker runtime with lazy startup, request correlation, restart
  budget, and capability probe.
- Restricted Python API v1: read-only entity snapshot (`position`, `velocity`, simulation `time`, `dt`)
  and declarative `apply_force`, `apply_impulse`, and `clear_forces` actions.
- `runPython` graph node, script selection, asynchronous chain scheduling, and lifecycle integration
  with Play/Pause/Stop/Reset.
- Python editor panel (create/rename/edit/delete, line-numbered editor), diagnostics with parsed
  tracebacks, and Console output routed under the `PYTHON` source filter.
- Unit, integration, and browser acceptance coverage for execution, errors, timeout, cancellation,
  persistence, and backward compatibility.

## 6. Documentation-only closure

This closure increment changes documentation only. It does not modify application source, tests,
dependencies, build configuration, or unrelated milestones. The accepted implementation remains
commit `26a16ef`.

Related status records updated in this closure:

- [`PHASE_07_DECISION_PACKAGE.md`](PHASE_07_DECISION_PACKAGE.md) — header now records approval,
  implementation, and closure; historical decision content is retained.
- [`../mvp-0/PROJECT_HANDOFF.md`](../mvp-0/PROJECT_HANDOFF.md) — Phase 07 closure section and current
  milestone register.
- [`../../docs/PRODUCT_SPECIFICATION.md`](../../docs/PRODUCT_SPECIFICATION.md) — Phase 07 status in the
  roadmap and Python scope section.

## 7. Milestone status after closure

| Milestone / phase | Official status |
|---|---|
| MVP-0 | CLOSED — PASS |
| MVP-1 | CLOSED — PASS |
| MVP-2 (M2-A … M2-E) | CLOSED — PASS |
| MVP-3 | CLOSED — PASS |
| Phase 07 — Python Runtime | CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-17) |
| Phase 08 — Electrical & Electronics | NOT STARTED / NOT AUTHORIZED |

Phase 07 was the next official phase after MVP-3. Phase 08 has not started and is not authorized. No
further milestone work begins without a separate Project Owner decision.
