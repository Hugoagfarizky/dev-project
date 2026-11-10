# SimuForge — M1-B Technical Plan (Runtime State Machine)

**Date:** 2026-11-10  
**Status:** Planning only — M1-B implementation NOT AUTHORIZED  
**Approved decisions:** D-04 (structural edits only in Editing)  
**Proposed (not approved):** snapshot semantics, Play/Pause/Stop/Reset details, failure recovery, runtime store design

## Architecture

- Runtime architecture: separate in-memory runtime store (not persisted) holding velocities, paused flag, initial snapshot, and current lifecycle state.
- Relationship: authored project state (StudioStore) is the source of truth for authored data; runtime store is ephemeral and reset on Stop/Reset.
- Snapshot ownership: runtime store owns the initial snapshot (transforms + component state captured at Play).
- Integration with component system (M1-A): RigidBodyComponent initial values (mass, collider, useGravity) are authored; runtime state (velocity) lives in runtime store.
- Renderer integration: renderer applies runtime transforms during Running; gizmo/Inspector commits suppressed while Running/Paused.
- State transition model: Editing → Running → Paused → Running → Editing; Stop → Editing (implies Reset per proposed default).
- Error/recovery: on runtime error, transition to Paused, log to Console, preserve last valid state; restore snapshot on Reset.

## Lifecycle

| State | Allowed structural edits | Allowed runtime controls | Transform commits |
|---|---|---|---|
| Editing | Yes | Play | Yes |
| Running | No | Pause, Stop, Reset | No (suppressed) |
| Paused | No | Resume (Play), Stop, Reset | No (suppressed) |

Transitions:
- Editing + Play → Running (snapshot captured)
- Running + Pause → Paused
- Paused + Resume → Running
- Running/Paused + Stop → Editing (implies Reset)
- Running/Paused + Reset → restore snapshot, stay in current state? (PROPOSED: Reset restores but keeps state; Owner to confirm)
- Editing + Reset → no-op (already initial)

## Structural edit gating

Structural commands (entity create/delete/rename, transform/set, component add/remove/set, gizmo mode changes) are blocked while Running or Paused. Rejected operations logged to Console (severity warn, source RUNTIME, code STRUCTURAL_EDIT_BLOCKED). Runtime-marked controls (Play/Pause/Stop/Reset, monitor) remain usable.

## Persistence

- ADR 0003: runtime state not persisted. Initial snapshot is in-memory only.
- Saved project data = authored state only (transforms, components, metadata).
- No schema version bump for M1-B (no persisted runtime data).

## Testing

- Unit tests: state transitions, snapshot isolation, structural-edit gating.
- Integration tests: Play/Pause/Stop/Reset flow, transform suppression.
- Manual evidence: CDP browser harness for controls and gating.
- Persistence regression: existing save/open tests unchanged.
- Runtime error/recovery tests.

## Acceptance criteria

- Play transitions Editing → Running and locks structural edits.
- Pause freezes progression; resume continues from paused state.
- Stop returns to Editing.
- Reset restores initial state (transforms + component state).
- Structural edits blocked while Running/Paused (logged).
- Runtime-marked controls remain usable while Running/Paused.
- Existing 79 tests pass + new M1-B tests pass.

## Exit criteria

- All M1-B acceptance criteria pass with evidence.
- No regression in MVP-0 behavior.
- Owner approval for M1-B closure.
