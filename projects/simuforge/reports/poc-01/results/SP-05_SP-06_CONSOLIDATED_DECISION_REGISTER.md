# SP-05 / SP-06 Consolidated Decision Register

Date: 2026-11-03
Scope: Consolidated register of all SP-05/SP-06 decisions. No acceptance criteria changed.

## A. Approved decisions

| ID | Topic | Decision | Evidence | Status |
| --- | --- | --- | --- | --- |
| D1 | Modifier assignment (Ctrl/Alt) | APPROVED (DEFAULT): Ctrl+left=pan, Alt+left=orbit, plain left=orbit, right=pan | P1 modifier validation (ctrlKey/altKey confirmed); no browser/OS interference on Windows/Chrome | Approved, empirically verified (within tested environment) |
| D2 | Plain-left-drag rotate | APPROVED (TETAP ORBIT): retain plain-left-drag = orbit | P2 (removal works but superseded by owner decision) | Approved |
| D4 | 10 screenshot baseline | APPROVED | Filenames as proposed | Approved |
| D5 | JSON input log versioned | APPROVED | Schema with settleDelayMs | Approved |
| D6 | CDP trusted input + visual review; reuse SP-05 runner | APPROVED | P1-P5 all used trusted CDP | Approved, empirically verified |
| D7 | Dedicated SP-06 harness; reuse runner components | APPROVED | Smoke 11/11, scenario 10/10 | Approved, empirically verified (smoke) |
| D8 | A-06 limited to camera non-capture for POC | APPROVED | A-06-P5 | Approved |
| D9 | S-10a/S-10b as mandatory hard-gate evidence | APPROVED | P5 (33/33 PASS) | Approved, empirically verified |

## B. Empirically verified decisions

| ID | Topic | Verification | Evidence |
| --- | --- | --- | --- |
| D1 | Modifier delivery | ctrlKey/altKey correctly set via CDP | sp-06_modifier_validation.json |
| D6 | CDP trusted input | All probes used trusted CDP input | P1-P5 probe reports |
| D9 | Gizmo-camera isolation | S-10a == S-10b, gizmo drag succeeded | P5 (33/33) |
| D3a | Settle delay 2.000 ms | P4 measured 1182/1163/113 ms | sp-06_settle_validation.json |
| L4 | Wheel direction | Wheel up → zoom in, wheel down → zoom out | P3 (2/2) |

## C. Approved but not yet empirically verified

| ID | Topic | Status | Next step |
| --- | --- | --- | --- |
| D7 | Dedicated SP-06 harness | Approved, smoke validated | Full scenario implementation when authorized |
| D8 | A-06 scope limitation | Approved | Visual/functional verification during SP-06 |

## D. Provisional technical recommendations

| ID | Topic | Recommendation | Status |
| --- | --- | --- | --- |
| D3b | Angle/radius/position tolerances | 0.05 rad / 0.1 radius / 1e-6 invariants; recommend tightening invariants to 1e-9 or 1e-12 based on noise floor ~2e-16 | PROVISIONAL (owner approval needed) |
| M4 | Tolerance numeric basis | Justify from Babylon floating-point precision and camera speed properties | PROVISIONAL |
| M1 | Browser/OS shortcut conflicts | Verified on Windows/Chrome only; not generalized | PROVISIONAL (cross-platform) |

## E. Unresolved owner decisions

| ID | Topic | Status |
| --- | --- | --- |
| 1 | Modifier assignment (final choice between default and proposed rebind) | Approved as DEFAULT; rebind remains an option |
| 3 | Numeric tolerances (angle/radius/position) | PROVISIONAL |
| 4 | Required screenshot filenames and count | Approved (10 proposed) |
| 5 | Input log JSON schema | Approved (with settleDelayMs) |
| 6 | Automation (CDP) vs. manual | Approved (CDP) |
| 7 | Dedicated harness vs. extension | Approved (dedicated) |
| 8 | A-06 scope | Approved (camera non-capture) |
| 9 | S-10a/S-10b hard gate | Approved |

## F. Superseded decisions (retained for traceability)

- Earlier decision 2 (remove plain-left-drag rotate) → superseded by APPROVED (TETAP ORBIT).
- Earlier decision 1 (modifier PROVISIONAL) → superseded by APPROVED (DEFAULT).
- Earlier decision 3 (settle delay PROVISIONAL) → superseded by APPROVED (2.000 ms).

## Status

- SP-05: BLOCKED (unchanged).
- A-03 / A-04: unverified (unchanged).
- SP-06: NO-GO (unchanged).
- No acceptance criterion changed.

## H. Update 2026-11-04 (SP-08 GO, appended)

- SP-05: **ACCEPTED**; A-03/A-04 **PASS (visually verified)**.
- SP-06: **PASSED** (159/159).
- SP-07: **PASSED** (87/87).
- SP-08: **GO** — POC-01 **CLOSED**.
- All A-01..A-08: **PASS**.
- Evidence integrity verified for SP-05, SP-06, SP-07.
- No acceptance criterion changed except D10 (owner-decided).
- No main Simulation Studio source modified.

| ID | Topic | Decision | Status |
| --- | --- | --- | --- |
| D3a | Settle delay | 2000 ms | APPROVED |
| D3b | Numeric tolerances | Option A: invariance 1e-9; orbit/pan 0.05; zoom 0.1 | **APPROVED** |
| D10 | S-03/A-05-P2 beta sign | Amend to the Babylon 9.32.1 convention: rightward increases `alpha`, downward **decreases** `beta`; opposite sign remains FAIL; quantitative check retained | **APPROVED** 2026-11-04 after the first official run |

Status after the update:

- SP-05: **ACCEPTED**; A-03/A-04 **PASS (visually verified)**.
- SP-06: **PASSED** on the official re-run `sp06-official-2026-11-04T09-26-01-934Z-374471` (159/159); the first failed run is preserved.
- SP-07/SP-08: not executed; POC-01 remains open.
- The only criterion change in this cycle is D10, explicitly decided by the Project Owner. No tolerance was changed after seeing results.