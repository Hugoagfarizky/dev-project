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

## 2026-11-03 Harness Repair and CDP Proof

The Project Owner approved direct CDP `Input.dispatchMouseEvent` as an SP-05 evidence method on 2026-11-02. The approval is recorded in `SP-05_EVIDENCE_PROCEDURE.md`; it does not change any acceptance criterion.

### Repaired defect

Babylon.js creates `GizmoManager` gizmos lazily on the first `*GizmoEnabled = true` assignment. The harness previously read `positionGizmo`, `rotationGizmo`, and `scaleGizmo` immediately after construction, when all were `null`, so the world/world/local assignments never reached a gizmo and Babylon's local default applied. The harness now calls `applyGizmoSpace()` after lazy creation and on every `setMode()`.

The harness diagnostics confirm after a fresh reload: `positionSpaceWorld: true`, `positionUpdateFlag: false`. Rotation and scale flags are populated when their gizmos are first enabled, and each mode change re-applies the policy before the case interacts with it.

### Corrected provenance

The hardcoded `interactionManual: true` was removed. The harness now records a declared input method and marks every entry with `inputMethod`, `sp05Eligible`, `interactionManual`, `interactionAutomated`, `lastDrag`, and `dragCount`. Untrusted pointer events force `synthetic_input`. `interactionManual` is true only for `physical_mouse`; CDP interaction is recorded as `cdp_trusted_input`, `interactionManual: false`, `interactionAutomated: true`, and `sp05Eligible: true`.

### Proof cases

Run with the repository runner: `node run.js --cases proof --passes 2`. Each execution reloaded `sp05.html` from disk; no debugger injection, synthetic event, direct transform assignment, or internal gizmo drag call was used.

| Case | Pass 1 | Pass 2 | Key measurement |
| --- | --- | --- | --- |
| T-01 world X translation after ~42° Y | 37/37 PASS | 37/37 PASS | Setup rotation 40.8814° about world Y; translation delta `(0.902087, 0, 0)`; world X handle direction matched exactly. |
| T-02 world X rotation after ~42° Y | 35/35 PASS | 35/35 PASS | Orientation delta axis `(1, 0, 0)`, angle 43.9206°; rotated local X was `(0.756066, 0, -0.654495)`. |
| T-04 local X scale after ~42° Y | 41/41 PASS | 41/41 PASS | Scale `(1, 1, 1) → (1.203411, 1, 1)`; handle matched the local X axis; Y/Z unchanged. |

Both passes produced identical transforms. Every drag recorded lifecycle `start=1`, `drag=24`, `end=1`, `allTrusted=true`, `pointerType="mouse"`, with no cross-axis activity. No synthetic input and no console errors were observed.

### Evidence location and scope

Proof artifacts: `projects/simuforge/reports/poc-01/results/sp-05-automated/proof/`. They use `proof_` prefixes and `_passN` suffixes and are explicitly not the official evidence set.

This proof covers three interactions. It does not cover the full T-01 through T-06 procedure, and it does not replace human review of the screenshots for visual axis alignment.

## Full suite execution (2026-11-03)

The complete suite was executed once with `node run.js --cases all --out projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/` (run `2026-11-03T09-16-00-842Z-25efe7`).

| Case | Checks | Result |
| --- | --- | --- |
| T-01 World translate | 59/59 | PASS |
| T-02 World rotate | 35/35 | PASS |
| T-03 Unrotated local scale | 26/26 | PASS |
| T-04 Rotated local scale | 61/61 | PASS |
| T-05 Mode switching | 26/26 | PASS |
| T-06 Transform integrity | 49/49 | PASS |
| **Total** | **256/256** | **PASS** |

Fourteen genuine CDP drags were recorded. Every drag used `Input.dispatchMouseEvent`, produced a harness lifecycle of `start=1`, `drag=24`, `end=1`, and was fully trusted (`isTrusted: true`, `pointerType: "mouse"`). Every export entry is `cdp_trusted_input`, SP-05 eligible, `interactionManual: false`, `interactionAutomated: true`. No synthetic input, programmatic transform, retry, or console error occurred. An independent audit of the evidence files passed 750/750 checks.

Key measurements: T-01 world deltas `(0.902087, 0, 0)`, `(0, 0.817648, 0)`, `(0, 0, 0.858875)`; T-02 world X delta axis `(1, 0, 0)` at 43.9206°; T-03 local X `1 → 1.214723`; T-04 local X `1 → 1.203411` plus supplementary local Y at ~87.45° `1 → 1.134295`; T-05 STABLE; T-06 quaternion normalized and scale positive.

Evidence-completeness deviations remain: `sp-05_rotate_45.png` was not produced, local Z scaling was not exercised in T-04, and the harness checklist is still "Not tested". These require review or an explicit waiver. See `SP-05_FULL_EXECUTION_REPORT.md`.

## Overall conclusion

SP-05 remains BLOCKED. No acceptance criterion is upgraded to PASS.

- Archived automated evidence now exists for all six cases under `results/sp-05-manual/evidence/`, with sidecar audits and harness exports.
- The full suite passed 256/256 runner assertions, but it has not been reviewed or accepted.
- A-03 and A-04 remain unverified until the screenshots are visually reviewed and the evidence is formally accepted.
- The earlier user-reported manual results remain unarchived and are not replaced by this run.
- The 2026-11-03 proof and full-suite artifacts are recorded as `cdp_trusted_input`, not as physical-mouse interaction.

SP-06 remains at NO-GO per the documented sequential evidence gate (SP-05 evidence required before SP-06).

## Evidence limitations

No timestamps, screenshots, pointer coordinates, or JSON logs are fabricated. User-reported results are recorded as reported, without independent archival support. Programmatic validator results are recorded separately and are not represented as manual interaction evidence. The 2026-11-03 proof and full-suite artifacts are recorded as `cdp_trusted_input`, not as physical-mouse interaction. The full-suite screenshots still require human visual review; numeric assertions do not establish visual axis alignment.