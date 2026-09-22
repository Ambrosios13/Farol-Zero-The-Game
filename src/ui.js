// Farol Zero – DOM UI: menu, HUD (vida/energia/cronômetro) e overlay de pausa/resultado.
// Pure formatting helpers are exported for tests; createUI touches the DOM.

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function createUI({
  doc = document,
  win = window,
  onStart,
  onResume,
  onRestart,
  onTogglePause,
}) {
  const menu = doc.getElementById('menu');
  const overlay = doc.getElementById('overlay');
  const overlayTitle = doc.getElementById('overlay-title');
  const btnResume = doc.getElementById('btn-resume');
  const hudHP = doc.getElementById('hud-hp');
  const hudEnergy = doc.getElementById('hud-energy');
  const hudTimer = doc.getElementById('hud-timer');
  const hud = doc.getElementById('hud');
  const btnPause = doc.getElementById('btn-pause');
  const btnStart = doc.getElementById('btn-start');
  const btnRestart = doc.getElementById('btn-restart');

  const lastShown = { hp: null, crystals: null };

  function show(state) {
    menu.classList.toggle('hidden', state !== 'menu');
    hud.classList.toggle('hidden', state === 'menu');
    const isOverlay = state === 'paused' || state === 'won' || state === 'lost';
    overlay.classList.toggle('hidden', !isOverlay);
    overlayTitle.textContent =
      state === 'paused' ? 'Pausado' : state === 'won' ? 'Vitória (debug)' : state === 'lost' ? 'Derrota' : '';
    btnResume.classList.toggle('hidden', state !== 'paused');
  }

  function setHud({ hp, crystals, time }) {
    if (lastShown.hp !== hp) { hudHP.textContent = String(hp); lastShown.hp = hp; }
    if (lastShown.crystals !== crystals) { hudEnergy.textContent = String(crystals); lastShown.crystals = crystals; }
    hudTimer.textContent = formatTime(time);
  }

  btnStart.addEventListener('click', () => { btnStart.blur(); onStart(); });
  btnPause.addEventListener('click', () => { btnPause.blur(); onTogglePause(); });
  btnResume.addEventListener('click', () => { btnResume.blur(); onResume(); });
  btnRestart.addEventListener('click', () => { btnRestart.blur(); onRestart(); });

  function keyDown(e) {
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      onTogglePause();
    }
  }
  win.addEventListener('keydown', keyDown);

  function dispose() {
    win.removeEventListener('keydown', keyDown);
  }

  return { show, setHud, dispose };
}
