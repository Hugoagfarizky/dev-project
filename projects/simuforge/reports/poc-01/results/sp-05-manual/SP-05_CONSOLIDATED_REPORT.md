# SimuForge POC-01 — SP-05 Consolidated Test Report

## Purpose

Consolidate all available SP-05 evidence and status without overstating results. This report does not declare SP-05 PASS.

## Test results

### User-reported manual results

The following were reported verbally by the user. No independently archived screenshots or exported JSON logs are available for these.

| Test | User-reported result | Evidence status |
| --- | --- | --- |
| T-01 World Translate | X, Y, Z successful | User-reported only; no archived evidence |
| T-02 World Rotate | 45° and 90° successful | User-reported only; no archived evidence |
| T-03 Unrotated Local Scale | Successful | User-reported only; no archived evidence |
| T-04 Rotated Local Scale | 45° and 90° successful | User-reported only; no archived evidence |
| T-05 Mode Switching | STABLE | User-reported only; no archived before/after values |

### T-06 Transform Integrity

Automated verification (programmatic, not manual interaction) of the harness validators:

Current harness snapshot (default transform):
- Position: `(0, 0.5, 0)`
- Quaternion: `(0, 0, 0, 1)`
- Quaternion length: `1.00000000`
- Difference from 1: approximately 0
- Scale: `(1, 1, 1)`
- Quaternion validation: VALID
- Scale validation: VALID

Programmatic validator tests: 8/8 PASS:
1. Normalized quaternion → PASS
2. Non-finite quaternion component → PASS
3. Quaternion length outside 1e-5 tolerance → PASS
4. Normal scale → PASS
5. Zero scale → PASS
6. Negative scale → PASS
7. Scale below 1e-3 → PASS
8. Non-finite scale component → PASS

These programmatic tests validate the harness validation logic only. They are not genuine manual gizmo interaction evidence. No post-interaction transform evidence exists.

T-06 verdict: PARTIAL (automated validators pass; actual post-interaction evidence missing).

## Assumptions

- A-03 (position and rotation gizmos can be set to world orientation without artifacts in right-handed mode): UNVERIFIED. User-reported successful interactions are not independently supported by archived visual evidence sufficient to establish gizmo orientation behavior.
- A-04 (local-oriented scale gizmo behaves correctly on rotated entities, including non-uniform scale): UNVERIFIED. Same reason.

## Overall conclusion

SP-05 remains BLOCKED. No acceptance criterion is upgraded to PASS.

- T-01 through T-04: user-reported success; no archived evidence.
- T-05: user-reported STABLE; supported by static code review (mode switching does not mutate transform), but no archived before/after values.
- T-06: PARTIAL; automated validator tests passed (8/8), but actual post-interaction evidence is missing.
- A-03 and A-04 remain unverified.

SP-06 remains at NO-GO per the documented sequential evidence gate (SP-05 evidence required before SP-06).

## Evidence limitations

No timestamps, screenshots, pointer coordinates, or JSON logs are fabricated. User-reported results are recorded as reported, without independent archival support. Programmatic validator results are recorded separately and are not represented as manual interaction evidence.