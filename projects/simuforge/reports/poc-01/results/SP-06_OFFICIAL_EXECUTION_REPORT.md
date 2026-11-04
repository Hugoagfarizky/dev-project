# SP-06 Official Execution Report

Date: 2026-11-04
Scope: Official execution of the SP-06 camera-navigation suite (S-01..S-12), the owner-decided sign amendment, and the official re-run.
Status: **SP-06 PASSED** under the owner-amended A-05-P2 sign convention (re-run `sp06-official-2026-11-04T09-26-01-934Z-374471`, 159/159 checks). The first run (`…96430a`) remains preserved as FAIL against the superseded expectation.
POC-01: **NOT closed** (SP-07/SP-08 not executed; see §13).

## 1. Authority and preconditions

The following Project Owner decisions were conveyed on 2026-11-04 and are treated as authoritative for this cycle:

| Decision | Value | Record |
| --- | --- | --- |
| SP-05 formal acceptance | **ACCEPTED** (visual verification complete; A-03/A-04 PASS) | `SP-05_OWNER_ACCEPTANCE_RECORD.md` §8 |
| Numeric tolerances | **Option A**: invariance/equality `1e-9`; orbit/pan minimum `0.05`; zoom minimum `0.1`; settle `2000 ms` | `SP-06_TOLERANCE_BASIS_AND_DECISION.md` §8 |
| SP-06 official execution | **AUTHORIZED** | `SP-06_AUTHORIZATION_REQUEST.md` §6 |

No acceptance criterion was changed, and no threshold was adjusted after seeing the results.

## 2. What was implemented (D12)

| File | Purpose |
| --- | --- |
| `harness/runner/sp06/config.js` | Central approved tolerances, expected camera, 10 screenshot names, gesture geometry, input-map specification, runner metadata |
| `harness/runner/sp06/official.js` | Official S-01..S-12 runner: trusted CDP input, 2000 ms settle, versioned input log, 10 screenshots, per-scenario checks, acceptance mapping, failure diagnostics, SHA-256 manifest and integrity record |

Design constraints preserved:

- Input is produced only by `Input.dispatchMouseEvent` (CDP `Input` domain). No synthetically constructed pointer events.
- The input-map removal is a temporary capability test performed by `Runtime.evaluate` on `camera.movement.input.inputMap`; `resetInputMap()` restores the default.
- Existing SP-05 evidence, harness, smoke runner, probe evidence, and scenario-validation evidence were not modified.
- No main Simulation Studio UI/source was touched.
- No new dependencies were added.
- Invariance/equality checks use `1e-9`; gesture minima remain separate magnitude floors.

Runner CLI:

```text
node projects/simuforge/reports/poc-01/harness/runner/sp06/official.js \
  [--port 9237] [--out <dir>] [--window-size 1400x1000] \
  [--sign-convention procedure|babylon] [--keep-browser] [--attach]
```

Exit codes: `0` = PASS, `1` = FAIL, `2` = BLOCKED/infrastructure.

## 3. First official run (preserved; superseded by the §11 amendment)

| Item | Value |
| --- | --- |
| Run ID | `sp06-official-2026-11-04T09-07-32-263Z-96430a` |
| Evidence directory | `results/sp-06-official/sp06-official-2026-11-04T09-07-32-263Z-96430a/` |
| Started | 2026-11-04T09:07:32.265Z |
| Completed | 2026-11-04T09:10:01.191Z |
| Sign convention | `procedure` (strict, as written) |
| Harness | `harness/sp06.html`, SHA-256 `0e580f0f798cab3a389654c134d5ab4138abc899cf0a808528b52bddf8f86c7d` |
| Babylon.js | 9.32.1 |
| Right-handed | `true` |
| Browser | Chrome/156.0.8078.80 |
| Node.js | v24.21.0 |
| Canvas | 986.4 × 697.275 CSS px |
| Settle | 2000 ms before every recorded post-gesture state |
| Result | **FAIL** (158/159 checks passed) |
| Integrity | **VERIFIED** (12 files, 0 mismatches, manifest SHA-256 `7d699598f6993ec6d7dce9fa55e494b104efd5a26671953e6a63d07f0e882e2a`) |

### 3.1 Scenario results

| Scenario | Result | Checks | Key observation |
| --- | --- | --- | --- |
| S-01 Baseline | PASS | 8/8 | alpha = π/4, beta = π/3, radius = 8, target = (0, 0.5, 0) |
| S-02 Orbit horizontal | PASS | 7/7 | Δalpha = +1.40184; beta/radius/target exactly unchanged |
| S-03 Orbit vertical | **FAIL** | 6/7 | Δbeta = −1.03720; alpha/radius/target unchanged; written sign expectation not met |
| S-04 Pan horizontal | PASS | 6/6 | Δtarget = (−0.99092, 0, +0.99092); radius/alpha/beta unchanged |
| S-05 Pan vertical | PASS | 6/6 | Δtarget = (−0.49521, +1.21301, −0.49521); radius/alpha/beta unchanged |
| S-06 Zoom in | PASS | 6/6 | Δradius = −10.03204; target/alpha/beta unchanged |
| S-07 Zoom out | PASS | 6/6 | Δradius = +10.02810; target/alpha/beta unchanged |
| S-08 Left drag without orbit (post-edit) | PASS | 10/10 | all deltas exactly 0 after removing the plain-left rotate entry |
| S-09 Left click on cube (post-edit) | PASS | 10/10 | camera unchanged; trusted pointer input observed |
| S-10 Gizmo hard gate | PASS | 52/52 | translate (pre-edit) and rotate/scale (post-edit) drags changed the transform; camera unchanged |
| S-11 Edge cases | PASS | 28/28 | beta clamps at 0.01 and π−0.01; repeated zoom finite; no NaN; large pan finite |
| S-12 Reset input map | PASS | 13/13 | default map restored (8 entries); plain left-drag orbits again (Δalpha = +1.40118) |

### 3.2 Acceptance mapping

| Criterion | Result | Basis |
| --- | --- | --- |
| A-05-P1 Orbit changes alpha/beta; radius and target invariant | **PASS** | S-02/S-03 functional and invariance checks (8/8) |
| A-05-P2 Vertical→beta, horizontal→alpha, no inversion, quantitative sign | **FAIL** | Sign sub-check only: expected downward drag to increase beta; observed −1.03720 (1 failed check of 10) |
| A-05-P3 Pan changes target; radius invariant | **PASS** | S-04/S-05 (8/8) |
| A-05-P4 Zoom changes radius; target invariant | **PASS** | S-06/S-07 (8/8) |
| A-05-P5 Orbit/pan/zoom work under the final map | **PASS** | 7/7 functional checks across S-02..S-07 and S-12 |
| A-05-P6 No console errors | **PASS** | 12/12 scenarios clean; 0 console errors, 0 warnings, 0 exceptions |
| A-06-P1 Plain left-drag does not orbit after removal | **PASS** | S-08 (5/5) |
| A-06-P2 Left click does not orbit | **PASS** | S-09 (6/6) |
| A-06-P3 Gizmo drag hard gate | **PASS** | S-10 (16/16 criterion checks) |
| A-06-P4 resetInputMap restores default | **PASS** | S-12 (6/6) |
| A-06-P5 Camera non-capture only (approved scope) | **PASS** | S-09 (5/5) |

Overall SP-06 is **FAIL** because A-05-P2 has one failed check and scenario S-03 is FAIL.

## 4. The S-03 / A-05-P2 sign conflict

### 4.1 What the written procedure requires

`SP-06_TEST_PROCEDURE_DRAFT.md` §6 S-03 and A-05-P2 require:

> downward drag must increase beta. If the sign is opposite, FAIL (axis inversion).

### 4.2 What was observed

With a pure vertical downward drag on empty canvas:

- Δbeta = **−1.0371975511965976** (decrease).
- Δalpha = 0, Δradius = 0, Δtarget = (0, 0, 0) exactly.
- An upward drag increases beta (probe: +2.08459 from baseline, reaching the upper clamp).

### 4.3 Root cause

This is the Babylon.js 9.32.1 `ArcRotateCamera` pointing convention: downward pointer motion decreases `beta`. It is a **sign-convention difference**, not an axis inversion:

- Horizontal drag changes only `alpha` (rightward increases alpha).
- Vertical drag changes only `beta`.
- There is no cross-axis coupling and no target/radius leakage.

The earlier scenario-validation run passed S-03 only because it deliberately added a small horizontal component and did not apply a sign check. The strict procedure now exposes that the written sign expectation was never empirically validated.

### 4.4 What was not done

- The criterion was not edited.
- The check was not skipped or converted to a PASS.
- The failing run was preserved with its full evidence, including the failure detail.
- The runner records a machine-readable `criteriaConflicts` entry:

```json
{
  "id": "S-03-SIGN",
  "scenario": "S-03",
  "criterion": "A-05-P2",
  "expected": "downward drag increases beta (procedure)",
  "observed": "downward drag decreases beta",
  "observedDelta": -1.0371975511965976
}
```

### 4.5 Owner decision needed

One of the following must be recorded before SP-06 can be re-evaluated:

1. **Amend A-05-P2/S-03** to the Babylon convention: downward drag decreases beta, upward increases beta (keeps the quantitative inversion check, corrects the expected sign).
2. **Declare the opposite sign a product requirement**: the harness/camera configuration must be changed to invert beta input, then S-03 must be re-run.
3. **Waive the sign sub-check** with an explicit rationale (not recommended; it removes the only quantitative inversion guard).

No option is chosen by this report.

## 5. Diagnostic re-run (not official evidence)

To isolate the sign issue, the same runner was executed once with `--sign-convention babylon` into a separate directory. This run is **diagnostic only** and does not replace the official result.

| Item | Value |
| --- | --- |
| Run ID | `sp06-official-2026-11-04T09-10-12-634Z-82d94b` |
| Directory | `results/sp-06-diagnostic/sp06-babylon-sign-2026-11-04/` |
| Sign convention | `babylon` (downward decreases beta) |
| Result | **PASS** (12/12 scenarios; A-05/A-06 all PASS) |
| Console errors | 0 |
| Integrity | VERIFIED (12 files; manifest SHA-256 `bf55bac3f856ced6e7ee63f02382ff9502043f2794e6a4bee0bd7254a2c324b2`) |

Interpretation: with the Babylon sign convention, every other check in S-03 passes and the rest of the suite is unchanged. The sole difference between PASS and FAIL is the written beta sign expectation.

## 6. Evidence inventory (official run)

10/10 approved screenshots captured; SHA-256 matches the manifest exactly.

| Screenshot | Bytes | SHA-256 |
| --- | --- | --- |
| `sp-06_camera_baseline.png` | 88508 | `d62c7ba48440587886a4195456ab323ae3cfa96094121788828f00b4f9db45d4` |
| `sp-06_orbit_horizontal.png` | 89014 | `1bc8ef69f8ccc975f822aed2876f184ed2548340e986f0a389c1cecad6d6c4a0` |
| `sp-06_orbit_vertical.png` | 87683 | `c7dba69463243d03664e6e0290860bb8fe25fc8bea8bbf95a03b4de33ce10527` |
| `sp-06_pan_horizontal.png` | 92100 | `378c61ba6800c0c99a6a493f8401e0486ac81c809fab714efbbd52934eb90196` |
| `sp-06_pan_vertical.png` | 91397 | `edcd8278f811cc52168311ac76ba8eac667d964bb36e75585b30ae8883a1f6d7` |
| `sp-06_zoom_in.png` | 98143 | `8545c4cc0a8f67265397e34ab83d1354cd40e1817d6d23905941d533b44ad55e` |
| `sp-06_zoom_out.png` | 89946 | `e0b3da27f20263357eb6227de4522fe7c5c9cd1f4d8f3f39730da4e54aea7c9b` |
| `sp-06_left_click_no_orbit.png` | 88917 | `893f767ca7489c6eb875ec66c3826fe46978dfdf81b5686bf1fc32fa6c28ecee` |
| `sp-06_gizmo_interaction.png` | 82816 | `c70f5e4a394cca0d3cf0c92b0c5c1e92e1f4983e4c99215191909aab1092e3c6` |
| `sp-06_edge_cases.png` | 93213 | `375a3ea4f3c651848576407b744bab7f3a0e70d2f64f0243c2e988f49cf3609e` |

Additional artifacts in the same directory:

- `sp-06_input_log.json` — 12 entries (S-01..S-12), initial and final camera/map state, full CDP event records.
- `sp-06_official_results.json` — machine-readable per-scenario and acceptance results.
- `sp-06_evidence_manifest.json` — SHA-256 for every regular file in the run.
- `sp-06_integrity.json` — post-write verification.

Input-map lifecycle in the log: initial 8 entries (default) → edited for S-08/S-09/S-10 → **final 8 entries, state `reset`**.

## 7. Observations carried forward

1. **Negative radius on zoom-in.** One standard wheel notch (`deltaY = −120`) decreases radius by ≈ 10.03, so from radius 8 it reaches −2.03. The harness has no `lowerRadiusLimit`/`upperRadiusLimit`. The written S-06/S-11 conditions require only a decrease and finite values, which pass, but this behavior is recorded for product design. Repeated zoom-in reached −22.02; repeated zoom-out reached 38.02.
2. **Beta clamps.** Lower clamp = 0.01 rad; upper clamp = 3.1315926535897933 rad (π − 0.01). Both reached and recorded in S-11.
3. **Final camera alpha.** The input log final camera has alpha ≈ 2.1866 because S-12 deliberately orbits after resetting the map. The input map, not the camera, is the S-12 subject.
4. **No console errors or exceptions** in any of the 12 scenarios.

## 8. Reproducibility

```text
git rev-parse HEAD                      # commit containing this report
node projects/simuforge/reports/poc-01/harness/runner/sp06/run.js --out <fresh-dir>
node projects/simuforge/reports/poc-01/harness/runner/sp06/official.js
```

The runner refuses to write into a non-empty evidence directory, so previous runs cannot be silently overwritten.

## 9. POC-01 impact after the first run

| Gate | Status |
| --- | --- |
| SP-05 | ACCEPTED (10/10 visual PASS; A-03/A-04 PASS) |
| SP-06 | **NOT PASSED in the first run** — A-05-P2 sign conflict; all other scenarios and criteria PASS. Superseded by §12. |
| SP-07 (quaternion / transform conversion) | Not executed |
| SP-08 (final spike decision) | Not executed |
| POC-01 closure | **NOT COMPLETE** |

POC-01 is not declared complete. Two independent blockers remained after the first run:

1. The S-03/A-05-P2 sign decision in §4.5.
2. SP-07 and SP-08 are unexecuted, so the POC-01 readiness exit criteria cannot yet be evaluated.

## 10. Verdict of the first run (superseded)

**First official execution: FAIL — single criterion conflict, no harness or runner defect found.**

Everything the suite was built to verify was green except the written beta-sign expectation. That expectation was decided by the Project Owner on 2026-11-04 (§11) and the suite was re-run (§12).

## 11. Owner decision and amended criterion (2026-11-04)

The Project Owner reviewed §4.5 and authorised **option 1: amend A-05-P2/S-03 to the Babylon convention**. Option 2 (product-level inversion) and option 3 (waiver) were not selected.

| Item | Before | After (authoritative) |
| --- | --- | --- |
| Horizontal orbit sign | Rightward increases `alpha` | Unchanged |
| Vertical orbit sign | Downward **increases** `beta` | Rightward drag increases `alpha`; **downward drag decreases `beta`** |
| Inversion rule | Opposite sign = FAIL | Unchanged: opposite sign = FAIL |
| Quantitative check | Required | **Retained** (no waiver) |

Records updated:

- `SP-06_TEST_PROCEDURE_DRAFT.md` — amendment banner, A-05-P2 text, S-03 pass line.
- `harness/runner/sp06/config.js` — `SIGN_CONVENTION` block; official default `amended` (Babylon), sign `-1`.
- `harness/runner/sp06/official.js` — default `amended`; `legacy` retained only to reproduce the superseded expectation; runner `1.1.0`, config `sp06-official-config-2`.
- `SP-06_AUTHORIZATION_REQUEST.md`, `POC_01_CURRENT_READINESS_ASSESSMENT.md`, `docs/POC_01_IMPLEMENTATION_READINESS.md` — decision and result recorded.

No failing evidence was deleted, and no other criterion or tolerance was changed.

## 12. Official re-run under the amended criterion

| Item | Value |
| --- | --- |
| Run ID | `sp06-official-2026-11-04T09-26-01-934Z-374471` |
| Evidence directory | `results/sp-06-official/sp06-official-2026-11-04T09-26-01-934Z-374471/` |
| Started | 2026-11-04T09:26:01.936Z |
| Completed | 2026-11-04T09:28:24.728Z |
| Sign convention | `amended` (downward decreases beta) |
| Runner / config | 1.1.0 / `sp06-official-config-2` |
| Result | **PASS — 159/159 checks** |
| Scenarios | S-01..S-12 all PASS (S-10 hard gate 52/52) |
| Acceptance | **A-05-P1..P6 PASS; A-06-P1..P5 PASS** |
| Screenshots | 10/10 captured, hashes verified |
| Console | 0 errors, 0 warnings, 0 exceptions |
| Input log | 12 entries; initial 8 → final 8, state `reset` |
| Criteria conflicts | 0 |
| Integrity | **VERIFIED** (12 files, 0 mismatches, manifest SHA-256 `70a94a71bf1a7cc9a4028fbfbb99ea941fdb5ca87d1137171493ad1925eb2a93`) |

S-03 delta in the re-run: `beta = -1.0371975511965976`; `alpha`, `radius`, and `target` exactly `0`. This is the same physical behavior as the first run, now evaluated against the correct written expectation. The diagnostic run remains historical and is not used as official evidence.

### 12.1 Re-run screenshot hashes

| Screenshot | Bytes | SHA-256 |
| --- | --- | --- |
| `sp-06_camera_baseline.png` | 88508 | `d62c7ba48440587886a4195456ab323ae3cfa96094121788828f00b4f9db45d4` |
| `sp-06_orbit_horizontal.png` | 88982 | `ed74b780dc185de5dd17b7954f020ec083a119da8c6abb2a8708fda753ced0aa` |
| `sp-06_orbit_vertical.png` | 87683 | `c7dba69463243d03664e6e0290860bb8fe25fc8bea8bbf95a03b4de33ce10527` |
| `sp-06_pan_horizontal.png` | 92185 | `3b334209e18d1cf2b97b815debae1a55d8e24cc321ffe5d85e46c2076f6f6c68` |
| `sp-06_pan_vertical.png` | 91438 | `6be8351a51455588c84d12d43dcc10aa3f9ea35f063058ac45342452381f5b2b` |
| `sp-06_zoom_in.png` | 98285 | `de21cf7284b556d56e344d0c1d41a9313f71c820695cf2cff8efababc885fa5b` |
| `sp-06_zoom_out.png` | 89922 | `1c325bd644c2d1f25bfad725d94cd007838e4802bb4766d6a7f6a9cf59d5af32` |
| `sp-06_left_click_no_orbit.png` | 88917 | `893f767ca7489c6eb875ec66c3826fe46978dfdf81b5686bf1fc32fa6c28ecee` |
| `sp-06_gizmo_interaction.png` | 82816 | `c70f5e4a394cca0d3cf0c92b0c5c1e92e1f4983e4c99215191909aab1092e3c6` |
| `sp-06_edge_cases.png` | 93113 | `c01d602af65cbc0c9af8cc435789467830261298daa186c41ffad0c3d284d464` |

## 13. Final verdict and POC-01 impact

**SP-06: PASSED** under the owner-amended criterion, with full official evidence and verified integrity.

| Gate | Status |
| --- | --- |
| SP-05 | ACCEPTED |
| SP-06 | **PASSED** (159/159; A-05 and A-06 complete) |
| SP-07 (quaternion / transform conversion) | **Not executed** |
| SP-08 (final spike decision) | **Not executed** |
| POC-01 closure | **NOT COMPLETE** |

POC-01 is still not closed. The only remaining blockers are SP-07 and SP-08, which have not been executed. No criterion, tolerance, or evidence record was fabricated to reach this result; the amendment and both runs are recorded above.
