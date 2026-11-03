'use strict';

// Assertion collection for one SP-05 case. A failed assertion is never
// converted into a pass: the case result and the evidence sidecar keep the
// failure verbatim.

class Checks {
  constructor(caseId) {
    this.caseId = caseId;
    this.results = [];
  }

  record(name, passed, detail) {
    this.results.push({
      name,
      status: passed ? 'PASS' : 'FAIL',
      detail: detail === undefined ? null : detail,
      timestamp: new Date().toISOString()
    });
    return passed;
  }

  ok(name, condition, detail) {
    return this.record(name, condition === true, detail);
  }

  fail(name, detail) {
    return this.record(name, false, detail);
  }

  close(name, actual, expected, tolerance, detail) {
    const numeric = typeof actual === 'number' && Number.isFinite(actual);
    const delta = numeric ? Math.abs(actual - expected) : null;
    const passed = numeric && delta <= tolerance;
    return this.record(name, passed, {
      actual,
      expected,
      tolerance,
      delta,
      note: detail || null
    });
  }

  vectorClose(name, actual, expected, tolerance, detail) {
    const valid = Array.isArray(actual)
      && Array.isArray(expected)
      && actual.length === expected.length
      && actual.every((v) => typeof v === 'number' && Number.isFinite(v));
    if (!valid) {
      return this.record(name, false, { actual, expected, tolerance, note: detail || 'vector missing or non-finite' });
    }
    const deltas = actual.map((v, i) => Math.abs(v - expected[i]));
    const maxDelta = Math.max(...deltas);
    return this.record(name, maxDelta <= tolerance, {
      actual,
      expected,
      tolerance,
      deltas,
      maxDelta,
      note: detail || null
    });
  }

  get passed() {
    return this.results.every((result) => result.status === 'PASS');
  }

  get failed() {
    return this.results.filter((result) => result.status === 'FAIL');
  }

  summary() {
    return {
      caseId: this.caseId,
      total: this.results.length,
      passed: this.results.filter((result) => result.status === 'PASS').length,
      failed: this.results.filter((result) => result.status === 'FAIL').length,
      result: this.passed ? 'PASS' : 'FAIL',
      checks: this.results
    };
  }
}

// Helpers shared by cases.

function quatMultiply(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];
}

function quatConjugate(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}

function quatNormalize(q) {
  const len = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!Number.isFinite(len) || len === 0) return null;
  return q.map((v) => v / len);
}

// World-space orientation delta: d = qAfter * inverse(qBefore).
// For a world-axis rotation the delta axis stays on that world axis regardless
// of the cube's current orientation; a local-axis rotation would move it.
function rotationDelta(before, after) {
  const qb = quatNormalize(before);
  const qa = quatNormalize(after);
  if (!qb || !qa) return null;
  const d = quatNormalize(quatMultiply(qa, quatConjugate(qb)));
  if (!d) return null;
  const w = Math.max(-1, Math.min(1, d[3]));
  const angleDeg = (2 * Math.acos(w)) * 180 / Math.PI;
  const sign = d[3] < 0 ? -1 : 1;
  const x = d[0] * sign;
  const y = d[1] * sign;
  const z = d[2] * sign;
  const sinHalf = Math.hypot(x, y, z);
  const axis = sinHalf < 1e-12 ? [0, 0, 0] : [x / sinHalf, y / sinHalf, z / sinHalf];
  return { quaternion: d, angleDeg, axis, sinHalf };
}

// Angle between two 3D vectors in degrees.
function angleBetween(a, b) {
  const la = Math.hypot(a[0], a[1], a[2]);
  const lb = Math.hypot(b[0], b[1], b[2]);
  if (!la || !lb) return null;
  const dot = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}

// Rotate a vector by a quaternion (Babylon component order x,y,z,w).
function rotateVector(q, v) {
  const qv = [q[0], q[1], q[2]];
  const t = [
    2 * (qv[1] * v[2] - qv[2] * v[1]),
    2 * (qv[2] * v[0] - qv[0] * v[2]),
    2 * (qv[0] * v[1] - qv[1] * v[0])
  ];
  const cross = [
    qv[1] * t[2] - qv[2] * t[1],
    qv[2] * t[0] - qv[0] * t[2],
    qv[0] * t[1] - qv[1] * t[0]
  ];
  return [
    v[0] + q[3] * t[0] + cross[0],
    v[1] + q[3] * t[1] + cross[1],
    v[2] + q[3] * t[2] + cross[2]
  ];
}

function angleBetweenScreen(a, b) {
  const la = Math.hypot(a.x, a.y);
  const lb = Math.hypot(b.x, b.y);
  if (!la || !lb) return null;
  const dot = (a.x * b.x + a.y * b.y) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
}

module.exports = {
  Checks,
  quatMultiply,
  quatConjugate,
  quatNormalize,
  rotationDelta,
  angleBetween,
  angleBetweenScreen,
  rotateVector
};
