# SimuForge — MVP-2 Consolidated Roadmap

**Date:** 2026-11-11  
**Status:** M2-A IMPLEMENTED (ready for Owner acceptance); M2-B..M2-E NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`

## 1. Objective

Deliver Visual Scripting (Product Spec §7.4) as a verifiable increment on top of the MVP-1 foundation, using React Flow as the editor presentation layer while SimuForge owns the canonical graph model.

## 2. Approved milestones

### M2-A — Graph data model and validation (IMPLEMENTED)
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

### M2-B — Graph editor UI
- Scope: Logic Editor panel using React Flow behind a SimuForge adapter.
- Exclusions: execution, persistence changes beyond graph serialization.
- Depends on: M2-A.
- Deliverables: graph editor component, adapter, node palette, connection editing.
- Acceptance: user can create event/action nodes and connect them.
- Validation: component tests + screenshots.
- Evidence: screenshots + test results.
- Gate: Project Owner authorization before implementation.

### M2-C — Graph execution runtime
- Scope: event-triggered sequential execution with cancellation tokens, Stop/Reset cancellation, Pause suspension, Console error reporting.
- Exclusions: loops, branches, variables, math nodes, delay nodes.
- Depends on: M2-A, M1-E.
- Deliverables: execution runtime, cancellation, error reporting.
- Acceptance: triggering an event applies the configured force to the target object.
- Validation: integration tests.
- Evidence: test results.
- Gate: Project Owner authorization before implementation.

### M2-D — End-to-end demo and browser acceptance
- Scope: complete button → graph → force → motion scenario.
- Depends on: M2-B, M2-C.
- Deliverables: demo scenario, Playwright tests, screenshots, JSON evidence.
- Acceptance: all Product Spec §7.4 criteria pass in browser.
- Validation: Playwright/CDP.
- Evidence: JSON assertions + screenshots.
- Gate: Project Owner authorization before implementation.

### M2-E — Persistence, regression, and closure
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