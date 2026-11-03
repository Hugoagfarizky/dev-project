# SP-05 Visual Review Guide

## Purpose
This guide helps a human reviewer inspect the SP-05 screenshots locally and record verdicts without uploading images to any external service.

## Files
- Gallery: `projects/simuforge/reports/poc-01/results/sp-05-manual/visual-review/SP-05_VISUAL_REVIEW_GALLERY.html`
- Contact sheet: `.../visual-review/sp-05_visual_review_contact_sheet.png`
- Manifest: `.../visual-review/SP-05_VISUAL_REVIEW_MANIFEST.md`
- Original screenshots: `.../results/sp-05-manual/evidence/sp-05_*.png`

## How to open the gallery
1. Open Google Chrome.
2. Open the gallery file directly: `File > Open File` → select `SP-05_VISUAL_REVIEW_GALLERY.html`.
   - Or drag-and-drop the file into Chrome.
3. The gallery loads the original screenshots from `../evidence/`. Keep the directory structure intact.
4. Verdicts and notes are saved in the browser's `localStorage` under key `sp05-visual-review-v1`.

## How to review each image
1. Click a thumbnail to open the full-resolution image in the lightbox.
2. Use "Zoom in / Zoom out / Reset" to inspect details.
3. Compare against the automated numeric evidence in `SP-05_FULL_EXECUTION_REPORT.md` and the sidecar audits.
4. Record a verdict: PASS, FAIL, UNCERTAIN, or NOT REVIEWED.
5. Add notes explaining what was observed or why the verdict was chosen.
6. Use "Save review (JSON)" or "Save review (Markdown)" to export your verdicts to a file.
7. If `localStorage` is unavailable, use the exported Markdown checklist and fill it in manually.

## Criteria
- **A-03 (world translate/rotate):** After a ~41° Y rotation, translate handles must follow world X/Y/Z (not the cube's rotated local axes); rotation must occur about world X (not local X).
- **A-04 (local scale):** Scale handles must follow the cube's local axes on both unrotated and rotated cubes, including non-uniform scale.
- **T-05 (mode switching):** No visible transform change; Inspector shows STABLE.
- **T-06 (transform integrity):** Final state matches recorded values; no shear, inversion, or collapse.

## Full-resolution inspection
The contact sheet is a scaled review aid (720 × 409 px per tile). Always open the original 1733 × 985 PNG for detail. Do not assign a verdict based on the contact sheet alone if the relevant handle or axis alignment is not clearly visible.

## Rules
- Do not mark A-03 or A-04 PASS without visual evidence.
- Do not derive a verdict from filenames, JSON values, or numeric results.
- Do not modify or overwrite original screenshots.
- Automated results are not visual verdicts.<|end|>