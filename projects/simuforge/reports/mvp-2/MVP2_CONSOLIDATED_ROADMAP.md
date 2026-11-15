# SimuForge — MVP-2 Consolidated Roadmap

**Date:** 2026-11-11 (planning); 2026-11-15 (M2-B closure, M2-C planning)  
**Status:** M2-A CLOSED — PASS; M2-B CLOSED — PASS (PROJECT OWNER ACCEPTED, 2026-11-15); M2-C PLANNING COMPLETE / PENDING OWNER DECISIONS — NOT AUTHORIZED; M2-D and M2-E NOT STARTED / NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`

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

### M2-C — Graph execution runtime (PLANNING COMPLETE / PENDING OWNER DECISIONS — NOT AUTHORIZED)
- Scope: event-triggered sequential execution of the canonical graph with cancellation tokens or equivalent, Stop/Reset cancellation, Pause suspension, and Console error reporting.
- Exclusions: loops, branches, variables, math nodes, delay nodes, Python, robotics/electrical systems, 2D/hybrid simulation, graph persistence (M2-E), new node types.
- Depends on: M2-A, M2-B, M1-E.
- Planning documents: `M2_C_TECHNICAL_REVIEW.md`; `M2_C_OWNER_DECISION_PACKAGE.md`.
- Deliverables: pure execution engine, trigger dispatch (On Start, Manual Trigger, On Plane Contact), action execution through M1-E force/impulse APIs, cancellation and error handling, observability, browser acceptance.
- Acceptance: a trigger executes its chain in deterministic order and applies the configured force/impulse to the target object; the 17-criterion plan is in `M2_C_TECHNICAL_REVIEW.md` §15.
- Validation: unit + integration tests and Playwright browser acceptance.
- Evidence: `reports/mvp-2/evidence/m2c-execution.json` plus screenshots.
- Gate: Project Owner approval of D-M2C-01..D-M2C-09, then separate explicit implementation authorization.
- Proposed implementation batches:
  1. Execution engine foundation — pure plan builder, session/queue/cancellation primitives, atomic action application.
  2. Trigger system — On Start on Play, Manual Trigger command and control, On Plane Contact event boundary.
  3. Action node execution — Apply Force, Apply Impulse, Clear Force through M1-E APIs.
  4. Cancellation and error hardening — pause/resume queue, Stop/Reset cancellation, stale-session protection, Console codes.
  5. Integration and acceptance — Program status/highlight, Playwright E2E, regression, evidence, report.
- Outstanding owner decisions: D-M2C-01 execution pacing; D-M2C-02 On Start firing; D-M2C-03 manual trigger while paused; D-M2C-04 multiple/repeated events; D-M2C-05 fan-out/fan-in; D-M2C-06 invalid-graph gating; D-M2C-07 plane-contact definition; D-M2C-08 failure atomicity; D-M2C-09 observability scope.

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

- React Flow integration complexity: isolate behind an adapter.
- Execution scheduling/cancellation complexity: define cancellation contract before implementation.
- Large graph performance: measure before mandatory targets.
- Scope creep: keep deferred capabilities explicit.