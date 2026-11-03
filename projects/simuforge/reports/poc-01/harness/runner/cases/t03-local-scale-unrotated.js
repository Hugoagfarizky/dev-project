'use strict';

const scenario = require('../lib/scenario');

// T-03 — Local scale on an unrotated cube.
// On an unrotated cube the local axes coincide with the world axes, so the
// check is that only the dragged scale component changes while the scale gizmo
// still reports local orientation.

module.exports = {
  id: 'T-03',
  slug: 't03-local-scale-unrotated',
  title: 'Local-space scale of an unrotated cube',
  proof: false,
  official: {
    export: 'sp-05_scale_unrotated_log.json',
    audit: 'sp-05_scale_unrotated_audit.json',
    screenshots: {
      scale: 'sp-05_scale_unrotated.png'
    }
  },
  async run(ctx) {
    const { page, checks } = ctx;
    await page.clearLog();
    await page.setMode('scale');
    const reset = await page.resetTransform();
    checks.vectorClose('T-03: reset quaternion', reset.cube.quaternion, [0, 0, 0, 1], 1e-9);
    checks.vectorClose('T-03: reset scale', reset.cube.scale, [1, 1, 1], 1e-9);

    await scenario.verifyGizmoOrientation(ctx, 'scale');

    const record = await scenario.scaleBy(ctx, 'x', 90, { label: 'T-03: local X scale' });
    checks.ok(
      'T-03: scale remains non-uniform and positive',
      record.after.scale[0] > 1.02 && record.after.scale[1] > 0 && record.after.scale[2] > 0,
      record.after.scale
    );
    await ctx.shot(this.official.screenshots.scale);

    const inspector = await page.inspectorText();
    checks.ok('T-03: harness scale validation is VALID', inspector.scaleValidation === 'VALID', inspector);
    ctx.observation = 'Unrotated local X scale; scale '
      + record.after.scale.map((v) => v.toFixed(6)).join(', ')
      + '; harness scale validation ' + inspector.scaleValidation + '.';
  }
};
