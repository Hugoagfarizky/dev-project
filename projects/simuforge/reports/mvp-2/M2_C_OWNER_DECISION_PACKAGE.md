# SimuForge — M2-C Owner Decision Package

**Date:** 2026-11-15 (decisions recorded)  
**Milestone:** M2-C — Graph Execution Runtime  
**Status:** ALL NINE DECISIONS APPROVED — PROJECT OWNER, 2026-11-15; implementation NOT AUTHORIZED  
**Baseline:** `main` @ `5b404b0` (planning commit; M2-B CLOSED — PASS @ `c01cad4`)  
**Technical review:** `M2_C_TECHNICAL_REVIEW.md`  
**Decision groups:** previously approved MVP-2 decisions are **D-M2-01 … D-M2-08**; M2-C decisions are **D-M2C-01 … D-M2C-09**. The two groups are distinct and must not be conflated.

## 1. Purpose

This package records the M2-C behaviour decisions that could not be settled technically. For each item it preserves the original question, recommendation, alternatives, and trade-offs as historical context, then records the official Project Owner decision and approval date.

All nine decisions are now **APPROVED — PROJECT OWNER, 2026-11-15**. No item remains PENDING.

Approval finalizes the M2-C design. It does **not** authorize implementation; M2-C implementation requires a separate explicit Project Owner authorization.

## 2. Previously approved MVP-2 decisions (unchanged, no action required)

These are the MVP-2 programme decisions recorded in `MVP2_OWNER_DECISION_PACKAGE.md`. They remain APPROVED and are not restated or amended here.

| ID | Decision | Status |
|---|---|---|
| D-M2-01 | Visual scripting delivered in phased, independently verifiable milestones. | APPROVED |
| D-M2-02 | React Flow is a presentation-only dependency; SimuForge owns the canonical graph, validation, and execution semantics. | APPROVED |
| D-M2-03 | Event-triggered sequential execution; cancellation tokens or equivalent; Stop/Reset cancel; Pause suspends; errors to Console; no inconsistent partial state. | APPROVED |
| D-M2-04 | Six initial nodes only; loops, branches, variables, math, and delay nodes deferred. | APPROVED |
| D-M2-05 | No Python in MVP-2. | APPROVED |
| D-M2-06 | No robotics or electrical systems in MVP-2. | APPROVED |
| D-M2-07 | No 2D or hybrid simulation in MVP-2. | APPROVED |
| D-M2-08 | Measure performance before mandatory numeric targets. | APPROVED |

M2-B is CLOSED — PASS (accepted 2026-11-15), so the canonical graph, editor, and adapter are fixed inputs to M2-C.

## 3. Newly approved M2-C decisions

Each subsection preserves the original planning context and records the official decision. Where the approved decision is narrower or stricter than the original recommendation, a reconciliation note states the difference explicitly.

### D-M2C-01 — Execution pacing

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** Should a trigger chain execute atomically within one reducer command, or should nodes execute one per fixed simulation step?

**Original recommendation (preserved):** Atomic chain per trigger. All reachable nodes run in deterministic order in a single synchronous step; the body map is committed once at the end. Pause/Stop/Reset act between chains.

**Approved decision:** Atomic execution chain per trigger. Each trigger initiates one sequential execution chain. The chain progresses in deterministic order rather than executing nodes concurrently.

**Reconciliation note:** The approved decision matches the recommendation. Step-paced and hybrid pacing are rejected for M2-C; per-node order visibility is provided by Console entries rather than by timestep scheduling.

**Alternatives considered (preserved):**
- Step-paced: one node per fixed timestep. More granular observability, but force application timing becomes timestep-dependent, chains can straddle Pause/Stop, and queue/session complexity increases substantially.
- Hybrid: atomic chains with step-scheduled trigger draining (recommended variant if queueing is desired).

**Consequences / trade-offs (preserved):** Atomic chains are simpler, deterministic, and cannot leave a half-executed chain. Mid-chain "pause" is not observable because chains complete instantly; Pause instead suspends queued triggers. Per-node execution logs still provide order visibility.

**Affects:** criteria 2, 12, 13, 15.

---

### D-M2C-02 — On Start firing rule

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** When does On Start execute?

**Original recommendation (preserved):** Once on each Editing → Running transition (each Play from Editing). It does not fire on Paused → Running (resume), on Reset, or on Stop.

**Approved decision:** On Start executes once per Editing → Running transition. It must not fire again on:
- Pause → Running resume.
- Standalone Reset.
- Stop.
- Other transitions that do not represent a new Editing → Running session.

**Reconciliation note:** The approved decision matches the recommendation and adds an explicit catch-all: any transition that is not a new Editing → Running session must not fire On Start. Play from Paused remains a resume, not a session start.

**Alternatives considered (preserved):**
- Fire on every transition into Running, including resume.
- Fire on every Reset as well.
- Fire once per application session (only the first Play).

**Consequences / trade-offs (preserved):** The approved rule matches "start of a simulation run" and keeps resume/reset side-effect free. Firing on resume would re-apply forces unexpectedly; firing on Reset would duplicate effects.

**Affects:** criterion 3.

---

### D-M2C-03 — Manual Trigger availability while Paused

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** Can Manual Trigger be invoked while the simulation is paused, and if so, what happens?

**Original recommendation (preserved):** Manual Trigger is available while Running and Paused. While Running it executes immediately. While Paused it enqueues one execution that runs on resume. This mirrors M1-E's acceptance of force/impulse while Paused while respecting "Pause suspends graph progression".

**Approved decision:** Manual Trigger remains available while Paused, but the trigger event is queued and only executes after resume. No execution progression occurs while Paused.

**Reconciliation note:** The approved decision matches the recommendation. Queued paused activations are subject to the D-M2C-04 queue rules (FIFO, capacity 64, drop newest with warning).

**Alternatives considered (preserved):**
- Running only; disabled while Paused.
- Immediate execution while Paused (apply force without resuming physics).
- Queue multiple activations while Paused and run them all on resume (subject to D-M2C-04).

**Consequences / trade-offs (preserved):** The approved option keeps controls enabled and predictable. Immediate paused execution would contradict "Pause suspends progression"; disabling the control is simpler but less useful.

**Affects:** criteria 4, 12.

---

### D-M2C-04 — Multiple and repeated trigger events

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** How are simultaneous or rapid trigger events serialized, and what happens when the queue grows?

**Original recommendation (preserved):** FIFO queue, one chain at a time, bounded at 64 entries. Events beyond the cap are dropped with a `warn` Console entry identifying the trigger. Identical contact events for the same body/plane pair within one `runtime/step` collapse to one event. Manual trigger activations are never coalesced.

**Approved decision:**
- FIFO event queue.
- Maximum queue capacity: 64 events.
- When full, drop the newest incoming event.
- Emit a warning for dropped events.

Preserve deterministic ordering and prevent unbounded queue growth.

**Reconciliation note:** The approved decision matches the recommendation. The approved text states the four queue rules as mandatory; contact-event deduplication and non-coalescing of manual triggers remain the recommended implementation detail consistent with D-M2C-07 and D-M2C-03.

**Alternatives considered (preserved):**
- Unbounded queue (risk of memory growth and unbounded catch-up).
- Drop oldest instead of newest.
- Coalesce identical manual triggers within a frame.

**Consequences / trade-offs (preserved):** Bounded FIFO prevents runaway queues and keeps order predictable. Dropping newest is chosen so already-queued user intent is preserved.

**Affects:** criteria 4, 12, 14.

---

### D-M2C-05 — Fan-out and fan-in semantics

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** How should execution behave when a node has multiple outgoing edges (fan-out) or multiple incoming edges (fan-in)?

**Original recommendation (preserved):** Fan-out executes every branch in deterministic order (canonical edge array order, ties by node id). Fan-in executes the node at most once per trigger; a visited set prevents duplicate execution. Traversal is depth-first from the trigger.

**Approved decision:**
- Deterministic execution order.
- A node executes at most once per trigger.
- Fan-in waits for all relevant predecessor paths in that trigger to complete.

Use deterministic topological ordering, with node ID as tie-breaker, where applicable.

Do not let canvas position, selection, or React Flow transient state influence execution order.

**Reconciliation note — ordering algorithm superseded:** The original recommendation used depth-first traversal ordered by the canonical `graph.edges` array with node-id tie-break. The approved decision replaces that with **deterministic topological ordering and node ID as the tie-breaker**, plus an explicit fan-in barrier ("waits for all relevant predecessor paths"). Consequence: edge-array order is no longer an ordering input, and depth-first traversal is no longer the execution order. Visit-once-per-trigger and canvas-independence are confirmed unchanged.

**Alternatives considered (preserved):**
- Execute a fan-in node once per incoming path (can apply the same force multiple times).
- Reject fan-in graphs as invalid.
- Execute in breadth-first order.

**Consequences / trade-offs (preserved):** Visit-once is the least surprising for a DAG and avoids duplicate force application. Per-path execution is defensible but makes effect counts depend on graph shape. Rejecting fan-in would require new validation and restrict useful graphs. Topological ordering additionally guarantees that every relevant predecessor of a node has completed before the node runs.

**Affects:** criteria 2, 10, 11.

---

### D-M2C-06 — Invalid graph gating at Play

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** What happens when the graph has error diagnostics or no executable trigger when the user presses Play?

**Original recommendation (preserved):** Play is never blocked by graph state. Physics runs normally; graph execution is skipped with a `GRAPH_EXECUTION_SKIPPED` warning in the Console that names the blocking diagnostics. Unreachable action nodes and triggerless graphs produce warnings, not errors.

**Approved decision:** Play remains allowed even when the graph is invalid. When the graph is invalid:
- Graph execution is skipped.
- A warning is emitted.
- Existing simulation behavior remains usable.

Do not silently execute a partially invalid graph.

**Reconciliation note:** The approved decision matches the recommendation and adds an explicit prohibition on partial-subgraph execution. Invalid means: any `validateGraph` error diagnostic, or no executable trigger. Physics-only simulation continues unchanged.

**Alternatives considered (preserved):**
- Block Play until the graph is valid.
- Silently skip graph execution with no message.
- Execute the valid subgraph and ignore invalid nodes.

**Consequences / trade-offs (preserved):** Blocking Play would regress M1-F behaviour and prevent physics-only use. Silent skipping hides failures. Executing a partial subgraph risks surprising side effects. The approved rule keeps Play usable and makes the skip visible.

**Affects:** criteria 9, 16.

---

### D-M2C-07 — Plane-contact definition

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** What counts as a plane contact event, and which entity does `onPlaneContact.targetEntityId` match?

**Original recommendation (preserved):** A rising-edge event: emitted when a dynamic body transitions from not penetrating a static plane to penetrating it in a fixed step. No re-fire while resting. `targetEntityId` matches either the contacting dynamic body or the plane entity (either side may be referenced). Deduplicate per pair per `runtime/step`.

**Approved decision:** Use rising-edge contact events. A contact event occurs when a new contact begins for a body/plane pair. Sustained resting contact must not repeatedly fire the trigger. On Plane Contact may match either the dynamic body or the plane, subject to the canonical event payload contract.

**Reconciliation note:** The approved decision matches the recommendation. "Subject to the canonical event payload contract" makes the payload a technical obligation: the contact event must carry both the dynamic body id and the plane id so either side can be matched without changing the physics behaviour.

**Alternatives considered (preserved):**
- Level-triggered: fire every step while in contact (queue storm risk).
- Match the dynamic body only (plane references become invalid for this node).
- Match the plane only.

**Consequences / trade-offs (preserved):** Rising-edge is required to avoid a resting ball firing every step. Allowing either side matches the current validation, which permits plane targets for this node. If matching were restricted to the body only, the validator would have to be tightened — not the case under this approval.

**Affects:** criteria 5, 9.

---

### D-M2C-08 — Failure atomicity within a chain

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** When a node fails mid-chain, should successful earlier nodes be kept or should the whole chain roll back?

**Original recommendation (preserved):** Per-node atomicity. A failed node leaves no effect; successful earlier nodes are retained; the chain stops; an error-severity failure pauses the simulation; a warn-severity failure logs and continues with the next node.

**Approved decision:** Per-node atomicity.
- A failed node must not partially commit its own state changes.
- A node failure stops the current execution chain.
- Runtime error triggers automatic pause.
- Previously successful nodes in the same chain are not automatically rolled back.

Document explicitly that per-node atomicity does not mean whole-chain transactional rollback.

**Reconciliation note — warn-severity continuation removed:** The original recommendation allowed a warn-severity failure to log and continue to the next node. The approved decision states without qualification that **a node failure stops the current execution chain**. The reconciled reading is: any node failure — including a rejected operation that leaves state unchanged, such as a missing target — stops the chain; automatic pause is reserved for runtime error severity. The chain does not continue past a failed node, and no whole-chain rollback occurs.

**Alternatives considered (preserved):**
- Whole-chain rollback on any error.
- Continue past error-severity failures.
- Pause on warnings as well.

**Consequences / trade-offs (preserved):** Per-node atomicity matches the M1-E contract ("failed operation does not partially commit") and preserves observable effects the user already saw. Whole-chain rollback is cleaner transactionally but can silently undo applied forces. Continuing past errors risks compounding invalid state. Stopping on every node failure makes failure boundaries easy to reason about, at the cost of a chain ending earlier than a warn-and-continue policy would.

**Affects:** criteria 15, 16.

---

### D-M2C-09 — Execution observability

**Status:** APPROVED — PROJECT OWNER, 2026-11-15

**Question (preserved):** How much execution visibility should M2-C add?

**Original recommendation (preserved):** Console entries for trigger start, node executed, completion, cancellation, failure, and skip; plus a single compact status line in the Program panel and a transient highlight of the currently executing node. No new panels, timelines, or debugger.

**Approved decision:** Provide:
- Console messages.
- Execution status line.
- Transient node highlight.

The user should be able to understand trigger activity, execution progression, completion, cancellation, and failures without introducing unrelated UI redesign.

**Reconciliation note:** The approved decision makes all three surfaces required rather than optional. The node highlight must remain transient editor state and never canonical graph data. With atomic chains (D-M2C-01), "progression" is conveyed by ordered per-node Console messages, not by a slow-motion visual walk.

**Alternatives considered (preserved):**
- Console only (no UI change).
- Console plus status line (no node highlight).
- Full execution timeline panel (out of scope for M2-C).

**Consequences / trade-offs (preserved):** The approved set is enough to understand order and failures without redesigning the shell. At 1024×640 the Program panel is compact, so the status line must not steal canvas height.

**Affects:** criteria 4, 12, 15, 17 and the browser evidence plan.

## 4. Technical findings that do not require product decisions

These are recorded for traceability and will be handled in implementation. They are technical obligations implied by the approved decisions, not new Owner decisions.

1. Add a monotonic `sessionId` to runtime state; increment on Play-from-Editing and Stop/Reset.
2. Cache the execution plan per graph revision/session; plan build is pure and deterministic.
3. Reuse `applyForce`, `applyImpulse`, and `clearForce`; do not duplicate physics.
4. Keep `graph/set` structural gating unchanged, so the graph cannot change mid-session.
5. Contact events require an additive return from the step pipeline; physics behaviour is unchanged.
6. Executing-node highlight belongs in transient editor state alongside `selectedGraphNodeId`.
7. Console log cap (500) already exists; per-node logging must stay within it.
8. `parseGraphDocument` validates with an empty entity list and therefore rejects entity references — an M2-E persistence defect to fix in that milestone.
9. M2-C adds no new node types, no persistence, and no execution of deferred node categories.
10. Deterministic topological ordering with node-id tie-break replaces the earlier edge-array/depth-first ordering (see D-M2C-05 reconciliation note).
11. Contact-event payload must expose both the dynamic body id and the plane id (see D-M2C-07 reconciliation note).

## 5. Approval checklist

| ID | Topic | Approved decision | Owner decision |
|---|---|---|---|
| D-M2C-01 | Execution pacing | Atomic execution chain per trigger; deterministic sequential progression | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-02 | On Start firing | Once per Editing → Running transition only | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-03 | Manual Trigger while Paused | Available; queued; executes only after resume; no progression while Paused | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-04 | Multiple/repeated events | FIFO; capacity 64; drop newest when full; warn on drops | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-05 | Fan-out / fan-in | Deterministic topological order; node ID tie-break; node at most once per trigger; fan-in waits for relevant predecessor paths | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-06 | Invalid graph gating | Play allowed; graph execution skipped with warning; simulation remains usable | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-07 | Plane-contact definition | Rising edge per body/plane pair; no re-fire while resting; match body or plane per payload | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-08 | Failure atomicity | Per-node atomic; node failure stops chain; runtime error auto-pauses; no whole-chain rollback | APPROVED — PROJECT OWNER, 2026-11-15 |
| D-M2C-09 | Observability | Console messages + execution status line + transient node highlight | APPROVED — PROJECT OWNER, 2026-11-15 |

## 6. Authorization statement

All nine M2-C decisions are approved, so the M2-C design is final and the readiness review can be completed.

This package authorizes no implementation. M2-C implementation requires a separate explicit Project Owner authorization. M2-D and M2-E remain NOT STARTED / NOT AUTHORIZED regardless of this package's outcome.
