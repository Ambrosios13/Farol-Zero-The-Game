# STATUS – Farol Zero

**Última fase aprovada: Fase 4 (objetivo completo) — critérios de máquina verificados; teste real em celular ainda pendente (Fase 8)**

## Mudanças (Fase 4)
- `src/objectives.js` novo: cristais soltos (6 iniciais em pontos fixos longe do spawn,
  limite de 30 soltos no campo, coleta automática por proximidade em 1,3 u —
  centro do cristal, sem custo de movimento), drop ao matar (5 cristais espalhados
  na posição real do impacto) e três faróis: ficar 2 s contínuos na área (raio 3 u)
  com saldo ≥ 8 aciona; sair cancela e zera o progresso; o custo de 8 é cobrado 1x,
  só na conclusão; o 3º farol acendido dispara a vitória (apenas 1 vez, e só de
  `playing`). Áreas sobrepostas: apenas 1 farol recebe progresso por vez.
- `src/config.js`: `resources` (startingCrystals 6, maxLoose 30, crystalRadius 0,35,
  collectRadius 1,3, dropPerKill 5), `beacons` (count 3, cost 8, channelTime 2,
  radius 3, spots [-15,2] [15,2] [0,-13] — dentro da arena, todos a >10u entre si,
  nenhum cristal inicial cai num raio de farol), cores `crystal`/`beaconOff`/`beaconLit`.
- `src/enemies.js`: hook `onKill(x, z)` acionado no frame da morte (posição real do
  impacto, antes de sweep/reset) → `main.js` o liga a `objectives.dropCrystal`.
- `src/main.js`: saldo `crystals` volta a 0 no `restart()` (idempotente) porque os 6
  iniciais voltam como cristais soltos via `objectives.reset()`; `bank` {get,add,spend}
  é dono do saldo e é passado a `objectives.update`; derrota só de `playing`→`lost`.
- `src/ui.js` + `index.html` + `style.css`: HUD com contador de faróis (●/○ ×3,
  atualiza somente quando muda); título de vitória sem "(debug)" (vitoria agora é real).

## Interfaces relevantes
- `createObjectives({scene,config})` → `{ update(dt,pos,bank,winCb), dropCrystal(x,z),
  looseCount, litCount, progressOf(x,z), reset() }`.
- `createEnemies({scene,config,onKill})`: `onKill(x,z)` no frame da morte.
- `main.restart()` idempotente cobre player/enemies/combat/**objectives**;
  estados: 'menu' | 'playing' | 'paused' | 'won' | 'lost'.

## Testes realizados (Fase 4)
- `node tests/phase4-check.mjs` (26 asserts): 6 cristais soltos no início / 0 acendidos /
  sem vitória; spots dentro da arena e fora dos raios de coleta iniciais; coleta por
  proximidade andando; saldo insuficiente (custo−1) nunca progride; saldo == custo
  acumula (1/60 s em 1 quadro); sair cancela; canal completo de 2 s acende;
  custo cobrado exatamente 1x; farol aceso nunca recobra; áreas sobrepostas →
  exatamente 1 progredindo (o mais próximo); o 3º dispara vitória exatamente 1 vez;
  drop no impacto (5 cristais, dispersão ~1,95 u, no ponto real e não no respawn);
  teto de 30 soltos; end-to-end real (`enemies.damage`): 5 drones mortos → 31/31
  cristais coletados → ficar nos 3 faróis → vitória, gasto total = 3×custo;
  `reset()` restaura 6 soltos / 0 acesos; restart completo: 6 soltos / 5 drones /
  0 projéteis / 0 acesos. PASS.
- `node --check` em todos os `src/*.js` + teste: OK. Regressão: `phase3-check.mjs`,
  `phase2-check.mjs` (ALL PASS), `frame-check.mjs`. Server smoke: 200 para `/` e
  `src/{main,objectives,ui}.js`, `style.css`, `vendor/three.module.js`.

## Como rodar
`npm start` → `http://localhost:3000` (celular: mesma Wi‑Fi, `http://<ip-do-pc>:3000`).

## Pendências
- Teste real em celular (Fase 8): botões/menu/rotação/pausa por troca de app.
- `window.farolDebug.win()/lose()/kill()` continuam por depuração (derrota já é real).

## Próxima fase
Fase 5 — pressão contínua (novas ondas/escalonamento de inimigos e balanceamento).
