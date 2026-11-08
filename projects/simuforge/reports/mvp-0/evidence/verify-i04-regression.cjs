'use strict';

const fs = require('fs');
const path = require('path');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;
const PORT = 9337;
const URL = 'http://localhost:5173/';

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail === undefined ? '' : ' :: ' + JSON.stringify(detail)));
}

async function main() {
  const chrome = await launch({ port: PORT, url: URL, windowWidth: 1400, windowHeight: 1000 });
  let cdp;
  const logs = [];
  const errors = [];
  try {
    cdp = await connectToPage(PORT, 'localhost:5173');
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    try { await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1000, deviceScaleFactor: 1, mobile: false }); } catch (_) {}
    await cdp.send('Page.bringToFront');

    cdp.on('Runtime.consoleAPICalled', (p) => {
      const text = (p.args || []).map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ');
      logs.push({ type: p.type, text });
    });
    cdp.on('Runtime.exceptionThrown', (p) => {
      errors.push({ kind: 'exception', text: p.exceptionDetails && (p.exceptionDetails.text + ' ' + ((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || '')) });
    });
    cdp.on('Log.entryAdded', (p) => {
      if (p.entry.level === 'error') errors.push({ kind: 'log', text: p.entry.text });
      else logs.push({ type: p.entry.level, text: p.entry.text });
    });

    async function evaluate(expression, timeoutMs = 20000) {
      return cdp.evaluate(expression, { timeoutMs });
    }

    async function waitFor(expression, timeoutMs = 20000, label = expression) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          if (await evaluate(expression)) return true;
        } catch (_) {}
        await sleep(150);
      }
      throw new Error('Timed out waiting for: ' + label);
    }

    async function screenshot(name) {
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      const file = path.join(OUT, name + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      return file;
    }

    async function click(x, y) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', buttons: 0 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
      await sleep(40);
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(150);
    }

    async function drag(x1, y1, x2, y2, steps = 8) {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1, button: 'none', buttons: 0 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button: 'left', buttons: 1, clickCount: 1 });
      for (let i = 1; i <= steps; i += 1) {
        const x = x1 + ((x2 - x1) * i) / steps;
        const y = y1 + ((y2 - y1) * i) / steps;
        await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
        await sleep(20);
      }
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button: 'left', buttons: 0, clickCount: 1 });
      await sleep(200);
    }

    // ---- load ----
    await evaluate(`
      window.__getStore = function () {
        const root = document.querySelector('.sf-shell') || document.getElementById('root');
        if (!root) return null;
        const fiberKey = Object.keys(root).find((k) => k.startsWith('__reactFiber$'));
        let fiber = fiberKey ? root[fiberKey] : null;
        while (fiber) {
          const props = fiber.memoizedProps;
          if (props && props.store && typeof props.store.dispatch === 'function' && typeof props.store.getSnapshot === 'function') {
            return props.store;
          }
          fiber = fiber.return;
        }
        return null;
      };
      true;
    `);
    await waitFor('!!(__getStore() && window.__simuforgeRenderer && window.__simuforgeRenderer.scene && document.querySelector("canvas"))', 30000, 'app + renderer');
    await sleep(800);

    await evaluate(`
      window.__i04 = (() => {
        const store = () => __getStore();
        const renderer = () => window.__simuforgeRenderer;
        const meshOf = (id) => renderer().meshes.get(id);
        const state = () => store().getSnapshot();
        const entity = (id) => state().project.world.entities.find((e) => e.id === id);
        function projectToClient(id) {
          const r = renderer();
          const mesh = meshOf(id);
          const canvas = r.canvas;
          const rect = canvas.getBoundingClientRect();
          const V3 = mesh.position.constructor;
          const clip = V3.TransformCoordinates(mesh.getAbsolutePosition(), r.scene.getTransformMatrix());
          return {
            x: rect.left + (clip.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (1 - (clip.y * 0.5 + 0.5)) * rect.height,
            ndc: { x: clip.x, y: clip.y, z: clip.z },
            rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            canvasCss: { width: canvas.clientWidth, height: canvas.clientHeight },
            canvasBuffer: { width: canvas.width, height: canvas.height },
            devicePixelRatio: window.devicePixelRatio
          };
        }
        function meshState(id) {
          const mesh = meshOf(id);
          if (!mesh) return null;
          const q = mesh.rotationQuaternion;
          return {
            name: mesh.name,
            position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
            rotation: q ? { x: q.x, y: q.y, z: q.z, w: q.w } : null,
            scaling: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z },
            metadata: mesh.metadata,
            world: mesh.getAbsolutePosition().asArray ? mesh.getAbsolutePosition().asArray() : [mesh.getAbsolutePosition().x, mesh.getAbsolutePosition().y, mesh.getAbsolutePosition().z]
          };
        }
        function highlightState() {
          const r = renderer();
          const out = {};
          for (const id of r.meshes.keys()) {
            out[id] = r.highlight ? r.highlight.hasMesh(r.meshes.get(id)) : null;
          }
          return out;
        }
        function pickAtClient(x, y) {
          const r = renderer();
          const rect = r.canvas.getBoundingClientRect();
          const pick = r.scene.pick(x - rect.left, y - rect.top);
          return pick && pick.pickedMesh ? (pick.pickedMesh.metadata && pick.pickedMesh.metadata.entityId) || null : null;
        }
        function findEmptyClient() {
          const r = renderer();
          const rect = r.canvas.getBoundingClientRect();
          for (let gy = 0.08; gy < 0.55; gy += 0.04) {
            for (let gx = 0.04; gx < 0.96; gx += 0.04) {
              const x = rect.left + rect.width * gx;
              const y = rect.top + rect.height * gy;
              if (!pickAtClient(x, y)) return { x, y };
            }
          }
          return null;
        }
        function fixture() {
          const st = state();
          const byType = {};
          for (const e of st.project.world.entities) byType[e.type] = e;
          return { state: st, cube: byType.cube && byType.cube.id, sphere: byType.sphere && byType.sphere.id, plane: byType.plane && byType.plane.id };
        }
        function pixelStats(dataUrl) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const c = document.createElement('canvas');
              c.width = img.width; c.height = img.height;
              const ctx = c.getContext('2d', { willReadFrequently: true });
              ctx.drawImage(img, 0, 0);
              const d = ctx.getImageData(0, 0, c.width, c.height).data;
              let sum = 0, nonDark = 0;
              for (let i = 0; i < d.length; i += 4) {
                const v = d[i] + d[i+1] + d[i+2];
                sum += v;
                if (v > 90) nonDark++;
              }
              resolve({ width: c.width, height: c.height, mean: sum / (d.length / 4) / 3, nonDark });
            };
            img.src = dataUrl;
          });
        }
        function diffStats(aUrl, bUrl) {
          return new Promise((resolve, reject) => {
            let loaded = 0; const imgs = [];
            for (const u of [aUrl, bUrl]) {
              const img = new Image();
              img.onload = () => { imgs.push(img); if (++loaded === 2) run(); };
              img.onerror = reject;
              img.src = u;
            }
            function run() {
              const w = Math.min(imgs[0].width, imgs[1].width);
              const h = Math.min(imgs[0].height, imgs[1].height);
              const c1 = document.createElement('canvas'); c1.width = w; c1.height = h;
              const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
              const x1 = c1.getContext('2d', { willReadFrequently: true });
              const x2 = c2.getContext('2d', { willReadFrequently: true });
              x1.drawImage(imgs[0], 0, 0); x2.drawImage(imgs[1], 0, 0);
              const d1 = x1.getImageData(0, 0, w, h).data;
              const d2 = x2.getImageData(0, 0, w, h).data;
              let changed = 0, blue = 0;
              let minX = w, minY = h, maxX = -1, maxY = -1;
              for (let i = 0; i < d1.length; i += 4) {
                const dr = Math.abs(d1[i] - d2[i]);
                const dg = Math.abs(d1[i+1] - d2[i+1]);
                const db = Math.abs(d1[i+2] - d2[i+2]);
                if (dr + dg + db > 24) {
                  changed++;
                  const p = i / 4; const x = p % w; const y = (p / w) | 0;
                  if (x < minX) minX = x; if (y < minY) minY = y;
                  if (x > maxX) maxX = x; if (y > maxY) maxY = y;
                  if (d2[i+2] > d2[i] + 12 && d2[i+2] > d2[i+1] + 8) blue++;
                }
              }
              resolve({ width: w, height: h, changed, blue, bbox: maxX < 0 ? null : { minX, minY, maxX, maxY } });
            }
          });
        }
        return { store, renderer, meshOf, state, entity, projectToClient, meshState, highlightState, pickAtClient, findEmptyClient, fixture, pixelStats, diffStats };
      })();
      true;
    `);

    const initial = await evaluate('({ diagnostics: __simuforgeRenderer.getDiagnostics(), canvas: (() => { const c = document.querySelector("canvas"); const r = c.getBoundingClientRect(); return { width: c.width, height: c.height, clientWidth: c.clientWidth, clientHeight: c.clientHeight, left: r.left, top: r.top, dpr: devicePixelRatio }; })(), dpr: devicePixelRatio })');
    record('renderer initializes WebGL 2', initial.diagnostics.webGlVersion === 2, initial);
    await screenshot('00-initial');

    // ---- fixture via editor commands ----
    await evaluate(`(() => {
      const s = __getStore();
      s.dispatch({ type: 'entity/create', entityType: 'cube', position: { x: 0, y: 0.5, z: 0 } });
      s.dispatch({ type: 'entity/create', entityType: 'sphere', position: { x: 2, y: 0.5, z: 0 } });
      s.dispatch({ type: 'entity/create', entityType: 'plane', position: { x: -2, y: 0.5, z: 0 } });
      return true;
    })()`);
    await waitFor('__simuforgeRenderer.getDiagnostics().meshCount === 3', 10000, 'three meshes');
    const fixture = await evaluate('__i04.fixture()');
    const diagAfterCreate = await evaluate('__simuforgeRenderer.getDiagnostics()');
    const meshStates = await evaluate(`Object.fromEntries(Object.values(__i04.fixture()).filter(v => typeof v === 'string').map(id => [id, __i04.meshState(id)]))`);
    record('fixture entities have one mesh each', diagAfterCreate.meshCount === 3 && diagAfterCreate.entityCount === 3, { diagAfterCreate, ids: { cube: fixture.cube, sphere: fixture.sphere, plane: fixture.plane } });
    const positionsMatch = ['cube', 'sphere', 'plane'].every((k) => {
      const id = fixture[k];
      const ent = fixture.state.project.world.entities.find((e) => e.id === id);
      const m = meshStates[id];
      return m && Math.abs(m.position.x - ent.transform.position.x) < 1e-9 && Math.abs(m.position.y - ent.transform.position.y) < 1e-9 && Math.abs(m.position.z - ent.transform.position.z) < 1e-9;
    });
    record('mesh positions match entity transforms', positionsMatch, meshStates);
    await screenshot('01-fixture');

    const cubePt = await evaluate(`__i04.projectToClient(${JSON.stringify(fixture.cube)})`);
    const spherePt = await evaluate(`__i04.projectToClient(${JSON.stringify(fixture.sphere)})`);
    const emptyPt = await evaluate('__i04.findEmptyClient()');
    const projectCheck = await evaluate(`({ cube: __i04.pickAtClient(${cubePt.x}, ${cubePt.y}), sphere: __i04.pickAtClient(${spherePt.x}, ${spherePt.y}), empty: __i04.pickAtClient(${emptyPt.x}, ${emptyPt.y}) })`);
    record('projected click coordinates hit the intended meshes (pre-click ray check)', projectCheck.cube === fixture.cube && projectCheck.sphere === fixture.sphere && projectCheck.empty === null, { cubePt, spherePt, emptyPt, projectCheck });

    // ---- plain left click picking ----
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: null })`);
    await sleep(150);
    await click(cubePt.x, cubePt.y);
    const selectedAfterCubeClick = await evaluate('__getStore().getSnapshot().editor.selectedEntityId');
    record('plain left click on cube selects the cube', selectedAfterCubeClick === fixture.cube, { selectedAfterCubeClick, expected: fixture.cube });

    await click(emptyPt.x, emptyPt.y);
    const selectedAfterEmptyClick = await evaluate('__getStore().getSnapshot().editor.selectedEntityId');
    record('plain left click on empty space clears selection', selectedAfterEmptyClick === null, { selectedAfterEmptyClick });

    await click(spherePt.x, spherePt.y);
    const selectedAfterSphereClick = await evaluate('__getStore().getSnapshot().editor.selectedEntityId');
    record('plain left click on sphere selects the sphere', selectedAfterSphereClick === fixture.sphere, { selectedAfterSphereClick, expected: fixture.sphere });

    const cameraBeforeDrag = await evaluate('(() => { const c = __simuforgeRenderer.camera; return { alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target.asArray() }; })()');
    await drag(cubePt.x, cubePt.y, cubePt.x + 45, cubePt.y + 30);
    const cameraAfterDrag = await evaluate('(() => { const c = __simuforgeRenderer.camera; return { alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target.asArray() }; })()');
    const selectedAfterDrag = await evaluate('__getStore().getSnapshot().editor.selectedEntityId');
    const cameraStable = JSON.stringify(cameraBeforeDrag) === JSON.stringify(cameraAfterDrag);
    record('left drag beyond threshold does not pick', selectedAfterDrag === fixture.sphere, { selectedAfterDrag, expected: fixture.sphere });
    record('left drag does not orbit the camera', cameraStable, { cameraBeforeDrag, cameraAfterDrag });

    // Click with no preceding mousemove (pointerdown/up only) to prove coordinate capture is not move-dependent.
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: null })`);
    await sleep(100);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cubePt.x, y: cubePt.y, button: 'left', buttons: 1, clickCount: 1 });
    await sleep(50);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cubePt.x, y: cubePt.y, button: 'left', buttons: 0, clickCount: 1 });
    await sleep(200);
    const selectedAfterNoMoveClick = await evaluate('__getStore().getSnapshot().editor.selectedEntityId');
    record('left click without a prior mousemove picks correctly', selectedAfterNoMoveClick === fixture.cube, { selectedAfterNoMoveClick, expected: fixture.cube });

    // ---- selection highlight ----
    const highlightSequence = [];
    for (const [label, id] of [['null', null], ['cube', fixture.cube], ['sphere', fixture.sphere], ['null-again', null]]) {
      await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(id)} })`);
      await sleep(250);
      const hs = await evaluate('__i04.highlightState()');
      highlightSequence.push({ label, id, highlight: hs });
    }
    record('selection highlight follows selection', highlightSequence[0].highlight[fixture.cube] === false && highlightSequence[0].highlight[fixture.sphere] === false && highlightSequence[1].highlight[fixture.cube] === true && highlightSequence[1].highlight[fixture.sphere] === false && highlightSequence[2].highlight[fixture.cube] === false && highlightSequence[2].highlight[fixture.sphere] === true && highlightSequence[3].highlight[fixture.cube] === false && highlightSequence[3].highlight[fixture.sphere] === false, highlightSequence);

    const transformsBefore = await evaluate(`({ cube: __i04.meshState(${JSON.stringify(fixture.cube)}), sphere: __i04.meshState(${JSON.stringify(fixture.sphere)}), state: __getStore().getSnapshot().project.world.entities })`);
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: null })`);
    await sleep(250);
    const noSelUrl = await evaluate('__simuforgeRenderer.canvas.toDataURL("image/png")');
    await screenshot('02-no-selection');
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(fixture.cube)} })`);
    await sleep(350);
    const selUrl = await evaluate('__simuforgeRenderer.canvas.toDataURL("image/png")');
    await screenshot('03-cube-selected');
    const diff = await evaluate(`__i04.diffStats(${JSON.stringify(noSelUrl)}, ${JSON.stringify(selUrl)})`, 30000);
    const selStats = await evaluate(`__i04.pixelStats(${JSON.stringify(selUrl)})`, 30000);
    record('selection changes rendered pixels (visual highlight evidence)', diff.changed > 200, { diff, selStats });
    const transformsAfter = await evaluate(`({ cube: __i04.meshState(${JSON.stringify(fixture.cube)}), sphere: __i04.meshState(${JSON.stringify(fixture.sphere)}), state: __getStore().getSnapshot().project.world.entities })`);
    record('selection does not change transforms', JSON.stringify(transformsBefore) === JSON.stringify(transformsAfter), { transformsBefore, transformsAfter });

    // ---- WebGL context loss / restoration ----
    await evaluate(`
      window.__i04ctx = { lost: null, restored: null };
      const c = __simuforgeRenderer.canvas;
      c.addEventListener('webglcontextlost', (e) => { window.__i04ctx.lost = { defaultPrevented: e.defaultPrevented, timeStamp: e.timeStamp }; }, false);
      c.addEventListener('webglcontextrestored', (e) => { window.__i04ctx.restored = { timeStamp: e.timeStamp }; }, false);
      true;
    `);
    const beforeLoss = await evaluate(`(() => {
      const r = __simuforgeRenderer;
      return {
        rendererSame: true,
        canvasInDom: document.contains(r.canvas),
        canvasTag: r.canvas.tagName,
        engineCtor: r.engine.constructor.name,
        sceneCtor: r.scene.constructor.name,
        meshCount: r.getDiagnostics().meshCount,
        sceneMeshCount: r.scene.meshes.length,
        meshIds: Array.from(r.meshes.keys()),
        highlight: __i04.highlightState(),
        lostObservers: r.engine.onContextLostObservable.observers.length,
        restoredObservers: r.engine.onContextRestoredObservable.observers.length,
        scenePointerObservers: r.scene.onPointerObservable.observers.length,
        diag: r.getDiagnostics(),
        fallback: !!document.querySelector('.sf-webgl-fallback')
      };
    })()`);
    // Keep references on window so identity can be compared across the loss.
    await evaluate(`(() => { const r = __simuforgeRenderer; window.__i04refs = { canvas: r.canvas, engine: r.engine, scene: r.scene, renderer: r, meshes: new Map(r.meshes) }; return true; })()`);

    const loseResult = await evaluate(`(() => {
      const c = __simuforgeRenderer.canvas;
      const gl = c.getContext('webgl2');
      const ext = gl && gl.getExtension('WEBGL_lose_context');
      if (!ext) return { ok: false, reason: 'WEBGL_lose_context unavailable' };
      ext.loseContext();
      window.__i04loseExt = ext;
      return { ok: true, isLost: gl.isContextLost(), extName: 'WEBGL_lose_context' };
    })()`);
    record('WEBGL_lose_context extension is available and loss was requested', loseResult.ok === true && loseResult.isLost === true, loseResult);
    let fallbackAppeared = false;
    try {
      await waitFor('!!document.querySelector(".sf-webgl-fallback")', 8000, 'fallback UI');
      fallbackAppeared = true;
    } catch (_) {}
    const afterLoss = await evaluate(`(() => {
      const r = __simuforgeRenderer;
      const fb = document.querySelector('.sf-webgl-fallback');
      return {
        fallback: fb ? { role: fb.getAttribute('role'), text: fb.textContent.replace(/\\s+/g, ' ').trim() } : null,
        diag: r.getDiagnostics(),
        canvasInDom: document.contains(r.canvas),
        activeCanvasInDom: document.contains(document.querySelector('canvas')),
        canvasSame: r.canvas === window.__i04refs.canvas,
        currentCanvasSameAsRef: document.querySelector('canvas') === window.__i04refs.canvas,
        ctxEvent: window.__i04ctx.lost,
        diagnosticsText: (document.querySelector('.sf-viewport-diagnostics') || {}).textContent || null
      };
    })()`);
    record('context loss is detected', afterLoss.diag.contextLost === true, afterLoss);
    record('Babylon prevents the default context-lost behavior', afterLoss.ctxEvent !== null && afterLoss.ctxEvent.defaultPrevented === true, afterLoss.ctxEvent);
    record('context-loss fallback UI appears', fallbackAppeared && afterLoss.fallback !== null, afterLoss.fallback);
    record('canvas element stays mounted during fallback (remediation target)', afterLoss.canvasInDom === true && afterLoss.currentCanvasSameAsRef === true, afterLoss);
    await screenshot('04-context-lost');

    const restoreResult = await evaluate(`(() => {
      const ext = window.__i04loseExt;
      if (!ext || typeof ext.restoreContext !== 'function') return { ok: false, reason: 'restoreContext unavailable' };
      ext.restoreContext();
      return { ok: true, isLost: __simuforgeRenderer.canvas.getContext('webgl2').isContextLost() };
    })()`);
    record('WEBGL_lose_context.restoreContext requested', restoreResult.ok === true, restoreResult);
    let restored = false;
    try {
      await waitFor('!document.querySelector(".sf-webgl-fallback") && __simuforgeRenderer.getDiagnostics().contextLost === false', 15000, 'restoration');
      restored = true;
    } catch (_) {}
    await sleep(1200);
    const afterRestore = await evaluate(`(() => {
      const r = __simuforgeRenderer;
      return {
        diag: r.getDiagnostics(),
        restoredEvent: window.__i04ctx.restored,
        fallback: !!document.querySelector('.sf-webgl-fallback'),
        canvasSame: r.canvas === window.__i04refs.canvas,
        currentCanvasSameAsRef: document.querySelector('canvas') === window.__i04refs.canvas,
        engineSame: r.engine === window.__i04refs.engine,
        sceneSame: r.scene === window.__i04refs.scene,
        rendererSame: r === window.__i04refs.renderer,
        meshCount: r.meshes.size,
        sceneMeshCount: r.scene.meshes.length,
        meshIdsSame: JSON.stringify(Array.from(r.meshes.keys())) === JSON.stringify(Array.from(window.__i04refs.meshes.keys())),
        highlight: __i04.highlightState(),
        lostObservers: r.engine.onContextLostObservable.observers.length,
        restoredObservers: r.engine.onContextRestoredObservable.observers.length,
        scenePointerObservers: r.scene.onPointerObservable.observers.length,
        diagnosticsText: (document.querySelector('.sf-viewport-diagnostics') || {}).textContent || null,
        isLost: r.canvas.getContext('webgl2').isContextLost()
      };
    })()`);
    record('context restoration is detected', restored && afterRestore.diag.contextLost === false && afterRestore.restoredEvent !== null, afterRestore);
    record('renderer engine/scene/canvas are not recreated or duplicated', afterRestore.canvasSame && afterRestore.engineSame && afterRestore.sceneSame && afterRestore.rendererSame && afterRestore.meshIdsSame && afterRestore.meshCount === 3 && afterRestore.sceneMeshCount === beforeLoss.sceneMeshCount, { beforeLoss, afterRestore });
    record('observers/listeners are not duplicated', afterRestore.lostObservers === beforeLoss.lostObservers && afterRestore.restoredObservers === beforeLoss.restoredObservers && afterRestore.scenePointerObservers === beforeLoss.scenePointerObservers, { beforeLoss, afterRestore });
    record('highlight state survives restoration', JSON.stringify(afterRestore.highlight) === JSON.stringify(beforeLoss.highlight), { beforeLoss: beforeLoss.highlight, afterRestore: afterRestore.highlight });
    record('diagnostics reflect restored renderer state', afterRestore.diag.contextLost === false && /WebGL 2/.test(afterRestore.diagnosticsText || '') && /3\/3 meshes/.test(afterRestore.diagnosticsText || ''), afterRestore.diagnosticsText);

    // Is it rendering after restore?
    const restoredUrl = await evaluate('__simuforgeRenderer.canvas.toDataURL("image/png")');
    const restoredStats = await evaluate(`__i04.pixelStats(${JSON.stringify(restoredUrl)})`, 30000);
    const renderDiff = await evaluate(`__i04.diffStats(${JSON.stringify(noSelUrl)}, ${JSON.stringify(restoredUrl)})`, 30000);
    record('restored renderer draws a non-empty viewport', restoredStats.nonDark > 1000, { restoredStats, renderDiff });
    await screenshot('05-restored');

    // Picking works after restore.
    const cubePt2 = await evaluate(`__i04.projectToClient(${JSON.stringify(fixture.cube)})`);
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: null })`);
    await sleep(150);
    await click(cubePt2.x, cubePt2.y);
    const selectedAfterRestore = await evaluate('__getStore().getSnapshot().editor.selectedEntityId');
    record('picking still works after restoration', selectedAfterRestore === fixture.cube, { selectedAfterRestore, expected: fixture.cube });

    const finalLogs = { logs, errors };
    fs.writeFileSync(path.join(OUT, 'result.json'), JSON.stringify({ results, beforeLoss, afterLoss, afterRestore, logs: finalLogs, initial, diagAfterCreate, cubePt, spherePt, emptyPt, projectCheck, highlightSequence, diff }, null, 2));
    console.log('\nRESULT SUMMARY');
    for (const r of results) console.log((r.pass ? 'PASS' : 'FAIL') + ' ' + r.name);
    console.log('console logs: ' + JSON.stringify(logs.slice(-10)));
    console.log('errors: ' + JSON.stringify(errors));
  } finally {
    if (cdp) cdp.close();
    await chrome.stop();
  }
}

main().catch((err) => {
  console.error('HARNESS ERROR', err && err.stack || err);
  fs.writeFileSync(path.join(OUT, 'harness-error.json'), JSON.stringify({ message: String(err && err.message || err), stack: err && err.stack, results }, null, 2));
  process.exitCode = 1;
});
