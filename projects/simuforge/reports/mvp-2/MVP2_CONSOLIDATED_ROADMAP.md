# SimuForge — MVP-2 Consolidated Roadmap

**Date:** 2026-11-11 (planning); 2026-11-15 (M2-B closure, M2-C planning, M2-C Owner decisions and readiness)  
**Status:** M2-A CLOSED — PASS; M2-B CLOSED — PASS (PROJECT OWNER ACCEPTED, 2026-11-15); M2-C CLOSED — PASS (PROJECT OWNER ACCEPTED, 2026-11-15); M2-D and M2-E NOT STARTED / NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`; M2-B closure @ `c01cad4`; M2-C planning @ `5b404b0`; M2-C implementation @ `c78897c` (baseline) → `073f0f34a029abe85d596bb2e29e20eefb488226` (final)

## 1. Objective

Deliver Visual Scripting (Product Spec §7.4) as a verifiable increment on top of the MVP-1 foundation, using React Flow as the editor presentation layer while SimuForge owns the canonical graph model.

## 2. Approved milestones

### M2-A — Graph data model and validation (CLOSED — PASS)
- Implementation report: `M2_A_IMPLEMENTATION_REPORT.md`
- Tests: 12 new graph tests; full suite 198/198 PASS
- Scope: canonical graph schema, nodes, connections, object references, serialization, validation.
- Exclusions: UI editor, execution runtime, deferred node types.
- Depends on: MVP-1 closure.
- Deliverables: graph types, validation, serialization, unit tests.
- Acceptance: invalid/incomplete graphs produce understandable validation errors; graphs round-trip.
- Validation: unit/integration tests.
- Evidence: test results.
- Gate: Project Owner authorization before implementation.

### M2-B — Graph editor UI (CLOSED — PASS — PROJECT OWNER ACCEPTED 2026-11-15)
- Scope: Logic Editor panel using React Flow behind a SimuForge adapter.
- Exclusions: execution, persistence changes beyond graph serialization.
- Depends on: M2-A.
- Deliverables: graph editor component, adapter, node palette, connection editing.
- Acceptance: user can create event/action nodes and connect them.
- Validation: component tests + screenshots.
- Evidence: screenshots + test results.
- Gate: Project Owner authorization before implementation.
- Closure record: 13/13 acceptance criteria PASS; full suite 209/209 PASS; adapter tests 7/7 PASS; browser acceptance 6/6 scenarios and 58 assertions PASS; responsive 1024x640 and 1440x900 PASS; M1-F regression 1/1 PASS; typecheck, build, boundary, and token checks PASS.
- Commits: implementation `006f0c2`; acceptance remediation `66b609a`; acceptance report `c06eea8` (accepted HEAD).
- Report: `M2_B_IMPLEMENTATION_REPORT.md`; evidence: `evidence/m2b-browser-acceptance.json` and `evidence/screenshots/`.
- Accepted limitations: in-memory graph only, no undo/redo, plain entity-ID input without a picker, diagnostics not mirrored to Console, compact fit-view zoom in the current Program panel.

### M2-C — Graph execution runtime (CLOSED — PASS — PROJECT OWNER ACCEPTED, 2026-11-15)
- Scope: event-triggered sequential execution of the canonical graph with cancellation tokens or equivalent, Stop/Reset cancellation, Pause suspension, and Console error reporting.
- Exclusions: loops, branches, variables, math nodes, delay nodes, Python, robotics/electrical systems, 2D/hybrid simulation, graph persistence (M2-E), new node types, unrelated UI redesign.
- Depends on: M2-A, M2-B, M1-E.
- Implementation report: `M2_C_IMPLEMENTATION_REPORT.md`
- Planning documents: `M2_C_TECHNICAL_REVIEW.md`; `M2_C_OWNER_DECISION_PACKAGE.md`.
- Implementation and verification: COMPLETE (2026-11-15). Full suite 250/250 PASS; M2-C browser 7/7 PASS; M1-F 1/1; M2-B 6/6.
- Status: CLOSED — PASS — PROJECT OWNER ACCEPTED (2026-11-15). All 17 acceptance criteria PASS; independent audit PASS. M2-D and M2-E remain NOT STARTED / NOT AUTHORIZED.
- Owner decisions: all nine approved — PROJECT OWNER, 2026-11-15:

| ID | Topic | Approved decision |
|---|---|---|
| D-M2C-01 | Execution pacing | Atomic execution chain per trigger; deterministic sequential progression, no concurrency |
| D-M2C-02 | On Start firing | Once per Editing → Running transition only; not on resume, standalone Reset, Stop, or other non-session transitions |
| D-M2C-03 | Manual Trigger while Paused | Available while Paused but queued; executes only after resume; no progression while Paused |
| D-M2C-04 | Multiple/repeated events | FIFO; capacity 64; drop newest when full; warn on drops |
| D-M2C-05 | Fan-out / fan-in | Deterministic topological order; node ID tie-break; node at most once per trigger; fan-in waits for relevant predecessor paths |
| D-M2C-06 | Invalid graph gating | Play allowed; graph execution skipped with warning; simulation remains usable; no partial execution |
| D-M2C-07 | Plane-contact definition | Rising-edge event per body/plane pair; no resting re-fire; match dynamic body or plane per payload |
| D-M2C-08 | Failure atomicity | Per-node atomic; node failure stops chain; runtime error auto-pauses; no whole-chain rollback |
| D-M2C-09 | Observability | Console messages + execution status line + transient node highlight |

- Deliverables: pure execution engine, trigger dispatch (On Start, Manual Trigger, On Plane Contact), action execution through M1-E force/impulse APIs, cancellation and error handling, observability, browser acceptance.
- Acceptance: 17 testable criteria in `M2_C_TECHNICAL_REVIEW.md` §15, covering canonical-only execution, deterministic topological order, On Start rule, manual trigger, plane-contact rising edge, the three action nodes via M1-E, invalid-graph skip, fan-out, fan-in barrier, pause/resume, Stop/Reset cancellation, stale-session isolation, failure visibility with no partial effect, MVP-1 regression, and browser end-to-end motion.
- Validation: unit + integration tests and Playwright browser acceptance.
- Evidence: `reports/mvp-2/evidence/m2c-execution.json` plus screenshots; unit/integration/browser files listed in `M2_C_TECHNICAL_REVIEW.md` §16; M1-F regression required.
- Proposed implementation batches (none started):
  1. Execution engine foundation — pure plan builder with topological ordering, session/queue/cancellation primitives, atomic action application. Depends on: nothing.
  2. Trigger system — On Start on Play, Manual Trigger command and control, On Plane Contact event boundary. Depends on: 1.
  3. Action node execution — Apply Force, Apply Impulse, Clear Force through M1-E APIs. Depends on: 1, 2 (merge order 2 → 3).
  4. Cancellation and error hardening — pause/resume queue, Stop/Reset cancellation, stale-session protection, Console codes. Depends on: 2, 3.
  5. Integration and acceptance — Program status/highlight, Playwright E2E, regression, evidence, report. Depends on: 1–4.
- Status: NOT STARTED / NOT AUTHORIZED. M2-C is not implemented and not closed.
- Gate: separate explicit Project Owner implementation authorization before any batch starts.

### M2-D — End-to-end demo and browser acceptance (NOT STARTED / NOT AUTHORIZED)
- Scope: complete button → graph → force → motion scenario.
- Depends on: M2-B, M2-C.
- Deliverables: demo scenario, Playwright tests, screenshots, JSON evidence.
- Acceptance: all Product Spec §7.4 criteria pass in browser.
- Validation: Playwright/CDP.
- Evidence: JSON assertions + screenshots.
- Gate: Project Owner authorization before implementation.

### M2-E — Persistence, regression, and closure (NOT STARTED / NOT AUTHORIZED)
- Scope: save/reopen validation, full regression, closure documentation.
- Depends on: M2-D.
- Deliverables: persistence tests, closure report, evidence index.
- Acceptance: no graph/runtime state leakage; all gates pass.
- Validation: full suite + browser evidence.
- Evidence: closure report.
- Gate: Project Owner authorization before implementation.

## 3. Dependency map

MVP-1 closure → M2-A → M2-B → M2-C → M2-D → M2-E.

## 4. Risks and mitigations

- React Flow integration complexity: isolate behind an adapter (delivered in M2-B).
- Execution scheduling/cancellation complexity: cancellation contract defined and approved (D-M2C-01, D-M2C-04, D-M2C-08) before implementation.
- Invalid-graph handling: Play stays usable; graph execution is skipped with a warning (D-M2C-06).
- Contact-event storms: rising-edge semantics (D-M2C-07) plus a bounded FIFO queue (D-M2C-04).
- Large graph performance: measure before mandatory targets (D-M2-08).
- Scope creep: keep deferred capabilities explicit.