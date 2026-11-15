# SimuForge — M2-C Implementation Report

**Date:** 2026-11-15 (implementation and verification)  
**Milestone:** M2-C — Graph Execution Runtime  
**Status:** CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-15)  
**Authorization:** Project Owner explicitly authorized M2-C implementation on 2026-11-15; independent read-only acceptance audit PASS; Project Owner accepted closure on 2026-11-15  
**Implementation baseline:** `main` @ `c78897c` (`origin/main` matched)  
**Final HEAD:** `main` @ `99c32a8ed2e89ca815226bd23ce7c16ace72cea1`  
**M2-A / M2-B:** CLOSED — PASS (unchanged)

## 1. Scope

M2-C implements the graph execution runtime on top of the M2-A canonical graph model and the M1-C/M1-D/M1-E simulation runtime. It adds a pure, deterministic execution engine, trigger and queue plumbing, contact-event reporting, and Program-panel UI feedback. It does not implement M2-D, M2-E, persistence, Python, robotics/electrical systems, 2D/hybrid simulation, or deferred node types.

## 2. Implementation summary by batch

### Batch 1 — Execution engine foundation
- New pure module `app/src/runtime/graphExecution.ts`:
  - `isTriggerNodeType`, `isActionNodeType`, `selectTriggerNodes`, `selectManualTriggerNode`, `hasOutgoingEdge`.
  - `evaluateExecutionReadiness` (validation errors, missing trigger, no outgoing edge, unreachable-action warnings).
  - `collectReachableNodeIds`, `buildExecutionPlan` (Kahn topological sort with node-ID tie-break; fan-in barrier; cycle detection; once per trigger).
  - `applyAction` (delegates to M1-E `applyForce`/`applyImpulse`/`clearForce`).
  - `executeChain` (per-node atomicity; stops on any failure; retains earlier nodes).
  - `matchContactTriggers` (body-or-plane matching, ordered by contact then trigger id).
  - `EXECUTION_QUEUE_CAPACITY = 64`, `GRAPH_EXECUTION_CODES`, `GRAPH_EXECUTION_ERRORS`.
- Engine imports only graph types/validation and runtime physics; `node scripts/check-boundaries.mjs src/runtime` PASS (no React/React Flow/Babylon/browser globals).

### Batch 2 — Trigger system
- Contact boundary in `app/src/runtime/physics.ts`:
  - `PlaneContact`, `contactPairKey`, `stepBodiesWithContacts` (rising-edge detection per body/plane pair, deterministic ordering by entity id).
  - `advanceSimulation` extended with `previousContactKeys`, returning `contacts`, `activeContactKeys` (additive; physics behaviour unchanged; `stepBodies` preserved).
- State: `RuntimeExecutionState`, `ExecutionQueueEntry`, `ExecutionResultSummary`, `ExecutionTriggerInfo`, `ExecutionStatus`, `ExecutionOutcome` on `RuntimeState`; `executingGraphNodeId`/`executionSequence` on `EditorState`; default factories updated.
- Commands: `runtime/graph-trigger`.
- Selectors: `selectRuntimeExecution`, `selectExecutionStatus`, `selectExecutingGraphNodeId`, `selectExecutionSequence`.
- Reducer: monotonic `sessionId`; queue FIFO with capacity 64, drop-newest warning; paused suspension; resume drain; stale-session rejection; On Start once per Editing→Running; On Plane Contact rising-edge dispatch during `runtime/step` with dedupe per pair per step.

### Batch 3 — Action execution
- `applyAction` delegates to existing M1-E APIs; `executeChain` records per-node results with entity id and detail.
- Failure severity: `FORCE_INVALID_TARGET` (warn) and `FORCE_INVALID_STATE` (error) propagate from M1-E; per-node atomicity (M1-E clones/throws before returning).

### Batch 4 — Cancellation and failure hardening
- `runtime/play` Editing→Running: snapshot, bodies, new session, readiness gate; invalid graph skips execution with warning while physics continues.
- `runtime/pause`/`resume`: suspend/drain.
- `runtime/stop`: restore snapshot, bump session, clear queue, cancel log.
- `runtime/reset`: restore snapshot, rebuild bodies, bump session, clear queue, cancel log, no On Start refire.
- `runtime/step`: contact dispatch, drain, error auto-pause.
- `runtime/graph-trigger`: manual trigger while Editing warns; while Running executes; while Paused queues.
- `runtime/error`: auto-pause with execution status update.

### Batch 5 — UI integration and acceptance
- `app/src/ui/graph/GraphEditor.tsx`: execution status line (`data-testid="graph-execution-status"`), Manual Trigger button (`data-testid="graph-manual-trigger"`), transient node highlight via `sf-graph-node-executing` driven by `executionSequence`/`executingGraphNodeId`, cleared after 700 ms.
- `app/src/ui/console/ConsoleDrawer.tsx`: `RUNTIME` added to source filter.
- `app/src/styles/shell.css`: execution bar, status line, highlight pulse; compact bar to preserve canvas height.
- `app/src/ui/shell/computeLayout.ts`: short-height program panel height 200 → 224 to preserve canvas usability and connection reliability with the new bar.

## 3. Acceptance criteria traceability

| # | Criterion | Status | Implementation | Test / evidence |
|---|-----------|--------|----------------|-----------------|
| 1 | Execution consumes canonical graph only; React Flow state never read at execution time | PASS | `app/src/runtime/graphExecution.ts` (no React/React Flow imports; boundary check PASS); reducer reads `state.graph` | `node scripts/check-boundaries.mjs src/runtime` PASS; `test/graph/execution.test.ts` |
| 2 | Deterministic topological order with node-ID tie-break, independent of canvas position / edge-array order | PASS | `buildExecutionPlan` (Kahn + `compareIds`); `collectReachableNodeIds` | `test/graph/execution.test.ts` (`plan is topological…`, `plan ordering is independent…`, `a node appears at most once…`) |
| 3 | On Start fires once per Editing→Running; not on resume/reset/stop | PASS | `runtime/play` Editing branch; resume path does not enqueue; reset/stop bump session and clear queue | `test/editor/graph-execution.test.ts` (`On Start fires once…`, `Reset and Stop do not re-fire…`, `multiple On Start nodes…`) |
| 4 | Manual Trigger can be invoked repeatedly and executes the correct chain | PASS | `runtime/graph-trigger`; `selectManualTriggerNode`; drain | Unit: `manual trigger selection…`; integration: `Manual Trigger executes immediately…`, `Manual Trigger while Paused…`; browser: `Manual Trigger executes repeatedly while running` |
| 5 | On Plane Contact fires on new contact and does not re-fire while resting | PASS | `stepBodiesWithContacts` rising edge; reducer dispatches in `runtime/step` with per-pair dedupe | `test/runtime/contact-events.test.ts` (8 tests); integration: `On Plane Contact fires on a rising edge…`, `On Plane Contact can match the plane entity id` |
| 6 | Apply Force applies persistent force through M1-E API | PASS | `applyAction` → `applyForce` | `test/graph/execution.test.ts` (`executeChain delegates Apply Force…`); integration + browser (`On Start applies an impulse…` uses impulse; force path covered by invalid-graph skip) |
| 7 | Apply Impulse applies instantaneous impulse through M1-E API | PASS | `applyAction` → `applyImpulse` | `test/graph/execution.test.ts`; integration: `executeChain delegates Apply Impulse…`; browser: `On Start applies an impulse and produces visible motion` |
| 8 | Clear Force clears target accumulator through M1-E API | PASS | `applyAction` → `clearForce` | `test/graph/execution.test.ts` (`executeChain delegates…Clear Force`) |
| 9 | Invalid graphs skip graph execution with visible warning while physics remains usable | PASS | `evaluateExecutionReadiness`; `runtime/play` skip branch; no enqueue | Integration: `invalid graph skips execution…`, `a graph without a trigger…`; browser: `invalid graph skips execution with a warning…` |
| 10 | Fan-out executes every branch in deterministic order | PASS | Kahn with node-ID tie-break | `test/graph/execution.test.ts` (`plan is topological…`, `plan ordering is independent…`) |
| 11 | Fan-in executes a node at most once per trigger and only after predecessor paths complete | PASS | Kahn barrier; `Set`/size checks | `test/graph/execution.test.ts` (`a node appears at most once per trigger…`) |
| 12 | Pause suspends queue progression; resume continues without duplication or loss | PASS | `runtime/pause` suspends; `runtime/resume`/`play` drains | Integration: `Manual Trigger while Paused…`, `queued manual triggers drain in FIFO order`; browser: `Paused Manual Trigger queues and drains only on resume` |
| 13 | Stop and Reset cancel active and queued execution | PASS | `runtime/stop`, `runtime/reset` | Integration: `Stop cancels queued execution…`, `Reset cancels queued execution…`; browser: `Stop cancels queued execution…`, `Reset cancels queued execution…` |
| 14 | New session cannot be affected by queued events from older session | PASS | `sessionId` on queue entries; stale rejection in `drainExecution` | Integration: `stale-session queued work is rejected…`; `Stop cancels…` (session bump) |
| 15 | Node failures surfaced in Console; failed nodes leave no partial effect | PASS | `executeChain` stops on failure; M1-E atomicity; `GRAPH_EXECUTION_FAILED` log with severity | Integration: `a warn-severity node failure…`, `an error-severity node failure…`; unit: `a failed node stops the chain…`, `an internal runtime error…` |
| 16 | MVP-1 physics and lifecycle behaviour unchanged | PASS | `stepBodies` preserved; `advanceSimulation` backward-compatible signature extended with optional param | Full suite 250/250 PASS; M1-F browser 1/1 PASS; boundary checks PASS |
| 17 | Browser end-to-end: graph trigger → force/impulse → visible motion | PASS | M2-C browser spec scenarios | `tests/browser/m2c-graph-execution.spec.ts` 7/7 PASS; `reports/mvp-2/evidence/m2c-execution.json` `allPassed: true` |

## 4. Tests and validation

| Check | Result |
|-------|--------|
| `npm test` (Node test runner) | 250/250 PASS (209 baseline + 41 new) |
| `npm run typecheck` | PASS |
| `npm run build` | PASS (pre-existing Vite chunk/dynamic-import warnings only) |
| `npm run check` (node, typecheck, boundaries, tokens) | PASS |
| Boundary check `src/runtime` | PASS (3 files, no React/React Flow/Babylon/browser globals) |
| Boundary check `src/world` | PASS (5 files) |
| Token contrast | PASS |
| M2-C Playwright acceptance | 7/7 scenarios PASS |
| M1-F Playwright regression | 1/1 PASS |
| M2-B Playwright regression | 6/6 PASS |

Focused suites:
- `test/graph/execution.test.ts` — 17 tests (plan, ordering, fan-out/fan-in, atomicity, contact matching, manual trigger selection).
- `test/runtime/contact-events.test.ts` — 8 tests (rising edge, impact speed, re-contact, multi-pair ordering, dedupe, no-plane).
- `test/editor/graph-execution.test.ts` — 16 tests (lifecycle, queue, pause/resume, stop/reset, stale session, Console codes, highlight).

## 5. Evidence

- Browser spec: `app/tests/browser/m2c-graph-execution.spec.ts`
- Machine-readable evidence: `reports/mvp-2/evidence/m2c-execution.json` (7/7 scenarios `passed`, `allPassed: true`)
- Screenshots: `reports/mvp-2/evidence/screenshots/`:
  - `m2c-on-start-impulse.png`
  - `m2c-manual-trigger.png`
  - `m2c-paused-queue.png`
  - `m2c-stop-cancelled.png`
  - `m2c-reset-cancelled.png`
  - `m2c-invalid-skip.png`
  - `m2c-layout-1024x640.png`
  - `m2c-layout-1440x900.png`
  - `m2c-execution.png`

## 6. Files changed (M2-C scope)

New:
- `app/src/runtime/graphExecution.ts`
- `app/test/graph/execution.test.ts`
- `app/test/runtime/contact-events.test.ts`
- `app/test/editor/graph-execution.test.ts`
- `app/tests/browser/m2c-graph-execution.spec.ts`
- `reports/mvp-2/evidence/m2c-execution.json` + screenshots

Modified:
- `app/src/runtime/physics.ts` (contact boundary, `stepBodiesWithContacts`, contact-aware `advanceSimulation`)
- `app/src/editor/state.ts` (execution slice, editor highlight fields, defaults)
- `app/src/editor/commands.ts` (`runtime/graph-trigger`)
- `app/src/editor/selectors.ts` (execution/highlight selectors)
- `app/src/editor/reducer.ts` (lifecycle, queue, session, contact dispatch, manual trigger, failure handling, logging)
- `app/src/ui/graph/GraphEditor.tsx` (status line, Manual Trigger button, highlight effect)
- `app/src/ui/console/ConsoleDrawer.tsx` (`RUNTIME` source filter)
- `app/src/styles/shell.css` (execution bar, highlight, compact sizing)
- `app/src/ui/shell/computeLayout.ts` (short-height program panel 200 → 224)
- `app/package.json` (test list includes new files)
- `reports/mvp-2/MVP2_CONSOLIDATED_ROADMAP.md`
- `reports/mvp-2/MVP2_READINESS_REPORT.md`
- `reports/mvp-0/PROJECT_HANDOFF.md`

## 7. Known limitations and residual risks

- Graph and execution state are in-memory only; persistence is M2-E.
- No undo/redo; execution results cannot be undone.
- `parseGraphDocument` still validates with `{ entities: [] }` (M2-E carry-forward); M2-C does not change it. Documented dependency, not an M2-C blocker.
- Long chains run synchronously on the main thread; no mandatory numeric performance target yet (measurement-first per D-M2-08).
- Contact dedupe is per pair per `runtime/step`; a body separating and re-contacting in a later step produces a new rising edge (per D-M2C-07).
- Console code names follow the technical review's proposed names.

## 8. Git

- Baseline: `main` @ `c78897c` = `origin/main`.
- Protected state (three modified MVP-0 reports, untracked root `package-lock.json`, WIP branch `wip/m1c-physics-scratch` @ `a566c98`) preserved untouched.
- M2-C files staged individually; no `git add .`/`-A`; no history rewrite.
- Final commit and push recorded after commit.

## 9. Status

M2-C is CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-15). Independent read-only acceptance audit: PASS. All 17 acceptance criteria PASS; all 9 approved decisions satisfied. M2-D and M2-E remain NOT STARTED / NOT AUTHORIZED.
