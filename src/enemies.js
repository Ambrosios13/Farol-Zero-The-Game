// Farol Zero – Phase 3: fixed drones that chase the player.
// Direct chase (no pathfinding) + pairwise separation so they don't stack.
import * as THREE from 'three';

// Fixed spawn spots (none is a "teleport on top" for the player at (0,0,4)).
const SLOTS = [
  [-14, -12],
  [14, -12],
  [0, -15],
  [-15, 11],
  [15, 11],
];

export function createEnemies({ scene, config, onKill = null }) {
  const { speed, hp: maxHp, radius, count } = config.enemies;
  const halfLimit = config.arena.size / 2 - radius;

  // Shared geometry/material — reused across restarts, never disposed here.
  const bodyGeo = new THREE.BoxGeometry(1.1, 0.7, 1.1);
  const bodyMat = new THREE.MeshLambertMaterial({ color: config.colors.enemy });
  const eyeGeo = new THREE.BoxGeometry(0.5, 0.22, 0.2);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x141b26 });
  const finGeo = new THREE.BoxGeometry(1.5, 0.12, 0.3);
  const finMat = new THREE.MeshLambertMaterial({ color: 0xcf3f2c });
  const rotorGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 12);
  const rotorMat = new THREE.MeshLambertMaterial({
    color: 0x2b6f8f, transparent: true, opacity: 0.55,
  });

  const list = [];

  function makeDrone(x, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 1.1;
    group.add(body);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 1.15, 0.55); // group's +Z faces the player
    group.add(eye);
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(finGeo, finMat);
      fin.position.set(sx * 0.9, 1.05, 0);
      group.add(fin);
    }
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.y = 1.55;
    group.add(rotor);

    const drone = {
      x: THREE.MathUtils.clamp(x, -halfLimit, halfLimit),
      z: THREE.MathUtils.clamp(z, -halfLimit, halfLimit),
      hp: maxHp,
      radius,
      alive: true,
      group,
      rotor,
    };
    group.position.set(drone.x, 0, drone.z);
    scene.add(group);
    list.push(drone);
    return drone;
  }

  function spawnAll() {
    for (let i = 0; i < Math.min(count, SLOTS.length); i++) {
      makeDrone(SLOTS[i][0], SLOTS[i][1]);
    }
  }

  function reset() {
    // Remove every drone mesh, then respawn the fixed five (no old entities).
    for (const d of list) scene.remove(d.group);
    list.length = 0;
    spawnAll();
  }

  function damage(drone, dmg) {
    if (!drone || !drone.alive) return;
    drone.hp -= dmg;
    if (drone.hp <= 0) {
      drone.alive = false;
      drone.group.visible = false; // hidden until sweep() removes it
      if (onKill) onKill(drone.x, drone.z); // drop hook (Phase 4)
    }
  }

  // Remove dead drones from list and scene (call once per frame, after combat).
  function sweep() {
    for (let i = list.length - 1; i >= 0; i--) {
      const d = list[i];
      if (d.alive) continue;
      scene.remove(d.group);
      list.splice(i, 1);
    }
  }

  function update(dt, target) {
    const minDist = radius * 2 + config.enemies.separation;
    // 1) direct chase
    for (const d of list) {
      if (!d.alive) continue;
      const dx = target.x - d.x;
      const dz = target.z - d.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-4) {
        d.x += (dx / dist) * speed * dt;
        d.z += (dz / dist) * speed * dt;
        d.group.rotation.y = Math.atan2(dx, dz);
      }
    }
    // 2) pairwise separation
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const dist = Math.hypot(dx, dz);
        if (dist >= minDist) continue;
        const ux = dist > 1e-4 ? dx / dist : 1;
        const uz = dist > 1e-4 ? dz / dist : 0;
        const push = (minDist - dist) / 2;
        a.x -= ux * push;
        a.z -= uz * push;
        b.x += ux * push;
        b.z += uz * push;
      }
    }
    // 3) bounds + sync visuals
    for (const d of list) {
      if (!d.alive) continue;
      d.x = THREE.MathUtils.clamp(d.x, -halfLimit, halfLimit);
      d.z = THREE.MathUtils.clamp(d.z, -halfLimit, halfLimit);
      d.group.position.x = d.x;
      d.group.position.z = d.z;
      d.rotor.rotation.y += 4 * dt;
    }
  }

  reset();
  return { list, update, damage, sweep, reset };
}
