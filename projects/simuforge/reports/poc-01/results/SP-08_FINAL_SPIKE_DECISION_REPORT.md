# SP-08 Final Spike Decision Report

Date: 2026-11-04
Scope: Final go/no-go decision for POC-01, based on SP-01 through SP-07 evidence.
Decision: **GO**
POC-01 status: **CLOSED**

## 1. Authority and method

This report audits the existing, verified evidence for SP-01 through SP-07 and applies the go/no-go criteria in `POC_01_IMPLEMENTATION_READINESS.md` sec 8.3. No implementation code, test, or evidence was modified. No acceptance criterion was changed. No new execution was performed; the already-accepted evidence was re-verified (integrity manifests re-checked).

## 2. Evidence audit

### 2.1 Acceptance criteria A-01..A-08

| Criterion | Status | Evidence |
| --- | --- | --- |
| A-01 Right-handed axes (+X right, +Y up, -Z forward) | **PASS** | SP-02 numeric consistency; SP-05 visual review 10/10 PASS and owner acceptance 2026-11-04 |
| A-02 `scene.pick` correct in right-handed mode | **PASS** | SP-04: 6/6 picks returned `testCube` with plausible points; empty-space picks no hit |
| A-03 Position/rotation gizmos world orientation without artifacts | **PASS (visually verified)** | SP-05 T-01/T-02, 256/256 assertions; visual review 10/10 PASS; owner accepted |
| A-04 Local scale gizmo on rotated entities, incl. non-uniform | **PASS (visually verified)** | SP-05 T-03/T-04 (incl. supplemental local Z); visual review 10/10 PASS; owner accepted |
| A-05 ArcRotateCamera orbit/pan/zoom in right-handed mode | **PASS** | SP-06 official re-run `sp06-official-2026-11-04T09-26-01-934Z-374471`: 159/159 |
| A-06 Plain-left-drag rotate removable; left click free for selection | **PASS (POC scope)** | SP-06: S-08, S-09, S-10 (hard gate 52/52), S-12 all PASS; A-06-P5 scopes to camera non-capture |
| A-07 Quaternion authored in right-handed scene rotates +X to -Z | **PASS** | SP-07 `sp07-2026-11-04T10-04-53-269Z-024c65`: Q-01 5/5 |
| A-08 `toEulerAngles()` returns x=pitch, y=yaw, z=roll (YXZ) | **PASS** | SP-07: Q-02 4/4, Q-03 21/21, Q-04 14/14 |

All eight acceptance criteria are PASS.

### 2.2 Go/no-go criteria (sec 8.3)

| Criterion | Status | Basis |
| --- | --- | --- |
| Right-handed axes match world convention visually | **MET** | SP-05 visual review 10/10 PASS + owner acceptance |
| Picking selects correct object and stays correct after camera movement | **MET** | SP-04 PASS |
| Translate/rotate gizmos produce expected world-space transforms | **MET** | SP-05 T-01/T-02 PASS + visual |
| Local-space scale on unrotated and rotated entities, incl. non-uniform | **MET** | SP-05 T-03/T-04 PASS + visual |
| Gizmo and Inspector values agree; mode switches do not change transform | **MET** | SP-05 T-05/T-06 PASS |
| Camera orbit/pan/zoom work; left click reservable for selection | **MET** | SP-06 PASS |
| Quaternion values round-trip without drift; +X to -Z passes | **MET** | SP-07 PASS (max delta 1.11e-16) |
| No unresolved console error or rendering defect | **MET** | 0 errors across SP-05/SP-06/SP-07 |

All eight go/no-go criteria are MET.

### 2.3 Integrity verification (re-checked 2026-11-04)

| Evidence set | Integrity | Notes |
| --- | --- | --- |
| SP-05 (`results/sp-05-manual/evidence/`) | PASS | `sp-05_final_integrity_audit.json` result=PASS; 256/256 assertions; 750/750 audit; visual review 10/10 PASS |
| SP-06 passing run (`sp06-official-2026-11-04T09-26-01-934Z-374471`) | VERIFIED | 12 files, 0 mismatches, manifest SHA-256 `70a94a71bf1a7cc9a4028fbfbb99ea941fdb5ca87d1137171493ad1925eb2a93` |
| SP-07 passing run (`sp07-2026-11-04T10-04-53-269Z-024c65`) | VERIFIED | 3 files, 0 mismatches, manifest SHA-256 `ce23bae143ff58104f6771608da1d5a631591ebd99f64e480743f8748397476e` |

Historical failed runs (SP-06 first run `...96430a`, SP-07 first two runs) are preserved and referenced, not overwritten.

### 2.4 Owner decisions recorded

- SP-05 formal acceptance: ACCEPTED (2026-11-04).
- Numeric tolerances: Option A approved (1e-9 invariance; 0.05 orbit/pan; 0.1 zoom; 2000 ms settle).
- SP-06 official execution: AUTHORIZED.
- A-05-P2/S-03 beta sign: amended to the Babylon convention (downward drag decreases beta), quantitative inversion check retained, no waiver.

## 3. What POC-01 has proven

1. Engine initialization on Babylon.js 9.32.1 / WebGL 2 / Chrome 156 (SP-01).
2. Right-handed coordinate convention (+X right, +Y up, -Z forward) (SP-02, confirmed visually in SP-05).
3. Picking returns the correct mesh and point in right-handed mode, including after 180 deg orbit (SP-04).
4. Translate and rotate gizmos operate in world space; scale operates in local space, including non-uniform scale on rotated entities (SP-05, visually verified).
5. Gizmo/Inspector agreement and mode-switch stability (SP-05 T-05/T-06).
6. ArcRotateCamera orbit, pan, and zoom work in right-handed mode; the default plain-left-drag rotate entry can be removed and restored without breaking gizmo interaction (SP-06).
7. Quaternion authored in the right-handed scene rotates +X to -Z; Euler extraction uses x=pitch, y=yaw, z=roll (YXZ); round-trip is stable (max delta 1.11e-16); gimbal-lock behaviour is measured and documented (SP-07).
8. TRS transform composition (scale then rotate then translate) is consistent with Babylon's Matrix.Compose (SP-07 supporting).
9. Input provenance is trusted (CDP only); 0 console errors across all executed scopes.

## 4. What remains assumption or design decision (not empirically proven)

1. SP-02/SP-03 standalone visual confirmation was recorded as PARTIAL (headless capture). The same visual properties (axes, cube resting on grid, no light dependency) are covered by the SP-05 visual review, which the owner accepted. This is a documented limitation, not a blocker.
2. Serialization round-trip (E-12/E-15) was not executed as a dedicated export/import test. SP-07 verified quaternion math and TRS composition, but not full world-model persistence. This is a product-level concern for the implementation phase, not a spike go/no-go criterion.
3. Performance baseline on the target hardware was not measured. No performance claim is made by POC-01.
4. Cross-browser: Chrome-only scope was approved; Firefox is explicitly excluded.
5. SP-06 negative radius on zoom (no lowerRadiusLimit) is an observation for product design, not a criterion failure.
6. SP-07 gimbal-lock tolerance interpretation (1e-4 vs 1e-6) is documented in the SP-07 report sec 5.

## 5. Residual risks

| ID | Risk | Impact | Likelihood | Mitigation | Stage |
| --- | --- | --- | --- | --- | --- |
| R-1 | Euler display ambiguity at gimbal lock confuses users | Medium | Certain (inherent) | Quaternion remains source of truth; document YXZ order; test near +/-90 deg in unit tests | Implementation |
| R-2 | Serialization round-trip not yet validated | Medium | Medium | Add automated export/import round-trip tests in the implementation phase (E-12 criteria) | Implementation |
| R-3 | No performance baseline | Medium | Unknown | Measure frame time and interaction latency during implementation on target hardware | Implementation |
| R-4 | Chrome-only scope | Low | Low (approved) | Re-evaluate if a second browser becomes a product requirement | Product |
| R-5 | Negative zoom radius (no lowerRadiusLimit) | Low | Certain (current harness) | Add radius clamping in the camera controller | Implementation |
| R-6 | SP-02/SP-03 visual review recorded as PARTIAL | Low | Low | Considered satisfied by SP-05 accepted visual review; no further action required | Closed |

## 6. Decision

All eight acceptance criteria (A-01..A-08) are PASS. All eight go/no-go criteria (sec 8.3) are MET. Evidence integrity is verified for SP-05, SP-06, and SP-07. Owner acceptance is recorded for SP-05, SP-06, and the SP-06 sign amendment. The residual items above are limitations and observations, not blockers, and are either accepted, out of POC scope, or deferred to the implementation phase with documented mitigations.

**Decision: GO**

POC-01 is **CLOSED**. The technical foundation is sufficient to proceed to the Main Simulation Studio UI/UX Design phase.

## 7. Recommendation

Proceed to **Main Simulation Studio UI/UX Design** as the next stage. Carry forward the residual risks R-1..R-5 as tracked items. Do not begin implementation of the full product without the UI/UX design and a scaffold task (pinned versions, license inventory) as recorded in `POC_01_IMPLEMENTATION_READINESS.md` sec 10.5.

No further spike work is required.
