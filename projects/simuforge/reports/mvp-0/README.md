# MVP-0 Verification Records

This directory holds the verification evidence for the MVP-0 increments delivered
after POC-01. Each increment adds a self-contained record, a reproducible harness,
and the raw result data captured in Chrome.

## Index

| Record | Scope | Status |
| --- | --- | --- |
| `I-04_CLOSURE_RECORD.md` | Renderer adapter, viewport, picking, context recovery (baseline `cd33065`) | Accepted baseline |
| `I-05_IMPLEMENTATION_REPORT.md` | Primitives, Hierarchy, Inspector identity, selection, rename/delete | Complete |
| `I-06_IMPLEMENTATION_REPORT.md` | Transform editing, gizmos, keyboard floor, camera mapping | Complete |
| `I-07_IMPLEMENTATION_REPORT.md` | Persistence, Project Hub, save/open, import/export | Complete |
| `I-08_IMPLEMENTATION_REPORT.md` | Console, status bar, planned surfaces | Complete |
| `I-09_IMPLEMENTATION_REPORT.md` | Accessibility, performance, acceptance evidence | Complete |
| `FINAL_OWNER_VERIFICATION_PREPARATION.md` | Exact-viewport screenshot evidence, keyboard-only verification record | M0-AC-22 pass; ACG-01 pending owner sign-off |
| `ACG-01_VISUAL_OWNER_REVIEW.md` | Visual audit of the six ACG-01 screenshots | ACG-01 evidence complete; F-1 fixed; pending owner sign-off |
| `MVP_0_ACCEPTANCE_REPORT.md` | MVP-0 final acceptance | Not accepted (ACG-01 pending) |
| `I-05_ACCEPTANCE_MATRIX.md` | M0-AC-05, M0-AC-06, M0-AC-07, M0-AC-12 and I-05 exit criteria | Pass |
| `I-05_BROWSER_VERIFICATION.md` | Chrome 156 browser results, console, context loss, layout sizes | Pass 51/51 |
| `I-05_ENVIRONMENT.md` | Toolchain, browser, display and command conditions | Reference |
| `I-05_REMAINING_LIMITATIONS.md` | Deferred scope and observations that do not block I-05 | Open items owned by later increments |
| `evidence/` | Screenshots, result JSON, and the exact harness scripts used | Raw evidence |

## Commit map

| Commit | Content |
| --- | --- |
| `cd33065` | I-04 baseline (renderer, viewport, picking, context recovery) |
| `4eacb0f` | I-05 renderer conformance: unlit primitives/grid, XZ double-sided plane |
| `ab11fc5` | I-05 editor semantics: structural sharing, create/rename/delete, stable selectors |
| `0ddff08` | I-05 UI foundation: Button, Dialog, InlineRename, keyboard shortcuts |
| `9a57cde` | I-05 UI integration: Hierarchy, Inspector, Asset Library, Empty World overlay |
| `(evidence commit)` | This record and raw evidence |

## Reproducing the I-05 browser run

1. Install the pinned toolchain from `projects/simuforge/app/package.json`
   (Node `24.22.2`, npm `11.19.1`).
2. From `projects/simuforge/app`, run `npm run dev -- --port 5173 --strictPort`.
3. From this directory's `evidence/` folder, run:
   `node verify-i05.cjs`
4. The script launches Chrome with a dedicated profile and debugging port, drives
   the real UI, writes the six screenshots, and emits `i05-result.json`.
5. The optional renderer conformance probe is `verify-phase1.cjs`; the I-04
   regression probe is `verify-i04-regression.cjs`.
