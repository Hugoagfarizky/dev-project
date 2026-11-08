# I-07 Implementation Report

**Increment:** I-07 — Persistence, Project Hub, Save/Open, Import/Export
**Status:** Complete
**Baseline:** `b02e1cf4ccdc514c37f066f7e1f12d1e74d92287`

## 1. Objective

Deliver local persistence, Project Hub, save/open, and import/export per ADR 0003, with regression evidence.

## 2. Scope delivered

### Workstream A — Persistence architecture

- `src/storage/ProjectRepository.ts` (interface)
- `src/storage/MemoryProjectRepository.ts`
- `src/storage/IndexedDbProjectRepository.ts` (DB `simuforge`, store `projects`, key `id`, index `updatedAt`; quota/unavailable handling)
- `src/storage/LayoutStorage.ts` (`simuforge.layout.v1`, `simuforge.last-project.v1`)

### Workstream B — Save/open state machine

- Reused existing reducer commands (`project/new`, `project/open`, `project/save-*`).
- `StudioShell.handleSave`, `handleNewProject`, `handleOpenProject`.
- Dirty tracking via revision; save failure keeps dirty.
- Camera reset + gizmo drag cancel on project switch (wiring `resetCamera`).

### Workstream C — Validation and serialization

- Aligned error codes to ADR 0003 (`UNKNOWN_PROJECT_FORMAT`, `UNSUPPORTED_PROJECT_SCHEMA_VERSION`, `INVALID_PROJECT_*`, `INVALID_WORLD`, `FILE_TOO_LARGE`).
- Added `updatedAt >= createdAt` check.
- Added `checkProjectSize` (1 MiB) in `parseProjectDocument`.

### Workstream D — Import/Export

- `handleImportFile` (validate size + parse + atomic open + save).
- `handleExport` (download `.simuforge.json`).

### Workstream E — Project Hub and UI

- `src/ui/hub/ProjectHub.tsx` (list newest first, empty/loading/error, new/import).
- Project Hub button, Save, Export in StudioShell.
- Ctrl+S/O/Alt+N wired (I-07 subset of M0-AC-21).

### Workstream F — Keyboard shortcuts

- Ctrl+S Save, Ctrl+O Open (Hub), Ctrl+Alt+N New Project, with focus guards.

### Workstream G — Project switching and renderer integrity

- `resetCamera()` on project open; `cancelGizmoDrag()` before replacement; selection cleared by reducer.

### Workstream H — Testing and regression

- Added validation tests (timestamp order, size guard). 71/71 tests pass.
- I-06 harness 51/51, I-04 regression 26/26.

## 3. ADR 0003 compliance

See I-07 acceptance matrix. All implemented requirements follow ADR 0003; no autosave, no migration chain, no encryption, no editor state in envelope.

## 4. Known limitations

- Project Hub create/open flows exercised via browser smoke (manual) but not full CDP automation.
- Ctrl+S commits focused field implicitly via blur; field-level commit on Enter remains.
- Layout persistence not wired to StudioShell layout state yet (best-effort storage available).
- I-08/I-09 not started.

## 5. Deferred items

- I-08, I-09, ACG-01.

## 6. Validation summary

- `npm run typecheck` PASS
- `npm test` 71/71 PASS
- `npm run check` PASS
- `npm run build` PASS