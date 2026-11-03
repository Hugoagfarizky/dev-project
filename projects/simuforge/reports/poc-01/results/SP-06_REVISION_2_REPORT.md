# SP-06 Revision 2 Report

Date: 2026-11-03
Scope: Documentation-only revision of `SP-06_TEST_PROCEDURE_DRAFT.md` based on `SP-06_TECHNICAL_REVIEW.md`. No harness, runner, source, or acceptance criteria changed. No SP-06 test executed.

## 1. Findings resolution matrix

| ID | Classification | Finding | Resolution in Revision 2 |
| --- | --- | --- | --- |
| H1 | HIGH | Gizmo drag may regress after input-map edit | S-10 promoted to **HARD GATE** with pre/during/post camera state and measurable PASS/FAIL (transform changes; camera unchanged; no console errors). Added S-10 as a hard-fail condition. |
| H2 | HIGH | No SP-06 harness exists | Added §11 "Harness architecture (PROPOSED)" separating camera state diagnostics, camera input controller, test scenarios, and gizmo regression check; identifies reusable SP-05 runner parts and new components. No harness created. |
| H3 | HIGH | A-06 "selection available" untestable within scope | Added A-06-P5 clarifying that SP-06 verifies camera non-capture only; full selection verification deferred to a later spike. |
| M1 | MEDIUM | Browser/OS shortcut conflicts | Added PROPOSED note in §3 and risk row in §12; empirical verification required. |
| M2 | MEDIUM | Inertia settle not in PASS criteria | Added settle delay (PROPOSED 500 ms) to every scenario's PASS criteria and to JSON schema (`settleDelayMs`). |
| M3 | MEDIUM | Non-quantitative inversion detection | Added quantitative sign checks: rightward drag increases `alpha`; downward drag increases `beta`. |
| M4 | MEDIUM | Arbitrary tolerances | Labeled all tolerances as proposed internal thresholds (§6, §12 item 3); no documented tolerance exists. |
| M5 | MEDIUM | Qualitative criteria | Decomposed A-05/A-06 into P-items; scoped "feel" to visual review. |
| M6 | MEDIUM | CDP camera input unverified | Marked as PROPOSED assumption; added probe requirement (analogous to local Z probe). |
| M7 | MEDIUM | Input-map removal API unvalidated | Marked PROPOSED; added probe requirement (removal, getEntry null, resetInputMap restore, legacy-flag ordering). |
| M8 | MEDIUM | getEntry/resetInputMap after splice | Added to probe requirements (§2). |
| L1 | LOW | detachControl cleanup unspecified | Added `detachControl()` cleanup to §9. |
| L2 | LOW | "read-only verification" wording | Corrected to "verification of the edit" in §10. |
| L3 | LOW | Legacy flag ordering | Added constraint in §2 (PROPOSED). |
| L4 | LOW | Wheel zoom direction | Added PROPOSED note in S-06/S-07; verification required. |
| L5 | LOW | Inertia settle magnitude | Added settle delay and post-settle recording; magnitude to be determined empirically. |

## 2. Changes made (Revision 2)

- §2: Added PROPOSED notes for input-map removal API (M7, M8) and legacy-flag ordering (L3).
- §3: Added PROPOSED note on browser/OS shortcut conflicts (M1).
- §4: Added A-05-P2 quantitative sign check (M3); added A-06-P5 scope clarification (H3).
- §5: Added settle delay to recorded parameters (M2).
- §6: Added settle delay to all scenarios; added quantitative sign checks to S-02/S-03 (M3); added wheel-direction verification note to S-06/S-07 (L4).
- §8: Added `settleDelayMs` to JSON schema (M2).
- §9: Added `detachControl()` cleanup (L1).
- §10: Corrected "read-only verification" wording (L2); added PROPOSED notes for CDP camera input (M6) and input-map removal probe (M7, M8).
- §11 (new): Harness architecture (PROPOSED) (H2).
- §12: Expanded risks table with mitigation column (M1, M2, M3, M6, L3, L4, L5).
- §13: Unchanged list of PROPOSED decisions; §14 status unchanged.

## 3. Still-PROPOSED decisions

All decisions from Revision 1 §12 remain PROPOSED and unresolved:
1. Input map modifier assignment (ctrl+left = orbit, alt+left = pan, or alternatives).
2. Removal vs. rebind of the plain-left-drag rotate entry.
3. Numeric tolerances (0.05 rad, 0.1 radius, 1e-6 invariants) — proposed internal thresholds; no documented tolerance exists.
4. Required screenshot filenames and count.
5. Input log JSON schema.
6. Automation (CDP) vs. manual; reuse of SP-05 runner infrastructure.
7. Dedicated SP-06 harness vs. extension of `sp05.html`.
8. Selection verification scope (camera non-capture only vs. full selection).

## 4. Acceptance criteria and tolerances (updated)

A-05 (camera navigation in right-handed mode):
- A-05-P1: Orbit changes alpha/beta non-zero; radius and target unchanged within tolerance.
- A-05-P2: Vertical orbit changes beta; horizontal changes alpha; **quantitative sign check** (rightward → alpha increases; downward → beta increases); no axis inversion.
- A-05-P3: Pan changes target; radius unchanged.
- A-05-P4: Zoom changes radius; target unchanged.
- A-05-P5: Orbit, pan, zoom work after input-map edit.
- A-05-P6: No console errors.

A-06 (input-map edit):
- A-06-P1: Plain left-drag does not change alpha/beta (all deltas ≤ 1e-6).
- A-06-P2: Left click on empty space/cube does not orbit.
- A-06-P3 (HARD GATE): Gizmo drag still works after edit.
- A-06-P4: resetInputMap() restores default behavior.
- A-06-P5 (scope clarification): verifies camera non-capture only; full selection deferred.

Tolerances (all PROPOSED internal thresholds):
- Orbit/pan minimum change: 0.05 (rad / world units).
- Invariant maximum drift: 1e-6.
- Zoom minimum change: 0.1 radius.
- Settle delay: 500 ms (PROPOSED; to be determined empirically).

## 5. Harness and automation plan (PROPOSED)

Layered harness (not yet created):
1. Camera state diagnostics (read-only): expose alpha, beta, radius, target; `getCameraState()`.
2. Camera input controller: apply/revert input map; `resetInputMap()` affordance; record map state.
3. Test scenarios S-01..S-12: before/after camera state, gesture, settle delay, console errors.
4. Gizmo regression check (S-10): hard gate.

Reusable from SP-05 runner: browser launch, CDP connect, console capture, screenshot, evidence store, trusted-input pipeline, artifact hashing.

New components: camera state reader, input-map editor, gesture sequencer (orbit/pan/zoom), settle-delay logic, camera-specific assertions.

## 6. Unresolved risks

| Risk | Status |
| --- | --- |
| Gizmo drag regression after input-map edit (H1) | Unresolved; hard gate S-10 required |
| No SP-06 harness exists (H2) | Unresolved; significant new work |
| A-06 selection scope (H3) | Clarified in draft; owner approval needed |
| CDP camera input unverified (M6) | Unresolved; probe required |
| Input-map removal API unvalidated (M7, M8) | Unresolved; probe required |
| Browser/OS shortcut conflicts (M1) | Unresolved; empirical verification required |
| Inertia settle timing (M2, L5) | Unresolved; empirical determination required |
| Arbitrary tolerances (M4) | Unresolved; owner approval needed |
| Qualitative criteria (M5) | Partially resolved; "feel" scoped to visual review |
| Axis inversion detection (M3) | Resolved in draft (quantitative sign check) |
| Wheel zoom direction (L4) | Unresolved; verify against Babylon default |
| Legacy flag ordering (L3) | Documented; verify empirically |
| detachControl cleanup (L1) | Added to §9 |
| Wording (L2) | Fixed |

## 7. Readiness recommendation

The revised draft addresses all 16 findings from the technical review (H1–H3, M1–M8, L1–L5). It remains a **design document** with all decisions **PROPOSED**.

Recommendation: **Approve for further technical review.** Do not approve for execution until:
1. SP-05 is formally accepted (visual review complete).
2. Open PROPOSED decisions are resolved by the Project Owner.
3. An SP-06 harness is designed and reviewed.
4. Probes validate CDP camera input and input-map removal.

SP-06 remains **NO-GO**.

## 8. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; this is specification revision only).
- No harness, runner, or application code created or modified.
- No SP-06 test executed.