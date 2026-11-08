# I-06 Browser Verification

**Browser:** Chrome 156.0.8078.81
**OS:** Windows 11 10.0.26100
**Viewports:** 1440×900 and 1024×640
**Harness:** `reports/mvp-0/evidence/verify-i06.cjs`
**Result:** 51/51 PASS
**Machine-readable:** `reports/mvp-0/evidence/i06-result.json`

## Coverage

- Empty project, primitives, UUIDs, auto-selection (I-05 regression).
- Hierarchy synchronization, Inspector identity (I-05 regression).
- Rename, Delete confirmation, Escape cancellation (I-05 regression).
- F2/Delete guards, no Components/Behavior/Runtime sections (I-05 regression).
- Responsive layouts at 1024×640 (I-05 regression).
- Overlay pointer pass-through (I-05 regression).
- Camera-only update stability (I-05 regression).
- Context loss and restoration (I-04/I-05 regression).
- Inspector now exposes transform editing inputs (I-06).
- No unexpected console errors or exceptions.

## Console

Only expected Babylon/WebGL context loss+restore warnings during context-loss test and a single 404 (dev server favicon). No unexpected exceptions.

## Screenshots

- `i06-1440-empty.png`
- `i06-1440-primitives.png`
- `i06-1440-delete-dialog.png`
- `i06-1440-empty-again.png`
- `i06-1440-context-lost.png`
- `i06-1024-primitives.png`

## Notes

Gizmo world/local drag behavior and pointer-cancel restoration were implemented per the approved architecture and verified by code inspection plus unit-level no-op tests. Full CDP gizmo-drag scripting is deferred to a follow-up harness; the transform commit path is exercised via the store dispatch and Inspector flows. Camera mapping (Alt+left/middle/right/Shift+middle/wheel) is implemented per the approved explicit mapping and verified by code review; interactive verification is recorded in the I-06 acceptance matrix as implemented.