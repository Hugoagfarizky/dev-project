# SP-06 Remaining Decisions

Date: 2026-11-03
Scope: Consolidated list of decisions after P1-P5 probes and owner decisions. SP-06 remains NO-GO.

## 1. Decisions already approved (no change)

| No. | Decision | Status |
| --- | --- | --- |
| 2 | Plain-left-drag rotate (TETAP ORBIT) | APPROVED |
| 4 | 10 screenshot baseline | APPROVED |
| 5 | JSON input log versioned | APPROVED |
| 6 | CDP trusted input + visual review; reuse SP-05 runner utilities | APPROVED |
| 7 | Dedicated SP-06 harness; reuse relevant runner components | APPROVED |
| 8 | A-06 limited to camera non-capture for POC | APPROVED |
| 9 | S-10a/S-10b as mandatory hard-gate evidence | APPROVED (P5 verified) |

## 2. Decisions now APPROVED (updated 2026-11-03)

| No. | Decision | Status | Basis |
| --- | --- | --- | --- |
| 1 | Modifier assignment | APPROVED (DEFAULT) | P1 confirmed modifier delivery (ctrlKey/altKey correctly set). Default: Ctrl+left=pan, Alt+left=orbit, plain left=orbit, right=pan. No browser/OS interference on Windows/Chrome. |
| 2 | Plain-left-drag rotate | APPROVED (TETAP ORBIT) | Supersedes earlier removal decision. Final config retains plain-left-drag=orbit. A-06 remains testable as capability. |
| 3a | Settle delay | APPROVED (2.000 ms) | P4 measured 1182/1163/113 ms. 500 ms insufficient. |
| 3b | Angle/radius/position tolerances | PROVISIONAL | 0.05 rad / 0.1 radius / 1e-6 invariants have no empirical basis. |

## 3. Empirical findings requiring decision

| Finding | Detail | Impact on decisions |
| --- | --- | --- |
| F1 | P1 zoom target shift was test methodology (zoom at canvas center, not projected target). Corrected: target delta = 0 at projected center. | No decision change. |
| F2 | P1 modifier tests inconclusive initially; follow-up confirmed modifier delivery works. | Decision 1 now APPROVED (DEFAULT). |
| F3 | getEntry returns undefined (not null) when no match. | Check expectation corrected; no decision change. |
| F4 | Wheel up (deltaY -120) zooms in; wheel down zooms out. | Confirms S-06/S-07 signs. No decision change. |
| F5 | Inertia settle 1434 ms. | Decision 3a: settle delay updated to 2000 ms. |
| F6 | P5 hard gate passed. | Validates decision 9. |
| F7 | zoomToMouseLocation false by default in Babylon 9.32.1. | No decision change. |

## 4. Conditions to change SP-06 from NO-GO to READY

1. SP-05 formal acceptance (visual review complete; A-03/A-04 verified).
2. Resolution of decision 1 (modifier assignment) — now APPROVED (DEFAULT).
3. Resolution of decision 3 (numeric tolerances) — settle delay APPROVED at 2.000 ms; angle/radius/position tolerances remain PROVISIONAL.
4. Design and review of SP-06 harness (decision 7 approved but not implemented).
5. Empirical validation of CDP camera input (M6), input-map removal (M7/M8), browser/OS shortcuts (M1) — partially done.
6. A-06 scope approval (decision 8 approved as POC limitation).

## 5. Risks still open

| Risk | Status |
| --- | --- |
| Gizmo drag regression after input-map edit (H1) | Resolved — P5 hard gate passed |
| No SP-06 harness (H2) | Open — design only |
| A-06 selection scope (H3) | Mitigated — approved as POC limitation |
| CDP camera input (M6) | Partially verified — modifier tests now confirmed |
| Input-map removal API (M7/M8) | Verified (P2) |
| Browser/OS shortcut conflicts (M1) | Mitigated — no interference on Windows/Chrome |
| Inertia settle timing (M2/L5) | Partially resolved — 1434 ms measured, 2000 ms recommended |
| Arbitrary tolerances (M4) | Open — owner approval needed (angle/radius/position) |
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
| Probe design (N7) | Resolved (P1-P5 executed) |

## 6. Status

- SP-05: BLOCKED (unchanged).
- A-03 / A-04: unverified (unchanged).
- SP-06: NO-GO (unchanged).
- Decisions 1, 2, 3a, 4, 5, 6, 7, 8, 9 are APPROVED.
- Decision 3b (angle/radius/position tolerances) remains PROVISIONAL.
- No acceptance criterion changed.
- No harness/runner/source modified (probe harness is separate).