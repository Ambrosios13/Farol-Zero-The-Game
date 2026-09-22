# STATUS – Farol Zero

**Última fase aprovada: Fase 2 (ciclo da partida) — critérios de máquina verificados; teste real em celular ainda pendente (Fase 8)**

## Mudanças (Fase 2)
- `src/ui.js` novo: telas de menu/pausa/resultado por classes no DOM, `formatTime()`,
  `setHud()` com escrita apenas quando muda, teclas Esc/P = pausa.
- `state` agora: menu → playing ⇄ paused; won/lost só via `window.farolDebug.{win,lose,kill}`
  (sem botões na UI final). `setState()` é a transição central: troca + `input.reset()`
  + `ui.show()`. Loop único e dt clamped, como Fase 1.
- HUD: vida, cristais (`hud-energy`), cronômetro `M:SS` (congela fora de playing).
- Botões ≥48px: Iniciar, Pausar (❚❚), Retomar, Reiniciar; menus são overlays (`.screen`).
- Pausa automática: `blur` e `visibilitychange` → paused quando playing;
  retomar só via UI. `restart()` idempotente (valores + `player.reset()`, sem 2º loop
  nem listeners extras) usado para Iniciar, Reiniciar e pós-fim de partida.
- `config.js`: `player.maxHp`, `resources.startingCrystals: 6` (consumo na Fase 4).
- `player.js`: `reset()` devolve grupo a (0,0,4) e rotação zero.

## Interfaces relevantes
- `createUI({onStart,onResume,onRestart,onTogglePause})` → `{ show(state), setHud({hp,crystals,time}), dispose() }`
- `createPlayer({scene})` → agora inclui `reset()` (posição/rotação iniciais).
- Estados: 'menu' | 'playing' | 'paused' | 'won' | 'lost'; só 'playing' avança
  `simTime` e chama `player.update(dt, v)`.
- Debug: `window.farolDebug.win()/lose()/kill()` (vitória/derrota forçadas p/ testar).

## Testes realizados
- `node tests/phase2-check.mjs`: formatTime (0, 59, 60, 125, negativo); 5x restart
  restaura valores e mantém estado único; pausa congela relógio (soma dt só em
  playing). PASS.
- `node --check` em main/ui/player/config: OK. `tests/input-test.mjs` continua PASS.
- Servidor: 200 para `/` e `/src/ui.js`; HTML contém btn-start/btn-pause/btn-restart/
  hud-energy. PASS (servidor local em uso na porta 3000 durante o teste).
- PENDENTE: teste real em celular (toque nos botões, rotação, troca de app) — Fase 8.

## Como rodar
`npm start` → `http://localhost:3000` (celular: mesma Wi‑Fi, `http://<ip-do-pc>:3000`).

## Pendências
- Teste real em celular (Fase 8) de botões/menu/rotação/pausa por troca de app.
- won/lost: tela de resultado já existe ("Vitória/Derrota (debug)"), mas só debug ancora.

## Próxima fase
Fase 3 — combate mínimo: cinco drones fixos perseguidores, ataque automático
(0,6 s, alcance 10), projéteis (v=18, dano 1, vida drone 2, expiram 1 s e 1 alvo),
dano por contato (10) com invulnerabilidade 0,8 s, remoção de mortos, derrota real.
