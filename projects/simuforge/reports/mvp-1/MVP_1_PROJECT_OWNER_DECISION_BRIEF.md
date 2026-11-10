# SimuForge — MVP-1 Project Owner Decision Brief

> **Decision status update (2026-11-10):** Owner decisions D-01..D-06 APPROVED. See `MVP_1_OWNER_DECISIONS.md`.

**Date:** 2026-11-10  
**Type:** Read-only decision preparation (no source/config/test changes; no commit/push)  
**Status:** MVP-1 implementation NOT AUTHORIZED

## 1. Executive recommendation

MVP-1 should begin with a **narrow, deterministic, in-house physics layer** built on the existing Babylon.js v9 renderer and the MVP-0 component/serialization foundation, limited to §7.3 (Components & Basic Physics). Recommend: in-house fixed-timestep integrator + primitive colliders + attached component list + explicit runtime state machine. All six decisions below are **PROPOSED** and require Project Owner approval.

## 2. Six decision proposals

1. **Physics engine:** PROPOSED — in-house implementation (no new dependency). Babylon's default physics plugin (CannonJS) is not installed; adding it requires a new dependency + ADR. In-house keeps determinism and ADR 0002 compliance.
2. **Component model:** PROPOSED — attached component list on `WorldEntity` (not ECS). Lower risk, fits existing serialization, sufficient for MVP-1.
3. **Collision:** PROPOSED — primitive colliders (sphere/box/plane) only; mesh collision and CCD deferred.
4. **Simulation lifecycle:** PROPOSED — Editing/Running/Paused with Play/Pause/Stop/Reset; structural edits blocked while Running/Paused; runtime state not persisted (ADR 0003).
5. **Demo scope:** PROPOSED — ball + rigid body + gravity + floor collision + button impulse (validates §7.3 and seeds MVP-3).
6. **Performance:** PROPOSED — measure at 10/50/100 entities with physics; no numeric target before measurement (mirror M0-AC-26).

## 3. Physics library comparison

| Candidate | Compatibility | TS support | License | Bundle/runtime | Rigid+primitive colliders | Determinism | Risk |
|---|---|---|---|---|---|---|
| In-house (recommended) | Native (no plugin) | First-class | N/A (own code) | Minimal | Yes (implemented by us) | Full control (fixed timestep) | Implementation effort, correctness |
| Babylon CannonJSPlugin | Requires `@babylonjs/cannonjs` + cannon-es (not installed) | Types available | MIT | +~200KB WASM/JS | Yes | Plugin-dependent | Version lock, plugin lifecycle |
| Babylon AmmoJSPlugin | Requires ammo.js WASM (~1MB) | Types available | zlib (Ammo) | Large | Yes | Plugin-dependent | Large bundle, WASM loading |
| Havok (Babylon 6+) | Requires `@babylonjs/havok` (not installed, commercial license) | Types available | Commercial | Large | Yes | Plugin-dependent | License cost, overkill for MVP-1 |

**Recommendation:** in-house. Avoids new dependency, keeps bundle small, deterministic, aligns with ADR 0002. Revisit library if scope expands (MVP-2/3).

## 4. Proposed component contract

Minimum viable (PROPOSED, not implemented):
- `WorldEntity` gains optional `components: Component[]` (or a separate `components` map keyed by entity id).
- `Component` base: `{ id: string; type: string; enabled: boolean }`.
- `RigidBodyComponent`: `{ type: 'rigidBody'; mass: number; useGravity: boolean; collider: { kind: 'sphere'|'box'|'plane'; size: Vec3 | number }; velocity: Vec3; angularVelocity: Vec3 }`.
- Component ids are UUIDs (reuse existing UUID generation).
- Serialization: components are part of `WorldEntity` → persisted in `ProjectDocument` envelope (ADR 0003). Runtime state (velocity during play) is **not** persisted; reset restores initial.
- Lifecycle: components added/removed via store dispatch (`component/add`, `component/remove`, `component/set`); reducer validates.
- World boundary guard: `src/world/**` must not import Babylon/React/DOM (M0-AC-23). Physics integration lives in renderer/runtime layer, not in world module.

## 5. Collision and simulation lifecycle boundary

- Colliders: sphere (radius), box (size), plane (infinite). Primitive only.
- Rigid bodies: static (immovable) and dynamic (affected by gravity/forces).
- Gravity: uniform vector (default (0,-9.81,0)), applied to dynamic bodies.
- Force/impulse: applied to a target rigid body; logged to Console.
- Lifecycle states: `Editing` (default), `Running`, `Paused`.
  - Play (Ctrl+Enter): snapshot initial state → Running; structural edits blocked.
  - Pause (Ctrl+Shift+Enter): Running ↔ Paused.
  - Stop (Shift+F5): Running/Paused → Editing (optionally reset).
  - Reset (Ctrl+Shift+F5): restore initial snapshot.
- Structural edits blocked while Running/Paused; runtime-marked controls remain usable.
- Runtime state (velocities, paused flag) is editor/runtime state, not persisted (ADR 0003).
- Hidden dependency: transform commits from gizmo/Inspector must be suppressed or queued while Running.

## 6. Demo and performance targets

- Minimal demo: ball (sphere + rigid body) + floor (plane collider) + button (force trigger) — validates §7.3 and seeds MVP-3.
- Object-count test levels: 10 / 50 / 100 entities with physics (mirror M0-AC-26).
- Frame rate: measure; no numeric target claimed before measurement (M0-AC-26 policy).
- Test conditions: Chrome 156 on Windows 11, 1440×900 and 1024×640, empty world baseline.
- Evidence: unit tests (integrator, collision, state machine), CDP browser harness (controls, gating), JSON + screenshots under `reports/mvp-1/evidence/`.

## 7. M1-A readiness conditions

| # | Condition | Current evidence | Blocks M1-A? | Recommended resolution |
|---|---|---|---|---|
| 1 | Physics engine decision | This brief (§3) | Yes | Approve in-house |
| 2 | Component model decision | This brief (§4) | Yes | Approve attached list |
| 3 | Collision scope decision | This brief (§5) | Yes | Approve primitives only |
| 4 | Demo scope decision | Product spec §7.7 + this brief §6 | Yes | Approve ball-floor-button |
| 5 | Performance targets | M0-AC-26 policy | No | Measure, no premature target |
| 6 | M1-A authorization | Not yet granted | Yes | Owner approval required |

**M1-A readiness: READY WITH CONDITIONS** (conditions 1–4 and 6 are Owner decisions; 5 is policy).

## 8. Explicit Project Owner decisions required

1. Approve in-house physics (or choose library + ADR).
2. Approve attached component list (or ECS).
3. Approve primitive colliders (or expand scope).
4. Approve minimal demo scope.
5. Confirm no numeric performance targets (measurement only).
6. Authorize M1-A implementation.

## 9. Proposed next authorization scope (if approved)

- M1-A only: component system + storage + serialization + tests. No physics yet.
- No source changes until authorization.
- No MVP-1 implementation, no commit/push, no MVP-2/MVP-3 scope.

**MVP-1 remains NOT AUTHORIZED.**
