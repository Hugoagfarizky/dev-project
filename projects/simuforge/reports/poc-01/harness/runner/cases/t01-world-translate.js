'use strict';

const scenario = require('../lib/scenario');

// T-01 — World translate.
// The cube is first rotated ~42 degrees around world Y with a genuine CDP drag,
// so a world-space X handle is visibly distinct from a local-space one.

module.exports = {
  id: 'T-01',
  slug: 't01-world-translate',
  title: 'World-space translation of a rotated cube',
  proof: true,
  official: {
    export: 'sp-05_translate_log.json',
    audit: 'sp-05_translate_audit.json',
    screenshots: {
      x: 'sp-05_translate_x.png',
      y: 'sp-05_translate_y.png',
      z: 'sp-05_translate_z.png'
    }
  },
  async run(ctx) {
    const { page, checks } = ctx;
    await page.clearLog();
    await page.setMode('translate');
    const reset = await page.resetTransform();
    checks.vectorClose('T-01: reset position', reset.cube.position, [0, 0.5, 0], 1e-9);
    checks.vectorClose('T-01: reset quaternion', reset.cube.quaternion, [0, 0, 0, 1], 1e-9);
    checks.vectorClose('T-01: reset scale', reset.cube.scale, [1, 1, 1], 1e-9);

    const setup = await scenario.rotateBy(ctx, 'y', 42, { label: 'T-01 setup: rotate world Y ~42deg' });
    const setupAngle = setup.appliedRotation ? setup.appliedRotation.angleDeg : 0;
    checks.ok('T-01: cube is no longer at identity rotation', setupAngle >= 25, { angleDeg: setupAngle });

    await scenario.verifyGizmoOrientation(ctx, 'rotate');

    const axes = ctx.proof ? ['x'] : ['x', 'y', 'z'];
    for (const axis of axes) {
      const record = await scenario.translateBy(ctx, axis, 90, {
        label: 'T-01: world ' + axis.toUpperCase() + ' translation'
      });
      const index = scenario.AXES.indexOf(axis);
      checks.ok(
        'T-01: world ' + axis.toUpperCase() + ' drag increased world ' + axis.toUpperCase(),
        record.appliedTranslation[index] > 0.05,
        { delta: record.appliedTranslation }
      );
      await ctx.shot(this.official.screenshots[axis]);
    }

    const final = await page.snapshot();
    checks.ok('T-01: final position is finite', final.cube.position.every((value) => Number.isFinite(value)), final.cube.position);
    ctx.observation = 'World translate after a genuine ' + setupAngle.toFixed(2)
      + ' degree Y rotation; axes exercised: ' + axes.join(', ').toUpperCase()
      + '; final position ' + final.cube.position.map((v) => v.toFixed(6)).join(', ') + '.';
  }
};
