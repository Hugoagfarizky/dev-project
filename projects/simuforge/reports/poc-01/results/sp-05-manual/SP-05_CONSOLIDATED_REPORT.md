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

## POC-04 OS Click Evidence

An OS-level click was executed on the SP-05 harness at screen coordinate `(188, 188)`.

Recorded result:
- Chrome foreground matched: yes.
- DPI awareness: Per-Monitor V2.
- Target coordinate: `(188, 188)`.
- `SetCursorPos` result: success.
- Cursor after move: `(188, 188)` (delta 0).
- `SendInput` mouse down: 1.
- `SendInput` mouse up: 1.
- Cursor after click: `(107, 0)` (anomalous; see limitations).
- Status: `completed_one_click`.
- No transform values were captured before or after the click.

Archived evidence:
- `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/sp-05_poc04_os_click_188_188.json`
- `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/sp-05_poc04_before_188_188.png`
- `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/sp-05_poc04_after_188_188.png`
- `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/sp-05_poc04_baseline_188_188.json`
- `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/sp-05_poc04_after_click_188_188.json`

POC-04 transform verification:
- Baseline timestamp: `2026-10-31T20:29:33.183Z`
- Final timestamp: `2026-10-31T20:30:21.576Z`
- OS click timestamp: `2026-11-01T03:29:58.7010375+07:00`
- Target: screen coordinate `(188, 188)`
- Mouse down/up: `1` / `1`
- Cursor after click: `(100, 100)` (reported as stable at target in the latest POC-04 result; see OS click JSON)
- Position: baseline `(0, 0.5, 0)`; after click `(0, 0.5, 0)`; all components diff `0`.
- Quaternion: baseline `(0, 0, 0, 1)`; after click `(0, 0, 0, 1)`; all components diff `0`.
- Quaternion length: baseline `1`; after click `1`; diff `0`.
- Scale: baseline `(1, 1, 1)`; after click `(1, 1, 1)`; all components diff `0`.
- Tolerance: `1e-5`.
- Harness comparison: `STABLE`.

POC-04 result: PASS (transform stability verified with archived before/after snapshots). This does not upgrade SP-05 overall status.

## Overall conclusion

SP-05 remains BLOCKED. No acceptance criterion is upgraded to PASS.

- T-01 through T-04: user-reported success; no archived evidence.
- T-05: user-reported STABLE; supported by static code review (mode switching does not mutate transform), but no archived before/after values.
- T-06: PARTIAL; automated validator tests passed (8/8), but actual post-interaction evidence is missing.
- A-03 and A-04 remain unverified.

SP-06 remains at NO-GO per the documented sequential evidence gate (SP-05 evidence required before SP-06).

## Evidence limitations

No timestamps, screenshots, pointer coordinates, or JSON logs are fabricated. User-reported results are recorded as reported, without independent archival support. Programmatic validator results are recorded separately and are not represented as manual interaction evidence.