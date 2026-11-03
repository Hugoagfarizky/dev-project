# SP-06 Technical Review

Date: 2026-11-03
Scope: Read-only technical audit of `SP-06_TEST_PROCEDURE_DRAFT.md`. No SP-06 test executed. No harness, runner, source, acceptance criteria, or status changed.

Reviewed document: `projects/simuforge/reports/poc-01/results/SP-06_TEST_PROCEDURE_DRAFT.md`
Reference: Babylon.js Camera Movement and Input System (verified 2026-11-03), `POC_01_IMPLEMENTATION_READINESS.md` (A-05, A-06, §7.7, §8.1–§8.3), `SP-06_READINESS_REVIEW.md`, `sp05.html`.

## 1. Findings by category

### BLOCKER
None. The draft is documentation; nothing in it blocks review approval. (Execution remains blocked by SP-05 and by the unresolved PROPOSED decisions, which is expected.)

### HIGH

| # | Finding | Classification | Detail |
| --- | --- | --- | --- |
| H1 | Gizmo drag may regress after the input-map edit | HIGH | The draft's S-10 acknowledges this, but it is the single highest-risk integration point. `attachControl(canvas, true)` routes all pointer events through the camera; the gizmo lives in the utility layer with its own pointer observers. Whether the gizmo receives left-drag when the plain rotate entry is removed is unverified. If the camera still captures the drag, transform editing breaks. Must be validated in S-10 before any approval of the edit. |
| H2 | No SP-06 harness or runner exists | HIGH | The draft proposes reusing the SP-05 runner, but the SP-05 runner is gizmo- and transform-focused. Camera state logging, input-map editing, and camera-specific scenarios require new harness code. This is significant new work, not a configuration change. |
| H3 | A-06 "left click available for selection" cannot be fully verified within SP-06 scope | HIGH | §8.1 of the readiness doc places UI panels and selection out of spike scope. The draft correctly limits S-09 to camera non-capture, but acceptance criterion A-06 literally says left click is "available for selection". The draft must state explicitly that full selection verification is deferred to a later spike and that SP-06 verifies only that the camera does not capture left click. Otherwise the criterion is untestable as written. |

### MEDIUM

| # | Finding | Classification | Detail |
| --- | --- | --- | --- |
| M1 | Browser/OS shortcut conflicts for modifier combinations | MEDIUM | Alt+Left in Chrome is back-navigation only for the arrow key, but Alt+click and Alt+drag can interact with OS/window-manager behavior on some platforms. Ctrl+click can trigger "open in new tab" on links (not on a canvas). Right-drag triggers the context menu unless `preventDefault` is handled. Babylon's `attachControl` handles `contextmenu`, but this must be verified on the actual harness. |
| M2 | Inertia settle not reflected in PASS criteria | MEDIUM | `rotationInertia`/`panInertia`/`zoomInertia` default to 0.9 on ArcRotateCamera, so motion continues after the gesture. S-02..S-07 record "after" state but do not specify a settle delay. Final values must be captured after inertia decays, otherwise deltas are nondeterministic. |
| M3 | Axis-inversion detection is not quantitative | MEDIUM | A-05-P2 and S-02/S-03 rely on screenshots and qualitative "no inversion". No numeric check is defined for inversion direction. Recommend defining a sign check (e.g., rightward drag increases alpha; downward drag increases beta) with an explicit expected sign. |
| M4 | Tolerances are arbitrary | MEDIUM | 0.05 rad, 0.1 radius, 1e-6 invariants have no documented basis. They are reasonable sanity thresholds but must be labeled as proposed internal tolerances, not acceptance tolerances, and justified or revised during review. |
| M5 | Qualitative criteria lack explicit pass/fail thresholds | MEDIUM | "axes and panning feel must be verified" (A-05) and "removing a default entry is not shown as an example" (A-06) are not directly testable. The draft's A-05-P1..P6 and A-06-P1..P4 decompose them well, but the mapping from each P-item to PASS/FAIL must be explicit and the "feel" component must be scoped to visual review. |
| M6 | CDP camera interaction is unverified | MEDIUM | The draft assumes CDP `Input.dispatchMouseEvent` drives camera input identically to SP-05 gizmo drags. Plausible (camera handlers read DOM pointer events), but camera input also depends on modifier keys, wheel events, and inertia timing. Must be validated empirically before automation is trusted. |
| M7 | Input-map removal API is unvalidated | MEDIUM | Direct array splice is documented as supported, but matching the exact default entry (`{ source: "pointer", button: 0, interaction: "rotate" }`) and ensuring first-match-wins resolution behaves as expected after removal are unverified. The draft marks this PROPOSED, which is correct. |
| M8 | `getEntry`/`resetInputMap` behavior after manual splice | MEDIUM | If the inputMap is spliced manually, `getEntry` and `resetInputMap` may behave differently than documented. Verify before relying on S-12. |

### LOW

| # | Finding | Classification | Detail |
| --- | --- | --- | --- |
| L1 | `detachControl` / cleanup not specified | LOW | The draft does not specify camera cleanup (detachControl) for reproducibility and test isolation. Add to environment reset. |
| L2 | Misleading "read-only verification" wording | LOW | §10 says input-map edits are "read-only verification of the edit" — the edit is a write. Wording should be corrected to avoid confusion. |
| L3 | Legacy-flag interaction with `resetInputMap` | LOW | If legacy flags were written during a run, `resetInputMap` restores the factory default, but any subsequent legacy-flag write re-syncs the map. Document the ordering constraint. |
| L4 | Wheel zoom direction (up = in vs out) | LOW | The draft assumes wheel up zooms in. Verify against Babylon's default (wheel up typically zooms in). If inverted, S-06/S-07 expected signs flip. |
| L5 | Inertia default on ArcRotateCamera | LOW | `rotationInertia`/`zoomInertia` default 0.9; `panInertia` defaults to `camera.inertia` (also 0.9). Settle delay magnitude must be determined empirically. |

### ACCEPTABLE

| # | Finding | Classification | Detail |
| --- | --- | --- | --- |
| A1 | Babylon API facts | ACCEPTABLE | All API references (movement.input, setInteraction, addEntry, getEntry, getEntries, setInteractions, resetInputMap, direct array manipulation, speed/inertia properties, legacy flags, attachControl) are verified against the Babylon.js documentation (fetched 2026-11-03). |
| A2 | A-05/A-06 testability via camera state | ACCEPTABLE | Orbit→alpha/beta, pan→target, zoom→radius is a sound and sufficient decomposition for A-05. A-06-P1..P4 decompose the input-map edit testably. |
| A3 | Reuse of SP-05 runner infrastructure | ACCEPTABLE | Browser launch, CDP connect, console capture, screenshot, evidence store, trusted-input pipeline are all reusable. Only camera-specific harness code is new. |
| A4 | Scope limitation of S-09 | ACCEPTABLE | The draft correctly limits S-09 to camera non-capture, consistent with §8.1 (selection UI out of scope). The tension with A-06's wording is a documentation issue (H3), not a test-design flaw. |
| A5 | Right-handed mode | ACCEPTABLE | Right-handed system is verified in SP-05 environment; camera behavior in right-handed mode is the subject of A-05 and is testable. |
| A6 | `resetInputMap()` restore test (S-12) | ACCEPTABLE | Directly verifies reversibility of the edit — a strong acceptance check. |
| A7 | Edge-case coverage (S-11) | ACCEPTABLE | Pole behavior, zoom limits, and large pans are appropriate edge cases. |
| A8 | No dependency on external packages | ACCEPTABLE | Node.js built-in + CDP matches the established SP-05 approach and the project constraint. |
| A9 | PROPOSED labeling | ACCEPTABLE | All unapproved decisions are explicitly marked PROPOSED, consistent with the task requirements. |

## 2. Verified facts vs. assumptions

### Verified
- Babylon.js Camera Movement and Input System documentation (fetched 2026-11-03) confirms the default inputMap table, mutation methods, condition matching, speed/inertia properties, framerate independence, legacy-flag bridging, and `resetInputMap`.
- `ArcRotateCamera` exposes `alpha`, `beta`, `radius`, `target`.
- `attachControl(canvas, true)` is used in `sp05.html` and works in the verified SP-05 environment.
- SP-05 runner proves CDP `Input.dispatchMouseEvent` drives Babylon pointer handling with trusted events.
- Input-map removal via direct array splice is documented as supported.

### Assumptions (unverified)
- CDP mouse events drive camera input identically to gizmo input (M6).
- The exact default rotate entry can be matched and removed without side effects (M7).
- Gizmo drag survives the input-map edit (H1).
- Wheel event direction and pan feel match expectations (L4, M1).
- Inertia settle timing is acceptable for deterministic final-state capture (M2, L5).

## 3. Recommendations

1. **Address H1 before approval**: add an explicit pre-flight check in the procedure that verifies gizmo drag works after the input-map edit, and make S-10 a hard gate (FAIL stops the case).
2. **Resolve H3**: amend the draft to state that A-06's "selection availability" is verified by camera non-capture only, with full selection verification deferred to a later spike. Alternatively, obtain owner approval to narrow A-06.
3. **Acknowledge H2**: the SP-06 harness is new work; estimate and scope it separately before approving execution. Do not treat it as a configuration change.
4. **Fix M2**: add a settle delay (e.g., wait for `rotationInertia`/`zoomInertia` decay or a fixed timeout) and record post-settle values in every scenario's PASS criteria.
5. **Fix M3**: add a quantitative sign check for inversion (rightward drag → alpha increases; downward drag → beta increases) instead of relying on screenshots.
6. **Fix M4/M5**: label all tolerances as proposed internal thresholds and justify or revise them during review.
7. **Fix M6/M7/M8**: validate the CDP camera path and the input-map removal API empirically in a small probe (analogous to the local Z probe) before trusting automation.
8. **Fix L2**: correct "read-only verification" wording to "verification of the edit".
9. **Fix L4**: verify wheel direction against Babylon's default before finalizing S-06/S-07 expected signs.
10. **Add** `detachControl` cleanup to the environment reset step.

## 4. Assessment

The draft is **structurally sound and based on verified Babylon.js APIs**. Its scenario decomposition, evidence requirements, and risk register are appropriate for a preparation document. No finding is a blocker to **review approval**; the HIGH findings (H1, H2, H3) are blockers to **execution approval** and must be resolved first.

Recommendation: **Approve the draft for revision** (address H1–H3 and M1–M8), then re-review. Do not approve for execution until SP-05 is formally accepted and the open PROPOSED decisions are resolved.

## 5. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; this review is preparation only).
- No SP-06 test executed. No harness, runner, or application code created or modified.
- Babylon.js API facts verified against documentation (2026-11-03).