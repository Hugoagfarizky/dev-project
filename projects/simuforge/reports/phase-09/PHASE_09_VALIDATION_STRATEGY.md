# Phase 09 — Robotics & Automation: Validation Strategy

**Status:** PLANNING FINALIZED — APPROVED — NOT STARTED

## Validation matrix

| Stage | Command / Method | PASS condition |
|---|---|---|
| Node version | `node --version` | v24.22.2 |
| Static checks | `npm run check` | All stages pass (check:node, typecheck, boundaries, tokens) |
| Unit tests | `npm test` | 0 failures; new robotics tests pass |
| Type check | `npm run typecheck` | 0 errors |
| Boundary check | `npm run check:boundaries` | pass |
| Contrast check | `npm run check:tokens` | pass |
| Build | `npm run build` | pass (pre-existing warning allowed) |
| Browser regression | `npx playwright test --workers=1` | 0 failures |
| Phase 09 E2E | `npx playwright test tests/browser/phase9-robotics.spec.ts --workers=1` | 0 failures |

## Unit test coverage

- Component validation: joint limits, actuator params, sensor config.
- Kinematics: revolute/prismatic transform correctness within tolerance.
- DC motor model: current, torque, speed, back EMF, clamping.
- Sensor readings: contact, position, velocity.
- Electrical coupling: actuator reads source voltage.
- Serialization round-trip: joint/actuator/sensor components.
- Graph validation: `setActuator`, `readSensor` target validity.
- Graph execution: action application, failure atomicity, cancellation.

## Integration tests

- Play/Reset/Stop lifecycle with robotics state.
- Invalid authored robotics data: warn, disable solving, allow Play, preserve physics/graph.
- Unexpected runtime failure: pause, preserve last valid state, no partial commit.
- Backward compatibility: projects without robotics data open/run unchanged.

## Graph and Python tests

- Graph node exhaustive registration (types, ports, validation, palette, inspector, renderer, execution, adapter).
- Python snapshot extension includes sensor readings.
- Graph triggers on sensor threshold (if implemented).

## Browser E2E (smoke)

- Add joint/actuator/sensor via UI.
- Drive actuator, observe motion.
- Verify editing lock while running.
- Verify empty state and diagnostics.

## Performance

- Solve on Play and relevant changes; never per frame.
- Fixed timestep with existing catch-up budget.
- No new heavy dependencies.

## Measurable PASS/FAIL

- All new tests pass.
- No regressions in closed phases (test count >= 331 unit, >= 36 browser).
- `npm run check` PASS under Node 24.22.2.
- Build PASS.

## Unresolved technical questions

- D-P09-open-1: Graph sensor consumption model (trigger-based vs data ports). Recommend trigger-based for v1.
- D-P09-open-2: Motor current feedback into electrical netlist. Recommend open-loop for v1.
- Whether physics runtime needs constraint solver upgrade for dynamic joints (deferred).
