# SimuForge — M1-B Project Owner Decision Brief

**Date:** 2026-11-10  
**Status:** Decision proposals (NOT approved until Owner decides)  
**Milestone:** M1-B — Runtime State Machine & Structural-Edit Gating

## Decision 1: Runtime snapshot semantics

- **Why necessary:** Reset must restore a known initial state; pause/resume must not corrupt authored data.
- **Options:**
  - A (recommended): Snapshot authored transforms + component state at Play; runtime state (velocities) derived, not persisted. Reset restores snapshot.
  - B: Snapshot full runtime state including velocities; heavier, risk of stale runtime data.
- **Compatibility:** ADR 0003 (runtime state not persisted) — A aligns; B conflicts unless snapshot is in-memory only.
- **Impact:** A lower risk, simpler. B more complex, enables mid-run restore.
- **Recommendation:** A.

## Decision 2: Play/Pause/Stop/Reset semantics

- **Play:** Editing → Running; snapshot initial state; structural edits locked.
- **Pause:** Running ↔ Paused; freeze progression; resume continues.
- **Stop:** Running/Paused → Editing; optionally reset.
- **Reset:** restore initial snapshot (transforms + component state); velocities zeroed.
- **Options for Stop:** (A) Stop implies Reset (simpler); (B) Stop returns to Editing without reset (manual Reset required).
- **Recommendation:** A (Stop implies Reset) for MVP-1 simplicity.

## Decision 3: Structural-edit gating

- Structural commands (entity create/delete/rename, transform set, component add/remove/set, gizmo mode changes) blocked while Running/Paused.
- Rejected operations reported via Console (severity warn, source RUNTIME, code STRUCTURAL_EDIT_BLOCKED).
- Runtime-marked controls (Play/Pause/Stop/Reset, monitor) remain usable.
- **Options:** (A) hard block with console log (recommended); (B) soft block with toast.
- **Recommendation:** A.

## Decision 4: Runtime state vs editable project state

- Authored state (persisted): transforms, components, metadata.
- Runtime state (in-memory): velocities, paused flag, initial snapshot.
- Runtime state never persisted (ADR 0003).
- **Options:** (A) separate runtime store (recommended); (B) extend StudioState with runtime slice.
- **Recommendation:** A (separate store, simpler, avoids dirty-flag pollution).

## Decision 5: Runtime failure and recovery

- If runtime error occurs: transition to Paused or Editing, log to Console with severity/source/code/timestamp.
- No partial state commit; restore last valid snapshot on failure.
- **Options:** (A) auto-pause + log (recommended); (B) auto-stop + reset.
- **Recommendation:** A.

## Decision 6: Additional (not in original six)

- Fixed timestep value and accumulator policy: PROPOSED (recommend 1/60s, simple accumulator). Requires Owner approval.
- Runtime snapshot contents: PROPOSED (authored transforms + component initial values). Requires Owner approval.

All recommendations are PROPOSED, not approved. Only D-04 (structural edits locked in Running/Paused) is already approved.
