# SimuForge — MVP-1 Discovery Review & Architecture Decision Preparation

> **Decision status update (2026-11-10):** Owner decisions D-01..D-06 APPROVED. See `MVP_1_OWNER_DECISIONS.md`. Six open decisions resolved; detail-level items remain PROPOSED.

**Date:** 2026-11-10  
**Type:** Read-only review (no source/config/test changes; no commit/push)

## 1. Executive review

The MVP-1 discovery proposal is **well-structured and consistent with the product spec §7.3**. It correctly identifies MVP-0 as a solid foundation and scopes MVP-1 to Components & Basic Physics. It separates must/should/could/out-of-scope, lists dependencies, proposes testable acceptance criteria, and explicitly states MVP-1 is not authorized. No contradictions with ADR 0002/0003 or MVP-0 evidence were found. The main gaps: the proposal does not quantify the physics approach or component data contract, and it leaves six Owner decisions open. M1-A (component system) is **READY WITH CONDITIONS**.

## 2. Proposal findings

- Consistent with §7.3 (basic component system, rigid body, gravity, collision, force/impulse, Play/Pause/Stop/Reset). ✓
- Consistent with ADR 0003 (editor state not serialized; runtime snapshot must not be persisted). ✓ (proposal notes this)
- Facts vs. assumptions: capability inventory is verified against repo; no unsupported claims. ✓
- Scope realistic: must-haves map 1:1 to §7.3 acceptance criteria. ✓
- Dependencies explicit (M1-A → M1-B → M1-C → M1-D → M1-E → M1-F). ✓
- Acceptance criteria testable (gravity response, collision, force, pause/resume/reset, structural-edit gating). ✓
- Recommendation not presented as decision: open decisions list + explicit non-authorization statement. ✓
- Minor gap: no estimate of test count or evidence artifacts; acceptable for discovery.

## 3. Architecture decision comparison

### A. Physics engine
- **In-house (recommended):** deterministic, no new deps, fits ADR 0002 (no new deps without review), full control of fixed timestep. Cost: implementation effort, correctness risk.
- **Library (e.g., cannon/rapier via Babylon plugin):** faster feature set, but adds dependency (requires ADR update), integration risk with Babylon render loop, potential determinism/version lock.
- **Recommendation:** in-house for M1; revisit library if scope expands to MVP-2/3.

### B. Component model
- **Attached component list (recommended for M1):** simpler, maps to existing entity model (`WorldEntity`), low risk, easy serialization. Less flexible for future complex behaviors.
- **ECS:** more scalable for large entity counts and complex systems, but larger refactor, higher risk, premature for MVP-1 scope.
- **Recommendation:** attached component list for M1-A; revisit ECS if performance/complexity demands it (MVP-2+).

### C. Collision
- **Primitive colliders (recommended):** sphere/box/plane primitives, fast, deterministic, matches primitive authoring. Sufficient for ball-floor-button demo.
- **Mesh collision:** accurate but expensive and non-deterministic; defer.
- **CCD:** only needed for high-speed impacts; defer to later phase.
- **Recommendation:** primitive colliders for M1; mesh/CCD out of scope.

### D. Simulation lifecycle
- States: Editing (default), Running, Paused.
- Play: snapshot initial state → Running; structural edits blocked.
- Pause: freeze progression, resume from paused.
- Stop: return to Editing (and optionally reset).
- Reset: restore initial snapshot (transforms + component state).
- Structural edits blocked while Running/Paused; runtime-marked controls (Play/Pause/Stop/Reset, monitor) remain usable.
- Editor state (camera, selection, gizmo mode) is not part of the runtime snapshot (ADR 0003).

### E. Demo and performance
- Demo: ball with rigid body + gravity + floor collision + button applying impulse (validates §7.3 and feeds MVP-3).
- Object count target: measure at 10/50/100 entities with physics (mirror M0-AC-26 approach; no premature numeric target).
- Frame rate: measure; no claim before measurement.
- Strategy: unit tests (integrator, collision, state machine) + CDP browser harness (controls, gating) + evidence JSON/screenshots.

## 4. M1-A readiness verdict: READY WITH CONDITIONS

M1-A (component system) has clear responsibilities and depends on MVP-0's entity model. Conditions to resolve before start:
1. Decide component model (attached list vs ECS) — recommend attached list.
2. Define component data contract and serialization (must fit `ProjectDocument` envelope / ADR 0003).
3. Define identity rules (component id, entity-component association).
4. Define lifecycle (add/remove component, component update dispatch).
5. Confirm persistence round-trip includes components.
6. Confirm runtime state is not persisted.

## 5. Scope that should NOT enter MVP-1

- Visual scripting / graph execution (MVP-2).
- Integrated demo + monitor (MVP-3).
- Advanced physics, robotics, electrical, multi-user, cloud, Python, 2D solver, hybrid 2D/3D (§7.6).
- Mesh collision, CCD, continuous physics.
- Any feature not traceable to §7.3 acceptance criteria.

## 6. Open decisions for Project Owner

1. Physics engine approach (in-house recommended).
2. Component model (attached list recommended).
3. Collision scope (primitive only recommended).
4. Demo scope (primitives validation vs. full ball-floor-button).
5. Performance targets beyond measurement.
6. Authorization to begin M1-A.

## 7. Statement

MVP-1 implementation is NOT AUTHORIZED. This review is read-only. No source, config, test, or evidence changes were made. No commit or push performed.
