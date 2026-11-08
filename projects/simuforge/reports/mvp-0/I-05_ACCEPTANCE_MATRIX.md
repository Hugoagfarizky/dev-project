# I-05 Acceptance Matrix

**Verdict:** PASS
**Browser harness:** 51/51 checks in `evidence/i05-result.json`
**Unit tests:** 68/68 (`npm test`)
**Gate commands:** `npm run typecheck`, `npm test`, `npm run check`, `npm run build`
**Renderer conformance:** 14/14 (`evidence/phase1-result.json`)
**I-04 regression:** 26/26 (`evidence/verify-i04-regression.cjs`)

Check numbers below refer to the numbered list in `I-05_BROWSER_VERIFICATION.md`.

## 1. Acceptance criteria

| Criterion | Requirement (MVP-0 plan) | Evidence | Result |
| --- | --- | --- | --- |
| M0-AC-05 | Empty project test and screenshot | Browser checks 1-7; `evidence/i05-1440-empty.png` | PASS |
| M0-AC-06 | Primitive default and UUID test | Browser checks 8-18; reducer tests "entity/create selects the new entity", "entity/create uses the POC-01 default transforms", "default names use the numeric suffix sequence"; `evidence/i05-1440-primitives.png` | PASS |
| M0-AC-07 | Cross-surface selection test | Browser checks 15-16 and 19-23; store tests for selection-only reference stability | PASS |
| M0-AC-12 | Rename and confirmed-delete test | Browser checks 24-36; reducer tests for trim/reject/duplicate/delete semantics; `evidence/i05-1440-delete-dialog.png` | PASS |

## 2. I-05 test list

| Plan test | Evidence | Result |
| --- | --- | --- |
| New project shows zero entities, empty Hierarchy, empty Inspector, and the overlay | Checks 1-4; `i05-1440-empty.png` | PASS |
| Each primitive uses the specified default transform and a unique UUID | Checks 8, 9, 12-15, 18 | PASS |
| Viewport click updates Hierarchy and Inspector | Check 19 | PASS |
| Hierarchy click updates the viewport outline and Inspector | Check 21 | PASS |
| Empty-space click clears selection | Check 20 | PASS |
| Rename updates both surfaces and does not change ID or transform | Checks 26-27, 29 | PASS |
| Delete requires confirmation; cancel keeps the entity; confirm clears selection | Checks 30-34 | PASS |
| Deleting the selected entity resets the Inspector | Check 34 | PASS |

## 3. Exit criteria

| Exit criterion | Evidence | Result |
| --- | --- | --- |
| M0-AC-05, M0-AC-06, M0-AC-07, M0-AC-12 pass | Sections 1 and 2 above | PASS |
| The Hierarchy cannot display an entity that is not in the world | Check 36 compares Hierarchy rows with the world entities; the Hierarchy renders directly from `selectEntities` | PASS |
| No component, behavior, or runtime section is rendered | Checks 46-49: no Components/Behavior/Runtime/Simulation text, no transform inputs, no persistence UI, no simulation controls | PASS |

## 4. Readiness conditions

All mandatory I-05 readiness conditions were addressed:

| Condition area | Implementation | Evidence |
| --- | --- | --- |
| Renderer conformance: unlit/emissive materials, grid, XZ double-sided Plane, no world light | `4eacb0f` | Phase-1 harness 14/14; browser checks 5, 15-18 |
| Editor semantics: structural sharing, create auto-select, suffix names, rename rules, delete rules, camera no-op | `ab11fc5` | 68 unit tests; browser checks 8-14, 23-29, 34-36 |
| Reusable UI foundation: Button, Dialog, InlineRename, shortcuts | `0ddff08` | Browser checks 24-25, 30-33 |
| Integrated authored-object UI: Asset Library, Hierarchy, Inspector, Empty World overlay, cross-surface selection, delete confirmation | `9a57cde` | Browser checks 1-49 |
| Preserved presets, responsive layout, canvas/renderer lifecycle, context-loss behavior | `9a57cde` | Browser checks 5, 7, 39-45; I-04 regression 26/26 |
| Chrome 156 verification with console and mesh-count evidence | This run | Browser checks 50-51; `i05-result.json` |

## 5. Requirement traceability (Spotlight)

| Requirement | Evidence | Result |
| --- | --- | --- |
| Creation auto-selects the new entity | Checks 8, 16 | PASS |
| Default names use the suffix sequence | Check 12; reducer tests | PASS |
| Rename trims, rejects empty/whitespace-only, max 128 after trim | Checks 26, 29; reducer tests | PASS |
| Rename preserves ID and transform | Check 27 | PASS |
| Duplicate names allowed | Reducer test "rename allows duplicate names" | PASS |
| Delete requires confirmation; cancel keeps entity; image/selection reset | Checks 30-34 | PASS |
| Deleting a non-selected entity preserves selection | Check 35; reducer tests | PASS |
| Camera updates must not re-render Hierarchy or Inspector | Check 23 (zero DOM mutations across six camera updates); store tests | PASS |
| Stable snapshots and structural sharing | 68 unit tests; browser check 23 | PASS |
| Empty World overlay offers Cube/Sphere/Plane and disappears on create | Checks 4, 8-11, 37 | PASS |
| Inspector identity, read-only ID, name, transform placeholder, no editing | Checks 15-16, 46-47 | PASS |
| No-selection Inspector Add Cube | Check 3 (button present); creation path covered by check 8 | PASS |
| F2 rename and Delete confirmation keyboard access | Checks 24-25, 30 | PASS |
| Escape cancels dialog | Check 33 | PASS |
| Overlay does not block viewport pointer input | Check 7 (right-drag pan through the overlay) | PASS |
| Mesh count equals entity count after cycles | Checks 15, 34, 37, 50 | PASS |
| Context loss and restoration preserve renderer identity | Checks 39-40 | PASS |
| 1024x640 and 1440x900 layouts | Checks 6, 41-43 | PASS |
| Build/Program/Simulate presets preserved | Check 45 | PASS |
| No unexpected console errors | Check 51 (only the Vite favicon 404) | PASS |

## 6. Gate commands

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | PASS | No TypeScript errors |
| `npm test` | PASS | 68 tests, 0 failures |
| `npm run check` | PASS | Node version, typecheck, boundaries, token contrast |
| `npm run build` | PASS | Vite build; only the pre-existing >500 kB chunk warning |
| I-05 browser harness | PASS | 51/51 |
| Phase-1 renderer conformance harness | PASS | 14/14 |
| I-04 regression harness | PASS | 26/26 |

## 7. Artifacts

- `evidence/i05-result.json` - every browser result, console log, error, and final state.
- `evidence/verify-i05.cjs` - exact I-05 acceptance harness.
- `evidence/verify-phase1.cjs`, `evidence/phase1-result.json` - renderer conformance.
- `evidence/verify-i04-regression.cjs` - I-04 regression harness.
- Six screenshots listed in `I-05_BROWSER_VERIFICATION.md`.

## 8. Decision

I-05 is **COMPLETE**. Every exit criterion and every assigned M0 acceptance
criterion has recorded evidence. I-06 has not been started.
