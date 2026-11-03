# SP-06 Tolerance Calibration Report

Date: 2026-11-03
Scope: Non-official tolerance calibration study. No SP-06 acceptance criteria evaluated.

Evidence: `projects/simuforge/reports/poc-01/results/sp-06-tolerance-calibration/evidence/sp-06_tolerance_calibration.json`

## 1. Method

1. Baseline: 10 camera state samples at 200 ms intervals, no interaction.
2. After orbit: 10 samples.
3. After pan: 10 samples.
4. After zoom: 10 samples.
5. S-10a/S-10b: camera state before and after gizmo drag.
6. Settle delay: 2100 ms (based on P4: 1434 ms).

## 2. Results

### Idle (no interaction)

| Parameter | Range | Max deviation from mean | Stddev |
| --- | --- | --- | --- |
| alpha | 0 | 0 | 0 |
| beta | 0 | 2.22e-16 | 2.22e-16 |
| radius | 0 | 0 | 0 |
| target x/y/z | 0 | 0 | 0 |

### After orbit

| Parameter | Range | Max deviation | Stddev |
| --- | --- | --- | --- |
| alpha | 0 | 4.44e-16 | 4.44e-16 |
| beta | 0 | 2.22e-16 | 2.22e-16 |
| radius | 0 | 0 | 0 |
| target x/y/z | 0 | 0 | 0 |

### After pan

| Parameter | Range | Max deviation | Stddev |
| --- | --- | --- | --- |
| alpha | 0 | 4.44e-16 | 4.44e-16 |
| beta | 0 | 2.22e-16 | 2.22e-16 |
| radius | 0 | 0 | 0 |
| target x/y/z | 0 | 0 | 0 |

### After zoom

| Parameter | Range | Max deviation | Stddev |
| --- | --- | --- | --- |
| alpha | 0 | 4.44e-16 | 4.44e-16 |
| beta | 0 | 2.22e-16 | 2.22e-16 |
| radius | 0 | 0 | 0 |
| target x/y/z | 0 | 0 | 0 |

### S-10a/S-10b (gizmo drag)

| Parameter | Delta (S-10b − S-10a) |
| --- | --- |
| alpha | 0 |
| beta | 0 |
| radius | 0 |
| target x/y/z | 0 |

## 3. Interpretation

- The camera state is **bit-stable** at rest and after gestures: noise floor is at floating-point epsilon (~2e-16).
- Any change > 0 (or > ~1e-12) is a real change, not measurement noise.
- The proposed invariants tolerance of 1e-6 is ~10,000× the noise floor — very conservative.
- The proposed gesture thresholds (0.05 rad, 0.1 radius) are gesture-magnitude minimums, not noise tolerances.

## 4. Recommendations (PROVISIONAL)

- Settle delay: **≥2000 ms** (P4 measured 1434 ms max).
- Invariant tolerance: can be tightened to **1e-9** or **1e-12** based on measured noise floor (~2e-16). Current 1e-6 is extremely conservative.
- Gesture minimum thresholds (0.05 rad, 0.1 radius): retain as proposed; these are magnitude minimums, not noise tolerances. Justify from camera speed properties and typical gesture sizes.
- All tolerances remain **PROVISIONAL — REQUIRES PROJECT OWNER APPROVAL**.

## 5. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).
- No acceptance criterion changed.