'use strict';

// Reusable SP-05 interactions built from genuine CDP input.
//
// Every helper:
//   - recomputes the handle position from the live gizmo scene graph
//   - confirms the handle identity with a scene pick before pressing
//   - drives the drag with Input.dispatchMouseEvent
//   - reconciles the CDP event sequence with the harness pointer trace
//   - returns before/after transforms and the drag lifecycle counts
//
// No helper assigns a transform or calls a gizmo drag method.

const gizmo = require('./gizmo');
const { trustedDrag, reconcile } = require('./drag');
const { sleep } = require('./cdp');
const {
  angleBetween,
  angleBetweenScreen,
  rotateVector,
  rotationDelta
} = require('./assert');

const AXES = ['x', 'y', 'z'];
const WORLD_BASIS = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

async function armAudit(page) {
  return gizmo.armAudit(page);
}

// Drag with full audit. `from`/`to` are CSS pixels.
async function auditedDrag(ctx, { from, to, label, target, steps, stepDelayMs }) {
  await armAudit(ctx.page);
  await sleep(80);
  const before = await ctx.page.snapshot();
  const drag = await trustedDrag(ctx.page, {
    from,
    to,
    label,
    target,
    steps: steps || 24,
    stepDelayMs: stepDelayMs === undefined ? 12 : stepDelayMs
  });
  await sleep(150);
  const audit = await gizmo.readAudit(ctx.page);
  const trace = await ctx.page.inputTrace();
  const after = await ctx.page.snapshot();

  const harnessDrag = trace.drags.length ? trace.drags[trace.drags.length - 1] : null;
  const reconciliation = reconcile(drag, harnessDrag);

  const axis = target && target.axis;
  const lifecycle = axis && audit.axes[axis] ? audit.axes[axis] : null;
  const otherAxes = {};
  let crossAxisActivity = 0;
  for (const key of Object.keys(audit.axes)) {
    if (key === axis) continue;
    otherAxes[key] = audit.axes[key];
    crossAxisActivity += audit.axes[key].start + audit.axes[key].drag + audit.axes[key].end;
  }

  const record = {
    label,
    target: target || null,
    handle: { from, to },
    before: { position: before.cube.position, quaternion: before.cube.quaternion, scale: before.cube.scale },
    after: { position: after.cube.position, quaternion: after.cube.quaternion, scale: after.cube.scale },
    lifecycle,
    otherAxes,
    crossAxisActivity,
    cdpEvents: drag,
    harnessDrag,
    reconciliation,
    provenance: trace.provenance
  };

  ctx.checks.ok(
    label + ': handle picked as expected axis',
    !target || target.pickedAxis === axis,
    { expected: axis, picked: target ? target.pickedAxis : null, mesh: target ? target.pickedMesh : null }
  );
  ctx.checks.ok(
    label + ': harness observed a trusted drag',
    reconciliation.ok,
    reconciliation.issues
  );
  ctx.checks.ok(
    label + ': drag lifecycle started once',
    !!lifecycle && lifecycle.start === 1,
    lifecycle
  );
  ctx.checks.ok(
    label + ': drag lifecycle progressed',
    !!lifecycle && lifecycle.drag >= 1,
    lifecycle
  );
  ctx.checks.ok(
    label + ': drag lifecycle ended once',
    !!lifecycle && lifecycle.end === 1,
    lifecycle
  );
  ctx.checks.ok(
    label + ': no cross-axis gizmo activity',
    crossAxisActivity === 0,
    otherAxes
  );
  ctx.checks.ok(
    label + ': harness pointer trace declares cdp_trusted_input',
    !!(trace.provenance && trace.provenance.inputMethod === 'cdp_trusted_input' && trace.provenance.approvedForSp05 === true),
    trace.provenance
  );

  ctx.drags.push(record);
  return record;
}

// ---- handle discovery ----------------------------------------------------

async function discoverPositionHandle(ctx, axis) {
  const tip = await gizmo.tip(ctx.page, axis);
  if (!tip || !tip.best) throw new Error('Position handle for axis ' + axis + ' was not discoverable');
  const hit = await gizmo.pick(ctx.page, tip.best.screen.x, tip.best.screen.y);
  return {
    kind: 'position',
    axis,
    centerScreen: tip.center,
    tip: tip.best,
    candidateCount: tip.count,
    pickedAxis: hit.hit ? hit.axis : null,
    pickedMesh: hit.hit ? hit.mesh : null
  };
}

async function discoverRotationHandle(ctx, axis) {
  const ring = await gizmo.ring(ctx.page, axis);
  if (!ring || !ring.ok) throw new Error('Rotation ring for axis ' + axis + ' was not discoverable');
  const hit = await gizmo.pick(ctx.page, ring.point.x, ring.point.y);
  return {
    kind: 'rotation',
    axis,
    centerScreen: ring.center,
    point: ring.point,
    point3d: ring.point3d,
    radius: ring.radius,
    tangent: ring.tangent,
    hitCount: ring.hitCount,
    pickedAxis: hit.hit ? hit.axis : null,
    pickedMesh: hit.hit ? hit.mesh : null
  };
}

async function discoverScaleHandle(ctx, axis) {
  const tip = await gizmo.tip(ctx.page, axis);
  if (!tip || !tip.best) throw new Error('Scale handle for axis ' + axis + ' was not discoverable');
  const hit = await gizmo.pick(ctx.page, tip.best.screen.x, tip.best.screen.y);
  return {
    kind: 'scale',
    axis,
    centerScreen: tip.center,
    tip: tip.best,
    candidateCount: tip.count,
    pickedAxis: hit.hit ? hit.axis : null,
    pickedMesh: hit.hit ? hit.mesh : null
  };
}

// World-vs-local verification of the handle direction in world space.
async function verifyHandleSpace(ctx, handle, space) {
  const snapshot = await ctx.page.snapshot();
  const cubePos = snapshot.cube.position;
  const cubeQuat = snapshot.cube.quaternion;
  const tipWorld = handle.tip.abs;
  const worldDir = [
    tipWorld[0] - cubePos[0],
    tipWorld[1] - cubePos[1],
    tipWorld[2] - cubePos[2]
  ];
  const basis = WORLD_BASIS[handle.axis];
  const expectedDir = space === 'world' ? basis : rotateVector(cubeQuat, basis);
  const worldAngle = angleBetween(worldDir, expectedDir);
  const screenDir = { x: handle.tip.screen.x - handle.centerScreen.x, y: handle.tip.screen.y - handle.centerScreen.y };
  const projectedWorld = await gizmo.worldScreenDir(ctx.page, handle.axis);
  const screenAngle = handle.kind === 'rotation' ? null : angleBetweenScreen(screenDir, { x: projectedWorld.x, y: projectedWorld.y });

  const check = {
    space,
    axis: handle.axis,
    cubeQuaternion: cubeQuat,
    worldDirection: worldDir,
    expectedWorldDirection: expectedDir,
    worldAngleDeg: worldAngle,
    screenDirection: screenDir,
    projectedWorldAxisScreen: { x: projectedWorld.x, y: projectedWorld.y },
    screenAngleDeg: screenAngle
  };

  const limit = space === 'world' ? 3 : 4;
  ctx.checks.ok(
    handle.axis + ' ' + space + '-space handle direction matches expectation',
    worldAngle !== null && worldAngle <= limit,
    check
  );
  return check;
}

// ---- operations ----------------------------------------------------------

async function rotateBy(ctx, axis, degrees, { label } = {}) {
  await ctx.page.setMode('rotate');
  const handle = await discoverRotationHandle(ctx, axis);
  const snapshot = await ctx.page.snapshot();
  const center = snapshot.cube.position;
  const p0 = handle.point3d;
  if (!p0) throw new Error('Rotation handle for axis ' + axis + ' has no 3D pick point');

  // Move the picked ring point around the gizmo axis by the requested angle,
  // then project that 3D point back to the screen. The drag plane used by
  // Babylon passes through the gizmo origin with the axis as its normal, so the
  // pointer intersection at the projected point is the rotated point. This is
  // exact, unlike converting degrees to a screen-space pixel distance.
  const basis = WORLD_BASIS[axis];
  const radians = degrees * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const v = [p0[0] - center[0], p0[1] - center[1], p0[2] - center[2]];
  const dot = v[0] * basis[0] + v[1] * basis[1] + v[2] * basis[2];
  const cross = [
    basis[1] * v[2] - basis[2] * v[1],
    basis[2] * v[0] - basis[0] * v[2],
    basis[0] * v[1] - basis[1] * v[0]
  ];
  const rotated = [
    v[0] * cos + cross[0] * sin + basis[0] * dot * (1 - cos),
    v[1] * cos + cross[1] * sin + basis[1] * dot * (1 - cos),
    v[2] * cos + cross[2] * sin + basis[2] * dot * (1 - cos)
  ];
  const targetPoint3d = [center[0] + rotated[0], center[1] + rotated[1], center[2] + rotated[2]];
  const targetScreen = await gizmo.proj(ctx.page, targetPoint3d);

  const from = { x: handle.point.x, y: handle.point.y };
  const to = {
    x: clamp(targetScreen.x, 4, 980),
    y: clamp(targetScreen.y, 4, 660)
  };

  const beforeQ = snapshot.cube.quaternion;
  const record = await auditedDrag(ctx, {
    from,
    to,
    label: label || ('rotate ' + axis + ' ' + degrees + 'deg'),
    target: { gizmo: 'rotation', axis, degrees, pickedAxis: handle.pickedAxis, pickedMesh: handle.pickedMesh }
  });
  const delta = rotationDelta(beforeQ, record.after.quaternion);
  record.handleDiscovery = handle;
  record.appliedRotation = delta;
  record.requestedDegrees = degrees;
  record.targetPoint3d = targetPoint3d;
  record.targetScreen = targetScreen;

  const limit = 0.9995;
  const expectedAxis = WORLD_BASIS[axis];
  const axisAlignment = delta
    ? Math.abs(delta.axis[0] * expectedAxis[0] + delta.axis[1] * expectedAxis[1] + delta.axis[2] * expectedAxis[2])
    : null;

  ctx.checks.ok(
    label + ': rotation delta is about world ' + axis.toUpperCase(),
    delta !== null && axisAlignment >= limit,
    { axis: delta ? delta.axis : null, expectedAxis, axisAlignment, limit }
  );
  ctx.checks.ok(
    label + ': rotation angle is plausible',
    delta !== null && delta.angleDeg >= Math.max(1, degrees * 0.75) && delta.angleDeg <= degrees * 1.25,
    { requested: degrees, actual: delta ? delta.angleDeg : null }
  );
  return record;
}

async function translateBy(ctx, axis, pixels, { label } = {}) {
  await ctx.page.setMode('translate');
  const handle = await discoverPositionHandle(ctx, axis);
  const spaceCheck = await verifyHandleSpace(ctx, handle, 'world');
  const dir = {
    x: handle.tip.screen.x - handle.centerScreen.x,
    y: handle.tip.screen.y - handle.centerScreen.y
  };
  const length = Math.hypot(dir.x, dir.y) || 1;
  const from = { x: handle.tip.screen.x, y: handle.tip.screen.y };
  const to = {
    x: from.x + (dir.x / length) * pixels,
    y: from.y + (dir.y / length) * pixels
  };

  const record = await auditedDrag(ctx, {
    from,
    to,
    label: label || ('translate ' + axis + ' ' + pixels + 'px'),
    target: { gizmo: 'position', axis, pickedAxis: handle.pickedAxis, pickedMesh: handle.pickedMesh }
  });
  record.handleDiscovery = handle;
  record.spaceCheck = spaceCheck;

  const delta = record.after.position.map((value, index) => value - record.before.position[index]);
  record.appliedTranslation = delta;
  const offAxis = AXES.filter((key) => key !== axis).map((key) => Math.abs(delta[AXES.indexOf(key)]));
  const maxOffAxis = Math.max(...offAxis);

  ctx.checks.ok(
    label + ': translation moved the cube',
    Math.hypot(delta[0], delta[1], delta[2]) > 0.05,
    { delta }
  );
  ctx.checks.ok(
    label + ': translation is confined to world ' + axis.toUpperCase(),
    maxOffAxis <= 1e-3,
    { delta, maxOffAxis, tolerance: 1e-3 }
  );
  return record;
}

async function scaleBy(ctx, axis, pixels, { label } = {}) {
  await ctx.page.setMode('scale');
  const handle = await discoverScaleHandle(ctx, axis);
  const spaceCheck = await verifyHandleSpace(ctx, handle, 'local');
  const dir = {
    x: handle.tip.screen.x - handle.centerScreen.x,
    y: handle.tip.screen.y - handle.centerScreen.y
  };
  const length = Math.hypot(dir.x, dir.y) || 1;
  const from = { x: handle.tip.screen.x, y: handle.tip.screen.y };
  const to = {
    x: from.x + (dir.x / length) * pixels,
    y: from.y + (dir.y / length) * pixels
  };

  const record = await auditedDrag(ctx, {
    from,
    to,
    label: label || ('scale ' + axis + ' ' + pixels + 'px'),
    target: { gizmo: 'scale', axis, pickedAxis: handle.pickedAxis, pickedMesh: handle.pickedMesh }
  });
  record.handleDiscovery = handle;
  record.spaceCheck = spaceCheck;

  const before = record.before.scale;
  const after = record.after.scale;
  const delta = after.map((value, index) => value - before[index]);
  record.appliedScaleDelta = delta;
  const others = AXES.filter((key) => key !== axis).map((key) => Math.abs(after[AXES.indexOf(key)] - before[AXES.indexOf(key)]));
  const maxOther = Math.max(...others);

  ctx.checks.ok(
    label + ': scaled axis increased',
    after[AXES.indexOf(axis)] > before[AXES.indexOf(axis)] + 1e-3,
    { before, after }
  );
  ctx.checks.ok(
    label + ': scale is confined to local ' + axis.toUpperCase(),
    maxOther <= 1e-6,
    { before, after, maxOther, tolerance: 1e-6 }
  );
  return record;
}

// Verify the gizmo root orientation itself, not just the flag.
async function verifyGizmoOrientation(ctx, mode) {
  const snapshot = await ctx.page.snapshot();
  const roots = await gizmo.roots(ctx.page);
  const cubeQuat = snapshot.cube.quaternion;

  const results = {};
  for (const root of roots) {
    if (mode === 'translate' || mode === 'rotate') {
      // World orientation: the axis root must not inherit the cube rotation.
      const err = root.rot ? Math.max(...root.rot.map((value, index) => Math.abs(value - (index === 3 ? 1 : 0)))) : null;
      results[root.axis] = { rotation: root.rot, identityError: err, dragAxis: root.dragAxis };
      ctx.checks.ok(
        mode + ' ' + root.axis + ' root is world-oriented',
        err !== null && err <= 1e-5,
        { rotation: root.rot, identityError: err, dragAxis: root.dragAxis }
      );
    } else {
      const err = root.rot ? Math.max(...root.rot.map((value, index) => Math.abs(value - cubeQuat[index]))) : null;
      results[root.axis] = { rotation: root.rot, cubeQuaternion: cubeQuat, localError: err, dragAxis: root.dragAxis };
      ctx.checks.ok(
        'scale ' + root.axis + ' root follows the cube (local orientation)',
        err !== null && err <= 1e-5,
        { rotation: root.rot, cubeQuaternion: cubeQuat, localError: err, dragAxis: root.dragAxis }
      );
    }
  }
  return results;
}

// Environment snapshot stored in every sidecar record.
async function environment(ctx) {
  const snapshot = await ctx.page.snapshot();
  const extra = await ctx.page.evaluate(`(() => ({
    userAgent: navigator.userAgent,
    devicePixelRatio: window.devicePixelRatio,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    status: (document.getElementById('status') || {}).textContent || null,
    harnessVersion: (document.getElementById('version') || {}).textContent || null
  }))()`);
  return {
    ...extra,
    chrome: ctx.browser ? ctx.browser.version : null,
    harnessFile: ctx.harness ? { path: ctx.harness.path, sha256: ctx.harness.sha256, bytes: ctx.harness.bytes } : null,
    canvas: snapshot.canvas,
    camera: snapshot.camera,
    babylonVersion: snapshot.babylonVersion,
    useRightHandedSystem: snapshot.useRightHandedSystem,
    gizmos: snapshot.gizmos,
    os: process.platform,
    node: process.version
  };
}

module.exports = {
  AXES,
  WORLD_BASIS,
  auditedDrag,
  discoverPositionHandle,
  discoverRotationHandle,
  discoverScaleHandle,
  verifyHandleSpace,
  verifyGizmoOrientation,
  rotateBy,
  translateBy,
  scaleBy,
  environment,
  armAudit,
  rotationDelta
};
