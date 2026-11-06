import type { Quat, Transform, Vec3 } from './types.ts';

export function quaternionLength(q: Quat): number {
  return Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z + q.w * q.w);
}

export function normalizeQuaternion(q: Quat): Quat {
  const length = quaternionLength(q);
  if (!Number.isFinite(length) || length === 0) {
    throw new Error('Quaternion must have a non-zero finite length');
  }
  return {
    x: q.x / length,
    y: q.y / length,
    z: q.z / length,
    w: q.w / length
  };
}

export function addVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtractVec3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scaleVec3(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function rotateVectorByQuaternion(vector: Vec3, quaternion: Quat): Vec3 {
  const q = normalizeQuaternion(quaternion);
  const v = { x: vector.x, y: vector.y, z: vector.z };
  const t = {
    x: 2 * (q.y * v.z - q.z * v.y),
    y: 2 * (q.z * v.x - q.x * v.z),
    z: 2 * (q.x * v.y - q.y * v.x)
  };
  return {
    x: v.x + q.w * t.x + (q.y * t.z - q.z * t.y),
    y: v.y + q.w * t.y + (q.z * t.x - q.x * t.z),
    z: v.z + q.w * t.z + (q.x * t.y - q.y * t.x)
  };
}

export function transformPoint(transform: Transform, point: Vec3): Vec3 {
  const scaled = {
    x: point.x * transform.scale.x,
    y: point.y * transform.scale.y,
    z: point.z * transform.scale.z
  };
  const rotated = rotateVectorByQuaternion(scaled, transform.rotation);
  return addVec3(rotated, transform.position);
}

export function eulerToQuaternion(pitch: number, yaw: number, roll: number): Quat {
  const cy = Math.cos(yaw / 2);
  const sy = Math.sin(yaw / 2);
  const cp = Math.cos(pitch / 2);
  const sp = Math.sin(pitch / 2);
  const cr = Math.cos(roll / 2);
  const sr = Math.sin(roll / 2);

  return normalizeQuaternion({
    w: cy * cp * cr + sy * sp * sr,
    x: cy * sp * cr + sy * cp * sr,
    y: sy * cp * cr - cy * sp * sr,
    z: cy * cp * sr - sy * sp * cr
  });
}

export function quaternionToEuler(quaternion: Quat): { x: number; y: number; z: number } {
  const q = normalizeQuaternion(quaternion);
  const sinPitch = 2 * (q.w * q.x - q.y * q.z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, sinPitch)));
  const yaw = Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.x * q.x + q.y * q.y));
  const roll = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.x * q.x + q.z * q.z));

  return { x: pitch, y: yaw, z: roll };
}

export function transformsEqual(a: Transform, b: Transform, tolerance = 1e-9): boolean {
  return (
    Math.abs(a.position.x - b.position.x) <= tolerance &&
    Math.abs(a.position.y - b.position.y) <= tolerance &&
    Math.abs(a.position.z - b.position.z) <= tolerance &&
    Math.abs(a.rotation.x - b.rotation.x) <= tolerance &&
    Math.abs(a.rotation.y - b.rotation.y) <= tolerance &&
    Math.abs(a.rotation.z - b.rotation.z) <= tolerance &&
    Math.abs(a.rotation.w - b.rotation.w) <= tolerance &&
    Math.abs(a.scale.x - b.scale.x) <= tolerance &&
    Math.abs(a.scale.y - b.scale.y) <= tolerance &&
    Math.abs(a.scale.z - b.scale.z) <= tolerance
  );
}
