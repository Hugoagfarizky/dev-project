# SP-06 Readiness Review (Preparation Only)

Date: 2026-11-03
Scope: Read-only preparation review. No SP-06 test was executed. No status changed.

## 1. Specification and purpose

Source: `projects/simuforge/docs/POC_01_IMPLEMENTATION_READINESS.md` §8.2 (SP-06 row) and §6.3 (A-05, A-06).

| Field | Value |
| --- | --- |
| ID | SP-06 |
| Title | Test camera navigation |
| Action | Orbit, pan, and zoom with the proposed input map; remove the default plain-left-drag rotate entry; verify left click does not orbit |
| Expected observation | Orbit, pan, and zoom work without inverted axes; left click is available for selection; alpha, beta, radius, and target change as expected |
| Evidence required | Input log, screenshots |
| Acceptance criteria | A-05, A-06 |
| Browser scope | Chrome only (per procedure policy) |

Acceptance criteria mapped:

| Criterion | Statement | SP-06 responsibility |
| --- | --- | --- |
| A-05 | ArcRotateCamera orbit, pan, and zoom behave correctly in right-handed mode | Verify axes and panning feel; camera fix documented for Babylon 8.10.1+ |
| A-06 | The default plain-left-drag camera rotate can be removed cleanly so left click is free for selection | Verify input-map edit works; removing a default entry is not shown as a documented example |

## 2. Dependencies and prerequisites

Evidence gate (§7.7, item 6): **SP-05 evidence must exist before SP-06.** Specifically drag logs, screenshots, Inspector values, and quaternion values.

Current state:
- SP-05: **BLOCKED**. Automated suite passed 256/256 and an independent audit passed 750/750, plus a supplemental local Z run (45/45). However, visual review of the screenshots is not complete and A-03/A-04 remain unverified.
- SP-06 status: **NO-GO** (unchanged). It has not been executed.

Therefore SP-06 cannot start. Readiness verdict: **BLOCKED** (dependency on SP-05 visual review and formal acceptance).

Other prerequisites for when SP-06 is eventually authorized:
- Babylon.js 9.32.1, right-handed mode (verified in SP-05 environment).
- Chrome only; dedicated profile and anti-throttling flags if automated.
- An ArcRotateCamera with `alpha`, `beta`, `radius`, and `target` logging.
- A harness or script that records camera state before/after each navigation gesture.
- An input-map edit that removes the default plain-left-drag rotate entry while keeping pan (Ctrl + left-drag) and zoom (wheel).

## 3. Environment readiness (read-only inspection)

- Repository: `main` == `origin/main` at `5d63cb2…`, clean working tree (verified).
- Harness directory contains only `sp05.html` (transform gizmo harness) and the SP-05 runner. **No SP-06 harness, runner case, or procedure document exists.**
- `sp05.html` uses a single `ArcRotateCamera("cam", PI/4, PI/3, 8, (0,0.5,0), scene)` with `camera.attachControl(canvas, true)`. No input-map customization is present.
- No SP-06 evidence directory, screenshots, or logs exist.
- No SP-06 acceptance procedure or required-filename list exists (unlike `SP-05_EVIDENCE_PROCEDURE.md`).

Conclusion: the environment is ready for SP-05-class work but has no SP-06 tooling. SP-06 would require new harness work before execution.

## 4. Proposed test sequence (preparation only — not executed)

1. Establish a camera-navigation harness (or extend `sp05.html`) that exposes `alpha`, `beta`, `radius`, `target` and records them, with an input log.
2. Baseline: record initial camera state (alpha, beta, radius, target) and screenshot.
3. Orbit test: drag to orbit; verify alpha/beta change, radius/target unchanged, no axis inversion.
4. Pan test: Ctrl + left-drag (or configured pan gesture); verify target changes, radius unchanged.
5. Zoom test: wheel; verify radius changes, target unchanged.
6. Input-map edit: remove the default plain-left-drag rotate entry; verify left click no longer orbits.
7. Selection conflict test: left click on empty space / cube after the edit; verify no orbit and selection path is free.
8. Edge cases: orbit near poles (beta near 0 or PI), zoom to min/max radius, pan off-screen.
9. Record input log + screenshots; capture console errors.
10. Compare against expected behavior and acceptance criteria A-05, A-06.

## 5. Evidence to be collected (when authorized)

- Input log with timestamps, gesture type, and before/after `alpha`, `beta`, `radius`, `target`.
- Screenshots: orbit, pan, zoom, post-input-map-edit, selection-conflict.
- Console log (errors/warnings).
- Environment record (Babylon version, browser, OS, right-handed mode).
- Any input-map diff or configuration record.

## 6. Risks

| Risk | Mitigation |
| --- | --- |
| Right-handed axis inversion in orbit/pan | Verify against known camera pose; compare alpha/beta sign conventions |
| Panning feel / inverted pan axes | Test both Ctrl+left and right-drag; document feel |
| Removing default rotate entry breaks gizmo drag | Verify gizmo drag still works after edit; camera attachControl may capture events first |
| Conflict between camera drag and gizmo drag | Test gizmo drag on the cube with camera still attached |
| No automation harness for camera | Build before execution; reuse CDP trusted-input pipeline from SP-05 runner where applicable |
| Babylon 9.32.1 camera behavior differences | Record version; compare with documented 8.10.1+ fix |
| Screenshot visual review still required | Follow SP-05 precedent: numerical logs plus human visual review |
| Scope creep into UI | Keep spike isolated; no panels or selection UI beyond the minimum |

## 7. Documentation gaps and conflicts

1. **No SP-06 procedure document** (analogous to `SP-05_EVIDENCE_PROCEDURE.md`) — required before execution.
2. **No required screenshot filename list** — must be defined.
3. **No acceptance tolerance** for camera angles or pan distances — must be defined or marked qualitative.
4. **No runner case or harness** — SP-06 cannot reuse the SP-05 gizmo runner; camera-specific instrumentation needed.
5. **A-05/A-06 are underspecified** ("axes and panning feel must be verified", "removing a default entry is not shown as an example") — acceptable as qualitative criteria but need explicit pass/fail definitions.
6. **No conflict detected** between SP-06 and SP-05 beyond the evidence gate; the camera input map edit is independent of gizmo configuration.

## 8. Readiness decision

**BLOCKED.**

SP-06 cannot start because:
- SP-05 is BLOCKED (visual review pending; A-03/A-04 unverified).
- Evidence gate §7.7 item 6 is not satisfied.
- No SP-06 harness, procedure, or acceptance tolerance exists.

SP-06 is **NOT READY** for execution even after SP-05 is accepted, until the gaps in §7 are closed (procedure, screenshot list, harness, tolerances).

## 9. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; not started).
- Main application: not modified.
- No SP-06 test executed.