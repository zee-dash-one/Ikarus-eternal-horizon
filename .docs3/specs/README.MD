# Ikarus Eternal Horizon — Índice Mestre de SDD

> **Revision 2026-10-02:** [todo-codex.md](../todo-codex.md) is the active backlog. D47–D50 and [run-flow.spec.MD](../plans/run-flow.spec.MD) supersede conflicting historical cards. AUTH-03/04, SCENE-01/03/04, RNK and persistence cards must be reconciled before implementation; FLOW-01–09 cards are pending. Existing test/card presence is not proof of revised behavior.


> Gerado a partir de `planning.spec.MD` (hub), `decisions.spec.MD`, `todo.md` e dos arquivos de tema em `plans/` (`char-sheet`, `equipment`, `crafting`, `drops`, `enemy`, `squad`, `input`, `scenes`, `world`, `weapons`, `meteors`, `hud`, `nomenclature`, `achievements`, `rankings`, `builds`, `store`, `architecture`, `balance`, `coverage`, `dev-tools`, `login`).
> Objetivo deste documento: **não reescrever nada** do que vocês já têm (está bem maduro), e sim **acoplar o SDD por cima** — 1 spec de teste por Requirement ID, rastreável até o Theme do `todo.md`.

---

## 1. Diagnóstico rápido

O hub já tem quase tudo que um processo SDD sério precisa:

| Peça do SDD | Onde já existe |
| --- | --- |
| IDs de requisito estáveis, com prioridade e critério de aceite | Tabelas `Requirements` em cada spec (`CHAR-`, `AUTH-`, `EQP-`, `RES-`, `ENEMY-`, `SQUAD-`, `CTRL-`, `SCENE-`, `CAM-`, `WPN-`, `MET-`, `HUD-`, `ACH-`, `RNK-`, `BLD-`, `STR-`, `ARCH-`, `RUL-02`, `RUL-12`) |
| Decisões travadas (evita re-litigar arquitetura) | `decisions.spec.MD` (`D01`–`D46`) |
| Vocabulário único (evita ambiguidade nos testes) | `nomenclature.spec.MD` |
| Backlog ordenado em fatias verticais | `todo.md` (Theme 0 → 14) com regra de DoD: *spec (quando existir) → teste falhando primeiro → `npm run verify` verde* |
| Matriz de cobertura (nada é esquecido silenciosamente) | `coverage.spec.MD` |

**O que falta** é a camada de execução do SDD: um arquivo de spec/teste **por Requirement ID**, um lugar físico pra eles (`.docs3/specs/` — ver **§2 Folder Structure**), e uma ordem de ataque que respeite as dependências entre Themes. A **§4** é a matriz de rastreabilidade; a **§3** é o workflow; a **§5** é a ordem de execução.

---

## 2. Folder Structure

Árvore alvo de `.docs3/specs/`. Cada pasta espelha o **prefixo do Requirement ID** e aponta para o `.spec.MD` de design em `plans/`.

**Convenção de nome:** `<REQUIREMENT-ID>.spec.ts` (kebab só quando reuso explícito, ex.: `CHAR-06-combat.spec.ts`).

| Símbolo | Significado |
| --- | --- |
| **canvas** | Cena no WebGL compartilhado (`D23`) |
| **DOM** | Painel HTML/CSS + JS Bridge (`D34` / `D41` / `D42`) |
| **[defer]** | ID existe no design; teste só quando o Theme abrir |
| **[blocked]** | Sem corpo de spec de design — **não criar** arquivo ainda |

**Render split (`D23`):** canvas = **Start · Title · Run · Pause** · DOM = **Login · Store · Result · Rankings · `/dev/*` CRUD** (DEV-only).

```text
.docs3/specs/
├── README.MD                          # este índice (derivado — não é fonte de verdade)
├── _templete-spec.spec.MD             # copy per ID — do not edit in-place (see §3.1)
│
├── arch/                              # plans/architecture.spec.MD
│   ├── ARCH-01.spec.ts                 # Theme 0  · stack Vite+TS+Three+Vitest
│   ├── ARCH-02.spec.ts                 # Theme 0  · demo-host/ isolado
│   ├── ARCH-03.spec.ts                 # Theme 13 · Caddy TLS → Node
│   ├── ARCH-05.spec.ts                 # Theme 0b · Google OAuth real (Demo)
│   ├── ARCH-06.spec.ts                 # Theme 13 · deploy manual (rsync)
│   ├── ARCH-07.spec.ts                 # Theme 13 · [defer] GitHub Action deploy
│   ├── ARCH-08.spec.ts                 # Theme 0  · Dexie sem localStorage SoT
│   ├── ARCH-09.spec.ts                 # Theme 13 · Tauri plugin-fs + Cloud (Steam)
│   ├── ARCH-10.spec.ts                 # Theme 13 · Poki SDK cloud save
│   ├── ARCH-11.spec.ts                 # Theme 13 · validação schema/ranking DemoHost
│   ├── ARCH-12.spec.ts                 # Theme 13 · fallback quota Dexie
│   ├── ARCH-13.spec.ts                 # Theme 13 · persist debounced (~3s)
│   ├── ARCH-14.spec.ts                 # Theme 13 · CSRF/Origin guard
│   ├── ARCH-15.spec.ts                 # Theme 13 · [defer] Litestream backup
│   ├── ARCH-16.spec.ts                 # Theme 0  · Core sem Three/DOM (Golden Rule)
│   ├── ARCH-17.spec.ts                 # Theme 0  · fixed-tick Sim vs rAF View (D40)
│   ├── ARCH-18.spec.ts                 # Theme 0  · Command → Event/Snapshot unidirecional
│   ├── ARCH-19.spec.ts                 # Theme 0  · testes de Sim sem WebGL/jsdom
│   └── ARCH-20.spec.ts                 # Theme 0  · npm run verify falha com three em core/
│
├── auth/                              # plans/login.spec.MD
│   ├── AUTH-01.spec.ts                 # Theme 0b · Login HTML + JS Bridge (DOM)
│   └── …
│
├── dev/                               # plans/dev-tools.spec.MD
│   ├── DEV-01.spec.ts                  # Theme 0d · four /dev/* routes (equips unified)
│   ├── DEV-02.spec.ts                  # Theme 0d · DevCrudBridge ↔ DevContentManager
│   ├── DEV-03.spec.ts                  # Theme 0d · CRUD ops all entity types
│   ├── DEV-04.spec.ts                  # Theme 0d · Dexie dev store (not profile)
│   ├── DEV-05.spec.ts                  # Theme 0d · PROD excludes /dev (BLD-05)
│   ├── DEV-06.spec.ts                  # Theme 0d · exportAll → content JSON
│   └── DEV-07.spec.ts                  # Theme 0d · equipType required on /dev/equips
│
├── scenes/                            # plans/scenes.spec.MD
│   ├── SCENE-01.spec.ts                # Theme 0b · fluxo Login → Start (DOM gate; ver auth/)
│   ├── SCENE-02.spec.ts                # Theme 0c · Start — welcome_screen_ready 1x (canvas)
│   ├── SCENE-04.spec.ts                # Theme 10 · Title→Run no canvas (handoff Result DOM)
│   └── SCENE-05.spec.ts                # Theme 4b · Pause — freeze + 4 abas + Dev-only (canvas)
│
├── run-meta/                          # plans/scenes.spec.MD (Result · D42)
│   └── SCENE-04-result.spec.ts         # Theme 10 · #result-root pós-DEAD (DOM)
│
├── input/                             # plans/input.spec.MD
│   ├── CTRL-01.spec.ts                 # Theme 1  · pad virtual + 4 schemes exclusivos
│   ├── CTRL-02.spec.ts                 # Theme 1  · pause bindings + persist (Start only)
│   ├── CTRL-03.spec.ts                 # Theme 4b · Pause Controls remap + DOM nav
│   └── CTRL-04.spec.ts                 # Theme 1  · touch overlay layout / z-index
│
├── balance/                           # plans/balance.spec.MD
│   └── RUL-12.spec.ts                  # Theme 1  · BALANCE único (Core + canvas View)
│
├── char/                              # plans/char-sheet.spec.MD
│   ├── CHAR-01.spec.ts                 # Theme 3  · 54 slots (12+21+21)
│   ├── CHAR-02.spec.ts                 # Theme 3  · Full Sheet families (D09/D10)
│   ├── CHAR-03.spec.ts                 # Theme 3  · Summary Sheet única fonte em runtime
│   ├── CHAR-04.spec.ts                 # Theme 3  · LIGHT→…→DRIFTING→DEAD (D06)
│   ├── CHAR-05.spec.ts                 # Theme 3  · gatilhos de recalc
│   ├── CHAR-06.spec.ts                 # Theme 3  · hit path MIT→SHD→INT (D24)
│   └── CHAR-06-combat.spec.ts          # Theme 5  · reuso: DamageManager caminho único
│
├── equipment/                         # plans/equipment.spec.MD
│   ├── EQP-01.spec.ts                  # Theme 12 · só *_mod/*_mul registrados
│   ├── EQP-02.spec.ts                  # Theme 4 & 12 · grants contextuais (when: dashing)
│   └── EQP-03.spec.ts                  # Theme 12 · lab_craft_time_* no craft start
│
├── crafting/                          # plans/crafting.spec.MD
│   ├── EQP-04.spec.ts                  # Theme 12 · CraftSlot exclusivo
│   ├── EQP-05.spec.ts                  # Theme 12 · catálogo de receitas jogável
│   ├── EQP-06.spec.ts                  # Theme 12 · [defer] política de cancelamento
│   └── RES-05.spec.ts                  # Theme 7  · caps de inventário por recurso
│
├── drops/                             # plans/drops.spec.MD
│   ├── RES-01.spec.ts                  # Theme 7  · fragmentos nascem na destruição
│   ├── RES-02.spec.ts                  # Theme 7  · ímã + feedback SFX/UI
│   ├── RES-03.spec.ts                  # Theme 7  · pool de fragmentos limitado
│   ├── RES-04.spec.ts                  # Theme 7  · tabela completa 5 categorias
│   └── RES-06.spec.ts                  # Theme 12 · [defer] equipamento como item épico
│
├── enemy/                             # plans/enemy.spec.MD
│   ├── ENEMY-01.spec.ts                # Theme 8  · Enemy Base (Id/Strategy/Ticks)
│   ├── ENEMY-02.spec.ts                # Theme 8  · SM 5 estados; Flee reingressa
│   └── ENEMY-03.spec.ts                # Theme 8  · Tanker/Warrior/Rogue (+Special)
│
├── squad/                             # plans/squad.spec.MD
│   ├── SQUAD-01.spec.ts                # Theme 9  · squad sheet 1–8 + roles
│   ├── SQUAD-02.spec.ts                # Theme 9  · SM 5 estados; Break→OnBreakGroup
│   ├── SQUAD-03.spec.ts                # Theme 9  · 6 formações + receitas de classe
│   └── SQUAD-04.spec.ts                # Theme 9  · Break/PatrolGrouping triggers
│
├── rankings/                          # plans/rankings.spec.MD
│   ├── RNK-01.spec.ts                  # Theme 10 · local best sobrevive reload
│   ├── RNK-02.spec.ts                  # Theme 10 · janelas UTC W/M/Y no cliente
│   ├── RNK-04.spec.ts                  # Theme 10 · #rankings-root — 2 modos × 4 períodos (DOM)
│   ├── RNK-03.spec.ts                  # Theme 14 · [defer] Survivor mode
│   ├── RNK-05.spec.ts                  # Theme 14 · modos nunca se misturam
│   ├── RNK-06.spec.ts                  # Theme 14 · [defer] SteamRankingAdapter
│   ├── RNK-07.spec.ts                  # Theme 14 · [defer] fila offline + sync
│   ├── RNK-08.spec.ts                  # Theme 14 · [defer] Global/Friends/Around (Steam)
│   ├── RNK-09.spec.ts                  # Theme 14 · [defer] título/badge cosmético
│   ├── RNK-10.spec.ts                  # Theme 14 · ItchRankingAdapter
│   ├── RNK-11.spec.ts                  # Theme 14 · PokiRankingAdapter
│   └── RNK-12.spec.ts                  # Theme 14 · 1 adapter por IKARUS_PLATFORM
│
├── achievements/                      # plans/achievements.spec.MD
│   ├── ACH-01.spec.ts                  # Theme 14 · catálogo congelado (apiName)
│   ├── ACH-02.spec.ts                  # Theme 14 · AchievementManager tracker
│   ├── ACH-03.spec.ts                  # Theme 14 · LocalAchievementAdapter sempre ativo
│   ├── ACH-04.spec.ts                  # Theme 14 · ItchAchievementAdapter
│   ├── ACH-05.spec.ts                  # Theme 14 · PokiAchievementAdapter
│   ├── ACH-06.spec.ts                  # Theme 14 · [defer] SteamAchievementAdapter
│   ├── ACH-07.spec.ts                  # Theme 14 · boot: 1 adapter; Local espelha
│   ├── ACH-08.spec.ts                  # Theme 14 · [defer] ícones locked/unlocked
│   └── ACH-09.spec.ts                  # Theme 14 · [defer] strings EN+PT
│
├── store/                             # plans/store.spec.MD
│   ├── STR-01.spec.ts                  # Theme 14 · catálogo estático BALANCE.store
│   ├── STR-02.spec.ts                  # Theme 14 · checagem multi-moeda atômica
│   ├── STR-03.spec.ts                  # Theme 14 · sem duplicar unlock permanente
│   ├── STR-04.spec.ts                  # Theme 14 · gate de capacidade (consumíveis)
│   ├── STR-05.spec.ts                  # Theme 14 · [defer] descontos/cupons
│   ├── STR-06.spec.ts                  # Theme 14 · só via JS Bridge (DOM · sem WS)
│   ├── STR-07.spec.ts                  # Theme 14 · streak semanal → BUD
│   ├── STR-08.spec.ts                  # Theme 14 · 1 claim por dia UTC
│   ├── STR-09.spec.ts                  # Theme 14 · UI ladder do streak (DOM)
│   ├── STR-10.spec.ts                  # Theme 14 · 1 StorePlatformAdapter por build
│   ├── STR-11.spec.ts                  # Theme 14 · watchAdForBud (Poki, opcional)
│   ├── STR-12.spec.ts                  # Theme 14 · overlay Steam pausa CSS da store
│   ├── STR-13.spec.ts                  # Theme 14 · Demo persiste via DemoHost /api
│   ├── STR-14.spec.ts                  # Theme 14 · Itch persiste via Dexie
│   ├── STR-15.spec.ts                  # Theme 14 · Poki persiste via SDK cloud save
│   └── STR-16.spec.ts                  # Theme 14 · Steam persiste via Tauri FS + Cloud
│
├── builds/                            # plans/builds.spec.MD
│   ├── BLD-01.spec.ts                  # Theme 13 · 4 saídas de um core
│   ├── BLD-02.spec.ts                  # Theme 13 · IKARUS_PLATFORM seleciona 1 kit
│   ├── BLD-03.spec.ts                  # Theme 13 · web builds sem Steam SDK
│   ├── BLD-04.spec.ts                  # Theme 14 · boot: Auth+ACH+RNK+Store do mesmo kit
│   ├── BLD-05.spec.ts                  # Theme 13 · prod sem Dev rail/debug camera
│   ├── BLD-06.spec.ts                  # Theme 13 · assets relativos sob HTTPS (Demo)
│   ├── BLD-07.spec.ts                  # Theme 14 · [defer] upload automatizado Steam
│   ├── BLD-08.spec.ts                  # Theme 13 · kit Demo usa adapters DemoHost
│   ├── BLD-09.spec.ts                  # Theme 13 · Itch usa Dexie
│   ├── BLD-10.spec.ts                  # Theme 13 · Poki usa SDK cloud save
│   └── BLD-11.spec.ts                  # Theme 13 · Steam usa Tauri plugin-fs + Cloud
│
├── world/                             # plans/world.spec.MD
│   ├── CAM-01.spec.ts                  # Theme 2  · landscape 16:9 + letterbox (canvas)
│   ├── CAM-02.spec.ts                  # Theme 2  · perspective rig
│   ├── CAM-03.spec.ts                  # Theme 2  · follow / dead-zone / bounce / recenter
│   ├── CAM-04.spec.ts                  # Theme 2  · 3 parallax layers
│   ├── CAM-05.spec.ts                  # Theme 2  · DEV gizmos
│   ├── CAM-06.spec.ts                  # Theme 2  · Free Cam unlock (Run + Pause)
│   └── RUL-02.spec.ts                  # Theme 2  · bounds + off-field despawn
│
├── weapons/                           # plans/weapons.spec.MD
│   ├── WPN-01.spec.ts                  # Theme 5  · Laser pooled + S_R/S_D
│   ├── WPN-02.spec.ts                  # Theme 5  · PlayerShot → DamageManager
│   ├── WPN-03.spec.ts                  # Theme 11 · switch Secondary
│   ├── WPN-04.spec.ts                  # Theme 11 · Laser/Plasma/Beam/Mjolnir
│   ├── WPN-05.spec.ts                  # Theme 5  · energy gate (Theme 11: custos distintos)
│   ├── WPN-06.spec.ts                  # Theme 11 · Pulse Nova · Swarm · Star Killer
│   ├── WPN-07.spec.ts                  # Theme 12 · [should] catalog row via equip
│   └── WPN-08.spec.ts                  # Theme 12 · [defer] Weaponry skills
│
├── meteors/                           # plans/meteors.spec.MD
│   ├── MET-01.spec.ts                  # Theme 6  · pool S/M/L layer Meteor
│   ├── MET-02.spec.ts                  # Theme 6  · spawn/drift/despawn + RUL-02
│   ├── MET-03.spec.ts                  # Theme 6  · shot + contact via DamageManager
│   ├── MET-04.spec.ts                  # Theme 6  · [should] split on L
│   └── MET-05.spec.ts                  # Theme 13 · [should] pooled VFX
│
├── hud/                               # plans/hud.spec.MD
│   ├── HUD-01.spec.ts                  # Theme 10 · Integrity/Shield/Energy (canvas)
│   ├── HUD-02.spec.ts                  # Theme 10 · border score/kills/high
│   ├── HUD-03.spec.ts                  # Theme 10 · [should] weapon/ordnance/radio
│   └── HUD-04.spec.ts                  # Theme 10 · View-only + projector
│
└── lore/                              # [blocked] — LORE-* Deferred até Theme 14
    └── (não criar até Theme 14 se aproximar)
```

**Pastas por Theme (atalho):**

| Theme | Pastas / arquivos prioritários |
| --- | --- |
| **0** | `arch/ARCH-01` … `ARCH-20` (exceto defer) |
| **0b** | `auth/` · `scenes/SCENE-01` · `arch/ARCH-05` |
| **0d** | `dev/DEV-01` … `DEV-06` · [`dev-tools.spec.MD`](../plans/dev-tools.spec.MD) |
| **0c** | `scenes/SCENE-02` |
| **1** | `input/CTRL-01` |
| **2** | `world/CAM-01` … `CAM-06` · `world/RUL-02` |
| **3** | `char/CHAR-01` … `CHAR-06` |
| **4b** | `scenes/SCENE-05` |
| **5** | `weapons/WPN-01` · `WPN-02` · `WPN-05` · `char/CHAR-06-combat` |
| **6** | `meteors/MET-01` … `MET-04` |
| **7–9** | `drops/` · `enemy/` · `squad/` |
| **10** | `scenes/SCENE-04` · `run-meta/SCENE-04-result` · `rankings/RNK-01` · `RNK-02` · `RNK-04` · `hud/HUD-01` … `HUD-04` |
| **11** | `weapons/WPN-03` … `WPN-06` |
| **12–14** | `equipment/` · `crafting/` · `store/` · `rankings/` · `achievements/` · `builds/` |

---

## 3. Workflow SDD por Requirement ID

Cada linha da matriz da **§4** vira **um arquivo de spec de teste**, não um novo documento de design (o design já está feito nos `*.spec.MD` em `plans/`). Caminho físico: **§2 Folder Structure**.

**Como criar um arquivo:** copiar [`_templete-spec.spec.MD`](./_templete-spec.spec.MD) → renomear para `<domain>/<REQUIREMENT-ID>.spec.ts` → preencher o cabeçalho e o `describe` → deixar vermelho até a implementação.

Regra de ouro (já está no `todo.md`, só reforçando): **o teste nasce vermelho antes do código de produção**. Se o Requirement ID ainda não tem spec de teste, ele não pode ser marcado `[x]` no `todo.md`, mesmo que "pareça" funcionar.

Cada spec de teste deve citar, em comentário de topo, **de qual `.spec.MD` e qual ID** ele deriva — isso é o link de rastreabilidade que substitui uma ferramenta de ALM.

### 3.1 Spec file template (`_templete-spec.spec.MD`)

Canonical template (English — hub `D05`). Source file: [`.docs3/specs/_templete-spec.spec.MD`](./_templete-spec.spec.MD).

```typescript
/**
 * SPEC TEMPLATE — copy this file; do not edit it in place.
 *
 * Naming: .docs3/specs/<domain>/<REQUIREMENT-ID>.spec.ts
 *   e.g. .docs3/specs/char/CHAR-04.spec.ts
 *
 * Rule (todo.md DoD): this file must exist and be RED before any
 * production code for <REQUIREMENT-ID> is written. Do not check the
 * box in todo.md until this file is green under `npm run verify`.
 *
 * -----------------------------------------------------------------
 * Source     : plans/<file>.spec.MD → <REQUIREMENT-ID>
 * Decision(s): D0X (if applicable — see decisions.spec.MD)
 * Tags       : tag_g_<domain> tag_s_<domain>_<topic>
 * Priority   : must | should | defer   (copy from Requirements table)
 * Theme      : Theme N — <theme name from todo.md>
 * Render     : canvas | DOM   (if SCENE-/AUTH-/STR-/RNK- UI — see D23/D34/D41/D42)
 * -----------------------------------------------------------------
 *
 * Acceptance (paste verbatim from the `Requirements` table in the design
 * .spec.MD — do not paraphrase; if design changes, update this comment):
 *
 *   "<paste exact Acceptance column text here>"
 *
 * Golden Rule reminder (D07/D40): if this requirement touches the frame
 * loop, tests below must prove only Summary Sheet / Commands/Events are
 * read — never Full Sheet, never DOM/Three inside core/ or systems/.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// import { /* system under test */ } from '../../../poc3/src/...';

describe('<REQUIREMENT-ID> — <short requirement title>', () => {
  beforeEach(() => {
    // arrange: minimal deterministic state (no spurious alloc,
    // no unseeded RNG — combat/loot rolls must be seedable)
  });

  it('<behavior 1 — happy path, straight from Acceptance>', () => {
    // given: ...
    // when: ...
    // then: ...
    expect(true).toBe(false); // placeholder — forces red until implemented
  });

  it.todo('<behavior 2 — edge case from Rule/Detail table>');

  it.todo('<behavior 3 — negative rule: what must NOT happen>');

  // If the requirement relates to D07 (Summary-only) or D24 (precomputed MIT),
  // include an explicit guard test, for example:
  //
  // it('never reads Full Sheet fields on the hot path', () => {
  //   const spy = vi.spyOn(fullSheet, 'get');
  //   system.update(dt);
  //   expect(spy).not.toHaveBeenCalled();
  // });
});

/**
 * Checklist before marking [x] in todo.md for this ID:
 * [ ] All `it.todo` above are real `it` blocks and pass
 * [ ] `npm run verify` (typecheck + lint + test) is green
 * [ ] No forbidden imports in core/ (ARCH-16/ARCH-20)
 * [ ] Acceptance pasted at top matches current .spec.MD (not a stale version)
 * [ ] Grep tags on the design section exist in matrix.json (D25/D26)
 */
```

**Worked example** (from [`char-sheet.spec.MD`](../plans/char-sheet.spec.MD) · `CHAR-04` · `D06`):

```typescript
// .docs3/specs/char/CHAR-04.spec.ts
// Source: plans/char-sheet.spec.MD → CHAR-04
// Decision: D06 (DRIFTING → DEAD)

describe('CHAR-04 — Integrity ladder', () => {
  it('enters DRIFTING when integrity_cur reaches 0', () => {
    // given: craft with integrity_max = 100, integrity_cur = 0
    // when: state is recalculated
    // then: state === 'DRIFTING' (not DEAD yet)
  });

  it('DRIFTING + next damage = DEAD', () => {
    // given: craft in DRIFTING
    // when: any damage > 0 is applied
    // then: state === 'DEAD'
  });
});
```

---

## 4. Matriz de rastreabilidade (Theme → Requirement → Spec fonte)

Convenção de colunas: **Theme** = fatia vertical do `todo.md` · **Prio** = must/should/defer · **Fonte** = arquivo `.spec.MD` que é a autoridade de design · **Arquivo de teste sugerido**.

### Theme 0 — Scaffold / Golden Rule

| ID | Prio | Fonte | Aceite (resumo) | Teste sugerido |
| --- | --- | --- | --- | --- |
| `ARCH-01` | must | architecture | Stack Vite+TS+Three+Vitest em `poc3/` | `arch/ARCH-01.spec.ts` |
| `ARCH-02` | must | architecture | `demo-host/` não importado por itch/poki/steam | `arch/ARCH-02.spec.ts` |
| `ARCH-08` | must | architecture | Dexie sem `localStorage` como SoT | `arch/ARCH-08.spec.ts` |
| `ARCH-16` | must | architecture | Core sem imports Three/DOM (ESLint) | `arch/ARCH-16.spec.ts` |
| `ARCH-17` | must | architecture | Sim fixo 60Hz desacoplado do rAF View (`D40`) | `arch/ARCH-17.spec.ts` |
| `ARCH-18` | must | architecture | Fluxo unidirecional Command → Event/Snapshot | `arch/ARCH-18.spec.ts` |
| `ARCH-19` | should | architecture | Testes de Sim rodam sem WebGL/jsdom | `arch/ARCH-19.spec.ts` |
| `ARCH-20` | must | architecture | `npm run verify` falha se `three` aparece em `core/` | `arch/ARCH-20.spec.ts` |

### Theme 0b — Login

[`login.spec.MD`](../plans/login.spec.MD) · `AUTH-*` · `SCENE-01`

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `AUTH-01` | must | auth | Login HTML/CSS + JS Bridge (espelha Store) | `auth/AUTH-01.spec.ts` |
| `SCENE-01` | must | scenes | Sessão válida pula Login; mock sempre sucede | `scenes/SCENE-01.spec.ts` |
| `ARCH-05` | must | architecture | Google OAuth real seta cookie; `/api/me` retorna sessão | `arch/ARCH-05.spec.ts` |

### Theme 0d — Dev content CRUD

[`dev-tools.spec.MD`](../plans/dev-tools.spec.MD) · `DEV-*`

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `DEV-01` | must | dev-tools | Quatro rotas `/dev/*` só em DEV (`/dev/equips` unificado) | `dev/DEV-01.spec.ts` |
| `DEV-02` | must | dev-tools | HTML + DevCrudBridge ↔ DevContentManager | `dev/DEV-02.spec.ts` |
| `DEV-03` | must | dev-tools | Filter/list/create/edit/delete por entidade | `dev/DEV-03.spec.ts` |
| `DEV-04` | must | dev-tools | Dexie dev store separado do profile | `dev/DEV-04.spec.ts` |
| `DEV-05` | must | dev-tools | PROD sem `/dev` (`BLD-05`) | `dev/DEV-05.spec.ts` |
| `DEV-07` | must | dev-tools | `/dev/equips` exige `equipType` (`generic` + 12 Special) | `dev/DEV-07.spec.ts` |

### Theme 0c — Start

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `SCENE-02` | must | scenes | `welcome_screen_ready` dispara 1x no critical ready | `scenes/SCENE-02.spec.ts` |

### Theme 1 — Engine core / Input

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `CTRL-01` | must | input | 4 esquemas exclusivos; zero import de hardware em `PlayerManager`/`FiringManager` | `input/CTRL-01.spec.ts` |
| `CTRL-02` | must | input | Pause só via `Start` mapeado; bindings persistidos; sem Esc/Start hardcoded | `input/CTRL-02.spec.ts` |
| `CTRL-03` | must | input | Pause Controls remap + listen guard + navegação Exit no DOM | `input/CTRL-03.spec.ts` |
| `CTRL-04` | must | input | Touch overlay acima do HUD; pause top-right; nipplejs isolado | `input/CTRL-04.spec.ts` |
| `RUL-12` | must | balance | Core e canvas View leem valores authored só de `BALANCE`; `render/` sem literais de apresentação | `balance/RUL-12.spec.ts` |

### Theme 2 — World presentation

[`world.spec.MD`](../plans/world.spec.MD) · `CAM-*` · `RUL-02` · `D44`

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `CAM-01` | must | world | Landscape 16:9 + letterbox; paths relativos | `world/CAM-01.spec.ts` |
| `CAM-02` | must | world | Perspective: topo / lado / thrusters | `world/CAM-02.spec.ts` |
| `CAM-03` | must | world | Follow box: dead-zone, bounce, recenter | `world/CAM-03.spec.ts` |
| `CAM-04` | must | world | 3 camadas de parallax, velocidades distintas | `world/CAM-04.spec.ts` |
| `CAM-05` | should | world | Gizmos DEV; ausentes em PROD | `world/CAM-05.spec.ts` |
| `CAM-06` | must | world | Free Cam destrava o follow box no Run **e** no Pause | `world/CAM-06.spec.ts` |
| `RUL-02` | must | world | Bounds + despawn off-field (pool recycle) | `world/RUL-02.spec.ts` |

### Theme 3 — CHAR sheet

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `CHAR-01` | must | char-sheet | 54 slots sempre presentes | `char/CHAR-01.spec.ts` |
| `CHAR-02` | must | char-sheet | Full Sheet families com `D09`/`D10` | `char/CHAR-02.spec.ts` |
| `CHAR-03` | must | char-sheet | Só Summary Sheet lido em runtime; `MIT` pré-computado; `integrityState` publicado | `char/CHAR-03.spec.ts` |
| `CHAR-04` | must | char-sheet | LIGHT→MEDIUM→SEVERE→DRIFTING→DEAD | `char/CHAR-04.spec.ts` |
| `CHAR-05` | must | char-sheet | Gatilhos de recalc corretos (equip=Full; effect=Summary; LVL=parcial) | `char/CHAR-05.spec.ts` |
| `CHAR-06` | must | char-sheet | Hit path usa `MIT`→SHD→INT; colisão `D13`/`D14` | `char/CHAR-06.spec.ts` |

### Theme 4 — Player craft & control

Depende de `CHAR-03` (Summary) e `CTRL-01` (pad). Sem novos IDs formais além de `EQP-02` (contextual `when: dashing`), que pertence ao Theme 12 mas é tocado aqui de leve — recomendo testar `EQP-02` já no Theme 4 se o Dash Special entrar cedo.

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `EQP-02` (parcial) | must | equipment | Dash ativa `deflection_mod` só durante o dash; reverte ao fim | `equipment/EQP-02.spec.ts` |

### Theme 4b — Pause

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `SCENE-05` | must | scenes | Pausa congela `dt`; 4 abas na right rail; Dev só em DEV | `scenes/SCENE-05.spec.ts` |

### Theme 5 — Combat loop

[`weapons.spec.MD`](../plans/weapons.spec.MD) · `CHAR-06` como contrato de dano.

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `WPN-01` | must | weapons | Laser pooled; cadence `S_R`; damage `S_D` | `weapons/WPN-01.spec.ts` |
| `WPN-02` | must | weapons | `PlayerShot` × hostile → só `DamageManager` | `weapons/WPN-02.spec.ts` |
| `WPN-05` | must | weapons | `ENE` 0 bloqueia tiro; Laser drena | `weapons/WPN-05.spec.ts` |
| `CHAR-06` (reuso) | must | char-sheet | `DamageManager` é o único caminho de `applyDamage` | `char/CHAR-06-combat.spec.ts` |
| `RUL-02` (reuso) | must | world | Tiros off-field voltam ao pool | `world/RUL-02.spec.ts` |

### Theme 6 — Meteoros

[`meteors.spec.MD`](../plans/meteors.spec.MD) · docs2 `ENM-04`. **Nota:** docs2 `RUL-04` é **pause** (`SCENE-05`), não asteroides.

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `MET-01` | must | meteors | Pool S/M/L; layer `Meteor` | `meteors/MET-01.spec.ts` |
| `MET-02` | must | meteors | Spawn/drift/despawn + `RUL-02` | `meteors/MET-02.spec.ts` |
| `MET-03` | must | meteors | Tiro + contato via `DamageManager` | `meteors/MET-03.spec.ts` |
| `MET-04` | should | meteors | Split opcional no `L` | `meteors/MET-04.spec.ts` |

### Theme 7 — Recursos & coleta

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `RES-01` | must | drops | Fragmentos nascem na destruição | `drops/RES-01.spec.ts` |
| `RES-02` | must | drops | Ímã + feedback SFX/UI | `drops/RES-02.spec.ts` |
| `RES-03` | must | drops | Pool não cresce sem limite | `drops/RES-03.spec.ts` |
| `RES-04` | should | drops | Tabela completa das 5 categorias por fonte | `drops/RES-04.spec.ts` |
| `RES-05` | should | crafting | Cap por recurso; `tryAdd` retorna 0 no limite | `crafting/RES-05.spec.ts` |
| `RES-06` | defer | drops | Equipamento como item épico (não stack) | `drops/RES-06.spec.ts` |

### Theme 8 — Inimigos

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `ENEMY-01` | must | enemy | Todo inimigo expõe `id`/`strategy`/`ticks` + CHAR sheet | `enemy/ENEMY-01.spec.ts` |
| `ENEMY-02` | must | enemy | SM de 5 estados; Flee pode reingressar | `enemy/ENEMY-02.spec.ts` |
| `ENEMY-03` | must | enemy | Tanker/Warrior/Rogue (+Special); silhueta <0.3s | `enemy/ENEMY-03.spec.ts` |

### Theme 9 — Squads

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `SQUAD-01` | must | squad | Squad sheet 1–8; contagem inválida rejeitada | `squad/SQUAD-01.spec.ts` |
| `SQUAD-02` | must | squad | SM de 5 estados; Break dispara `OnBreakGroup` | `squad/SQUAD-02.spec.ts` |
| `SQUAD-03` | must | squad | 6 formações com receitas de classe; mix ilegal bloqueado | `squad/SQUAD-03.spec.ts` |
| `SQUAD-04` | must | squad | Break/PatrolGrouping triggers | `squad/SQUAD-04.spec.ts` |

### Theme 10 — Run meta (score, morte, cenas)

[`scenes.spec.MD`](../plans/scenes.spec.MD) · [`rankings.spec.MD`](../plans/rankings.spec.MD) · [`hud.spec.MD`](../plans/hud.spec.MD)

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `RNK-01` | must | rankings | Best local sobrevive reload | `rankings/RNK-01.spec.ts` |
| `RNK-02` | should | rankings | Cálculo de janela UTC W/M/Y no cliente | `rankings/RNK-02.spec.ts` |
| `RNK-04` | should | rankings | Rankings **DOM**: 2 modos × 4 períodos | `rankings/RNK-04.spec.ts` |
| `SCENE-04` (canvas) | should | scenes | Title→Run no canvas compartilhado | `scenes/SCENE-04.spec.ts` |
| `SCENE-04` (Result DOM) | should | scenes | DEAD → `#result-root` com summary | `run-meta/SCENE-04-result.spec.ts` |
| `HUD-01` | must | hud | Barras Integrity/Shield/Energy só da Summary | `hud/HUD-01.spec.ts` |
| `HUD-02` | must | hud | Border score/kills/high do modo atual | `hud/HUD-02.spec.ts` |
| `HUD-03` | should | hud | Chip de arma + cargas + rádio (stub OK) | `hud/HUD-03.spec.ts` |
| `HUD-04` | must | hud | HUD é View-only; um projector; letterbox-safe | `hud/HUD-04.spec.ts` |

### Theme 11 — Armas e ordnance

[`weapons.spec.MD`](../plans/weapons.spec.MD)

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `WPN-03` | must | weapons | Switch Secondary sem stall de cadence | `weapons/WPN-03.spec.ts` |
| `WPN-04` | must | weapons | Laser · Plasma · Beam · Mjolnir distintos | `weapons/WPN-04.spec.ts` |
| `WPN-05` (reuso) | must | weapons | Custos de `ENE` distintos por perfil | `weapons/WPN-05.spec.ts` |
| `WPN-06` | must | weapons | Três ordnances; cargas limitadas; virtual `B` | `weapons/WPN-06.spec.ts` |

### Theme 12 — Equipamento, craft, progressão

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `EQP-01` | must | equipment | Item só concede campos registrados (registry + `baseSum`); sem orphans | `equipment/EQP-01.spec.ts` |
| `EQP-02` | must | equipment | Grants contextuais (`when: dashing`, …) fazem patch no toggle | `equipment/EQP-02.spec.ts` |
| `EQP-03` | should | equipment | `lab_craft_time_*` lido só no início do craft | `equipment/EQP-03.spec.ts` |
| `EQP-04` | must | crafting | CraftSlot exclusivo; segundo craft bloqueado | `crafting/EQP-04.spec.ts` |
| `EQP-05` | should | crafting | Catálogo de receitas jogável (reparo + 1 G2) | `crafting/EQP-05.spec.ts` |
| `EQP-06` | defer | crafting | Cancelamento documentado em `BALANCE` | `crafting/EQP-06.spec.ts` |
| `RES-06` (reuso) | defer | drops | Epic drop vira item de inventário | `drops/RES-06.spec.ts` |

### Theme 13 — Juice, áudio, empacotamento

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `BLD-01` | must | builds | 4 saídas de build a partir de um core | `builds/BLD-01.spec.ts` |
| `BLD-02` | must | builds | `IKARUS_PLATFORM` seleciona exatamente 1 kit | `builds/BLD-02.spec.ts` |
| `BLD-03` | must | builds | Builds web sem Steam SDK | `builds/BLD-03.spec.ts` |
| `BLD-05` | should | builds | Prod sem Dev rail / debug camera | `builds/BLD-05.spec.ts` |
| `BLD-06` | should | builds | Assets relativos sob HTTPS (Demo) | `builds/BLD-06.spec.ts` |
| `BLD-08` | must | builds | Kit Demo usa adapters DemoHost | `builds/BLD-08.spec.ts` |
| `BLD-09` | must | builds | Itch usa Dexie para persistência | `builds/BLD-09.spec.ts` |
| `BLD-10` | must | builds | Poki usa Poki SDK cloud save | `builds/BLD-10.spec.ts` |
| `BLD-11` | must | builds | Steam usa Tauri `plugin-fs` + Cloud | `builds/BLD-11.spec.ts` |
| `ARCH-03` | must | architecture | Caddy TLS → Node estático + `/api` | `arch/ARCH-03.spec.ts` |
| `ARCH-06` | should | architecture | Deploy manual documentado (rsync+restart) | `arch/ARCH-06.spec.ts` |
| `ARCH-09` | must | architecture | Persist Steam = Tauri `plugin-fs` + Cloud | `arch/ARCH-09.spec.ts` |
| `ARCH-10` | must | architecture | Persist Poki via SDK cloud | `arch/ARCH-10.spec.ts` |
| `ARCH-11` | must | architecture | Validação de schema/ranking no DemoHost (400/403) | `arch/ARCH-11.spec.ts` |
| `ARCH-12` | should | architecture | Fallback seguro de quota Dexie | `arch/ARCH-12.spec.ts` |
| `ARCH-13` | must | architecture | Persist debounced (~3s) em todos os adapters | `arch/ARCH-13.spec.ts` |
| `ARCH-14` | should | architecture | Guard CSRF/Origin no DemoHost | `arch/ARCH-14.spec.ts` |
| `ARCH-15` | defer | architecture | Backup Litestream SQLite | `arch/ARCH-15.spec.ts` |

### Theme 14 — Modos, boards, progressão (later)

| ID | Prio | Fonte | Aceite | Teste sugerido |
| --- | --- | --- | --- | --- |
| `ACH-01`…`ACH-09` | should/defer | achievements | Catálogo congelado; unlock via `apiName`; adapters Local/Itch/Poki/Steam | `achievements/ACH-0X.spec.ts` |
| `RNK-03` | defer | rankings | Survivor: zero loadout, laser only, one-shot | `rankings/RNK-03.spec.ts` |
| `RNK-05` | must | rankings | Modos nunca se misturam num board | `rankings/RNK-05.spec.ts` |
| `RNK-06`…`RNK-12` | should/defer | rankings | Adapters Steam/Itch/Poki, fila offline, cosmético | `rankings/RNK-0X.spec.ts` |
| `STR-01`…`STR-16` | must/should/defer | store | Catálogo, custo atômico, sem duplicar unlock permanente, streak semanal, 1 adapter por build | `store/STR-0X.spec.ts` |
| `BLD-04` | must | builds | Boot liga Auth+ACH+RNK+Store do **mesmo** kit | `builds/BLD-04.spec.ts` |
| `BLD-07` | defer | builds | Upload automatizado no Steam depot | `builds/BLD-07.spec.ts` |

---

## 5. Ordem de execução recomendada (gates de dependência)

Isto já está implícito no `todo.md` §"Coverage reminders", só explicitando como grafo de bloqueio:

```text
Theme 0 (scaffold + Golden Rule)
   └─► Theme 0b (Login) ─► Theme 0c (Start)
         └─► Theme 1 (Engine/Input) ─► Theme 2 (World) ─► Theme 3 (CHAR sheet)
               └─► Theme 4 (Player) ──┬─► Theme 4b (Pause)      [precisa nave + parallax]
                                       └─► Theme 5 (Combat)      [precisa Summary Sheet vivo — CHAR-03]
                                             ├─► Theme 6 (Meteoros)
                                             ├─► Theme 7 (Drops)
                                             └─► Theme 8/9 (Enemies/Squad) [precisa CHAR-06 dano]
                                                   └─► Theme 10 (Run meta) [precisa death path + boot 0b/0c]
                                                         └─► Theme 11 (Armas) → Theme 12 (Equip/Craft)
                                                               └─► Theme 13 (Packaging) → Theme 14 (Modos/Boards)
```

**Regra prática:** nenhum Requirement ID do lado direito da seta deve virar `[x]` antes do teste do lado esquerdo estar verde — é a mesma disciplina que vocês já escreveram no `todo.md`, só tornada explícita por ID em vez de por Theme inteiro.

---

## 6. Lacunas a resolver antes de escrever testes (bloqueiam SDD, não bloqueiam design)

| Lacuna | Status (hub 0.3.16) | Spec |
| --- | --- | --- |
| `WPN-01..08` sem tabela de Requirements | **Fechada** | [`weapons.spec.MD`](../plans/weapons.spec.MD) — Theme 5 = `WPN-01`/`02`/`05`; Theme 11 = `WPN-03`/`04`/`06`; `WPN-08` defer |
| `RUL-02` bounds/despawn | **Fechada** | [`world.spec.MD`](../plans/world.spec.MD) — `drops.spec.MD` aponta para cá |
| Asteroides (README antigo dizia `RUL-04`) | **Fechada** como `MET-*` | [`meteors.spec.MD`](../plans/meteors.spec.MD). Docs2 **`RUL-04` = pause** = já `SCENE-05` |
| Theme 2 sem Requirement ID | **Fechada** | `CAM-01`–`05` · `RUL-02` em [`world.spec.MD`](../plans/world.spec.MD) |
| `LORE-` inteiramente Deferred | **Sem ação** | Até Theme 14 se aproximar |
| `RUL-12` single balancer (docs2 A01) | **Fechada** | [`balance.spec.MD`](../plans/balance.spec.MD) · `D46` — Core + canvas View |

Ainda Deferred de propósito (não bloqueiam Theme 0–4, nem o slice de Theme 5 Laser): `LORE-*` · `RUL-06`/`09` (dificuldade) · `RUL-11` (score multipliers) · `RUL-14` (settings persist) · `WPN-08` · `ENM-07` Mega Asteroid.

---

## 7. Próximos passos concretos

1. Copiar [`_templete-spec.spec.MD`](./_templete-spec.spec.MD) (template em **§3.1**) para o primeiro ID do Theme atual.
2. Criar as pastas de domínio listadas em **§2 Folder Structure** (começar por `arch/` · `auth/` · `scenes/` no Theme 0).
3. **Theme 0 SDD (aberto):** `arch/ARCH-01` · `ARCH-02` · `ARCH-08` · `ARCH-16` · `ARCH-17` · `ARCH-18` · `ARCH-19` · `ARCH-20` — vermelhos até o scaffold `poc3/` + `demo-host/`.
4. **Theme 0b SDD (aberto):** `auth/AUTH-01`–`10` · `scenes/SCENE-01` · `arch/ARCH-05`.
5. **Theme 0c SDD (aberto):** `scenes/SCENE-02`.
6. **Theme 0d SDD (aberto):** `dev/DEV-01`–`05` · `DEV-07` (`DEV-06`/`08`–`11` não abertos). `/dev/equips` único + `equipType` obrigatório.
7. **Theme 1 SDD (aberto):** `input/CTRL-01` · `balance/RUL-12` (`GameLoop` = `ARCH-17`).
8. **Theme 2 SDD (aberto):** `world/CAM-01`–`06` · `world/RUL-02`.
9. **Theme 3 SDD (aberto):** `char/CHAR-01`–`06` (`CHAR-06-combat` = Theme 5).
10. **Themes 4–13 SDD (aberto):** ver notas `**SDD opened:**` em cada Theme em [`todo.md`](../todo.md) — **45** novos `.spec.ts` neste batch (Themes 4/8/9 só reuso/anotação).
11. **Próximo passo:** Theme 14 (ACH/STR/RNK adapters) ou scaffold `poc3/` (Theme 0) até `npm run verify` verde.
12. Lacunas `LORE-*` e IDs defer (`BLD-07`, `ARCH-07`/`15`, `EQP-06`, `RES-04`/`06`, `WPN-08`, `RNK-03`/`05`/`06`–`09`) continuam parked.
13. Regenerar este README quando IDs ou pastas mudarem nos `plans/*.spec.MD`.

*Fonte de verdade: `plans/*.spec.MD` + `decisions.spec.MD` + `todo.md`. Este documento é mapa derivado para o SDD.*