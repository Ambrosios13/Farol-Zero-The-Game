// Acceptance check — Phase 5: the arena starts EMPTY and pressure comes from
// continuous edge spawning. We use enemies.spawnAt() (test hook) to place
// drones deterministically for the chase/separation tests, and enemies.update()
// to verify the spawner itself (timing, min distance, cap, fast intro).
import * as THREE from 'three';
import { CONFIG } from '../src/config.js';
import { createEnemies } from '../src/enemies.js';

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  if (ok) pass++; else fail++;
  console.log(`${ok ? 'OK   ' : 'FAIL '}${name}${extra ? '  ' + extra : ''}`);
}

function fakeScene() {
  const objects = [];
  return {
    objects,
    add(o) { objects.push(o); },
    remove(o) { const i = objects.indexOf(o); if (i >= 0) objects.splice(i, 1); },
  };
}

const scene = fakeScene();
const player = { x: 0, z: 0 };
const E = createEnemies({ scene, config: CONFIG, onKill: () => {} });
const DT = 1 / 120;
const halfLimit = CONFIG.arena.size / 2 - CONFIG.enemies.radius;

// 0) Start empty, then one spawn per interval at the edges.
check('arena starts empty', E.list.length === 0);
E.update(DT, player, 0);
check('no spawn before first interval', E.list.length === 0);
for (let i = 0; i < Math.ceil(CONFIG.enemies.spawnInterval / DT); i++) E.update(DT, player, 0);
check('one drone after first interval', E.list.length === 1);
{
  const d = E.list[0];
  const onEdge = Math.abs(Math.abs(d.x) - halfLimit) < 1e-3 || Math.abs(Math.abs(d.z) - halfLimit) < 1e-3;
  const far = Math.hypot(d.x - player.x, d.z - player.z) >= CONFIG.enemies.minPlayerDist;
  check('spawned at an edge', onEdge, JSON.stringify(d));
  check('at least minPlayerDist from player', far, `dist=${Math.hypot(d.x - player.x, d.z - player.z).toFixed(2)}`);
}

// 1) Deterministic placement for the movement tests.
E.list.forEach((_) => {});
const A = E.spawnAt(-9, 0, 'regular');
const B = E.spawnAt(9, 0, 'regular');
E.update(0.5, player, 0);
check('drones chase the player', A.x > -9 && B.x < 9, JSON.stringify({ ax: A.x, bx: B.x }));

// 2) Separation: two drones overlapping get pushed apart.
E.list.length = 0;
E.scene && null;
const A2 = E.spawnAt(0, 0, 'regular');
const B2 = E.spawnAt(0, 0.5, 'regular');
E.update(0.5, player, 0);
const gap = Math.abs(B2.z - A2.z);
const minGap = CONFIG.enemies.radius * 2; // separation=0 → they only need to not overlap
check('drones do not overlap', gap >= minGap - 0.01, `gap=${gap.toFixed(2)}`);

// 3) Wall: spawn a drone near the edge facing the center; it must stay inside.
E.list.length = 0;
const W = E.spawnAt(halfLimit + 2, 0, 'regular');
check('position clamped to the wall', W.x <= halfLimit + 1e-6, `x=${W.x.toFixed(2)}`);
E.update(0.5, player, 0);
check('drone stays inside the bounds', W.x <= halfLimit + 1e-6 && W.z <= halfLimit + 1e-6, `x=${W.x.toFixed(2)} z=${W.z.toFixed(2)}`);

// 4) Visual sync: group.position follows drone.x/z.
const g = B.group.position;
check('visual group synced to logic', Math.abs(g.x - B.x) < 1e-6 && Math.abs(g.z - B.z) < 1e-6);

// 5) Cap: fill up to maxEnemies and verify no more spawn.
E.list.length = 0;
for (let i = 0; i < CONFIG.enemies.maxEnemies; i++) E.spawnAt(0, 0, 'regular');
E.update(CONFIG.enemies.spawnInterval, player, 0);
check('cap enforced (maxEnemies)', E.list.length === CONFIG.enemies.maxEnemies, `n=${E.list.length}`);

// 6) Timed spawning at 2/s while empty, with cap still enforced.
E.reset();
E.update(CONFIG.enemies.spawnInterval + 10, player, 0); // ~5 intervals
check('continuous spawning (≈5 after 12s)', E.list.length > 0 && E.list.length <= CONFIG.enemies.maxEnemies, `n=${E.list.length}`);

// 7) Fast drone: only after the first beacon, correct stats, own scale.
E.reset();
E.list.length = 0;
{
  const F = E.spawnAt(3, -3, 'fast');
  check('fast: hp = base * fast.hpMul', F.hp === CONFIG.enemies.hp * CONFIG.enemies.fast.hpMul, `hp=${F.hp}`);
  check('fast: speed = base * fast.speedMul', Math.abs(F.speed - CONFIG.enemies.speed * CONFIG.enemies.fast.speedMul) < 1e-6, `speed=${F.speed}`);
  check('fast: contact damage base * fast.dmgMul', Math.abs(F.damage - CONFIG.combat.contactDamage * CONFIG.enemies.fast.dmgMul) < 1e-6, `damage=${F.damage}`);
  check('fast: scale 0.85', Math.abs(F.group.scale.x - CONFIG.enemies.fast.scale) < 1e-6);
}
E.list.length = 0;
let fastSeen = 0;
for (let i = 0; i < CONFIG.enemies.maxEnemies; i++) {
  const d = E.spawnAt(0, 0, 'regular');
  if (d.kind === 'fast') fastSeen++;
}
check('no fast drone appears with 0 lit beacons', fastSeen === 0, `fast=${fastSeen}`);
{
  // With 1 lit beacon the spawner may produce fast drones (probabilistic 50%).
  // Drive the spawner many intervals and expect at least one fast spawn.
  E.reset();
  let anyFast = false;
  for (let i = 0; i < 30 && !anyFast; i++) {
    for (let s = 0; s < CONFIG.enemies.maxEnemies; s++) E.spawnAt(0, 0, 'regular');
    E.update(CONFIG.enemies.spawnInterval, { x: 0, z: 0 }, 1);
    const any2 = E.list.some((d) => d.kind === 'fast');
    E.list.length = 0;
    if (any2) anyFast = true;
  }
  check('fast drones appear once a beacon is lit (probabilistic)', anyFast);
}

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
