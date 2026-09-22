// Farol Zero – entry point: one loop, one state.
// States will grow in phase 2 (menu/paused/won/lost); phase 1 runs playing.
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';

const canvas = document.getElementById('game-canvas');
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');

const world = createWorld({ canvas });
const input = createInput({ baseEl: joystickBase, knobEl: joystickKnob });
const player = createPlayer({ scene: world.scene });

let state = 'playing'; // menu | playing | paused | won | lost (phase 2+)

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, CONFIG.perf.maxDt);
  last = now;

  if (state === 'playing') {
    const v = input.getVector();
    player.update(dt, v);
  }
  world.renderer.render(world.scene, world.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
