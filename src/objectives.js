// Farol Zero – Phase 4: the objective (see implement.txt §10/§7, phase 4).
// - 6 starting crystals are LOOSE on the field, auto-collected by proximity
//   (they sit inside the field as pickups, not in the balance).
// - Each kill drops dropPerKill crystals scattered around the crash point,
//   respecting the loose cap (resources.maxLoose).
// - A beacon charges only while the player stands inside its area AND the
//   balance >= cost; exactly one beacon charges per frame (nearest wins);
//   leaving the area resets progress; the cost is charged EXACTLY once on
//   completion; the third beacon closes the match (win fires exactly once).
// - restart() (exposed as reset) restores the whole objective.
import * as THREE from 'three';

// Fixed starting crystal spots. Chosen so that
//  * none sits on (or close enough to pre-collect from) a beacon spot, and
//  * none is auto-collected from the player spawn unless deliberately walked
//    onto (crystal #1 is just in front of spawn, 1.0u).
const START_SPOTS = [
  [0, 5],
  [-9, 3],
  [9, -3],
  [-13, -9],
  [13, -9],
  [5, 11],
];

export function createObjectives({ scene, config }) {
  const res = config.resources;
  const bc = config.beacons;

  const loose = []; // { x, z, mesh }
  let litCount = 0;
  let won = false;

  // Shared geometry/material — created once, reused across restarts.
  const crystalGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const crystalMat = new THREE.MeshLambertMaterial({
    color: config.colors.crystal, emissive: 0x0a4a55,
  });
  const baseGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.5, 8);
  const baseMat = new THREE.MeshLambertMaterial({ color: config.colors.beaconOff });
  const columnGeo = new THREE.CylinderGeometry(0.5, 0.7, 3.2, 8);
  const columnMat = new THREE.MeshLambertMaterial({ color: config.colors.beaconOff });
  const coreGeo = new THREE.BoxGeometry(0.5, 1.2, 0.5);
  const coreLitMat = new THREE.MeshLambertMaterial({
    color: config.colors.beaconLit, emissive: 0x7a5a10,
  });
  const coreOffMat = new THREE.MeshLambertMaterial({ color: config.colors.beaconOff });
  const ringGeo = new THREE.RingGeometry(bc.radius - 0.15, bc.radius, 32);
  const ringLitMat = new THREE.MeshLambertMaterial({
    color: config.colors.beaconLit, side: THREE.DoubleSide, transparent: true, opacity: 0.6,
  });
  const ringOffMat = new THREE.MeshLambertMaterial({
    color: config.colors.beaconOff, side: THREE.DoubleSide, transparent: true, opacity: 0.25,
  });

  const halfLimit = config.arena.size / 2 - res.crystalRadius;
  const beacons = [];

  function spawnCrystal(x, z) {
    const mesh = new THREE.Mesh(crystalGeo, crystalMat);
    const c = {
      x: THREE.MathUtils.clamp(x, -halfLimit, halfLimit),
      z: THREE.MathUtils.clamp(z, -halfLimit, halfLimit),
      mesh,
    };
    mesh.position.set(c.x, 0.5, c.z);
    scene.add(mesh);
    loose.push(c);
    return c;
  }

  function buildBeacons() {
    for (const [sx, sz] of bc.spots) {
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.set(sx, 0.25, sz);
      const column = new THREE.Mesh(columnGeo, columnMat);
      column.position.set(sx, 1.6, sz);
      const core = new THREE.Mesh(coreGeo, coreOffMat);
      core.position.set(sx, 3.6, sz);
      const ring = new THREE.Mesh(ringGeo, ringOffMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(sx, 0.06, sz);
      scene.add(base, column, core, ring);
      beacons.push({ x: sx, z: sz, progress: 0, lit: false, core, ring });
    }
  }

  // Called by main.restart() — restore the whole objective.
  function reset() {
    for (const c of loose) scene.remove(c.mesh);
    loose.length = 0;
    litCount = 0;
    won = false;
    for (const b of beacons) {
      b.progress = 0;
      b.lit = false;
      b.core.material = coreOffMat;
      b.ring.material = ringOffMat;
      b.ring.scale.setScalar(1);
    }
    for (const [sx, sz] of START_SPOTS) spawnCrystal(sx, sz);
  }

  // Each kill drops dropPerKill crystals scattered around the crash point.
  function dropCrystal(x, z, n = res.dropPerKill) {
    for (let i = 0; i < n; i++) {
      if (loose.length >= res.maxLoose) break; // loose cap: nothing added
      const a = Math.random() * Math.PI * 2;
      const r = 0.4 + Math.random() * 1.2; // small scatter ~1m
      spawnCrystal(x + Math.cos(a) * r, z + Math.sin(a) * r);
    }
  }

  // bank: { get(), add(n), spend(n) } — main owns the crystal balance.
  // onWin is called exactly once when the third beacon lights.
  function update(dt, playerPos, bank, onWin) {
    if (won) return;
    // 1) auto-collect: any loose crystal within collectRadius vanishes.
    for (let i = loose.length - 1; i >= 0; i--) {
      const c = loose[i];
      const dx = playerPos.x - c.x;
      const dz = playerPos.z - c.z;
      if (dx * dx + dz * dz <= res.collectRadius * res.collectRadius) {
        scene.remove(c.mesh);
        loose.splice(i, 1);
        bank.add(1);
      }
    }
    // 2) channeling: exactly one beacon may gain progress per frame —
    //    player inside its area AND balance >= cost; nearest wins ties.
    //    Stepping outside the area resets that beacon's progress.
    if (bank.get() >= bc.cost) {
      let target = null;
      let targetD2 = Infinity;
      for (const b of beacons) {
        if (b.lit) continue;
        const dx = playerPos.x - b.x;
        const dz = playerPos.z - b.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > bc.radius * bc.radius) {
          b.progress = 0;
          continue;
        }
        if (d2 < targetD2) { // ties keep the first spot in config order
          targetD2 = d2;
          target = b;
        }
      }
      if (target) target.progress += dt;
    } else {
      // Balance < cost: nothing charges (progress holds, but nothing accrues).
      for (const b of beacons) if (!b.lit && b.progress > 0) b.progress = 0;
    }
    // 3) completion: when a channel fills, charge the cost EXACTLY once.
    for (const b of beacons) {
      if (b.lit || b.progress < bc.channelTime) continue;
      b.lit = true;
      b.progress = 0;
      litCount++;
      bank.spend(bc.cost);
      b.core.material = coreLitMat;
      b.ring.material = ringLitMat;
      if (litCount >= bc.count) { // the third one closes the match
        won = true;
        onWin();
      }
    }
    // 4) shared visuals: loose crystals spin, rings grow with progress.
    for (const c of loose) c.mesh.rotation.y += 1.5 * dt;
    for (const b of beacons) {
      if (b.lit) continue;
      const r = Math.min(1, b.progress / bc.channelTime);
      b.ring.scale.setScalar(0.5 + 0.5 * r);
    }
  }

  buildBeacons();
  reset();

  return {
    loose,
    beacons,
    get litCount() { return litCount; },
    get won() { return won; },
    progressOf(spot) {
      return beacons.find((b) => b.x === spot[0] && b.z === spot[1]).progress;
    },
    dropCrystal,
    reset,
    update,
  };
}
