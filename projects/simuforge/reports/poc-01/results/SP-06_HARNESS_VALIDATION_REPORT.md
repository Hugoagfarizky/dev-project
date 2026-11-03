# SP-06 Harness Validation Report

Date: 2026-11-03
Scope: Validation of the dedicated SP-06 harness and smoke runner. No full SP-06 executed. No acceptance criteria evaluated.

## 1. Smoke test result

Run: `node projects/simuforge/reports/poc-01/harness/runner/sp06/run.js --out ...`
Result: **PASS — 11/11 checks.**

| Check | Result |
| --- | --- |
| Harness Babylon version is 9.32.1 | PASS |
| Right-handed system active | PASS |
| Camera state available | PASS |
| Translate gizmo world space | PASS |
| Rotate gizmo world space | PASS |
| Scale gizmo local space | PASS |
| getCameraState() works | PASS |
| getCameraInputMap() works | PASS |
| resetCameraInputMap() works | PASS |
| Screenshot captured | PASS |
| No console errors | PASS |

## 2. Validations performed

- JavaScript syntax check: all runner `.js` and harness inline script — PASS.
- Chrome startup on dedicated port 9225: PASS.
- Harness loading from disk with cache disabled: PASS.
- Camera diagnostics initialization: PASS.
- Input-map configuration inspection: PASS (8 default entries).
- Screenshot export smoke test: PASS.
- Evidence path/hash validation: PASS.
- Provenance declaration: `cdp_trusted_input`.

## 3. NOT RUN

- Full SP-06 acceptance suite (S-01..S-12).
- Any scenario producing official SP-06 evidence.
- No official acceptance criterion evaluated.

## 4. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).
- Harness and runner: created and validated (smoke only).
- No main application modified.