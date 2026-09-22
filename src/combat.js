// Farol Zero – Phase 3: player auto-attack + projectiles + contact damage.
// Auto-attack fires at the nearest enemy within range; each projectile hits
// at most ONE entity and expires after its lifetime. Contact damage uses the
// optional onPlayerHit callback (pass null during player invulnerability).
import * as THREE from 'three';

const BULLET_RADIUS = 0.3;
const BULLET_Y = 1.2;

export function createCombat({ scene, config, enemies }) {
  const { fireInterval, range, projectileSpeed, projectileDamage, projectileLifetime } = config.combat;
  const cap = config.perf.maxProjectiles;

  const bulletGeo = new THREE.BoxGeometry(0.32, 0.32, 0.62);
  const bulletMat = new THREE.MeshLambertMaterial({
    color: config.colors.projectile, emissive: 0x0a4a55,
  });

  const active = []; // live projectiles { x, z, dx, dz, life, mesh }
  let fireTimer = 0;

  function nearestInRange(x, z, r) {
    let best = null;
    let bestD2 = Infinity;
    for (const e of enemies.list) {
      if (!e.alive) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      const d2 = dx * dx + dz * dz;
      const rr = r + e.radius;
      if (d2 <= rr * rr && d2 < bestD2) {
        bestD2 = d2;
        best = e;
      }
    }
    return best;
  }

  function fire(player, target) {
    const dx = target.x - player.position.x;
    const dz = target.z - player.position.z;
    const len = Math.hypot(dx, dz);
    const ux = len > 1e-6 ? dx / len : 0;
    const uz = len > 1e-6 ? dz / len : 1;
    const mesh = new THREE.Mesh(bulletGeo, bulletMat);
    const x = player.position.x + ux * player.radius;
    const z = player.position.z + uz * player.radius;
    mesh.position.set(x, BULLET_Y, z);
    mesh.rotation.y = Math.atan2(ux, uz);
    scene.add(mesh);
    active.push({ x, z, dx: ux, dz: uz, life: projectileLifetime, mesh });
  }

  function update(dt, { player, onPlayerHit }) {
    // Auto-attack: nearest enemy in range, one shot every fireInterval.
    fireTimer -= dt;
    if (fireTimer > 0 && player.hp <= 0) fireTimer = 0;
    if (fireTimer <= 0 && active.length < cap && player.hp > 0) {
      const p = player.position;
      const target = nearestInRange(p.x, p.z, range);
      if (target) {
        fire(player, target);
        fireTimer = fireInterval;
      }
    }

    // Move projectiles and resolve collisions (max one entity per bullet).
    for (let i = active.length - 1; i >= 0; i--) {
      const b = active[i];
      b.life -= dt;
      b.x += b.dx * projectileSpeed * dt;
      b.z += b.dz * projectileSpeed * dt;
      if (b.life <= 0) {
        scene.remove(b.mesh);
        active.splice(i, 1);
        continue;
      }
      let hit = null;
      for (const e of enemies.list) {
        if (!e.alive) continue;
        const rr = e.radius + BULLET_RADIUS;
        const dx = e.x - b.x;
        const dz = e.z - b.z;
        if (dx * dx + dz * dz <= rr * rr) { hit = e; break; }
      }
      if (hit) {
        enemies.damage(hit, projectileDamage);
        scene.remove(b.mesh);
        active.splice(i, 1);
      } else {
        b.mesh.position.x = b.x;
        b.mesh.position.z = b.z;
      }
    }

    // Contact damage: at most once per frame, healthy player only.
    if (onPlayerHit && player.hp > 0) {
      const p = player.position;
      for (const e of enemies.list) {
        if (!e.alive) continue;
        const rr = e.radius + player.radius;
        const dx = e.x - p.x;
        const dz = e.z - p.z;
        if (dx * dx + dz * dz <= rr * rr) {
          onPlayerHit(e);
          break;
        }
      }
    }
  }

  function reset() {
    for (const b of active) scene.remove(b.mesh);
    active.length = 0;
    fireTimer = 0;
  }

  return {
    get live() { return active.length; },
    update,
    reset,
  };
}
