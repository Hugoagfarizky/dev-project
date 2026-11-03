'use strict';

const scenario = require('../lib/scenario');

// T-05 — Mode switching stability.
// No drags: the only input is the mode buttons. This also re-checks the repair:
// every setMode() must re-apply the world/world/local space policy, including
// for gizmos created lazily on first activation.

module.exports = {
  id: 'T-05',
  slug: 't05-mode-switch',
  title: 'Mode switching does not disturb the transform',
  proof: false,
  official: {
    export: 'sp-05_mode_switch_log.json',
    audit: 'sp-05_mode_switch_audit.json',
    screenshots: {
      modeSwitch: 'sp-05_mode_switch.png'
    }
  },
  async run(ctx) {
    const { page, checks } = ctx;
    await page.clearLog();
    await page.setMode('translate');
    const reset = await page.resetTransform();
    checks.vectorClose('T-05: reset position', reset.cube.position, [0, 0.5, 0], 1e-9);

    await page.captureBaseline();
    const baseline = await page.snapshot();

    const sequence = ['rotate', 'scale', 'translate'];
    const snapshots = {};
    for (const mode of sequence) {
      const snap = await page.setMode(mode);
      snapshots[mode] = snap;
      const expected = { rotate: 'rotationSpaceWorld', scale: 'scaleSpaceLocal', translate: 'positionSpaceWorld' }[mode];
      checks.ok(
        'T-05: ' + mode + ' gizmo space re-applied after setMode',
        snap.gizmos[expected] === true,
        { flag: expected, value: snap.gizmos[expected], gizmos: snap.gizmos }
      );
      checks.vectorClose('T-05: position unchanged in ' + mode, snap.cube.position, baseline.cube.position, 1e-5);
      checks.vectorClose('T-05: quaternion unchanged in ' + mode, snap.cube.quaternion, baseline.cube.quaternion, 1e-5);
      checks.vectorClose('T-05: scale unchanged in ' + mode, snap.cube.scale, baseline.cube.scale, 1e-5);
    }

    const finalSnapshot = await page.captureFinal().then(() => page.snapshot());
    const comparison = await page.compareT05();
    checks.ok(
      'T-05: harness comparison is STABLE',
      typeof comparison === 'string' && comparison.indexOf('STABLE') === 0,
      comparison
    );
    checks.vectorClose('T-05: final position equals baseline', finalSnapshot.cube.position, baseline.cube.position, 1e-5);
    checks.vectorClose('T-05: final quaternion equals baseline', finalSnapshot.cube.quaternion, baseline.cube.quaternion, 1e-5);
    checks.vectorClose('T-05: final scale equals baseline', finalSnapshot.cube.scale, baseline.cube.scale, 1e-5);

    const trace = await page.inputTrace();
    checks.ok('T-05: no drag was performed during mode switching', trace.dragCount === 0, { dragCount: trace.dragCount });

    await ctx.shot(this.official.screenshots.modeSwitch);

    ctx.observation = 'Mode sequence translate -> rotate -> scale -> translate; harness comparison '
      + comparison + '; no drags performed.';
  }
};
