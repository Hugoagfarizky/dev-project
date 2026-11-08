'use strict';

const fs = require('fs');
const path = require('path');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;
const PORT = 9382;
const URL = 'http://localhost:5173/';

const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail === undefined ? '' : ' :: ' + JSON.stringify(detail)));
}

function section(title) {
  console.log('\n--- ' + title + ' ---');
}

async function main() {
  const chrome = await launch({ port: PORT, url: URL, windowWidth: 1440, windowHeight: 900 });
  let cdp;
  const logs = [];
  const errors = [];
  try {
    cdp = await connectToPage(PORT, 'localhost:5173');
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    try {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    } catch (_) {}
    await cdp.send('Page.bringToFront');

    cdp.on('Runtime.consoleAPICalled', (payload) => {
      const text = (payload.args || []).map((arg) => arg.value !== undefined ? String(arg.value) : (arg.description || arg.type)).join(' ');
      logs.push({ type: payload.type, text });
    });
    cdp.on('Runtime.exceptionThrown', (payload) => {
      errors.push({ kind: 'exception', text: String(payload.exceptionDetails && (payload.exceptionDetails.text + ' ' + ((payload.exceptionDetails.exception && payload.exceptionDetails.exception.description) || ''))) });
    });
    cdp.on('Log.entryAdded', (payload) => {
      if (payload.entry.level === 'error') errors.push({ kind: 'log', text: payload.entry.text });
      else logs.push({ type: payload.entry.level, text: payload.entry.text });
    });

    async function evaluate(expression, timeoutMs = 30000) {
      return cdp.evaluate(expression, { timeoutMs });
    }

    async function waitFor(expression, timeoutMs = 20000, label = expression) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try {
          if (await evaluate(expression)) return true;
        } catch (_) {}
        await sleep(120);
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
      await sleep(180);
    }

    async function drag(x1, y1, x2, y2, steps = 8, button = 'left') {
      const buttons = button === 'right' ? 2 : 1;
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x1, y: y1, button: 'none', buttons: 0 });
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: x1, y: y1, button, buttons, clickCount: 1 });
      for (let i = 1; i <= steps; i += 1) {
        await cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          x: x1 + ((x2 - x1) * i) / steps,
          y: y1 + ((y2 - y1) * i) / steps,
          button,
          buttons
        });
        await sleep(20);
      }
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x2, y: y2, button, buttons: 0, clickCount: 1 });
      await sleep(250);
    }

    async function key(key, code, vk, modifiers = 0, text) {
      const base = { key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers };
      if (text !== undefined) base.text = text;
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await sleep(160);
    }

    async function clickButton(label) {
      return evaluate(`(() => {
        const button = Array.from(document.querySelectorAll('button')).find((item) => (item.textContent || '').trim() === ${JSON.stringify(label)});
        if (!button) return false;
        button.click();
        return true;
      })()`);
    }

    // ---------- app bootstrap ----------
    await evaluate(`
      window.__getStore = function () {
        const root = document.querySelector('.sf-shell') || document.getElementById('root');
        if (!root) return null;
        const fiberKey = Object.keys(root).find((key) => key.startsWith('__reactFiber$'));
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
      window.__i05 = (() => {
        const store = () => __getStore();
        const renderer = () => window.__simuforgeRenderer;
        const state = () => store().getSnapshot();
        const entities = () => state().project.world.entities;
        const entity = (id) => entities().find((item) => item.id === id) || null;

        function projectToClient(id) {
          const r = renderer();
          const mesh = r.meshes.get(id);
          const rect = r.canvas.getBoundingClientRect();
          const V3 = mesh.position.constructor;
          const clip = V3.TransformCoordinates(mesh.getAbsolutePosition(), r.scene.getTransformMatrix());
          return {
            x: rect.left + (clip.x * 0.5 + 0.5) * rect.width,
            y: rect.top + (1 - (clip.y * 0.5 + 0.5)) * rect.height
          };
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
          for (let gy = 0.08; gy < 0.5; gy += 0.04) {
            for (let gx = 0.04; gx < 0.96; gx += 0.04) {
              const x = rect.left + rect.width * gx;
              const y = rect.top + rect.height * gy;
              if (!pickAtClient(x, y)) return { x, y };
            }
          }
          return null;
        }

        function highlightState() {
          const r = renderer();
          const out = {};
          for (const id of r.meshes.keys()) {
            out[id] = r.highlight ? r.highlight.hasMesh(r.meshes.get(id)) : null;
          }
          return out;
        }

        function hierarchyNames() {
          return Array.from(document.querySelectorAll('.sf-hierarchy-name')).map((node) => (node.textContent || '').trim());
        }

        function selectedRowName() {
          const node = document.querySelector('.sf-hierarchy-item.selected .sf-hierarchy-name');
          return node ? (node.textContent || '').trim() : null;
        }

        function inspector() {
          const root = document.querySelector('.sf-inspector-panel');
          if (!root) return null;
          const values = Array.from(root.querySelectorAll('.sf-inspector-value')).map((node) => (node.textContent || '').trim());
          const idNode = root.querySelector('.sf-inspector-id');
          return {
            text: (root.textContent || '').replace(/\\s+/g, ' ').trim(),
            values,
            id: idNode ? (idNode.textContent || '').trim() : null,
            empty: !!root.querySelector('.sf-inspector-empty'),
            inputCount: root.querySelectorAll('input, textarea, select').length
          };
        }

        function overlay() {
          const card = document.querySelector('.sf-empty-world-card');
          const container = document.querySelector('.sf-empty-world-overlay');
          return {
            present: !!card,
            title: card ? (card.querySelector('h2') || {}).textContent || null : null,
            buttons: card ? Array.from(card.querySelectorAll('button')).map((button) => (button.textContent || '').trim()) : [],
            pointerEvents: container ? getComputedStyle(container).pointerEvents : null
          };
        }

        function dialog() {
          const node = document.querySelector('.sf-dialog');
          if (!node) return { present: false };
          return {
            present: true,
            title: (node.querySelector('.sf-dialog-title') || {}).textContent || null,
            text: (node.querySelector('.sf-dialog-body') || {}).textContent || null,
            buttons: Array.from(node.querySelectorAll('button')).map((button) => (button.textContent || '').trim()),
            focused: document.activeElement ? (document.activeElement.textContent || '').trim() : null
          };
        }

        function meshState(id) {
          const mesh = renderer().meshes.get(id);
          if (!mesh) return null;
          const q = mesh.rotationQuaternion;
          return {
            name: mesh.name,
            position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
            rotation: q ? { x: q.x, y: q.y, z: q.z, w: q.w } : null,
            scaling: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z }
          };
        }

        function pixelStats(dataUrl) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const context = canvas.getContext('2d', { willReadFrequently: true });
              context.drawImage(img, 0, 0);
              const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
              let sum = 0;
              let nonDark = 0;
              for (let i = 0; i < data.length; i += 4) {
                const value = data[i] + data[i + 1] + data[i + 2];
                sum += value;
                if (value > 90) nonDark += 1;
              }
              resolve({ width: canvas.width, height: canvas.height, mean: sum / (data.length / 4) / 3, nonDark });
            };
            img.src = dataUrl;
          });
        }

        return {
          store, renderer, state, entities, entity,
          projectToClient, pickAtClient, findEmptyClient, highlightState,
          hierarchyNames, selectedRowName, inspector, overlay, dialog, meshState, pixelStats
        };
      })();
      true;
    `);

    // ---------- M0-AC-05 Empty project ----------
    section('M0-AC-05 Empty project');
    const initial = await evaluate(`(() => {
      const st = __i05.state();
      const r = __i05.renderer ? null : null;
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        entities: st.project.world.entities.length,
        hierarchyNames: __i05.hierarchyNames(),
        inspector: __i05.inspector(),
        overlay: __i05.overlay(),
        diagnostics: __simuforgeRenderer.getDiagnostics(),
        hasGrid: !!__simuforgeRenderer.grid,
        hasGridLines: !!__simuforgeRenderer.gridLines,
        gridVisible: __simuforgeRenderer.grid ? __simuforgeRenderer.grid.isVisible : null,
        hasCamera: !!__simuforgeRenderer.camera,
        canvas: { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight, left: rect.left, top: rect.top },
        inner: { width: window.innerWidth, height: window.innerHeight },
        bodyScrollWidth: document.documentElement.scrollWidth,
        shell: (() => { const node = document.querySelector('.sf-shell'); const b = node.getBoundingClientRect(); return { width: b.width, height: b.height }; })()
      };
    })()`);
    record('empty project has zero entities', initial.entities === 0 && initial.diagnostics.meshCount === 0 && initial.diagnostics.entityCount === 0, { entities: initial.entities, diag: initial.diagnostics });
    record('empty Hierarchy shows the empty state', initial.hierarchyNames.length === 0 && /No objects yet/.test(await evaluate('document.querySelector(".sf-hierarchy-panel").textContent')), initial.hierarchyNames);
    record('empty Inspector shows No selection', initial.inspector && initial.inspector.empty === true && /No selection/.test(initial.inspector.text), initial.inspector);
    record('Empty World overlay lists all three primitives', initial.overlay.present && initial.overlay.buttons.join(',') === 'Add Cube,Add Sphere,Add Plane' && initial.overlay.pointerEvents === 'none', initial.overlay);
    record('grid, grid lines, camera and WebGL 2 are available', initial.hasGrid && initial.hasGridLines && initial.gridVisible === true && initial.hasCamera && initial.diagnostics.webGlVersion === 2, initial.diagnostics);
    record('1440x900 layout fits without overflow', initial.inner.width === 1440 && initial.inner.height === 900 && initial.bodyScrollWidth <= 1440 && initial.shell.width <= 1440 && initial.canvas.clientWidth > 0, { inner: initial.inner, scroll: initial.bodyScrollWidth, shell: initial.shell, canvas: initial.canvas });
    const emptyShot = await screenshot('i06-1440-empty');

    const cameraBeforeEmptyDrag = await evaluate('(() => { const c = __simuforgeRenderer.camera; return { alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target.asArray() }; })()');
    await drag(initial.canvas.left + 80, initial.canvas.top + 80, initial.canvas.left + 140, initial.canvas.top + 120, 8, 'right');
    const cameraAfterEmptyDrag = await evaluate('(() => { const c = __simuforgeRenderer.camera; return { alpha: c.alpha, beta: c.beta, radius: c.radius, target: c.target.asArray() }; })()');
    record('overlay does not block camera pan interaction outside the card', JSON.stringify(cameraBeforeEmptyDrag.target) !== JSON.stringify(cameraAfterEmptyDrag.target), { cameraBeforeEmptyDrag, cameraAfterEmptyDrag });

    // Reset camera to the initial pose for the remaining checks.
    await evaluate(`(() => { const c = __simuforgeRenderer.camera; c.alpha = Math.PI / 2; c.beta = Math.PI / 3; c.radius = 10; c.setTarget(new (c.target.constructor)(0, 0.5, 0)); return true; })()`);
    await sleep(400);

    // ---------- M0-AC-06 Primitive creation ----------
    section('M0-AC-06 Primitive creation');
    const overlayAddCube = await clickButton('Add Cube');
    await waitFor('__i05.entities().length === 1 && __simuforgeRenderer.getDiagnostics().meshCount === 1', 10000, 'overlay cube');
    const afterCube = await evaluate(`(() => {
      const st = __i05.state();
      const entity = st.project.world.entities[0];
      return {
        clicked: ${overlayAddCube},
        entity: { id: entity.id, name: entity.name, type: entity.type, transform: entity.transform },
        selected: st.editor.selectedEntityId,
        overlay: __i05.overlay(),
        mesh: __i05.meshState(entity.id),
        diag: __simuforgeRenderer.getDiagnostics()
      };
    })()`);
    record('Empty World Add Cube creates and selects a Cube', overlayAddCube === true && afterCube.entity.type === 'cube' && afterCube.entity.name === 'Cube' && afterCube.selected === afterCube.entity.id, afterCube);
    record('Cube uses its POC-01 default transform', JSON.stringify(afterCube.entity.transform) === JSON.stringify({ position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } }), afterCube.entity.transform);
    record('overlay disappears after the first entity is created', afterCube.overlay.present === false, afterCube.overlay);

    const sphereAdded = await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('.sf-asset-item')).find((item) => (item.textContent || '').includes('Sphere'));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitFor('__i05.entities().length === 2', 10000, 'sphere');
    const planeAdded = await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('.sf-asset-item')).find((item) => (item.textContent || '').includes('Plane'));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await waitFor('__i05.entities().length === 3 && __simuforgeRenderer.getDiagnostics().meshCount === 3', 10000, 'plane');
    await sleep(400);

    const creation = await evaluate(`(() => {
      const st = __i05.state();
      return {
        sphereAdded: ${sphereAdded},
        planeAdded: ${planeAdded},
        entities: st.project.world.entities.map((entity) => ({ id: entity.id, name: entity.name, type: entity.type, transform: entity.transform })),
        selected: st.editor.selectedEntityId,
        diag: __simuforgeRenderer.getDiagnostics(),
        hierarchyNames: __i05.hierarchyNames(),
        selectedRow: __i05.selectedRowName(),
        inspector: __i05.inspector(),
        meshes: Object.fromEntries(st.project.world.entities.map((entity) => [entity.id, __i05.meshState(entity.id)]))
      };
    })()`);
    const byType = Object.fromEntries(creation.entities.map((entity) => [entity.type, entity]));
    record('Sphere and Plane actions create their primitives', creation.sphereAdded && creation.planeAdded && creation.entities.length === 3 && !!byType.cube && !!byType.sphere && !!byType.plane, creation.entities.map((entity) => entity.type));
    record('default names follow POC-01', creation.entities.map((entity) => entity.name).join(',') === 'Cube,Sphere,Plane', creation.entities.map((entity) => entity.name));
    record('all primitive UUIDs are unique', new Set(creation.entities.map((entity) => entity.id)).size === 3, creation.entities.map((entity) => entity.id));
    const defaultsOk = byType.cube.transform.position.y === 0.5 && byType.sphere.transform.position.y === 0.5 && byType.plane.transform.position.y === 0;
    record('Sphere and Plane use their POC-01 default transforms', defaultsOk && byType.plane.transform.position.x === 0 && byType.plane.transform.position.z === 0, { cube: byType.cube.transform, sphere: byType.sphere.transform, plane: byType.plane.transform });
    record('created entities are visible and mesh count matches', creation.diag.meshCount === 3 && creation.diag.entityCount === 3 && Object.values(creation.meshes).every((mesh) => mesh !== null), creation.meshes);
    record('creation auto-selects the newest Plane across surfaces', creation.selected === byType.plane.id && creation.selectedRow === 'Plane' && creation.inspector && /Plane/.test(creation.inspector.text), { selected: creation.selected, selectedRow: creation.selectedRow, inspector: creation.inspector });

    const createdUrl = await evaluate('__simuforgeRenderer.canvas.toDataURL("image/png")');
    const createdStats = await evaluate(`__i05.pixelStats(${JSON.stringify(createdUrl)})`, 30000);
    record('viewport renders visible primitive pixels', createdStats.nonDark > 10000, createdStats);

    // Space the primitives so viewport clicking is unambiguous.
    await evaluate(`(() => {
      const store = __getStore();
      const st = store.getSnapshot();
      const byType = {};
      for (const entity of st.project.world.entities) byType[entity.type] = entity;
      store.dispatch({ type: 'transform/set', id: byType.cube.id, source: 'inspector', transform: { position: { x: -1.6, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
      store.dispatch({ type: 'transform/set', id: byType.sphere.id, source: 'inspector', transform: { position: { x: 0, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
      store.dispatch({ type: 'transform/set', id: byType.plane.id, source: 'inspector', transform: { position: { x: 1.6, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
      return true;
    })()`);
    await sleep(500);
    const primitivesShot = await screenshot('i06-1440-primitives');

    const ids = await evaluate(`(() => {
      const st = __i05.state();
      const byType = {};
      for (const entity of st.project.world.entities) byType[entity.type] = entity.id;
      return byType;
    })()`);
    const cubePoint = await evaluate(`__i05.projectToClient(${JSON.stringify(ids.cube)})`);
    const spherePoint = await evaluate(`__i05.projectToClient(${JSON.stringify(ids.sphere)})`);
    const planePoint = await evaluate(`__i05.projectToClient(${JSON.stringify(ids.plane)})`);
    const emptyPoint = await evaluate('__i05.findEmptyClient()');
    const prePick = await evaluate(`({ cube: __i05.pickAtClient(${cubePoint.x}, ${cubePoint.y}), sphere: __i05.pickAtClient(${spherePoint.x}, ${spherePoint.y}), plane: __i05.pickAtClient(${planePoint.x}, ${planePoint.y}), empty: __i05.pickAtClient(${emptyPoint.x}, ${emptyPoint.y}) })`);
    record('projected points resolve to the intended primitives', prePick.cube === ids.cube && prePick.sphere === ids.sphere && prePick.plane === ids.plane && prePick.empty === null, { cubePoint, spherePoint, planePoint, emptyPoint, prePick });

    // ---------- M0-AC-07 Selection ----------
    section('M0-AC-07 Selection');
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: null })`);
    await sleep(200);
    await click(cubePoint.x, cubePoint.y);
    const selectCube = await evaluate(`(() => ({ selected: __i05.state().editor.selectedEntityId, row: __i05.selectedRowName(), inspector: __i05.inspector(), highlight: __i05.highlightState() }))()`);
    record('viewport click selects the Cube across store, Hierarchy, Inspector and highlight', selectCube.selected === ids.cube && selectCube.row === 'Cube' && selectCube.inspector && /Cube/.test(selectCube.inspector.text) && selectCube.highlight[ids.cube] === true && selectCube.highlight[ids.sphere] === false && selectCube.highlight[ids.plane] === false, selectCube);

    await click(emptyPoint.x, emptyPoint.y);
    const cleared = await evaluate(`(() => ({ selected: __i05.state().editor.selectedEntityId, inspector: __i05.inspector(), highlight: __i05.highlightState() }))()`);
    record('empty-space click clears selection everywhere', cleared.selected === null && cleared.inspector && cleared.inspector.empty === true && Object.values(cleared.highlight).every((value) => value === false), cleared);

    const hierarchyClick = await evaluate(`(() => {
      const row = Array.from(document.querySelectorAll('.sf-hierarchy-row')).find((item) => (item.textContent || '').includes('Sphere'));
      if (!row) return false;
      row.click();
      return true;
    })()`);
    await sleep(300);
    const selectSphere = await evaluate(`(() => ({ selected: __i05.state().editor.selectedEntityId, row: __i05.selectedRowName(), inspector: __i05.inspector(), highlight: __i05.highlightState() }))()`);
    record('Hierarchy click selects the Sphere across store, Inspector and highlight', hierarchyClick && selectSphere.selected === ids.sphere && selectSphere.row === 'Sphere' && selectSphere.inspector && /Sphere/.test(selectSphere.inspector.text) && selectSphere.highlight[ids.sphere] === true && selectSphere.highlight[ids.cube] === false, selectSphere);

    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(ids.plane)} })`);
    await sleep(250);
    const selectPlane = await evaluate(`(() => ({ selected: __i05.state().editor.selectedEntityId, row: __i05.selectedRowName(), inspector: __i05.inspector(), highlight: __i05.highlightState() }))()`);
    record('programmatic selection updates all surfaces', selectPlane.selected === ids.plane && selectPlane.row === 'Plane' && selectPlane.inspector && /Plane/.test(selectPlane.inspector.text) && selectPlane.highlight[ids.plane] === true, selectPlane);

    // Camera updates must not re-render/remount the hierarchy or inspector.
    await evaluate(`(() => {
      window.__mutationCount = 0;
      window.__observer = new MutationObserver((records) => { window.__mutationCount += records.length; });
      window.__observer.observe(document.querySelector('.sf-hierarchy-panel'), { subtree: true, childList: true, characterData: true, attributes: true });
      window.__observer.observe(document.querySelector('.sf-inspector-panel'), { subtree: true, childList: true, characterData: true, attributes: true });
      return true;
    })()`);
    await evaluate(`(() => {
      const store = __getStore();
      for (let index = 0; index < 6; index += 1) {
        store.dispatch({ type: 'camera/set', pose: { alpha: 1.2 + index * 0.05, beta: 1.0, radius: 9, target: { x: 0, y: 0.5, z: 0 } } });
      }
      return true;
    })()`);
    await sleep(350);
    const cameraMutations = await evaluate('window.__mutationCount');
    record('camera-only updates do not mutate Hierarchy or Inspector', cameraMutations === 0, { cameraMutations });

    // ---------- M0-AC-12 Rename/Delete ----------
    section('M0-AC-12 Rename/Delete');
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(ids.cube)} })`);
    await sleep(200);
    const beforeRename = await evaluate(`(() => { const entity = __i05.entity(${JSON.stringify(ids.cube)}); return { name: entity.name, id: entity.id, transform: entity.transform }; })()`);
    await key('F2', 'F2', 113);
    const renameStart = await evaluate(`(() => {
      const input = document.querySelector('.sf-inline-rename');
      return { present: !!input, focused: document.activeElement === input, value: input ? input.value : null, selection: input ? [input.selectionStart, input.selectionEnd] : null };
    })()`);
    record('F2 starts rename with a focused, selected input', renameStart.present && renameStart.focused && renameStart.value === 'Cube' && renameStart.selection[0] === 0 && renameStart.selection[1] === 4, renameStart);

    // Keyboard guard: Delete while renaming must not open the confirmation dialog.
    await key('Delete', 'Delete', 46);
    const deleteDuringRename = await evaluate(`(() => ({ dialog: __i05.dialog(), focused: document.activeElement ? document.activeElement.className : null }))()`);
    record('Delete is ignored while the rename input is focused', deleteDuringRename.dialog.present === false && /sf-inline-rename/.test(deleteDuringRename.focused || ''), deleteDuringRename);

    await evaluate('document.activeElement && document.activeElement.select && document.activeElement.select()');
    await cdp.send('Input.insertText', { text: '  Hero Cube  ' });
    await key('Enter', 'Enter', 13, 0, '\r');
    await sleep(300);
    const renamed = await evaluate(`(() => {
      const entity = __i05.entity(${JSON.stringify(ids.cube)});
      return { name: entity.name, id: entity.id, transform: entity.transform, hierarchyNames: __i05.hierarchyNames(), inspector: __i05.inspector(), inputPresent: !!document.querySelector('.sf-inline-rename') };
    })()`);
    record('rename trims input and updates Hierarchy and Inspector', renamed.name === 'Hero Cube' && renamed.hierarchyNames.includes('Hero Cube') && renamed.inspector && /Hero Cube/.test(renamed.inspector.text) && renamed.inputPresent === false, renamed);
    record('rename preserves entity ID and transform', renamed.id === beforeRename.id && JSON.stringify(renamed.transform) === JSON.stringify(beforeRename.transform), { before: beforeRename, after: renamed });

    // Escape cancels rename.
    await key('F2', 'F2', 113);
    await evaluate('document.activeElement && document.activeElement.select && document.activeElement.select()');
    await cdp.send('Input.insertText', { text: 'Discarded Name' });
    await key('Escape', 'Escape', 27);
    await sleep(250);
    const cancelledRename = await evaluate(`__i05.entity(${JSON.stringify(ids.cube)}).name`);
    record('Escape cancels inline rename', cancelledRename === 'Hero Cube', { name: cancelledRename });

    // Whitespace-only rename is rejected and the previous name restored.
    await key('F2', 'F2', 113);
    await evaluate('document.activeElement && document.activeElement.select && document.activeElement.select()');
    await cdp.send('Input.insertText', { text: '    ' });
    await key('Enter', 'Enter', 13, 0, '\r');
    await sleep(250);
    const whitespaceRename = await evaluate(`__i05.entity(${JSON.stringify(ids.cube)}).name`);
    record('whitespace-only rename is rejected', whitespaceRename === 'Hero Cube', { name: whitespaceRename });

    // Delete request + cancel.
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(ids.cube)} })`);
    await sleep(150);
    await key('Delete', 'Delete', 46);
    const deleteDialog = await evaluate(`__i05.dialog()`);
    const deleteDialogShot = await screenshot('i06-1440-delete-dialog');
    record('Delete opens a confirmation dialog with the entity name', deleteDialog.present && deleteDialog.title === 'Delete entity' && /Hero Cube/.test(deleteDialog.text || '') && deleteDialog.buttons.join(',') === 'Cancel,Delete', deleteDialog);
    record('destructive dialog initially focuses Cancel', deleteDialog.focused === 'Cancel', deleteDialog.focused);
    const cancelClick = await clickButton('Cancel');
    await sleep(250);
    const afterCancel = await evaluate(`(() => ({ dialog: __i05.dialog(), exists: !!__i05.entity(${JSON.stringify(ids.cube)}), selected: __i05.state().editor.selectedEntityId, inspector: __i05.inspector() }))()`);
    record('Cancel keeps the entity, selection and Inspector', cancelClick && afterCancel.dialog.present === false && afterCancel.exists && afterCancel.selected === ids.cube && afterCancel.inspector && /Hero Cube/.test(afterCancel.inspector.text), afterCancel);

    // Escape dismisses the dialog and keeps the entity.
    await key('Delete', 'Delete', 46);
    await sleep(150);
    await key('Escape', 'Escape', 27);
    await sleep(250);
    const escapeDialog = await evaluate(`(() => ({ dialog: __i05.dialog(), exists: !!__i05.entity(${JSON.stringify(ids.cube)}), selected: __i05.state().editor.selectedEntityId }))()`);
    record('Escape dismisses the delete dialog without deleting', escapeDialog.dialog.present === false && escapeDialog.exists && escapeDialog.selected === ids.cube, escapeDialog);

    // Confirm delete clears selection and Inspector.
    await key('Delete', 'Delete', 46);
    await sleep(150);
    const confirmClick = await clickButton('Delete');
    await sleep(350);
    const afterConfirm = await evaluate(`(() => ({
      exists: !!__i05.entity(${JSON.stringify(ids.cube)}),
      selected: __i05.state().editor.selectedEntityId,
      inspector: __i05.inspector(),
      hierarchyNames: __i05.hierarchyNames(),
      meshIds: Array.from(__simuforgeRenderer.meshes.keys()),
      diag: __simuforgeRenderer.getDiagnostics(),
      dialog: __i05.dialog()
    }))()`);
    record('confirm removes the entity, clears selection and resets Inspector', confirmClick && afterConfirm.exists === false && afterConfirm.selected === null && afterConfirm.inspector && afterConfirm.inspector.empty === true && afterConfirm.hierarchyNames.join(',') === 'Sphere,Plane' && !afterConfirm.meshIds.includes(ids.cube) && afterConfirm.diag.meshCount === 2 && afterConfirm.dialog.present === false, afterConfirm);

    // Delete a non-selected entity keeps the valid selection.
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(ids.sphere)} })`);
    await sleep(200);
    const deletePlaneRow = await evaluate(`(() => {
      const item = Array.from(document.querySelectorAll('.sf-hierarchy-item')).find((node) => (node.textContent || '').includes('Plane'));
      if (!item) return false;
      const button = item.querySelector('.sf-icon-btn.danger');
      if (!button) return false;
      button.click();
      return true;
    })()`);
    await sleep(200);
    const confirmNonSelected = await clickButton('Delete');
    await sleep(300);
    const afterNonSelectedDelete = await evaluate(`(() => ({ selected: __i05.state().editor.selectedEntityId, names: __i05.hierarchyNames(), inspector: __i05.inspector(), diag: __simuforgeRenderer.getDiagnostics() }))()`);
    record('deleting a non-selected entity preserves the selection', deletePlaneRow && confirmNonSelected && afterNonSelectedDelete.selected === ids.sphere && afterNonSelectedDelete.names.join(',') === 'Sphere' && afterNonSelectedDelete.inspector && /Sphere/.test(afterNonSelectedDelete.inspector.text) && afterNonSelectedDelete.diag.meshCount === 1, afterNonSelectedDelete);

    // Hierarchy cannot display entities outside the world.
    const hierarchyMatchesWorld = await evaluate(`(() => {
      const names = __i05.entities().map((entity) => entity.name);
      const rows = __i05.hierarchyNames();
      return { names, rows, matches: names.length === rows.length && names.every((name) => rows.includes(name)) };
    })()`);
    record('Hierarchy shows exactly the world entities', hierarchyMatchesWorld.matches, hierarchyMatchesWorld);

    // ---------- Empty World overlay lifecycle ----------
    section('Empty World overlay lifecycle');
    await evaluate(`__getStore().dispatch({ type: 'selection/set', id: ${JSON.stringify(ids.sphere)} })`);
    await key('Delete', 'Delete', 46);
    await sleep(150);
    await clickButton('Delete');
    await sleep(400);
    const emptyAgain = await evaluate(`(() => ({ entities: __i05.entities().length, diag: __simuforgeRenderer.getDiagnostics(), overlay: __i05.overlay(), hierarchyNames: __i05.hierarchyNames(), inspector: __i05.inspector(), selected: __i05.state().editor.selectedEntityId }))()`);
    record('overlay returns after every entity is deleted', emptyAgain.entities === 0 && emptyAgain.diag.meshCount === 0 && emptyAgain.overlay.present && emptyAgain.overlay.buttons.length === 3, emptyAgain);
    record('empty world resets Hierarchy and Inspector', emptyAgain.hierarchyNames.length === 0 && emptyAgain.inspector && emptyAgain.inspector.empty === true && emptyAgain.selected === null, emptyAgain);
    await screenshot('i06-1440-empty-again');

    // ---------- Context loss / restoration ----------
    section('Context loss and restoration');
    await evaluate(`(() => {
      const store = __getStore();
      store.dispatch({ type: 'entity/create', entityType: 'cube' });
      store.dispatch({ type: 'entity/create', entityType: 'sphere' });
      store.dispatch({ type: 'entity/create', entityType: 'plane' });
      return true;
    })()`);
    await waitFor('__simuforgeRenderer.getDiagnostics().meshCount === 3', 10000, 'three meshes for context test');
    await sleep(300);
    const beforeLoss = await evaluate(`(() => ({ diag: __simuforgeRenderer.getDiagnostics(), canvasSame: true, meshIds: Array.from(__simuforgeRenderer.meshes.keys()), highlight: __i05.highlightState() }))()`);
    await evaluate(`(() => { const refs = { canvas: __simuforgeRenderer.canvas, engine: __simuforgeRenderer.engine, scene: __simuforgeRenderer.scene, renderer: __simuforgeRenderer }; window.__i05refs = refs; return true; })()`);
    const lose = await evaluate(`(() => { const gl = __simuforgeRenderer.canvas.getContext('webgl2'); const ext = gl && gl.getExtension('WEBGL_lose_context'); if (!ext) return { ok: false }; ext.loseContext(); window.__i05ext = ext; return { ok: true, isLost: gl.isContextLost() }; })()`);
    let fallbackAppeared = false;
    try {
      await waitFor('!!document.querySelector(".sf-webgl-fallback")', 8000, 'context fallback');
      fallbackAppeared = true;
    } catch (_) {}
    const afterLoss = await evaluate(`(() => ({ diag: __simuforgeRenderer.getDiagnostics(), fallback: !!document.querySelector(".sf-webgl-fallback"), overlay: __i05.overlay() }))()`);
    record('context loss shows the fallback and suppresses the empty overlay', lose.ok && lose.isLost && fallbackAppeared && afterLoss.diag.contextLost && afterLoss.fallback && afterLoss.overlay.present === false, { lose, afterLoss });
    await screenshot('i06-1440-context-lost');
    await evaluate('window.__i05ext.restoreContext()');
    let restored = false;
    try {
      await waitFor('!document.querySelector(".sf-webgl-fallback") && __simuforgeRenderer.getDiagnostics().contextLost === false', 15000, 'context restoration');
      restored = true;
    } catch (_) {}
    await sleep(800);
    const afterRestore = await evaluate(`(() => ({
      diag: __simuforgeRenderer.getDiagnostics(),
      canvasSame: __simuforgeRenderer.canvas === window.__i05refs.canvas,
      engineSame: __simuforgeRenderer.engine === window.__i05refs.engine,
      sceneSame: __simuforgeRenderer.scene === window.__i05refs.scene,
      meshIds: Array.from(__simuforgeRenderer.meshes.keys()),
      meshCount: __simuforgeRenderer.meshes.size,
      layerMeshCount: __simuforgeRenderer.scene.meshes.length
    }))()`);
    record('context restoration preserves the renderer instance and meshes', restored && afterRestore.canvasSame && afterRestore.engineSame && afterRestore.sceneSame && afterRestore.meshCount === 3 && JSON.stringify(afterRestore.meshIds) === JSON.stringify(beforeLoss.meshIds), { beforeLoss, afterRestore });

    // ---------- 1024x640 ----------
    section('1024x640 layout');
    await evaluate('window.__resizeRefs = { canvas: __simuforgeRenderer.canvas, engine: __simuforgeRenderer.engine, scene: __simuforgeRenderer.scene }; true');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1024, height: 640, deviceScaleFactor: 1, mobile: false });
    await sleep(900);
    const small = await evaluate(`(() => {
      const shell = document.querySelector('.sf-shell');
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        inner: { width: window.innerWidth, height: window.innerHeight },
        tooSmall: !!document.querySelector('.sf-window-too-small'),
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        shell: shell ? { width: shell.getBoundingClientRect().width, height: shell.getBoundingClientRect().height } : null,
        canvas: { width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight },
        hierarchyRows: document.querySelectorAll('.sf-hierarchy-item').length,
        inspectorEmpty: !!document.querySelector('.sf-inspector-empty'),
        diag: __simuforgeRenderer.getDiagnostics(),
        badge: (() => { const node = document.querySelector('.sf-viewport-stats') || document.querySelector('.sf-viewport-host'); return node ? (node.textContent || '').replace(/\\s+/g, ' ').trim() : null; })(),
        overlay: __i05.overlay()
      };
    })()`);
    record('1024x640 layout renders without the too-small guard', small.inner.width === 1024 && small.inner.height === 640 && small.tooSmall === false && small.scrollWidth <= 1024 && small.canvas.clientWidth > 0 && small.canvas.clientHeight > 0, small);
    record('1024x640 keeps the viewport, Hierarchy and Inspector usable', small.canvas.clientHeight > 200 && small.hierarchyRows === 3 && small.inspectorEmpty === false, small);
    record('1024x640 keeps renderer diagnostics consistent', small.diag.meshCount === 3 && small.diag.entityCount === 3, small.diag);
    const smallShot = await screenshot('i06-1024-primitives');

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(700);

    section('Preset and canvas lifecycle preservation');
    const resizeRefs = await evaluate(`(() => ({ canvasSame: __simuforgeRenderer.canvas === window.__resizeRefs.canvas, engineSame: __simuforgeRenderer.engine === window.__resizeRefs.engine, sceneSame: __simuforgeRenderer.scene === window.__resizeRefs.scene, canvasWidth: document.querySelector('canvas').clientWidth, diag: __simuforgeRenderer.getDiagnostics() }))()`);
    record('resizing preserves the canvas, engine, scene and meshes', resizeRefs.canvasSame && resizeRefs.engineSame && resizeRefs.sceneSame && resizeRefs.canvasWidth > 0 && resizeRefs.diag.meshCount === 3, resizeRefs);

    const presetPreservation = await evaluate(`(async () => {
      const store = __getStore();
      const before = store.getSnapshot();
      const camera = __simuforgeRenderer.camera;
      const cameraBefore = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius, target: camera.target.asArray() };
      const clickPreset = (name) => {
        const button = Array.from(document.querySelectorAll('.sf-preset-btn')).find((item) => (item.textContent || '').trim() === name);
        if (!button) return false;
        button.click();
        return true;
      };
      const results = {};
      for (const name of ['Program', 'Simulate', 'Build']) {
        const clicked = clickPreset(name);
        await new Promise((resolve) => setTimeout(resolve, 150));
        const active = Array.from(document.querySelectorAll('.sf-preset-btn.active')).map((item) => (item.textContent || '').trim());
        const state = store.getSnapshot();
        results[name] = {
          clicked,
          active,
          worldSame: state.project.world === before.project.world,
          selectionSame: state.editor.selectedEntityId === before.editor.selectedEntityId,
          cameraSame: camera.alpha === cameraBefore.alpha && camera.beta === cameraBefore.beta && camera.radius === cameraBefore.radius && JSON.stringify(camera.target.asArray()) === JSON.stringify(cameraBefore.target)
        };
      }
      return results;
    })()`);
    record('Build, Program and Simulate presets switch without changing world, selection or camera',
      Object.values(presetPreservation).every((entry) => entry.clicked && entry.active.length === 1 && entry.worldSame && entry.selectionSame && entry.cameraSame) && presetPreservation.Program.active[0] === 'Program' && presetPreservation.Simulate.active[0] === 'Simulate' && presetPreservation.Build.active[0] === 'Build',
      presetPreservation);

    // ---------- Exit criteria ----------
    section('Exit criteria');
    const exitCriteria = await evaluate(`(() => {
      const inspectorText = (document.querySelector('.sf-inspector-panel') || {}).textContent || '';
      const pageText = document.body.textContent || '';
      return {
        inspectorText,
        hasComponents: /Components/.test(inspectorText),
        hasBehavior: /Behavior/.test(inspectorText),
        hasRuntime: /Runtime/.test(inspectorText),
        hasSimulation: /Simulation/.test(inspectorText),
        transformInputs: document.querySelectorAll('.sf-inspector-panel input, .sf-inspector-panel textarea, .sf-inspector-panel select').length,
        hasProjectHub: /Project Hub|New Project|Save Project|Open Project/.test(pageText),
        hasSimulationControls: /Start Simulation|Stop Simulation|Play|Pause/.test(pageText)
      };
    })()`);
    record('Inspector omits Components, Behavior, Runtime and Simulation sections', !exitCriteria.hasComponents && !exitCriteria.hasBehavior && !exitCriteria.hasRuntime && !exitCriteria.hasSimulation, exitCriteria);
    record('Inspector exposes transform editing inputs', exitCriteria.transformInputs >= 9, exitCriteria.transformInputs);
    record('no persistence or Project Hub UI', exitCriteria.hasProjectHub === false, exitCriteria.hasProjectHub);
    record('no simulation/runtime controls', exitCriteria.hasSimulationControls === false, exitCriteria.hasSimulationControls);

    const finalState = await evaluate(`(() => ({
      entities: __i05.entities().map((entity) => ({ id: entity.id, name: entity.name, type: entity.type })),
      diag: __simuforgeRenderer.getDiagnostics(),
      hierarchyNames: __i05.hierarchyNames(),
      selected: __i05.state().editor.selectedEntityId,
      overlay: __i05.overlay(),
      inspector: __i05.inspector(),
      scrollWidth: document.documentElement.scrollWidth,
      inner: { width: window.innerWidth, height: window.innerHeight }
    }))()`);
    record('final renderer mesh count equals entity count', finalState.diag.meshCount === finalState.diag.entityCount && finalState.diag.meshCount === finalState.entities.length, finalState.diag);

    const unexpectedErrors = errors.filter((entry) => !/404/.test(entry.text));
    record('no unexpected console errors or exceptions', unexpectedErrors.length === 0, { errors, logs: logs.slice(-8) });

    const summary = {
      results,
      browser: chrome.version,
      userAgent: chrome.userAgent,
      environment: {
        inner: initial.inner,
        devicePixelRatio: await evaluate('devicePixelRatio')
      },
      screenshots: [emptyShot, primitivesShot, deleteDialogShot, smallShot].map((file) => path.basename(file)),
      console: { logs, errors },
      finalState
    };
    fs.writeFileSync(path.join(OUT, 'i06-result.json'), JSON.stringify(summary, null, 2));

    console.log('\n=== RESULT SUMMARY ===');
    for (const result of results) {
      console.log((result.pass ? 'PASS' : 'FAIL') + ' ' + result.name);
    }
    const failed = results.filter((result) => !result.pass);
    console.log(`Total: ${results.length}, passed: ${results.length - failed.length}, failed: ${failed.length}`);
    console.log('errors: ' + JSON.stringify(errors));
  } finally {
    if (cdp) cdp.close();
    await chrome.stop();
  }
}

main().catch((error) => {
  console.error('HARNESS ERROR', error && error.stack || error);
  fs.writeFileSync(path.join(OUT, 'i05-harness-error.json'), JSON.stringify({ message: String(error && error.message || error), stack: error && error.stack, results }, null, 2));
  process.exitCode = 1;
});
