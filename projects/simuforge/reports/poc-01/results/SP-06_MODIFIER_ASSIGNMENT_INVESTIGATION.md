# SP-06 Modifier Assignment Investigation

Date: 2026-11-03
Scope: Read-only investigation of modifier assignment for camera navigation. No SP-06 executed. No acceptance criteria changed.

## 1. Summary

Modifier delivery via CDP trusted input is **confirmed working** on Windows/Chrome. Ctrl+left-drag sets `ctrlKey=true`; Alt+left-drag sets `altKey=true`. Both produce `isTrusted=true`, `pointerType="mouse"`. No browser/OS interference observed in the tested environment.

**Decision 1 (modifier assignment) can be considered empirically verified within the tested environment (Windows 10, Chrome 156, CDP trusted input).** Generalization to other OS/browser combinations is not claimed.

## 2. Empirical evidence

Source: `sp-06-probe/evidence/sp-06_modifier_validation.json` (P1 follow-up, 2026-11-03).

| Gesture | Modifiers sent | DOM event modifier state | isTrusted | pointerType | Classified as | Camera delta |
| --- | --- | --- | --- | --- | --- | --- |
| Plain left-drag | 0 | ctrlKey=false, altKey=false | true | mouse | orbit | alpha +1.001, beta 0, radius 0, target 0 |
| Ctrl+left-drag | 2 (Ctrl) | ctrlKey=true, altKey=false | true | mouse | pan | alpha 0, beta 0, radius 0, target (−0.707, 0, +0.707) |
| Alt+left-drag | 1 (Alt) | ctrlKey=false, altKey=true | true | mouse | orbit | alpha +1.001, beta 0, radius 0, target 0 |
| Right-drag | 0 (button 2) | ctrlKey=false, altKey=false | true | mouse | pan | alpha 0, beta 0, radius 0, target (−0.706, 0, +0.706) |

## 3. Default Babylon 9.32.1 behavior (verified)

| Input | Function |
| --- | --- |
| Plain left-drag | orbit (rotate) |
| Ctrl+left-drag | pan |
| Alt+left-drag | orbit (via wildcard match of plain rotate entry) |
| Right-drag | pan |
| Wheel up | zoom in (radius decreases) |
| Wheel down | zoom out (radius increases) |

## 4. Investigation: what was uncertain

The earlier P1 modifier tests (2026-11-03, first run) produced mixed results: Ctrl+left-drag changed radius (−2.26) and target (+0.556), not a pure pan. Root cause: **inertia residual** — the probe recorded camera state immediately after the drag without waiting for inertia to settle (150 ms sleep vs. 1434 ms measured settle). After adding settle delay (2100 ms), Ctrl+left-drag correctly pans (target changes, radius unchanged).

Alt+left-drag orbits (not pans) because Alt is a wildcard in the plain rotate entry (no explicit alt+left entry exists). This is expected per Babylon docs (omitted condition fields are wildcards).

## 5. Browser/OS shortcut conflicts

Tested on Windows 10 / Chrome 156:
- Ctrl+left-drag: no browser interference (Ctrl+click on canvas is not a browser shortcut).
- Alt+left-drag: no OS window movement or browser navigation (Alt+Left is back-navigation only for the arrow key, not mouse drag).
- Right-drag: no context menu blocking (Babylon's `attachControl` handles `contextmenu`).
- All events arrived as trusted (`isTrusted: true`, `pointerType: "mouse"`).

**Limitation:** Only tested on Windows 10 / Chrome 156. Generalization to other OS/browser combinations is not claimed.

## 6. Unresolved

- Whether modifier delivery remains reliable under different timing (modifier pressed after pointer down). Not tested.
- Whether Alt+drag triggers OS-level behavior on other platforms. Not tested.
- Whether the modifier bits are consistently set during the full drag (only pointerdown was recorded; pointermove events showed the same modifier state in this probe).

## 7. Recommendation

**Decision 1 (modifier assignment) can be considered empirically verified within the tested environment** for the default behavior. The owner-approved default (Ctrl+left=pan, Alt+left=orbit, plain left=orbit, right=pan) is supported by evidence.

If the owner prefers the originally proposed rebind (ctrl+left=orbit, alt+left=pan), additional validation of entry ordering and gizmo interaction is required.

## 8. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).
- No acceptance criterion changed.
- No source/harness/runner modified.