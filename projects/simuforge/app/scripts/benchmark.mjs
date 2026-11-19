// Phase 11 benchmark harness. Run with:
//   node --experimental-strip-types scripts/benchmark.mjs
// Writes structured results to ../reports/phase-11/evidence/benchmark-results.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.resolve(ROOT, '..', 'reports', 'phase-11', 'evidence');
mkdirSync(EVIDENCE, { recursive: true });

const results = {
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: (await import('node:os')).cpus().length,
    totalMemoryMB: Math.round((await import('node:os')).totalmem() / 1024 / 1024),
    timestamp: new Date().toISOString()
  },
  measurements: []
};

function measure(name, fn, iterations = 100) {
  // warmup
  for (let i = 0; i < 5; i++) fn();
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  results.measurements.push({ name, iterations, medianMs: +median.toFixed(4), p95Ms: +p95.toFixed(4), meanMs: +mean.toFixed(4), minMs: +times[0].toFixed(4), maxMs: +times[times.length - 1].toFixed(4) });
  console.log(`${name}: median ${median.toFixed(4)} ms (p95 ${p95.toFixed(4)})`);
}

// --- physics ---
const { createRuntimeBodies, stepBodies } = await import('../src/runtime/physics.ts');
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
const UNIT = { x: 1, y: 1, z: 1 };
function makeEntity(id, comps) {
  return { id, name: id, type: 'cube', transform: { position: { x: 0, y: 1, z: 0 }, rotation: { ...IDENTITY }, scale: { ...UNIT } }, metadata: {}, components: comps };
}
function rb(overrides = {}) {
  return { id: 'r-' + Math.random(), type: 'rigidBody', enabled: true, mass: 1, useGravity: true, collider: { kind: 'sphere', size: 0.5 }, velocity: { x: 0, y: 0, z: 0 }, angularVelocity: { x: 0, y: 0, z: 0 }, ...overrides };
}

for (const n of [10, 100, 500]) {
  const entities = Array.from({ length: n }, (_, i) => makeEntity('e' + i, [rb({ id: 'r' + i })]));
  const bodies = createRuntimeBodies(entities);
  measure(`physics.createRuntimeBodies (n=${n})`, () => createRuntimeBodies(entities), 50);
  measure(`physics.stepBodies (n=${n})`, () => stepBodies(bodies, 1 / 60, 0.01), 200);
}

// --- validation ---
const { validateProjectDocument } = await import('../src/project/validation.ts');
const { createEmptyWorld } = await import('../src/world/defaults.ts');
function makeProject(n) {
  const world = createEmptyWorld();
  world.entities = Array.from({ length: n }, (_, i) => makeEntity('e' + i, [rb({ id: 'r' + i })]));
  return {
    format: 'simuforge.project',
    schemaVersion: 1,
    project: { id: '11111111-1111-4111-8111-111111111111', name: 'Bench', createdAt: '2026-11-19T00:00:00.000Z', updatedAt: '2026-11-19T00:00:00.000Z' },
    world
  };
}
for (const n of [10, 100, 500]) {
  const json = JSON.stringify(makeProject(n));
  measure(`project.validateProjectDocument (n=${n})`, () => validateProjectDocument(json), 50);
}

// --- graph execution ---
const { buildExecutionPlan, executeChain } = await import('../src/runtime/graphExecution.ts');
function makeGraph(nodeCount) {
  const nodes = [{ id: 'trigger', type: 'onStart', config: { kind: 'onStart' } }];
  for (let i = 0; i < nodeCount; i++) nodes.push({ id: 'n' + i, type: 'applyForce', config: { kind: 'applyForce', targetEntityId: 'e0', targetComponentId: 'r0', force: { x: 1, y: 0, z: 0 } } });
  const edges = [];
  for (let i = 0; i < nodeCount; i++) edges.push({ id: 'e' + i, sourceNodeId: i === 0 ? 'trigger' : 'n' + (i - 1), sourcePortId: 'out', targetNodeId: 'n' + i, targetPortId: 'in' });
  return { id: 'g', name: 'bench', nodes, edges };
}
for (const n of [5, 50]) {
  const g = makeGraph(n);
  const plan = buildExecutionPlan(g, 'trigger');
  const bodies = createRuntimeBodies([makeEntity('e0', [rb({ id: 'r0' })])]);
  measure(`graph.buildExecutionPlan (nodes=${n})`, () => buildExecutionPlan(g, 'trigger'), 50);
  if (plan.plan) measure(`graph.executeChain (nodes=${n})`, () => executeChain(plan.plan, g, bodies), 50);
}

// --- extension validation ---
const { validateExtensionDocument } = await import('../src/extensions/validation.ts');
const extDoc = {
  format: 'simuforge.extensions',
  version: 1,
  entries: Array.from({ length: 5 }, (_, i) => ({
    manifest: {
      id: `11111111-1111-4111-8111-11111111111${i}`,
      name: 'Ext ' + i,
      version: '1.0.0',
      apiVersion: 1,
      components: [{ type: 'comp' + i, label: 'Comp ' + i }],
      modules: [{ id: 'm' + i, hooks: ['onTick'] }],
      permissions: ['run:simulation-hooks']
    },
    source: "registerModule('m', { onTick() { return 1; } });",
    enabled: true
  }))
};
measure('extensions.validateExtensionDocument (5 entries)', () => validateExtensionDocument(extDoc), 100);

writeFileSync(path.join(EVIDENCE, 'benchmark-results.json'), JSON.stringify(results, null, 2));
console.log('\nResults written to', path.join(EVIDENCE, 'benchmark-results.json'));
console.log('Environment:', JSON.stringify(results.environment));
