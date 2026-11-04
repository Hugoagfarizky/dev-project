# SP-06 Tolerance Basis and Decision Request

Date: 2026-11-04
Scope: Empirical basis, implementation mapping, and recommendation for the three provisional SP-06 numeric tolerances. **No value is approved by this document.** No acceptance criterion or test procedure was modified. No official SP-06 execution was performed.

## 1. Why this document exists

SP-06 is blocked by one technical-adjacent decision: the numeric tolerances `0.05 rad`, `0.1`, and `1e-6` were proposed internally and have never been justified or approved. They are currently **PROVISIONAL**. This document states exactly what each number measures, where it is used, what evidence exists, and what the Project Owner is being asked to decide.

## 2. What each tolerance actually is

The three numbers are **not** all the same kind of quantity. Conflating them is the main source of confusion in earlier reviews.

| Tolerance | Unit | Kind | Where used | Meaning |
| --- | --- | --- | --- | --- |
| `0.05` | radians | **Gesture-magnitude minimum** | S-02, S-03, S-12 (orbit) | The orbit gesture must change `alpha` or `beta` by more than 0.05 rad (≈ 2.86°). It is a "did the gesture actually do something" floor, not an accuracy bound. |
| `0.05` | world units | **Gesture-magnitude minimum** | S-04, S-05 (pan) | Pan must move the camera target by more than 0.05 units. |
| `0.1` | world units (camera radius) | **Gesture-magnitude minimum** | S-06, S-07 (zoom) | One zoom step must change `radius` by more than 0.1. |
| `1e-6` | per parameter (rad / units) | **Invariance tolerance** | S-01, S-02, S-03, S-04, S-05, S-06, S-07, S-08, S-09, S-10b, S-12 | Parameters that must *not* change may differ by at most 1e-6. This is the only true numerical-equality tolerance. |
| `2000` | ms | **Settle delay** | All scenarios | Wait for inertia to finish before recording. Already **APPROVED**. |

Implementation references:

- Procedure: `SP-06_TEST_PROCEDURE_DRAFT.md` §6 (lines 142–214).
- Runner building blocks: `harness/runner/lib/scenario.js` uses `> 0.05` for translation magnitude, `<= 1e-3` for off-axis translation, `<= 1e-6` for scale confinement.
- Harness internal checks: `harness/sp06.html` uses `Q_TOL = 1e-5` for quaternion length and `CMP_TOL = 1e-5` for mode-switch comparison. These are harness-internal validation values, separate from the SP-06 procedure tolerances, and are not changed here.

## 3. Empirical evidence available

Sources (read-only):

- `results/sp-06-probe/evidence/sp-06_probe_p1.json`
- `results/sp-06-probe/evidence/sp-06_probe_p3.json`
- `results/sp-06-tolerance-calibration/evidence/sp-06_tolerance_calibration.json`
- `SP-06_PROBE_EXECUTION_REPORT.md`, `SP-06_FINAL_TOLERANCE_RECOMMENDATION.md`

### 3.1 Noise floor (settled state)

| Parameter | Observed range at rest | Max deviation | Comment |
| --- | --- | --- | --- |
| alpha | 0 | 0 | bit-stable |
| beta | 0 | 2.22e-16 | one ULP of double precision |
| radius | 0 | 0 | bit-stable |
| target x/y/z | 0 | 0 | bit-stable |

After orbit / pan / zoom, once settled: range 0, max deviation ≤ 4.44e-16. This is the measurement noise floor of the state reader.

### 3.2 Observed magnitude of one real gesture

| Gesture | Observed delta | Evidence |
| --- | --- | --- |
| Horizontal orbit (plain left-drag) | Δalpha = **0.72752 rad** | P1 |
| Right-drag pan | Δtarget = (−0.55752, −1.4e-11, −0.00491), magnitude ≈ **0.5575** | P1 |
| One wheel step (`deltaY = −120`) | Δradius = **−7.72110** | P1 / P3 |
| Gizmo drag | Δscale X = +0.2034; camera delta = 0 | P5 |

### 3.3 Unsettled-state residual (important)

P1 recorded the orbit immediately before the pan without a full settle. The pan's "before" alpha was still moving, and the pan interval shows Δalpha = +0.0699 rad even though pan should not orbit. The wheel step likewise showed Δalpha = 8.26e-5 and a target shift of 0.034 when the wheel was aimed at the canvas centre instead of the projected target centre.

**Consequence:** magnitude thresholds and invariance tolerances are only valid after the approved 2000 ms settle. With insufficient settle, inertia alone can exceed both `0.05 rad` and `1e-6`. This is why the settle delay is part of the tolerance definition, not an independent convenience.

## 4. Sensitivity analysis

### 4.1 Invariance tolerance (`1e-6`)

- Noise floor: ≤ 4.44e-16. `1e-6` is ≈ 2.3×10⁹ × the noise floor.
- Real unintended motion: unsettled residual ≥ 8.3×10⁻⁵; wrong-aim zoom target shift 3.4×10⁻². `1e-6` separates real motion from noise by ≥ 80× even in the worst observed case.
- **False negative risk (too loose):** a genuine drift between 1e-6 and 8e-5 would pass. No such drift has been observed, but tightening costs nothing.
- **False positive risk (too tight):** none plausible: all state is read in the same JS context; no cross-process serialization. Even `1e-12` is ~2000× the observed noise.
- **Defensible value:** `1e-9`. It is ~2.3×10⁶ × the noise floor, 8×10⁻⁵ / 1e-9 = 80,000× below the smallest observed real residual, and leaves four orders of headroom for browser/JIT variation. `1e-12` is also defensible but gives needlessly little margin for future instrumentation changes.

### 4.2 Orbit/pan magnitude minimum (`0.05`)

- Standard gesture output: 0.7275 rad (orbit), 0.5575 units (pan).
- Margin: 14.6× (orbit), 11.2× (pan). An intentional gesture would have to be ~7–9% of the standard probe gesture to false-fail.
- **False positive risk:** with settled state the noise floor is ~0, so a no-op cannot reach 0.05. Unsettled inertia can reach 0.0699 rad, so a false pass is possible **only if the 2000 ms settle is skipped**. The settle requirement closes this.
- **Defensible value:** retain `0.05` for both. It is a floor, not an accuracy claim; tightening it would only increase false failures without adding safety.

### 4.3 Zoom magnitude minimum (`0.1`)

- Standard gesture output: 7.721 per wheel step (`deltaY = −120`).
- Margin: 77×. `0.1` is ~1.3% of one wheel step.
- **False positive risk:** cannot be produced by noise; a wheel event either fires or does not. Trackpad/partial-delta devices are not in the POC scope (desktop Chrome, mouse wheel).
- **Defensible value:** retain `0.1`. If partial-delta input is ever supported, re-derive from the minimum deliverable wheel delta.

## 5. Recommendation table for the Project Owner

| # | Item | Current value | Evidence available | Recommended value | Status after recommendation |
| --- | --- | --- | --- | --- | --- |
| 1 | Settle delay | 2000 ms | P4 measured 113–1434 ms; 500 ms insufficient | **2000 ms** | already APPROVED; no action |
| 2 | Invariance (alpha, beta, radius, target) | 1e-6 | noise floor ≤ 4.44e-16; real residual ≥ 8.3e-5 | **1e-9** | requires owner approval |
| 3 | Orbit/pan magnitude minimum | 0.05 | one gesture = 0.7275 rad / 0.5575 units (11–15× margin) | **retain 0.05** | requires owner approval |
| 4 | Zoom magnitude minimum | 0.1 | one wheel step = 7.721 radius units (77× margin) | **retain 0.1** | requires owner approval |

If the owner prefers minimal change, keeping `1e-6` is safe for the observed data (it still separates noise from real motion by ≥ 80×). The recommendation to tighten to `1e-9` is about margin, not about a known failure.

## 6. What is *not* being decided here

- No acceptance criterion is altered.
- No threshold is marked APPROVED by this document.
- The harness-internal `1e-5` quaternion/mode-switch values are out of scope and unchanged.
- The pause/stop/edge-case scenarios (S-11) have no numeric tolerance beyond "finite, no NaN, no console errors".

## 7. Decision requested

Project Owner, please choose one option for items 2–4:

- **Option A (recommended):** approve `1e-9` invariance, retain `0.05` orbit/pan minimum, retain `0.1` zoom minimum.
- **Option B (minimal change):** retain `1e-6` invariance, retain `0.05`, retain `0.1`.
- **Option C:** specify alternative values.

Until one option is recorded, SP-06 remains **NO-GO** regardless of harness readiness.

## 8. Owner decision 2026-11-04 — Option A approved

This section is appended and supersedes the "status after recommendation" column and the NO-GO sentence above.

| # | Item | Approved value | Status |
| --- | --- | --- | --- |
| 1 | Settle delay | 2000 ms | APPROVED (unchanged; still mandatory before every recorded state) |
| 2 | Invariance / equality bound | **1e-9** | **APPROVED (Option A)** |
| 3 | Orbit/pan magnitude minimum | **0.05 rad / 0.05 world units** | **APPROVED (retained)** |
| 4 | Zoom magnitude minimum | **0.1 radius units** | **APPROVED (retained)** |

Notes:

- The owner selected **Option A** (1e-9 invariance; 0.05 orbit/pan; 0.1 zoom) on 2026-11-04.
- The invariance bound is used only for equality/invariance checks. The gesture minima remain separate magnitude floors and are not equality tolerances.
- The 2000 ms settle delay is unchanged and still applies before every recorded post-gesture state.
- Approved values are centralized in `harness/runner/sp06/config.js` (`TOLERANCES`).
- **No acceptance criterion was changed.**
