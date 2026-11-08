# I-06 Remaining Limitations and Deferred Scope

## Deferred by Owner (not implemented in I-06)

| Item | Owner increment |
| --- | --- |
| Ctrl+S, Ctrl+O, Ctrl+Alt+N | I-07 |
| Q shortcut | Deferred (OD-I06-06) |
| Backspace shortcut | Deferred (OD-I06-06) |
| Additional toolbar controls | Deferred (OD-I06-06) |
| ACG-01 visual layout gate | Deferred (OD-I06-07) |
| Undo/redo, multi-select, asset import | Out of MVP-0 scope |

## Observations

- Full CDP gizmo-drag scripting (world/local verification) is not yet automated; implementation follows the approved Babylon coordinate API and architecture. A follow-up harness may extend `verify-i06.cjs`.
- Pointer-cancel restoration is implemented via `pointercancel`, `lostpointercapture`, and window `blur`; browser-level synthesis of these events is not in the current harness.
- Status bar and Console remain static placeholders (I-08).
- No accessibility/performance final audit (I-09).

## Not started

I-07, I-08, I-09 remain NOT AUTHORIZED and were not started.