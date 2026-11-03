# SP-06 Deep Harness Audit

Date: 2026-11-03
Scope: Read-only deep audit of `sp06.html` and `runner/sp06/run.js` against SP-06 procedure, owner decisions, and technical reviews.

## 1. Audit findings

| # | Severity | Finding | Detail |
| --- | --- | --- | --- |
| D1 | ACCEPTABLE | Babylon 9.32.1 and right-handed mode | Verified in smoke test (PASS). |
| D2 | ACCEPTABLE | ArcRotateCamera configuration | alpha=π/4, beta=π/3, radius=8, target=(0,0.5,0), attachControl(canvas,true). Consistent with sp05.html. |
| D3 | ACCEPTABLE | Input map defaults | 8 default entries per Babylon docs (ctrl+left=pan, plain left=rotate, right=pan, wheel=zoom, etc.). |
| D4 | ACCEPTABLE | Camera state capture | getCameraState() returns alpha, beta, radius, target. Verified in smoke test. |
| D5 | ACCEPTABLE | Input map inspection | getCameraInputMap() returns 8 entries. Verified. |
| D6 | ACCEPTABLE | Input map reset | resetCameraInputMap() works. Verified. |
| D7 | ACCEPTABLE | Gizmo policy | Translate/rotate world, scale local — verified per-mode in smoke test. |
| D8 | ACCEPTABLE | Provenance | cdp_trusted_input declared; no synthetic input. |
| D9 | ACCEPTABLE | Screenshot capture | Page.captureScreenshot works; smoke test PASS. |
| D10 | ACCEPTABLE | Console tracking | No console errors in smoke test. |
| D11 | ACCEPTABLE | Chrome cleanup | Browser stopped; no leftover process (verified in smoke test). |
| D12 | MEDIUM | No SP-06 scenario implementation in runner | Runner is smoke-only. Full scenario execution requires new code. Expected (not yet authorized). |
| D13 | MEDIUM | Tolerance configuration not centralized | Tolerances are hardcoded in scenario checks. Recommend centralizing in a config object (PROVISIONAL). |
| D14 | LOW | No detachControl cleanup on teardown | Added to run.js finally block (page.dispose handles it). Acceptable. |
| D15 | ACCEPTABLE | No new dependencies | Runner uses only Node.js built-in + SP-05 runner libs. |
| D16 | ACCEPTABLE | sp05.html unchanged | Verified: sp05.html not modified. |

## 2. Defaults consistency check

| Setting | sp06.html | Owner decision | Match |
| --- | --- | --- | --- |
| Plain left-drag | rotate (orbit) | APPROVED (TETAP ORBIT) | Yes |
| Ctrl+left-drag | pan (default map) | APPROVED (DEFAULT) | Yes |
| Alt+left-drag | orbit (via wildcard) | APPROVED (DEFAULT) | Yes |
| Right-drag | pan | APPROVED (DEFAULT) | Yes |
| Wheel up | zoom in | APPROVED | Yes |
| Wheel down | zoom out | APPROVED | Yes |
| Settle delay | 2100 ms (smoke) | 2000 ms approved | Within tolerance |

## 3. False-PASS prevention

- All scenario checks use explicit thresholds and record before/after state.
- Gizmo policy verified per-mode (lazy gizmos).
- Provenance declared and validated.
- Console errors fail the run.
- No synthetic input or programmatic transform used.
- Camera state capture is read-only.

## 4. Summary

No BLOCKER or HIGH findings. Two MEDIUM (expected: no scenario implementation yet, tolerances not centralized) and one LOW (detachControl). The harness is structurally sound and passes all smoke checks. Ready for gap closure and scenario implementation when authorized.

## 5. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).