'use strict';

// Central configuration for the official SP-06 execution.
//
// The three numeric quantities are deliberately separate and must not be
// conflated:
//
//   invariance      - equality/invariance bound for parameters that must not
//                     change. Owner-approved Option A: 1e-9.
//   orbitMinimum    - gesture-magnitude floor for orbit (radians).
//   panMinimum      - gesture-magnitude floor for pan (world units).
//   zoomMinimum     - gesture-magnitude floor for zoom (radius units).
//   settleMs        - mandatory inertia settle delay before every recorded
//                     post-gesture state.
//
// The gesture floors and the settle delay are unchanged by the Option A
// decision. They are not equality tolerances.
//
// The harness-internal Q_TOL/CMP_TOL values (1e-5) are separate harness
// validation values and are intentionally not part of this configuration.

const TOLERANCES = Object.freeze({
  invariance: 1e-9,
  baseline: 1e-9,
  orbitMinimum: 0.05,
  panMinimum: 0.05,
  zoomMinimum: 0.1,
  settleMs: 2000,
  // Extra settle used only while diagnosing an edge case; every official
  // recorded state still uses settleMs.
  edgeSettleMs: 2000
});

const EXPECTED_CAMERA = Object.freeze({
  alpha: Math.PI / 4,
  beta: Math.PI / 3,
  radius: 8,
  target: Object.freeze([0, 0.5, 0])
});

const SCREENSHOTS = Object.freeze([
  'sp-06_camera_baseline.png',
  'sp-06_orbit_horizontal.png',
  'sp-06_orbit_vertical.png',
  'sp-06_pan_horizontal.png',
  'sp-06_pan_vertical.png',
  'sp-06_zoom_in.png',
  'sp-06_zoom_out.png',
  'sp-06_left_click_no_orbit.png',
  'sp-06_gizmo_interaction.png',
  'sp-06_edge_cases.png'
]);

const GESTURES = Object.freeze({
  orbitHorizontal: Object.freeze({
    button: 'left',
    from: Object.freeze({ xFactor: 0.2, yFactor: 0.5, dx: -70, dy: 0 }),
    to: Object.freeze({ xFactor: 0.2, yFactor: 0.5, dx: 70, dy: 0 })
  }),
  orbitVertical: Object.freeze({
    button: 'left',
    from: Object.freeze({ xFactor: 0.2, yFactor: 0.3, dx: 0, dy: 0 }),
    to: Object.freeze({ xFactor: 0.2, yFactor: 0.7, dx: 0, dy: 0 })
  }),
  panHorizontal: Object.freeze({
    button: 'right',
    from: Object.freeze({ xFactor: 0.2, yFactor: 0.5, dx: 0, dy: 0 }),
    to: Object.freeze({ xFactor: 0.2, yFactor: 0.5, dx: 140, dy: 0 })
  }),
  panVertical: Object.freeze({
    button: 'right',
    from: Object.freeze({ xFactor: 0.2, yFactor: 0.3, dx: 0, dy: 0 }),
    to: Object.freeze({ xFactor: 0.2, yFactor: 0.3, dx: 0, dy: 140 })
  }),
  wheelStep: 120
});

const INPUT_MAP = Object.freeze({
  expectedDefaultLength: 8,
  plainRotateEntry: Object.freeze({
    source: 'pointer',
    button: 0,
    interaction: 'rotate',
    modifiers: null
  })
});

// Beta sign convention for S-03 / A-05-P2.
//
// The original written procedure expected a downward drag to increase beta.
// The 2026-11-04 official run showed that Babylon.js 9.32.1 decreases beta on
// downward pointer motion, and the Project Owner authorised amending the
// written expectation to the engine convention. `amended` is therefore the
// official default. `legacy` exists only to reproduce the pre-amendment
// expectation; it never produces official PASS evidence.
const SIGN_CONVENTION = Object.freeze({
  default: 'amended',
  amended: Object.freeze({
    id: 'amended',
    expectedSign: -1,
    description: 'downward drag decreases beta (Babylon 9.32.1 convention; owner-amended 2026-11-04)'
  }),
  legacy: Object.freeze({
    id: 'legacy',
    expectedSign: 1,
    description: 'downward drag increases beta (superseded written expectation)'
  }),
  aliases: Object.freeze({
    babylon: 'amended',
    procedure: 'legacy'
  })
});

const RUNNER = Object.freeze({
  name: 'simuforge-sp06-official',
  version: '1.1.0',
  configVersion: 'sp06-official-config-2',
  inputLogSchemaVersion: '1.0.0',
  resultsSchemaVersion: '1.0.0'
});

module.exports = {
  TOLERANCES,
  EXPECTED_CAMERA,
  SCREENSHOTS,
  GESTURES,
  INPUT_MAP,
  SIGN_CONVENTION,
  RUNNER
};
