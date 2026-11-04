# SP-06 Execution Authorization Request

Revision: 2
Date: 2026-11-04
Repository: `D:\Github\dev-project`
Branch: `main`
HEAD at time of writing: `12a2d00ba9d8c43475689d8e36881706aeee48d7` (subsequent documentation commit will advance this)

## 1. Purpose

Request Project Owner authorization to execute the official SP-06 camera-navigation suite. No official execution has been performed at the time of writing. **SP-06 remains NO-GO until the decisions in §6 are recorded.**

> **Update 2026-11-04:** all three decisions in §6 were recorded by the Project Owner (SP-05 ACCEPTED, Option A, SP-06 AUTHORIZED). Official execution has since been performed; see `SP-06_OFFICIAL_EXECUTION_REPORT.md`.

## 2. SP-05 gate status (changed since Revision 1)

| Item | Status |
| --- | --- |
| SP-05 automated suite | PASS (256/256) |
| Independent audit | PASS (750/750) |
| Supplemental local Z | PASS (45/45) |
| Non-visual audit | PASS (793/793) |
| Visual review — 9 official + 1 supplemental screenshots | **PASS (10/10)** |
| A-03 world translate/rotate | **PASS (visually verified)** |
| A-04 local scale on rotated entity | **PASS (visually verified)** |
| SP-05 formal status | **AWAITING PROJECT OWNER ACCEPTANCE** |

The visual review was performed on 2026-11-04 by an image-capable model (DeepSeek V4.1 Flash Free). See `sp-05-manual/visual-review/SP-05_VISUAL_INSPECTION_REPORT.md` and `SP-05_VISUAL_INSPECTION_RESULTS.json`. The review itself does not sign the acceptance record; the Project Owner does.

## 3. SP-06 harness and runner status

| Item | Status |
| --- | --- |
| Dedicated harness (`sp06.html`) | Created; syntax valid; Babylon 9.32.1; right-handed |
| Smoke test | PASS (11/11) |
| Scenario validation (S-01..S-10, non-official) | PASS (10/10, HARNESS_VALIDATION) |
| Deep harness audit | 0 BLOCKER, 0 HIGH; 2 MEDIUM, 1 LOW |
| Gizmo policy | translate/rotate world; scale local — verified |
| S-10a/S-10b hard gate | PASS (camera unchanged during gizmo drag) |
| Modifier behaviour | Approved DEFAULT; delivered and verified |
| Settle delay | 2000 ms APPROVED (measured 113–1434 ms) |
| Input provenance | `cdp_trusted_input` only; no synthetic input or programmatic transform |
| Chrome cleanup | Verified, no leftover process |
| **Official scenario runner (S-01..S-12, 10 screenshots, versioned input log)** | **NOT YET IMPLEMENTED (audit item D12; deliberately deferred until authorization)** |

## 4. Owner decisions already recorded

| # | Decision | Status |
| --- | --- | --- |
| 1 | Modifier assignment (Ctrl = pan, Alt = orbit, right = pan) | APPROVED (DEFAULT) |
| 2 | Plain left-drag = orbit | APPROVED (TETAP ORBIT) |
| 3a | Settle delay 2000 ms | APPROVED |
| 4 | 10-screenshot baseline | APPROVED |
| 5 | Versioned JSON input log | APPROVED |
| 6 | CDP trusted input + visual review | APPROVED |
| 7 | Dedicated SP-06 harness | APPROVED |
| 8 | A-06 scope: camera non-capture only | APPROVED |
| 9 | S-10a/S-10b hard gate | APPROVED |

## 5. Remaining decisions

### 5.1 Numeric tolerances (decision 3b)

Full analysis: `SP-06_TOLERANCE_BASIS_AND_DECISION.md`.

| Item | Current | Recommended | Evidence |
| --- | --- | --- | --- |
| Invariance (alpha/beta/radius/target) | 1e-6 | **1e-9** (or retain 1e-6) | noise floor ≤ 4.44e-16; real residual ≥ 8.3e-5 |
| Orbit/pan magnitude minimum | 0.05 | **retain 0.05** | one gesture = 0.7275 rad / 0.5575 units (11–15× margin) |
| Zoom magnitude minimum | 0.1 | **retain 0.1** | one wheel step = 7.721 units (77× margin) |

These are magnitude floors and one invariance bound, **not** camera-accuracy claims. All remain PROVISIONAL until this decision is recorded.

### 5.2 SP-05 formal acceptance

Sign the acceptance record after reviewing the visual inspection report, or explicitly record a waiver. Visual verification is complete; it is not the same as owner acceptance.

### 5.3 Execution authorization

Explicit authorization to run the official suite on this harness.

## 6. Owner decision block

Please mark one option per line.

```
SP-05 formal acceptance
  [x] ACCEPTED  (visual verification complete; A-03/A-04 PASS)
  [ ] DEFERRED
  [ ] WAIVED    (explicit waiver of visual sign-off; specify reason)

Numeric tolerances (decision 3b)
  [x] Option A  invariance 1e-9, orbit/pan 0.05, zoom 0.1   (recommended)
  [ ] Option B  invariance 1e-6, orbit/pan 0.05, zoom 0.1   (minimal change)
  [ ] Option C  custom: invariance ____, orbit/pan ____, zoom ____

SP-06 official execution
  [x] AUTHORIZED
  [ ] DEFERRED
  [ ] REJECTED

Owner: Project Owner (decision conveyed in-session)   Date: 2026-11-04
```

## 7. What happens after authorization

1. Implement the official S-01..S-12 runner (audit item D12) with the approved tolerances centralized in one config object.
2. Re-run the existing smoke and scenario validation against the new runner as a regression check (non-official).
3. Execute the official suite once, with trusted CDP input and the approved 2000 ms settle.
4. Capture the 10 approved screenshots, the versioned JSON input log, console/environment records, and sidecar hashes.
5. Evaluate A-05/A-06 and POC-01 exit criteria from the recorded results.
6. Report PASS/FAIL per scenario; do not adjust criteria after the fact.

## 8. What SP-06 will not do

- Will not change acceptance criteria A-05/A-06.
- Will not modify SP-05 evidence, harness, or runner.
- Will not implement the main Simulation Studio UI.
- Will not change SP-05's status.

## 9. Risk summary

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Tolerances cause false PASS/FAIL | Low | Medium | Empirical basis in §5.1; 2000 ms settle mandatory |
| Inertia residual mistaken for real motion | Low | Medium | Settle before every recorded state |
| Gizmo drag disturbs camera | Low | High | S-10 hard gate already PASS |
| Official runner bug | Medium | Medium | Implement then regression-check before the official run |
| Browser/OS shortcut conflicts | Low | Medium | Verified on Windows/Chrome; not generalized |

## 10. Status

- SP-05: **ACCEPTED by the Project Owner on 2026-11-04** (visual verification complete; 10/10 PASS).
- A-03: **PASS (visually verified)**.
- A-04: **PASS (visually verified)**.
- Tolerances: **Option A APPROVED** on 2026-11-04 (1e-9 invariance; 0.05 orbit/pan; 0.1 zoom; 2000 ms settle).
- SP-06: **EXECUTION AUTHORIZED on 2026-11-04.** Execution result is recorded in `SP-06_OFFICIAL_EXECUTION_REPORT.md`.
- Main application: not modified.
