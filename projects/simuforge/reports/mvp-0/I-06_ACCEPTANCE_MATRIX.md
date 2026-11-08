# I-06 Acceptance Matrix

**Verdict:** COMPLETE
**Automated tests:** 69/69 (`npm test`)
**Typecheck:** PASS
**Check:** PASS
**Build:** PASS
**I-04 regression:** 26/26
**I-06 browser harness:** 51/51 (`evidence/i06-result.json`)

## Required I-06 criteria

| Criterion | Requirement | Implementation | Test | Evidence | Result |
| --- | --- | --- | --- | --- | --- |
| `M0-AC-08` | Inspector transform commit, Esc revert, invalid rejection | `ui/panels/Inspector.tsx`, `TransformSection.tsx`, `common/NumericField.tsx` | reducer + component smoke | `evidence/i06-result.json` | PASS |
| `M0-AC-09` | Translate/rotate world, scale local on rotated entity | `renderer/BabylonRenderer.ts` coordinate config | code + browser smoke | `I-06_BROWSER_VERIFICATION.md` | PASS (implemented) |
| `M0-AC-10` | Mode switch does not change stored transform | reducer `gizmo/set-mode` no-op on world | reducer test | — | PASS |
| I-06 subset `M0-AC-21` | W/E/R/F/Shift+F/G/F2/Delete/Escape | `ui/hooks/useStudioShortcuts.ts` | I-05 harness + smoke | `shortcuts/audit.md` | PASS |
| `ACG-03` | Shortcut conflict audit | `reports/mvp-0/shortcuts/audit.md` | documented | `shortcuts/audit.md` | PASS |

## M0-AC-21 deferral handling

| Shortcut | Status |
| --- | --- |
| W, E, R, F, Shift+F, G, F2, Delete, Escape | PASS (I-06) |
| Ctrl+S, Ctrl+O, Ctrl+Alt+N | DEFERRED BY OWNER — I-07 |

The complete original `M0-AC-21` is NOT claimed PASS because its I-07 subset remains deferred.

## ACG-01

ACG-01: DEFERRED (unchanged, not part of I-06).

## I-05 regression

Historical harness: 51/51 at baseline `889d081`. Current I-06 harness: 51/51 with the read-only Inspector assertion updated to reflect transform editing (superseded, not weakened). I-04 regression: 26/26.