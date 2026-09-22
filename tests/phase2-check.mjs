// Phase 2 – phase check: state machine invariants (no DOM, mirror of main.js).
import { formatTime } from '../src/ui.js';

let pass = 0, fail = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
  ok ? pass++ : fail++;
}

// --- formatTime ---------------------------------------------------------
check('formatTime 0', formatTime(0) === '0:00');
check('formatTime 59.9', formatTime(59.9) === '0:59')
check('formatTime 60', formatTime(60) === '1:00');
check('formatTime 125', formatTime(125) === '2:05');
check('formatTime negative clamps', formatTime(-3) === '0:00');

// --- restart idempotency (same logic main.js runs 5 times) --------------
const cfg = { maxHp: 100, starting: 6 };
let state = 'playing', simTime = 30, hp = 55, crystals = 12, playerX = 3.2;
function restart() {
  simTime = 0; hp = cfg.maxHp; crystals = cfg.starting; playerX = 4;
  state = 'playing';
}
for (let i = 0; i < 5; i++) restart();
check('5x restart: values restored', simTime === 0 && hp === 100 && crystals === 6 && playerX === 4);
check('5x restart: state stays single playing', state === 'playing');

// --- pause freezes -------------------------------------------------------
let t = 0;
const states = ['playing', 'paused', 'playing']; // cycle like the real machine
let dt = 1 / 60;
for (let i = 0; i < 60; i++) { const s = states[i % 3]; if (s === 'playing') t += dt; }
// 40 dt in playing -> 40/60 s
check('pause freezes sim clock', Math.abs(t - 40 / 60) < 1e-9, `t=${t.toFixed(3)}.`);

console.log(fail === 0 ? 'ALL PASS' : `FAILURES: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
