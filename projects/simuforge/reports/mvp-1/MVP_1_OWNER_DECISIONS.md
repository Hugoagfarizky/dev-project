# SimuForge — MVP-1 Owner Decisions (Final)

**Date recorded:** 2026-11-10  
**Authority:** Project Owner (final)  
**Scope:** Architecture direction and MVP-1 scope approval  
**Status:** APPROVED (6 decisions)

## Approved decisions

| ID | Area | Approved decision |
|---|---|---|
| D-01 | Physics | In-house physics; no new physics library |
| D-02 | Component architecture | Attached component list (not ECS) |
| D-03 | Collision | Primitive colliders: sphere, box, plane |
| D-04 | Simulation lifecycle | Structural editing only in Editing; Running and Paused lock structural edits |
| D-05 | Demo | Ball + rigid body + gravity + floor + impulse button |
| D-06 | Performance | Measure 10/50/100 objects; no mandatory numeric target |

## Scope of approval

- Approval applies to architecture direction and MVP-1 scope only.
- Discovery and review are complete.
- MVP-1 implementation is NOT AUTHORIZED.
- M1-A implementation is NOT AUTHORIZED.

## Not yet decided (detail-level, PROPOSED)

- Physics integrator details (fixed timestep value, solver iterations).
- Component data contract (exact schema, validation rules).
- Collider size representation and scaling interaction.
- Runtime snapshot contents and restore granularity.
- Performance measurement thresholds.
- Demo acceptance evidence format.

These remain PROPOSED in the technical plan and require further design/authorization.

## Traceability

- Discovery: `projects/simuforge/reports/mvp-1/MVP_1_DISCOVERY_AND_PLANNING.md`
- Review: `projects/simuforge/reports/mvp-1/MVP_1_DISCOVERY_REVIEW.md`
- Decision brief: `projects/simuforge/reports/mvp-1/MVP_1_PROJECT_OWNER_DECISION_BRIEF.md`
- Technical plan: `projects/simuforge/reports/mvp-1/MVP_1_TECHNICAL_PLAN.md`
- MVP-0 baseline: `projects/simuforge/reports/mvp-0/PROJECT_HANDOFF.md`

## Statement

MVP-0 remains ACCEPTED and CLOSED. MVP-1 implementation is NOT AUTHORIZED. Planning documents updated to reflect APPROVED status for D-01..D-06.
