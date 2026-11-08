# ACG-03 Shortcut Conflict Audit — I-06

**Date:** 2026-11-08
**OS:** Windows 11 Home Single Language, 10.0.26100
**Browser:** Chrome 156.0.8078.81
**Application:** SimuForge MVP-0 (dev build, localhost:5173)
**Viewport tested:** 1440×900 and 1024×640

## Implemented I-06 shortcut floor

| Combination | Intended action | Actual behavior | Focus context | Result |
| --- | --- | --- | --- | --- |
| W | Translate gizmo mode | Sets gizmo mode to translate | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| E | Rotate gizmo mode | Sets gizmo mode to rotate | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| R | Scale gizmo mode | Sets gizmo mode to scale | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| F | Frame selected entity | Frames camera on selected entity bounds | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| Shift+F | Frame world | Frames camera on all entity bounds | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| G | Toggle grid visibility | Toggles grid and grid lines | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| F2 | Rename selected entity | Opens inline rename | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| Delete | Request deletion with confirmation | Opens confirmation dialog | Viewport, Hierarchy, Inspector (non-editable) | Implemented |
| Escape | Context-sensitive cancel/revert | Reverts Inspector draft, cancels drag, closes dialog, clears selection (one layer) | All contexts | Implemented |

## Focus guards

Shortcuts are suppressed when focus is inside `INPUT`, `TEXTAREA`, or a `contentEditable` element. This prevents hijacking text editing. Verified by I-05 harness (Delete ignored during rename) and I-06 smoke.

## Deferred (Owner-approved)

| Combination | Reason |
| --- | --- |
| Ctrl+S | Deferred to I-07 (persistence) |
| Ctrl+O | Deferred to I-07 (persistence) |
| Ctrl+Alt+N | Deferred to I-07 (persistence) |
| Q | Deferred by Owner (OD-I06-06) |
| Backspace | Deferred by Owner (OD-I06-06) |
| Additional toolbar controls | Deferred by Owner (OD-I06-06) |

## Reserved / browser conflicts

| Combination | Browser/OS owner | Decision |
| --- | --- | --- |
| Ctrl+W, Ctrl+T, Ctrl+N, Ctrl+Shift+N | Chrome (tab/window) | Not intercepted; left to browser |
| Alt+F4 | Windows | Not intercepted |
| F12, Ctrl+Shift+I | Chrome DevTools | Not intercepted |
| Ctrl+S, Ctrl+O | Chrome (save/open file) | Deferred to I-07; not intercepted in I-06 |
| F5, Ctrl+R | Chrome reload | Not intercepted |
| Escape in text fields | Field-level revert | Handled by NumericField; global does not duplicate |

No implemented I-06 shortcut collides with a reserved browser/OS combination. All implemented combinations were exercised in Chrome 156 on Windows 11 at 1440×900 and 1024×640. See `evidence/i06-result.json` and `I-06_BROWSER_VERIFICATION.md`.

## ACG-03 verdict

ACG-03: PASS for the I-06 shortcut subset. Full M0-AC-21 remains split (I-07 subset deferred).