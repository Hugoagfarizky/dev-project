# SP-06 Modifier Validation Report

Date: 2026-11-03
Scope: Empirical modifier investigation (read-only). No SP-06 full execution. No acceptance criteria changed.

Probe: `sp06-modifier-settle.js` (P1 follow-up) using trusted CDP input on `sp06-probe.html`.
Evidence: `projects/simuforge/reports/poc-01/results/sp-06-probe/evidence/sp-06_modifier_validation.json`

## 1. Verified facts

| Gesture | Modifiers sent | DOM event received | isTrusted | pointerType | Classified as | Camera delta |
| --- | --- | --- | --- | --- | --- | --- |
| Plain left-drag | none (0) | ctrlKey=false, altKey=false | true | mouse | orbit | alpha +1.00097, beta 0, radius 0, target 0 |
| Ctrl+left-drag | 2 (Ctrl) | ctrlKey=true, altKey=false | true | mouse | pan | alpha 0, beta 0, radius 0, target (−0.707, 0, +0.707) |
| Alt+left-drag | 1 (Alt) | ctrlKey=false, altKey=true | true | mouse | orbit | alpha +1.00070, beta 0, radius 0, target 0 |
| Right-drag | 0 (button 2) | ctrlKey=false, altKey=false | true | mouse | pan | alpha 0, beta 0, radius 0, target (−0.706, 0, +0.706) |

## 2. Factual findings

1. **CDP modifier delivery works.** `Input.dispatchMouseEvent` with `modifiers: 2` produces a DOM event with `ctrlKey: true`; `modifiers: 1` produces `altKey: true`. Both are `isTrusted: true` with `pointerType: "mouse"`. (M6 partially resolved.)
2. **Plain left-drag orbits** (default map: button 0 → rotate). Expected.
3. **Ctrl+left-drag pans** (default map: ctrl+left → pan). Expected. Radius and target behavior consistent with pan (target changes, radius unchanged).
4. **Alt+left-drag orbits**, not pans. This is expected per Babylon docs: omitted condition fields are wildcards, so the plain rotate entry (button 0, no modifier constraint) matches Alt+left-drag. There is no default alt+left entry for pointer.
5. **Right-drag pans** (default map: button 2 → pan). Expected.
6. **No browser/OS interference observed.** No navigation, no context-menu blocking, no window movement. All four gestures produced trusted pointer events and the expected camera response. (M1 partially resolved for Windows/Chrome.)
7. **Zoom target shift (P1) was test methodology.** Follow-up zoom probe confirmed target delta = 0 when zooming at the projected target center (493, 348.5). `zoomToMouseLocation` is false by default.

## 3. Unverified / suspected

- Whether Ctrl/Alt modifier delivery remains reliable under different timing (e.g., modifier pressed after pointer down). Not tested.
- Whether Alt+drag triggers OS-level behavior on other platforms (tested only on Windows 10).
- Whether the modifier bits are consistently set during the full drag (only pointerdown was recorded; pointermove events showed the same modifier state in this probe).

## 4. Interpretation

Default Babylon 9.32.1 behavior:
- Plain left-drag → orbit
- Ctrl+left-drag → pan
- Alt+left-drag → orbit (via wildcard match of plain rotate entry)
- Right-drag → pan
- Wheel → zoom

The proposed input map in the draft (ctrl+left = orbit, alt+left = pan) would **rebind** these. This is feasible via `setInteraction`/`addEntry` (documented), but:
- It changes the default behavior users expect from Babylon.
- It requires careful entry ordering (more specific entries before less specific ones).
- It must be validated that the rebind does not break gizmo drag (P5 already verified gizmo survival with a removed rotate entry, but not with a full rebind).

## 5. Recommendation

- **Decision 1 (modifier assignment) remains PROVISIONAL.**
- Option A (recommended): Keep default behavior (ctrl+left = pan, alt+left = orbit). No rebind needed; only remove plain-left-drag rotate for selection. Simpler, lower risk.
- Option B: Rebind as proposed (ctrl+left = orbit, alt+left = pan). Requires additional validation of entry ordering and gizmo interaction.
- Final modifier assignment is a product decision (Project Owner).

## 6. Status

- SP-05: BLOCKED (unchanged).
- SP-06: NO-GO (unchanged).
- Decision 1: PROVISIONAL.
- No acceptance criterion changed.
- No source/harness/runner modified.