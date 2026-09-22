// input.js logic test with a minimal DOM stub (no browser needed).
function makeEl() {
  return {
    style: {},
    _on: {},
    addEventListener(t, f) { (this._on[t] ??= []).push(f); },
    removeEventListener() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 128, height: 128 }; },
    setPointerCapture() {},
    fire(t, e) { (this._on[t] || []).forEach(f => f(e)); },
  };
}
const winListeners = {};
globalThis.window = {
  devicePixelRatio: 1,
  addEventListener(t, f) { (winListeners[t] ??= []).push(f); },
};
globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
};
globalThis.window.__fire = (t, e) => (winListeners[t] || []).forEach(f => f(e));

const { createInput } = await import('../src/input.js');
const base = makeEl(); const knob = makeEl();
const input = createInput({ baseEl: base, knobEl: knob });

let fails = 0;
function expect(label, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} ${label} ${extra}`);
  if (!cond) fails++;
}

// ---- keyboard ----
globalThis.window.__fire('keydown', { code: 'KeyW', preventDefault() {} });
expect('W -> (0,-1)', JSON.stringify(input.getVector()) === '{"x":0,"z":-1}');
globalThis.window.__fire('keydown', { code: 'KeyD', preventDefault() {} });
const d = input.getVector();
const diagLen = Math.hypot(d.x, d.z);
expect('W+D normalized (no diagonal boost)', Math.abs(diagLen - 1) < 1e-9, `len=${diagLen}`);
expect('W+D -> (+x,-z)', d.x > 0 && d.z < 0);
globalThis.window.__fire('keydown', { code: 'ArrowLeft', preventDefault() {} });
const wl = input.getVector();
expect('W+D+Left: x cancels -> (0,-1), len<=1', Math.hypot(wl.x, wl.z) <= 1 + 1e-9 && wl.x === 0 && wl.z === -1, JSON.stringify(wl));
globalThis.window.__fire('keyup', { code: 'KeyW' });
globalThis.window.__fire('keyup', { code: 'KeyD' });
expect('ArrowLeft alone -> (-1,0)', JSON.stringify(input.getVector()) === '{"x":-1,"z":0}', JSON.stringify(input.getVector()));
globalThis.window.__fire('keyup', { code: 'ArrowLeft' });
expect('all up -> (0,0)', JSON.stringify(input.getVector()) === '{"x":0,"z":0}');

// ---- joystick (touch) ----
base.fire('pointerdown', { pointerId: 1, clientX: 64, clientY: 124 }); // below center (64,64)
const j = input.getVector();
expect('knob down -> (0,~1)', j.x === 0 && j.z > 0.9, JSON.stringify(j));
base.fire('pointermove', { pointerId: 1, clientX: 104, clientY: 64 }); // right
const j2 = input.getVector();
expect('knob right -> (~1,0)', j2.x > 0.9 && j2.z === 0, JSON.stringify(j2));
base.fire('pointercancel', { pointerId: 1 }); // cancel must stop movement
expect('pointercancel resets', JSON.stringify(input.getVector()) === '{"x":0,"z":0}');

// reset clears everything
globalThis.window.__fire('keydown', { code: 'KeyA', preventDefault() {} });
base.fire('pointerdown', { pointerId: 2, clientX: 124, clientY: 64 });
input.reset();
expect('reset clears keys+joystick', JSON.stringify(input.getVector()) === '{"x":0,"z":0}');

process.exit(fails ? 1 : 0);
