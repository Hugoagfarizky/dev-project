# 0003. MVP-0 local persistence and project file format

- Status: accepted
- Date: 2026-11-06
- Project: simuforge
- Approval: Accepted by the Project Owner on 2026-11-06 under OD-01, OD-02, and OD-07
- Related: [ADR 0001](0001-proposed-architecture-direction.md), [ADR 0002](0002-mvp-0-technology-stack.md)
- Supersedes: None

## Context

MVP-0 must let a user create a project, build an empty world, add primitives, and save and reopen the authored result. The [Product Specification](../../projects/simuforge/docs/PRODUCT_SPECIFICATION.md) §7.2 requires local save and reopen, and the approved design adds a Project Hub with recent projects.

POC-01 defined a `simuforge.world` v1 JSON document with `entities[]` and a file export/import flow. It did not define a project record, a browser store, project identity, timestamps, or a way for the Project Hub to list recent work. MVP-0 therefore needs a durable project document and a local storage contract without inventing a second entity schema and without writing editor-only state into durable user data.

This ADR records the approved persistence architecture and project format for MVP-0. It does not implement either one.

## Decision drivers

| Driver | Consequence |
| --- | --- |
| Projects must survive a reload without a backend | Use browser-local storage |
| The Project Hub needs recents | Store project summaries with an update timestamp and index |
| The durable document must remain portable | Use one JSON file per project |
| The POC-01 world contract must be preserved | Nest the validated `simuforge.world` v1 document |
| Editor state must not leak into user data | Persist only the project envelope and world |
| A failed import must never damage current work | Validate and build a new document before replacing state |
| Unsupported files must fail clearly | Mandatory format and schema fields; reject unknown versions |
| MVP-0 must stay bounded | No migration chain, no autosave, no cloud, no collaboration |
| Data loss must be visible and recoverable | Revision-based dirty tracking and an export-copy path on save failure |

## Decision

### 1. Persistence architecture

MVP-0 uses three persistence mechanisms:

| Data | Mechanism | Purpose |
| --- | --- | --- |
| Project records | IndexedDB database `simuforge`, object store `projects` | Local save, reopen, and Project Hub recents |
| Layout preferences and last opened project | `localStorage` | Restore panel sizes, preset, collapse state, and the last project |
| Project files | `.simuforge.json` download and upload | Portability, backup, and recovery |

There is no backend, cloud service, account, synchronization, worker, or network call. Data lives in the browser origin that opened the application. The project file is the only portable artifact.

### 2. Project envelope specification

A project file is UTF-8 JSON with the extension `.simuforge.json`.

```json
{
  "format": "simuforge.project",
  "schemaVersion": 1,
  "project": {
    "id": "3f2c1a9e-8b4d-4c6f-9a1e-2d7b5c8e4f10",
    "name": "Button & Ball",
    "createdAt": "2026-11-05T08:00:00.000Z",
    "updatedAt": "2026-11-05T08:30:00.000Z"
  },
  "world": {
    "format": "simuforge.world",
    "schemaVersion": 1,
    "entities": []
  }
}
```

Rules:

- `format` MUST equal `simuforge.project`.
- `schemaVersion` MUST be the integer `1` in MVP-0.
- `project.id` MUST be a UUID v4 string generated with `crypto.randomUUID()`.
- `project.name` MUST be 1-128 characters after trimming. Empty and whitespace-only names are rejected.
- `createdAt` and `updatedAt` MUST be ISO 8601 strings. `updatedAt` MUST be greater than or equal to `createdAt`.
- `world` MUST validate against the POC-01 `simuforge.world` v1 schema.
- Unknown top-level fields are ignored on read and are not written on save.
- A missing required field is an error. It is not defaulted.
- Editor-only state is not part of the envelope. Selection, camera, gizmo mode, panel sizes, console logs, dirty state, and runtime state are never serialized.

### 3. World serialization relationship

The nested `world` object is the POC-01 world document, unchanged:

```json
{
  "format": "simuforge.world",
  "schemaVersion": 1,
  "entities": [
    {
      "id": "3f2c1a9e-8b4d-4c6f-9a1e-2d7b5c8e4f10",
      "name": "Cube",
      "type": "cube",
      "transform": {
        "position": { "x": 0, "y": 0.5, "z": 0 },
        "rotation": { "x": 0, "y": 0, "z": 0, "w": 1 },
        "scale": { "x": 1, "y": 1, "z": 1 }
      },
      "metadata": {}
    }
  ]
}
```

The project envelope adds identity, name, and timestamps around the world. It does not add entity fields, components, materials, lights, scripts, or parent-child structure. POC-01 validation rules continue to apply to the nested world, including unique IDs, known entity types, finite transform values, positive scale at or above `1e-3`, and plain-object metadata.

The import and export order is:

1. Read and parse the file as JSON.
2. Validate the project envelope.
3. Validate the nested world with the POC-01 validator.
4. Build a new in-memory project from the validated document.
5. Replace the editor state only after all validation succeeds.

### 4. IndexedDB object store design

| Property | Value |
| --- | --- |
| Database | `simuforge` |
| Database version | `1` |
| Object store | `projects` |
| Key path | `id` |
| Index | `updatedAt` |
| Record | The complete project envelope |
| Transaction mode | `readwrite` for save and delete; `readonly` for list and get |

The `updatedAt` index supplies the Project Hub order. The repository lists records newest first by `updatedAt`. The record is the same envelope that is written to a file, so a local record can be exported without conversion.

The database is opened lazily. A blocked upgrade, an unavailable IndexedDB implementation, or a failed transaction is reported as a named storage error. The application does not silently fall back to a different storage engine.

### 5. `localStorage` responsibilities

| Key | Value | Required |
| --- | --- | --- |
| `simuforge.layout.v1` | Preset, dock widths, Program and Console heights, collapse state | No; best effort |
| `simuforge.last-project.v1` | Last opened project ID | No; best effort |

`localStorage` is used only for preferences and the last-project pointer. It never stores a project document, world data, console logs, or selection. A corrupt or unreadable value falls back to defaults and does not block startup. When a stored last-project ID no longer resolves, the Project Hub opens without a selection rather than failing.

### 6. Save and open lifecycle

#### Save

```text
Clean --edit--> Dirty --Save--> Saving --success--> Clean
                                  |
                                  +--failure--> SaveFailed (dirty remains)
```

- Save is explicit. There is no autosave in MVP-0.
- Save writes the whole validated project envelope in one IndexedDB transaction.
- `updatedAt` is set at commit time.
- The dirty flag clears only after the transaction succeeds.
- Save while a field is focused first commits the field. If the field is invalid, Save is blocked with the inline reason.
- A failed save keeps the in-memory project, keeps the dirty flag, and offers `Retry` and `Export Copy`.
- Save does not serialize editor state.
- Save does not create a second record for the same project.

#### Open

```text
Idle --Open--> Reading --> Validating --> Ready
                    |            |
                    +--error-----+--> Error (current project unchanged)
```

- Reading and validation happen before the Studio replaces any state.
- A corrupt, unsupported, or oversized project does not partially load.
- Opening a project with unsaved changes requires `Save`, `Discard`, or `Cancel`.
- Opening a local record and opening a project file use the same validation and replacement path.
- A successful open updates the last-project pointer.

### 7. Dirty tracking

Dirty state is based on a revision counter, not a deep equality check.

- Every mutating command increments the project revision.
- A save captures the revision that it is about to write.
- When the transaction succeeds, the save clears dirty only if the current revision equals the captured revision.
- If an edit occurs during a save, the project remains dirty after the save completes.
- A failed save never clears dirty, regardless of revision.
- Selection, camera, panel size, collapse state, and console entries do not increment the project revision.

### 8. Import and export behavior

#### Export

- Export writes the current validated envelope to a `.simuforge.json` file.
- The exported document is identical in shape to the record stored in IndexedDB.
- Export is available even when local storage is unavailable.
- Export after a save failure is the recovery path (`Export Copy`).
- Export does not require a successful local save.

#### Import

- Import accepts `.simuforge.json` files only.
- The file is validated against the project envelope and the nested world schema.
- The file size guard is 1 MiB, inherited from the POC-01 provisional guardrail. It is not a product limit.
- A failed import leaves the current project, selection, camera, and renderer untouched.
- A failed import never writes a partial record to IndexedDB.
- Importing a project whose `id` already exists presents an explicit choice: replace the local record or import as a new project with a new ID. Silent overwrite is not allowed.
- Import does not merge projects and does not import editor state.

### 9. Validation and error handling

The project validator returns a structured result. The first failure stops validation.

| Condition | Code |
| --- | --- |
| File is not valid JSON | `INVALID_JSON` |
| Top-level value is not an object | `INVALID_DOCUMENT` |
| `format` is missing or not `simuforge.project` | `UNKNOWN_PROJECT_FORMAT` |
| `schemaVersion` is missing, non-integer, or unsupported | `UNSUPPORTED_PROJECT_SCHEMA_VERSION` |
| `project` is missing or malformed | `INVALID_PROJECT_METADATA` |
| `project.id` is not a UUID v4 | `INVALID_PROJECT_ID` |
| `project.name` is empty or longer than 128 characters | `INVALID_PROJECT_NAME` |
| Timestamps are missing, invalid, or inconsistent | `INVALID_PROJECT_TIMESTAMP` |
| `world` is missing or fails the world validator | `INVALID_WORLD` |
| File exceeds 1 MiB | `FILE_TOO_LARGE` |
| IndexedDB is unavailable | `STORAGE_UNAVAILABLE` |
| IndexedDB quota is exceeded | `STORAGE_QUOTA_EXCEEDED` |
| Project ID is not found | `PROJECT_NOT_FOUND` |
| IndexedDB transaction fails | `STORAGE_WRITE_FAILED` or `STORAGE_READ_FAILED` |

Every error carries a code, a human-readable message, and a path when a field is at fault. Errors are logged to the Console with source `IMPORT`, `STORAGE`, or `APP`. No error is swallowed. No empty `catch` block is permitted. No stack trace is shown by default. The UI offers a recovery action: `Try another project`, `Retry`, or `Export Copy`.

### 10. Version compatibility policy

- Schema version `1` is the only supported version in MVP-0.
- A higher version is rejected with a message explaining that the project was created by a newer SimuForge build and cannot be loaded.
- Version `0`, negative versions, non-integers, and non-numbers are rejected as unsupported.
- A missing version is rejected, not defaulted.
- There is no migration chain in MVP-0. Migrations are a later, deliberate task with their own fixtures and tests.
- A project that cannot be read is never partially loaded and never overwritten.
- The project envelope and the nested world each carry their own `schemaVersion`. Both must be supported.

### 11. Alternatives considered

| Alternative | Assessment | Outcome |
| --- | --- | --- |
| File export/import only | Portable and simple, but the Project Hub cannot list recent projects and every reopen needs a file picker | Rejected; does not satisfy OD-07 |
| Server or cloud storage | Requires backend, identity, privacy, and operations work | Rejected; outside MVP-0 |
| `localStorage` for project documents | Small synchronous string store with a low quota; blocks the main thread | Rejected |
| A storage wrapper such as Dexie or `idb` | One object store and one index do not justify the dependency | Rejected |
| A flat world document with top-level project fields | Mixes project and world concerns and changes the POC-01 schema | Rejected |
| Two files: metadata plus world | More failure modes and ambiguous atomic save | Rejected |
| Autosave | Requires a conflict and recovery policy; hides unsaved state | Deferred; explicit save is the MVP-0 contract |
| Migration chain in MVP-0 | Adds fixtures and failure modes before the first schema change exists | Deferred |
| Undo/redo as the recovery mechanism | Not in MVP-0 scope; delete confirmation covers the destructive action | Deferred |

### 12. Consequences

#### Easier

- The Project Hub can list, open, and delete recent projects without a backend.
- The project file is portable and can be exported even when storage fails.
- The world schema stays identical to the POC-01 contract.
- Validation failure cannot damage the current project.
- Successful save has an unambiguous dirty-clearing rule.

#### Harder

- Browser storage is origin-scoped and can be cleared by the user or the browser.
- Quota, private-mode, and blocked-storage behavior must be tested.
- The team owns the repository, validator, state machines, and recovery UX.
- A project is not automatically available on another machine; the user must export and import the file.
- There is no migration path in MVP-0, so an old project cannot be upgraded by the product.
- Two IDs for the same logical project can exist after an import-as-new choice.

#### Must be maintained

- The envelope and world validators, including their error codes.
- The IndexedDB schema and its version.
- The `localStorage` keys and their fallback behavior.
- The save and open state machines.
- The dirty revision rule.
- The 1 MiB guard and its explanation.
- This ADR whenever the format or storage contract changes.

### 13. Security and data integrity considerations

- Files are untrusted input. Validation happens before any state replacement.
- JSON is parsed with `JSON.parse` inside a guarded path. No `eval`, `Function`, or dynamic import is used on file content.
- Project names and entity names are rendered as text, not HTML. They are not injected into `innerHTML`.
- The envelope cannot reference arbitrary files, URLs, scripts, or modules. There is no asset path or script field.
- A record is written in a single transaction. A failed write does not leave a partial project.
- Importing a duplicate ID requires an explicit choice. Silent overwrite is prohibited.
- Delete requires confirmation because undo is deferred.
- The application does not encrypt local data. Anyone with access to the browser profile can read it. This is an accepted MVP-0 limitation and is stated in the Project Hub and documentation.
- The 1 MiB guard limits accidental or malicious memory pressure. It is not a security boundary.
- No telemetry, analytics, or network request is made from persistence code.
- Browser storage can be cleared externally. Export is the only durable backup.

## Validation requirements

This ADR is documentation, not evidence that persistence works. The following must be demonstrated in I-07 and I-09:

| Requirement | Validation |
| --- | --- |
| Envelope and world round-trip | Unit tests without a browser; IDs, names, types, and transforms preserved within `1e-6` |
| Unknown fields ignored | Read a document with extra fields; save and confirm they are absent |
| Missing required fields rejected | One test per required field |
| Unsupported versions rejected | Version `0`, `2`, negative, fractional, and missing |
| Atomic import | Corrupt import leaves the current project, selection, and camera unchanged |
| Atomic save | Failed transaction leaves the record and dirty state unchanged |
| Dirty revision | Edit during save leaves the project dirty |
| Hub ordering | Records list newest first by `updatedAt` |
| Duplicate import | Explicit replace or new-ID choice; no silent overwrite |
| Size guard | A file above 1 MiB is rejected with its actual size |
| Storage unavailable | Banner, read-only memory fallback, file fallback, Export Copy available |
| Layout fallback | Corrupt layout falls back to defaults; startup still succeeds |
| No autosave | No write occurs without an explicit Save or import action |
| No editor state in the file | The exported document contains no selection, camera, panel, console, or dirty field |
| Chrome 156 | Manual and CDP acceptance at 1024 x 640 and 1440 x 900 |

A failed validation stops I-07. It is not worked around by weakening the schema, skipping the failure path, or enabling autosave.

## References

- [ADR 0001 - Proposed architecture direction for SimuForge](0001-proposed-architecture-direction.md)
- [ADR 0002 - MVP-0 technology stack](0002-mvp-0-technology-stack.md)
- [MVP-0 Scaffold Specification](../../projects/simuforge/scaffold/MVP_0_SCAFFOLD_SPECIFICATION.md)
- [MVP-0 Architecture Proposal](../../projects/simuforge/scaffold/MVP_0_ARCHITECTURE_PROPOSAL.md)
- [MVP-0 Implementation Plan](../../projects/simuforge/scaffold/MVP_0_IMPLEMENTATION_PLAN.md)
- [MVP-0 Owner Decision Request](../../projects/simuforge/scaffold/MVP_0_OWNER_DECISION_REQUEST.md)
- [POC-01 World Editor §11](../../projects/simuforge/docs/POC_01_WORLD_EDITOR.md)
- [Main User Flows F-01, F-13, F-14](../../projects/simuforge/design/MAIN_USER_FLOWS.md)
- [How ADRs are written](README.md)
