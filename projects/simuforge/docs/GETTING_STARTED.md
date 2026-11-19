# SimuForge — Getting Started

## Prerequisites

- Node.js 24.22.2 (see `app/package.json` `engines.node`).
- npm 11.19.1.
- A Chromium-based browser (Chrome or Edge) for full feature support; Firefox is best-effort.

## Install and run

```bash
cd projects/simuforge/app
npm ci
npm run dev
```

Open `http://localhost:5173`.

## Build

```bash
npm run build
npm run preview
```

The production bundle is static and can be served from any static host.

## First project

1. Open the Studio. The Project Hub appears.
2. Create a new project.
3. In the World View, add primitive objects (cube, sphere, plane).
4. Use the Inspector to set transforms and components.
5. Open the Program tab to author Visual Scripting graphs.
6. Press Play to run the simulation; Stop returns to editing.
7. Save with the TopBar Save action; reopen from the Project Hub.

## Python

Python is lazy-loaded on first use. The editor shows a loading/ready state. Scripts are
authored in the Python panel and referenced by `runPython` graph nodes.

## Extensions

Open the Program → Extensions tab. Install the built-in Oscillator Sample or import a
project-local extension JSON. Extensions run in isolated Web Workers.

## Troubleshooting

- If WebGL 2 is unavailable, the viewport shows an overlay.
- If IndexedDB is unavailable, the app runs in memory with file export as backup.
- Firefox: Python interrupt requires cross-origin isolation (COOP/COEP); without it,
  terminate-based cancellation is used.
- Large bundles: first load may take a moment on slow connections.
