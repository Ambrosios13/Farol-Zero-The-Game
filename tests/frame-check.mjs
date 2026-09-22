// Acceptance check: project the four arena corners (+ wall top) through the
// orthographic camera at several aspect ratios. All must land inside
// NDC [-1,1] with a visible margin (no cropping).
import * as THREE from 'three';
import { computeOrthoBounds, CONFIG } from '../src/config.js';

const HALF = CONFIG.arena.size / 2;
const corners = [
  ['(-,-) NW', -HALF, 0, -HALF],
  ['(+,-) NE', +HALF, 0, -HALF],
  ['(+,+) SE', +HALF, 0, +HALF],
  ['(-,+) SW', -HALF, 0, +HALF],
  ['wall N', 0, CONFIG.arena.wallHeight, -HALF - 0.6],
  ['wall S', 0, CONFIG.arena.wallHeight, +HALF + 0.6],
];
const phi = (CONFIG.camera.elevationDeg * Math.PI) / 180;

for (const [name, aspect] of [['portrait 9:16', 9 / 16], ['square', 1], ['landscape 16:9', 16 / 9], ['landscape 19.5:9', 19.5 / 9]]) {
  const b = computeOrthoBounds(aspect, CONFIG);
  const cam = new THREE.OrthographicCamera(-b.width / 2, b.width / 2, b.height / 2, -b.height / 2, 0.1, 300);
  cam.position.set(0, CONFIG.camera.distance * Math.sin(phi), CONFIG.camera.distance * Math.cos(phi));
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld();
  let worst = 1;
  for (const [label, x, y, z] of corners) {
    const v = new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse);
    const ndc = new THREE.Vector3(x, y, z)
      .applyMatrix4(cam.matrixWorldInverse)
      .multiplyScalar({ x: 1, y: 1, z: -1 });
    // NDC: x_ndc = x_v / width/2, y_ndc = y_v / height/2
    const xv = v.x, yv = v.y;
    const nx = xv / (b.width / 2), ny = yv / (b.height / 2);
    const m = Math.min(1 - Math.abs(nx), 1 - Math.abs(ny));
    worst = Math.min(worst, m);
    console.log(`  ${label}: ndc=(${nx.toFixed(3)}, ${ny.toFixed(3)}) margin=${m.toFixed(3)} ${m < 0 ? 'CROPPED!' : 'ok'}`);
  }
  console.log(`${name}: min margin=${worst.toFixed(3)} ${worst > 0.03 ? 'PASS' : worst > 0 ? 'PASS (tight)' : 'FAIL'}`);
}
