# SP-05 Visual Review Manifest

Evidence inventory for human visual review of SP-05. The original screenshots are unchanged; every hash below was recomputed from the file on disk and matches the SHA-256 recorded in the corresponding sidecar audit.

- Manifest date: 2026-11-03
- Evidence directory: `projects/simuforge/reports/poc-01/results/sp-05-manual/evidence/`
- Contact sheet: `projects/simuforge/reports/poc-01/results/sp-05-manual/visual-review/sp-05_visual_review_contact_sheet.png`
- Full-suite run: `2026-11-03T09-16-00-842Z-25efe7`
- Supplemental local Z run: `targeted-localz-2026-11-03T09-26-28-166Z-914f38`
- Visual status: **not reviewed, not verified.** This manifest prepares the review; it does not perform it.

## 1. Official review set

All nine images are PNG, 1733 × 985 px, captured with CDP `Page.captureScreenshot` at device pixel ratio 1.25. All hashes match the `artifacts[]` entries in their sidecar audits.

| # | Original filename | Bytes | Dimensions | SHA-256 | Test case | Criterion | Review question |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `sp-05_translate_x.png` | 89,522 | 1733 × 985 | `b8cca8eedd7a38df5d079d2ce610ecd2688397aa5a99c924f48bb378ef6cd54c` | T-01 | A-03 | After the ~41° Y rotation, does the X translate handle follow world X rather than the cube's rotated local X, and does the cube move along that world axis? |
| 2 | `sp-05_translate_y.png` | 89,151 | 1733 × 985 | `bd74c1272ffdf7f56b932b12a77ed1bb316510a6418e57901be8f9fa78759eba` | T-01 | A-03 | Does the Y handle remain vertical/world-aligned after the cube rotation? |
| 3 | `sp-05_translate_z.png` | 88,830 | 1733 × 985 | `6c46052a6f591104a0de05aae4107fd60d1692e346863d4ae43a42bf916b293d` | T-01 | A-03 | Does the Z handle follow world Z rather than the rotated local Z? |
| 4 | `sp-05_rotate_world_x.png` | 107,615 | 1733 × 985 | `ef5b636f27899ed389c1f597af1260d4efc154dedaff1acb3fd3cdf8db712dcb` | T-02 | A-03 | Is the rotation ring world-oriented, and does the result read as a rotation about world X rather than the cube's local X? |
| 5 | `sp-05_scale_unrotated.png` | 90,960 | 1733 × 985 | `0204b96273fc38e02f8088755368a35fd723de945b8c4b074f0952fbfcc1b853` | T-03 | A-04 | On the unrotated cube, do the scale handles coincide with the world axes? |
| 6 | `sp-05_scale_rotated_45.png` | 86,291 | 1733 × 985 | `8c6508e7be682b1bc9b4ac9f63e399ec7717c230441188cf98f7382394b9f134` | T-04 | A-04 | Do the scale handles follow the rotated cube's local axes, with local X clearly diverging from world X? |
| 7 | `sp-05_scale_rotated_90.png` | 92,310 | 1733 × 985 | `9acf4d05b3d1162062409ab4578dc3ae4008c29deb45e1dd2e8c715f17fcaf3b` | T-04 | A-04 | Near ~87° Y, do the scale handles remain consistent with the cube's rotated local axes? |
| 8 | `sp-05_mode_switch.png` | 90,734 | 1733 × 985 | `02a08b060d12f276f4696944748ecd910fe34c16a634440ba820873d0d5d0008` | T-05 | Mode-switch stability | Does the cube appear unchanged across mode switches, and does the Inspector show STABLE? |
| 9 | `sp-05_transform_integrity.png` | 87,697 | 1733 × 985 | `3a33572c99dcd8ca9a0707249e4f4fd8e42a4e0d6d7e9742d8f5378bb9e813af` | T-06 | Transform integrity | Does the final state look like a single non-uniformly scaled, rotated cube with no shear, inversion, or collapse? |

## 2. Supplemental targeted evidence

Added on 2026-11-03 to close the T-04 local Z interaction gap. These files do not replace or alter any T-01…T-06 artifact.

| Original filename | Bytes | Dimensions | SHA-256 | Test | Criterion | Review question |
| --- | --- | --- | --- | --- | --- | --- |
| `sp-05_scale_rotated_local_z.png` | 86,681 | 1733 × 985 | `00077f6774d59619602521cc5eaf146e65e18b12d65dabd08ed76386987f8b56` | T-04-Z (supplemental) | A-04 | Do the scale handles follow the rotated local axes, and is the cube stretched along local Z while X and Y are unchanged? |

Supporting JSON:

| File | Purpose |
| --- | --- |
| `sp-05_scale_rotated_local_z_log.json` | Harness export for the supplemental interaction (`cdp_trusted_input`) |
| `sp-05_scale_rotated_local_z_audit.json` | Sidecar audit: drag trace, before/after state, provenance, checks |
| `sp-05_targeted_local_z_run.json` | Targeted run summary: run ID, result 45/45, measurements, artifact list |

## 3. Contact sheet

| Field | Value |
| --- | --- |
| File | `sp-05_visual_review_contact_sheet.png` |
| Bytes | 680,438 |
| Dimensions | 2260 × 2110 |
| SHA-256 | `393451d9224f60e38ecdbd0fbdc38ad2511cbd9bfdb97521290bb2bf3e84a750` |
| Layout | 3 columns × 4 rows, 720 × 409 px per image tile |
| Labels | Original filename, test case, and acceptance criterion |
| Content | The nine official screenshots plus the supplemental local Z screenshot |

The contact sheet is a scaled review aid, not evidence. Reviewers must open the original files for detail; the originals are unchanged.

## 4. Missing or ambiguous evidence

| Item | Status | Detail |
| --- | --- | --- |
| `sp-05_rotate_45.png` | **Missing** | Listed in the procedure's required-screenshot list (item 4) but never referenced by any procedure step and never captured by the T-02 case. Content is undefined. See `SP-05_VISUAL_REVIEW_PACKAGE.md` §A. |
| `sp-05_rotate_90_y_supplementary.png` | **Missing (optional)** | Marked "optional supplementary observation only"; not captured. No acceptance impact. |
| `sp-05_scale_rotated_local_z.png` | **Present (supplemental)** | Captured in a separate targeted run, not in the official full-suite run. Clearly labelled supplemental. |
| `sp-05_scale_rotated_90.png` angle | **Ambiguous** | The cube is at ~87.45° Y (40.88° + measured 46.57°), not exactly 90°. Procedure step 9 says "approximately 90° … if practical". No numeric tolerance is documented. |
| `sp-05_scale_rotated_90.png` coverage | **Ambiguous** | The procedure says "Repeat at approximately 90° around Y if practical"; the runner repeats only the local Y drag at that angle, not X/Y/Z. Whether "repeat" means the whole handle set is not specified. |
| `sp-05_scale_rotated_45.png` content | **Ambiguous** | The file shows the local-X-scaled state at 40.88° Y. The subsequent local Y drag has no dedicated 45° screenshot; it appears only in the 90° image. |
| `sp-05_rotate_world_x.png` angle | **Recorded** | The world-X test rotation measured 43.9206° for a requested 45°. The image is genuine; the value is recorded without adjustment. |

## 5. Integrity notes

- Recomputing the SHA-256 of all nine official PNGs against their sidecar `artifacts[]` records produced 9 matches, 0 mismatches.
- The five pre-existing POC-04 files in the evidence directory were not modified.
- No screenshot was reconstructed, regenerated, or edited. The supplemental local Z image is a new genuine capture with its own run ID.
- The Inspector panel is visible in every image; it shows the transform values at capture time.
- Images were captured via CDP `Page.captureScreenshot` (viewport capture), not an OS-level snip. This was the approved automated method.
