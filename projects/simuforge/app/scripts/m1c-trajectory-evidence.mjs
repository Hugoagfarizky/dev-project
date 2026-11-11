import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIXED_TIMESTEP_SECONDS,
  GRAVITY_ACCELERATION_Y,
  MAX_FRAME_DELTA_SECONDS,
  advanceSimulation,
  createRuntimeBodies
} from '../src/runtime/physics.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '../../reports/mvp-1/evidence/m1c-trajectory.json');

const ball = {
  id: 'm1c-ball',
  name: 'Ball',
  type: 'sphere',
  transform: {
    position: { x: 0, y: 5, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    scale: { x: 1, y: 1, z: 1 }
  },
  metadata: {},
  components: [{
    id: 'm1c-rigid-body',
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: true,
    collider: { kind: 'sphere', size: 0.5 },
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 }
  }]
};

let simulation = { bodies: createRuntimeBodies([ball]), accumulatorSeconds: 0 };
const samples = [];

for (let frame = 0; frame <= 60; frame += 1) {
  if (frame > 0) {
    simulation = advanceSimulation(simulation.bodies, simulation.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
  }
  if (frame % 10 === 0) {
    const body = simulation.bodies[ball.id];
    samples.push({
      frame,
      timeSeconds: Number((frame * FIXED_TIMESTEP_SECONDS).toFixed(6)),
      positionY: Number(body.transform.position.y.toFixed(9)),
      velocityY: Number(body.velocity.y.toFixed(9))
    });
  }
}

const finalBody = simulation.bodies[ball.id];
const evidence = {
  milestone: 'M1-C',
  generatedAt: new Date().toISOString(),
  scenario: 'A sphere with an enabled rigid body at y=5 falls under gravity for 60 fixed steps.',
  decisions: {
    fixedTimestepSeconds: FIXED_TIMESTEP_SECONDS,
    integrator: 'semi-implicit Euler',
    gravityAccelerationY: GRAVITY_ACCELERATION_Y,
    maxFrameDeltaSeconds: MAX_FRAME_DELTA_SECONDS,
    accumulator: 'simple fixed-step accumulator'
  },
  samples,
  final: {
    frame: 60,
    positionY: Number(finalBody.transform.position.y.toFixed(9)),
    velocityY: Number(finalBody.velocity.y.toFixed(9)),
    authoredPositionY: ball.transform.position.y
  }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
console.log(`Final y=${evidence.final.positionY}, velocityY=${evidence.final.velocityY}`);
