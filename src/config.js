// Farol Zero – fixed values. Adjust gameplay numbers here.
// three.js version is pinned for the whole project (see vendor/).
export const THREE_VERSION = '0.186.0';

export const CONFIG = {
  arena: { size: 36, wallHeight: 0.8 },

  player: {
    hp: 100,
    speed: 6,          // units/s
    radius: 0.8,       // collision circle (XZ plane)
  },

  colors: {
    ground: 0x10233f,
    grid: 0x1d3a63,
    wall: 0x2a4a78,
    wallTrim: 0x37e0ff,
    robot: 0xf2f5f7,
    robotAccent: 0x37e0ff,
    light: 0xbfd4ff,
  },

  camera: {
    elevationDeg: 50,   // tilt from horizon (90 = top-down)
    margin: 1.2,        // framing margin around arena
    distance: 80,       // ortho depth (only affects near/far)
  },

  perf: {
    maxPixelRatio: 1.5,
    maxDt: 0.05,        // clamp dt to 0.05 s
  },
};

// Pure framing math shared by world.js (camera) and tests.
// For an orthographic camera tilted by elevation phi, the arena square
// projects to viewW x viewH on screen:
//   viewW = size * margin
//   viewH = size * margin * sin(phi)
export const PROJECTED_HEIGHT = Math.sin((CONFIG.camera.elevationDeg * Math.PI) / 180);

export function computeOrthoBounds(aspect, config = CONFIG) {
  const { size, wallHeight } = config.arena;
  const m = config.camera.margin;
  const viewW = size * m;
  const viewH = (size + wallHeight * 2) * m * PROJECTED_HEIGHT;
  // Fit whole arena, preserving aspect:
  if (aspect * viewH < viewW) return { width: viewW, height: viewW / aspect };
  return { width: viewH * aspect, height: viewH };
}
