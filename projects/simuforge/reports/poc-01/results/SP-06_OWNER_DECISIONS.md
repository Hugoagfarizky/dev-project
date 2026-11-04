# SP-06 Owner Decisions

Date: 2026-11-03
Status: Decisions recorded per Project Owner authorization. SP-06 remains NO-GO.

## 1. Recorded decisions

| No. | Decision | Status | Notes |
| --- | --- | --- | --- |
| 1 | Modifier assignment (Ctrl/Alt) | APPROVED (DEFAULT) | Final config: Ctrl+left = pan, Alt+left = orbit (via wildcard), plain left = orbit, right = pan. Empirical basis: P1 confirmed modifier delivery (ctrlKey/altKey correctly set), Ctrl+left pans, Alt+left orbits, plain left orbits, right pans. No browser/OS interference on Windows/Chrome. |
| 2 | Plain-left-drag rotate | APPROVED (TETAP ORBIT) | Supersedes earlier decision to remove plain-left-drag rotate. Final config retains plain-left-drag = orbit. A-06 remains testable as capability (can the entry be removed cleanly), but approved final configuration does not remove it. |
| 3 | Settle delay | APPROVED (2.000 ms) | Basis: P4 measured settle 1182 ms, 1163 ms, 113 ms. 500 ms insufficient. Applies to settle delay only. |
| 3a | Numeric tolerances (angle/radius/position) | PROVISIONAL | 0.05 rad / 0.1 radius / 1e-6 invariants have no empirical basis. |
| 4 | 10 screenshot baseline | APPROVED | Filenames as proposed in the draft. |
| 5 | JSON input log versioned | APPROVED | Schema as proposed, with settleDelayMs addition. |
| 6 | CDP trusted input + visual review; reuse SP-05 runner utilities | APPROVED | P1-P5 all used trusted CDP input successfully. |
| 7 | Dedicated SP-06 harness; reuse relevant runner components | APPROVED | Probe reused SP-05 runner libraries with a separate probe harness (sp06-probe.html). |
| 8 | A-06 limited to camera non-capture for POC | APPROVED | A-06-P5 applies: SP-06 verifies camera does not capture left click; full selection verification deferred to a later spike. This does not claim selection UI works. |
| 9 | S-10a/S-10b as mandatory hard-gate evidence | APPROVED | P5 recorded S-10a == S-10b (camera unchanged) and gizmo drag succeeded. |

### Superseded decisions (retained for traceability)

- Earlier decision 2 (remove plain-left-drag rotate) is superseded by the decision above (TETAP ORBIT). The removal capability is still tested (A-06-P1/P4) but is not part of the approved final configuration.
- Earlier decision 1 (modifier assignment) was PROVISIONAL; now APPROVED as DEFAULT (keep default behavior).
- Earlier decision 3 (settle delay) was PROVISIONAL; now APPROVED at 2.000 ms. Tolerances for angle/radius/position remain PROVISIONAL.

## 2. Scope of approval

- Approval of decisions 2, 4, 5, 6, 7, 8, 9 authorizes the design and future probe-level validation only.
- It does not authorize full SP-06 execution.
- SP-06 remains NO-GO.
- SP-05 remains BLOCKED; A-03/A-04 remain unverified.
- Decision 3a (angle/radius/position tolerances) remains PROVISIONAL pending empirical results.

## 3. A-06 scope clarification (decision 8)

A-06-P5 is approved as a POC scope limitation, not as a claim that selection UI works. SP-06 verifies that the camera does not intercept left click (camera state unchanged). Full selection behavior (hit-testing, selection state, selection UI) is out of SP-06 scope per section 8.1 and is deferred to a later spike. No acceptance criterion is changed; the official wording "left click is free for selection" is interpreted as "camera does not capture left click" for POC purposes.

## 4. Modifier assignment status (decision 1)

P1 modifier tests initially produced mixed results. Follow-up modifier validation (2026-11-03) confirmed:
- CDP modifier delivery works (ctrlKey/altKey correctly set).
- Ctrl+left-drag pans (target changes, no orbit).
- Alt+left-drag orbits (alt is wildcard in plain rotate entry).
- Plain left-drag orbits.
- Right-drag pans.
- No browser/OS interference on Windows/Chrome.

Decision 1 is now APPROVED as DEFAULT: keep default behavior (ctrl+left=pan, alt+left=orbit, plain left=orbit, right=pan).

## 5. Tolerance status (decision 3)

- Settle delay approved at 2.000 ms (basis: P4 measured 1182/1163/113 ms).
- Angle/radius/position tolerances (0.05 rad / 0.1 radius / 1e-6) remain PROVISIONAL.
- All tolerances remain provisional until probe data and owner review.

## 6. Status

- SP-05: BLOCKED (unchanged).
- A-03 / A-04: unverified (unchanged).
- SP-06: NO-GO (unchanged; probes are not full execution).
- No acceptance criterion changed.
- No harness, runner, or application source modified by this decision record.

## 7. Update 2026-11-04 (appended; earlier record retained)

- SP-05 formal acceptance: **ACCEPTED**; A-03/A-04 **PASS (visually verified)**.
- Tolerances: **Option A APPROVED** — invariance 1e-9; orbit/pan 0.05; zoom 0.1; settle 2000 ms. The provisional `1e-6` reference in §5 is superseded.
- SP-06 official execution: **AUTHORIZED** and performed.
- **Decision 10 (new):** after the first official run failed only the written beta-sign check, the Project Owner amended S-03/A-05-P2 to the Babylon 9.32.1 convention — rightward drag increases `alpha`, downward drag **decreases** `beta`; the opposite sign remains FAIL and the quantitative inversion check is retained. No waiver was used.
- Official re-run under the amended criterion: **PASS 159/159** (`sp06-official-2026-11-04T09-26-01-934Z-374471`). The first failed run is preserved.
- SP-07/SP-08 remain unexecuted; POC-01 is not closed.