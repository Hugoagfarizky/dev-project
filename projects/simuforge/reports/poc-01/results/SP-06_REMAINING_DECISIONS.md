# SP-06 Remaining Decisions

Date: 2026-11-03
Scope: Consolidated list of decisions still pending after P1–P5 probes. SP-06 remains NO-GO.

## 1. Decisions already approved (no change)

| No. | Decision | Status |
| --- | --- | --- |
| 2 | Remove plain-left-drag rotate default | APPROVED (P2 verified) |
| 4 | 10 screenshot baseline | APPROVED |
| 5 | JSON input log versioned | APPROVED |
| 6 | CDP trusted input + visual review; reuse SP-05 runner utilities | APPROVED |
| 7 | Dedicated SP-06 harness; reuse relevant runner components | APPROVED |
| 8 | A-06 limited to camera non-capture for POC | APPROVED |
| 9 | S-10a/S-10b as mandatory hard-gate evidence | APPROVED (P5 verified) |

## 2. Decisions still PROVISIONAL

| No. | Decision | Status | Basis |
| --- | --- | --- | --- |
| 1 | Modifier assignment (Ctrl/Alt) | **PROVISIONAL** | P1 modifier tests inconclusive. Ctrl+left-drag changed radius+target (unexpected); Alt+left-drag changed target slightly. Further investigation required before finalizing. |
| 3 | Numeric tolerances | **PROVISIONAL** | P4 measured settle 1434 ms (500 ms insufficient; recommend ≥2000 ms). 0.05 rad / 0.1 radius / 1e-6 invariants have no empirical basis. |

## 3. Empirical findings requiring decision

| Finding | Detail | Impact on decisions |
| --- | --- | --- |
| F1 | P1 zoom target shift was test methodology (zoom at canvas center, not projected target). Corrected: target delta = 0 at projected center. | No decision change. |
| F2 | P1 modifier tests inconclusive. | Decision 1 remains PROVISIONAL. |
| F3 | `getEntry` returns `undefined` (not `null`) when no match. | Check expectation to be corrected; no decision change. |
| F4 | Wheel up (deltaY −120) → zoom in; wheel down → zoom out. | Confirms S-06/S-07 signs. No decision change. |
| F5 | Inertia settle 1434 ms. | Decision 3: update settle delay to ≥2000 ms. |
| F6 | P5 hard gate passed. | Validates decision 9. |
| F7 | `zoomToMouseLocation` false by default in Babylon 9.32.1. | No decision change. |

## 4. Conditions to change SP-06 from NO-GO to READY

1. SP-05 formal acceptance (visual review complete; A-03/A-04 verified).
2. Resolution of decision 1 (modifier assignment) via further probe or owner decision.
3. Resolution of decision 3 (numeric tolerances) based on probe data.
4. Design and review of SP-06 harness (decision 7 approved but not implemented).
5. Empirical validation of CDP camera input (M6), input-map removal (M7/M8), browser/OS shortcuts (M1).
6. A-06 scope approval (decision 8 approved as POC limitation).

## 5. Risks still open

| Risk | Status |
| --- | --- |
| Gizmo drag regression after input-map edit (H1) | **Resolved** — P5 hard gate passed |
| No SP-06 harness (H2) | Open — design only |
| A-06 selection scope (H3) | Mitigated — approved as POC limitation |
| CDP camera input (M6) | Partially verified — modifier tests inconclusive |
| Input-map removal API (M7/M8) | Verified (P2) |
| Browser/OS shortcut conflicts (M1) | Open — empirical verification needed |
| Inertia settle timing (M2/L5) | Partially resolved — 1434 ms measured, 500 ms insufficient |
| Arbitrary tolerances (M4) | Open — owner approval needed |
| Qualitative criteria (M5) | Partially mitigated |
| Axis inversion detection (M3) | Resolved (quantitative sign check added) |
| Wheel zoom direction (L4) | Resolved (P3 confirmed) |
| Legacy flag ordering (L3) | Mitigated (documented; empirical verification pending) |
| detachControl cleanup (L1) | Resolved (documentation) |
| Wording (L2) | Resolved |
| S-10a/S-10b (N1) | Resolved (P5 recorded both) |
| A-06-P5 scope (N2) | Resolved (approved as POC limitation) |
| Ownership (N3) | Resolved (matrix added) |
| S-08/S-09 redundancy (N4) | Resolved (clarified) |
| Provisional tolerances (N5) | Resolved (labeled) |
| Wheel fallback (N6) | Resolved (procedure added) |
| Probe design (N7) | Resolved (P1–P5 executed) |

## 6. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged).
- Decisions 1 and 3 remain PROVISIONAL.
- Decisions 2, 4, 5, 6, 7, 8, 9 are APPROVED.
- No acceptance criterion changed.
- No harness/runner/source modified (probe harness is separate).