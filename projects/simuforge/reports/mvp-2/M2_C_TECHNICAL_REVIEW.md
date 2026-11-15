# SimuForge — M2-C Technical Review

**Date:** 2026-11-15  
**Milestone:** M2-C — Graph Execution Runtime  
**Status:** PLANNING COMPLETE / PENDING PROJECT OWNER DECISIONS  
**Authorization:** Planning only. M2-C implementation is NOT AUTHORIZED.  
**Baseline:** `main` @ `c01cad4` (M2-B CLOSED — PASS, Project Owner accepted 2026-11-15)  
**Companion documents:** `M2_C_OWNER_DECISION_PACKAGE.md`, `MVP2_CONSOLIDATED_ROADMAP.md`, `MVP2_READINESS_REPORT.md`

## 1. Executive summary

The graph domain and the simulation runtime are both in place and are cleanly separable. What does not exist is any component that reads the canonical graph and drives the existing runtime. M2-C is therefore an integration milestone, not a physics milestone: it adds a pure, deterministic execution engine between the canonical graph and the existing M1-E force/impulse APIs, plus the trigger and lifecycle plumbing around it.

Key findings:

- The canonical graph is acyclic (cycles rejected), but fan-out and fan-in are currently unrestricted. Execution ordering and "execute once per trigger" semantics need an explicit decision.
- The graph is frozen during Running/Paused because `graph/set` is a structural command. This removes graph mutation as a concurrency source and simplifies session handling.
- The runtime has no session identity. Stop/Reset are reducer-level state restorations, so stale-continuation protection needs an explicit session token added to runtime state.
- Physics resolves plane contacts internally and reports nothing. `On Plane Contact` therefore requires an additive event boundary in the physics step; the physics behaviour itself does not need to change.
- All current graph diagnostics are errors and there is no execution-readiness layer. "Invalid graph" gating needs a deliberate rule rather than reusing editor validity blindly.
- `parseGraphDocument` validates against an empty entity list, so any graph with entity references fails to parse. This is an M2-E persistence defect, recorded here as a cross-milestone risk, not an M2-C blocker.

Recommended architecture: a pure `graphExecution` runtime module that builds a deterministic execution plan from the canonical graph, executes trigger chains atomically through the existing `applyForce`/`applyImpulse`/`clearForce` functions, and is driven by new reducer commands with a monotonic session token. React Flow is not involved at execution time.

Readiness verdict: **READY FOR OWNER DECISIONS** — nine decisions (D-M2C-01..D-M2C-09) require Project Owner approval before implementation planning can be finalized.

## 2. Verified baseline

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD | `c01cad4` |
| `origin/main` | `c01cad4` |
| Working tree | Three pre-existing modified MVP-0 reports + untracked root `package-lock.json` only |
| WIP branch | `wip/m1c-physics-scratch` @ `a566c98` (untouched) |
| M2-B closure | `c01cad4` — CLOSED — PASS, accepted 2026-11-15 |
| Full suite at closure | 209/209 PASS |

## 3. Existing architecture findings

### 3.1 Canonical graph domain (`app/src/graph`)

| File | Finding |
|---|---|
| `types.ts` | `Graph` holds `id`, `name`, `nodes[]`, `edges[]`. Nodes are discriminated by `config.kind`, which must equal `node.type`. Edges reference `sourceNodeId/sourcePortId` and `targetNodeId/targetPortId`. Positions are optional canonical data. |
| `nodes.ts` | Ports are derived from node type, never stored as mutable UI state. Triggers have one `out` execution port; actions have `in` and `out` execution ports. Port ids are local (`in`/`out`) and namespaced by node id in the editor. |
| `validation.ts` | Deterministic validation with stable codes. Rejects duplicate node/edge ids, unknown node types, config/type mismatch, missing or non-finite config values, unknown targets, targets without an enabled rigid body, static planes as force targets, missing nodes/ports, port direction/kind mismatch, duplicate connections, and cycles. Every current diagnostic is `severity: 'error'`. |
| `serialization.ts` | Canonical JSON envelope (`format`, `schemaVersion`, `graph`). Parsing re-validates. It validates with `{ entities: [] }`, so any graph containing an entity reference is rejected on parse. |
| `adapter.ts` | One-way projection to React Flow nodes/edges. No React Flow state is written back except canonical mutations. |

Structural facts that constrain execution:

1. **Acyclic by validation.** `GRAPH_UNSUPPORTED_CYCLE` guarantees a DAG, so topological execution is always possible.
2. **No degree limits.** Validation does not restrict out-degree (fan-out) or in-degree (fan-in). A node can have multiple incoming and outgoing execution edges. Ordering and repeat semantics are undefined today.
3. **No reachability requirements.** `GRAPH_MISSING_REQUIRED_PORT` is defined but unused. Trigger nodes may be unconnected; action nodes may be unreachable; a graph may contain no trigger at all.
4. **Entity references are ids only.** `GraphValidationContext` supplies `{ id, components[] }`; target validity is a pure function of authored state.
5. **Positions are canonical but irrelevant to execution.** Execution order must not depend on canvas position.
6. **The graph is editor/domain data, not React Flow data.** Nothing in the graph module imports React Flow.

### 3.2 Simulation runtime (`app/src/runtime`, `app/src/editor`)

| Area | Finding |
|---|---|
| Lifecycle | `RuntimeStatus = 'editing' | 'running' | 'paused'`. `runtime/play` from Editing snapshots entities, derives runtime bodies, and enters Running. Play from Paused only resumes. |
| Stop | Restores the snapshot entities, then resets runtime state to default (Editing). Stop implies Reset (M1-B). |
| Reset | Restores snapshot entities and rebuilds bodies, preserving Running/Paused. Clears the accumulator. Does not change lifecycle mode. |
| Step | `runtime/step` runs only while Running, advances whole fixed steps (1/60 s, 0.25 s frame clamp), and pauses on internal failure while preserving the last valid bodies and accumulator. |
| Force/impulse | `runtime/apply-force`, `runtime/apply-impulse`, and `runtime/clear-force` are accepted while Running or Paused and rejected in Editing with a `warn`. Validation failures are `warn` and leave state unchanged; internal failures are `error` and pause. |
| Atomicity | `applyForce`, `applyImpulse`, and `clearForce` are pure; they clone the body map and throw before returning, so a failed operation never partially commits. |
| Structural gating | `STRUCTURAL_COMMANDS` (including `graph/set`) are blocked unless Editing, with a `STRUCTURAL_EDIT_BLOCKED` warn log. |
| Session identity | None. There is no session id, execution queue, or cancellation token. |
| Contact reporting | `resolvePlaneCollisions` mutates resolved bodies internally and returns nothing. No contact events exist. |
| Logging | `LogEntry` with `source: 'RUNTIME'`, severities `info | warn | error`, optional `code`, `detail`, `entityId`; capped at 500 entries. |

### 3.3 Application integration

- `StudioShell` hosts Play/Pause/Stop/Reset in `TopBar`, the graph editor in the Program panel, runtime controls and monitor in the Inspector/Monitor, and logs in the Console drawer.
- `useSimulationLoop` dispatches `runtime/step` once per animation frame while Running.
- `StudioState.graph` is optional and in-memory only (M2-B); it is not part of the project document.
- The graph editor already keeps selection transient and re-derives nodes from the canonical graph.
- There is no execution engine, trigger dispatch, or graph-related Console output.

## 4. Integration boundaries

| Boundary | Recommended treatment |
|---|---|
| Canonical graph → execution | New pure module reads `Graph` and `GraphValidationContext`; never imports React Flow. |
| Execution → physics | Call the existing `applyForce`, `applyImpulse`, `clearForce` from `runtime/physics.ts`. Do not duplicate force math or bypass runtime command semantics. |
| Execution → reducer | Reducer owns session, queue, and status; the engine is pure and returns results/intents. |
| Physics → execution | Additive contact-event return from the step pipeline (design only in this task). Physics behaviour unchanged. |
| Execution → UI | Console log entries plus a minimal Program panel status; optional transient node highlight. |
| Execution → persistence | None in M2-C. Graph persistence remains M2-E. |

Explicitly unchanged: M1-B lifecycle transitions, M1-C/D physics behaviour, M1-E force/impulse semantics, structural-edit gating, snapshot/restore, and the canonical graph schema.

## 5. Recommended execution architecture

### 5.1 Layering

1. **Pure execution engine** — new module (proposed `app/src/runtime/graphExecution.ts`):
   - `buildExecutionPlan(graph)` → deterministic adjacency + validation of execution readiness.
   - `executeChain(plan, triggerNodeId, bodies)` → ordered per-node results and a candidate body map.
   - `applyAction(bodies, node)` → delegates to the M1-E functions.
   - No React, DOM, store, or timers.
2. **Reducer-owned session** — additive `runtime.execution` slice:
   - `sessionId` (monotonic integer), `status` (`idle | executing | suspended`), FIFO `queue`, `lastTrigger`, `lastResult`.
   - New commands: `runtime/graph-trigger` (manual), and internal session commands for start/complete/cancel.
3. **Trigger sources** — `runtime/play` (On Start), Program panel button (Manual Trigger), `runtime/step` (On Plane Contact).
4. **Presentation** — Console entries and a compact Program panel status line; no redesign.

### 5.2 Execution flow

```
Trigger event
  → reducer validates session + readiness
  → engine builds deterministic plan (cached per graph revision)
  → engine walks the chain, applying actions to a candidate body map
  → on success: commit bodies atomically, log node results
  → on error: stop chain, keep prior node results, pause, log error
  → on cancel (Stop/Reset): discard queue and candidate, bump session
```

### 5.3 Determinism

- Order edges by canonical `graph.edges` array order; break ties by node id.
- Walk depth-first from the trigger, visiting each reachable node at most once.
- Never consult canvas position, selection, viewport, or React Flow state.
- Contact events are ordered by dynamic body id, then plane id, then step index.
- No wall-clock, randomness, or async I/O in the engine.

### 5.4 Alternatives considered

| Alternative | Why rejected |
|---|---|
| Drive execution from React Flow nodes/edges | Violates D-M2-02; editor state is transient and not authoritative. |
| Execute from UI callbacks | Violates the approved "runtime independent of UI callbacks" scope; untestable without a browser. |
| Async/worker execution | Overkill for instantaneous actions; adds stale-session and ordering complexity with no M2-C benefit. |
| Step-paced, one node per fixed step | Adds timing coupling and queue complexity. Worth considering only if per-node observability becomes a product requirement (D-M2C-01). |
| Reimplement force math in nodes | Duplicates M1-E physics and bypasses its validation/logging/failure contract. Rejected. |

## 6. Trigger semantics (proposed)

| Trigger | Proposed behaviour |
|---|---|
| On Start | Fires once on the Editing → Running transition (each Play from Editing). Does not fire on Paused → Running, on Reset, or on Stop. |
| Manual Trigger | Invocable repeatedly while Running. Each activation enqueues one execution. Availability while Paused is an owner decision (D-M2C-03). |
| On Plane Contact | Fires on a new dynamic-body/static-plane contact (rising edge) reported by the physics step. One event per pair per step batch; not re-fired while resting. |

Multiple trigger nodes: each trigger node is an independent entry point. A trigger fires only its own downstream chain. Two triggers firing in the same frame are serialized FIFO.

Multiple trigger events arriving during an active chain: since chains are atomic, they queue and run after the current chain. Queue depth is bounded (proposed 64) with a warn-and-drop policy (D-M2C-04).

## 7. Sequential execution, queue, and cancellation

### 7.1 Session model

- `sessionId` increments on every Editing → Running transition and on every Stop/Reset.
- Queue entries carry `{ sessionId, triggerNodeId, payload }`.
- Processing rejects entries whose `sessionId` does not match the current session.
- The graph is frozen during a session (`graph/set` blocked), so no graph-revision check is required; still record a revision for defensive logging.

### 7.2 Queue ownership and ordering

- Reducer owns the queue; the engine is stateless.
- FIFO, bounded, drained at defined points:
  - Manual trigger: drained immediately when Running.
  - Contact events: appended during `runtime/step`, drained after the physics step completes.
  - Paused: no contact events; manual triggers queue or are rejected per D-M2C-03.
- One chain executes at a time; no re-entrancy.

### 7.3 Cancellation

- Cancellation is a session bump plus queue clear. Because execution is synchronous, there is no mid-chain interleaving; cancellation takes effect between chains.
- Stop: restore snapshot, reset runtime (existing behaviour), clear queue, bump session.
- Reset: restore snapshot, rebuild bodies, clear queue, bump session, preserve Running/Paused.
- Pause: stop draining the queue; preserve queued entries for resume (if D-M2C-03 allows queueing while paused).
- Stale continuation: any future async extension must capture `sessionId` and discard results on mismatch.

### 7.4 Failure handling

- Per-node atomic: a failed action leaves no partial effect for that node.
- Error-severity failure: stop the chain, retain successful earlier nodes, pause, log `error` with node id and code.
- Warn-severity failure (e.g., target no longer available): log `warn`, skip that node, continue the chain.
- No whole-chain rollback by default; the alternative is an owner decision (D-M2C-08).

## 8. Node execution contracts

| Node | Input | Output | Proposed behaviour | Failure |
|---|---|---|---|---|
| On Start | none | execution | Entry point; fires on Editing → Running. | n/a |
| Manual Trigger | none | execution | Entry point; fires on explicit user action while Running. | n/a |
| On Plane Contact | none | execution | Entry point; fires on new contact matching its target (D-M2C-07). | n/a |
| Apply Force | execution | execution | `applyForce(bodies, targetEntityId, force)`; persistent until cleared/reset/stop. | `warn` for missing/plane target; `error` for invalid input/mass/state → pause. |
| Apply Impulse | execution | execution | `applyImpulse(bodies, targetEntityId, impulse)`; instantaneous `Δv = J/m`. | Same severity split as force. |
| Clear Force | execution | execution | `clearForce(bodies, targetEntityId)`; clears that body's accumulator. | `warn` for missing/plane target; `error` for invalid state. |

Rules:

- Nodes never mutate authored `project.world`.
- Nodes never compute physics; they call the M1-E functions.
- Action nodes validate target existence and dynamic-body eligibility at execution time even though Play-time validation already ran (entities cannot change during a session, but defense in depth is cheap and consistent with M1-E).
- Config edits remain blocked during Running/Paused, so node configs are stable for a session.

## 9. On Plane Contact event boundary

Physics currently resolves plane penetration inside `stepBodies` and discards the contact information. Proposed additive design (implementation in Batch 2; no physics change in this task):

- `stepBodies` (or a thin wrapper) returns `{ bodies, contacts }`; `advanceSimulation` aggregates contacts across fixed steps in step order.
- `ContactEvent = { kind: 'planeContact'; bodyEntityId; planeEntityId; stepIndex; position: Vec3; normal: Vec3; impactSpeed: number }`.
- Rising edge only: emit when the pair was not in contact before the step and is in contact after it. A resting body does not re-fire every step.
- Deterministic ordering: dynamic body id, then plane id, then step index.
- Deduplication: at most one event per pair per `runtime/step` command (multiple fixed steps in one frame collapse to the first contact).
- Matching: `onPlaneContact.targetEntityId` should match the contacting dynamic body and/or the plane (D-M2C-07).
- No change to restitution, friction, penetration correction, or integration.

## 10. Execution readiness validation

Editor validation and execution readiness must remain distinct:

- **Editor diagnostics** continue to describe authoring problems (`validateGraph`).
- **Execution readiness** is a pre-run check that answers "can this graph run meaningfully?" Proposed checks:
  - At least one trigger node exists.
  - At least one trigger has an outgoing edge (otherwise the graph is inert).
  - No error diagnostics from `validateGraph` at Play time.
  - Unreachable action nodes produce a warning, not an error.
  - Graphs with no graph object are treated as "no graph" and Play proceeds with physics only.
- **Gating rule:** recommended is to allow Play but skip graph execution with a Console warning when the graph is invalid; the alternative is to block Play (D-M2C-06).
- **Runtime checks:** before each action, target existence and dynamic-body eligibility are rechecked through the M1-E functions. Missing runtime bodies are `warn`, not a crash.

Severity mapping: configuration/authoring problems are errors and block graph execution; missing-at-runtime targets are warnings and skip only the affected node.

## 11. Lifecycle integration matrix

| Lifecycle state | Trigger dispatch | Queue | Execution | Graph edits |
|---|---|---|---|---|
| Editing | On Start not yet; Manual Trigger rejected | empty | none | allowed |
| Running | On Start fired at entry; Manual Trigger and contacts active | drains FIFO | atomic chains | blocked |
| Paused | no contact events; Manual Trigger per D-M2C-03 | preserved or rejected | suspended | blocked |
| Stop | cancels everything, clears queue, bumps session | cleared | none | allowed after transition |
| Reset | cancels everything, clears queue, bumps session | cleared | none (On Start does not re-fire) | blocked (still Running/Paused) |

M1-B invariants preserved: Stop implies Reset; standalone Reset preserves mode; structural edits blocked during Running/Paused; failures auto-pause and preserve the last valid state; failed operations do not partially commit.

## 12. Observability and UX

Minimum viable observability for M2-C:

- **Console** (existing drawer), `source: 'RUNTIME'`:
  - `GRAPH_TRIGGERED` (info) — trigger type, node id, session id.
  - `GRAPH_NODE_EXECUTED` (info) — node type, node id, target, effect summary.
  - `GRAPH_EXECUTION_COMPLETED` (info) — trigger node, node count.
  - `GRAPH_EXECUTION_CANCELLED` (warn) — reason (`stop`, `reset`, `session-changed`).
  - `GRAPH_EXECUTION_FAILED` (error) — node id, code, message.
  - `GRAPH_EXECUTION_SKIPPED` (warn) — readiness failure reason.
- **Program panel**: one compact status line (idle / executing / suspended / last error) and an optional transient highlight of the executing node.
- **Not in scope:** execution timeline, per-node history panel, step debugger, graph profiler, Console redesign.

Executing-node highlight must live in transient editor state (like `selectedGraphNodeId`), never in the canonical graph.

## 13. Performance and resource management

Risks:

| Risk | Notes | Initial guardrail (non-mandatory) |
|---|---|---|
| Large graphs | Plan build is O(V+E) per trigger if uncached | Cache plan per graph revision/session |
| Fan-out explosion | A trigger may reach many nodes | Visit-once semantics; measure node counts |
| Repeated trigger events | Manual spam or contact storms | Queue cap (proposed 64), warn on drop |
| Resting-contact storms | A resting body could fire every step | Rising-edge contact semantics |
| Long chains | Synchronous work on the main thread | Measure chain length; no numeric target yet |
| Cancellation latency | Bounded by chain length (atomic) | Measure with long chains |
| Log volume | 500-entry cap; per-node logs | Log trigger start/end and node results; avoid per-step spam |

Per D-M2-08: measure before setting mandatory numeric targets. Proposed measurements: 10/50/100 nodes, chain depth 1/10/50, 100 triggers/second, and 10/50/100 resting bodies. Record hardware, browser version, and viewport.

## 14. Proposed implementation batches

| Batch | Content | Depends on | Exit criteria |
|---|---|---|---|
| 1 — Execution engine foundation | Pure engine module: plan builder, session/queue/cancellation primitives, action intent application, deterministic ordering, unit tests | — | Unit tests for ordering, fan-out/fan-in, atomicity, session mismatch |
| 2 — Trigger system | On Start on Play, Manual Trigger command + Program button, contact-event boundary in physics + tests | 1 | Trigger tests; contact rising-edge tests; manual trigger integration |
| 3 — Action node execution | Wire Apply Force / Apply Impulse / Clear Force through M1-E APIs; per-node atomicity; integration tests | 1, 2 | Integration tests proving force/impulse/clear effects and severities |
| 4 — Cancellation and error hardening | Pause/resume queue behaviour, Stop/Reset cancellation, stale-session protection, Console codes, guardrails | 2, 3 | Lifecycle matrix tests; no stale execution; no partial commit |
| 5 — Integration and acceptance | Program status/highlight, Playwright E2E, regression, evidence, report | 1–4 | Browser evidence + full regression + documentation |

Notes:

- Batch 4 is primarily hardening and verification; the session token itself is introduced in Batch 1.
- Batch 3 can start in parallel with Batch 2 once Batch 1 lands, but trigger tests need actions to observe, so merge order is 2 → 3.
- No batch may start without explicit Project Owner authorization.

## 15. Acceptance criteria plan

| # | Criterion | Type |
|---|---|---|
| 1 | Execution consumes the canonical graph only; React Flow state is never read at execution time | Unit |
| 2 | Sequential order is deterministic and independent of canvas position | Unit |
| 3 | On Start fires once per Editing → Running transition; not on resume/reset/stop | Integration |
| 4 | Manual Trigger can be invoked repeatedly and executes the correct chain | Integration + browser |
| 5 | On Plane Contact fires on a new contact and does not re-fire while resting | Unit + integration |
| 6 | Apply Force applies a persistent force through the M1-E API | Unit + integration |
| 7 | Apply Impulse applies an instantaneous impulse through the M1-E API | Unit + integration |
| 8 | Clear Force clears the target accumulator through the M1-E API | Unit + integration |
| 9 | Invalid or non-executable graphs are rejected or skipped with a visible diagnostic | Integration + browser |
| 10 | Fan-out executes every branch in deterministic order | Unit |
| 11 | Fan-in executes a node at most once per trigger | Unit |
| 12 | Pause suspends queue progression; resume continues without duplication or loss | Integration + browser |
| 13 | Stop and Reset cancel active and queued execution | Integration + browser |
| 14 | A new session cannot be affected by queued events from an older session | Integration |
| 15 | Node failures are surfaced in the Console; failed nodes leave no partial effect | Integration + browser |
| 16 | MVP-1 physics and lifecycle behaviour is unchanged | Full suite + M1-F browser |
| 17 | Browser end-to-end: graph trigger → force/impulse → visible motion | Browser |

No criterion is claimed as passing; all are planned.

## 16. Evidence plan

- Unit: `app/test/graph/execution.test.ts` (plan, ordering, fan-out/fan-in, atomicity, session), `app/test/runtime/contact-events.test.ts` (rising edge, ordering, dedupe).
- Integration: `app/test/editor/graph-execution.test.ts` (lifecycle, queue, pause/resume, stop/reset, stale session, Console codes).
- Browser: `app/tests/browser/m2c-graph-execution.spec.ts` with scenarios for trigger → motion, manual trigger repetition, pause/resume, stop/reset cancellation, invalid-graph warning, and 1024×640 / 1440×900 layout.
- Evidence: `reports/mvp-2/evidence/m2c-execution.json` (scenario, assertions, viewport, browser version) and screenshots under `reports/mvp-2/evidence/screenshots/`.
- Reproducibility: pinned Node `v24.22.2`, `npm test`, `npm run check`, `npm run build`, `npx playwright test tests/browser/m2c-graph-execution.spec.ts`, and the M1-F regression spec.

## 17. Risks and unresolved issues

| Risk / issue | Impact | Mitigation / owner input |
|---|---|---|
| Fan-in/fan-out semantics undefined | Non-deterministic or surprising execution | D-M2C-05 |
| Contact event definition | Resting bodies could storm the queue | Rising-edge design; D-M2C-07 |
| No session identity | Stale continuation after Stop/Play | Add monotonic session token (Batch 1) |
| Invalid graph gating | Blocking Play is a UX regression; skipping silently is unsafe | D-M2C-06 |
| Whole-chain vs per-node atomicity | Inconsistent runtime state if ambiguous | D-M2C-08 |
| Paused manual triggers | Conflicting expectations (M1-E allows paused force) | D-M2C-03 |
| Compact Program panel | Status/highlight could crowd the canvas | Minimal status line; verify at 1024×640 |
| `parseGraphDocument` rejects entity references | Blocks M2-E save/reopen | Record for M2-E; not an M2-C blocker |
| Graph not persisted | M2-C state lost on reload | Expected; M2-E |
| No undo/redo | Execution results cannot be undone | Expected limitation |

## 18. Readiness verdict

**READY FOR OWNER DECISIONS.**

The architecture is sufficiently understood to implement, but nine product/behaviour decisions (D-M2C-01..D-M2C-09) materially affect observable behaviour and must be approved first. No implementation batch may start until those decisions are recorded and the Project Owner grants explicit M2-C implementation authorization.

M2-C implementation remains **NOT AUTHORIZED**. M2-D and M2-E remain NOT STARTED / NOT AUTHORIZED.

## 19. Source reference index

- `app/src/graph/types.ts`, `nodes.ts`, `validation.ts`, `serialization.ts`, `adapter.ts`
- `app/src/runtime/types.ts`, `physics.ts`
- `app/src/editor/state.ts`, `commands.ts`, `reducer.ts`, `selectors.ts`, `store.ts`
- `app/src/ui/hooks/useSimulationLoop.ts`
- `app/src/ui/shell/StudioShell.tsx`, `TopBar.tsx`
- `app/src/ui/panels/RuntimeControls.tsx`, `RuntimeMonitor.tsx`, `Inspector.tsx`
- `app/src/ui/graph/GraphEditor.tsx`, `GraphNodeRenderer.tsx`, `NodePalette.tsx`, `GraphNodeInspector.tsx`
- `app/src/console/types.ts`
- `app/test/graph/graph.test.ts`, `adapter.test.ts`
- `app/test/runtime/physics.test.ts`, `collision.test.ts`, `force.test.ts`
- `app/test/editor/runtime.test.ts`, `runtime-physics.test.ts`, `runtime-collision.test.ts`, `runtime-force.test.ts`
- `app/tests/browser/m1f-acceptance.spec.ts`, `m2b-graph-editor.spec.ts`
- `reports/mvp-2/MVP2_OWNER_DECISION_PACKAGE.md`, `MVP2_PRODUCT_SCOPE_PROPOSAL.md`, `M2_B_TECHNICAL_DESIGN.md`, `M2_B_IMPLEMENTATION_REPORT.md`
- `reports/mvp-1/M1_B_IMPLEMENTATION_REPORT.md`, `M1_E_IMPLEMENTATION_REPORT.md`, `M1_F_IMPLEMENTATION_REPORT.md`
