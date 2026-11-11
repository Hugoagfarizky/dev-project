# SimuForge — MVP-1 Consolidated Execution Roadmap

**Date:** 2026-11-11  
**Status:** MVP-1 CLOSED — M1-A, M1-B, M1-C, M1-D, M1-E, M1-F CLOSED (PASS)

## MVP-1 objective

Deliver Components & Basic Physics per product spec §7.3: basic component system, rigid body, gravity, collision, force/impulse, Play/Pause/Stop/Reset.

## Milestone status

| Milestone | Status | Notes |
|---|---|---|
| M1-A | CLOSED (PASS WITH CONDITIONS) | Component system foundation; residual: unknown component type handling on load |
| M1-B | CLOSED (PASS) | Runtime state machine + structural-edit gating; audit `M1_B_POST_IMPLEMENTATION_CLOSURE_AUDIT.md` |
| M1-C | CLOSED (PASS) | Rigid body + gravity + fixed-step integrator; 16/16 criteria, 113/113 tests, evidence `evidence/m1c-trajectory.json`; report `M1_C_IMPLEMENTATION_REPORT.md` |
| M1-D | CLOSED (PASS) | Primitive colliders (sphere/box/plane) + plane-contact response; 143/143 tests at implementation; evidence `evidence/m1d-contact.json` |
| M1-E | CLOSED (PASS) | Persistent force + instantaneous impulse + runtime logs; 29/29 criteria, 186/186 tests, 16/16 evidence assertions; evidence `evidence/m1e-force-impulse.json`; implementation `fe5eae3`, documentation `a6a0aaa`; report `M1_E_IMPLEMENTATION_REPORT.md` |
| M1-F | CLOSED (PASS) | UI wiring, D-05 demo, runtime monitor, browser acceptance, persistence validation, MVP-1 closure; 13/13 criteria; report `M1_F_IMPLEMENTATION_REPORT.md` |

### M1-C closure record (2026-11-11)

M1-C is closed as **implementation-complete** from its reported evidence: 16/16 acceptance criteria PASS, 113/113 tests PASS, typecheck/build/boundary/token/Node checks PASS, trajectory evidence PASS, implementation `ebc8c21` and report update `40342c0` on `origin/main`. This is a documentation closure, not a new independent audit. The original M1-C report and evidence are preserved unchanged.

### M1-D implementation record (2026-11-11)

M1-D implements the approved D-M1D-01 contract: dynamic sphere/box colliders vs static infinite planes, positional penetration correction, removal of inbound normal velocity, restitution 0, friction 0, no angular response, dynamic-vs-dynamic collisions deferred. The fixed-step runtime, snapshot/reset/stop semantics, structural-edit gating, runtime/authored isolation, and persistence boundaries are preserved. Evidence: `evidence/m1d-contact.json`; 143/143 tests pass.

### M1-E implementation record (2026-11-11)

M1-E implements the approved D-M1E-01..04 contract: persistent world-space force in newtons applied every fixed step until cleared, instantaneous world-space momentum impulse in newton-seconds (`delta-v = impulse / mass`), Running/Paused acceptance with Editing rejection, dynamic sphere/box targets only, and runtime-only state with Console info/warn/error logging. No force/impulse UI was added. The fixed-step runtime, snapshot/reset/stop semantics, structural-edit gating, runtime/authored isolation, and persistence boundaries are preserved. Evidence: `evidence/m1e-force-impulse.json`; 186/186 tests pass (143 baseline + 43 new). Report: `M1_E_IMPLEMENTATION_REPORT.md`. Implementation commit `fe5eae3`; documentation commit `a6a0aaa`.

### M1-E closure record (2026-11-11)

M1-E is officially **CLOSED (PASS)** by Project Owner authorization. Acceptance 29/29 PASS, full tests 186/186 PASS, evidence assertions 16/16 PASS, and typecheck/build/Node/boundary/token checks PASS. Runtime-only force/impulse behavior, lifecycle gating, logging, and runtime/authored isolation remain preserved. M1-F remains NOT AUTHORIZED; planning and decisions are authorized separately.

### M1-F planning record (2026-11-11)

M1-F planning is complete. Owner decisions D-M1F-01..08 are approved. The plan covers full Product Spec §7.3 closure, Inspector Runtime Controls, the D-05 impulse button, Playwright/CDP acceptance with compatibility verification, JSON + screenshot evidence, runtime monitor readouts, explicit demo loading, and save/reopen acceptance. Implementation remains NOT AUTHORIZED. Plan: `M1_F_IMPLEMENTATION_PLAN.md`.

## Dependency map

M1-A (done) → M1-B (done) → M1-C (done) → M1-D (implemented) → M1-E (implemented) → M1-F

M1-B gates all physics work. M1-C and M1-D are sequential (collision needs rigid body). M1-E depends on M1-C/D. M1-F depends on M1-B..E.

## Critical path

M1-A (done) → M1-B (done) → M1-C (done) → M1-D (implemented) → M1-E (implemented) → M1-F.

## Decisions required from Project Owner

- M1-B: six decisions in `M1_B_PROJECT_OWNER_DECISION_BRIEF.md` (snapshot semantics, Play/Pause/Stop/Reset, gating, runtime store, failure recovery, integrator details). APPROVED.
- M1-C: APPROVED 2026-11-11 — fixed timestep 1/60 s + simple accumulator (frame delta clamped to 0.25 s), semi-implicit Euler, gravity −9.81 m/s².
- M1-D: APPROVED 2026-11-11 — D-M1D-01 plane contacts, fully inelastic: dynamic sphere/box vs static infinite plane; positional correction + inbound normal velocity removal; restitution 0, friction 0, no angular response; dynamic-vs-dynamic deferred.
- M1-E: APPROVED 2026-11-11 and CLOSED 2026-11-11 — D-M1E-01 persistent force in newtons until cleared/Reset/Stop; D-M1E-02 instantaneous momentum impulse in N·s (`delta-v = impulse / mass`); D-M1E-03 Running/Paused acceptance, Editing rejection, dynamic targets only, info/warn/error logging; D-M1E-04 runtime/API only, no UI. Implementation `fe5eae3`, documentation `a6a0aaa`.
- M1-F: decisions D-M1F-01..08 APPROVED 2026-11-11 (full §7.3 closure; Inspector Runtime Controls; D-05 button; Playwright/CDP with compatibility check; JSON + screenshots; Console/lifecycle/position-velocity monitor; explicit demo loading; save/reopen acceptance). Implementation still NOT AUTHORIZED.

## Technical risks

- Runtime state vs authored state separation (ADR 0003).
- Transform suppression during simulation (gizmo/Inspector).
- Performance at 100 entities with physics (measure, no premature target).
- Scope creep into MVP-2 (visual scripting) or MVP-3 (integrated demo).

## Suggested implementation order

M1-A (done) → M1-B (done) → M1-C (done) → M1-D (implemented) → M1-E (implemented) → M1-F. Each milestone: design → implement → test → evidence → closure audit → Owner authorization for next.

## Opportunities for batching

- M1-B design + M1-C integrator design can be reviewed together (physics boundary depends on runtime state).
- Unit tests for component/rigid-body/collision can be written in parallel with implementation of each milestone.

## Suggested milestone closure gates

Each milestone requires: acceptance criteria PASS with evidence, full test suite pass, boundary/token/node checks pass, audit report, Owner authorization for next milestone.
