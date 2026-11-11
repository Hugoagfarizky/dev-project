import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIXED_TIMESTEP_SECONDS,
  advanceSimulation,
  createRuntimeBodies
} from '../src/runtime/physics.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '../../reports/mvp-1/evidence/m1d-contact.json');

function rigidBody(id, collider) {
  return {
    id,
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: true,
    collider,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 }
  };
}

function entity(id, type, position, components) {
  return {
    id,
    name: id,
    type,
    transform: {
      position: { ...position },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: 1, y: 1, z: 1 }
    },
    metadata: {},
    components
  };
}

const ball = entity('m1d-ball', 'sphere', { x: 0, y: 5, z: 0 }, [
  rigidBody('m1d-ball-rigid-body', { kind: 'sphere', size: 0.5 })
]);
const floor = entity('m1d-floor', 'plane', { x: 0, y: 0, z: 0 }, [
  rigidBody('m1d-floor-rigid-body', { kind: 'plane', size: { x: 100, y: 1, z: 100 } })
]);
const box = entity('m1d-box', 'cube', { x: 0, y: 5, z: 0 }, [
  rigidBody('m1d-box-rigid-body', { kind: 'box', size: { x: 2, y: 1, z: 2 } })
]);

function run(entities, frames) {
  let simulation = { bodies: createRuntimeBodies(entities), accumulatorSeconds: 0 };
  const samples = [];
  let contactFrame = null;

  for (let frame = 0; frame <= frames; frame += 1) {
    if (frame > 0) {
      simulation = advanceSimulation(simulation.bodies, simulation.accumulatorSeconds, FIXED_TIMESTEP_SECONDS);
    }
    const body = simulation.bodies[entities[0].id];
    if (contactFrame === null && body.velocity.y === 0 && body.transform.position.y <= 0.5000001) {
      contactFrame = frame;
    }
    if (frame % 15 === 0) {
      samples.push({
        frame,
        timeSeconds: Number((frame * FIXED_TIMESTEP_SECONDS).toFixed(6)),
        positionY: Number(body.transform.position.y.toFixed(9)),
        velocityY: Number(body.velocity.y.toFixed(9))
      });
    }
  }

  const finalBody = simulation.bodies[entities[0].id];
  return {
    contactFrame,
    samples,
    final: {
      frame: frames,
      positionY: Number(finalBody.transform.position.y.toFixed(9)),
      velocityY: Number(finalBody.velocity.y.toFixed(9)),
      authoredPositionY: entities[0].transform.position.y
    }
  };
}

const sphereRun = run([ball, floor], 120);
const boxRun = run([box, floor], 120);

const evidence = {
  milestone: 'M1-D',
  generatedAt: new Date().toISOString(),
  scenario: 'A dynamic sphere and a dynamic box fall onto a static infinite plane for 120 fixed steps.',
  decisions: {
    colliders: 'primitive sphere (radius), box (full extents), plane (static infinite horizontal plane, +Y normal)',
    detection: 'dynamic sphere/box vs static plane; dynamic-vs-dynamic collisions deferred',
    response: 'positional penetration correction plus removal of inbound normal velocity',
    restitution: 0,
    friction: 0,
    angularResponse: 'none',
    fixedTimestepSeconds: FIXED_TIMESTEP_SECONDS
  },
  sphere: sphereRun,
  box: boxRun,
  assertions: {
    sphereRestY: sphereRun.final.positionY === 0.5,
    sphereVelocityY: sphereRun.final.velocityY === 0,
    boxRestY: boxRun.final.positionY === 0.5,
    boxVelocityY: boxRun.final.velocityY === 0,
    authoredSpherePositionY: sphereRun.final.authoredPositionY === 5
  }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
console.log(`Sphere final y=${sphereRun.final.positionY}, velocityY=${sphereRun.final.velocityY}`);
console.log(`Box final y=${boxRun.final.positionY}, velocityY=${boxRun.final.velocityY}`);
