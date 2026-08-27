# Ikarus Eternal Horizon — Planning Spec (Docs3 Design Hub)

tag_g_docs tag_s_docs_tag_registry
RESUME: Design hub authority — requirement IDs, locked decisions, coverage matrix, and grep-tag matrix for docs3 / poc3.

**Version:** 0.3.0 · **Status:** active (design hub · implementation in `poc3/`)
**Purpose:** the **design hub index** — theme specs live as sibling files in this folder for the next model of the game. It is written **from scratch**. Canonical rules for ship sheets, individual enemies, and squads come from `[.docs3/consider/](../consider/)` (historical drafts). Runtime systems read only the **Summary Sheet**; the **Full Sheet** exists for equip/effect recalculation — not per-frame math. Code and tasks: `poc3/` + `[.docs3/todo.md](../todo.md)`.
**Sources:** `[../consider/char_sheet.MD](../consider/char_sheet.MD)` · `[../consider/enemy_sheet.MD](../consider/enemy_sheet.MD)` · `[../consider/squad_sheet.MD](../consider/squad_sheet.MD)` · public GDD `[README.md](../../README.md)`
**Docs2 role:** `[.docs2/plans/planning.spec.MD](../../.docs2/plans/planning.spec.MD)` is a **coverage checklist only** — not inherited architecture, not a workstream, not a port map. See [`coverage.spec.MD`](./coverage.spec.MD).
**Supersedes:** none (docs3 starts at 0.1.0). Does **not** retire docs2; docs2 remains the historical POC2 hub.

---
## 0. What this hub is (and is not)


| This hub **is**                                               | This hub **is not**                             |
| ------------------------------------------------------------- | ----------------------------------------------- |
| English design source of truth for CHAR · ENEMY · SQUAD       | A port of docs2 Stage A–G cards                 |
| New stable requirement IDs (`CHAR-`, `ENEMY-`, `SQUAD-`, …)   | A renumber of docs2 `SDD-A01`…`G12` or `SHIP-`… |
| Locked decisions for sheet math, death, formations, AI states | An excuse to edit frozen `poc/` or `poc2/`      |
| A docs2 **coverage matrix** so no topic is silently dropped   | A copy or “thin inherit” of docs2 §0–§10        |


**Implementation workstream:** code lives in `poc3/`; backlog is `[.docs3/todo.md](../todo.md)`. This hub stays the design authority (`D01`–`D30` in [`decisions.spec.MD`](./decisions.spec.MD); domain detail in theme files below).

**Runtime cost rule (hard):** every frame, combat/AI/render may read **Summary Sheet fields only** (`ENE`, `SHD`, `DEF`, `MIT`, `SPD`, `S_D`, `S_R`, `REG`, `LVL`, `HP`, integrity state). Full Sheet recalculation runs **only** on equip change, effect activate/expire, or the LVL triggers defined in `CHAR-05`. Hit resolution must **not** recompute `DEF / 10` — it reads precomputed `MIT`.


## 1. Game card (design)


| Field               | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| **Title**           | Ikarus: Eternal Horizon                                                               |
| **Genre**           | Shooter roguelite / arcade shmup, 2.5D                                                |
| **Perspective**     | 3D rendering · gameplay on **X/Y** (Z visual)                                         |
| **Session**         | Short intense runs; endless; difficulty scales with kills                             |
| **Modes**           | **Normal** (full systems) · **Survivor** (one-shot, laser-only v1) — [`rankings.spec.MD`](./rankings.spec.MD) · boards never mix |
| **Playable pillar** | move · fire · shield→integrity risk · **DRIFTING→DEAD** · collect · result · next run |
| **Sheet model**     | Every craft (player and enemy) is a **CHAR** sheet                                    |


Pillars from the GDD still apply (visible risk, tangible degradation, no free craft time, legibility <0.3s, one-more-kill, leaderboards, lore earned). Docs3 changes the **risk ending**: Integrity 0 is **DRIFTING**, not instant run-end; **DEAD** requires one more hit (`CHAR-04`).


---

## 2. Theme specs (read these for detail)

Each file is self-contained English design authority for its domain. **This index wins on conflicts** until explicitly revised.

| Spec | Primary tags | Super-summary |
| --- | --- | --- |
| [`nomenclature.spec.MD`](./nomenclature.spec.MD) | tag_g_system · tag_g_docs | Sheet layers, Summary codes, enemy/squad vocabulary, canvas scene boot order, *Manager table, grep tag rules and matrix snapshot. |
| [`decisions.spec.MD`](./decisions.spec.MD) | tag_g_docs | Locked decisions D01–D30 and open questions Q01–Q14. |
| [`char-sheet.spec.MD`](./char-sheet.spec.MD) | tag_g_char_sheet · tag_g_combat | CHAR-01–06: 54 slots, Full/Summary math, DRIFTING→DEAD, recalc triggers, MIT damage path. |
| [`equipment.spec.MD`](./equipment.spec.MD) | tag_g_equipment | EQP-01–05: *_mod/*_mul grants, contextual when-bundles, lab craft time, CraftSlot stub. |
| [`enemy.spec.MD`](./enemy.spec.MD) | tag_g_enemy | ENEMY-01–03: Enemy Base, five-state SM, Tanker/Warrior/Rogue (+ Special). |
| [`squad.spec.MD`](./squad.spec.MD) | tag_g_squad | SQUAD-01–04: squad sheet, formations, squad SM, OnBreakGroup/PatrolGrouping triggers. |
| [`scenes.spec.MD`](./scenes.spec.MD) | tag_g_scene_flow · tag_g_assets · tag_g_audio · tag_g_run_meta | SCENE-01–05: canvas Login/Start/Pause detail, Title/Run/Result/Rankings requirements. |
| [`input.spec.MD`](./input.spec.MD) | tag_g_input | CTRL-01 / D27: virtual pad vocabulary, four scheme adapters, InputManager contract. |
| [`achievements.spec.MD`](./achievements.spec.MD) | tag_g_achievements | ACH-01–09: AchievementManager, Local + platform adapters, initial catalog. |
| [`rankings.spec.MD`](./rankings.spec.MD) | tag_g_rankings | RNK-01–11: 8-board matrix, Survivor v1, Local + platform upload adapters. |
| [`coverage.spec.MD`](./coverage.spec.MD) | tag_g_docs | Docs2 SHIP/ENM/RUL/… prefix checklist, stage cards A–G, naming deltas. |

**Cross-cutting locks (always apply):**

| Lock | Where |
| --- | --- |
| Summary Sheet only at frame (`D07`) | [`char-sheet.spec.MD`](./char-sheet.spec.MD) |
| DRIFTING → DEAD (`D06`) | [`char-sheet.spec.MD`](./char-sheet.spec.MD) |
| Canvas scenes (`D23`) | [`scenes.spec.MD`](./scenes.spec.MD) · [`nomenclature.spec.MD`](./nomenclature.spec.MD) |
| `*Manager` naming (`D22`) | [`nomenclature.spec.MD`](./nomenclature.spec.MD) |
| Virtual input pad (`D27`) | [`input.spec.MD`](./input.spec.MD) |
| Achievement adapters (`D28`) | [`achievements.spec.MD`](./achievements.spec.MD) |
| Equip grants (`D29`) | [`equipment.spec.MD`](./equipment.spec.MD) |
| Ranking adapters (`D30`) | [`rankings.spec.MD`](./rankings.spec.MD) |

Requirement IDs (`CHAR-` · `ENEMY-` · `SQUAD-` · `SCENE-` · `CTRL-` · `ACH-` · `EQP-` · `RNK-`) live in the theme files above. Deferred prefixes (`WPN-` · `RES-` · `RUL-` · `LORE-` · `META-`) → [`coverage.spec.MD`](./coverage.spec.MD).

---

## 3. Grep tag registry

Plain-text tokens for `rg` / IDE search. **Not** markdown hashtags.

**Source of truth:** [`../tags/matrix.json`](../tags/matrix.json) · validate: `python .docs3/scripts/validate_tags.py validate`

| Prefix | Role | RESUME |
| --- | --- | --- |
| `tag_g_<domain>` | **General** — one per major domain | **Required** on scoped sections (one line after tags) |
| `tag_s_<domain>_<topic>` | **Specific** — semantic leaf topic | **Never** — bare token only |

Creation rules (`D25`, `D26`): see [`nomenclature.spec.MD`](./nomenclature.spec.MD) · full matrix table there or run `python .docs3/scripts/validate_tags.py matrix`.

### All general tags

| General tag | RESUME | Specific tags |
| --- | --- | --- |
| `tag_g_char_sheet` | CHAR Full/Summary sheet — slots, attribute families, recalc, published Summary codes (every craft). | `tag_s_char_equip_slots` · `tag_s_char_full_sheet_families` · `tag_s_char_summary_sheet` · `tag_s_char_recalc_triggers` · `tag_s_char_effect_slots` · `tag_s_char_integrity_states` · `tag_s_char_mitigation_mit` |
| `tag_g_equipment` | Equip items — *_mod / *_mul grants, contextual modifiers, lab craft time, recipes (data in BALANCE). | `tag_s_equip_mod_mul_grants` · `tag_s_equip_contextual_mods` · `tag_s_equip_lab_craft_mods` · `tag_s_equip_item_schema` · `tag_s_equip_craft_recipes` |
| `tag_g_combat` | Combat resolution — damage apply, shield/integrity, collision, projectiles, weapons. | `tag_s_combat_damage_apply` · `tag_s_combat_shield_absorb` · `tag_s_combat_collision_layers` · `tag_s_combat_ship_collision_exchange` · `tag_s_combat_projectile_pool` · `tag_s_combat_weapon_fire` · `tag_s_combat_weapon_switch` |
| `tag_g_player_ship` | Player craft — PlayerManager, movement/tilt/dash, player CHAR runtime, death → run end. | `tag_s_player_movement_commands` · `tag_s_player_death_run_end` · `tag_s_player_hud_fields` |
| `tag_g_input` | Player input — schemes, binds, axes, pause Controls tab, combat vocabulary. | `tag_s_input_schemes` · `tag_s_input_bind_storage` · `tag_s_input_pause_controls_tab` · `tag_s_input_virtual_pad` · `tag_s_input_device_adapters` · `tag_s_input_nipplejs_touch` |
| `tag_g_enemy` | Individual enemies — Enemy Base, strategy SM, classes, spawn/pool lifecycle. | `tag_s_enemy_base_fields` · `tag_s_enemy_strategy_sm` · `tag_s_enemy_class_roles` · `tag_s_enemy_spawn_pool` |
| `tag_g_squad` | Coordinated groups — squad sheet, formations, squad SM, squad↔enemy triggers. | `tag_s_squad_sheet_roles` · `tag_s_squad_strategy_sm` · `tag_s_squad_formation_recipes` · `tag_s_squad_enemy_triggers` |
| `tag_g_scene_flow` | Scene boot and flow — shared canvas, SceneManager, Login→Start→Title→Run→Result→Rankings→Pause. | `tag_s_scene_canvas_render` · `tag_s_scene_manager_transitions` · `tag_s_scene_login_auth` · `tag_s_scene_start_preload` · `tag_s_scene_pause_overlay` · `tag_s_scene_title_menu` · `tag_s_scene_run_gameplay` · `tag_s_scene_result_summary` · `tag_s_scene_rankings_board` |
| `tag_g_audio` | SoundManager — music/SFX volumes, mute, ship-AI VO cues, text log, web audio unlock. | `tag_s_audio_cue_dispatch` · `tag_s_audio_volume_mute` · `tag_s_audio_ship_ai_vo` · `tag_s_audio_text_log` |
| `tag_g_assets` | AssetManager — preload buckets, cache-by-id, Start-scene warm loading. | `tag_s_assets_preload_buckets` · `tag_s_assets_cache_by_id` · `tag_s_assets_critical_ready_gate` |
| `tag_g_engine` | Engine core — GameLoop, dt/pause gate, ObjectPool, zero alloc, BALANCE numeric source. | `tag_s_engine_game_loop` · `tag_s_engine_object_pool` · `tag_s_engine_balance_source` · `tag_s_engine_zero_alloc` |
| `tag_g_run_meta` | Run meta — elapsed, kills, score, inventory use/drop, lab/craft, Result/Rankings. | `tag_s_run_stats_panel` · `tag_s_run_inventory_actions` · `tag_s_run_lab_craft` · `tag_s_run_result_screen` · `tag_s_run_rankings_screen` |
| `tag_g_achievements` | Achievement catalog and publish — gameplay uses apiName only; Local always on; one platform adapter per boot (Itch, Poki, Steam). | `tag_s_achievements_catalog` · `tag_s_achievements_virtual_api` · `tag_s_achievements_local_adapter` · `tag_s_achievements_itch_adapter` · `tag_s_achievements_poki_adapter` · `tag_s_achievements_steam_adapter` |
| `tag_g_rankings` | Leaderboards — 2 modes x 4 UTC periods; Local always on; platform upload adapters (Itch, Poki, Steam). | `tag_s_rankings_board_matrix` · `tag_s_rankings_local_adapter` · `tag_s_rankings_itch_adapter` · `tag_s_rankings_poki_adapter` · `tag_s_rankings_steam_adapter` · `tag_s_rankings_survivor_mode` · `tag_s_rankings_submit_pipeline` |
| `tag_g_system` | Runtime system naming and *Manager ownership (D22). | `tag_s_system_manager_classes` |
| `tag_g_docs` | Documentation — hub authority, requirement IDs, SDD+TDD process, tag matrix. | `tag_s_docs_requirement_ids` · `tag_s_docs_decisions_locked` · `tag_s_docs_coverage_matrix` · `tag_s_docs_tag_registry` |

---

## 4. Decisions index

Full tables: [`decisions.spec.MD`](./decisions.spec.MD). Locked **D01–D30**; open **Q01–Q14**.

| Decision | One-line |
| --- | --- |
| **D01** | `consider` CHAR/ENEMY/SQUAD canonical over docs2 |
| **D06** | DRIFTING at Integrity 0 → DEAD on next hit |
| **D07** | Frame loop reads Summary Sheet only |
| **D22** | Domain owners named `*Manager` only |
| **D23** | All scene-flow screens in shared WebGL canvas |
| **D24** | `MIT = DEF/10` precomputed at recalc |
| **D25–D26** | Grep tag matrix + validate before publish |
| **D27** | Virtual input pad + four scheme adapters |
| **D28** | Achievement publish adapters |
| **D29** | Equip `*_mod`/`*_mul` grants only |
| **D30** | Ranking publish adapters — 8 boards, modes never mix |

---

## 5. Document map

| Path | Role |
| --- | --- |
| [`planning.spec.MD`](./planning.spec.MD) | **This index** — tags, theme list, cross-links |
| [`../tags/matrix.json`](../tags/matrix.json) | Tag matrix source of truth |
| [`../scripts/validate_tags.py`](../scripts/validate_tags.py) | Tag validate · domain grep · matrix print |
| [`../todo.md`](../todo.md) | POC3 implementation backlog (themes 0–14) |
| [`../consider/char_sheet.MD`](../consider/char_sheet.MD) | Historical CHAR draft (superseded by theme specs) |
| [`../consider/enemy_sheet.MD`](../consider/enemy_sheet.MD) | Historical ENEMY draft |
| [`../consider/squad_sheet.MD`](../consider/squad_sheet.MD) | Historical SQUAD draft |
| [`../../.docs2/plans/planning.spec.MD`](../../.docs2/plans/planning.spec.MD) | Docs2 coverage checklist only |
| [`../../README.md`](../../README.md) | Public GDD |

---

## Status

| Field | Value |
| --- | --- |
| Hub version | **0.3.0** (split index + theme specs) |
| Structure | Index + 11 theme files in `.docs3/plans/` |
| Code target | `poc3/` |
| Backlog | [`../todo.md`](../todo.md) |
| Canonical model | CHAR · ENEMY · SQUAD · SCENE · `*Manager` naming |
| Runtime rule | Summary Sheet only per frame (`D07`) |
| Death rule | DRIFTING → DEAD (`D06`) |
| Boot | Login (skippable) → Start → Title → Run; Pause overlays Run |

*Living design hub. English is canonical. If historical `consider/` drafts or docs2 satellites diverge, **this index and theme specs win** until explicitly revised.*
