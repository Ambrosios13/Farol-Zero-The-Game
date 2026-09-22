// Farol Zero – the maintenance robot.
import * as THREE from 'three';
import { CONFIG } from './config.js';

// Shared geometry/material — entities reuse, never dispose these.
const shared = {};

export function createPlayer({ scene, config = CONFIG }) {
  const { speed, radius } = config.player;
  const halfLimit = config.arena.size / 2 - radius;

  const bodyMat = new THREE.MeshLambertMaterial({ color: config.colors.robot });
  const accentMat = new THREE.MeshLambertMaterial({
    color: config.colors.robotAccent, emissive: 0x0a4a55,
  });

  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(1.1, 1.0, 1.1);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.7;
  group.add(body);

  const headGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.y = 1.5;
  group.add(head);

  const visorGeo = new THREE.BoxGeometry(0.5, 0.18, 0.1);
  const visor = new THREE.Mesh(visorGeo, accentMat);
  visor.position.set(0, 1.55, -0.36);
  group.add(visor);

  const eyeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const eye = new THREE.Mesh(eyeGeo, accentMat);
  eye.position.set(0, 1.1, -0.58);
  group.add(eye);

  const legGeo = new THREE.BoxGeometry(0.4, 0.4, 0.6);
  for (const lx of [-0.3, 0.3]) {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(lx, 0.2, 0);
    group.add(leg);
  }

  scene.add(group);

  const position = new THREE.Vector3(0, 0, 4);
  group.position.copy(position);

  function reset() {
    position.set(0, 0, 4);
    group.position.copy(position);
    group.rotation.set(0, 0, 0);
  }

  function update(dt, inputVec) {
    const vx = inputVec.x * speed * dt;
    const vz = inputVec.z * speed * dt;
    position.x = THREE.MathUtils.clamp(position.x + vx, -halfLimit, halfLimit);
    position.z = THREE.MathUtils.clamp(position.z + vz, -halfLimit, halfLimit);
    group.position.copy(position);
    // Face movement direction (XZ only).
    if (vx !== 0 || vz !== 0) {
      group.rotation.y = Math.atan2(vx, vz);
    }
  }

  function dispose() {
    // Only remove from scene; shared resources stay for phase restarts.
    scene.remove(group);
  }

  return { group, position, radius, update, reset, dispose };
}
