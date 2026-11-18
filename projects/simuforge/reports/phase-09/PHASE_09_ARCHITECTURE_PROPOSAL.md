# Phase 09 — Robotics & Automation: Architecture Proposal

**Status:** PLANNING FINALIZED — APPROVED — NOT STARTED  
**Date:** 2026-11-18

## 1. Module boundaries

- `src/world/components.ts` — extend registry with `joint`, `actuator`, `sensor` (follow Phase 08 pattern).
- `src/world/types.ts` — add `JointComponent`, `ActuatorComponent`, `SensorComponent` to `AnyComponent`.
- `src/world/validation.ts` — type-specific validation (joint limits, actuator params, sensor config).
- `src/electrical/*` — unchanged; actuator reads electrical state via existing selectors.
- `src/robotics/` (new) — kinematics (`kinematics.ts`), motor model (`motor.ts`), sensor model (`sensors.ts`),
  runtime adapter (`runtime/robotics.ts`), validation (`validation.ts`).
- `src/runtime/physics.ts` — extend `createRuntimeBodies`/`stepBodies` to apply joint transforms and
  actuator forces; keep fixed timestep.
- `src/runtime/graphExecution.ts` — add `setActuator`, `readSensor` node types.
- `src/editor/state.ts` — add `RuntimeRoboticsState` slice (transient).
- `src/editor/reducer.ts` — solve on Play/Reset; `runtime/set-actuator`, `runtime/set-sensor-config`;
  invalid→warn+keep-running; unexpected→pause+preserve.
- `src/editor/selectors.ts` — `selectRuntimeRobotics`, `selectJointAngle`, `selectSensorReading`, etc.
- `src/ui/robotics/*` (new) — tab, palette, workspace, nodes (mirror circuit).
- `src/ui/shell/StudioShell.tsx` — add Robotics tab to program tabs.
- `src/ui/panels/Inspector.tsx` — Robotics sections.
- `src/console/types.ts` — add `ROBOTICS` source.

## 2. Component models

### JointComponent
```
type: 'joint'
kind: 'revolute' | 'prismatic'
parentEntityId: string
childEntityId: string
axis: Vec3 (unit)
limit: { min: number; max: number }  // radians or meters
```

### ActuatorComponent (DC motor)
```
type: 'actuator'
kind: 'dcMotor'
jointId: string (reference to a joint)
voltageSourceEntityId/componentId (electrical coupling) OR abstract setpoint
motor: { resistance, torqueConstant, backEmfConstant, maxSpeed, maxTorque }
```

### SensorComponent
```
type: 'sensor'
kind: 'contact' | 'position' | 'velocity'
targetEntityId: string
axis?: Vec3
threshold?: number
```

## 3. DC motor model

- Input voltage V (from electrical source override or setpoint).
- Armature current I = (V - K_e * ω) / R.
- Torque τ = K_t * I, clamped to ±maxTorque.
- Speed ω integrated with inertia; clamped to ±maxSpeed.
- Back EMF: V_emf = K_e * ω.
- Power: P = V * I (electrical), mechanical power = τ * ω.

Motor torque applied to the joint as actuator force/torque in the physics step.

## 4. Runtime state

```
RuntimeRoboticsState {
  status: 'idle' | 'solved' | 'invalid' | 'failed'
  jointAngles: Record<jointId, number>  // transient
  jointVelocities: Record<jointId, number>
  actuatorStates: Record<actuatorId, { voltage, current, torque, speed }>
  sensorReadings: Record<sensorId, number | boolean>
  diagnostics: readonly RoboticsDiagnostic[]
  solveCount, lastSolveMs
}
```

Never persisted. Authored config stays in `project.world`.

## 5. Physics integration

- Fixed timestep (`advanceSimulation`): after body integration, apply joint constraints (kinematic:
  set child transform relative to parent based on joint angle).
- Apply actuator torque to joint; integrate joint angle with motor dynamics.
- Contact sensors read from existing contact system (`stepBodiesWithContacts`).
- Position/velocity sensors read body state.

## 6. Electrical coupling

- Actuator voltage sourced from electrical runtime overrides (`selectEffectiveSourceVoltage`)
  or a graph/Python setpoint.
- Motor current feeds back into electrical netlist? **Decision:** Initially NO (open-loop);
  motor is a load modeled as resistor in electrical domain optionally. Full electromechanical
  coupling (back EMF as voltage source) deferred to later sub-phase. Documented limitation.
- Invalid electrical state disables robotics solving (mirror D-P08-06).

## 7. Sensor interfaces

- Runtime readings exposed via selectors.
- Graph: `readSensor` node outputs boolean/number (execution kind, in/out ports).
- Python: extend snapshot with `sensors: [{ id, kind, value }]`.
- Readings are transient; configuration persisted.

## 8. Visual Scripting integration

- `setActuator`: target entity/component, target value (angle/speed/torque depending on mode).
- `readSensor`: target sensor component; outputs value via graph data? Note: current graph is
  execution-only (no data ports). Sensor reads will be consumed in Python or via trigger conditions.
  Alternative: `onSensorThreshold` trigger node. Document as open question (D-P09-open-1).
- Follow exhaustive registration pattern (types, nodes, validation, palette, inspector, renderer,
  execution, adapter).

## 9. Persistence

- Schema v1 retained. New component types are new `type` strings (backward compatible).
- Joint/actuator/sensor config persisted in `project.world` entities.
- Sensor readings and joint angles transient (never serialized).

## 10. Lifecycle

- Play: snapshot entities; create runtime bodies; seed robotics overrides from authored config;
  solve initial state.
- Pause/Resume: preserve robotics state; graph triggers queue per existing semantics.
- Stop: discard runtime robotics state.
- Reset: restore authored; re-solve.
- Invalid authored robotics data: warn, disable robotics solving, allow Play (mirror D-P08-06).
- Unexpected runtime failure: pause, preserve last valid state, no partial commit.

## 11. Error handling

- Reuse `appendExecutionLog` with `ROBOTICS` source.
- Diagnostic codes: `ROBOTICS_INVALID_JOINT`, `ROBOTICS_INVALID_ACTUATOR`, `ROBOTICS_INVALID_SENSOR`,
  `ROBOTICS_SOLVE_FAILED`, etc.
- Reuse `toSimulationFailure` for physics errors.

## 12. Performance and browser compatibility

- Solve on Play and relevant changes, never per frame.
- Fixed timestep with existing catch-up budget.
- No new heavy dependencies; reuse Web Worker pattern if needed.
- Memory: transient state only; no persistence of readings.

## 13. Risks and open questions

- **Open question D-P09-open-1:** Graph data ports vs. trigger-based sensor consumption. Current graph
  is execution-only. Recommend trigger-based (`onSensorThreshold`) for v1; data ports deferred.
- **Open question D-P09-open-2:** Motor current feedback into electrical netlist. Recommend open-loop
  for v1; document limitation.
- **Risk:** Kinematic joints may not satisfy users expecting dynamic robotics; documented limitation.
- **Risk:** Constraint solver upgrade may be needed later; deferred.
