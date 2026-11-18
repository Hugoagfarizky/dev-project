# Phase 09 — Robotics & Automation: Milestone Matrix

**Status:** PLANNING FINALIZED — APPROVED — NOT STARTED

## Milestones

### P09-0 — Foundation and component prerequisites

- **Objective:** Add joint/actuator/sensor component types, validation, serialization, Inspector sections.
- **Scope:** `src/world/components.ts`, `src/world/types.ts`, `src/world/validation.ts`, Inspector sections, CSS.
- **Dependencies:** Phase 08 closed.
- **Deliverables:** Component registry entries, type guards, defaults, validation, Inspector UI.
- **Acceptance:** Components round-trip via serialization; invalid values warn and are retained; existing tests pass.
- **Validation:** `npm test`, `npm run typecheck`, `npm run check:boundaries`.
- **Risks:** Schema compatibility — mitigated by v1 retention.

### P09-1 — Joint kinematics

- **Objective:** Revolute and prismatic joints with articulated kinematic transforms.
- **Scope:** `src/robotics/kinematics.ts`, physics runtime extension, runtime robotics slice.
- **Dependencies:** P09-0.
- **Deliverables:** Joint application in fixed timestep; joint angle state.
- **Acceptance:** Known joint configurations produce expected transform changes within tolerance.
- **Validation:** Unit tests for kinematics; integration Play/Reset.
- **Risks:** Kinematic-only limitation documented.

### P09-2 — DC motor actuators and electromechanical coupling

- **Objective:** DC motor model driven by electrical inputs; torque application to joints.
- **Scope:** `src/robotics/motor.ts`, runtime adapter, electrical coupling via selectors.
- **Dependencies:** P09-0, P09-1, Phase 08.
- **Deliverables:** Motor dynamics, actuator runtime state, `runtime/set-actuator`.
- **Acceptance:** Actuator responds to electrical state; invalid config warns and disables; unexpected failure pauses.
- **Validation:** Unit tests for motor model; integration tests.
- **Risks:** Open-loop only (no back-EMF feedback to netlist) — documented limitation.

### P09-3 — Sensors

- **Objective:** Contact, position, velocity sensors with transient runtime readings.
- **Scope:** `src/robotics/sensors.ts`, runtime readings, selectors.
- **Dependencies:** P09-0, P09-1.
- **Deliverables:** Sensor readings in runtime state; `selectSensorReading`.
- **Acceptance:** Sensor readings reflect body/joint state; config persisted, readings transient.
- **Validation:** Unit tests; integration tests.
- **Risks:** Contact sensor depends on existing contact system.

### P09-4 — Visual Scripting integration

- **Objective:** `setActuator` and `readSensor` graph nodes end-to-end.
- **Scope:** `src/graph/types.ts`, `nodes.ts`, `validation.ts`, `adapter.ts`, `NodePalette`, `GraphNodeInspector`,
  `GraphNodeRenderer`, `src/runtime/graphExecution.ts`.
- **Dependencies:** P09-0..P09-3.
- **Deliverables:** Exhaustive registration, execution, cancellation preservation.
- **Acceptance:** Graph drives actuator; sensor triggers graph (trigger-based v1); no regressions.
- **Validation:** `test/graph/robotics-nodes.test.ts` (new), graph execution tests.
- **Risks:** Sensor consumption model (trigger-based vs data ports) — open question D-P09-open-1.

### P09-5 — UI and observation

- **Objective:** Robotics tab/Inspector sections, live read-outs, diagnostics, edit lock.
- **Scope:** `src/ui/robotics/*`, `src/ui/shell/StudioShell.tsx`, `src/ui/panels/Inspector.tsx`, CSS.
- **Dependencies:** P09-0..P09-4.
- **Deliverables:** Tab, palette, workspace, status, diagnostics, lock banner.
- **Acceptance:** Authoring works; editing locks while running; live values displayed.
- **Validation:** Browser E2E smoke.
- **Risks:** UI complexity — reuse Circuit tab pattern.

### P09-6 — Testing and validation

- **Objective:** Full validation matrix and regression.
- **Scope:** New test files, E2E spec, report.
- **Dependencies:** P09-0..P09-5.
- **Deliverables:** Unit/integration/graph/Python/browser tests, report.
- **Acceptance:** `npm test`, `npm run check`, build, Playwright `--workers=1` all pass; no regressions.
- **Validation:** Full suite.
- **Risks:** Test flakiness under concurrent CPU — run serially.

## Completion conditions

All milestones complete only after separate implementation authorization. No milestone is started yet.
