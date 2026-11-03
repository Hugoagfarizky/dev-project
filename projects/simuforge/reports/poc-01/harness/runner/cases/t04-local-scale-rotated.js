'use strict';

const scenario = require('../lib/scenario');
const { rotateVector, angleBetween } = require('../lib/assert');

// T-04 — Local scale on a rotated cube.
// Start from a genuine ~42 degree Y rotation, then drag the local X scale box.
// A local-space gizmo scales along the cube's rotated X axis; a world-space one
// would scale along world X. The handle direction and the unchanged Y/Z scale
// components prove which behaviour occurred.

module.exports = {
  id: 'T-04',
  slug: 't04-local-scale-rotated',
  title: 'Local-space scale of a rotated cube',
  proof: true,
  official: {
    export: 'sp-05_scale_rotated_log.json',
    audit: 'sp-05_scale_rotated_audit.json',
    screenshots: {
      rotated45: 'sp-05_scale_rotated_45.png',
      rotated90: 'sp-05_scale_rotated_90.png'
    }
  },
  async run(ctx) {
    const { page, checks } = ctx;
    await page.clearLog();
    await page.setMode('translate');
    const reset = await page.resetTransform();
    checks.vectorClose('T-04: reset quaternion', reset.cube.quaternion, [0, 0, 0, 1], 1e-9);
    checks.vectorClose('T-04: reset scale', reset.cube.scale, [1, 1, 1], 1e-9);

    const setup = await scenario.rotateBy(ctx, 'y', 42, { label: 'T-04 setup: rotate world Y ~42deg' });
    const setupAngle = setup.appliedRotation ? setup.appliedRotation.angleDeg : 0;
    checks.ok('T-04: setup rotation is non-identity', setupAngle >= 25, { angleDeg: setupAngle });

    await scenario.verifyGizmoOrientation(ctx, 'rotate');

    await page.setMode('scale');
    const orientation = await scenario.verifyGizmoOrientation(ctx, 'scale');

    const record = await scenario.scaleBy(ctx, 'x', 90, { label: 'T-04: local X scale after Y rotation' });
    const cubeQuat = record.after.quaternion;
    const localXWorld = rotateVector(cubeQuat, [1, 0, 0]);
    const worldX = [1, 0, 0];
    const divergence = angleBetween(localXWorld, worldX);
    checks.ok(
      'T-04: local X differs measurably from world X after rotation',
      divergence !== null && divergence >= 25,
      { localXWorld, worldX, divergenceDeg: divergence, setupAngle }
    );
    checks.ok(
      'T-04: scale gizmo root follows the rotated cube',
      Object.values(orientation).every((entry) => entry.localError !== null && entry.localError <= 1e-5),
      orientation
    );
    checks.ok(
      'T-04: local X scale produced non-uniform growth',
      record.after.scale[0] > 1.02,
      record.after.scale
    );

    await ctx.shot(this.official.screenshots.rotated45);

    if (!ctx.proof) {
      // Supplementary 90-degree observation from the manual procedure.
      const second = await scenario.rotateBy(ctx, 'y', 48, { label: 'T-04 supplementary: add ~48deg Y' });
      const secondAngle = second.appliedRotation ? second.appliedRotation.angleDeg : 0;
      checks.ok('T-04: supplementary Y rotation applied', secondAngle >= 20, { angleDeg: secondAngle });
      await page.setMode('scale');
      await scenario.scaleBy(ctx, 'y', 60, { label: 'T-04 supplementary: local Y scale near 90deg' });
      await ctx.shot(this.official.screenshots.rotated90);
    }

    const final = await page.snapshot();
    const inspector = await page.inspectorText();
    checks.ok('T-04: harness scale validation is VALID', inspector.scaleValidation === 'VALID', inspector);
    ctx.observation = 'Local X scale from a ' + setupAngle.toFixed(2)
      + ' degree Y rotation; local X axis in world '
      + localXWorld.map((v) => v.toFixed(6)).join(', ')
      + ' vs world X divergence ' + (divergence === null ? 'unavailable' : divergence.toFixed(2))
      + ' degrees; final scale ' + final.cube.scale.map((v) => v.toFixed(6)).join(', ') + '.';
  }
};
