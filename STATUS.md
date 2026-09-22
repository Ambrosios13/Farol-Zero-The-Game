# STATUS – Farol Zero

**Última fase aprovada: Fase 1 (arena e controle) — pendente de teste real em celular**

## Mudanças (Fase 1)
- three@0.186.0 fixado; cópia estática em `vendor/three.module.js` (sem CDN).
- `server.mjs`: servidor local HTTP simples (porta 3000, LAN, sem internet).
- `index.html`/`style.css`: canvas fullscreen, safe-areas, joystick 128px (mín 48px),
  page nunca rola (`touch-action:none`, overflow hidden).
- `src/config.js`: valores fixos + `computeOrthoBounds()` (framagem puramente matemática).
- `src/world.js`, `src/input.js`, `src/player.js`, `src/main.js`.

## Interfaces relevantes
- `createInput({baseEl, knobEl})` → `{ getVector(): {x,z} (norm., eixo W=-Z), reset() }`
- `createPlayer({scene})` → `{ group, position:Vector3, radius, update(dt, vec) }`
- `createWorld({canvas})` → `{ renderer, scene, camera, arena:{half}, update(dt), dispose() }`
- Camera ortográfica: phi=50°, lookAt origem; W = tamanho*1.2 / aspect em retrato,
  H dominado por `size*margin*sin(phi)` em paisagem. dt sempre clampado a 0.05 s.
- `main.js`: único `requestAnimationFrame`, estado único `state='playing'`
  (menu/paused/won/lost entram na Fase 2; loop único não muda).

## Testes realizados
- `node tests/frame-check.mjs`: 4 cantos + 2 muros projetados em NDC para
  9:16, 1:1, 16:9, 19.5:9 → todos dentro de ±1; margem mín. 0.146. PASS.
- Servidor: 200 para `/`, `src/*` e `vendor/three.module.js`. PASS.
- `node --check`/import de todos os modules: OK (main falha só no DOM — esperado).
- player.js: 1s direita → x=6; clamp no limite 17.2 (18−0.8). PASS.
- `tests/input-test.mjs`: W→(0,−1); W+D normalizado len=1; setas OK;
  pointerdown/move do joystick OK; pointercancel zera; reset limpa. PASS.
- Câmera: phi=50°, lookAt origem, sem rotação manual; enquadramento por NDC
  (tests/frame-check.mjs). dt sempre clampado a 0.05 s.

## Como rodar
`npm start` → `http://localhost:3000` (celular: mesma Wi‑Fi, `http://<ip-do-pc>:3000`).

## Pendências
- Teste real em celular (toque + rotação de tela): PENDENTE (Fase 8).
- 30 FPS no celular de teste: PENDENTE (Fase 8).

## Próxima fase
Fase 2 — ciclo da partida (menu Iniciar, pausa/retomada, cronômetro, HUD
vida/energia, reinício, transição central de estados). Vitória/derrota só por função de depuração.
