import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eulerToQuaternion,
  quaternionToEuler,
  transformsEqual,
  normalizeQuaternion
} from '../../src/world/transform.ts';
import { defaultTransform } from '../../src/world/defaults.ts';

test('default transform has identity rotation and unit scale', () => {
  const transform = defaultTransform('cube');
  assert.deepEqual(transform.position, { x: 0, y: 0.5, z: 0 });
  assert.deepEqual(transform.rotation, { x: 0, y: 0, z: 0, w: 1 });
  assert.deepEqual(transform.scale, { x: 1, y: 1, z: 1 });
});

test('quaternion round-trips through YXZ Euler angles', () => {
  const quaternion = eulerToQuaternion(0.3, 0.7, -0.2);
  const euler = quaternionToEuler(quaternion);
  const roundTrip = eulerToQuaternion(euler.x, euler.y, euler.z);
  assert.ok(transformsEqual({ position: { x: 0, y: 0, z: 0 }, rotation: roundTrip, scale: { x: 1, y: 1, z: 1 } }, { position: { x: 0, y: 0, z: 0 }, rotation: quaternion, scale: { x: 1, y: 1, z: 1 } }, 1e-9));
});

test('normalizeQuaternion rejects zero-length input', () => {
  assert.throws(() => normalizeQuaternion({ x: 0, y: 0, z: 0, w: 0 }));
});

test('gimbal-lock boundary does not throw', () => {
  const quaternion = eulerToQuaternion(Math.PI / 2 - 1e-6, 0.4, -0.1);
  const euler = quaternionToEuler(quaternion);
  assert.ok(Number.isFinite(euler.x));
  assert.ok(Number.isFinite(euler.y));
  assert.ok(Number.isFinite(euler.z));
});
