// Farol Zero – Phase 4: objective invariants, headless (real three.js, fake scene).
// Conventions: same plain-check format as phase2/phase3; CONFIG is the
// source of truth — no hard-coded gameplay numbers in the assertions.
import { CONFIG } from '../src/config.js';
import { createEnemies } from '../src/enemies.js';
import { createCombat } from '../src/combat.js';
import { createObjectives } from '../src/objectives.js';

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

function makeBank(start = 0) {
  let crystals = start;
  return {
    get: () => crystals,
    add: (n) => { crystals += n; },
    spend: (n) => { crystals = Math.max(0, crystals - n); },
    get value() { return crystals; },
  };
}

const BC = CONFIG.beacons;
const RES = CONFIG.resources;
const DT = 1 / 60;
// full channelTime is 72 frames of 1/60 — leave float margin.
const CHANNEL_FRAMES = Math.ceil(BC.channelTime / DT) + 10;

// stand on a spot until its beacon lights (budget of frames, no asserts)
function channelUntilLit(obj, bank, spot, onWin) {
  for (let i = 0; i < CHANNEL_FRAMES * 2; i++) {
    obj.update(DT, { x: spot[0], z: spot[1] }, bank, onWin);
    if (obj.beacons.find((b) => b.x === spot[0] && b.z === spot[1]).lit) return;
  }
}

// --- Initial state ---------------------------------------------------------
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  check('six starting crystals are loose on the field',
    obj.loose.length === RES.startingCrystals, `loose=${obj.loose.length}`);
  check('starts unlit and not won', obj.litCount === 0 && obj.won === false);
  check('beacon spots are inside the arena', BC.spots.every(([x, z]) =>
    Math.abs(x) < CONFIG.arena.size / 2 && Math.abs(z) < CONFIG.arena.size / 2));
  check('no starting crystal sits inside a beacon area', obj.loose.every((c) =>
    !obj.beacons.some((b) => Math.hypot(b.x - c.x, b.z - c.z) < BC.radius)), '');
}

// --- Collect + cost-1 never channels + leave resets + exact single spend ---
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const bank = makeBank(0);
  const spot0 = BC.spots[0];

  // stand on the [0,5] crystal: 1.0u from spawn, inside collectRadius
  obj.update(DT, { x: 0, z: 5 }, bank, () => {});
  check('proximity auto-collects a crystal by walking', bank.value === 1, `bank=${bank.value}`);

  // balance = cost-1 (auto-collected 1 above): must NOT accrue anything
  bank.add(BC.cost - 2);
  for (let i = 0; i < 180; i++) obj.update(DT, { x: spot0[0], z: spot0[1] }, bank, () => {});
  check('insufficient balance (cost-1) never channels',
    obj.progressOf(spot0) === 0 && bank.value === BC.cost - 1,
    `p=${obj.progressOf(spot0)} bank=${bank.value}`);

  // balance = cost: partial, then step back out and confirm reset
  bank.add(1);
  obj.update(DT, { x: spot0[0], z: spot0[1] }, bank, () => {});
  const mid = obj.progressOf(spot0);
  check('with cost balance, contiguous frames accrue progress',
    mid > 0 && mid < BC.channelTime, `p=${mid}`);
  obj.update(DT, { x: spot0[0] + 4, z: spot0[1] }, bank, () => {}); // outside the 3u ring
  check('leaving the beacon area cancels progress', obj.progressOf(spot0) === 0);

  // full contiguous channel → lit, and the cost is charged exactly once
  channelUntilLit(obj, bank, spot0, () => {});
  check('a full contiguous channel lights the beacon', obj.litCount === 1);
  check('the cost is charged exactly once (bank ends at 0)',
    bank.value === 0, `bank=${bank.value}`);

  // stay on a LIT beacon with plenty of bank: it must not re-spend
  bank.add(BC.cost * 2);
  for (let i = 0; i < 120; i++) obj.update(DT, { x: spot0[0], z: spot0[1] }, bank, () => {});
  check('a lit beacon neither charges nor re-spends', bank.value === BC.cost * 2,
    `bank=${bank.value}`);
}

// --- Only one beacon receives progress at a time --------------------------
{
  const scene = fakeScene();
  const cfg2 = { ...CONFIG, beacons: { ...BC, spots: [[-2, 0], [2, 0], [12, 12]] } };
  const obj = createObjectives({ scene, config: cfg2 });
  const bank = makeBank(BC.cost * 3);
  const [A, Bspot] = cfg2.beacons.spots;

  // (-0.5, 0) is inside BOTH 3u areas (1.5u from A, 2.5u from B); A is nearest.
  for (let i = 0; i < 60; i++) obj.update(DT, { x: -0.5, z: 0 }, bank, () => {});
  const pA = obj.progressOf(A), pB = obj.progressOf(Bspot);
  check('in overlapping areas, exactly one beacon is channeling',
    (pA > 0) !== (pB > 0), `A=${pA} B=${pB}`);
  check('the nearest beacon is the one gaining progress',
    pA > 0 && pB === 0, `A=${pA} B=${pB}`);

  // Step to (1.5, 0): inside B only; A's progress must reset, B keeps charging.
  for (let i = 0; i < 5; i++) obj.update(DT, { x: 1.5, z: 0 }, bank, () => {});
  const bA = obj.progressOf(A), bB = obj.progressOf(Bspot);
  check('moving to the other area: old beacon resets, exactly one charging',
    bA === 0 && bB > 0, `A=${bA} B=${bB}`);
}

// --- Third beacon closes the match exactly once ---------------------------
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const bank = makeBank(BC.cost * BC.count);
  let wins = 0;
  const onWin = () => { wins++; };
  for (const spot of BC.spots) channelUntilLit(obj, bank, spot, onWin);
  check('the third beacon triggers win exactly once', wins === 1, `wins=${wins}`);
  check('all three lit; total spend was exactly 3x cost',
    obj.litCount === BC.count && bank.value === 0,
    `lit=${obj.litCount} bank=${bank.value}`);
}

// --- Drops: per-kill loot, scatter, loose cap -----------------------------
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const loose0 = obj.loose.length;
  obj.dropCrystal(1, 2);
  check('one enemy kill drops its crystals around the crash',
    obj.loose.length === loose0 + RES.dropPerKill, `loose=${obj.loose.length}`);
  check(`dropped crystals scatter within ~${0.4 + 1.2 + RES.crystalRadius}u of the crash`, (() => {
    const tail = obj.loose.slice(loose0);
    return tail.length === RES.dropPerKill &&
      tail.every((c) => Math.hypot(c.x - 1, c.z - 2) <= 1.7 + RES.crystalRadius);
  })());
  for (let i = 0; i < 40; i++) obj.dropCrystal(i, 0);
  check('loose cap: total loose never exceeds the limit',
    obj.loose.length === RES.maxLoose, `loose=${obj.loose.length}`);
}
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const enemies = createEnemies({ scene, config: CONFIG, onKill: (x, z) => obj.dropCrystal(x, z) });
  const loose0 = obj.loose.length;
  const victim = enemies.list[0];
  const diedAt = { x: victim.x, z: victim.z };
  enemies.damage(victim, 999);
  enemies.sweep();
  check('wired onKill hook lands drops on the field',
    obj.loose.length === loose0 + RES.dropPerKill, `loose=${obj.loose.length}`);
  check('drops land at the actual crash point (not the respawn)', (() => {
    const tail = obj.loose.slice(loose0);
    return tail.length === RES.dropPerKill &&
      tail.every((c) => Math.hypot(c.x - diedAt.x, c.z - diedAt.z) <= 1.7 + RES.crystalRadius);
  })());
}

// --- End-to-end: combat kills → loot → park-and-channel → win -------------
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const enemies = createEnemies({ scene, config: CONFIG, onKill: (x, z) => obj.dropCrystal(x, z) });
  const p = { x: 0, z: 4 };
  const playerG = { position: p, radius: CONFIG.player.radius, hp: 100 };
  const combat = createCombat({ scene, config: CONFIG, enemies });
  const bank = makeBank(0);
  let won = false;
  const onWin = () => { won = true; };

  // Phase 1 — the match: auto-kill the five (combat loop) while a simple
  // bot always moves toward the nearest loose crystal.
  for (let f = 0; f < 5400 && !won; f++) {
    let best = null, bestD2 = Infinity;
    for (const c of obj.loose) {
      const d2 = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
      if (d2 < bestD2) { bestD2 = d2; best = c; }
    }
    if (best) {
      const dx = best.x - p.x, dz = best.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      p.x += (dx / d) * CONFIG.player.speed * DT;
      p.z += (dz / d) * CONFIG.player.speed * DT;
    }
    obj.update(DT, p, bank, onWin);
    enemies.update(DT, p);
    combat.update(DT, { player: playerG, onPlayerHit: null });
    enemies.sweep();
  }
  const expectedBank = RES.startingCrystals + 5 * RES.dropPerKill; // 6 + 5x loot
  check('end-to-end: every drone died and every crystal was collected',
    enemies.list.length === 0 && bank.value === expectedBank,
    `enemies=${enemies.list.length} bank=${bank.value}/${expectedBank}`);

  // Phase 2 — win: walk to each beacon, stand still until it lights.
  for (const spot of BC.spots) {
    // walk (same player speed)
    for (let i = 0; i < 600; i++) {
      const b = obj.beacons.find((b2) => b2.x === spot[0] && b2.z === spot[1]);
      if (b.lit) break;
      obj.update(DT, p, bank, onWin); // park-and-move: still collect nothing (none left)
      const dx = spot[0] - p.x, dz = spot[1] - p.z, d = Math.hypot(dx, dz);
      if (d <= 0.01) break;
      p.x += (dx / d) * Math.min(CONFIG.player.speed * DT, d);
      p.z += (dz / d) * Math.min(CONFIG.player.speed * DT, d);
    }
    channelUntilLit(obj, bank, spot, onWin);
  }
  check('end-to-end: standing on each beacon wins the match',
    won === true && obj.litCount === BC.count, `lit=${obj.litCount}`);
  check('end-to-end: total spend was exactly 3x cost (leftover = bank)',
    bank.value === expectedBank - BC.cost * BC.count, `bank=${bank.value}`);
}

// --- Restart restores the whole objective ----------------------------------
{
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const bank = makeBank(BC.cost);
  const spot0 = BC.spots[0];
  obj.dropCrystal(0, 9);
  obj.reset();
  check('reset restores six loose, nothing lit, win cleared',
    obj.loose.length === RES.startingCrystals && obj.litCount === 0 && obj.won === false);
}
{
  // full-stack restart, exactly as main.restart() wires it
  const scene = fakeScene();
  const obj = createObjectives({ scene, config: CONFIG });
  const enemies = createEnemies({ scene, config: CONFIG });
  const combat = createCombat({ scene, config: CONFIG, enemies });
  const p = { x: 0, z: 4 };
  // dirty everything like a real round would
  obj.update(DT, p, makeBank(0), () => {}); // collects the (0,5) crystal
  enemies.damage(enemies.list[1], 999);
  for (let f = 0; f < 30; f++) {
    combat.update(DT, { player: { position: p, radius: 0.8, hp: 100 }, onPlayerHit: null });
    enemies.update(DT, p);
    enemies.sweep();
  }
  obj.reset();
  enemies.reset();
  combat.reset();
  check('full restart leaves 6 loose / 5 drones / 0 live / 0 lit',
    obj.loose.length === RES.startingCrystals && enemies.list.length === 5 &&
    combat.live === 0 && obj.litCount === 0);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
