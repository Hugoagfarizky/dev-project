'use strict';

const scenario = require('../lib/scenario');

// T-06 — Transform integrity after a realistic edit sequence.
// Rotate, then translate, then scale with genuine CDP input and no reset in
// between; then verify the stored quaternion and scale invariants.

module.exports = {
  id: 'T-06',
  slug: 't06-transform-integrity',
  title: 'Transform integrity after rotate, translate, and scale',
  proof: false,
  official: {
    export: 'sp-05_final_integrity_log.json',
    audit: 'sp-05_final_integrity_audit.json',
    screenshots: {
      integrity: 'sp-05_transform_integrity.png'
    }
  },
  async run(ctx) {
    const { page, checks } = ctx;
    await page.clearLog();
    await page.setMode('translate');
    await page.resetTransform();

    const rotation = await scenario.rotateBy(ctx, 'y', 42, { label: 'T-06: rotate world Y ~42deg' });
    checks.ok(
      'T-06: rotation was applied',
      !!(rotation.appliedRotation && rotation.appliedRotation.angleDeg >= 25),
      rotation.appliedRotation
    );

    const translation = await scenario.translateBy(ctx, 'x', 70, { label: 'T-06: world X translation' });
    checks.ok(
      'T-06: translation changed position',
      Math.abs(translation.appliedTranslation[0]) > 0.05,
      translation.appliedTranslation
    );

    const scaling = await scenario.scaleBy(ctx, 'x', 70, { label: 'T-06: local X scale' });
    checks.ok(
      'T-06: scale became non-uniform',
      scaling.after.scale[0] > 1.02,
      scaling.after.scale
    );

    const state = await page.captureState().then(() => page.snapshot());
    const inspector = await page.inspectorText();

    const q = state.cube.quaternion;
    const length = Math.hypot(q[0], q[1], q[2], q[3]);
    checks.ok('T-06: quaternion components are finite', q.every((value) => Number.isFinite(value)), q);
    checks.close('T-06: quaternion length is 1', length, 1, 1e-5);
    checks.ok(
      'T-06: harness quaternion validation is VALID',
      inspector.quaternionValidation === 'VALID',
      { inspector: inspector.quaternionValidation, qLen: inspector.quaternionLengthDisplay, diff: inspector.quaternionDiff }
    );

    const scale = state.cube.scale;
    checks.ok('T-06: scale components are finite', scale.every((value) => Number.isFinite(value)), scale);
    checks.ok('T-06: scale components are positive', scale.every((value) => value > 0), scale);
    checks.ok('T-06: scale components meet the 1e-3 floor', scale.every((value) => value >= 1e-3), scale);
    checks.ok('T-06: harness scale validation is VALID', inspector.scaleValidation === 'VALID', inspector);

    checks.ok(
      'T-06: transform is not back at the initial state',
      Math.abs(scale[0] - 1) > 1e-3 && Math.abs(q[1]) > 1e-3 && Math.abs(state.cube.position[0]) > 1e-3,
      { quaternion: q, position: state.cube.position, scale }
    );

    await ctx.shot(this.official.screenshots.integrity);

    ctx.observation = 'Integrity after rotate ' + (rotation.appliedRotation ? rotation.appliedRotation.angleDeg.toFixed(2) : '?')
      + ' deg Y, translate X, scale X; quaternion length ' + length.toFixed(12)
      + '; harness quaternion ' + inspector.quaternionValidation
      + ', scale ' + inspector.scaleValidation + '.';
  }
};
