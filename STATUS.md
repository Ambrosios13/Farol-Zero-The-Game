# STATUS – Farol Zero

**Última fase aprovada: Fase 3 (combate mínimo) — critérios de máquina verificados; teste real em celular ainda pendente (Fase 8)**

## Mudanças (Fase 3)
- `src/enemies.js` novo: cinco drones fixos (posições fixas, longe do spawn),
  perseguição direta (sem pathfinding), separação par-a-par para não empilhar,
  `damage()`, `sweep()` (remove mortos após a iteração) e `reset()` idempotente.
  Geometria/material compartilhados entre reinícios (não são descartados por drone).
- `src/combat.js` novo: ataque automático no inimigo mais próximo dentro do alcance,
  projéteis (18 u/s, dano 1, expira em 1 s, no máx. 1 alvo cada), dano de contato
  (1 por quadro via `onPlayerHit`), limpo por `reset()`. Limite de 40 projéteis (`config.perf.maxProjectiles`).
- `src/config.js`: `combat` (fireInterval 0,6 / range 10 / speed 18 / damage 1 /
  lifetime 1 / contactDamage 10 / invulnTime 0,8), `enemies` (5 / speed 3,2 / hp 2 /
  radius 0,7 / separation 0,6), `perf.maxProjectiles`, cores `enemy` (coral) e `projectile`.
- `src/main.js`: `damage()` central, `invuln` global de 0,8 s, `restart()` agora
  reseta `player` + `enemies` + `combat` (projéteis/inimigos antigos vão embora). Derrota real
  (hp≤0 → `setState('lost')`, sem botão na UI final).
- `src/ui.js`: título da tela de derrota perde a marca "(debug)" (derrota agora é real);
  vitória segue por `window.farolDebug.win()`.

## Interfaces relevantes
- `createEnemies({scene,config})` → `{ list, update(dt,target), damage(e,dmg), sweep(), reset() }`;
  `list` tem drones `{x,z,hp,radius,alive,group}`.
- `createCombat({scene,config,enemies})` → `{ live, update(dt,{player,onPlayerHit}), reset() }`;
  `onPlayerHit` = null durante invulnerabilidade / hp≤0.
- `main.restart()` idempotente, agora cobre combate.
- Estados: 'menu' | 'playing' | 'paused' | 'won' | 'lost'.

## Testes realizados (Fase 3)
- `node tests/phase3-check.mjs` (16 asserts): 5 drones fixos; perseguição direta;
  separação par-a-par; NENHUM tiro sem alvo no alcance; auto-fogo mata drone de 2 hp
  e remove da cena; 1 projétil = no máx. 1 entidade; projétil expira a 1 s (malha sai da cena);
  projétil não alcança alvo a 25u (18 u/s em 1 s); hp≤0 → nenhum tiro e sem contato;
  contatos sobrepostos → 1 dano por quadro; restart limpa projéteis + inimigos antigos (0 resíduos).
  PASS.
- `node --check` em main/config/enemies/combat: OK. Regressão: `phase2-check.mjs` (ALL PASS),
  `frame-check.mjs`, `input-test.mjs`. Server smoke: 200 para `/` e todos `src/*.js`.
- PENDENTE: teste real em celular/toque (Fase 8) e gameplay humano no navegador (sem browser
  real disponível na sessão) — verificado por teste headless de máquina no Node.

## Como rodar
`npm start` → `http://localhost:3000` (celular: mesma Wi‑Fi, `http://<ip-do-pc>:3000`).

## Pendências
- Teste real em celular (Fase 8): botões/menu/rotação/pausa por troca de app.
- Vitória continua por `window.farolDebug.win()` (Fase 4 traz o objetivo);
  `lose()/kill()` ainda servem para depurar antes da derrota real.

## Próxima fase
Fase 4 — objetivo completo: cristais (6 iniciais), drops/coleta, três faróis com
progresso (8 cristais, 2 s, único), contador e vitória; reinício restaura tudo.