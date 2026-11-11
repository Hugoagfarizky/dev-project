# SimuForge — MVP-2 Consolidated Roadmap

**Date:** 2026-11-11  
**Status:** Discovery/planning; implementation NOT AUTHORIZED  
**Baseline:** MVP-1 CLOSED (PASS) @ `2f08302650883390c2c81812d33a5d3389ff2349`

## 1. Objective

Deliver Visual Scripting (Phase 06) as a verifiable increment on top of the MVP-1 foundation, without modifying MVP-0/MVP-1 behavior.

## 2. Proposed milestones

### M2-A — Graph data model and validation
- Goal: define graph nodes, connections, object references, serialization, and validation.
- Depends on: M1-F.
- Acceptance: invalid/incomplete graphs produce understandable validation errors; graphs round-trip.
- Evidence: unit/integration tests.

### M2-B — Graph editor UI
- Goal: provide a visual graph authoring surface in the Logic Editor panel.
- Depends on: M2-A.
- Acceptance: user can create event/action nodes and connect them.
- Evidence: component tests + screenshots.

### M2-C — Graph execution runtime
- Goal: execute graphs through a runtime independent of UI callbacks.
- Depends on: M2-A, M1-E.
- Acceptance: triggering an event applies the configured force to the target object.
- Evidence: integration tests.

### M2-D — End-to-end demo and browser acceptance
- Goal: complete button → graph → force → motion scenario.
- Depends on: M2-B, M2-C.
- Acceptance: all Product Spec §7.4 criteria pass in browser.
- Evidence: Playwright JSON + screenshots.

### M2-E — Persistence, regression, and closure
- Goal: validate save/reopen, run full regression, produce closure docs.
- Depends on: M2-D.
- Acceptance: no graph/runtime state leakage; all gates pass.
- Evidence: full suite + browser evidence + closure report.

## 3. Dependency map

M1-F (done) → M2-A → M2-B → M2-C → M2-D → M2-E.

## 4. Risks

- Graph library integration complexity.
- Execution scheduling and cancellation.
- Performance with large graphs.
- Scope creep into Python or advanced domains.