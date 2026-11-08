'use strict';
const fs = require('fs');
const path = require('path');
const { launch } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/browser.js');
const { connectToPage, sleep } = require('D:/Github/dev-project/projects/simuforge/reports/poc-01/harness/runner/lib/cdp.js');

const OUT = __dirname;
const results = [];
function record(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail });
  console.log((pass ? 'PASS' : 'FAIL') + '  ' + name + (detail === undefined ? '' : ' :: ' + JSON.stringify(detail)));
}

(async () => {
  const chrome = await launch({ port: 9361, url: 'http://localhost:5173/', windowWidth: 1280, windowHeight: 900 });
  let cdp;
  const logs = [];
  const errors = [];
  try {
    cdp = await connectToPage(9361, 'localhost:5173');
    cdp.on('Runtime.consoleAPICalled', (p) => logs.push({ type: p.type, text: (p.args || []).map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type)).join(' ') }));
    cdp.on('Runtime.exceptionThrown', (p) => errors.push({ kind: 'exception', text: String(p.exceptionDetails && (p.exceptionDetails.text + ' ' + ((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || ''))) }));
    cdp.on('Log.entryAdded', (p) => { if (p.entry.level === 'error') errors.push({ kind: 'log', text: p.entry.text }); });
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');

    async function evaluate(expression, timeoutMs = 30000) { return cdp.evaluate(expression, { timeoutMs }); }
    async function waitFor(expression, timeoutMs = 20000, label = expression) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        try { if (await evaluate(expression)) return true; } catch (_) {}
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

    await evaluate(`
      window.__getStore = function () {
        const root = document.querySelector('.sf-shell') || document.getElementById('root');
        if (!root) return null;
        const fiberKey = Object.keys(root).find((k) => k.startsWith('__reactFiber$'));
        let fiber = fiberKey ? root[fiberKey] : null;
        while (fiber) {
          const props = fiber.memoizedProps;
          if (props && props.store && typeof props.store.dispatch === 'function' && typeof props.store.getSnapshot === 'function') return props.store;
          fiber = fiber.return;
        }
        return null;
      };
      true;
    `);
    await waitFor('!!(__getStore() && window.__simuforgeRenderer && window.__simuforgeRenderer.scene)', 30000, 'app + renderer');
    await sleep(600);

    const empty = await evaluate(`(() => {
      const r = __simuforgeRenderer;
      return {
        lights: r.scene.lights.length,
        meshCount: r.getDiagnostics().meshCount,
        entityCount: r.getDiagnostics().entityCount,
        gridVisible: r.grid ? r.grid.isVisible : null,
        gridPickable: r.grid ? r.grid.isPickable : null,
        gridLinesVisible: r.gridLines ? r.gridLines.isVisible : null,
        gridLinesPickable: r.gridLines ? r.gridLines.isPickable : null,
        gridMaterial: r.grid && r.grid.material ? {
          type: r.grid.material.getClassName(),
          disableLighting: r.grid.material.disableLighting,
          emissive: r.grid.material.emissiveColor.asArray()
        } : null
      };
    })()`);
    record('POC-01 scene has no world light', empty.lights === 0, empty);
    record('grid fill + line grid exist, visible and not pickable', empty.gridVisible === true && empty.gridPickable === false && empty.gridLinesVisible === true && empty.gridLinesPickable === false, empty);
    record('grid material is unlit', empty.gridMaterial && empty.gridMaterial.disableLighting === true && empty.gridMaterial.emissive.some((v) => v > 0), empty.gridMaterial);
    await screenshot('p1-00-empty');

    const emptyUrl = await evaluate('__simuforgeRenderer.canvas.toDataURL("image/png")');

    await evaluate(`(() => {
      const s = __getStore();
      s.dispatch({ type: 'entity/create', entityType: 'cube' });
      s.dispatch({ type: 'entity/create', entityType: 'sphere' });
      s.dispatch({ type: 'entity/create', entityType: 'plane' });
      return true;
    })()`);
    await waitFor('__simuforgeRenderer.getDiagnostics().meshCount === 3', 10000, 'three meshes');
    await sleep(300);

    const defaults = await evaluate(`(() => {
      const st = __getStore().getSnapshot();
      return st.project.world.entities.map((e) => ({ type: e.type, transform: e.transform }));
    })()`);
    const cubeEntity = defaults.find((e) => e.type === 'cube');
    const sphereEntity = defaults.find((e) => e.type === 'sphere');
    const planeEntity = defaults.find((e) => e.type === 'plane');
    record('cube default position (0, 0.5, 0)', JSON.stringify(cubeEntity.transform.position) === JSON.stringify({ x: 0, y: 0.5, z: 0 }), cubeEntity);
    record('sphere default position (0, 0.5, 0)', JSON.stringify(sphereEntity.transform.position) === JSON.stringify({ x: 0, y: 0.5, z: 0 }), sphereEntity);
    record('plane default position (0, 0, 0)', JSON.stringify(planeEntity.transform.position) === JSON.stringify({ x: 0, y: 0, z: 0 }), planeEntity);

    // Spread the primitives visually for the remaining renderer checks.
    await evaluate(`(() => {
      const s = __getStore();
      const st = s.getSnapshot();
      const sphere = st.project.world.entities.find((e) => e.type === 'sphere');
      const plane = st.project.world.entities.find((e) => e.type === 'plane');
      s.dispatch({ type: 'transform/set', id: sphere.id, source: 'inspector', transform: { position: { x: 2, y: 0.5, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
      s.dispatch({ type: 'transform/set', id: plane.id, source: 'inspector', transform: { position: { x: -2, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } } });
      return true;
    })()`);
    await sleep(300);

    const conformance = await evaluate(`(() => {
      const r = __simuforgeRenderer;
      const st = __getStore().getSnapshot();
      const out = { entities: st.project.world.entities.map((e) => ({ id: e.id, name: e.name, type: e.type, transform: e.transform })), meshes: {}, planeNormals: null, planeBBox: null };
      for (const [id, mesh] of r.meshes) {
        const m = mesh.material;
        out.meshes[id] = {
          type: st.project.world.entities.find((e) => e.id === id).type,
          materialType: m ? m.getClassName() : null,
          disableLighting: m ? m.disableLighting : null,
          backFaceCulling: m ? m.backFaceCulling : null,
          emissive: m ? m.emissiveColor.asArray() : null,
          position: mesh.position.asArray(),
          rotation: mesh.rotationQuaternion ? mesh.rotationQuaternion.asArray() : null,
          scaling: mesh.scaling.asArray()
        };
      }
      const plane = st.project.world.entities.find((e) => e.type === 'plane');
      const pmesh = r.meshes.get(plane.id);
      const normals = pmesh.getVerticesData('normal');
      out.planeNormals = normals ? Array.from(new Set([normals[1], normals[4], normals[7]])).map((v) => Math.round(v * 1000000) / 1000000) : null;
      pmesh.computeWorldMatrix(true);
      const bb = pmesh.getBoundingInfo().boundingBox;
      out.planeBBox = { min: bb.minimumWorld.asArray(), max: bb.maximumWorld.asArray() };
      out.lights = r.scene.lights.length;
      out.sceneMeshes = r.scene.meshes.map((m) => m.name);
      return out;
    })()`);

    const cubeId = conformance.entities.find((e) => e.type === 'cube').id;
    const sphereId = conformance.entities.find((e) => e.type === 'sphere').id;
    const planeId = conformance.entities.find((e) => e.type === 'plane').id;
    record('all primitives use unlit emissive materials', conformance.entities.every((e) => {
      const m = conformance.meshes[e.id];
      return m.materialType === 'StandardMaterial' && m.disableLighting === true && Array.isArray(m.emissive) && m.emissive.some((v) => v > 0);
    }) && conformance.lights === 0, conformance.meshes);

    const planeMesh = conformance.meshes[planeId];
    record('plane is double-sided', planeMesh.backFaceCulling === false, planeMesh);
    record('plane geometry lies on XZ with +Y normal', conformance.planeNormals !== null && conformance.planeNormals.length === 1 && conformance.planeNormals[0] === 1 && Math.abs(conformance.planeBBox.min[1] - conformance.planeBBox.max[1]) < 1e-6, { normals: conformance.planeNormals, bbox: conformance.planeBBox });
    record('cube and sphere remain single-sided (unchanged I-04 behavior)', conformance.meshes[cubeId].backFaceCulling === true && conformance.meshes[sphereId].backFaceCulling === true, conformance.meshes);

    const fromBelow = await evaluate(`(async () => {
      const r = __simuforgeRenderer;
      const st = __getStore().getSnapshot();
      const ent = st.project.world.entities.find((e) => e.type === 'plane');
      const mesh = r.meshes.get(ent.id);
      const c = r.camera;
      c.setTarget(mesh.position.clone());
      c.alpha = Math.PI / 2;
      c.beta = Math.PI - 0.25;
      c.radius = 6;
      r.scene.render();
      await new Promise((x) => setTimeout(x, 300));
      r.scene.render();
      r.grid.isVisible = false;
      r.gridLines.isVisible = false;
      r.scene.render();
      await new Promise((x) => setTimeout(x, 150));
      const rect = r.canvas.getBoundingClientRect();
      const V3 = mesh.position.constructor;
      const clip = V3.TransformCoordinates(mesh.getAbsolutePosition(), r.scene.getTransformMatrix());
      const x = rect.left + (clip.x * 0.5 + 0.5) * rect.width;
      const y = rect.top + (1 - (clip.y * 0.5 + 0.5)) * rect.height;
      const pick = r.scene.pick(x - rect.left, y - rect.top);
      const visible = r.canvas.toDataURL('image/png');
      mesh.isVisible = false;
      r.scene.render();
      await new Promise((x2) => setTimeout(x2, 250));
      const hidden = r.canvas.toDataURL('image/png');
      mesh.isVisible = true;
      r.grid.isVisible = true;
      r.gridLines.isVisible = true;
      r.scene.render();
      return {
        beta: c.beta,
        expected: ent.id,
        pick: pick && pick.pickedMesh ? (pick.pickedMesh.metadata || {}).entityId || null : null,
        gridRestored: r.grid.isVisible === true && r.gridLines.isVisible === true,
        visible,
        hidden
      };
    })()`, 30000);
    record('plane is pickable and rendered from below', fromBelow.pick === fromBelow.expected && fromBelow.gridRestored === true, { beta: fromBelow.beta, pick: fromBelow.pick, expected: fromBelow.expected, gridRestored: fromBelow.gridRestored });
    const belowDiff = await evaluate(`(async () => {
      function load(u) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; }); }
      const a = await load(${JSON.stringify(fromBelow.visible)});
      const b = await load(${JSON.stringify(fromBelow.hidden)});
      const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
      const c1 = document.createElement('canvas'); c1.width = w; c1.height = h;
      const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      const x1 = c1.getContext('2d', { willReadFrequently: true }), x2 = c2.getContext('2d', { willReadFrequently: true });
      x1.drawImage(a, 0, 0); x2.drawImage(b, 0, 0);
      const d1 = x1.getImageData(0, 0, w, h).data, d2 = x2.getImageData(0, 0, w, h).data;
      let changed = 0;
      for (let i = 0; i < d1.length; i += 4) {
        if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 24) changed++;
      }
      return { changed };
    })()`, 30000);
    record('plane contributes visible pixels from below (double-sided render)', belowDiff.changed > 200, belowDiff);
    await screenshot('p1-01b-plane-from-below');
    await evaluate(`(() => { const c = __simuforgeRenderer.camera; const e = __getStore().getSnapshot().project.world.entities.find((x) => x.type === 'sphere'); c.setTarget(new (__simuforgeRenderer.meshes.get(e.id).position.constructor)(0, 0.5, 0)); c.alpha = Math.PI / 2; c.beta = Math.PI / 3; c.radius = 10; __simuforgeRenderer.scene.render(); return true; })()`);
    await sleep(300);

    const visual = await evaluate(`(() => {
      const r = __simuforgeRenderer;
      return { url: r.canvas.toDataURL('image/png') };
    })()`);
    await screenshot('p1-01-primitives');
    const visualStats = await evaluate(`(async () => {
      function load(u) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; }); }
      const a = await load(${JSON.stringify(emptyUrl)});
      const b = await load(${JSON.stringify(visual.url)});
      const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
      const c1 = document.createElement('canvas'); c1.width = w; c1.height = h;
      const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
      const x1 = c1.getContext('2d', { willReadFrequently: true }), x2 = c2.getContext('2d', { willReadFrequently: true });
      x1.drawImage(a, 0, 0); x2.drawImage(b, 0, 0);
      const d1 = x1.getImageData(0, 0, w, h).data, d2 = x2.getImageData(0, 0, w, h).data;
      let changed = 0, bright = 0;
      for (let i = 0; i < d1.length; i += 4) {
        if (Math.abs(d1[i] - d2[i]) + Math.abs(d1[i + 1] - d2[i + 1]) + Math.abs(d1[i + 2] - d2[i + 2]) > 30) changed++;
        if (d2[i] + d2[i + 1] + d2[i + 2] > 330) bright++;
      }
      return { width: w, height: h, changed, bright };
    })()`, 30000);
    record('primitives visibly change the viewport', visualStats.changed > 500 && visualStats.bright > 500, visualStats);

    // Reconciliation: delete one entity, keep two meshes, and confirm grid resources are untouched.
    const toDelete = cubeId;
    await evaluate(`__getStore().dispatch({ type: 'entity/delete', id: ${JSON.stringify(toDelete)} })`);
    await waitFor('__simuforgeRenderer.getDiagnostics().meshCount === 2', 8000, 'two meshes after delete');
    const afterDelete = await evaluate(`(() => ({ diag: __simuforgeRenderer.getDiagnostics(), sceneMeshes: __simuforgeRenderer.scene.meshes.map((m) => m.name), grid: !!__simuforgeRenderer.grid, gridLines: !!__simuforgeRenderer.gridLines }))()`);
    record('mesh reconciliation disposes only the deleted entity', afterDelete.diag.meshCount === 2 && afterDelete.diag.entityCount === 2 && afterDelete.grid && afterDelete.gridLines && !afterDelete.sceneMeshes.includes(toDelete), afterDelete);

    await screenshot('p1-02-after-delete');

    fs.writeFileSync(path.join(OUT, 'phase1-result.json'), JSON.stringify({ results, empty, conformance, visualStats, afterDelete, logs, errors, chrome: chrome.version }, null, 2));
    console.log('\nRESULT SUMMARY');
    for (const r of results) console.log((r.pass ? 'PASS' : 'FAIL') + ' ' + r.name);
    console.log('errors: ' + JSON.stringify(errors));
  } finally {
    if (cdp) cdp.close();
    await chrome.stop();
  }
})().catch((e) => { console.error(e && e.stack || e); process.exitCode = 1; });
