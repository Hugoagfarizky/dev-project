# I-04 Closure Record

**Status:** Accepted baseline
**Baseline commit:** `cd330659c846e07ad67b3551251005cb2127cb75`
**Recorded during:** I-05 preflight

## Purpose

I-04 delivered the Babylon renderer adapter and the viewport integration that
I-05 builds on. This record anchors the accepted I-04 baseline so that the I-05
evidence can distinguish pre-existing behavior from I-05 changes.

## Preflight facts

- Branch: `main`
- Working tree: clean
- Local HEAD = `origin/main` = `cd33065`
- I-04 browser harness: `verify-i04-regression.cjs` (in `evidence/`)
- I-04 regression result at the end of I-05 work: **26/26 PASS**

## I-04 scope covered by the baseline

- WebGL 2 engine, Babylon scene, ArcRotateCamera with radius/beta clamps.
- Canvas tracking and renderer resize handling.
- Grid and editor-only objects excluded from the world model.
- Entity mesh reconciliation from world snapshots.
- Viewport picking with click-versus-drag threshold.
- Selection highlight and gizmo attachment.
- Context loss detection, fallback overlay, and in-place context restoration.
- Renderer diagnostics (`webGlVersion`, `meshCount`, `entityCount`, `contextLost`).

## I-04 regression checklist (all pass)

| # | Check |
| --- | --- |
| 1 | Renderer initializes WebGL 2 |
| 2 | Fixture entities have one mesh each |
| 3 | Mesh positions match entity transforms |
| 4 | Projected click coordinates hit the intended meshes |
| 5 | Plain left click on cube selects the cube |
| 6 | Plain left click on empty space clears selection |
| 7 | Plain left click on sphere selects the sphere |
| 8 | Left drag beyond threshold does not pick |
| 9 | Left drag does not orbit the camera |
| 10 | Left click without a prior mousemove picks correctly |
| 11 | Selection highlight follows selection |
| 12 | Selection changes rendered pixels |
| 13 | Selection does not change transforms |
| 14 | `WEBGL_lose_context` is available and loss was requested |
| 15 | Context loss is detected |
| 16 | Babylon prevents the default context-lost behavior |
| 17 | Context-loss fallback UI appears |
| 18 | Canvas element stays mounted during fallback |
| 19 | `restoreContext` is requested |
| 20 | Context restoration is detected |
| 21 | Renderer engine/scene/canvas are not recreated or duplicated |
| 22 | Observers/listeners are not duplicated |
| 23 | Highlight state survives restoration |
| 24 | Diagnostics reflect restored renderer state |
| 25 | Restored renderer draws a non-empty viewport |
| 26 | Picking still works after restoration |

## I-05 renderer conformance follow-up

The I-05 readiness review required the renderer to satisfy POC-01 lighting and
plane rules. Commit `4eacb0f` hardened the renderer without changing the accepted
I-04 interaction model:

- No world light is created.
- Primitives and grid use unlit/emissive materials.
- The grid is an unlit fill plus a contrasting line grid.
- The Plane is created on XZ with a +Y normal and rendered double-sided.
- Grid and material resources are disposed with their meshes.

The 26 I-04 checks above were re-run against the I-05 build and still pass, which
is the evidence that I-05 preserved the accepted I-04 behavior.

## Decision

The I-04 baseline is accepted as the prerequisite for I-05. Any behavior listed
as deferred in `I-05_REMAINING_LIMITATIONS.md` is explicitly outside I-05 and is
tracked for later increments.
