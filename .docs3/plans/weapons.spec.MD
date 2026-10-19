# Ikarus Eternal Horizon — Weapons & Ordnance

tag_g_combat tag_s_combat_weapon_fire tag_s_combat_weapon_catalog
RESUME: Primary/Secondary catalog (Laser · Plasma · Beam · Mjolnir); ShotManager pools; FiringManager virtual pad; Special Ordnance on Bomb slot.

**Hub index:** [`planning.spec.MD`](./planning.spec.MD) · **Hub version:** 0.3.16

**Related:** [`char-sheet.spec.MD`](./char-sheet.spec.MD) (`Primary_Weapon` / `Secondary_Weapon` / `Bomb` · Summary `S_D` `S_R` `ENE`) · [`equipment.spec.MD`](./equipment.spec.MD) (`EQP-01` — items do not own weapon behaviour) · [`input.spec.MD`](./input.spec.MD) (`A`/`B`/`X`/`Y`) · [`hud.spec.MD`](./hud.spec.MD) (weapon chip · charges)

Coverage: docs2 `WPN-01`–`08` · `SHIP-03`. Implement from POC3 contracts; POC1/POC2 weapons are not a port/feel reference (D48).

---

## Ownership

tag_g_combat tag_s_combat_weapon_fire tag_s_combat_projectile_pool
RESUME: FiringManager translates pad Commands; ShotManager owns pools; DamageManager is the only applyDamage path.

| Owns | Does **not** own |
| --- | --- |
| Weapon catalog in `BALANCE.weapons` (profiles, energy, pool ids) | CHAR slot occupancy (`CHAR-01`) |
| `FiringManager` — fire / switch / bomb from virtual pad | Equip `*_mod`/`*_mul` math (`EQP-*`) |
| `ShotManager` — projectile pools by origin | Hit resolution (`DamageManager` · `CHAR-06`) |
| Bomb slot charge count + ordnance dispatch | Craft recipes for bombs (`EQP-05`) |
| Energy spend **request** to `EnergyManager` | Energy regen (`REG` on Summary) |

**Item rule (`D29` reminder):** a Special weapon **item** grants only registered `*_mod`/`*_mul` (and optional `baseSum`). Cadence and damage **read** published `S_R` / `S_D`. Bolt count, beam width, cone angle, orb speed live in the **weapon catalog** keyed by equipped item id — never as orphan fields on the item.

**Survivor (`RNK-03`):** laser-only v1 — switch weapon / bomb Commands are ignored; catalog other than Laser is unreachable.

---

## Virtual pad → fire (`CTRL-01` seam)

tag_g_input tag_s_input_virtual_pad tag_g_combat tag_s_combat_weapon_switch
RESUME: A fire · B bomb · X switch weapon · Y switch bomb — FiringManager never imports hardware.

| Virtual | Role |
| --- | --- |
| `A` | Fire active primary/secondary profile |
| `B` | Fire active Special Ordnance (if charges > 0) |
| `X` | Cycle weapon (Primary ↔ Secondary catalog slot) |
| `Y` | Cycle bomb type (when more than one ordnance is owned) |

Core receives Commands (`FIRE_PRIMARY`, `SWITCH_WEAPON`, …) — [`architecture.spec.MD`](./architecture.spec.MD) (`ARCH-18`).

---

## Catalog — primary weapons (`WPN-04`)

tag_g_combat tag_s_combat_weapon_catalog
RESUME: Four distinct profiles; Laser is Theme 5 default; others Theme 11.

| Id | Profile (design) | Pool / hit shape |
| --- | --- | --- |
| `laser` | Straight bolts · high rate · low damage · minimal energy | Pooled `PlayerShot` |
| `plasma` | Slow orbs · medium AoE on impact or expiry | Pooled orbs + AoE query |
| `beam` | Continuous overlap DPS while held | No bolt pool — overlap test each tick |
| `mjolnir` | Piercing electric cone · pulse | Cone query; no friendly fire unless matrix says so |

All four **read** Summary `S_D` (damage scale) and `S_R` (cadence / beam tick). Numbers for speed, lifetime, cone angle, AoE radius live in `BALANCE.weapons.profiles`.

**Theme 5 ships `laser` only.** Theme 11 unlocks the rest on the Secondary (or switched) slot.

---

## Laser + pools (`WPN-01`)

tag_g_combat tag_s_combat_projectile_pool tag_s_combat_weapon_fire
RESUME: Theme 5 vertical slice — pooled Laser from Primary_Weapon; zero alloc per shot.

| Rule | Detail |
| --- | --- |
| Slot | Equipped `Primary_Weapon` selects the active profile id (default `laser`) |
| Acquire | `ShotManager.acquire('player')` — exhaustion returns `null` (no alloc, no fire) |
| Cadence | Gated by Summary `S_R` (integrity efficiency from `CHAR-04` already baked into published `S_R`) |
| Damage | Projectile `incoming` derived from Summary `S_D` × profile coefficient (`BALANCE`) |
| Recycle | Lifetime end **or** `RUL-02` off-field → pool ([`world.spec.MD`](./world.spec.MD)) |
| View | `syncRender` only — Core shot is `{ x, y, vx, vy, active }` |

---

## Hit path (`WPN-02`)

tag_g_combat tag_s_combat_damage_apply tag_s_combat_collision_layers
RESUME: PlayerShot × Enemy (and Meteor) goes through CollisionManager → DamageManager only.

| Pair | Effect |
| --- | --- |
| `PlayerShot` → `Enemy` | `DamageManager.applyDamage` (`CHAR-06`) |
| `PlayerShot` → `Meteor` | Same path ([`meteors.spec.MD`](./meteors.spec.MD) `MET-03`) |
| `PlayerShot` → `Player` | Matrix false |
| `PlayerShot` → `Drop` | Matrix false ([`drops.spec.MD`](./drops.spec.MD)) |

AoE (Plasma / Mjolnir / Nova) still calls `applyDamage` **once per valid target** — never a second resolver.

---

## Switch (`WPN-03`)

tag_g_combat tag_s_combat_weapon_switch
RESUME: Weapon switch does not stall the fire cadence of the newly selected profile.

| Rule | Detail |
| --- | --- |
| Input | Virtual `X` → Command `SWITCH_WEAPON` |
| Slots | Cycle the **active fire profile** between Primary and Secondary equipped ids |
| Cadence | Switch does **not** insert an extra cooldown beyond the destination profile’s own `S_R` gate |
| Empty Secondary | Switch is a no-op (stay on Primary) |

---

## Energy gate (`WPN-05`)

tag_g_combat tag_s_combat_energy_gate
RESUME: Every profile spends Summary ENE via EnergyManager; ENE 0 blocks fire.

| Rule | Detail |
| --- | --- |
| Spend | `EnergyManager.trySpend(cost)` — cost from `BALANCE.weapons.profiles[id].energy` |
| Block | `trySpend` false → no projectile, no beam tick, no bomb; HUD may show empty (`HUD-01`) |
| Shared pool | Weapons, dash, and craft share Summary `ENE` ([`crafting.spec.MD`](./crafting.spec.MD)) |
| Regen | `REG` on Summary; not recomputed from Full Sheet per tick (`D07`) |
| Beam | Continuous drain per sim tick while `A` held and overlap exists |

Theme 5 must prove Laser spend + block-at-zero. Theme 11 proves distinct costs per profile.

---

## Special Ordnance (`WPN-06`)

tag_g_combat tag_s_combat_ordnance
RESUME: Bomb Special slot — Pulse Nova · Swarm · Star Killer; limited charges; virtual B.

| Id | Effect (design) | Craft seam |
| --- | --- | --- |
| `pulseNova` | Expanding wave: stun common enemies + destroy `EnemyShot` | Nova Bomb recipe (`EQP-05`) |
| `swarm` | Homing cluster on nearest hostiles | Wasp Cluster |
| `starKiller` | Pull (ships, enemy fire, nearby meteors) then detonate | Singularity Bomb |

| Rule | Detail |
| --- | --- |
| Slot | `Bomb` Special (`CHAR-01`) |
| Charges | Integer on run state; HUD chip (`HUD-03`); 0 → `B` is no-op |
| Damage | `DamageManager` for hull hits; projectile-destroy is CollisionManager despawn, not a second damage type |
| Theme | **11** — Theme 5 may stub `B` as no-op |

---

## Equipment & skills (`WPN-07` · `WPN-08`)

tag_g_equipment tag_s_equip_mod_mul_grants
RESUME: Weapon upgrades are catalog rows + registered grants; Weaponry skills deferred.

| ID | Rule |
| --- | --- |
| `WPN-07` | Equipping Laser Cannons / Plasma Cannon / … **selects a catalog row** (bolt count, radius, …) and may add `damage_mod` / `shot_rate_mod`. No ad-hoc weapon stats on the item (`D29`). Theme **12**. |
| `WPN-08` | Weaponry branch (crit, extra cadence) — **defer** until skill tree (`SHIP-11` coverage). |

---

## `FiringManager` / `ShotManager` contract (sketch)

```
// FiringManager (Core)
onCommand(cmd)       // FIRE_PRIMARY | SWITCH_WEAPON | FIRE_BOMB | SWITCH_BOMB
updateSim(tick)      // cadence, beam overlap, energy gate
activeWeaponId()     // catalog id
activeBombId()

// ShotManager (Core)
acquire(origin)      // 'player' | 'enemy' | 'bomb' → handle | null
release(handle)
updateSim(tick)      // integrate + RUL-02 despawn
liveCount(origin)
```

---

## Requirements (`WPN-`)

| ID | Prio | Theme | Requirement | Acceptance |
| --- | --- | --- | --- | --- |
| `WPN-01` | must | 5 | Laser from `Primary_Weapon`; pooled shots; cadence `S_R`; damage `S_D` | Holding fire recycles from pool; zero alloc per shot; exhaustion returns null |
| `WPN-02` | must | 5 | `PlayerShot` × hostile → `DamageManager` only | Enemy/meteor dies via `CHAR-06`; no second resolver |
| `WPN-03` | must | 11 | Second weapon + virtual `X` switch | Switch does not stall destination cadence |
| `WPN-04` | must | 11 | Laser · Plasma · Beam · Mjolnir all distinct | Four profiles available and readable in play |
| `WPN-05` | must | 5 | Energy cost per profile; `ENE` 0 blocks fire | Laser drains; at 0 fire is a no-op (Theme 11: costs differ per id) |
| `WPN-06` | must | 11 | Three ordnance types; limited charges; virtual `B` | Each type matches the effect table; 0 charges = no-op |
| `WPN-07` | should | 12 | Equipment selects catalog row + registered grants only | Equip swap changes profile data without orphan item fields |
| `WPN-08` | defer | 12 | Weaponry skills alter crit / cadence | Parked with skill tree |

---

## BALANCE keys (feel stubs — Game Design owns numbers)

| Key | Intent |
| --- | --- |
| `weapons.profiles.<id>.energy` | Spend per shot or per beam tick |
| `weapons.profiles.<id>.coefficient` | Scales Summary `S_D` → incoming |
| `weapons.profiles.<id>.speed` / `lifetime` / `aoe` / `cone` | Distinct silhouettes |
| `weapons.playerPoolSize` | Hard live-bolt ceiling |
| `weapons.ordnance.chargesDefault` | Starting bomb charges |
| `weapons.laserBoltCountByItem` | Catalog rows for `WPN-07` |

---

## Open questions

| # | Question | Default until tuned |
| --- | --- | --- |
| Q44 | Beam vs bolt: does Beam spend `ENE` on empty air? | **Yes** — hold-to-drain even with no overlap |
| Q45 | Ordnance vs `EnemyShot`: Nova destroy radius | Stub in `BALANCE.weapons.ordnance.nova` |
