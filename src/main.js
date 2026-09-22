// Farol Zero – entry point: one loop, one state machine.
// Phase 2: menu -> playing <-> paused (won/lost reachable only via debug fns).
// Phase 3: minimum combat – drones chase, auto-fire, projectiles, contact dmg.
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createEnemies } from './enemies.js';
import { createCombat } from './combat.js';
import { createUI } from './ui.js';

const canvas = document.getElementById('game-canvas');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

const world = createWorld({ canvas, config: CONFIG });
const input = createInput({ baseEl: joystickBase, knobEl: joystickKnob });
const player = createPlayer({ scene: world.scene, config: CONFIG });
const enemies = createEnemies({ scene: world.scene, config: CONFIG });
const combat = createCombat({ scene: world.scene, config: CONFIG, enemies });

// --- Single source of truth for the match -------------------------------
let state = 'menu'; // menu | playing | paused | won | lost
let simTime = 0; // seconds alive (frozen when not playing)
let hp = CONFIG.player.maxHp;
let crystals = CONFIG.resources.startingCrystals;
let invuln = 0; // seconds of global invulnerability remaining

function damage(dmg) {
  if (invuln > 0 || hp <= 0) return;
  hp = Math.max(0, hp - dmg);
  invuln = CONFIG.combat.invulnTime;
}

function setState(next) {
  state = next;
  if (state !== 'playing') input.reset();
  ui.show(state);
}

function restart() {
  // Idempotent: restore values/entities without new loops or listeners.
  simTime = 0;
  hp = CONFIG.player.maxHp;
  crystals = CONFIG.resources.startingCrystals;
  invuln = 0;
  player.reset();
  enemies.reset(); // fixed five, no stale entities
  combat.reset();  // clears live projectiles
  setState('playing');
}

const ui = createUI({
  onStart: restart, // first start and post-game restart share the path
  onResume: () => { if (state === 'paused') setState('playing'); },
  onRestart: restart,
  onTogglePause: () => {
    if (state === 'playing') setState('paused');
    else if (state === 'paused') setState('playing');
  },
});

// Debug-only (no extra UI buttons in the final game):
window.farolDebug = {
  win: () => { if (state === 'playing') setState('won'); },
  lose: () => { if (state === 'playing') { hp = 0; setState('lost'); } },
  kill: () => { if (state === 'playing') { hp = 0; setState('lost'); } },
};

// Pausar por perda de foco: congela simulação e comandos; retomar só via UI.
window.addEventListener('blur', () => { if (state === 'playing') setState('paused'); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state === 'playing') setState('paused');
});

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, CONFIG.perf.maxDt);
  last = now;

  if (state === 'playing') {
    simTime += dt;
    const v = input.getVector();
    player.update(dt, v);
    if (hp > 0) {
      invuln -= dt;
      // Drones chase even on the lethal frame; contact applies first.
      enemies.update(dt, player.position);
      const onHit = invuln > 0 ? null : () => damage(CONFIG.combat.contactDamage);
      combat.update(dt, { player, onPlayerHit: onHit });
      enemies.sweep();
    } else {
      // Defeated: no chasing, no auto-attack, no projectiles.
    }
    if (hp <= 0) setState('lost'); // real defeat, no buttons
  }
  ui.setHud({ hp, crystals, time: simTime });
  world.update(dt);
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(frame);
}
setState(state); // paint menu on first frame
requestAnimationFrame(frame);
