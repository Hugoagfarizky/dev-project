# SP-06 Post-Probe Technical Review

Date: 2026-11-03
Scope: Read-only technical review of SP-06 procedure draft and probe results. No SP-06 test executed. No acceptance criteria changed.

## 1. Probe results summary

| Probe | Status | Checks | Key finding |
| --- | --- | --- | --- |
| P1 CDP Camera Input | FAIL (9/10) | 9/10 | Orbit/pan/zoom work via trusted CDP. Zoom target shift was test methodology (zoom at canvas center, not projected target). Corrected: target delta = 0 at projected center. Modifier tests inconclusive. |
| P2 Input-map Removal/Restoration | FAIL (11/12) | 11/12 | Removal, non-orbit, reset, restore all work. `getEntry` returns `undefined` (not `null`) when no match — API detail. |
| P3 Wheel Direction | PASS (2/2) | 2/2 | Wheel up (deltaY −120) → radius decreases (zoom in). Wheel down → radius increases (zoom out). |
| P4 Inertia Settle | PASS (3/3) | 3/3 | Settled in 1434 ms. 500 ms insufficient; recommend ≥2000 ms. |
| P5 Gizmo Survival | PASS (33/33) | 33/33 | Hard gate passed: gizmo drag works after input-map edit; camera unchanged (S-10a == S-10b); no console errors. |

## 2. Updated understanding of each finding

### H1 — Gizmo survival: RESOLVED (empirically verified)
P5 passed 33/33. Input-map edit applied; gizmo drag produced non-uniform scale (1 → 1.2034); camera state identical before and after (S-10a == S-10b). S-10a/S-10b hard gate is feasible and recorded. No regression.

### H2 — Harness: MITIGATED (design only)
Harness architecture proposed in §11 of the draft. No harness created. Still requires implementation and review.

### H3 — A-06 scope: MITIGATED (decision recorded)
A-06-P5 approved as POC scope limitation. Full selection verification deferred. No acceptance criterion changed.

### M1 — Browser/OS shortcut conflicts: PARTIALLY MITIGATED
P1 modifier tests produced inconclusive results. Ctrl+left-drag changed radius+target (unexpected); Alt+left-drag changed target slightly. Cannot confirm whether modifiers are applied correctly. Requires further investigation (see remaining decisions).

### M2 — Inertia settle: RESOLVED (empirically)
P4 measured 1434 ms settle. 500 ms insufficient. Recommend ≥2000 ms. Settle delay updated in draft.

### M3 — Inversion detection: RESOLVED (documentation)
Quantitative sign checks added to A-05-P2 and S-02/S-03.

### M4 — Tolerances: MITIGATED (still provisional)
All tolerances labeled PROVISIONAL. No empirical basis established. P4 provides first data point (settle timing).

### M5 — Qualitative criteria: PARTIALLY MITIGATED
"Feel" scoped to visual review. Numeric thresholds remain provisional.

### M6 — CDP camera input: MITIGATED (partially verified)
P1 confirmed orbit/pan/zoom work via trusted CDP. Modifier application inconclusive. Probe P1 extension needed.

### M7 — Input-map removal API: VERIFIED
P2 confirmed removal (splice), getEntry (returns undefined when no match), resetInputMap restore, and all mutation APIs available. Only check expectation (null vs undefined) needs correction.

### M8 — getEntry/resetInputMap after splice: VERIFIED
P2 confirmed getEntry returns entry after reset; plain drag orbits again. All APIs available.

### L1 — detachControl cleanup: RESOLVED (documentation)
Added to §9.

### L2 — Wording: RESOLVED
Corrected to "verification of the edit".

### L3 — Legacy flag ordering: MITIGATED (documentation)
Documented; empirical verification pending.

### L4 — Wheel direction: RESOLVED (empirically)
P3 confirmed wheel up → zoom in, wheel down → zoom out. S-06/S-07 signs correct.

### L5 — Inertia settle magnitude: MITIGATED (empirically)
P4 measured 1434 ms. Recommend ≥2000 ms.

## 3. New findings from probes

| Finding | Detail |
| --- | --- |
| F1 (methodology) | P1 zoom target shift due to zooming at canvas center instead of projected target center. Corrected. |
| F2 (inconclusive) | P1 modifier tests produced mixed results. Decision 1 remains PROVISIONAL. |
| F3 (API detail) | `getEntry` returns `undefined` (not `null`) when no match. |
| F4 (empirical) | Wheel up (deltaY −120) zooms in; wheel down zooms out. |
| F5 (empirical) | Inertia settle 1434 ms. 500 ms insufficient. |
| F6 (PASS) | P5 hard gate passed: gizmo drag works after edit; camera unchanged. |
| F7 (empirical) | `zoomToMouseLocation` is false by default in Babylon 9.32.1. |

## 4. Updated assessment

- **P5 (H1) is the most important result**: gizmo-camera isolation is confirmed. The hard gate is feasible and passed.
- **P3 (L4) resolves wheel direction**: S-06/S-07 signs are correct; no fallback needed.
- **P4 (M2/M5/L5) provides first empirical timing data**: settle delay must be ≥2000 ms, not 500 ms.
- **P2 (M7/M8) confirms input-map API**: removal, getEntry, resetInputMap all work. Only check expectation (null vs undefined) needs correction.
- **P1 (M1/M6) is partially inconclusive**: orbit/pan/zoom work, but modifier application needs further investigation.

## 5. Recommendations

1. **Modifier assignment (decision 1)** remains PROVISIONAL. Further probe needed to isolate modifier application (log `event.ctrlKey`/`event.altKey` inside Babylon handlers, or test with minimal scene).
2. **Settle delay** should be updated from 500 ms to ≥2000 ms (P4: 1434 ms measured).
3. **P2 check expectation** should accept `undefined` or `null` from `getEntry` when no match.
4. **P1 zoom target shift** was test methodology, not Babylon defect. Zoom at projected target center.
5. **P5 confirms S-10a/S-10b feasibility** as hard-gate evidence.
6. Do not approve SP-06 execution until owner decisions 1 and 3 are resolved and SP-05 is formally accepted.

## 6. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; probes are not full execution).
- No acceptance criterion changed.
- No harness/runner/source modified (probe harness is a separate file).