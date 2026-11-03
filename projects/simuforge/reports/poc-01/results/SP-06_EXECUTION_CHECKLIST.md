# SP-06 Execution Checklist (Preparation Only)

Date: 2026-11-03
Status: Preparation only. SP-06 remains NO-GO. Not an authorization to execute.

## Prerequisites
- [ ] SP-05 formal acceptance (visual review complete; A-03/A-04 verified).
- [ ] Owner decisions 1 and 3 fully resolved (modifier, tolerances).
- [ ] SP-06 harness reviewed and approved.
- [ ] Tolerance configuration finalized (settle delay 2000 ms approved; angle/radius/position provisional).
- [ ] Project Owner authorizes SP-06 execution.

## Scenario order
S-01 → S-02 → S-03 → S-04 → S-05 → S-06 → S-07 → S-08 → S-09 → S-10a → S-10b → S-12

## Input used
- Plain left-drag: orbit (approved default).
- Ctrl+left-drag: pan.
- Alt+left-drag: orbit (via wildcard).
- Right-drag: pan.
- Wheel up: zoom in. Wheel down: zoom out.
- Settle delay: 2000 ms (approved).

## Required screenshots (PROPOSED)
1. sp-06_camera_baseline.png
2. sp-06_orbit_horizontal.png
3. sp-06_orbit_vertical.png
4. sp-06_pan_horizontal.png
5. sp-06_pan_vertical.png
6. sp-06_zoom_in.png
7. sp-06_zoom_out.png
8. sp-06_left_click_no_orbit.png
9. sp-06_gizmo_interaction.png
10. sp-06_edge_cases.png

## JSON output
- Input log with before/after camera state per scenario.
- Console errors/warnings.
- Environment record.
- Provenance declaration.
- Artifact hashes.

## Expected behavior
- Orbit changes alpha/beta; pan changes target; zoom changes radius.
- Camera unchanged during gizmo drag (S-10a == S-10b).
- No console errors.
- Plain left-drag orbits (approved default).

## Failure conditions
- Gizmo drag fails or camera orbits during gizmo drag (S-10 hard gate).
- Any console error.
- NaN or non-finite camera state.
- Provenance mismatch.
- Harness not ready.

## Evidence requirements
- Input log, screenshots, console log, environment record, sidecar audit, artifact hashes.

## Stop conditions
- Any BLOCKER finding.
- S-10 hard gate failure.
- Unexplained console error.
- Provenance mismatch.
- Harness not ready within timeout.

## Owner approval gates
- All 9 decisions approved or explicitly waived.
- Tolerances finalized.
- Harness reviewed and approved.
- SP-05 formally accepted.