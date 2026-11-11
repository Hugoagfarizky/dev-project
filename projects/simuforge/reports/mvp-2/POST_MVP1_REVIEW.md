# SimuForge — Post-MVP-1 Review

**Date:** 2026-11-11  
**Status:** Read-only review; no implementation authorized  
**Baseline:** `main` @ `2f08302650883390c2c81812d33a5d3389ff2349`  
**Scope:** Evaluate MVP-0 and MVP-1 implementation, architecture, limitations, and readiness for MVP-2 planning.

## 1. Verified delivered capabilities

### MVP-0
- Browser-based Studio shell with viewport, hierarchy, Inspector, asset library, console, status bar.
- Empty project creation and primitive creation.
- Selection, transform editing, grid, camera framing.
- Local IndexedDB save/reopen and JSON export/import.
- Boundary checks enforcing `world/**` isolation from Babylon/React/DOM.

### MVP-1
- Attached component system with `rigidBody`.
- Rigid body, gravity, fixed-step integrator (1/60 s, semi-implicit Euler, 0.25 s frame clamp).
- Sphere, box, and plane colliders with fully inelastic plane contact.
- Persistent force and instantaneous impulse, mass-aware, runtime-only.
- Play/Pause/Stop/Reset with snapshots and structural-edit gating.
- Runtime monitor, Console logs, and browser acceptance evidence.
- ADR 0003 persistence isolation; runtime state is not serialized.

### Verified quality gates
- Full unit/integration suite: 186/186 PASS.
- Browser acceptance: 1/1 PASS.
- Typecheck, build, boundary, token, and Node checks: PASS.
- M1-E evidence assertions: 16/16 PASS.
- M1-F browser assertions: 12/12 PASS.

## 2. Architecture assessment

### Strengths
- Clear separation between authored world state and runtime simulation state.
- Deterministic pure runtime physics layer with explicit failure handling.
- Reducer-based Studio state and selectors support testable UI integration.
- Component model is extensible enough for additional component types.
- Evidence-driven milestone closure process is established.

### Current limitations
- Physics is intentionally limited to rigid bodies, gravity, plane contacts, force, and impulse.
- No angular dynamics, friction, restitution, joints, or continuous collision detection.
- No dynamic-vs-dynamic collision response.
- No visual scripting graph runtime or execution engine.
- No Python runtime or worker isolation.
- No 2D solver or 2D/3D bridge.
- No robotics or electrical/electronic simulation domains.
- No asset pipeline, custom components, or extension API.
- No undo/redo or multi-user collaboration.
- Persistence is local IndexedDB only.

## 3. Technical debt and gaps

| Area | Observation | Impact |
|---|---|---|
| Physics | In-house minimal solver | Advanced mechanics require significant new work |
| Collision | Plane-only response | Limits scenarios to floor-like surfaces |
| UI | Runtime controls are basic | Complex authoring will need richer panels |
| Monitoring | Lightweight monitor | Full simulation monitoring remains MVP-3 scope |
| Performance | Not measured at 10/50/100 objects | No validated scalability baseline |
| Persistence | Local-only, schema v1 | Migration strategy needed before major schema changes |
| Testing | Strong unit/integration + one browser scenario | More browser scenarios needed for advanced features |
| Extensibility | No custom component API | Blocks domain-specific modules |

## 4. Product vision gaps

Product Spec §4 and §7 describe a broader platform than currently implemented:

- Visual scripting is specified as MVP-2 but not implemented.
- Python is deferred and has no runtime.
- Robotics and electrical domains are post-MVP.
- 2D/hybrid simulation remains a long-term goal.
- Custom components and extensibility are not implemented.
- Simulation Monitor is basic compared with the intended observability.

## 5. Readiness conclusions

- The runtime/editor foundation is solid enough to support MVP-2 visual scripting.
- The current physics layer is sufficient for simple force/motion demos but not for advanced simulation.
- Persistence and component architecture can support new component types if migration discipline is maintained.
- Browser acceptance infrastructure now exists and should be reused.
- Performance and scalability must be measured before committing to heavier simulation domains.

## 6. Recommendation

Proceed to MVP-2 discovery focused on **Visual Scripting (Phase 06)**, while explicitly deferring robotics, electrical, Python, 2D, and advanced physics until their dependencies and risks are better understood.