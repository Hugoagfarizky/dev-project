# SimuForge — M2-C Owner Decision Package

**Date:** 2026-11-15  
**Milestone:** M2-C — Graph Execution Runtime  
**Status:** PENDING PROJECT OWNER DECISIONS — implementation NOT AUTHORIZED  
**Baseline:** `main` @ `c01cad4` (M2-B CLOSED — PASS)  
**Technical review:** `M2_C_TECHNICAL_REVIEW.md`

## 1. Purpose

This package isolates the M2-C behaviour decisions that cannot be settled technically. Each item states the question, the recommended option, the alternative(s), the consequences, and the acceptance criteria it affects. Nothing here is approved until the Project Owner records a decision.

## 2. Already approved (no action required)

| ID | Decision |
|---|---|
| D-M2-01 | Visual scripting delivered in phased, independently verifiable milestones. |
| D-M2-02 | React Flow is a presentation-only dependency; SimuForge owns the canonical graph, validation, and execution semantics. |
| D-M2-03 | Event-triggered sequential execution; cancellation tokens or equivalent; Stop/Reset cancel; Pause suspends; errors to Console; no inconsistent partial state. |
| D-M2-04 | Six initial nodes only; loops, branches, variables, math, and delay nodes deferred. |
| D-M2-05 | No Python in MVP-2. |
| D-M2-06 | No robotics or electrical systems in MVP-2. |
| D-M2-07 | No 2D or hybrid simulation in MVP-2. |
| D-M2-08 | Measure performance before mandatory numeric targets. |

M2-B is CLOSED — PASS (accepted 2026-11-15), so the canonical graph, editor, and adapter are fixed inputs to M2-C.

## 3. Decisions requiring Project Owner approval

### D-M2C-01 — Execution pacing

**Question:** Should a trigger chain execute atomically within one reducer command, or should nodes execute one per fixed simulation step?

**Recommended:** Atomic chain per trigger. All reachable nodes run in deterministic order in a single synchronous step; the body map is committed once at the end. Pause/Stop/Reset act between chains.

**Alternatives:**
- Step-paced: one node per fixed timestep. More granular observability, but force application timing becomes timestep-dependent, chains can straddle Pause/Stop, and queue/session complexity increases substantially.
- Hybrid: atomic chains with step-scheduled trigger draining (recommended variant if queueing is desired).

**Consequences:** Atomic chains are simpler, deterministic, and cannot leave a half-executed chain. Mid-chain "pause" is not observable because chains complete instantly; Pause instead suspends queued triggers. Per-node execution logs still provide order visibility.

**Affects:** criteria 2, 12, 13, 15.

---

### D-M2C-02 — On Start firing rule

**Question:** When does On Start execute?

**Recommended:** Once on each Editing → Running transition (each Play from Editing). It does not fire on Paused → Running (resume), on Reset, or on Stop.

**Alternatives:**
- Fire on every transition into Running, including resume.
- Fire on every Reset as well.
- Fire once per application session (only the first Play).

**Consequences:** The recommended rule matches "start of a simulation run" and keeps resume/reset side-effect free. Firing on resume would re-apply forces unexpectedly; firing on Reset would duplicate effects.

**Affects:** criterion 3.

---

### D-M2C-03 — Manual Trigger availability while Paused

**Question:** Can Manual Trigger be invoked while the simulation is paused, and if so, what happens?

**Recommended:** Manual Trigger is available while Running and Paused. While Running it executes immediately. While Paused it enqueues one execution that runs on resume. This mirrors M1-E's acceptance of force/impulse while Paused while respecting "Pause suspends graph progression".

**Alternatives:**
- Running only; disabled while Paused.
- Immediate execution while Paused (apply force without resuming physics).
- Queue multiple activations while Paused and run them all on resume (subject to D-M2C-04).

**Consequences:** The recommended option keeps controls enabled and predictable. Immediate paused execution would contradict "Pause suspends progression"; disabling the control is simpler but less useful.

**Affects:** criteria 4, 12.

---

### D-M2C-04 — Multiple and repeated trigger events

**Question:** How are simultaneous or rapid trigger events serialized, and what happens when the queue grows?

**Recommended:** FIFO queue, one chain at a time, bounded at 64 entries. Events beyond the cap are dropped with a `warn` Console entry identifying the trigger. Identical contact events for the same body/plane pair within one `runtime/step` collapse to one event. Manual trigger activations are never coalesced.

**Alternatives:**
- Unbounded queue (risk of memory growth and unbounded catch-up).
- Drop oldest instead of newest.
- Coalesce identical manual triggers within a frame.

**Consequences:** Bounded FIFO prevents runaway queues and keeps order predictable. Dropping newest is chosen so already-queued user intent is preserved.

**Affects:** criteria 4, 12, 14.

---

### D-M2C-05 — Fan-out and fan-in semantics

**Question:** How should execution behave when a node has multiple outgoing edges (fan-out) or multiple incoming edges (fan-in)?

**Recommended:** Fan-out executes every branch in deterministic order (canonical edge array order, ties by node id). Fan-in executes the node at most once per trigger; a visited set prevents duplicate execution. Traversal is depth-first from the trigger.

**Alternatives:**
- Execute a fan-in node once per incoming path (can apply the same force multiple times).
- Reject fan-in graphs as invalid.
- Execute in breadth-first order.

**Consequences:** Visit-once is the least surprising for a DAG and avoids duplicate force application. Per-path execution is defensible but makes effect counts depend on graph shape. Rejecting fan-in would require new validation and restrict useful graphs.

**Affects:** criteria 2, 10, 11.

---

### D-M2C-06 — Invalid graph gating at Play

**Question:** What happens when the graph has error diagnostics or no executable trigger when the user presses Play?

**Recommended:** Play is never blocked by graph state. Physics runs normally; graph execution is skipped with a `GRAPH_EXECUTION_SKIPPED` warning in the Console that names the blocking diagnostics. Unreachable action nodes and triggerless graphs produce warnings, not errors.

**Alternatives:**
- Block Play until the graph is valid.
- Silently skip graph execution with no message.
- Execute the valid subgraph and ignore invalid nodes.

**Consequences:** Blocking Play would regress M1-F behaviour and prevent physics-only use. Silent skipping hides failures. Executing a partial subgraph risks surprising side effects. The recommended rule keeps Play usable and makes the skip visible.

**Affects:** criteria 9, 16.

---

### D-M2C-07 — On Plane Contact matching and event definition

**Question:** What counts as a plane contact event, and which entity does `onPlaneContact.targetEntityId` match?

**Recommended:** A rising-edge event: emitted when a dynamic body transitions from not penetrating a static plane to penetrating it in a fixed step. No re-fire while resting. `targetEntityId` matches either the contacting dynamic body or the plane entity (either side may be referenced). Deduplicate per pair per `runtime/step`.

**Alternatives:**
- Level-triggered: fire every step while in contact (queue storm risk).
- Match the dynamic body only (plane references become invalid for this node).
- Match the plane only.

**Consequences:** Rising-edge is required to avoid a resting ball firing every step. Allowing either side matches the current validation, which permits plane targets for this node. If the Owner prefers body-only matching, the validator must be tightened.

**Affects:** criteria 5, 9.

---

### D-M2C-08 — Failure atomicity within a chain

**Question:** When a node fails mid-chain, should successful earlier nodes be kept or should the whole chain roll back?

**Recommended:** Per-node atomicity. A failed node leaves no effect; successful earlier nodes are retained; the chain stops; an error-severity failure pauses the simulation; a warn-severity failure logs and continues with the next node.

**Alternatives:**
- Whole-chain rollback on any error.
- Continue past error-severity failures.
- Pause on warnings as well.

**Consequences:** Per-node atomicity matches the M1-E contract ("failed operation does not partially commit") and preserves observable effects the user already saw. Whole-chain rollback is cleaner transactionally but can silently undo applied forces. Continuing past errors risks compounding invalid state.

**Affects:** criteria 15, 16.

---

### D-M2C-09 — Execution observability scope

**Question:** How much execution visibility should M2-C add?

**Recommended:** Console entries for trigger start, node executed, completion, cancellation, failure, and skip; plus a single compact status line in the Program panel and a transient highlight of the currently executing node. No new panels, timelines, or debugger.

**Alternatives:**
- Console only (no UI change).
- Console plus status line (no node highlight).
- Full execution timeline panel (out of scope for M2-C).

**Consequences:** The recommended set is enough to understand order and failures without redesigning the shell. The node highlight must remain transient editor state, never canonical graph data. At 1024×640 the Program panel is compact, so the status line must not steal canvas height.

**Affects:** criteria 4, 12, 15, 17 and the browser evidence plan.

## 4. Technical findings that do not require product decisions

These are recorded for traceability and will be handled in implementation:

1. Add a monotonic `sessionId` to runtime state; increment on Play-from-Editing and Stop/Reset.
2. Cache the execution plan per graph revision/session; plan build is pure and deterministic.
3. Reuse `applyForce`, `applyImpulse`, and `clearForce`; do not duplicate physics.
4. Keep `graph/set` structural gating unchanged, so the graph cannot change mid-session.
5. Contact events require an additive return from the step pipeline; physics behaviour is unchanged.
6. Executing-node highlight belongs in transient editor state alongside `selectedGraphNodeId`.
7. Console log cap (500) already exists; per-node logging must stay within it.
8. `parseGraphDocument` validates with an empty entity list and therefore rejects entity references — an M2-E persistence defect to fix in that milestone.
9. M2-C adds no new node types, no persistence, and no execution of deferred node categories.

## 5. Approval checklist

| ID | Topic | Recommendation | Owner decision |
|---|---|---|---|
| D-M2C-01 | Execution pacing | Atomic chain per trigger | PENDING |
| D-M2C-02 | On Start firing | Once per Editing → Running | PENDING |
| D-M2C-03 | Manual Trigger while Paused | Available; queue until resume | PENDING |
| D-M2C-04 | Multiple trigger events | FIFO, cap 64, drop newest with warn | PENDING |
| D-M2C-05 | Fan-out / fan-in | Deterministic order; execute once per trigger | PENDING |
| D-M2C-06 | Invalid graph gating | Play allowed; skip execution with warning | PENDING |
| D-M2C-07 | Plane contact definition | Rising edge; match body or plane | PENDING |
| D-M2C-08 | Failure atomicity | Per-node atomic; stop chain; pause on error | PENDING |
| D-M2C-09 | Observability scope | Console + status line + transient highlight | PENDING |

## 6. Authorization statement

Approval of these decisions authorizes the M2-C design to be finalized. It does **not** authorize implementation. M2-C implementation requires a separate explicit Project Owner authorization, and M2-D and M2-E remain NOT STARTED / NOT AUTHORIZED regardless of this package's outcome.
