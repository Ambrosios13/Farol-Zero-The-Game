// Farol Zero – scene, lights, arena, tilted orthographic camera.
import * as THREE from 'three';
import { CONFIG, computeOrthoBounds, PROJECTED_HEIGHT } from './config.js';

// Shared resources — never disposed per-entity.
const shared = {};

export function createWorld({ canvas, config = CONFIG }) {
  shared.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  shared.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.perf.maxPixelRatio));
  shared.renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050b16);

  scene.add(new THREE.AmbientLight(config.colors.light, 0.9));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(10, 30, 12);
  scene.add(dir);

  const cam = createCamera(canvas, config);
  const arena = buildArena(scene, config);

  function onResize() {
    resize();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
  resize();

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    shared.renderer.setSize(w, h, false);
    shared.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, config.perf.maxPixelRatio));
    applyFraming(cam, w / h, config);
  }

  function applyFraming(camera, aspect, cfg) {
    const { width, height } = computeOrthoBounds(aspect, cfg);
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.updateProjectionMatrix();
  }

  function createCamera(canvasEl, cfg) {
    const aspect = (canvasEl.clientWidth || 16) / (canvasEl.clientHeight || 9);
    const { width, height } = computeOrthoBounds(aspect, cfg);
    const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.5, 300);
    const phi = (cfg.camera.elevationDeg * Math.PI) / 180;
    camera.position.set(0, cfg.camera.distance * Math.sin(phi), cfg.camera.distance * Math.cos(phi));
    camera.lookAt(0, 0, 0);
    return camera;
  }

  function buildArena(scene2, cfg) {
    const { size, wallHeight } = cfg.arena;
    const half = size / 2;

    const floorMat = new THREE.MeshLambertMaterial({ color: cfg.colors.ground });
    shared.floorGeo = new THREE.BoxGeometry(size, 1, size);
    const floor = new THREE.Mesh(shared.floorGeo, floorMat);
    floor.position.y = -0.5;
    scene2.add(floor);

    const grid = new THREE.GridHelper(size, 18, cfg.colors.grid, cfg.colors.grid);
    grid.position.y = 0.02;
    scene2.add(grid);

    // Walls (visual boundary, outside the navigable area).
    const wallMat = new THREE.MeshLambertMaterial({ color: cfg.colors.wall });
    const trimMat = new THREE.MeshLambertMaterial({ color: cfg.colors.wallTrim, emissive: 0x0a3a44 });
    const long = size;
    const thin = 0.6;
    const defs = [
      { w: long, d: thin, x: 0, z: half + thin / 2 },
      { w: long, d: thin, x: 0, z: -half - thin / 2 },
      { w: thin, d: long, x: half + thin / 2, z: 0 },
      { w: thin, d: long, x: -half - thin / 2, z: 0 },
    ];
    for (const d of defs) {
      const geo = new THREE.BoxGeometry(d.w, wallHeight, d.d);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(d.x, wallHeight / 2, d.z);
      scene2.add(wall);
      const trimGeo = new THREE.BoxGeometry(d.w * (d.w >= d.d ? 1 : 0.36) || 0.1, 0.15, d.d * (d.d >= d.w ? 1 : 0.36) || 0.1);
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(d.x, wallHeight + 0.075, d.z);
      scene2.add(trim);
    }
    return { half };
  }

  function update() { /* static world; hook for later phases */ }

  function dispose() {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
  }

  return { renderer: shared.renderer, scene, camera: cam, arena, resize, update, dispose };
}
