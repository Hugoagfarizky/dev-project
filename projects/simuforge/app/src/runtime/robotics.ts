import type { Vec3 } from '../world/types.ts';
import type { WorldEntity } from '../world/types.ts';
import type { ActuatorComponent, JointComponent } from '../world/types.ts';
import { isActuatorComponent, isJointComponent, isSensorComponent } from '../world/components.ts';
import type { ElectricalOverrides } from './electrical.ts';
import { electricalOverrideKey } from './electrical.ts';

export interface RoboticsDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
}

import type { RuntimeRoboticsState } from '../editor/state.ts';

export function emptyRoboticsState(): RuntimeRoboticsState {
  return {
    status: 'idle',
    jointAngles: {},
    jointVelocities: {},
    actuatorStates: {},
    sensorReadings: {},
    diagnostics: [],
    solveCount: 0,
    lastSolveMs: 0
  };
}

export function collectAuthoredJointAngles(entities: readonly WorldEntity[]): Record<string, number> {
  const angles: Record<string, number> = {};
  for (const entity of entities) {
    for (const component of entity.components ?? []) {
      if (isJointComponent(component)) {
        angles[component.id] = 0;
      }
    }
  }
  return angles;
}

function vecLength(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = vecLength(v) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** DC motor update for one actuator. Returns new actuator state and joint delta. */
export function stepMotor(
  actuator: ActuatorComponent,
  _jointAngle: number,
  jointVelocity: number,
  voltage: number,
  _dt: number
): { state: { voltage: number; current: number; torque: number; speed: number }; torque: number } {
  const motor = actuator.motor;
  const backEmf = motor.backEmfConstant * jointVelocity;
  const current = (voltage - backEmf) / motor.resistance;
  let torque = motor.torqueConstant * current;
  torque = clamp(torque, -motor.maxTorque, motor.maxTorque);
  const speed = clamp(jointVelocity, -motor.maxSpeed, motor.maxSpeed);
  return {
    state: { voltage, current, torque, speed },
    torque
  };
}

/** Apply a revolute joint transform: rotate child around axis by angle relative to parent. */
export function applyJointTransform(
  parent: { position: Vec3; rotation: { x: number; y: number; z: number; w: number } },
  axis: Vec3,
  angle: number
): { position: Vec3; rotation: { x: number; y: number; z: number; w: number } } {
  const a = normalize(axis);
  const half = angle / 2;
  const s = Math.sin(half);
  const q = { x: a.x * s, y: a.y * s, z: a.z * s, w: Math.cos(half) };
  // multiply parent.rotation * q
  const p = parent.rotation;
  const r = {
    x: p.w * q.x + p.x * q.w + p.y * q.z - p.z * q.y,
    y: p.w * q.y - p.x * q.z + p.y * q.w + p.z * q.x,
    z: p.w * q.z + p.x * q.y - p.y * q.x + p.z * q.w,
    w: p.w * q.w - p.x * q.x - p.y * q.y - p.z * q.z
  };
  return { position: { ...parent.position }, rotation: r };
}

export function hasRoboticsComponents(entities: readonly WorldEntity[]): boolean {
  return entities.some((e) => (e.components ?? []).some((c) => isJointComponent(c) || isActuatorComponent(c) || isSensorComponent(c)));
}

/** Step robotics state by dt. Pure. */
export function stepRobotics(
  state: RuntimeRoboticsState,
  entities: readonly WorldEntity[],
  electricalOverrides: ElectricalOverrides,
  dt: number
): RuntimeRoboticsState {
  const jointAngles = { ...state.jointAngles };
  const jointVelocities = { ...state.jointVelocities };
  const actuatorStates = { ...state.actuatorStates };
  const sensorReadings = { ...state.sensorReadings };

  // Seed missing joints
  for (const entity of entities) {
    for (const c of entity.components ?? []) {
      if (isJointComponent(c) && jointAngles[c.id] === undefined) {
        jointAngles[c.id] = 0;
        jointVelocities[c.id] = 0;
      }
    }
  }

  // Step actuators
  const jointsById = new Map<string, JointComponent>();
  for (const entity of entities) {
    for (const c of entity.components ?? []) {
      if (isJointComponent(c)) jointsById.set(c.id, c);
    }
  }

  for (const entity of entities) {
    for (const c of entity.components ?? []) {
      if (!isActuatorComponent(c) || !c.enabled) continue;
      const joint = jointsById.get(c.jointId);
      if (!joint) continue;
      const angle = jointAngles[c.jointId] ?? 0;
      const vel = jointVelocities[c.jointId] ?? 0;
      // Determine voltage
      let voltage = c.voltage;
      if (c.electricalSourceEntityId && c.electricalSourceComponentId) {
        const key = electricalOverrideKey(c.electricalSourceEntityId, c.electricalSourceComponentId);
        const override = electricalOverrides.sourceVoltages[key];
        if (override !== undefined) voltage = override;
      }
      if (c.mode === 'voltage') {
        const res = stepMotor(c, angle, vel, voltage, dt);
        actuatorStates[c.id] = res.state;
        // integrate
        const accel = res.torque / c.motor.inertia;
        const newVel = clamp(vel + accel * dt, -c.motor.maxSpeed, c.motor.maxSpeed);
        let newAngle = angle + newVel * dt;
        newAngle = clamp(newAngle, joint.limit.min, joint.limit.max);
        jointAngles[c.jointId] = newAngle;
        jointVelocities[c.jointId] = newVel;
      }
    }
  }

  // Sensor readings
  for (const entity of entities) {
    for (const c of entity.components ?? []) {
      if (!isSensorComponent(c) || !c.enabled) continue;
      if (c.kind === 'position') {
        const target = entities.find((e) => e.id === c.targetEntityId);
        sensorReadings[c.id] = target ? target.transform.position.y : 0;
      } else if (c.kind === 'velocity') {
        sensorReadings[c.id] = 0;
      } else if (c.kind === 'contact') {
        sensorReadings[c.id] = false;
      }
    }
  }

  return {
    ...state,
    status: hasRoboticsComponents(entities) ? 'solved' : 'idle',
    jointAngles,
    jointVelocities,
    actuatorStates,
    sensorReadings,
    solveCount: state.solveCount + 1,
    lastSolveMs: 0
  };
}

export function validateRoboticsComponents(entities: readonly WorldEntity[]): RoboticsDiagnostic[] {
  const diagnostics: RoboticsDiagnostic[] = [];
  const ids = new Set(entities.map((e) => e.id));
  for (const entity of entities) {
    for (const c of entity.components ?? []) {
      if (isJointComponent(c)) {
        if (!ids.has(c.parentEntityId)) diagnostics.push({ code: 'ROBOTICS_INVALID_JOINT', severity: 'error', message: `Joint ${c.id} references unknown parent ${c.parentEntityId}.` });
        if (!ids.has(c.childEntityId)) diagnostics.push({ code: 'ROBOTICS_INVALID_JOINT', severity: 'error', message: `Joint ${c.id} references unknown child ${c.childEntityId}.` });
      }
      if (isActuatorComponent(c)) {
        if (!entities.some((e) => (e.components ?? []).some((cc) => isJointComponent(cc) && cc.id === c.jointId))) {
          diagnostics.push({ code: 'ROBOTICS_INVALID_ACTUATOR', severity: 'error', message: `Actuator ${c.id} references unknown joint ${c.jointId}.` });
        }
      }
      if (isSensorComponent(c)) {
        if (!ids.has(c.targetEntityId)) {
          diagnostics.push({ code: 'ROBOTICS_INVALID_SENSOR', severity: 'error', message: `Sensor ${c.id} references unknown target ${c.targetEntityId}.` });
        }
      }
    }
  }
  return diagnostics;
}
