# SimuForge — M2-C Technical Review

**Date:** 2026-11-15 (planning); 2026-11-15 (reconciled against Owner decisions)  
**Milestone:** M2-C — Graph Execution Runtime  
**Status:** PLANNING AND RECONCILIATION COMPLETE — ALL NINE DECISIONS APPROVED — implementation NOT AUTHORIZED  
**Authorization:** Planning only. M2-C implementation is NOT AUTHORIZED.  
**Baseline:** `main` @ `5b404b0` (planning commit); M2-B CLOSED — PASS @ `c01cad4`, Project Owner accepted 2026-11-15  
**Companion documents:** `M2_C_OWNER_DECISION_PACKAGE.md` (D-M2C-01..D-M2C-09 APPROVED — PROJECT OWNER, 2026-11-15), `MVP2_CONSOLIDATED_ROADMAP.md`, `MVP2_READINESS_REPORT.md`

## 1. Executive summary

The graph domain and the simulation runtime are both in place and are cleanly separable. What does not exist is any component that reads the canonical graph and drives the existing runtime. M2-C is therefore an integration milestone, not a physics milestone: it adds a pure, deterministic execution engine between the canonical graph and the existing M1-E force/impulse APIs, plus the trigger and lifecycle plumbing around it.

Key findings:

- The canonical graph is acyclic (cycles rejected), but fan-out and fan-in are currently unrestricted. Ordering and once-per-trigger semantics are now fixed by D-M2C-05: deterministic topological order with node-id tie-break, fan-in waiting for all relevant predecessor paths.
- The graph is frozen during Running/Paused because `graph/set` is a structural command. This removes graph mutation as a concurrency source and simplifies session handling.
- The runtime has no session identity. Stop/Reset are reducer-level state restorations, so stale-continuation protection needs an explicit session token added to runtime state.
- Physics resolves plane contacts internally and reports nothing. `On Plane Contact` therefore requires an additive event boundary in the physics step; the physics behaviour itself does not need to change.
- All current graph diagnostics are errors and there is no execution-readiness layer. "Invalid graph" gating is now fixed by D-M2C-06: Play proceeds, graph execution is skipped, and a warning is emitted.
- `parseGraphDocument` validates against an empty entity list, so any graph with entity references fails to parse. This is an M2-E persistence defect, recorded here as a cross-milestone risk, not an M2-C blocker.

Recommended architecture: a pure `graphExecution` runtime module that builds a deterministic execution plan from the canonical graph, executes trigger chains atomically through the existing `applyForce`/`applyImpulse`/`clearForce` functions, and is driven by new reducer commands with a monotonic session token. React Flow is not involved at execution time.

Reconciliation: the nine decisions D-M2C-01..D-M2C-09 were approved by the Project Owner on 2026-11-15. Two approved decisions supersede the original recommendations — D-M2C-05 replaces depth-first edge-array ordering with deterministic topological ordering and a node-id tie-break, and D-M2C-08 removes warn-severity chain continuation. Both deltas are documented in §5.5.

Readiness verdict: **READY FOR IMPLEMENTATION AUTHORIZATION** — all essential architecture, product decisions, and acceptance requirements are resolved. Implementation remains unauthorized pending a separate explicit Project Owner authorization.

## 2. Verified baseline

| Item | Value |
|---|---|
| Branch | `main` |
| HEAD at review | `5b404b0` (planning commit); M2-B closure `c01cad4` |
| `origin/main` | `5b404b0` |
| Working tree | Three pre-existing modified MVP-0 reports + untracked root `package-lock.json` only |
| WIP branch | `wip/m1c-physics-scratch` @ `a566c98` (untouched) |
| M2-B closure | `c01cad4` — CLOSED — PASS, accepted 2026-11-15 |
| Owner decisions | D-M2C-01..D-M2C-09 APPROVED — PROJECT OWNER, 2026-11-15 |
| Full suite at M2-B closure | 209/209 PASS |

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
2. **No degree limits.** Validation does not restrict out-degree (fan-out) or in-degree (fan-in). A node can have multiple incoming and outgoing execution edges. Execution ordering and repeat semantics are therefore defined by D-M2C-05 rather than by validation.
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
   - `buildExecutionPlan(graph)` → deterministic topological plan for a trigger plus execution-readiness validation.
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
  → on node failure: stop chain, keep prior node results, log; auto-pause only on error severity
  → on cancel (Stop/Reset): discard queue and candidate, bump session
```

### 5.3 Determinism (reconciled with D-M2C-05)

- Build a deterministic execution plan by topological ordering of the nodes reachable from the firing trigger, using **node ID as the tie-breaker** for any ordering ambiguity.
- A node executes **at most once per trigger**. A fan-in node runs only after all of its relevant predecessor paths within that trigger have completed.
- Never consult canvas position, selection, viewport, edge-array insertion order, or React Flow state.
- Contact events are ordered by dynamic body id, then plane id, then step index.
- No wall-clock, randomness, or async I/O in the engine.

Note: the original planning recommendation ordered depth-first by canonical `graph.edges` array order. The approved decision replaces that with topological ordering and a node-id tie-break; edge-array order is no longer an ordering input.

### 5.4 Alternatives considered

| Alternative | Why rejected |
|---|---|
| Drive execution from React Flow nodes/edges | Violates D-M2-02; editor state is transient and not authoritative. |
| Execute from UI callbacks | Violates the approved "runtime independent of UI callbacks" scope; untestable without a browser. |
| Async/worker execution | Overkill for instantaneous actions; adds stale-session and ordering complexity with no M2-C benefit. |
| Step-paced, one node per fixed step | Adds timing coupling and queue complexity. Worth considering only if per-node observability becomes a product requirement. Rejected by D-M2C-01 (atomic chain per trigger). |
| Reimplement force math in nodes | Duplicates M1-E physics and bypasses its validation/logging/failure contract. Rejected. |

### 5.5 Reconciliation against the approved decisions

| Decision | Approved rule | Review position after reconciliation |
|---|---|---|
| D-M2C-01 | Atomic chain per trigger; deterministic sequential progression | Unchanged. Engine executes the whole chain synchronously; the body map is committed once. |
| D-M2C-02 | On Start once per Editing → Running only | Unchanged. Resume, standalone Reset, Stop, and any non-session transition do not fire On Start. |
| D-M2C-03 | Manual Trigger available while Paused but queued until resume; no progression while Paused | Unchanged. Paused activations enter the FIFO queue and are drained after resume. |
| D-M2C-04 | FIFO, capacity 64, drop newest, warn on drop | Unchanged. Queue is reducer-owned and bounded; overflow is observable in the Console. |
| D-M2C-05 | Deterministic topological order; node ID tie-break; once per trigger; fan-in waits for relevant predecessor paths | **Changed.** Replaces depth-first/edge-array ordering (§5.3). The plan builder must compute a topological order restricted to nodes reachable from the trigger, with a fan-in barrier per node. |
| D-M2C-06 | Play allowed; graph execution skipped with warning; simulation usable | Unchanged. Skip is all-or-nothing; no partial-subgraph execution. |
| D-M2C-07 | Rising edge per body/plane pair; no resting re-fire; match body or plane | Unchanged, with the payload obligation recorded in §9 (both ids present). |
| D-M2C-08 | Per-node atomicity; node failure stops chain; runtime error auto-pauses; no whole-chain rollback | **Changed.** Warn-severity continuation is removed (§7.4). Any node failure stops the chain; only error severity auto-pauses. |
| D-M2C-09 | Console + status line + transient highlight, all required | Unchanged in content; status line and highlight are now mandatory, not optional (§12). |

Remaining technical questions are listed in §17.3. They are implementation-detail questions and do not reopen any approved decision.

## 6. Trigger semantics (approved)

| Trigger | Approved behaviour |
|---|---|
| On Start | Fires once on the Editing → Running transition (each Play from Editing). Does not fire on Paused → Running, on standalone Reset, on Stop, or on any other non-session transition (D-M2C-02). |
| Manual Trigger | Invocable repeatedly while Running; each activation enqueues one execution. While Paused it remains available but the activation is queued and executes only after resume; no progression occurs while Paused (D-M2C-03). |
| On Plane Contact | Fires on a new dynamic-body/static-plane contact (rising edge) reported by the physics step. One event per pair per step batch; not re-fired while resting (D-M2C-07). |

Multiple trigger nodes: each trigger node is an independent entry point. A trigger fires only its own downstream chain. Two triggers firing in the same frame are serialized FIFO.

Multiple trigger events arriving during an active chain: since chains are atomic, they queue and run after the current chain. Queue depth is bounded at 64 entries with a drop-newest-and-warn policy (D-M2C-04).

## 7. Sequential execution, queue, and cancellation

### 7.1 Session model

- `sessionId` increments on every Editing → Running transition and on every Stop/Reset.
- Queue entries carry `{ sessionId, triggerNodeId, payload }`.
- Processing rejects entries whose `sessionId` does not match the current session.
- The graph is frozen during a session (`graph/set` blocked), so no graph-revision check is required; still record a revision for defensive logging.

### 7.2 Queue ownership and ordering

- Reducer owns the queue; the engine is stateless.
- FIFO, bounded at 64 entries (D-M2C-04), drained at defined points:
  - Manual trigger: enqueued, then drained immediately when Running.
  - Contact events: appended during `runtime/step`, drained after the physics step completes.
  - Paused: no contact events; manual triggers are queued and held until resume (D-M2C-03).
- When the queue is full, the newest incoming event is dropped and a warning is emitted naming the trigger.
- One chain executes at a time; no re-entrancy.

### 7.3 Cancellation

- Cancellation is a session bump plus queue clear. Because execution is synchronous, there is no mid-chain interleaving; cancellation takes effect between chains.
- Stop: restore snapshot, reset runtime (existing behaviour), clear queue, bump session.
- Reset: restore snapshot, rebuild bodies, clear queue, bump session, preserve Running/Paused. On Start does not re-fire (D-M2C-02).
- Pause: stop draining the queue; preserve queued entries for resume (D-M2C-03).
- Stale continuation: any future async extension must capture `sessionId` and discard results on mismatch.

### 7.4 Failure handling (reconciled with D-M2C-08)

- Per-node atomic: a failed action leaves no partial effect for that node. The M1-E functions already clone-and-throw, so this holds without extra work.
- **Any node failure stops the current execution chain.** This includes a rejected operation that leaves state unchanged (for example, a target that is no longer available) as well as an internal runtime error.
- Automatic pause occurs only for runtime **error** severity; a rejected/warn operation stops the chain without pausing.
- Successful earlier nodes are retained; there is **no whole-chain transactional rollback**.
- Failure is logged with node id and code at the severity of the failure.

Reconciliation: the original recommendation continued the chain after a warn-severity failure. The approved decision states without qualification that a node failure stops the chain, so warn-continuation is removed.

## 8. Node execution contracts (approved)

| Node | Input | Output | Approved behaviour | Failure |
|---|---|---|---|---|
| On Start | none | execution | Entry point; fires once per Editing → Running (D-M2C-02). | n/a |
| Manual Trigger | none | execution | Entry point; fires on explicit user action while Running, and is queued while Paused (D-M2C-03). | n/a |
| On Plane Contact | none | execution | Entry point; fires on a new contact matching its target via the payload (D-M2C-07). | n/a |
| Apply Force | execution | execution | `applyForce(bodies, targetEntityId, force)`; persistent until cleared/reset/stop. | Rejection (missing/plane target) stops the chain without pausing; runtime error stops the chain and auto-pauses (D-M2C-08). |
| Apply Impulse | execution | execution | `applyImpulse(bodies, targetEntityId, impulse)`; instantaneous `Δv = J/m`. | Same rule as force. |
| Clear Force | execution | execution | `clearForce(bodies, targetEntityId)`; clears that body's accumulator. | Same rule as force. |

Rules:

- Nodes never mutate authored `project.world`.
- Nodes never compute physics; they call the M1-E functions.
- Action nodes validate target existence and dynamic-body eligibility at execution time even though Play-time validation already ran (entities cannot change during a session, but defense in depth is cheap and consistent with M1-E).
- Config edits remain blocked during Running/Paused, so node configs are stable for a session.
- A failed node commits nothing; the chain stops; earlier successful nodes remain (D-M2C-08).

## 9. On Plane Contact event boundary (approved design)

Physics currently resolves plane penetration inside `stepBodies` and discards the contact information. The approved design is additive (implementation in Batch 2; no physics change in this planning task):

- `stepBodies` (or a thin wrapper) returns `{ bodies, contacts }`; `advanceSimulation` aggregates contacts across fixed steps in step order.
- `ContactEvent = { kind: 'planeContact'; bodyEntityId; planeEntityId; stepIndex; position: Vec3; normal: Vec3; impactSpeed: number }`.
- Rising edge only: emit when the pair was not in contact before the step and is in contact after it. A resting body does not re-fire every step (D-M2C-07).
- Deterministic ordering: dynamic body id, then plane id, then step index.
- Deduplication: at most one event per pair per `runtime/step` command (multiple fixed steps in one frame collapse to the first contact).
- **Payload contract:** the event must carry both `bodyEntityId` and `planeEntityId`, because `onPlaneContact.targetEntityId` may match either the dynamic body or the plane (D-M2C-07). Matching is therefore a two-field comparison, not a single-id comparison.
- No change to restitution, friction, penetration correction, or integration.

## 10. Execution readiness validation

Editor validation and execution readiness must remain distinct:

- **Editor diagnostics** continue to describe authoring problems (`validateGraph`).
- **Execution readiness** is a pre-run check that answers "can this graph run meaningfully?" Readiness checks:
  - At least one trigger node exists.
  - At least one trigger has an outgoing edge (otherwise the graph is inert).
  - No error diagnostics from `validateGraph` at Play time.
  - Unreachable action nodes produce a warning, not an error.
  - Graphs with no graph object are treated as "no graph" and Play proceeds with physics only.
- **Gating rule (D-M2C-06, approved):** Play is never blocked by graph state. When the graph is invalid, graph execution is skipped in full and a warning naming the blocking diagnostics is emitted; physics-only simulation continues. No partial-subgraph execution.
- **Runtime checks:** before each action, target existence and dynamic-body eligibility are rechecked through the M1-E functions. A missing runtime target fails that node; per D-M2C-08 the chain stops and the failure is logged. It does not crash the runtime.

Severity mapping: authoring problems are validation errors and skip graph execution entirely at Play; runtime rejections are warnings that stop the chain; internal runtime errors are errors that stop the chain and auto-pause.

## 11. Lifecycle integration matrix

| Lifecycle state | Trigger dispatch | Queue | Execution | Graph edits |
|---|---|---|---|---|
| Editing | On Start not yet; Manual Trigger rejected | empty | none | allowed |
| Running | On Start fired at entry; Manual Trigger and contacts active | drains FIFO (cap 64, drop newest) | atomic chains | blocked |
| Paused | no contact events; Manual Trigger accepted but queued (D-M2C-03) | preserved, not drained | suspended — no progression | blocked |
| Stop | cancels everything, clears queue, bumps session | cleared | none | allowed after transition |
| Reset | cancels everything, clears queue, bumps session | cleared | none (On Start does not re-fire, D-M2C-02) | blocked (still Running/Paused) |

M1-B invariants preserved: Stop implies Reset; standalone Reset preserves mode; structural edits blocked during Running/Paused; failures auto-pause and preserve the last valid state; failed operations do not partially commit.

## 12. Observability and UX

Minimum observability for M2-C (D-M2C-09):

- **Console** (existing drawer), `source: 'RUNTIME'`:
  - `GRAPH_TRIGGERED` (info) — trigger type, node id, session id.
  - `GRAPH_NODE_EXECUTED` (info) — node type, node id, target, effect summary.
  - `GRAPH_EXECUTION_COMPLETED` (info) — trigger node, node count.
  - `GRAPH_EXECUTION_CANCELLED` (warn) — reason (`stop`, `reset`, `session-changed`).
  - `GRAPH_EXECUTION_FAILED` (warn or error, matching the failure severity) — node id, code, message.
  - `GRAPH_EXECUTION_SKIPPED` (warn) — readiness failure reason.
- **Program panel**: one compact status line (idle / executing / suspended / last error) and a transient highlight of the executing node — both required by D-M2C-09.
- **Not in scope:** execution timeline, per-node history panel, step debugger, graph profiler, Console redesign.

Executing-node highlight must live in transient editor state (like `selectedGraphNodeId`), never in the canonical graph.

Because chains are atomic (D-M2C-01), "execution progression" is observable as an ordered sequence of Console entries rather than a slow-motion visual walk; the highlight marks the node currently being processed within the synchronous chain.

## 13. Performance and resource management

Risks:

| Risk | Notes | Initial guardrail (non-mandatory) |
|---|---|---|
| Large graphs | Plan build is O(V+E) per trigger if uncached | Cache plan per graph revision/session |
| Fan-out explosion | A trigger may reach many nodes | Visit-once semantics; measure node counts |
| Repeated trigger events | Manual spam or contact storms | Queue cap 64 with drop-newest warning (D-M2C-04) |
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
- All nine decisions affecting these batches are approved; no batch has started.
- No batch may start without a separate explicit Project Owner implementation authorization.

## 15. Acceptance criteria plan

| # | Criterion | Type |
|---|---|---|
| 1 | Execution consumes the canonical graph only; React Flow state is never read at execution time | Unit |
| 2 | Sequential order is deterministic topological order with node-id tie-break, independent of canvas position or edge-array order | Unit |
| 3 | On Start fires once per Editing → Running transition; not on resume/reset/stop | Integration |
| 4 | Manual Trigger can be invoked repeatedly and executes the correct chain | Integration + browser |
| 5 | On Plane Contact fires on a new contact and does not re-fire while resting | Unit + integration |
| 6 | Apply Force applies a persistent force through the M1-E API | Unit + integration |
| 7 | Apply Impulse applies an instantaneous impulse through the M1-E API | Unit + integration |
| 8 | Clear Force clears the target accumulator through the M1-E API | Unit + integration |
| 9 | Invalid graphs skip graph execution with a visible warning while physics remains usable | Integration + browser |
| 10 | Fan-out executes every branch in deterministic order | Unit |
| 11 | Fan-in executes a node at most once per trigger and only after its relevant predecessor paths complete | Unit |
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

### 17.1 Resolved by Owner decision

| Issue | Resolution |
|---|---|
| Fan-in/fan-out semantics | D-M2C-05 — deterministic topological order, node-id tie-break, once per trigger, fan-in barrier. |
| Contact event definition | D-M2C-07 — rising edge per body/plane pair, no resting re-fire, body-or-plane matching. |
| Invalid graph gating | D-M2C-06 — Play allowed, execution skipped with warning, no partial execution. |
| Whole-chain vs per-node atomicity | D-M2C-08 — per-node atomic, chain stops on any node failure, error auto-pauses, no rollback. |
| Paused manual triggers | D-M2C-03 — available but queued; no progression while Paused. |
| On Start repeat firing | D-M2C-02 — once per Editing → Running only. |
| Execution pacing | D-M2C-01 — atomic chain per trigger. |
| Trigger-event overflow | D-M2C-04 — FIFO, capacity 64, drop newest with warning. |
| Observability scope | D-M2C-09 — Console, status line, transient highlight. |

### 17.2 Remaining implementation risks (not Owner decisions)

| Risk | Impact | Mitigation |
|---|---|---|
| No session identity today | Stale continuation after Stop/Play | Add monotonic session token in Batch 1; queue entries carry it. |
| Compact Program panel | Status/highlight could crowd the canvas at 1024×640 | One status line only; verify in browser acceptance. |
| `parseGraphDocument` rejects entity references | Blocks M2-E save/reopen | Recorded for M2-E; not an M2-C blocker. |
| Graph not persisted | M2-C state lost on reload | Expected; M2-E. |
| No undo/redo | Execution results cannot be undone | Expected limitation. |
| Log volume | Per-node entries could crowd the 500-entry cap | Log trigger start, node results, completion; avoid per-step spam. |
| Long chains on the main thread | Frame stalls with very large graphs | Measurement-first per D-M2-08; no mandatory numeric target yet. |

### 17.3 Remaining technical questions (implementation detail, no Owner decision required)

1. **Plan cache invalidation.** The graph is frozen during a session, so a per-session plan cache is safe. Whether to also key on a graph revision for defensive logging is an implementation choice.
2. **Queue drain granularity.** Contact events are appended during `runtime/step` and drained after the physics step. Whether multiple queued chains drain in the same frame or one per frame is an implementation choice; ordering must remain FIFO either way.
3. **Console code names.** `GRAPH_TRIGGERED`, `GRAPH_NODE_EXECUTED`, `GRAPH_EXECUTION_COMPLETED`, `GRAPH_EXECUTION_CANCELLED`, `GRAPH_EXECUTION_FAILED`, `GRAPH_EXECUTION_SKIPPED` are proposed names; final naming is an implementation detail constrained by D-M2C-09's information requirements.
4. **Status-line placement.** The Program panel is the intended host; the exact layout must be validated at 1024×640.
5. **Contact dedupe across frames.** Deduplication is per pair per `runtime/step`; a body that separates and re-contacts in a later step produces a new rising edge. This follows directly from D-M2C-07 and needs no further approval.
6. **Warn-failure chain stop.** Reconciled as "any node failure stops the chain" (see D-M2C-08 note). If implementation evidence shows that a rejected optional action should not abort a chain, that would be a new Owner decision, not a silent change.

None of these reopens an approved decision or blocks implementation authorization.

## 18. Readiness verdict

**READY FOR IMPLEMENTATION AUTHORIZATION.**

All nine M2-C decisions (D-M2C-01..D-M2C-09) are approved by the Project Owner as of 2026-11-15, the technical recommendations have been reconciled against them, and the acceptance and evidence plan is testable. No technical blocker remains.

Implementation is still not authorized: no batch may start until the Project Owner grants a separate explicit M2-C implementation authorization.

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
