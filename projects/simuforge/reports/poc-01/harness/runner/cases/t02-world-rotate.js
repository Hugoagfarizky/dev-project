'use strict';

const scenario = require('../lib/scenario');
const { rotationDelta, rotateVector } = require('../lib/assert');

// T-02 — World rotate.
// Start from a ~42 degree Y rotation, then drag the world X rotation ring.
// The proof is the orientation delta: q_after * inverse(q_before) must be a
// rotation about world X. A local-space gizmo would produce a delta about the
// cube's rotated local X and fail this check.

module.exports = {
  id: 'T-02',
  slug: 't02-world-rotate',
  title: 'World-space rotation of a rotated cube',
  proof: true,
  official: {
    export: 'sp-05_rotate_log.json',
    audit: 'sp-05_rotate_audit.json',
    screenshots: {
      worldX: 'sp-05_rotate_world_x.png',
      supplementaryY90: 'sp-05_rotate_90_y_supplementary.png'
    }
  },
  async run(ctx) {
    const { page, checks } = ctx;
    await page.clearLog();
    await page.setMode('translate');
    const reset = await page.resetTransform();
    checks.vectorClose('T-02: reset quaternion', reset.cube.quaternion, [0, 0, 0, 1], 1e-9);

    const setup = await scenario.rotateBy(ctx, 'y', 42, { label: 'T-02 setup: rotate world Y ~42deg' });
    const setupAngle = setup.appliedRotation ? setup.appliedRotation.angleDeg : 0;
    checks.ok('T-02: setup rotation is non-identity', setupAngle >= 25, { angleDeg: setupAngle });

    await scenario.verifyGizmoOrientation(ctx, 'rotate');

    const before = await page.snapshot();
    const record = await scenario.rotateBy(ctx, 'x', 45, { label: 'T-02: world X rotation' });
    const after = await page.snapshot();

    const delta = rotationDelta(before.cube.quaternion, after.cube.quaternion);
    checks.ok('T-02: world X rotation produced an orientation change', delta !== null && delta.angleDeg > 5, delta);
    checks.ok(
      'T-02: delta axis is world X, not the rotated local X',
      delta !== null && Math.abs(delta.axis[0]) >= 0.9995,
      {
        deltaAxis: delta ? delta.axis : null,
        worldX: [1, 0, 0],
        localXInWorld: rotateVector(before.cube.quaternion, [1, 0, 0])
      }
    );
    checks.ok(
      'T-02: rotation angle is plausible for the drag',
      delta !== null && delta.angleDeg >= 20 && delta.angleDeg <= 90,
      { angleDeg: delta ? delta.angleDeg : null }
    );

    await ctx.shot(this.official.screenshots.worldX);

    ctx.observation = 'World X rotation from a ' + setupAngle.toFixed(2)
      + ' degree Y start; orientation delta axis '
      + (delta ? delta.axis.map((v) => v.toFixed(6)).join(', ') : 'unavailable')
      + ', angle ' + (delta ? delta.angleDeg.toFixed(6) : 'unavailable') + ' degrees.';
  }
};
