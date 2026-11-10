# SimuForge — I-09 Implementation & MVP-0 Acceptance Report

**Increment:** I-09 — Accessibility, performance, and acceptance evidence
**Status:** Complete (with conditions)
**Baseline:** `5e89070921cd2723a60b57f8f5fb4af35a11325c`

## 1. Implementation Summary

Implemented reduced-motion support (CSS), performance sampler (`src/perf/performanceSampler.ts`), and captured performance evidence (0/10/50/100 entities). Ran full acceptance suite and regressions. Captured visual screenshots for ACG-01 (pending Project Owner visual verification). ACG-02/ACG-03/ACG-04 verified.

## 2. Files Changed

- `app/src/styles/shell.css` (reduced-motion media query)
- `app/src/perf/performanceSampler.ts` (new)
- `reports/mvp-0/evidence/verify-i09-perf.cjs` (new)
- `reports/mvp-0/evidence/verify-i09-visual.cjs` (new)
- `reports/mvp-0/evidence/i09-perf-result.json` (new)
- `reports/mvp-0/evidence/i09-*.png` (new)
- `reports/mvp-0/I-09_IMPLEMENTATION_REPORT.md` (new)
- `reports/mvp-0/MVP_0_ACCEPTANCE_REPORT.md` (new)

## 3. Acceptance Criteria Matrix

| ID | Description | Status | Evidence |
| --- | --- | --- | --- |
| M0-AC-01..07 | Layout/primitives/selection | PASS | I-05 harness 51/51 |
| M0-AC-08 | Inspector transform | PASS | I-06 |
| M0-AC-09 | Gizmo world/local | PASS (implemented) | I-06 |
| M0-AC-10 | Mode switch no transform change | PASS | reducer test |
| M0-AC-11 | Plain left never orbits | PASS | I-06 camera mapping |
| M0-AC-12 | Rename/confirmed delete | PASS | I-05 |
| M0-AC-13..17 | Persistence/Hub/save/open | PASS (unit) | I-07 |
| M0-AC-18 | Console source/severity | PASS | I-08 |
| M0-AC-19 | Planned surfaces | PASS | I-08 |
| M0-AC-20 | No comp/behavior/runtime in Inspector | PASS | I-05/I-08 |
| M0-AC-21 | I-06 shortcut subset | PASS | I-06 audit |
| M0-AC-22 | Keyboard focus visible; collapsed not tabbable; dialogs restore focus | PASS | Project Owner manual keyboard-only verification in Chrome (11/11 checks PASS, see §5 and `FINAL_OWNER_VERIFICATION_PREPARATION.md` §5.1); focus-ring CSS + dialog trap/restore implementation reviewed in `shell.css`, `ui/common/Dialog.tsx`, `Panel.tsx` |
| M0-AC-23 | Boundary check | PASS | check-boundaries |
| M0-AC-24 | Round-trip tests | PASS | project/world tests |
| M0-AC-25 | Clean load, no unexpected console errors | PASS | I-06 harness 51/51 |
| M0-AC-26 | Performance measured 0/10/50/100 | PASS | i09-perf-result.json |

## 4. ACG-01–ACG-04 Verification

- **ACG-01:** NOT VERIFIED — screenshots captured (`i09-1024x640-*.png`, `i09-1440x900-*.png`); requires Project Owner visual inspection. Status remains DEFERRED until visual confirmation.
- **ACG-02:** PASS — tertiary contrast 4.80/5.35/5.60 ≥4.5:1 (check-tokens).
- **ACG-03:** PASS — `shortcuts/audit.md` (I-06+I-07).
- **ACG-04:** PASS (audit) — no "60 fps" literal; Program/Monitor "Planned".

## 5. Keyboard-only and Accessibility Results

**Status: PASS** — satisfied by Project Owner manual keyboard-only verification in Chrome, supported (not replaced) by implementation review and a transient automation run.

### 5.1 Evidence sources (kept separate)

| Source | What it establishes | Artifact |
| --- | --- | --- |
| Implementation review | Focus-ring CSS rules present (`.sf-btn`, `.sf-icon-btn`, `.sf-hierarchy-row`, `input/textarea/select`); `Dialog.tsx` implements initial focus, Tab/Shift+Tab trap, Escape close, focus restore; `Panel.tsx` renders panel body only when expanded, so collapsed content is not tabbable; `useStudioShortcuts` guards editable targets via `isEditableTarget` | `app/src/styles/shell.css`, `app/src/ui/common/Dialog.tsx`, `app/src/ui/shell/Panel.tsx`, `app/src/ui/hooks/useStudioShortcuts.ts` |
| Automated browser run (supporting) | Tab sequence traversed canvas → File/Edit/View → Build/Program/Simulate → Project Hub/Save/Export; Delete opened the dialog with focus on Cancel; Escape closed it; focus returned to the invoking control. No keyboard trap in the 10-step sequence | Transient CDP harness output recorded in `FINAL_OWNER_VERIFICATION_PREPARATION.md` §6; the temporary script was removed and its output was not committed as a machine-readable artifact |
| Project Owner manual verification (primary) | 11 manually observed checks in Chrome, listed in §5.2 | Owner-reported results recorded in `FINAL_OWNER_VERIFICATION_PREPARATION.md` §5.1 |

### 5.2 Project Owner manual keyboard-only matrix (Chrome)

| # | Test | Result |
| --- | --- | --- |
| 1 | Tab navigation through interactive controls | PASS |
| 2 | Visible focus indicator | PASS |
| 3 | Shift+Tab reverse navigation | PASS |
| 4 | Delete dialog opens | PASS |
| 5 | Initial dialog focus on Cancel | PASS |
| 6 | Tab remains inside dialog | PASS |
| 7 | Shift+Tab remains inside dialog | PASS |
| 8 | Escape closes dialog | PASS |
| 9 | Focus returns to invoking control | PASS |
| 10 | Collapsed panel content is skipped by keyboard navigation | PASS |
| 11 | Inspector input accepts keyboard editing without Studio shortcut interference | PASS |

No failures were reported, so no targeted source fix was required for M0-AC-22. Focus-visible styling for text inputs had already been added earlier under commit `4ae47c7`.

Reduced-motion media query remains in place in `shell.css`.

## 6. Reduced-motion Results

`@media (prefers-reduced-motion: reduce)` added to `shell.css`, neutralizing animations/transitions. No functional regression.

## 7. Performance Benchmark Results

See `evidence/i09-perf-result.json`. Median frame ~6.9–7.0 ms across 0/10/50/100 entities; p95 ~7.8–9.4 ms. No numeric target claimed (none defined). WebGL 2, no context loss during sampling.

## 8. Regression Test Results

- typecheck PASS
- tests 71/71 PASS
- check PASS
- build PASS
- I-06 harness 51/51
- I-04 regression 26/26

## 9. Visual Evidence

Screenshots: `i09-1024x640-build/program/simulate.png`, `i09-1440x900-build/program/simulate.png`.

## 10. DOM/Network Audit

No "60 fps" literal in source. No external network requests expected (static bundle). Production build succeeds.

## 11. Risk Register

R-1..R-5 carried forward; R-3 (no performance baseline) now has evidence. R-1/R-2/R-5 remain open pending further verification.

## 12. Known Limitations

- ACG-01 pending Project Owner visual verification (the only remaining MVP-0 blocker).
- M0-AC-22 closed by Project Owner manual verification; automation of the full keyboard-only pass remains a manual step by design (no committed machine-readable keyboard artifact).
- Layout persistence, Project Hub browser automation, unsaved-changes (I-07) remain.
- Console log sources limited (I-08).

## 13. Git Commit and Push Status

Documentation-only closure of M0-AC-22; commit and push reported in the closure summary.

## 14. Final Verdict

**MVP-0 NOT ACCEPTED** — ACG-01 (visual layout) is NOT VERIFIED pending Project Owner visual inspection of the captured screenshots. M0-AC-22 is now PASS on combined Project Owner manual evidence and implementation review. Once Project Owner confirms visual usability of all three presets at 1024×640, ACG-01 can be marked PASS and the MVP-0 verdict revisited.