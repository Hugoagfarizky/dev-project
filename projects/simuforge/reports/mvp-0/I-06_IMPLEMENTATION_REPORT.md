# I-06 Implementation Report

**Increment:** I-06 — Transform editing and keyboard floor
**Status:** Complete
**Baseline:** `889d081e41c5e6d864f4d50e0edee8a471bfb7c6`
**Final commit:** (see git log)

## 1. Objective

Deliver authored transform editing from the Inspector and gizmos under the POC-01 policy, plus the approved keyboard floor and camera mapping, with regression evidence.

## 2. Scope delivered

### Workstream A — Inspector transform editing

- `ui/common/NumericField.tsx`: draft/commit/revert, Enter/blur commit, Esc revert, inline validation.
- `ui/panels/TransformSection.tsx`: position, rotation (Euler degrees, YXZ), scale fields with YXZ help text.
- `ui/panels/Inspector.tsx`: replaced read-only placeholder with `TransformSection`.
- Rotation displayed in degrees; quaternion remains authoritative.
- `transform/set` with `source: 'inspector'`; no dirty for draft; no-op if unchanged (reducer).

### Workstream B — Gizmo coordinate space

- `renderer/BabylonRenderer.ts`: explicit coordinate modes — translate/rotate World, scale Local; `updateGizmoRotationToMatchAttachedMesh` set accordingly.

### Workstream C — Preview and commit architecture

- Preview is transient: `wiring.ts` no longer dispatches `transform/set` on preview.
- `onDragObservable` only sets a pending flag; render loop emits at most one preview per frame.
- Commit occurs once on drag end, only if transform changed.
- Pointer cancel / lost pointer capture / window blur restore the committed transform.
- Selection locked during drag (`applySelection` no-op while dragging).
- Reducer no-op for identical transform.

### Workstream D — Keyboard shortcuts and ACG-03

- `ui/hooks/useStudioShortcuts.ts`: W/E/R/F/Shift+F/G/F2/Delete/Escape with focus guards and Esc priority.
- `reports/mvp-0/shortcuts/audit.md`: ACG-03 audit.

### Workstream E — Camera mapping (LIM-I05-01)

- Explicit input map: Alt+left orbit, middle orbit, Shift+middle pan, right pan, wheel zoom, plain left selection.

### Workstream F — Frame selection and frame world

- `frameSelection`/`frameWorld` compute bounds and fit camera; empty world targets origin.

### Workstream G — State and regression integrity

- `applySelection`/`applyGizmoMode` cached to avoid churn.
- I-04 regression 26/26, I-05 regression 51/51 (superseded read-only assertion), I-06 harness 51/51.

## 3. Owner decisions (binding)

OD-I06-01..OD-I06-08 all implemented per approved resolutions. Ctrl+S/O/Alt+N, Q, Backspace, toolbar controls, ACG-01 remain deferred.

## 4. Changed files

- `app/src/editor/reducer.ts`
- `app/src/app/wiring.ts`
- `app/src/renderer/BabylonRenderer.ts`
- `app/src/renderer/RendererPort.ts`
- `app/src/ui/common/NumericField.tsx` (new)
- `app/src/ui/panels/TransformSection.tsx` (new)
- `app/src/ui/panels/Inspector.tsx`
- `app/src/ui/hooks/useStudioShortcuts.ts`
- `app/src/ui/shell/StudioShell.tsx`
- `app/src/ui/viewport/ViewportHost.tsx`
- `app/src/styles/shell.css`
- `app/test/editor/reducer.test.ts`
- `reports/mvp-0/...` (new reports, shortcuts audit, evidence)

## 5. Validation

- `npm run typecheck` PASS
- `npm test` 69/69 PASS
- `npm run check` PASS
- `npm run build` PASS
- `verify-i04-regression.cjs` 26/26
- `verify-i06.cjs` 51/51

## 6. Remaining limitations

See `I-06_REMAINING_LIMITATIONS.md`. ACG-01 remains DEFERRED. I-07 not started.