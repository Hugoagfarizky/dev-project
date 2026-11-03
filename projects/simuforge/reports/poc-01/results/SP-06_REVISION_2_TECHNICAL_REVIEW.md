# SP-06 Revision 2 — Independent Technical Review

Date: 2026-11-03
Scope: Read-only audit of `SP-06_TEST_PROCEDURE_DRAFT.md` (Revision 2), `SP-06_REVISION_2_REPORT.md`, `SP-06_TECHNICAL_REVIEW.md`, and `SP-06_READINESS_REVIEW.md`. No SP-06 test executed. No document modified except this new report.

## 1. Verdict

**APPROVE FOR FINAL DRAFT** (documentation-level approval).

Conditions:
- All 16 prior findings (H1–H3, M1–M8, L1–L5) have follow-up in Revision 2.
- A-05/A-06 decomposition is testable and consistent with official criteria, with one scope clarification (A-06-P5) that requires owner approval.
- Tolerances are explicitly labeled as proposed internal thresholds; no tolerance is presented as official.
- S-10 is a hard gate with measurable PASS/FAIL.
- Remaining items are empirical validations and owner approvals, not document defects.

**Not approved for execution.** SP-06 remains NO-GO until SP-05 is formally accepted and the open PROPOSED decisions are resolved.

## 2. Old findings matrix (actual status)

| ID | Original classification | Actual status | Category |
| --- | --- | --- | --- |
| H1 | HIGH | Mitigated by documentation (S-10 hard gate, pre/during/post camera state) | Requires empirical validation |
| H2 | HIGH | Mitigated by documentation (§11 harness architecture) | Requires product-owner approval + implementation |
| H3 | HIGH | Mitigated by documentation (A-06-P5 scope clarification) | Requires product-owner approval |
| M1 | MEDIUM | Mitigated by documentation (shortcut conflict notes) | Requires empirical validation |
| M2 | MEDIUM | Resolved by documentation (settle delay in all scenarios + schema) | Magnitude requires empirical validation |
| M3 | MEDIUM | Resolved by documentation (quantitative sign checks) | — |
| M4 | MEDIUM | Mitigated by documentation (tolerances labeled as proposed) | Requires owner approval for final values |
| M5 | MEDIUM | Partially resolved ("feel" scoped to visual review) | Requires human visual review |
| M6 | MEDIUM | Mitigated by documentation (probe required) | Requires empirical validation |
| M7 | MEDIUM | Mitigated by documentation (probe required) | Requires empirical validation |
| M8 | MEDIUM | Mitigated by documentation (probe required) | Requires empirical validation |
| L1 | LOW | Resolved by documentation (detachControl cleanup in §9) | — |
| L2 | LOW | Resolved by documentation (wording corrected in §10) | — |
| L3 | LOW | Mitigated by documentation (ordering constraint in §2) | Requires empirical verification |
| L4 | LOW | Mitigated by documentation (verification note in S-06/S-07) | Requires empirical verification |
| L5 | LOW | Mitigated by documentation (settle magnitude marked empirical) | Requires empirical determination |

Summary: 3 resolved, 10 mitigated (of which 7 require empirical validation), 3 require owner approval. No finding is unresolved at the documentation level.

## 3. New findings

| # | Finding | Classification | Detail |
| --- | --- | --- | --- |
| N1 | S-10 records camera state during gizmo drag but not explicitly before and after | MEDIUM | The task requires camera interaction "before, during, and after" gizmo use. S-10 records during-drag camera state and transform changes, but does not record a pre-gizmo-drag camera baseline and a post-gizmo-drag camera state as separate entries. Add S-10a (camera before gizmo drag) and S-10b (camera after gizmo drag) to prove the gizmo does not disturb the camera outside the drag. |
| N2 | A-06-P5 narrows the official criterion | MEDIUM | Official A-06 says left click is "free for selection", implying selection works. A-06-P5 limits verification to camera non-capture. This is pragmatic and consistent with §8.1 scope, but it creates a potential gap: a reviewer could read A-06 as satisfied when only camera non-capture was verified. Requires explicit owner approval of this scoping, or a later selection spike. |
| N3 | No owner assigned to risks or prerequisites | LOW | The risks table and prerequisite list do not name an owner (Project Owner / Technical Lead). Recommend assigning ownership or noting "TBD" explicitly. |
| N4 | S-09 is partially redundant with S-08 | LOW | S-08 already verifies camera state unchanged on plain left-drag. S-09 adds only "selection path is free (no camera capture)", which is the same measurement. Recommend merging S-08/S-09 or clarifying that S-09 additionally verifies no console errors during a click (not a drag). |
| N5 | Tolerances lack empirical basis | MEDIUM | 0.05 rad, 0.1 radius, 1e-6 invariants are proposed internal thresholds with no documented justification. Either justify from Babylon's floating-point precision and camera speed properties, or obtain owner approval. |
| N6 | Wheel direction fallback unspecified | LOW | L4 notes wheel direction must be verified, but no fallback is defined if Babylon's default is opposite. Recommend defining the expected sign after verification and updating S-06/S-07 accordingly. |
| N7 | Probe scripts do not exist yet | LOW | M6/M7/M8 require empirical probes (analogous to the local Z probe), but no probe script is referenced. Recommend creating a read-only probe before execution approval. |

## 4. Consistency of A-05-P1..P6 / A-06-P1..P5 with official criteria

### A-05 (official: "ArcRotateCamera orbit, pan, and zoom behave correctly in right-handed mode")
- A-05-P1 (orbit changes alpha/beta, radius/target unchanged) — consistent.
- A-05-P2 (vertical→beta, horizontal→alpha, no inversion, quantitative sign) — consistent and strengthened.
- A-05-P3 (pan changes target, radius unchanged) — consistent.
- A-05-P4 (zoom changes radius, target unchanged) — consistent.
- A-05-P5 (all work after input-map edit) — consistent.
- A-05-P6 (no console errors) — consistent.
- Gap: "axes and panning feel" (official wording) is qualitative and scoped to visual review (M5). Acceptable as long as "feel" is not claimed as numerically verified.

### A-06 (official: "default plain-left-drag camera rotate can be removed cleanly so left click is free for selection")
- A-06-P1 (plain left-drag does not change alpha/beta) — consistent.
- A-06-P2 (left click does not orbit) — consistent.
- A-06-P3 (gizmo drag still works — hard gate) — consistent and strengthened.
- A-06-P4 (resetInputMap restores default) — consistent.
- A-06-P5 (scope clarification: camera non-capture only) — **narrows** the official criterion. Requires owner approval (see §5 item 2).

## 5. Decisions requiring Project Owner approval

1. Input map modifier assignment (ctrl+left = orbit, alt+left = pan, or alternatives).
2. Removal vs. rebind of the plain-left-drag rotate entry.
3. Numeric tolerances (0.05 rad, 0.1 radius, 1e-6 invariants, 500 ms settle).
4. Required screenshot filenames and count.
5. Input log JSON schema.
6. Automation (CDP) vs. manual; reuse of SP-05 runner infrastructure.
7. Dedicated SP-06 harness vs. extension of `sp05.html`.
8. A-06 scope: camera non-capture only vs. full selection verification (N2).
9. Whether to implement S-10a/S-10b (camera state before/after gizmo drag) as part of A-06 (N1).

## 6. Empirical validations still required

1. CDP camera input drives ArcRotateCamera identically to mouse (M6).
2. Input-map removal via direct array splice works and is reversible (M7, M8).
3. Gizmo drag survives the input-map edit (H1).
4. Browser/OS shortcut conflicts for Alt+Left, Ctrl+Click, right-drag context menu (M1).
5. Wheel zoom direction (L4).
6. Inertia settle timing (M2, L5).
7. Pole behavior (beta near 0/π) produces no NaN (S-11).
8. `resetInputMap()` restores defaults after manual splice (M8, S-12).

## 7. Recommendations

1. Approve the draft for final revision with the N1–N7 fixes applied.
2. Create a read-only CDP probe (analogous to the local Z probe) to validate M6, M7, M8, and H1 before execution approval.
3. Obtain owner approval for the 8 decisions in §5, especially A-06 scoping (N2) and tolerances (N5).
4. Assign ownership for risks and prerequisites (N3).
5. Merge or clarify S-08/S-09 (N4).
6. Keep all decisions PROPOSED until approved.

## 8. Verdict

**APPROVE FOR FINAL DRAFT** with conditions:
- Apply N1 (S-10a/S-10b), N2 (A-06 scope approval), N3 (ownership), N4 (S-08/S-09 merge), N5 (tolerance justification), N6 (wheel fallback), N7 (probe scripts).
- All 16 prior findings remain accounted for.
- No document defect blocks review approval; remaining items are empirical validations and owner approvals.

SP-06 remains **NO-GO**. SP-05 remains **BLOCKED**. No harness, runner, or application code created or modified. No SP-06 test executed.

## 9. Status Git and commit hash

| Item | Value |
| --- | --- |
| Commit | `0e9f740f263c9544ff4e2039bbb267f470bb0976` (HEAD before this report) |
| New file | `SP-06_REVISION_2_TECHNICAL_REVIEW.md` |
| `git diff --check` | exit 0 |
| `git diff --cached --check` | exit 0 |
| Pushed | (pending — to be pushed after commit) |
| Working tree | clean (after commit/push) |