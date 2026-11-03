# SP-06 Final Decision Recommendation

Date: 2026-11-03
Scope: Consolidated recommendation based on P1–P5 probes and subsequent validation. No SP-06 execution authorized.

## 1. Decision recommendations

| No. | Decision | Recommendation | Rationale |
| --- | --- | --- | --- |
| 1 | Modifier assignment | **Keep default behavior** (ctrl+left = pan, alt+left = orbit via wildcard, plain left = orbit, right = pan) OR rebind as proposed, pending owner choice. Modifier delivery is confirmed (ctrlKey/altKey correctly set). | P1 modifier tests were inconclusive due to mixed results; default behavior is proven to work. Rebinding adds risk. |
| 2 | Remove plain-left-drag rotate | **APPROVED** (already approved) | P2 confirmed removal works and is reversible. |
| 3 | Numeric tolerances | **Update settle delay to ≥2000 ms**; keep 0.05 rad / 0.1 radius / 1e-6 invariants as provisional. | P4 measured 1434 ms settle. No empirical basis for angle/radius tolerances yet. |
| 4 | 10 screenshot baseline | **APPROVED** (already approved) | No change. |
| 5 | JSON input log versioned | **APPROVED** (already approved) | Schema includes `settleDelayMs`. |
| 6 | CDP trusted input + visual review; reuse SP-05 runner | **APPROVED** (already approved) | P1–P5 all used trusted CDP successfully. |
| 7 | Dedicated SP-06 harness; reuse runner components | **APPROVED** (already approved) | Probe reused SP-05 runner libraries. |
| 8 | A-06 limited to camera non-capture | **APPROVED** (already approved) | P5 confirmed camera non-capture during gizmo drag. |
| 9 | S-10a/S-10b hard gate | **APPROVED** (already approved) | P5 recorded S-10a == S-10b. |

## 2. Final modifier recommendation

**Recommendation: Option A — keep default behavior.**

Rationale:
- Modifier delivery is confirmed (ctrlKey/altKey correctly set via CDP).
- Default behavior (ctrl+left = pan, alt+left = orbit via wildcard) is proven to work.
- Rebinding (Option B) adds complexity and risk (entry ordering, gizmo interaction) with no clear benefit for POC.
- If the owner prefers the proposed map (ctrl+left = orbit, alt+left = pan), additional validation is needed.

Final decision: **Project Owner.**

## 3. Settle delay recommendation

- **Update from 500 ms to ≥2000 ms** (P4 measured 1434 ms max).
- Record settle duration per gesture in the input log.
- Re-evaluate after more data across different gesture magnitudes and directions.

## 4. Conditions to change SP-06 from NO-GO to READY

1. SP-05 formal acceptance (visual review complete; A-03/A-04 verified).
2. Resolution of decision 1 (modifier assignment) — recommend Option A.
3. Resolution of decision 3 (tolerances) — update settle delay to ≥2000 ms; keep angle/radius tolerances provisional.
4. Design and review of SP-06 harness (architecture approved but not implemented).
5. Empirical validation of CDP camera input for modifiers (M6) — partially done; further probe needed.
6. A-06 scope approval (decision 8 approved as POC limitation).

## 5. Remaining risks

| Risk | Status |
| --- | --- |
| Gizmo drag regression (H1) | **Resolved** — P5 hard gate passed |
| No SP-06 harness (H2) | Open — design only |
| A-06 selection scope (H3) | Mitigated — approved as POC limitation |
| CDP camera input (M6) | Partially verified — modifier tests inconclusive |
| Input-map removal (M7/M8) | Verified (P2) |
| Browser/OS shortcuts (M1) | Mitigated — no interference observed on Windows/Chrome |
| Inertia settle (M2/L5) | Partially resolved — 1434 ms measured, ≥2000 ms recommended |
| Arbitrary tolerances (M4) | Open — owner approval needed |
| Qualitative criteria (M5) | Partially mitigated |
| Axis inversion (M3) | Resolved (quantitative sign check) |
| Wheel direction (L4) | Resolved (P3) |
| Legacy flag ordering (L3) | Mitigated (documented) |
| detachControl (L1) | Resolved (documentation) |
| Wording (L2) | Resolved |
| S-10a/S-10b (N1) | Resolved (P5) |
| A-06-P5 scope (N2) | Resolved (approved) |
| Ownership (N3) | Resolved (matrix) |
| S-08/S-09 (N4) | Resolved (clarified) |
| Provisional tolerances (N5) | Resolved (labeled) |
| Wheel fallback (N6) | Resolved (procedure added) |
| Probe design (N7) | Resolved (executed) |

## 6. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged).
- No acceptance criterion changed.
- No harness/runner/source modified.