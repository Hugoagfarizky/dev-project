# I-05 Browser Verification

**Result:** 51/51 PASS
**Browser:** Chrome 156.0.8078.81 on Windows 11
**Viewport:** 1440x900 (primary), 1024x640 (compact)
**WebGL:** WebGL 2, devicePixelRatio ~1.0
**Harness:** `evidence/verify-i05.cjs`
**Raw data:** `evidence/i05-result.json`

## 1. Method

The harness launches a dedicated Chrome profile through the existing POC-01 CDP
runner, attaches to `http://localhost:5173/`, and drives the real UI:

- Mouse clicks and drags use CDP input events.
- Keyboard shortcuts use CDP key events; text entry uses `Input.insertText`.
- Selection, rename, and delete checks use real viewport/Hierarchy interactions.
- Programmatic store dispatch is used only to set up transforms for unambiguous
  picking, to request the context-loss extension, and to create the context-test
  fixture.
- Projection and DOM-reading helpers (`window.__i05`) only read state and convert
  world coordinates to screen coordinates; they do not perform the assertions.

The harness records console API calls, uncaught exceptions, and error-level log
entries. It also captures six screenshots and the final state.

## 2. Results by area

### 2.1 Empty project (M0-AC-05)

| # | Check | Result |
| --- | --- | --- |
| 1 | Empty project has zero entities (0 meshes, 0 entities) | PASS |
| 2 | Empty Hierarchy shows "No objects yet" | PASS |
| 3 | Empty Inspector shows "No selection" and Add Cube | PASS |
| 4 | Empty World overlay lists Add Cube, Add Sphere, Add Plane | PASS |
| 5 | Grid fill, grid lines, camera, and WebGL 2 are available | PASS |
| 6 | 1440x900 layout fits without overflow | PASS |
| 7 | Overlay does not block camera pan outside the card | PASS |

Measured: canvas 858x763, document scroll width 1440, shell 1440x900, overlay
container `pointer-events: none` with an interactive card.

### 2.2 Primitive creation (M0-AC-06)

| # | Check | Result |
| --- | --- | --- |
| 8 | Empty World Add Cube creates and selects a Cube | PASS |
| 9 | Cube uses the POC-01 default transform | PASS |
| 10 | Overlay disappears after the first entity is created | PASS |
| 11 | Asset Library Sphere and Plane actions create their primitives | PASS |
| 12 | Default names follow POC-01: `Cube`, `Sphere`, `Plane` | PASS |
| 13 | All primitive UUIDs are unique | PASS |
| 14 | Sphere and Plane use their POC-01 default transforms | PASS |
| 15 | Created entities are visible and mesh count matches (3/3) | PASS |
| 16 | Creation auto-selects the newest Plane across surfaces | PASS |
| 17 | Viewport renders visible primitive pixels | PASS |
| 18 | Projected points resolve to the intended primitives | PASS |

### 2.3 Cross-surface selection (M0-AC-07)

| # | Check | Result |
| --- | --- | --- |
| 19 | Viewport click selects the Cube across store, Hierarchy, Inspector, and highlight | PASS |
| 20 | Empty-space click clears selection everywhere | PASS |
| 21 | Hierarchy click selects the Sphere across store, Inspector, and highlight | PASS |
| 22 | Programmatic selection updates all surfaces | PASS |
| 23 | Camera-only updates do not mutate Hierarchy or Inspector (0 mutations over six updates) | PASS |

### 2.4 Rename and delete (M0-AC-12)

| # | Check | Result |
| --- | --- | --- |
| 24 | F2 starts rename with a focused, selected input | PASS |
| 25 | Delete is ignored while the rename input is focused | PASS |
| 26 | Rename trims input and updates Hierarchy and Inspector | PASS |
| 27 | Rename preserves entity ID and transform | PASS |
| 28 | Escape cancels inline rename | PASS |
| 29 | Whitespace-only rename is rejected | PASS |
| 30 | Delete opens a confirmation dialog with the entity name | PASS |
| 31 | Destructive dialog initially focuses Cancel | PASS |
| 32 | Cancel keeps the entity, selection, and Inspector | PASS |
| 33 | Escape dismisses the delete dialog without deleting | PASS |
| 34 | Confirm removes the entity, clears selection, and resets Inspector | PASS |
| 35 | Deleting a non-selected entity preserves the selection | PASS |
| 36 | Hierarchy shows exactly the world entities | PASS |

Measured: the renamed value serialized as `Hero Cube` after typing
`  Hero Cube  `; whitespace-only and over-length names were rejected; confirming
delete left 2 entity meshes (Sphere and Plane) and an empty Inspector.

### 2.5 Lifecycle, layout, and preserved behavior

| # | Check | Result |
| --- | --- | --- |
| 37 | Overlay returns after every entity is deleted | PASS |
| 38 | Empty world resets Hierarchy and Inspector | PASS |
| 39 | Context loss shows the fallback and suppresses the empty overlay | PASS |
| 40 | Context restoration preserves the renderer instance and meshes | PASS |
| 41 | 1024x640 layout renders without the too-small guard | PASS |
| 42 | 1024x640 keeps the viewport, Hierarchy, and Inspector usable | PASS |
| 43 | 1024x640 keeps renderer diagnostics consistent (3/3) | PASS |
| 44 | Resizing preserves the canvas, engine, scene, and meshes | PASS |
| 45 | Build, Program, and Simulate presets switch without changing world, selection, or camera | PASS |

Measured at 1024x640: canvas 522x503, document 1024x640 with no overflow, three
Hierarchy rows, renderer 3/3 meshes.

Context loss: `WEBGL_lose_context` forced a loss, the fallback appeared with
"3D viewport unavailable", and `restoreContext()` restored the same canvas,
engine, scene, and three mesh IDs. No duplicate listeners or observers were
observed by the I-04 regression harness.

### 2.6 Exit criteria and closing checks

| # | Check | Result |
| --- | --- | --- |
| 46 | Inspector omits Components, Behavior, Runtime, and Simulation sections | PASS |
| 47 | Inspector exposes no transform editing inputs | PASS |
| 48 | No persistence or Project Hub UI | PASS |
| 49 | No simulation/runtime controls | PASS |
| 50 | Final renderer mesh count equals entity count (3/3) | PASS |
| 51 | No unexpected console errors or exceptions | PASS |

## 3. Console output

Five console entries were captured across the run:

| Type | Text | Disposition |
| --- | --- | --- |
| info | React DevTools download hint | Expected development message |
| log | `Babylon.js v9.32.1 - WebGL2 - Parallel shader compilation` | Expected engine banner |
| warning | `WebGL context lost.` | Intentional, from the context-loss test |
| warning | `WebGL context successfully restored.` | Intentional, from the context-loss test |
| error-level log | `Failed to load resource: 404 (Not Found)` | Pre-existing Vite favicon 404; the only error |

There were no uncaught exceptions and no other error-level entries.

## 4. Screenshots

All screenshots are at `evidence/` and show the real rendered UI.

| File | Content |
| --- | --- |
| `i05-1440-empty.png` | Empty world: empty Hierarchy, "No selection" Inspector, Empty World overlay, grid |
| `i05-1440-primitives.png` | Cube, Sphere, and Plane visible side by side; Plane selected; Inspector identity and read-only transform; 3/3 meshes |
| `i05-1440-delete-dialog.png` | Delete confirmation for "Hero Cube"; Cancel focused; Delete in danger style |
| `i05-1024-primitives.png` | 1024x640 layout with Hierarchy, viewport, Inspector, 3/3 meshes, no overflow |
| `i05-1440-empty-again.png` | Overlay restored after every entity was deleted |
| `i05-1440-context-lost.png` | Context-loss fallback with "3D viewport unavailable" and no empty overlay |

## 5. Reproducibility

```powershell
# from projects/simuforge/app
npm run dev -- --port 5173 --strictPort

# from projects/simuforge/reports/mvp-0/evidence
node verify-i05.cjs
```

The harness exits non-zero if any check fails and writes the failure details to
`i05-result.json` / `i05-harness-error.json`. The checked-in result is the run
that produced 51/51.

## 6. Additional renderer and regression evidence

- `verify-phase1.cjs` / `phase1-result.json`: 14/14 renderer conformance checks
  (no lights, unlit grid, unlit primitives, default transforms, XZ +Y normal
  plane, double-sided render and pick from below, visible primitive pixels, mesh
  reconciliation).
- `verify-i04-regression.cjs`: 26/26 I-04 checks (picking, click-versus-drag,
  highlight, context loss/restoration, renderer identity, diagnostics).
