# SP-06 Probe Execution Report

Date: 2026-11-03
Scope: Empirical probes P1–P5 only. Not a full SP-06 execution. No acceptance criteria changed. No SP-05 evidence modified.

Run ID: `sp06-probe-2026-11-03T10-06-...` (see `sp-06_probe_run_summary.json`)
Harness: `sp06-probe.html` (copy of `sp05.html`, 36,233 bytes, SHA-256 `0a05cda7c8407c747466fff21137820e551945de7b5e74c89a3d695807a1d222`)
Babylon.js: 9.32.1, right-handed system: true
Browser: Chrome/156.0.8078.76
Evidence directory: `projects/simuforge/reports/poc-01/results/sp-06-probe/evidence/`

## 1. Probe summary

| Probe | Status | Checks | Key result |
| --- | --- | --- | --- |
| P1 CDP Camera Input | **FAIL** (9/10) | 9/10 | Orbit, pan (right-drag), zoom all work via trusted CDP. One check failed: zoom target shift (test methodology, not Babylon defect). |
| P2 Input-map Removal/Restoration | **FAIL** (11/12) | 11/12 | Removal, non-orbit, reset, restore all work. One check failed: `getEntry` returns `undefined` not `null` (API detail). |
| P3 Wheel Direction | **PASS** (2/2) | 2/2 | Wheel up (deltaY −120) → radius decreases (zoom in). Wheel down → radius increases (zoom out). |
| P4 Inertia Settle | **PASS** (3/3) | 3/3 | Settled in 1434 ms. 500 ms settle delay is insufficient. |
| P5 Gizmo Survival | **PASS** (33/33) | 33/33 | Input-map edit applied; gizmo drag produced non-uniform scale; camera unchanged (S-10a == S-10b); no console errors. |

Overall probe result: **2 of 5 probes had a single non-product check failure each** (P1 zoom target, P2 getEntry null-vs-undefined). All core behaviors passed.

## 2. P1 — CDP Camera Input

### Verified facts
- Plain left-drag (default map) orbits: alpha changed +0.7275 rad; beta, radius, target unchanged.
- Right-drag pans: target changed (−0.558, 0, −0.005); radius unchanged.
- Wheel zooms: radius changed −7.72; zoom direction confirmed by P3.
- `zoomToMouseLocation` is **false** by default in Babylon 9.32.1.
- Zooming at the projected target center (493, 348.5) keeps target unchanged (verified by follow-up zoom probe).
- No console errors.

### Empirical findings
- **P1 zoom target shift (FAIL check):** The initial zoom test zoomed at canvas center (693, 394) instead of the projected target center (493, 348.5), causing a −0.034 target shift. This is a **test methodology error**, not a Babylon defect. Corrected by the follow-up zoom probe: target delta = 0 when zooming at the projected center.
- **P1 modifier tests (inconclusive):** Ctrl+left-drag (modifiers=2) changed radius (−2.26) and target (+0.556), not a pure pan. Alt+left-drag (modifiers=1) changed target slightly (+0.046) and radius minimally (−0.001). These results are **inconclusive** for modifier assignment. Possible causes: modifier bits not applied as expected, or inertia/residual motion (settle not waited). Decision 1 remains PROVISIONAL.

### Modifier bit reference (for investigation)
- CDP modifiers: bit 0 = Alt (1), bit 1 = Ctrl (2), bit 2 = Meta (4), bit 3 = Shift (8).
- Babylon checks `event.ctrlKey` / `event.altKey`. Whether CDP sets these correctly for `Input.dispatchMouseEvent` is unverified (M6).

## 3. P2 — Input-map Removal and Restoration

### Verified facts
- Default inputMap has 8 entries; plain-left-drag rotate is at index 1.
- Removal via `splice` succeeded (8 → 7 entries).
- `getEntry("pointer", "rotate")` returns `undefined` (not `null`) when no match — API detail, not a defect.
- After removal: plain left-drag does not orbit (delta 0 for alpha/beta/radius/target).
- `resetInputMap()` restores the entry (7 → 8); `getEntry` returns the entry again.
- After reset: plain left-drag orbits (alpha +0.7476).
- All mutation APIs available: `getEntry`, `getEntries`, `setInteraction`, `addEntry`, `setInteractions`, `resetInputMap`.
- No console errors.

### Finding
- **P2 getEntry null-vs-undefined:** The check expected `null` but received `undefined`. Behavior is correct (entry absent). This is an API return-value detail to document: `getEntry` returns `undefined` when no match. Not a product defect.

## 4. P3 — Wheel Direction

### Verified facts
- Wheel up (deltaY = −120): radius decreases (zoom in). PASS.
- Wheel down (deltaY = +120): radius increases (zoom out). PASS.
- Direction confirmed: deltaY negative → zoom in; deltaY positive → zoom out.
- S-06/S-07 expected signs in the draft are correct (no fallback needed).

## 5. P4 — Inertia Settle

### Verified facts
- Camera settled in **1434 ms** after an orbit gesture.
- Final state finite (no NaN).
- No console errors.

### Finding
- **Settle delay insufficient:** The proposed 500 ms settle delay is **not sufficient**. Recommend ≥2000 ms (with margin). This is a probe result, not a product defect.

## 6. P5 — Gizmo Survival (HARD GATE)

### Verified facts
- Input-map edit applied (removed plain rotate entry, 8 → 7).
- S-10a (before gizmo drag): alpha=0.7854, beta=1.0472, radius=8, target=(0, 0.5, 0).
- Gizmo drag (local X scale) produced non-uniform scale: `(0.9999998, 1, 0.9999998) → (1.203411, 1, 0.9999998)`. Picked axis: x.
- S-10b (after gizmo drag): alpha=0.7854, beta=1.0472, radius=8, target=(0, 0.5, 0). **Identical to S-10a.**
- Camera unchanged during gizmo drag (all deltas ≤ 1e-6).
- No console errors.
- Input map restored via `resetInputMap()`.

### Conclusion
**HARD GATE PASSED.** Gizmo drag works after the input-map edit; camera does not orbit or move during gizmo drag. S-10a and S-10b are recorded.

## 7. Artifacts

| File | Purpose | Bytes |
| --- | --- | --- |
| `sp-06_probe_p1.json` | P1 input log + camera states + console | — |
| `sp-06_probe_p1.png` | P1 screenshot | — |
| `sp-06_probe_p2.json` | P2 input log + inputMap before/after + API availability | — |
| `sp-06_probe_p2.png` | P2 screenshot | — |
| `sp-06_probe_p3.json` | P3 wheel direction | — |
| `sp-06_probe_p3.png` | P3 screenshot | — |
| `sp-06_probe_p4.json` | P4 inertia settle | — |
| `sp-06_probe_p4.png` | P4 screenshot | — |
| `sp-06_probe_p5.json` | P5 gizmo survival + S-10a/S-10b | — |
| `sp-06_probe_p5.png` | P5 screenshot | — |
| `sp-06_probe_run_summary.json` | Run summary | — |

All artifacts in `projects/simuforge/reports/poc-01/results/sp-06-probe/evidence/`.
Harness SHA-256: `0a05cda7c8407c747466fff21137820e551945de7b5e74c89a3d695807a1d222` (same as SP-05).
Babylon.js: 9.32.1, right-handed: true.
Provenance: `cdp_trusted_input` (trusted CDP input; no synthetic, no programmatic transform).

## 8. Findings summary

| Finding | Classification | Detail |
| --- | --- | --- |
| F1 | TEST METHODOLOGY | P1 zoom target shift was due to zooming at canvas center instead of projected target center. Not a Babylon defect. Corrected by follow-up probe (target delta = 0). |
| F2 | INCONCLUSIVE | P1 modifier tests (ctrl/alt) produced mixed results. Decision 1 remains PROVISIONAL. |
| F3 | API DETAIL | `getEntry` returns `undefined` (not `null`) when no match. Not a defect. |
| F4 | EMPIRICAL | Wheel up (deltaY −120) zooms in; wheel down zooms out. S-06/S-07 signs confirmed correct. |
| F5 | EMPIRICAL | Inertia settle takes 1434 ms. 500 ms settle delay is insufficient. Recommend ≥2000 ms. |
| F6 | PASS | P5 hard gate passed: gizmo drag works after input-map edit; camera unchanged. |
| F7 | EMPIRICAL | `zoomToMouseLocation` is false by default in Babylon 9.32.1. |

## 9. Recommendations

1. Increase settle delay from 500 ms to ≥2000 ms based on P4 (1434 ms measured).
2. Investigate P1 modifier results further before finalizing modifier assignment (decision 1).
3. Update P2 check to accept `undefined` (or `null`) from `getEntry` when no match.
4. Document that `zoomToMouseLocation` is false by default (no zoom-to-cursor).
5. Proceed with S-10a/S-10b as hard-gate evidence (P5 confirms feasibility).
6. Do not approve SP-06 execution until owner decisions 1 and 3 are resolved and SP-05 is formally accepted.

## 10. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; probes are not full execution).
- P1: FAIL (1 non-product check). P2: FAIL (1 non-product check). P3: PASS. P4: PASS. P5: PASS.
- No acceptance criterion changed. No harness/runner/source modified.