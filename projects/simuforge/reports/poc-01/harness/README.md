# SP-05 Interactive Harness

File: `sp05.html`

Open in Google Chrome. Uses Babylon.js 9.32.1, right-handed mode, the existing test cube and editor-only grid.

Features:
- Translate/Rotate/Scale gizmo modes.
- Live Inspector (position, quaternion, Euler display, scale, quaternion length).
- Quaternion validation (finite components, length within 1e-5).
- Scale validation (finite, positive, >= 1e-3).
- T-05 baseline/final capture and comparison (tolerance 1e-5).
- Evidence checklist and JSON export.

No fabricated evidence is produced; all results require genuine manual interaction.