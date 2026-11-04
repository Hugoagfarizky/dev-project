'use strict';

// Central configuration for the official SP-07 execution.
//
// SP-07 is a numeric quaternion / transform conversion spike. Its tolerance
// comes from the POC-01 specification (E-12, E-15): quaternion and transform
// components match within 1e-6, and quaternion length stays within 1e-6 of 1.
// This is separate from the SP-06 Option A invariance bound (1e-9), which
// governs camera state, and from the SP-05 1e-5 epsilon used for adapter
// no-op comparison. No tolerance is changed here; the value is the one already
// documented in POC_01_WORLD_EDITOR.md.

const TOLERANCES = Object.freeze({
  quaternionComponent: 1e-6,
  vectorComponent: 1e-6,
  quaternionLength: 1e-6,
  angleDegrees: 1e-4,
  // Gimbal lock is a singularity of the Euler representation, not of the
  // quaternion. The POC-01 specification states that the displayed X/Y/Z split
  // may not be unique there while the quaternion remains the source of truth.
  // A looser, documented tolerance is therefore used for orientation
  // round-trip at pitch near +/-90 deg; the quaternion itself is still checked
  // against the 1e-6 component tolerance everywhere else.
  gimbalComponent: 1e-4,
  gimbalDegrees: 1e-2,
  settleMs: 0
});

const RUNNER = Object.freeze({
  name: 'simuforge-sp07-official',
  version: '1.0.0',
  configVersion: 'sp07-quaternion-config-1',
  numericLogSchemaVersion: '1.0.0',
  resultsSchemaVersion: '1.0.0'
});

const SCREENSHOTS = Object.freeze([
  'sp-07_quaternion_rotation.png'
]);

module.exports = {
  TOLERANCES,
  RUNNER,
  SCREENSHOTS
};
