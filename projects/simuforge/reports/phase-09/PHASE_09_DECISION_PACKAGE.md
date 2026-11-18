# Phase 09 — Robotics & Automation: Decision Package

**Status:** PLANNING FINALIZED — APPROVED — NOT STARTED  
**Date:** 2026-11-18  
**Phase:** 09 — Robotics & Automation

All decisions D-P09-01 through D-P09-07 are APPROVED by the Project Owner (2026-11-18).

## Decision register

### D-P09-01 — Scope boundary

- **Context:** Phase 09 must be bounded to avoid scope creep into full robotics.
- **Options:** A: Minimal electromechanical bridge (joints + actuators + sensors); B: Full robotics framework.
- **Approved:** A.
- **Rationale:** Bounded, reuses Phase 08 electrical domain, lower risk, consistent with D-P08-05.
- **Consequences:** Full robotics, SLAM, navigation, ML remain excluded.

### D-P09-02 — Joint fidelity

- **Context:** Joints can be kinematic (position-controlled) or dynamic (constraint-based).
- **Options:** A: Kinematic joints first (revolute, prismatic); B: Dynamic constraint solver.
- **Approved:** A initially; B deferred.
- **Rationale:** Current physics (`src/runtime/physics.ts`) has no constraint solver. Kinematic transforms are
  feasible within existing rigid-body runtime. Dynamic constraints require solver upgrade (risk).
- **Consequences:** Document as kinematic transforms; do not claim full constraint-based dynamics.

### D-P09-03 — Actuator drive source

- **Context:** Actuators need a drive input.
- **Options:** A: DC motor driven by electrical voltage/current (Phase 08 source); B: Abstract torque setpoint.
- **Approved:** A.
- **Rationale:** Reuses Phase 08 electrical domain and coupling pattern (`src/runtime/electrical.ts`).
- **Consequences:** Motor model includes voltage, current, resistance, torque constant, back EMF, speed/torque limits.

### D-P09-04 — Schema

- **Context:** New component types may require schema changes.
- **Options:** A: Retain schema v1 (new `type` strings only); B: Bump schema version.
- **Approved:** A.
- **Rationale:** Phase 08 proved new component types fit under v1 (backward compatible). No migration needed.
- **Consequences:** Older projects open unchanged; new types simply ignored if unknown by older readers.

### D-P09-05 — UI surface

- **Context:** Robotics needs authoring/observation surface.
- **Options:** A: Inspector sections + dedicated Robotics tab (mirror Circuit tab); B: Reuse Circuit tab.
- **Approved:** A.
- **Rationale:** Consistent with D-P08-02 (dedicated tab per domain). Keeps domains separate.
- **Consequences:** New `src/ui/robotics/*` module; program tab extension.

### D-P09-06 — Explicit exclusions

- **Approved exclusions:** Full robotics simulation, advanced dynamics (soft bodies, fluids, deformables),
  AC/transient systems, hardware control, ML, SLAM, navigation, vision, cloud execution.
- **Rationale:** Keeps Phase 09 bounded and consistent with product spec §7.3 note.
- **Consequences:** These remain post-Phase 09 or never-in-scope.

### D-P09-07 — Testing depth

- **Approved:** Unit + integration + E2E smoke, with full regression validation.
- **Rationale:** Manageable; mirrors Phase 08 validation approach.

## Additional approved technical requirements

1. Fixed-timestep physics updates for motor and joint movement (reuse `advanceSimulation`).
2. Separate configuration/validation, physics updates, and render updates (ADR 0003 pattern).
3. Meaningful DC motor model: voltage, current, resistance, torque constant, back EMF, speed limits,
   torque limits.
4. Sensor configuration persisted; sensor readings transient runtime state (never serialized).
5. Articulated kinematic transforms initially; no claim of full constraint-based dynamics.
6. Visual Scripting and Python consume runtime sensor readings and control actuators through
   defined interfaces (`selectRuntimeRobotics`, graph nodes, Python snapshot extension).

## Classification of decisions

- **Established by previous ADRs (0001–0004):** modular monolith, ECS, fixed timestep, editor/runtime
  state separation, worker-based Python, versioned data. Not reopened.
- **Within existing architecture (proven in Phase 08):** component registry extension, graph node
  exhaustive registration, runtime state slice, Circuit-style tab, `applyElectricalAction` coupling pattern.
- **New decisions requiring approval:** D-P09-01..07 (all approved 2026-11-18).

## Risks

- Electrical-mechanical coupling increases state complexity; mitigated by minimal bridge.
- Kinematic-only joints may not satisfy users expecting dynamic robotics; documented limitation.
- Scope creep; mitigated by explicit exclusions (D-P09-06).
