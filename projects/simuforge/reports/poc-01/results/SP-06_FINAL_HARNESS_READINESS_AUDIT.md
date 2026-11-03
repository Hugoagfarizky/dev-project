# SP-06 Final Harness Readiness Audit

Date: 2026-11-03
Scope: Deep audit of SP-06 harness and runner against all SP-06 documentation, decisions, and probe results.

## 1. Audit findings (severity classification)

| # | Severity | Finding | Detail |
| --- | --- | --- | --- |
| A1 | ACCEPTABLE | Babylon 9.32.1 and right-handed mode | Verified in smoke test and scenario validation. |
| A2 | ACCEPTABLE | ArcRotateCamera configuration | alpha=π/4, beta=π/3, radius=8, target=(0,0.5,0), attachControl(canvas,true). Consistent with sp05.html. |
| A3 | ACCEPTABLE | Input map defaults | 8 default entries per Babylon docs. Verified via getCameraInputMap(). |
| A4 | ACCEPTABLE | Camera state capture | getCameraState() returns alpha, beta, radius, target. Verified. |
| A5 | ACCEPTABLE | Input map inspection/reset | getCameraInputMap() and resetCameraInputMap() work. Verified. |
| A6 | ACCEPTABLE | Gizmo policy (world/world/local) | Verified per-mode in smoke test. |
| A7 | ACCEPTABLE | Provenance | cdp_trusted_input declared; no synthetic/programmatic input. |
| A8 | ACCEPTABLE | Screenshot capture | Page.captureScreenshot works; smoke test PASS. |
| A9 | ACCEPTABLE | Console tracking | No console errors in smoke or scenario validation. |
| A10 | ACCEPTABLE | Chrome cleanup | Browser stopped; no leftover process. |
| A11 | ACCEPTABLE | No new dependencies | Only Node.js built-in + SP-05 runner libs. |
| A12 | ACCEPTABLE | sp05.html unchanged | SHA-256 `0a05cda7…` unchanged. |
| A13 | MEDIUM | No full scenario implementation in runner | Runner is smoke-only. Full scenario execution requires new code (not authorized). |
| A14 | MEDIUM | Tolerances not centralized | Tolerances hardcoded in scenario checks. Recommend centralizing in config object. |
| A15 | LOW | detachControl cleanup | Added to run.js finally block. Acceptable. |

## 2. Consistency check: decisions vs. harness vs. runner

| Item | Owner decision | Harness | Runner | Match |
| --- | --- | --- | --- | --- |
| Plain left-drag | orbit (approved) | default map (button 0 → rotate) | not implemented (smoke only) | Yes |
| Ctrl+left-drag | pan (approved) | default map (ctrl+left → pan) | not implemented | Yes |
| Alt+left-drag | orbit (approved) | default map (wildcard → rotate) | not implemented | Yes |
| Right-drag | pan (approved) | default map (button 2 → pan) | not implemented | Yes |
| Wheel up | zoom in (approved) | default map (wheel → zoom) | not implemented | Yes |
| Wheel down | zoom out (approved) | default map (wheel → zoom) | not implemented | Yes |
| Settle delay | 2000 ms (approved) | n/a | 2100 ms (smoke) | Within tolerance |
| Tolerances | PROVISIONAL | n/a | hardcoded | Consistent |

## 3. Reproducibility

- Smoke test: 11/11 PASS (reproducible).
- Scenario validation: 10/10 PASS (reproducible after S-08 fix).
- Tolerance calibration: noise floor ~2e-16 (reproducible).
- Chrome cleanup: verified.
- No nondeterministic behavior observed.

## 4. False-PASS prevention

- All scenario checks use explicit thresholds and record before/after state.
- Gizmo policy verified per-mode (lazy gizmos).
- Provenance declared and validated.
- Console errors fail the run.
- No synthetic input or programmatic transform used.
- Camera state capture is read-only.
- S-10a/S-10b hard gate verified (P5).

## 5. Summary

No BLOCKER or HIGH findings. Two MEDIUM (expected: no full scenario implementation yet, tolerances not centralized) and one LOW (detachControl). The harness is structurally sound, passes all smoke and scenario validation checks, and is consistent with owner decisions.

## 6. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).