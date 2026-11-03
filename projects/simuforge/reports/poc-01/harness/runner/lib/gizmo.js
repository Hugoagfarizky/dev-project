'use strict';

// In-page helpers injected into the SP-05 harness after every reload.
// Everything here is read-only with respect to the transform: it inspects the
// utility-layer gizmo scene graph and observes drag callbacks. It never writes a
// transform and never starts a drag.

const PAGE_LIB = `(() => {
  const engine = BABYLON.Engine.Instances[0];
  if (!engine) throw new Error('Babylon engine not initialised');
  const scene = engine.scenes[0];
  const util = BABYLON.UtilityLayerRenderer.DefaultUtilityLayer.utilityLayerScene;
  const cube = scene.getMeshByName('testCube');
  if (!cube) throw new Error('testCube not found');

  const W = window.__sp05 = {};
  W.engine = engine;
  W.scene = scene;
  W.util = util;
  W.cube = cube;

  W.renderSize = () => ({ w: engine.getRenderWidth(), h: engine.getRenderHeight() });

  // Vector3.Project with an explicit render-size viewport is already Y-down and
  // matches CSS pixels 1:1 at devicePixelRatio 1 (and scaled by dpr otherwise).
  W.proj = (p) => {
    const size = W.renderSize();
    const v = BABYLON.Vector3.Project(
      new BABYLON.Vector3(p[0], p[1], p[2]),
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
      new BABYLON.Viewport(0, 0, size.w, size.h)
    );
    return { x: v.x, y: v.y, z: v.z };
  };

  W.pos = () => {
    const p = cube.getAbsolutePosition();
    return [p.x, p.y, p.z];
  };
  W.quat = () => {
    const q = cube.rotationQuaternion || new BABYLON.Quaternion(0, 0, 0, 1);
    return [q.x, q.y, q.z, q.w];
  };
  W.scale = () => [cube.scaling.x, cube.scaling.y, cube.scaling.z];

  W.colorsOf = (root) => {
    const out = [];
    const walk = (node) => (node.getChildren ? node.getChildren() : []).forEach((child) => {
      if (child.material && child.material.diffuseColor) out.push(child.material.diffuseColor.asArray());
      walk(child);
    });
    walk(root);
    return out;
  };

  W.axisOf = (root) => {
    const colors = W.colorsOf(root).filter((c) => c[0] > 0.4 || c[1] > 0.4 || c[2] > 0.4);
    if (!colors.length) return null;
    const c = colors[0];
    return c[0] > 0.4 ? 'x' : c[1] > 0.4 ? 'y' : 'z';
  };

  W.rootOf = (mesh) => {
    let node = mesh;
    while (node) {
      if ((node.behaviors || []).some((b) => b.name === 'PointerDrag')) return node;
      node = node.parent;
    }
    return null;
  };

  W.pick = (x, y) => {
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return { hit: false };
    const result = util.pick(x, y);
    if (!result || !result.hit || !result.pickedMesh) return { hit: false };
    const root = W.rootOf(result.pickedMesh);
    return {
      hit: true,
      mesh: result.pickedMesh.name || '(unnamed)',
      axis: root ? W.axisOf(root) : null,
      rootName: root ? (root.name || '(unnamed)') : null,
      point: [result.pickedPoint.x, result.pickedPoint.y, result.pickedPoint.z],
      distance: result.distance
    };
  };

  // Enabled gizmo axis roots only. Disabled gizmos stay resident in the utility
  // layer and can look pickable, so isEnabled() is a required filter.
  W.enabledRoots = () => util.meshes
    .filter((mesh) => mesh.isEnabled() && (mesh.behaviors || []).some((b) => b.name === 'PointerDrag'))
    .map((mesh) => ({
      root: mesh,
      axis: W.axisOf(mesh),
      behavior: mesh.behaviors.find((b) => b.name === 'PointerDrag')
    }))
    .filter((entry) => entry.axis && entry.behavior);

  W.roots = () => W.enabledRoots().map((entry) => {
    const q = entry.root.rotationQuaternion;
    const abs = entry.root.getAbsolutePosition();
    return {
      axis: entry.axis,
      rot: q ? [q.x, q.y, q.z, q.w] : null,
      abs: [abs.x, abs.y, abs.z],
      dragAxis: entry.behavior.options && entry.behavior.options.dragAxis
        ? [entry.behavior.options.dragAxis.x, entry.behavior.options.dragAxis.y, entry.behavior.options.dragAxis.z]
        : null
    };
  });

  // Live handle discovery. Never recompute the handle from an analytic axis:
  // after a rotation the gizmo may be local, world, or scaled by the parent.
  // The arrowhead / scale box is the furthest descendant whose screen position
  // picks back to the same axis root.
  W.tip = (axis) => {
    const entry = W.enabledRoots().find((e) => e.axis === axis);
    if (!entry) return null;
    const center3 = W.pos();
    const candidates = [];
    const walk = (node) => (node.getChildren ? node.getChildren() : []).forEach((child) => {
      const ap = child.getAbsolutePosition();
      const screen = W.proj([ap.x, ap.y, ap.z]);
      const hit = W.pick(screen.x, screen.y);
      const distance = Math.hypot(ap.x - center3[0], ap.y - center3[1], ap.z - center3[2]);
      if (hit.hit && hit.axis === axis) {
        candidates.push({ name: child.name || '(unnamed)', abs: [ap.x, ap.y, ap.z], screen, distance, mesh: hit.mesh });
      }
      walk(child);
    });
    walk(entry.root);
    if (!candidates.length) return null;
    candidates.sort((a, b) => b.distance - a.distance);
    return { best: candidates[0], count: candidates.length, center: W.proj(center3) };
  };

  // Rotation ring discovery: take the furthest stable screen hit on the axis
  // proxy ring. Median-radius hits are not reliable (1.7-25 deg variance).
  W.ring = (axis) => {
    const center = W.proj(W.pos());
    const hits = [];
    for (let radius = 40; radius <= 130; radius += 4) {
      for (let angle = 0; angle < 360; angle += 6) {
        const rad = (angle * Math.PI) / 180;
        const x = center.x + Math.cos(rad) * radius;
        const y = center.y + Math.sin(rad) * radius;
        const hit = W.pick(x, y);
        if (!hit.hit || hit.axis !== axis) continue;
        hits.push({ x, y, radius, point: hit.point, mesh: hit.mesh });
      }
    }
    if (!hits.length) return { ok: false, axis, center, hitCount: 0 };
    hits.sort((a, b) => b.radius - a.radius);
    const best = hits[0];
    const vx = best.x - center.x;
    const vy = best.y - center.y;
    const len = Math.hypot(vx, vy) || 1;
    return {
      ok: true,
      axis,
      center,
      point: { x: best.x, y: best.y },
      point3d: best.point,
      radius: best.radius,
      tangent: { x: -vy / len, y: vx / len },
      mesh: best.mesh,
      hitCount: hits.length
    };
  };

  W.state = () => {
    const diag = window.__simuforgeDiagnostics.getSnapshot();
    return {
      mode: diag.mode,
      cube: diag.cube,
      camera: diag.camera,
      canvas: diag.canvas,
      gizmos: diag.gizmos,
      useRightHandedSystem: diag.useRightHandedSystem,
      babylonVersion: diag.babylonVersion,
      center: W.proj(diag.cube.position),
      renderSize: W.renderSize()
    };
  };

  W.worldScreenDir = (axis) => {
    const c = W.pos();
    const center = W.proj(c);
    const step = axis === 'x' ? [1, 0, 0] : axis === 'y' ? [0, 1, 0] : [0, 0, 1];
    const tip = W.proj([c[0] + step[0], c[1] + step[1], c[2] + step[2]]);
    const dx = tip.x - center.x;
    const dy = tip.y - center.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len, screen: tip, center };
  };

  // Drag lifecycle observation. Attaches observers to the currently enabled axis
  // roots and resets counts; safe to call after every mode switch.
  W.armAudit = () => {
    if (W._audit && W._audit.observers) {
      W._audit.observers.forEach(([observable, observer]) => {
        try { observable.remove(observer); } catch (_) {}
      });
    }
    const audit = { axes: {}, observers: [] };
    for (const entry of W.enabledRoots()) {
      const rec = { start: 0, drag: 0, end: 0, deltaSum: [0, 0, 0] };
      audit.axes[entry.axis] = rec;
      const behavior = entry.behavior;
      audit.observers.push([behavior.onDragStartObservable, behavior.onDragStartObservable.add(() => { rec.start += 1; })]);
      audit.observers.push([behavior.onDragObservable, behavior.onDragObservable.add((ev) => {
        rec.drag += 1;
        rec.deltaSum[0] += ev.delta.x;
        rec.deltaSum[1] += ev.delta.y;
        rec.deltaSum[2] += ev.delta.z;
      })]);
      audit.observers.push([behavior.onDragEndObservable, behavior.onDragEndObservable.add(() => { rec.end += 1; })]);
    }
    W._audit = audit;
    return Object.keys(audit.axes);
  };

  W.readAudit = () => {
    const audit = W._audit || { axes: {} };
    const copy = {};
    for (const key of Object.keys(audit.axes || {})) {
      copy[key] = {
        start: audit.axes[key].start,
        drag: audit.axes[key].drag,
        end: audit.axes[key].end,
        deltaSum: audit.axes[key].deltaSum.slice()
      };
    }
    return { axes: copy };
  };

  W.ready = true;
  return { ok: true, mode: W.state().mode, canvas: W.state().canvas };
})()`;

async function install(page) {
  const result = await page.evaluate(PAGE_LIB, { timeoutMs: 30000 });
  if (!result || !result.ok) throw new Error('Failed to install in-page gizmo helpers');
  return result;
}

async function state(page) {
  return page.evaluate('window.__sp05.state()');
}

async function roots(page) {
  return page.evaluate('window.__sp05.roots()');
}

async function tip(page, axis) {
  return page.evaluate('window.__sp05.tip(' + JSON.stringify(axis) + ')');
}

async function ring(page, axis) {
  return page.evaluate('window.__sp05.ring(' + JSON.stringify(axis) + ')');
}

async function pick(page, x, y) {
  return page.evaluate('window.__sp05.pick(' + Number(x) + ',' + Number(y) + ')');
}

async function worldScreenDir(page, axis) {
  return page.evaluate('window.__sp05.worldScreenDir(' + JSON.stringify(axis) + ')');
}

async function proj(page, point) {
  return page.evaluate('window.__sp05.proj(' + JSON.stringify(point) + ')');
}

async function armAudit(page) {
  return page.evaluate('window.__sp05.armAudit()');
}

async function readAudit(page) {
  return page.evaluate('window.__sp05.readAudit()');
}

module.exports = {
  PAGE_LIB,
  install,
  state,
  roots,
  tip,
  ring,
  pick,
  proj,
  worldScreenDir,
  armAudit,
  readAudit
};
