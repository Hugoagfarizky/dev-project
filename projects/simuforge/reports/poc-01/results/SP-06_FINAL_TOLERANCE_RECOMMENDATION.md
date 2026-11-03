# SP-06 Final Tolerance Recommendation

Date: 2026-11-03
Scope: Non-official tolerance calibration and recommendation. No acceptance criteria changed. No SP-06 executed.

## 1. Measurement method

1. Baseline: 10 camera state samples at 200 ms intervals, no interaction, after 2100 ms settle.
2. After orbit: 10 samples.
3. After pan: 10 samples.
4. After zoom: 10 samples.
5. S-10a/S-10b: camera state before and after gizmo drag.
6. Settle delay: 2100 ms (based on P4: 1434 ms max).

Evidence: `projects/simuforge/reports/poc-01/results/sp-06-tolerance-calibration/evidence/sp-06_tolerance_calibration.json`

## 2. Results

### Idle (no interaction)

| Parameter | Range | Max deviation from mean | Stddev |
| --- | --- | --- | --- |
| alpha | 0 | 0 | 0 |
| beta | 0 | 2.22e-16 | 2.22e-16 |
| radius | 0 | 0 | 0 |
| target x/y/z | 0 | 0 | 0 |

### After orbit / pan / zoom

All parameters: range 0, max deviation ≤ 4.44e-16, stddev ≤ 4.44e-16.

### S-10a/S-10b (gizmo drag)

| Parameter | Delta (S-10b − S-10a) |
| --- | --- |
| alpha | 0 |
| beta | 0 |
| radius | 0 |
| target x/y/z | 0 |

## 3. Analysis

- The camera state is **bit-stable** at rest and after gestures: noise floor is at floating-point epsilon (~2e-16).
- Any change > ~1e-12 is a real change, not measurement noise.
- The proposed invariants tolerance of 1e-6 is ~10,000× the noise floor — very conservative.
- The proposed gesture thresholds (0.05 rad, 0.1 radius) are gesture-magnitude minimums, not noise tolerances.

## 4. Recommendations

| Tolerance | Current (proposed) | Recommended | Basis | Status |
| --- | --- | --- | --- | --- |
| Settle delay | 500 ms (old) / 2000 ms (new) | **≥2000 ms** | P4 measured 1434 ms max settle. | APPROVED (2.000 ms) |
| Alpha invariance | 1e-6 | **1e-9 or 1e-12** | Noise floor ~4.44e-16; 1e-6 is 10,000×. | PROVISIONAL |
| Beta invariance | 1e-6 | **1e-9 or 1e-12** | Noise floor ~2.22e-16. | PROVISIONAL |
| Radius invariance | 1e-6 | **1e-9 or 1e-12** | Noise floor 0. | PROVISIONAL |
| Target invariance | 1e-6 | **1e-9 or 1e-12** | Noise floor 0. | PROVISIONAL |
| Gesture minimum (orbit) | 0.05 rad | 0.05 rad (retain) | Gesture-magnitude minimum, not noise tolerance. | PROVISIONAL |
| Gesture minimum (zoom) | 0.1 radius | 0.1 radius (retain) | Gesture-magnitude minimum. | PROVISIONAL |

## 5. Distinctions

- **Numerical equality:** Camera state is bit-identical across samples at rest (range 0 for alpha/radius/target).
- **Floating-point noise:** ~2e-16 for beta only; 0 for all other parameters.
- **Camera movement:** Real changes produce deltas orders of magnitude above the noise floor (e.g., orbit changes alpha by ~1.2 rad).
- **Acceptable behavioral deviation:** Not yet defined; requires owner approval.

## 6. Status

- All tolerances remain **PROVISIONAL — REQUIRES PROJECT OWNER APPROVAL**.
- Settle delay 2.000 ms is APPROVED.
- No acceptance criterion changed.