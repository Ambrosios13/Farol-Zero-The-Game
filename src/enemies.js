// Farol Zero – Phase 5: continuous pressure.
// Drones no longer sit in five fixed slots: they spawn at the arena edges on
// a timer (spawnInterval, shortening per lit beacon), capped at maxEnemies.
// After `fast.afterBeacons` beacons, a share of spawns are the fast drone
// (half hp, 40% faster, 25% more contact damage) with its own silhouette.
import * as THREE from 'three';

export function createEnemies({ scene, config, onKill = null }) {
  const {
    hp: baseHp, speed: baseSpeed, radius,
    spawnInterval, intervalStep, maxEnemies,
    minPlayerDist, spawnTries, separation, fast,
  } = config.enemies;
  const halfLimit = config.arena.size / 2 - radius;

  // Shared geometry — reused across restarts, never disposed here.
  const bodyGeo = new THREE.BoxGeometry(1.1, 0.7, 1.1);
  const eyeGeo = new THREE.BoxGeometry(0.5, 0.22, 0.2);
  const finGeo = new THREE.BoxGeometry(1.5, 0.12, 0.3);
  const rotorGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 12);
  const rotorMat = new THREE.MeshLambertMaterial({
    color: 0x2b6f8f, transparent: true, opacity: 0.55,
  });
  // One body material per kind (regular coral / fast amber) — created once.
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x141b26 });
  const finMat = new THREE.MeshLambertMaterial({ color: 0xcf3f2c });
  const bodyMats = {
    regular: new THREE.MeshLambertMaterial({ color: config.colors.enemy }),
    fast: new THREE.MeshLambertMaterial({ color: config.colors.enemyFast }),
  };

  const list = [];
  let timer = 0; // counts up; at the interval it tries one spawn attempt batch

  function makeDrone(kind, x, z) {
    const isFast = kind === 'fast';
    const group = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMats[isFast ? 'fast' : 'regular']);
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
      kind,
      x: THREE.MathUtils.clamp(x, -halfLimit, halfLimit),
      z: THREE.MathUtils.clamp(z, -halfLimit, halfLimit),
      hp: isFast ? baseHp * fast.hpMul : baseHp,
      maxHp: baseHp,
      speed: isFast ? baseSpeed * fast.speedMul : baseSpeed,
      radius,
      damage: isFast ? (config.enemies.damage ?? config.combat.contactDamage) * fast.dmgMul
        : (config.enemies.damage ?? config.combat.contactDamage),
      alive: true,
      group,
      rotor,
    };
    const s = isFast ? fast.scale : 1;
    group.scale.setScalar(s);
    group.position.set(drone.x, 0, drone.z);
    scene.add(group);
    list.push(drone);
    return drone;
  }

  // Test/edge hook: spawn a drone at an exact point (kind: 'regular'|'fast').
  function spawnAt(x, z, kind = 'regular') {
    return makeDrone(kind, x, z);
  }

  function pickKind(litCount) {
    if (litCount >= fast.afterBeacons && Math.random() < fast.chance) return 'fast';
    return 'regular';
  }

  function edgeCandidate() {
    // A random point on one of the four walls (inside the half-limits).
    const t = THREE.MathUtils.randFloat(-halfLimit, halfLimit);
    const side = Math.floor(Math.random() * 4);
    switch (side) {
      case 0: return [-halfLimit, t];
      case 1: return [halfLimit, t];
      case 2: return [t, -halfLimit];
      default: return [t, halfLimit];
    }
  }

  function trySpawn(litCount, player) {
    if (list.length >= maxEnemies) {
      // Cap reached: defer (do NOT queue anything) and retry next interval.
      return false;
    }
    for (let i = 0; i < spawnTries; i++) {
      const [x, z] = edgeCandidate();
      if (Math.hypot(x - player.x, z - player.z) < minPlayerDist) continue;
      makeDrone(pickKind(litCount), x, z);
      return true;
    }
    // No valid candidate this round: try again at the next interval.
    return false;
  }

  function reset() {
    for (const d of list) scene.remove(d.group);
    list.length = 0;
    timer = 0;
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

  function update(dt, target, litCount = 0) {
    // Spawning: at least one edge point free of the player, under the cap.
    timer += dt;
    const interval = Math.max(0.3, spawnInterval - litCount * intervalStep);
    if (timer >= interval) {
      timer = 0;
      trySpawn(litCount, target);
    }
    const minDist = radius * 2 + separation;
    // 1) direct chase (each drone uses its own speed)
    for (const d of list) {
      if (!d.alive) continue;
      const dx = target.x - d.x;
      const dz = target.z - d.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-4) {
        d.x += (dx / dist) * d.speed * dt;
        d.z += (dz / dist) * d.speed * dt;
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

  return { list, update, damage, sweep, reset, spawnAt };
}
