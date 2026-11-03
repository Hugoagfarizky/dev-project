# SP-05 Visual Review Package

Preparation and evidence-gap analysis for the human visual review of SP-05.

| Field | Value |
| --- | --- |
| Date | 2026-11-03 |
| Base commit | `b0183a7f83b14117d4a648dd4c1905c37c850d3f` |
| Official suite run | `2026-11-03T09-16-00-842Z-25efe7` (unchanged) |
| Supplemental targeted run | `targeted-localz-2026-11-03T09-26-28-166Z-914f38` |
| Harness | `harness/sp05.html`, 36,233 bytes, SHA-256 `0a05cda7c8407c747466fff21137820e551945de7b5e74c89a3d695807a1d222` |
| Visual status | **Pending.** Nothing in this package marks a screenshot reviewed or an acceptance criterion PASS. |
| SP-05 status | **BLOCKED — unchanged.** |
| A-03 / A-04 | **Unverified.** |

## 1. Deliverables

| Deliverable | Location |
| --- | --- |
| Contact sheet (PNG) | `results/sp-05-manual/visual-review/sp-05_visual_review_contact_sheet.png` |
| Evidence manifest | `results/sp-05-manual/visual-review/SP-05_VISUAL_REVIEW_MANIFEST.md` |
| This package | `results/sp-05-manual/SP-05_VISUAL_REVIEW_PACKAGE.md` |
| Original evidence | `results/sp-05-manual/evidence/` (unchanged apart from new supplemental files) |

The contact sheet is 2260 × 2110, 3 × 4 tiles at 720 × 409 px, and includes the nine official screenshots plus the supplemental local Z capture. Originals were not modified.

## 2. Automated baseline (unchanged)

The official suite was **not re-executed** and its evidence was **not modified**.

- T-01…T-06: 256/256 assertions PASS.
- Independent evidence audit: 750/750 PASS.
- 14 fully trusted CDP drags, lifecycle `1/24/1`, `isTrusted: true`, `pointerType: "mouse"`.
- No retries, no synthetic input, no programmatic transform, no console errors.

These remain automated results only. This package does not change their status.

## 3. A — Missing `sp-05_rotate_45.png`

### Findings

| Source | What it says |
| --- | --- |
| `SP-05_EVIDENCE_PROCEDURE.md` required-screenshot list, item 4 | `sp-05_rotate_45.png` is required |
| T-02 procedure body (steps 1–8) | Captures `sp-05_rotate_world_x.png` after a ~45° world-X rotation; never mentions `sp-05_rotate_45.png` |
| T-02 case (`t02-world-rotate.js`) | Captures `sp-05_rotate_world_x.png` only; declares `sp-05_rotate_90_y_supplementary.png` as optional |
| Full-suite evidence | `sp-05_rotate_45.png` absent; `sp-05_rotate_world_x.png` present and genuine |

### Cause

The required-screenshot list and the procedure body disagree. Item 4 is orphaned: no step defines its content or capture point, and the runner implements the body. This is a documentation/inventory defect, not a lost capture.

### What the image could mean

1. **The result of the ~45° world-X rotation** — in that case it duplicates `sp-05_rotate_world_x.png`, which is already the T-02 body's required screenshot.
2. **The ~45° Y setup state before the world-X rotation** — in that case no existing image is a substitute, because the setup state was never captured. `sp-05_rotate_world_x.png` shows a later state.

### Substitute decision

`sp-05_rotate_world_x.png` is an adequate substitute for reading 1 and is the screenshot the T-02 procedure actually requires. It is **not** an adequate substitute for reading 2.

### Proposed targeted capture (not executed)

If reading 2 is intended, capture a fresh run: reset, rotate world Y ≈45°, remain in Rotate mode before the world-X drag, screenshot as `sp-05_rotate_45_setup.png` with its own sidecar and run ID. Do not rename it to `sp-05_rotate_45.png` and do not claim it belongs to the original suite. It was not captured here because the content is undefined and the instruction was to propose, not to invent, missing evidence.

## 4. B — Local Z scale

### Is it mandatory?

| Source | Requirement |
| --- | --- |
| `SP-05_EVIDENCE_PROCEDURE.md`, T-04 step 5 | "Drag local X, Y, and Z handles." |
| T-04 case (`t04-local-scale-rotated.js`) | Drags local X, then a supplementary local Y near 90°; **never Z** |
| `POC_01_WORLD_EDITOR.md` E-07 | Requires local X scale after a 45° Y rotation; does not require Y or Z |

The written SP-05 procedure requires X, Y, and **Z**. E-07 alone does not. The procedure is the operative SP-05 checklist, so local Z was treated as mandatory for procedure compliance.

### Targeted execution (performed)

A separate targeted run used the same runner libraries, harness, dedicated Chrome profile, and trusted `Input.dispatchMouseEvent` pipeline. Existing evidence was checked first and could not be overwritten.

| Field | Value |
| --- | --- |
| Run ID | `targeted-localz-2026-11-03T09-26-28-166Z-914f38` |
| Result | **PASS — 45/45 checks** |
| Setup | World Y rotation, measured 40.8814° |
| Local Z in world | `(0.654495, 0, 0.756066)` — divergence from world Z 40.8814° |
| Scale before → after | `(0.9999998, 1, 0.9999998) → (0.9999998, 1, 1.304800)` |
| X / Y change from the Z drag | ≤ `1e-6` each |
| Quaternion change from the Z drag | 0 within `1e-6`; length `1.000000` |
| Gizmo root orientation | All three scale roots follow the cube exactly (`localError = 0`) |
| Drag provenance | `cdp_trusted_input`, `Input.dispatchMouseEvent`, lifecycle `1/24/1`, `allTrusted: true`, `pointerType: "mouse"` |
| Console | 1 informational entry, 0 warnings, 0 errors |
| Screenshot | `sp-05_scale_rotated_local_z.png` |

Artifacts: `sp-05_scale_rotated_local_z.png`, `sp-05_scale_rotated_local_z_log.json`, `sp-05_scale_rotated_local_z_audit.json`, `sp-05_targeted_local_z_run.json`.

### Scope caveat

This is supplemental evidence for the missing interaction. It is **not** a re-run of T-04, does not modify the official T-04 audit or export, and does not convert T-04 into a three-axis run. Whether it satisfies the procedure is a review decision (§9).

## 5. C — Why local Y changed from 1 to 1.134295

The change did not happen during the local X drag. It belongs to a separate, intentional supplementary local Y drag.

| Order | Drag | Target | Scale before | Scale after | Change |
| --- | --- | --- | --- | --- | --- |
| 1 | Setup | world Y rotation | `(1, 1, 1)` | `(0.9999998, 1, 0.9999998)` | rotation only |
| 2 | Primary | local X | `(0.9999998, 1, 0.9999998)` | `(1.203411, 1, 0.9999998)` | **X only**; Y change 0 |
| 3 | Supplementary | world Y +~48° | `(1.203411, 1, 0.9999998)` | `(1.203411, 1, 0.9999998)` | rotation only |
| 4 | Supplementary | local Y near 90° | `(1.203411, 1, 0.9999998)` | `(1.203411, 1.134295, 0.9999998)` | **Y only**; X unchanged |

### Assessment

- **Expected behavior, not a defect.** The T-04 case deliberately performs a second scale drag after the supplementary rotation, mirroring the procedure's "repeat at approximately 90° around Y" step. That drag targets local Y.
- **No cross-axis leakage.** The local X drag changed X by `+0.203411` and changed Y by 0 (Y stayed exactly `1`). The local Y drag changed Y by `+0.134295` and left X at its previous `1.203411`. The runner's confinement check passed with `maxOther ≤ 1e-6`.
- **Lifecycle and axis identity are clean.** Local Y drag: picked axis `y`, world angle 0°, cross-axis activity 0, lifecycle `1/24/1`.
- **Numeric drift is benign.** Scale X/Z read `0.9999998` rather than exactly `1` after the rotation drag — a ~2 × 10⁻⁷ artifact. It is recorded as-is and is far inside every documented tolerance.
- **Not a tolerance issue.** The `1 → 1.134295` value is the intended local Y scale result, not a violation of a threshold.

## 6. D — Angle tolerance

### Values

| Reference | Requested | Measured | Difference |
| --- | --- | --- | --- |
| Runner T-01/T-02/T-04 setup rotation | 42° | 40.8814° | −1.1186° (−2.7%) |
| Procedure T-01/T-02/T-04 setup wording | "approximately 45°" | 40.8814° | −4.1186° (−9.2%) |
| T-02 world-X test rotation | 45° | 43.9206° | −1.0794° (−2.4%) |

### Documented tolerances that actually exist

| Location | Tolerance | Applies to |
| --- | --- | --- |
| `lib/scenario.js` `rotateBy` | 0.75× to 1.25× of the requested angle (`31.5°–52.5°` for 42°) | Runner plausibility assertion only |
| `SP-05_EVIDENCE_PROCEDURE.md` | "approximately" — no numeric value | Procedure wording |
| `POC_01_WORLD_EDITOR.md` E-07 | "45°" — no numeric value | Acceptance wording |
| T-05 comparison | `1e-5` | Mode-switch stability (unrelated) |

### Conclusion

- The measured 40.8814° **passes the runner's own plausibility band** (75%–125%).
- It **cannot be formally adjudicated against the written acceptance criterion**, because neither the procedure nor E-07 defines a numeric tolerance. Stating that it "passes 45°" would invent a tolerance; stating that it "fails" would do the same.
- The axis-distinction property that the test exists to prove is unaffected: local X diverges from world X by 40.88°, far above the runner's 25° minimum for a meaningful test.
- **Decision required** (§9): accept "approximately 45°" as satisfied by 40.88°, define an explicit tolerance, or require a re-capture. No tolerance was invented in this package.

## 7. Provenance and integrity of the new evidence

| Measure | Value |
| --- | --- |
| Method | Direct CDP `Input.dispatchMouseEvent` |
| Declaration | `cdp_trusted_input`, driver `simuforge-sp05-cdp-runner`, session = targeted run ID |
| Drags | 2 (setup rotation + local Z scale), lifecycle `1/24/1` each |
| Trust | `allTrusted: true`, every event `isTrusted: true`, `pointerType: "mouse"` |
| Cross-axis activity | 0 |
| Synthetic input | none (`syntheticSeen: false`) |
| Programmatic transform | none |
| Export validation | harness 2.0, policy world/world/local, 0 offenders, 0 untrusted drags |
| Console | 0 errors, 0 warnings |
| Existing files | none overwritten; pre-write existence check enforced |

Note on mesh names: Babylon's scale-gizmo child meshes all report `yPosMesh` in this build. Handle identity is therefore taken from the axis root and the drag axis, not from the child mesh name. This is why all three handles show the same `pickedMesh` value while `pickedAxis` is `x`, `y`, or `z` as expected.

## 8. Visual review checklist

Reviewers should open the originals, not only the contact sheet.

- [ ] `sp-05_translate_x.png` — X handle world-aligned after rotation; motion along world X.
- [ ] `sp-05_translate_y.png` — Y handle vertical; motion along world Y.
- [ ] `sp-05_translate_z.png` — Z handle world-aligned; motion along world Z.
- [ ] `sp-05_rotate_world_x.png` — ring orientation; rotation about world X, not local X.
- [ ] `sp-05_scale_unrotated.png` — local handles coincide with world axes.
- [ ] `sp-05_scale_rotated_45.png` — local handles follow the rotated cube.
- [ ] `sp-05_scale_rotated_90.png` — handles consistent near 90°.
- [ ] `sp-05_mode_switch.png` — no visible transform change; STABLE shown.
- [ ] `sp-05_transform_integrity.png` — no shear, inversion, or collapse.
- [ ] `sp-05_scale_rotated_local_z.png` (supplemental) — stretch along rotated local Z; X/Y unchanged.

This checklist is a guide. A tick is a human judgment, not an automated result. A-03 and A-04 remain unverified until the review is completed and recorded.

## 9. Remaining Project Owner decisions

1. **Angle tolerances.** Accept 40.8814° as "approximately 45°", or define a numeric tolerance, or require re-capture.
2. **`sp-05_rotate_45.png`.** Amend the required-screenshot list (recommended if it was a duplicate of `sp-05_rotate_world_x.png`), or define its content and authorize a targeted setup capture.
3. **Local Z evidence.** Accept the supplemental targeted run as satisfying T-04 step 5, or require a full T-04 re-run that drags X, Y, and Z in one case.
4. **90° coverage.** Clarify whether "repeat at approximately 90°" means all three handles or only one observation.
5. **Visual sign-off.** Review and record the outcome for the nine official screenshots and the supplemental local Z screenshot.
6. **Harness checklist.** The checklist statuses remain "Not tested". Decide whether to set them after review; the runner deliberately does not.
7. **Reproducibility.** Decide whether formal release needs a second full-suite run. The current evidence is from one official pass.

## 10. Status

- SP-05 remains **BLOCKED**.
- A-03 and A-04 remain **unverified**.
- No screenshot is marked visually reviewed.
- SP-06 remains **NO-GO** and was not started.
- The main SimuForge application was not modified.
