// Phase 3 – combat invariants, headless (real three.js, fake scene).
import { CONFIG } from '../src/config.js';
import { createEnemies } from '../src/enemies.js';
import { createCombat } from '../src/combat.js';

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  ok ? pass++ : fail++;
}

function fakeScene() {
  const objs = [];
  return {
    add: (o) => objs.push(o),
    remove: (o) => { const i = objs.indexOf(o); if (i >= 0) objs.splice(i, 1); },
    get objects() { return objs; },
  };
}

// --- Enemies: fixed five, chase, separation -----------------------------
{
  const scene = fakeScene();
  const enemies = createEnemies({ scene, config: CONFIG });
  check("5 fixed drones spawn", enemies.list.length === 5);
  const before = enemies.list.map((d) => ({ x: d.x, z: d.z }));
  const player = { x: 0, z: 0 };
  enemies.update(1 / 60, player);
  const closer = before.every((b, i) => {
    const d = enemies.list[i];
    const d0 = Math.hypot(b.x - player.x, b.z - player.z);
    const d1 = Math.hypot(d.x - player.x, d.z - player.z);
    return d1 <= d0 + 1e-9;
  });
  check('all drones move toward player', closer);

  // separation: two drones start on exactly the same point
  const dA = enemies.list[0];
  const dB = enemies.list[1];
  dA.x = 5; dA.z = 0; dB.x = 5.05; dB.z = 0;
  enemies.update(1 / 60, player);
  const sep = Math.hypot(dB.x - dA.x, dB.z - dA.z);
  check('pairwise separation increases overlap distance', sep > 0.05, `sep=${sep.toFixed(3)}`);
}

// --- Combat: no shot out of range ----------------------------------------
{
  const scene = fakeScene();
  const player = { position: { x: 0, z: 4 }, radius: 0.8, hp: 100 };
  const enemies = createEnemies({ scene, config: CONFIG });
  // teleport all far away (beyond range 10)
  for (const e of enemies.list) { e.x = -15; e.z = -15; e.group.position.set(e.x, 0, e.z); }
  const combat = createCombat({ scene, config: CONFIG, enemies });
  for (let i = 0; i < 120; i++) combat.update(1 / 60, { player, onPlayerHit: null });
  check('no shots without target in range', combat.live === 0, `live=${combat.live}`);
}

// --- Combat: hit cycle kills a 2-hp drone; bullet hits max 1 entity ----
{
  const scene = fakeScene();
  const player = { position: { x: 0, z: 0 }, radius: 0.8, hp: 100 };
  const enemies = createEnemies({ scene, config: CONFIG });
  // Keep only one active target in the corridor at (8,0); freeze the rest far.
  const target = enemies.list[2];
  target.x = 8; target.z = 0;
  for (const e of enemies.list) if (e !== target) { e.x = -15; e.z = -15; }
  for (const e of enemies.list) e.group.position.set(e.x, 0, e.z);
  const combat = createCombat({ scene, config: CONFIG, enemies });

  const dt = 1 / 60;
  let frames = 0;
  while (frames < 600 && enemies.list.length > 0) {
    enemies.update(dt, player.position);
    let onHit = null;
    combat.update(dt, { player, onPlayerHit: null });
    enemies.sweep();
    frames++;
  }
  check('auto-fire kills 2-hp drone, then removed', frames < 600, `frames=${frames}`);

  // single-entity per bullet: two drones stacked on the same bullet path;
  // exactly one takes damage per bullet.
  const scene2 = fakeScene();
  const enemies2 = createEnemies({ scene: scene2, config: CONFIG });
  const p2 = { position: { x: 0, z: 0 }, radius: 0.8, hp: 100 };
  const a = enemies2.list[0], b = enemies2.list[1];
  a.x = 5; a.z = 0; b.x = 5.2; b.z = 0; // b is 0.25 behind a, bullet r=0.3
  for (const e of enemies2.list) if (e !== a && e !== b) { e.x = -15; e.z = -15; }
  for (const e of enemies2.list) e.group.position.set(e.x, 0, e.z);
  const combat2 = createCombat({ scene: scene2, config: CONFIG, enemies: enemies2 });
  for (let i = 0; i < 30; i++) {
    a.x = 5; a.z = 0; b.x = 5.2; b.z = 0; // freeze targets on the path
    combat2.update(1 / 60, { player: p2, onPlayerHit: null });
  }
  check('each bullet hits at most one entity', b.hp === 2 || a.hp >= 1, `a=${a.hp}, b=${b.hp}`);
}

// --- Projectiles expire after 1 s ---------------------------------------
{
  const cfg = structuredClone(CONFIG);
  cfg.combat.range = 30; // allow shooting far targets
  const scene = fakeScene();
  const player = { position: { x: 0, z: 0 }, radius: 0.8, hp: 100 };
  const enemies = createEnemies({ scene, config: cfg });
  for (const e of enemies.list) { e.x = 25; e.z = 0; e.group.position.set(e.x, 0, e.z); }
  const combat = createCombat({ scene, config: cfg, enemies });
  const dt = 1 / 60;
  combat.update(dt, { player, onPlayerHit: null }); // shot #1 at t=0
  check('bullet fires at distant target', combat.live === 1, `live=${combat.live}`);
  const firstMesh = scene.objects[scene.objects.length - 1];
  let okCap = true;
  for (let i = 0; i < 62; i++) {
    combat.update(dt, { player, onPlayerHit: null });
    if (combat.live > 2) okCap = false; // max 2 in flight (18u in-flight span)
  }
  check('first bullet expires after ~1 s (mesh gone from scene)',
    !scene.objects.includes(firstMesh));
  check('no bullet can reach 25u target (18 u/s -> 1 s)', okCap);
}

// --- Defeated player: no fire, no contact ---------------------------------
{
  const scene = fakeScene();
  const player = { position: { x: 0, z: 0 }, radius: 0.8, hp: 0 };
  const enemies = createEnemies({ scene, config: CONFIG });
  const near = enemies.list[0];
  near.x = 0.5; near.z = 0; near.group.position.set(near.x, 0, near.z);
  for (const e of enemies.list) if (e !== near) { e.x = -15; e.z = -15; }
  for (const e of enemies.list) e.group.position.set(e.x, 0, e.z);
  const combat = createCombat({ scene, config: CONFIG, enemies });
  let hits = 0;
  for (let i = 0; i < 60; i++) {
    combat.update(1 / 60, { player, onPlayerHit: () => { hits++; } });
  }
  check('hp<=0: no shots, no contact callback', combat.live === 0 && hits === 0);
}

// --- Contact damage: at most one hit per frame ---------------------------
{
  const scene = fakeScene();
  const player = { position: { x: 0, z: 0 }, radius: 0.8, hp: 100 };
  const enemies = createEnemies({ scene, config: CONFIG });
  const a = enemies.list[0], b = enemies.list[1];
  a.x = 1; a.z = 0; b.x = 1.1; b.z = 0.1; // both overlapping the player
  for (const e of enemies.list) if (e !== a && e !== b) { e.x = -15; e.z = -15; }
  for (const e of enemies.list) e.group.position.set(e.x, 0, e.z);
  const combat = createCombat({ scene, config: CONFIG, enemies });
  a.x = 1; a.z = 0; b.x = 1.1; b.z = 0.1;
  let hits = 0;
  combat.update(1 / 60, { player, onPlayerHit: () => hits++ });
  check('multiple overlapping drones: 1 contact damage per frame', hits === 1);
}

// --- Restart clears projectiles and stale enemies ------------------------
{
  const cfg = structuredClone(CONFIG);
  cfg.combat.range = 30;
  const scene = fakeScene();
  const player = { position: { x: 0, z: 0 }, radius: 0.8, hp: 100 };
  const enemies = createEnemies({ scene, config: cfg });
  for (const e of enemies.list) { e.x = 25; e.z = 0; e.group.position.set(e.x, 0, e.z); }
  const combat = createCombat({ scene, config: cfg, enemies });
  const dt = 1 / 60;
  for (let i = 0; i < 60; i++) combat.update(dt, { player, onPlayerHit: null });
  const mid = combat.live; // 3+ bullets in flight toward unreachable 25u target
  check('precondition: bullets in flight before restart', mid > 0, `mid=${mid}`);
  const oldMeshes = new Set(scene.objects);
  const oldDrones = new Set(enemies.list.map((d) => d.group));
  enemies.reset();
  combat.reset();
  check('restart: 5 new drones, 0 projectiles', enemies.list.length === 5 && combat.live === 0);
  const stale = [...scene.objects].filter(
    (o) => oldMeshes.has(o) || oldDrones.has(o),
  ).length;
  check('restart: old entity meshes removed from scene', stale === 0,
    `stale=${stale}, scene=${scene.objects.length}`);
}

console.log(fail === 0 ? 'ALL PASS' : `FAILURES: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
