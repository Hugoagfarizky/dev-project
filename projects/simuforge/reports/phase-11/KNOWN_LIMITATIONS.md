# SimuForge v1.0 — Known Limitations

1. **2D simulation not delivered.** MVP is 3D-first. Full hybrid 2D/3D interaction is a long-term goal; POC-06 feasibility spike shows 2D canvas overlay over WebGL is structurally feasible (~60 FPS) but no 2D solver or hybrid physics exists.
2. **Web Workers are defense-in-depth, not a sandbox.** Python and extension code can reach worker globals/network; only run trusted code.
3. **No hard memory/CPU cap.** Hung workers are terminated but mid-allocation work cannot be pre-empted.
4. **Extension graph integration uses two fixed node types** (`setExtensionValue`, `readExtensionValue`); arbitrary dynamic node registration is not implemented.
5. **Failed extension workers are not auto-restarted.** Disable/enable or reinstall to retry.
6. **Generic component editor edits primitive fields only.** Nested config objects are preserved but not editable.
7. **Graph nodes targeting a disabled extension pass validation and fail at runtime.**
8. **No extension marketplace, signing, dependency resolution, or version negotiation.**
9. **Python access to extensions is read-only.**
10. **Bundle main chunk exceeds 500 KiB** (Vite warning); initial load may be slow on low bandwidth.
11. **Firefox Python interrupt** requires COOP/COEP; otherwise terminate-based only.
12. **Browser E2E is smoke-level** (Chromium serial).
13. **One M2-B drag-connection test flaked once** in an earlier full run; passed in isolation and two subsequent full runs.
14. **No autosave.** Save is explicit.
15. **No undo/redo** (deferred).
16. **No migration chain.** Schema v1 only; newer/older unsupported versions are rejected.
17. **Local data is not encrypted.**
