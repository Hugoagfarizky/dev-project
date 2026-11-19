# SimuForge v1.0.0 — Release Notes

## Summary

SimuForge v1.0.0 is the first release of the browser-based 3D simulation studio. It delivers
the full roadmap through Phase 10 (Extensibility) and Phase 11 (Quality, Performance & Release).

## Highlights

- 3D world editor with primitives, transforms, hierarchy, and Inspector.
- Fixed-timestep physics with collision, forces, and impulses.
- Visual Scripting graph with triggers, actions, electrical, robotics, and extension nodes.
- Python runtime (Pyodide) in a Web Worker with restricted API.
- Electrical & electronics: DC resistive MNA solver, voltage sources, resistors, switches, ground.
- Robotics: revolute/prismatic joints, DC motor actuators, sensors.
- Extensibility: project-local extensions with custom components and simulation modules in isolated workers, declarative permissions.
- Local persistence: IndexedDB + file export/import, Project Hub.

## Validation

- `npm run check`: PASS
- `npm test`: 362/362 PASS
- `npm run build`: PASS
- Playwright (`--workers=1`): 39/39 PASS (+1 POC-06 feasibility spike)
- Phase 10 E2E: 2/2 PASS

## Known limitations

See `KNOWN_LIMITATIONS.md`. Web Workers are defense-in-depth, not a sandbox. 2D simulation is not delivered.

## Artifacts

- Static build: `app/dist/`
- Source archive: repository tag `v1.0.0`
- Third-party notices: `app/THIRD_PARTY_NOTICES.md`
