import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FIXED_TIMESTEP_SECONDS,
  GRAVITY_ACCELERATION_Y,
  advanceSimulation,
  applyForce,
  applyImpulse,
  clearForce,
  createRuntimeBodies
} from '../src/runtime/physics.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(here, '../../reports/mvp-1/evidence/m1e-force-impulse.json');

const BALL_ID = 'm1e-ball';
const FLOOR_ID = 'm1e-floor';

function rigidBody(id, collider, overrides = {}) {
  return {
    id,
    type: 'rigidBody',
    enabled: true,
    mass: 1,
    useGravity: true,
    collider,
    velocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
    ...overrides
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

function ball(mass, useGravity, position = { x: 0, y: 5, z: 0 }) {
  return entity(BALL_ID, 'sphere', position, [
    rigidBody('m1e-ball-rigid-body', { kind: 'sphere', size: 0.5 }, { mass, useGravity })
  ]);
}

function floor() {
  return entity(FLOOR_ID, 'plane', { x: 0, y: 0, z: 0 }, [
    rigidBody('m1e-floor-rigid-body', { kind: 'plane', size: { x: 100, y: 1, z: 100 } })
  ]);
}

function runFrames(initialBodies, frames, sampleEvery = 10) {
  let simulation = { bodies: initialBodies, accumulatorSeconds: 0 };
  const samples = [];

  for (let frame = 1; frame <= frames; frame += 1) {
    simulation = advanceSimulation(
      simulation.bodies,
      simulation.accumulatorSeconds,
      FIXED_TIMESTEP_SECONDS
    );
    if (simulation.error) {
      throw new Error(`Unexpected runtime failure: ${simulation.error.code}: ${simulation.error.message}`);
    }
    if (frame % sampleEvery === 0 || frame === frames) {
      const body = simulation.bodies[BALL_ID];
      samples.push({
        frame,
        timeSeconds: Number((frame * FIXED_TIMESTEP_SECONDS).toFixed(6)),
        positionY: Number(body.transform.position.y.toFixed(9)),
        velocityY: Number(body.velocity.y.toFixed(9)),
        forceY: Number(body.force.y.toFixed(9))
      });
    }
  }

  return { samples, bodies: simulation.bodies };
}

function rounded(value) {
  return Number(value.toFixed(9));
}

function forceRun(mass) {
  const source = ball(mass, false);
  const bodies = applyForce(createRuntimeBodies([source]), BALL_ID, { x: 0, y: 10, z: 0 });
  const result = runFrames(bodies, 60);
  const body = result.bodies[BALL_ID];

  return {
    massKg: mass,
    forceN: { x: 0, y: 10, z: 0 },
    frames: 60,
    samples: result.samples,
    final: {
      positionY: rounded(body.transform.position.y),
      velocityY: rounded(body.velocity.y),
      forceY: rounded(body.force.y),
      authoredPositionY: source.transform.position.y
    }
  };
}

const lightForce = forceRun(2);
const heavyForce = forceRun(4);

const impulseSource = ball(2, false);
const impulseApplied = applyImpulse(
  createRuntimeBodies([impulseSource]),
  BALL_ID,
  { x: 0, y: 10, z: 0 }
);
const impulseImmediateBody = impulseApplied[BALL_ID];
const impulseAfter = runFrames(impulseApplied, 60);
const impulseFinalBody = impulseAfter.bodies[BALL_ID];

const gravityCancelSource = ball(2, true);
const gravityCancelBodies = applyForce(
  createRuntimeBodies([gravityCancelSource]),
  BALL_ID,
  { x: 0, y: -2 * GRAVITY_ACCELERATION_Y, z: 0 }
);
const gravityCancelAfter = runFrames(gravityCancelBodies, 30);
const gravityCancelBody = gravityCancelAfter.bodies[BALL_ID];

const contactSource = ball(1, false, { x: 0, y: 0.5, z: 0 });
const contactBodies = applyForce(
  createRuntimeBodies([contactSource, floor()]),
  BALL_ID,
  { x: 0, y: -10, z: 0 }
);
const contactAfter = runFrames(contactBodies, 10);
const contactBody = contactAfter.bodies[BALL_ID];

const clearSource = ball(2, false);
const clearWithForce = applyForce(
  createRuntimeBodies([clearSource]),
  BALL_ID,
  { x: 0, y: 10, z: 0 }
);
const clearAfterOne = runFrames(clearWithForce, 1);
const clearBodies = clearForce(clearAfterOne.bodies, BALL_ID);
const clearAfterTwo = runFrames(clearBodies, 1);
const clearBody = clearAfterTwo.bodies[BALL_ID];

const evidence = {
  milestone: 'M1-E',
  generatedAt: new Date().toISOString(),
  scenario: 'Persistent force, instantaneous impulse, mass scaling, gravity cancellation, plane contact, and clear-force behavior over fixed steps.',
  decisions: {
    forceModel: 'persistent world-space force in newtons; applied every fixed step until clearForce, Reset, or Stop',
    impulseModel: 'instantaneous world-space momentum impulse in newton-seconds; delta-v = impulse / mass',
    integration: 'semi-implicit Euler with fixed timestep 1/60 s',
    gravityAccelerationY: GRAVITY_ACCELERATION_Y,
    angularResponse: 'none',
    runtimeOnly: true
  },
  force: {
    lightMass: lightForce,
    heavyMass: heavyForce
  },
  impulse: {
    massKg: 2,
    impulseNs: { x: 0, y: 10, z: 0 },
    immediate: {
      positionY: rounded(impulseImmediateBody.transform.position.y),
      velocityY: rounded(impulseImmediateBody.velocity.y)
    },
    final: {
      frame: 60,
      positionY: rounded(impulseFinalBody.transform.position.y),
      velocityY: rounded(impulseFinalBody.velocity.y),
      authoredPositionY: impulseSource.transform.position.y
    }
  },
  gravityCancellation: {
    massKg: 2,
    forceN: { x: 0, y: rounded(-2 * GRAVITY_ACCELERATION_Y), z: 0 },
    final: {
      frame: 30,
      positionY: rounded(gravityCancelBody.transform.position.y),
      velocityY: rounded(gravityCancelBody.velocity.y)
    }
  },
  planeContact: {
    forceN: { x: 0, y: -10, z: 0 },
    final: {
      frame: 10,
      positionY: rounded(contactBody.transform.position.y),
      velocityY: rounded(contactBody.velocity.y),
      forceY: rounded(contactBody.force.y)
    }
  },
  clearForce: {
    velocityAfterOneStep: rounded(clearAfterOne.bodies[BALL_ID].velocity.y),
    velocityAfterClearAndStep: rounded(clearBody.velocity.y),
    forceAfterClear: rounded(clearBody.force.y)
  },
  assertions: {
    lightForceVelocity: Math.abs(lightForce.final.velocityY - 5) < 1e-9,
    lightForcePosition: Math.abs(lightForce.final.positionY - 7.541666666666667) < 1e-9,
    heavyMassHalvesAcceleration: Math.abs(heavyForce.final.velocityY - 2.5) < 1e-9,
    forcePersistsAcrossSteps: lightForce.final.forceY === 10,
    impulseImmediateVelocity: Math.abs(impulseImmediateBody.velocity.y - 5) < 1e-9,
    impulseImmediatePositionUnchanged: Math.abs(impulseImmediateBody.transform.position.y - 5) < 1e-9,
    impulseNotReapplied: Math.abs(impulseFinalBody.velocity.y - 5) < 1e-9,
    impulseFinalPosition: Math.abs(impulseFinalBody.transform.position.y - 10) < 1e-9,
    gravityCancellationVelocity: Math.abs(gravityCancelBody.velocity.y) < 1e-9,
    gravityCancellationPosition: Math.abs(gravityCancelBody.transform.position.y - 5) < 1e-9,
    contactStaysAtSurface: Math.abs(contactBody.transform.position.y - 0.5) < 1e-9,
    contactVelocityRemoved: Math.abs(contactBody.velocity.y) < 1e-9,
    contactForcePersists: Math.abs(contactBody.force.y + 10) < 1e-9,
    clearForceStopsAcceleration: Math.abs(clearBody.velocity.y - clearAfterOne.bodies[BALL_ID].velocity.y) < 1e-9,
    clearForceZeroesForce: clearBody.force.y === 0,
    authoredStateUnchanged: [
      lightForce.final.authoredPositionY,
      impulseSource.transform.position.y,
      gravityCancelSource.transform.position.y,
      contactSource.transform.position.y
    ].every((value) => value === 5 || value === 0.5)
  }
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
console.log(`Force: light v=${lightForce.final.velocityY}, heavy v=${heavyForce.final.velocityY}`);
console.log(`Impulse: immediate v=${rounded(impulseImmediateBody.velocity.y)}, final y=${impulseFinalBody.transform.position.y}`);
console.log(`Contact: y=${contactBody.transform.position.y}, velocityY=${contactBody.velocity.y}`);
