// Farol Zero – fixed values. Adjust gameplay numbers here.
// three.js version is pinned for the whole project (see vendor/).
export const THREE_VERSION = '0.186.0';

export const CONFIG = {
  arena: { size: 36, wallHeight: 0.8 },

  player: {
    hp: 100,
    maxHp: 100,
    speed: 6,          // units/s
    radius: 0.8,       // collision circle (XZ plane)
  },

  combat: {
    fireInterval: 0.6,   // s entre disparos do robô
    range: 10,           // alcance do tiro automático
    projectileSpeed: 18, // unidades/s
    projectileDamage: 1,
    projectileLifetime: 1, // expira após 1 s ou 1 alvo
    contactDamage: 10,
    invulnTime: 0.8,     // invulnerabilidade global após dano
  },

  enemies: {
    count: 5,
    speed: 3.2,
    hp: 2,
    radius: 0.7,
    separation: 0.6,     // drones se separam abaixo dessa distância
  },

  resources: {
    startingCrystals: 6, // cristais soltos iniciais (posições fixas no campo)
    maxLoose: 30,        // limite de cristais soltos; acima disso, sem novos drops
    crystalRadius: 0.35,
    collectRadius: 1.3, // distância de coleta automática (centro do cristal)
    dropPerKill: 5, // cristais soltos por drone abatido (salvado)
  },

  beacons: {
    count: 3,
    cost: 8,          // cristais por farol (cobrados 1x, só na conclusão)
    channelTime: 2,  // s contínuo na área do farol com saldo suficiente
    radius: 3,       // área de influência do farol
    spots: [[-15, 2], [15, 2], [0, -13]], // dentro da arena, bem separados
  },

  colors: {
    ground: 0x10233f,
    grid: 0x1d3a63,
    wall: 0x2a4a78,
    wallTrim: 0x37e0ff,
    robot: 0xf2f5f7,
    robotAccent: 0x37e0ff,
    enemy: 0xff6b57,   // coral (drones)
    projectile: 0x37e0ff,
    crystal: 0x37e0ff,
    beaconOff: 0x51637d,
    beaconLit: 0xffd34d,
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
    maxProjectiles: 40,
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
