# I-07 Acceptance Matrix

**Verdict:** COMPLETE
**Automated tests:** 71/71
**Typecheck:** PASS
**Check:** PASS
**Build:** PASS
**I-06 regression:** 51/51
**I-04 regression:** 26/26

## Required I-07 criteria

| Criterion | Requirement | Implementation | Result |
| --- | --- | --- | --- |
| `M0-AC-13` | Save writes one validated record; dirty clears only after success | `storage/*`, `StudioShell.handleSave`, reducer save state machine | PASS (unit) |
| `M0-AC-14` | Reopen restores IDs, names, types, transforms within 1e-6 | `parseProjectDocument`, `project/open`, renderer applyWorld | PASS (unit) |
| `M0-AC-15` | Project Hub lists newest first; empty/loading/error states | `ui/hub/ProjectHub.tsx` | PASS (manual/browser) |
| `M0-AC-16` | Corrupt/unsupported rejected without changing current project | validation + atomic open | PASS (unit) |
| `M0-AC-17` | Save failure keeps project + dirty + Retry + Export Copy | `handleSave` failure path | PASS (unit) |

## M0-AC-21 I-07 subset

| Shortcut | Status |
| --- | --- |
| Ctrl+S | PASS |
| Ctrl+O | PASS |
| Ctrl+Alt+N | PASS |

## ACG-01

ACG-01: DEFERRED (unchanged).

## I-06 regression

51/51 PASS (harness updated to reflect Project Hub UI availability).