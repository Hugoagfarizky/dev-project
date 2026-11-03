# SP-06 Final Draft Report

Date: 2026-11-03
Scope: Documentation-only finalization of `SP-06_TEST_PROCEDURE_DRAFT.md` (Revision 2) addressing all N1–N7 findings. No harness, runner, source, or acceptance criteria changed. No SP-06 test executed.

## 1. Summary of N1–N7 revisions

| Finding | Resolution |
| --- | --- |
| N1 | Added S-10a (camera state before gizmo drag) and S-10b (camera state after gizmo drag) to prove isolation. |
| N2 | A-06-P5 now explicitly states it is a proposed scoping requiring Project Owner approval. |
| N3 | Added ownership matrix (Project Owner / OpenCode / Technical Reviewer / Human reviewer). |
| N4 | S-08/S-09 clarified: S-08 tests drag, S-09 tests click; distinct input paths. |
| N5 | All tolerances labeled PROVISIONAL with explicit note in §6. |
| N6 | Added wheel-direction fallback procedure in S-06/S-07. |
| N7 | Added §12b empirical probe design (P1–P5) with prerequisites and pass criteria. |

## 2. Status of all prior findings

All 16 findings from the first technical review (H1–H3, M1–M8, L1–L5) plus 7 new findings (N1–N7) are addressed. No finding remains without follow-up. See `SP-06_REVISION_2_REPORT.md` and `SP-06_REVISION_2_TECHNICAL_REVIEW.md` for the full matrices.

## 3. Nine decisions requiring Project Owner approval

1. **Modifier assignment** (ctrl+left = orbit, alt+left = pan, or alternatives). Recommendation: retain ctrl+left = orbit, alt+left = pan, right-drag = pan, wheel = zoom, to match the Babylon example and minimize surprise. Final decision: Project Owner.
2. **Removal vs. rebind** of plain-left-drag rotate. Recommendation: remove entirely (cleaner selection path), with `resetInputMap()` restore test (S-12) as safety net. Final decision: Project Owner.
3. **Numeric tolerances** (0.05 rad, 0.1 radius, 1e-6 invariants, 500 ms settle). Recommendation: treat as provisional internal thresholds; justify from Babylon floating-point precision and camera speed properties during probe phase. Final decision: Project Owner.
4. **Screenshot filenames and count** (10 proposed). Recommendation: accept as proposed; adjust during review if needed. Final decision: Project Owner.
5. **Input log JSON schema** (proposed in §8). Recommendation: accept as proposed with `settleDelayMs` addition. Final decision: Project Owner.
6. **Automation (CDP) vs. manual** and reuse of SP-05 runner. Recommendation: automate via CDP (consistent with SP-05, trusted input), reusing browser/CDP/console/screenshot/evidence infrastructure. Final decision: Project Owner.
7. **Dedicated SP-06 harness vs. extension of `sp05.html`**. Recommendation: dedicated harness (cleaner separation; SP-05 harness is transform-focused). Final decision: Project Owner.
8. **A-06 scope**: camera non-capture only vs. full selection verification. Recommendation: accept non-capture only for SP-06, with explicit deferral of selection UI to a later spike (A-06-P5). Final decision: Project Owner.
9. **S-10a/S-10b** (camera state before/after gizmo drag). Recommendation: include as part of the S-10 hard gate to fully prove isolation. Final decision: Project Owner.

## 4. Technical recommendation for each decision

Each recommendation above is a technical suggestion, not a final decision. The Project Owner must approve or reject each. No decision has been made on behalf of the owner.

## 5. Empirical probes not yet run (design only)

| Probe | Purpose | Status |
| --- | --- | --- |
| P1 | CDP camera input drives ArcRotateCamera | Not run (design only) |
| P2 | Input-map removal and restoration | Not run (design only) |
| P3 | Wheel zoom direction | Not run (design only) |
| P4 | Inertia settle timing | Not run (design only) |
| P5 | Gizmo drag survival after edit | Not run (design only) |

Probe scripts have not been created. They require owner approval of scope before implementation.

## 6. Verified facts vs. assumptions (unchanged summary)

- Verified: all Babylon.js API references (movement.input, setInteraction, addEntry, getEntry, getEntries, setInteractions, resetInputMap, direct array manipulation, speed/inertia, legacy flags, attachControl, detachControl) from documentation (2026-11-03).
- Assumed (unverified): CDP camera input, input-map removal behavior, gizmo drag survival, browser/OS shortcut conflicts, wheel direction, inertia timing, pole behavior, resetInputMap after manual splice.

## 7. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; this is specification finalization only).
- No harness, runner, or application code created or modified.
- No SP-06 test executed.
- All decisions remain **PROPOSED** pending owner approval.