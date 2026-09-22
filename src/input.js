// Farol Zero – keyboard + virtual joystick.
// Exposes a normalized movement vector (XZ plane, camera faces -Z so
// input axes map 1:1 to world axes) and reset().
export function createInput({ baseEl, knobEl }) {
  const keys = new Set();
  const joystick = { active: false, pointerId: null, x: 0, z: 0 };
  const KNOB_RANGE = 40; // px the knob may travel from center
  let baseCenter = { x: 0, y: 0 };

  const KEY_VECTORS = [
    ['KeyW', 'ArrowUp', 0, -1],
    ['KeyS', 'ArrowDown', 0, 1],
    ['KeyA', 'ArrowLeft', -1, 0],
    ['KeyD', 'ArrowRight', 1, 0],
  ];

  function keyDown(e) {
    if (KEY_VECTORS.some(([a, b]) => e.code === a || e.code === b)) {
      keys.add(e.code);
      if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
    }
  }
  function keyUp(e) { keys.delete(e.code); }
  function clearAll() { keys.clear(); releasePointer(); }

  function joystickVectorFromEvent(e) {
    const dx = e.clientX - baseCenter.x;
    const dz = e.clientY - baseCenter.y;
    const len = Math.hypot(dx, dz) || 1;
    const clamped = Math.min(len, KNOB_RANGE);
    const v = { x: (dx / len) * (clamped / KNOB_RANGE), z: (dz / len) * (clamped / KNOB_RANGE) };
    const mag = Math.hypot(v.x, v.z);
    // Dead zone: ignore very small motions.
    return mag < 0.12 ? { x: 0, z: 0 } : v;
  }

  function updateKnob(v) {
    knobEl.style.transform = `translate(${v.x * KNOB_RANGE}px, ${v.z * KNOB_RANGE}px)`;
  }

  function releasePointer() {
    joystick.active = false;
    joystick.pointerId = null;
    joystick.x = 0;
    joystick.z = 0;
    updateKnob({ x: 0, z: 0 });
  }

  function pointerDown(e) {
    if (joystick.pointerId !== null) return;
    const rect = baseEl.getBoundingClientRect();
    baseCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    baseEl.setPointerCapture(e.pointerId);
    joystick.pointerId = e.pointerId;
    joystick.active = true;
    const v = joystickVectorFromEvent(e);
    joystick.x = v.x; joystick.z = v.z;
    updateKnob(v);
  }
  function pointerMove(e) {
    if (joystick.pointerId !== e.pointerId) return;
    const v = joystickVectorFromEvent(e);
    joystick.x = v.x; joystick.z = v.z;
    updateKnob(v);
  }
  function pointerEnd(e) {
    if (joystick.pointerId !== e.pointerId) return;
    releasePointer();
  }

  baseEl.addEventListener('pointerdown', pointerDown);
  baseEl.addEventListener('pointermove', pointerMove);
  baseEl.addEventListener('pointerup', pointerEnd);
  baseEl.addEventListener('pointercancel', pointerEnd);
  baseEl.addEventListener('lostpointercapture', pointerEnd);

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', clearAll);
  document.addEventListener('visibilitychange', clearAll);

  function getVector() {
    if (joystick.active) return { x: joystick.x, z: joystick.z };
    let x = 0, z = 0;
    for (const [a, b, vx, vz] of KEY_VECTORS) {
      if (keys.has(a) || keys.has(b)) { x += vx; z += vz; }
    }
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; } // no extra diagonal speed
    return { x, z };
  }

  function reset() { clearAll(); }

  function dispose() {
    baseEl.removeEventListener('pointerdown', pointerDown);
    baseEl.removeEventListener('pointermove', pointerMove);
    baseEl.removeEventListener('pointerup', pointerEnd);
    baseEl.removeEventListener('pointercancel', pointerEnd);
    baseEl.removeEventListener('lostpointercapture', pointerEnd);
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('blur', clearAll);
    document.removeEventListener('visibilitychange', clearAll);
  }

  return { getVector, reset, dispose };
}
