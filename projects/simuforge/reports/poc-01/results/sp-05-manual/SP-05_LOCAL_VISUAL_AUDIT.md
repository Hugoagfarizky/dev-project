# SP-05 Local Visual Audit

Date: 2026-11-03

## 1. Audit capability statement

**This audit was not performed by the model.** When asked to open the contact sheet and an original screenshot, the model returned:

> "Image read successfully … ERROR: Cannot read … (this model does not support image input)."

The model has no image-input capability in this session. **No pixel-level observation was made, and no PASS/FAIL verdict was assigned to any screenshot.** The entries below record the evidence that exists, the criterion each image is meant to support, and the expected visual behavior documented in `SP-05_EVIDENCE_PROCEDURE.md`. They are review templates for a human reviewer; they are not audit results.

No evidence was modified. No screenshot was marked reviewed. A-03 and A-04 remain unverified. SP-05 remains BLOCKED.

## 2. Automated (non-visual) checks performed

These are file-integrity checks only; they do not assess visual alignment.

| Check | Result |
| --- | --- |
| All 9 official PNGs present, non-zero, valid PNG signature | PASS (1733 × 985 each) |
| Contact sheet present, valid PNG | PASS (2260 × 2110) |
| Supplemental local Z PNG present, valid | PASS (1733 × 985) |
| SHA-256 of every official PNG matches its sidecar audit `artifacts[]` | PASS (9/9) |
| Five pre-existing POC-04 PNG/JSON files untouched | PASS |
| No `_staging` leftovers | PASS |
| Harness SHA-256 consistent across all runs | PASS (`0a05cda7…`) |

## 3. Per-screenshot review templates

Each entry lists the file, the test case and acceptance criterion, the expected visual behavior from the procedure, and the review outcome. **Review outcome is left as NOT REVIEWED because no image was inspected.**

| # | File | Bytes | Case / Criterion | Expected visual behavior (per procedure) | Automated numeric support | Review outcome |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `sp-05_translate_x.png` | 89,522 | T-01 / A-03 | Translation follows world X/Y/Z, not the cube's local (rotated) axes. | World X delta `(0.902087, 0, 0)`; world angle 0°; off-axis 0 | NOT REVIEWED (no image input) |
| 2 | `sp-05_translate_y.png` | 89,151 | T-01 / A-03 | Y handle remains vertical/world-aligned after cube rotation. | World Y delta `(0, 0.817648, 0)`; world angle 0°; off-axis 0 | NOT REVIEWED (no image input) |
| 3 | `sp-05_translate_z.png` | 88,830 | T-01 / A-03 | Z handle follows world Z, not the rotated local Z. | World Z delta `(0, 0, 0.858875)`; world angle 0°; off-axis 0 | NOT REVIEWED (no image input) |
| 4 | `sp-05_rotate_world_x.png` | 107,615 | T-02 / A-03 | Rotation occurs around the selected world X axis; quaternion reflects world-space rotation. Do not claim PASS from Euler angle alone. | Delta axis `(1, 0, 0)`, 43.9206°; rotated local X `(0.756066, 0, -0.654495)` | NOT REVIEWED (no image input) |
| 5 | `sp-05_scale_unrotated.png` | 90,960 | T-03 / A-04 | Scale stretches along the cube's local axes; on an unrotated cube these coincide with world X/Y/Z. | Local X `1 → 1.214723`; Y/Z unchanged | NOT REVIEWED (no image input) |
| 6 | `sp-05_scale_rotated_45.png` | 86,291 | T-04 / A-04 | Scale handles follow the cube's local axes after rotation; at least one non-uniform scale. | Local X `1 → 1.203411`; world angle 0°; X/Y/Z confinement ≤ `1e-6` | NOT REVIEWED (no image input) |
| 7 | `sp-05_scale_rotated_90.png` | 92,310 | T-04 / A-04 | Local handles remain consistent near ~87° Y. | Local Y `1 → 1.134295` at ~87.45°; world angle 0° | NOT REVIEWED (no image input) |
| 8 | `sp-05_mode_switch.png` | 90,734 | T-05 / Mode-switch stability | Position, quaternion, and scale remain unchanged within `1e-5`. | Harness comparison STABLE; zero drags | NOT REVIEWED (no image input) |
| 9 | `sp-05_transform_integrity.png` | 87,697 | T-06 / Transform integrity | Final state matches recorded values; no shear, inversion, or collapse. | Quaternion normalized; scale finite, positive, ≥ `1e-3`; harness VALID | NOT REVIEWED (no image input) |
| 10 | `sp-05_scale_rotated_local_z.png` (supplemental) | 86,681 | T-04-Z / A-04 | Handles follow rotated local axes; cube stretched along local Z while X and Y are unchanged. | Local Z `0.9999998 → 1.304800`; X/Y change ≤ `1e-6`; world angle 0° | NOT REVIEWED (no image input) |

## 4. Contact sheet

`projects/simuforge/reports/poc-01/results/sp-05-manual/visual-review/sp-05_visual_review_contact_sheet.png` (2260 × 2110, 680,438 B) — 3 × 4 grid, 720 × 409 px per tile, labels included. **Not reviewed by this model** for the same reason.

## 5. What this audit did not do

- It did not inspect any pixel, handle, ring, or cube.
- It did not assign PASS or FAIL to any screenshot.
- It did not mark A-03 or A-04 visually verified.
- It did not change any evidence file or SHA-256 record.

## 6. Required human action

A human reviewer must open the original PNGs (not only the contact sheet), complete the "Review outcome" column above, and record the result in the harness checklist and the readiness document. Until then, SP-05 remains BLOCKED and A-03/A-04 remain unverified.

## 7. Status

- SP-05: **BLOCKED** (unchanged).
- A-03 / A-04: **unverified** (unchanged).
- SP-06: **NO-GO** (unchanged; not started).
- Main application: **not modified**.