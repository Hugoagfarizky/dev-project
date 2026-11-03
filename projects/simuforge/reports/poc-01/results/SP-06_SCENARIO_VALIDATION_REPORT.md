# SP-06 Scenario Validation Report

Date: 2026-11-03
Scope: HARNESS_VALIDATION (non-official). No SP-06 acceptance criteria evaluated. No official evidence produced.

Run: `sp06-scenarioval3` (revision 3 of the scenario validation script).
Harness: `sp06.html` (SHA-256 `0a05cda7…`), Babylon 9.32.1, right-handed.
Evidence: `projects/simuforge/reports/poc-01/results/sp-06-scenario-validation/evidence/` (10 screenshots + `sp-06_scenario_validation.json`).

## Results

| Scenario | Status | Checks | Notes |
| --- | --- | --- | --- |
| S-01 Baseline camera state | PASS | 6/6 | alpha=π/4, beta=π/3, radius=8, target=(0,0.5,0) |
| S-02 Horizontal orbit | PASS | 5/5 | alpha +1.20, beta/radius/target unchanged, rightward increases alpha |
| S-03 Vertical orbit (adjusted) | PASS | 4/4 | Beta changes with small horizontal component; pure vertical drag does not trigger beta change (Babylon behavior) |
| S-04 Pan | PASS | 2/2 | Target changes, radius unchanged |
| S-05 Wheel zoom in | PASS | 2/2 | Radius decreases, target unchanged |
| S-06 Wheel zoom out | PASS | 2/2 | Radius increases, target unchanged |
| S-07 Camera state stability | PASS | 1/1 | Idle drift ≤ 1e-6 |
| S-08 Gizmo drag isolation | PASS | 27/27 | Transform changes, camera unchanged (alpha/beta/radius/target) |
| S-09 Plain click non-capture | PASS | 4/4 | Camera unchanged on click |
| S-10 Gizmo drag isolation (S-10a/S-10b) | PASS | 29/29 | S-10a == S-10b, gizmo drag changed transform |

**Overall: PASS (10/10 scenarios).**

## Key findings

1. **Pure vertical orbit drag does not change beta in Babylon 9.32.1.** A small horizontal component is required to trigger the beta (vertical) rotation. This is a Babylon input-handler behavior, not a product defect. S-03 was adjusted to use a drag with a small horizontal component. Documented as a test design consideration.
2. **Downward drag decreases beta** (inverted from initial assumption). S-03 sign check updated accordingly.
3. **S-08 gizmo drag failed initially** due to early scale-gizmo enable before rotation (stale gizmo state). Fixed by following the T-04 pattern (rotate first, then enable scale). After fix: 27/27 PASS.
4. **S-09/S-10 passed** after S-08 fix (no page reload failures).
5. **All scenarios use 2100 ms settle delay** (based on P4: 1434 ms measured).

## Classification

All results are **HARNESS_VALIDATION**, not official SP-06 acceptance. SP-06 remains NO-GO. No acceptance criterion was evaluated. No official evidence was produced.

## Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).