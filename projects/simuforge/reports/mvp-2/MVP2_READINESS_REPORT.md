# SimuForge — MVP-2 Readiness Report

**Date:** 2026-11-11 (initial planning); 2026-11-15 (M2-C planning review)  
**Status:** M2-A CLOSED — PASS; M2-B CLOSED — PASS (PROJECT OWNER ACCEPTED, 2026-11-15); M2-C PLANNING COMPLETE / PENDING OWNER DECISIONS — NOT AUTHORIZED; M2-D and M2-E NOT STARTED / NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`; current `main` @ `c01cad4`

## 1. Decision status

- MVP-2 decisions **D-M2-01 through D-M2-08** are APPROVED and recorded in `MVP2_OWNER_DECISION_PACKAGE.md`.
- M2-C decisions **D-M2C-01 through D-M2C-09** are PROPOSED and PENDING Project Owner approval (`M2_C_OWNER_DECISION_PACKAGE.md`).
- No M2-C implementation authorization has been granted.

## 2. Foundation readiness

- MVP-0 and MVP-1 are CLOSED — PASS.
- M2-A (canonical graph model, validation, serialization) is CLOSED — PASS.
- M2-B (graph editor UI, adapter, six node types, Inspector configuration, diagnostics, browser acceptance) is CLOSED — PASS, accepted 2026-11-15.
- Runtime physics, force/impulse APIs, lifecycle, structural-edit gating, Console logging, runtime monitor, and persistence isolation are implemented and tested.
- Playwright browser acceptance infrastructure exists and is reused across milestones.
- The reducer/store architecture supports additive graph and execution state.
- Full suite at M2-B closure: 209/209 PASS; M1-F browser regression 1/1 PASS.

## 3. Milestone status

| Milestone | Status |
|---|---|
| MVP-0 | CLOSED — PASS |
| MVP-1 | CLOSED — PASS |
| M2-A | CLOSED — PASS |
| M2-B | CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-15) |
| M2-C | PLANNING COMPLETE / PENDING OWNER DECISIONS — NOT AUTHORIZED |
| M2-D | NOT STARTED / NOT AUTHORIZED |
| M2-E | NOT STARTED / NOT AUTHORIZED |

## 4. M2-C technical review status

The M2-C technical review is complete. Documents:

- `M2_C_TECHNICAL_REVIEW.md` — architecture findings, integration boundaries, recommended execution architecture, trigger semantics, cancellation design, node contracts, readiness validation, lifecycle matrix, observability, performance plan, batches, acceptance criteria, evidence plan, risks.
- `M2_C_OWNER_DECISION_PACKAGE.md` — nine decisions requiring Owner approval with recommendations and alternatives.

Key findings:

1. The canonical graph is acyclic but permits fan-out and fan-in; execution ordering and repeat semantics are undefined and need an Owner decision.
2. The graph is frozen during Running/Paused (`graph/set` is structural), which removes mid-session graph mutation from the concurrency model.
3. The runtime has no session identity; Stop/Reset are state restorations, so a monotonic session token must be added for stale-continuation protection.
4. Physics resolves plane contacts internally and reports nothing; `On Plane Contact` requires an additive contact-event boundary, not a physics behaviour change.
5. All current graph diagnostics are errors and there is no execution-readiness layer; invalid-graph gating needs an explicit rule.
6. The M1-E force/impulse/clear APIs are pure, atomic, and severity-aware, so they are safe to reuse directly from graph nodes.
7. React Flow is not involved at execution time; the canonical graph remains the sole execution input.
8. `parseGraphDocument` validates against an empty entity list and rejects entity references — an M2-E persistence defect, not an M2-C blocker.

## 5. Planning completeness

| Area | Status |
|---|---|
| Existing architecture review | COMPLETE |
| Integration boundary definition | COMPLETE |
| Recommended execution architecture | COMPLETE |
| Trigger semantics proposal | COMPLETE (pending decisions) |
| Cancellation and lifecycle design | COMPLETE (pending decisions) |
| Node execution contracts | COMPLETE |
| Plane-contact event design | COMPLETE (design only) |
| Execution-readiness validation | COMPLETE (pending gating decision) |
| Observability scope | COMPLETE (pending decision) |
| Performance plan | COMPLETE (measurement-first per D-M2-08) |
| Implementation batches | COMPLETE (five batches, not started) |
| Acceptance criteria | COMPLETE (17 planned criteria) |
| Evidence plan | COMPLETE |
| Risks and unresolved issues | COMPLETE |

## 6. Outstanding Owner decisions

| ID | Question |
|---|---|
| D-M2C-01 | Atomic chain per trigger vs step-paced execution |
| D-M2C-02 | On Start fires once per Editing → Running, or on resume/reset too |
| D-M2C-03 | Manual Trigger availability and behaviour while Paused |
| D-M2C-04 | Multiple/repeated trigger serialization and queue limits |
| D-M2C-05 | Fan-out/fan-in ordering and once-per-trigger semantics |
| D-M2C-06 | Invalid-graph gating at Play |
| D-M2C-07 | Plane-contact event definition and target matching |
| D-M2C-08 | Per-node vs whole-chain failure atomicity |
| D-M2C-09 | Execution observability scope |

## 7. Remaining prerequisites before M2-C implementation

1. Project Owner records decisions D-M2C-01 through D-M2C-09.
2. The M2-C design is finalized against those decisions.
3. The Project Owner grants explicit M2-C implementation authorization.
4. No M2-D or M2-E work starts before M2-C closure.

## 8. Readiness verdict

**READY FOR OWNER DECISIONS.**

M2-C is not implementation-ready while D-M2C-01 through D-M2C-09 remain unresolved, because each materially affects observable behaviour, testability, or scope. The architecture itself is understood and no technical blocker was found.

## 9. Authorization statement

M2-C implementation remains **NOT AUTHORIZED**. This report and the accompanying planning documents authorize no code, test, dependency, or evidence changes. M2-D and M2-E remain NOT STARTED / NOT AUTHORIZED.
