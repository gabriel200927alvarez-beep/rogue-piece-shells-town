# Rogue Piece - Documento de Diseño y Contexto Técnico (v1.9f)

## 1. FLUJO DE PANTALLAS (UI/UX)

### 1.1 Transición de Pantallas
```
Menú Principal (screen-menu) 
    → [Botón JUGAR btn-start-game] 
    → Selección de Personaje (screen-select, carousel 12 tarjetas) 
    → [Botón ZARPAR btn-zarpar o click en tarjeta] 
    → Juego (screen='playing', HUD visible) 
    → [Oleada completada] 
    → Mejoras (screen-upgrades, 3 tarjetas, modal seguro 3 capas) 
    → [Confirmar] 
    → Siguiente oleada 
    → [Oleada 5 completada / Victoria] 
    → Victoria (screen-victory) 
    → [JUGAR DE NUEVO] 
    → Selección
```

### 1.2 Elementos HTML Principales y Transiciones

| Pantalla | ID HTML | Clase Inicial | Activación |
|----------|---------|---------------|------------|
| Menú | `#screen-menu` | `.screen-modal.active` | Estado inicial `STATE.screen='menu'` |
| Selección | `#screen-select` | `.screen-modal` | `switchScreen('select')` → `classList.add('active')` |
| Juego | HUD `#hud-combat` | `display:block` | `switchScreen('playing')` |
| Pausa | `#screen-pause` | `.screen-modal` | `switchScreen('pause')` |
| Mejoras | `#screen-upgrades` | `.screen-modal` | `switchScreen('upgrades')` |
| Game Over | `#screen-gameover` | `.screen-modal` | `triggerGameOver()` |
| Victoria | `#screen-victory` | `.screen-modal` | `triggerVictory()` |
| Ajustes | `#screen-settings` | `.screen-modal` | `switchScreen('settings')` |
| Orientación | `#orientation-overlay` | `.visible` | `checkOrientation()` en portrait |

### 1.3 Función `switchScreen(screenName)`
```javascript
STATE.screen = screenName
document.querySelectorAll('.screen-modal').forEach(m => m.classList.remove('active'))
const target = document.getElementById('screen-' + screenName)
if (target) target.classList.add('active')
else console.warn('Screen not found:', 'screen-' + screenName)
if (screenName === 'select') animateStatBars()
```
- HUD combate: `display: block` solo en `'playing'` o `'upgrades'`

### 1.4 Overlays Persistentes
- **Orientación**: `#orientation-overlay` (z-index 9999), botón `#btn-force-landscape` llama `dismissOrientation()` → `orientationDismissed=true` + `AUDIO.unlock()`
- **HUD Combate**: `#hud-combat` (z-index 10), se oculta en modales con `.hud-modal-locked`
- **Botón Cancel Quake**: `#btn-cancel-quake` (visible solo en H3 Barbablanca activo)

---

## 2. ARQUITECTURA GLOBAL (STATE y CONFIG)

### 2.1 CONFIG (Constantes Globales)
```javascript
CONFIG = {
  WIDTH: 1280, HEIGHT: 720,
  WORLD_WIDTH: 2560, WORLD_HEIGHT: 1440,
  ARENA_MARGIN_X: 90, ARENA_MARGIN_Y: 85,
  MAX_WAVES: 5,
  JOYSTICK_RADIUS: 58, JOYSTICK_KNOB_RADIUS: 24, JOYSTICK_DEADZONE: 0.14,
  AUTO_AIM_RANGE: 230, COMBO_RESET_TIME: 0.65,
  DASH_DISTANCE: 165, DASH_DURATION: 0.16, DASH_IFRAMES: 0.22,
  HITSTOP_DURATION: 0.045,
  CAM_DEADZONE_W: 256, CAM_DEADZONE_H: 144, CAM_LERP: 0.14
}
```

### 2.2 RAREZAS (Multiplicadores de Stats)
```javascript
RAREZAS = {
  comun:      { multiplicadorStats: 1.0 },
  raro:       { multiplicadorStats: 1.1 },
  epico:      { multiplicadorStats: 1.25 },
  legendario: { multiplicadorStats: 1.5 },
  yonko:      { multiplicadorStats: 2.0 }
}
```

### 2.3 CHARACTERS (12 Personajes)
Cada entrada: `id, name, rarity, portrait, portraitBg, attackIcon, themeClass, color, vestColor, hp, damage, speed, armor, dashCd, skills[{name, icon, cd}]`

**Base (Común 1.0x):** Luffy, Zoro, Sanji  
**Raro (1.1x):** Usopp, Franky, Robin  
**Épico (1.25x):** Law, Kid, Killer  
**Legendario (1.5x):** Shanks, Barbablanca, Luffy PTS

### 2.4 STATE (Estado Global)
```javascript
STATE = {
  // Flujo
  screen: 'menu',          // 'menu' | 'select' | 'playing' | 'upgrades' | 'pause' | 'settings' | 'gameover' | 'victory'
  charId: 'luffy',         // ID personaje actual
  wave: 1,                 // 1..5
  berries: 0, berriesCollectedRun: 0, killsRun: 0,
  permBonusDmg: 0,         // +5% daño permanente por victoria
  hitstopTimer: 0, shakeTimer: 0, shakeIntensity: 0,
  timeSinceLastCombat: 0, targetedEnemy: null,
  
  settings: { sfxVolume: 0.8, musicVolume: 0.55, vibration: true },
  tutorial: { shown: false, active: false, step: 0, timer: 0 },
  
  // Modificadores roguelike
  mods: {
    acquiredIds: [], normalDmgPct: 0, skillDmgPct: 0, critChance: 0.05,
    outOfCombatRegen: 0, dashCdMult: 1.0, dashSlowTrail: false,
    h1CdMult: 1.0, h1Burn: false, h2PierceShield: false, h3AreaMult: 1.0,
    bonusBerries: 0, scoutNextWave: false
  },
  
  player: { /* ver 2.4 */ },
  
  waveSpawnQueue: [], waveTotalEnemies: 0, waveEnemiesRemaining: 0, waveSpawnTimer: 0,
  enemies: [], projectiles: [], berriesDrops: [], hazards: [], traps: [],
  pendingStrikes: [], afterimages: [], slashEffects: [],
  particles: Array(180).fill({active:false}), floatingTexts: Array(55).fill({active:false})
}
```

### 2.5 PLAYER (Objeto Estado Jugador)
```javascript
player: {
  // Físicas
  x: 1280, y: 720, radius: 18,
  vx: 0, vy: 0, facingAngle: 0,
  
  // Stats base (escalados por rareza)
  hp: 150, maxHp: 150, baseDamage: 18, speed: 240, armor: 18,
  
  // Temporizadores
  invulnTimer: 0, slowTimer: 0, speedBuffTimer: 0,
  comboStep: 0, comboResetTimer: 0,
  attackCooldown: 0, attackCooldownMax: 0.21, attackAnimTimer: 0,
  skillAnimTimer: 0, activeSkillIndex: 0,
  momentumTimer: 0, momentumDirX: 0, momentumDirY: 0,
  superArmorTimer: 0,
  
  // Dash
  dashCdMax: 2.2, dashCdTimer: 0,
  dashCharges: 1, maxDashCharges: 1,
  isDashing: false, dashTimer: 0, dashDurationMax: 0.16,
  dashDirX: 1, dashDirY: 0, customDashDist: 165,
  dashHitEnemyIds: [],
  
  // Skills
  skillCds: [0,0,0], skillMaxCds: [4.5, 6.0, 9.5],
  
  // Estados específicos por personaje (ver secciones 5.x)
  // Luffy: gatlingHitsLeft, diableHitsLeft, stormTimer, etc.
  // Luffy PTS: ptsGatlingHitsLeft, gear2ndTimer, isChargingKKG, kkgChargeTimer, kkgTouchId...
  // Shanks: shanksHaki, shanksChainStep, shanksChainTimer, futureSightTimer, shanksH2PendingCircles...
  // Barbablanca: whitebeardEnergy, wbJumpCharges, wbJumpCdTimer, quakeZoneTimer, wbQuakeAttackCd...
  // Law: roomTimer, roomDurationMax, roomRadius
  // Kid: scrap, kidRepelWindowTimer, punkRottenTimer, damnedPunkTimer...
  // Killer: ensanamientoTimer, killerFrenzyTimer, killerHeartbeatTimer
}
```

### 2.6 Inicialización (`startNewRun(charId)`)
1. `STATE.charId = charId`, busca config en `CHARACTERS[charId]`
2. Aplica multiplicador de rareza a HP, daño, armadura
3. Resetea `STATE.wave=1`, berries, kills, mods, timers
3. Inicializa `STATE.player` con stats escalados + `STATE.mods` vacío
4. Inicializa arrays de entidades vacíos
5. `prerenderBackground(false)`, actualiza HUD, `switchScreen('playing')`, `startWave(1)`

---

## 3. GAME LOOP Y RENDERIZADO

### 3.1 Game Loop Principal
```javascript
let lastTimestamp = performance.now()
function gameLoop(timestamp) {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000)
  lastTimestamp = timestamp
  update(dt)
  if (STATE.screen === 'playing' || 'upgrades' || 'pause' || 'settings') render()
  else if (STATE.screen === 'select') renderCharacterPreviews(timestamp)
  requestAnimationFrame(gameLoop)
}
requestAnimationFrame(gameLoop)
```
- **Delta time**: `dt` clamped a 50ms (20 FPS mínimo) para evitar saltos grandes tras pausa
- `update(dt)` → lógica, `render()` → dibujo

### 3.2 `update(dt)` - Lógica por Frame
**Early returns:**
- `STATE.screen === 'upgrades'` → `SAFE_UPGRADE_MODAL.update(dt)`
- `STATE.screen !== 'playing'` → return
- `STATE.hitstopTimer > 0` → decrementa y return (congela todo)

**Actualizaciones:**
1. Tutorial, hitstop, shake
2. Regeneración fuera de combate (>3s sin combate)
4. Timers jugador: invuln, slow, speedBuff, attackCooldown, attackAnim, skillAnim, superArmor, strongRight, punkRottenBuild
5. ROOM Law, ventanas Kid (Attract/Repel, Punk Rotten), Killer (Bloodlust, Frenzy), Shanks (Future Sight, chain timer), Barbablanca (salto, Rasetsu, recarga salto, quakeZone), Luffy PTS (Gear 2, KKG charge), Usopp doble disparo, Franky Radical, Zoro Sanzen, etc.
6. Spawn oleadas, trampas, pendingStrikes, Alvida AI, proyectiles, efectos, particulas, textos flotantes
6. Spawn cola oleadas, IA enemigos (Marines, Alvida), proyectiles, efectos, partículas, textos

### 3.3 `render()` - Dibujo por Frame
1. `ctx.save()`, shake translation, zoom WB Quake
2. `ctx.translate(-CAMERA.x, -CAMERA.y)`, `ctx.drawImage(bgCanvas, 0, 0)`
3. Zona sísmica WB, ROOM Law, barrido Haki WB
4. Enemigos (telegraph, boss), pendingStrikes, hazards, trampas, berries, afterimages
5. Jugador (`drawPlayer()`): sombra, sprite según personaje, círculos Haki/Shanks/Barbablanca/LuffyPTS/Killer/Franky/Killer
6. Enemigos (`drawEnemy()`): sprites, barras HP, telegraph, escudos, sangrado
6. Efectos slash (`drawSlashEffect`): rings, arcs, lines, fissures, haki circles/explosions, seaquake cracks, etc.
7. Minimapa, HUD (ya en DOM), joystick hint

### 3.4 Cámara (`CAMERA`)
- Deadzone centrada 256x144, lerp 0.14, clamp a mundo 2560x1440
- Zoom out 10% durante WB Quake Zone

### 3.5 Background Prerenderizado
`prerenderBackground(liberated)` → canvas offscreen 2560x1440, grid tiles 80x80, decoraciones (cajas, barriles, farolas, árboles) con seed determinista

---

## 4. EVENT LISTENERS CRÍTICOS

### 4.1 Botones UI Principales
| Botón ID | Evento | Handler | Acción |
|----------|--------|---------|--------|
| `#btn-start-game` | touchstart/click | `handleStartGame` | `AUDIO.unlock()`, `switchScreen('select')` |
| `#btn-force-landscape` | touchstart/click | `dismissOrientation` | `orientationDismissed=true`, `AUDIO.unlock()` |
| `#btn-pause` | touchstart | - | `switchScreen('pause')` |
| `#btn-resume` | click | - | `switchScreen('playing')` |
| `#btn-quit` | click | - | `switchScreen('menu')` |
| `#btn-retry` | click | - | `switchScreen('select')` |
| `#btn-play-again` | click | - | `switchScreen('select')` |
| `#btn-settings` | touchstart | - | `switchScreen('settings')` |
| `#btn-close-settings` | click | - | `switchScreen('playing')` |
| `#btn-confirm-restart` | click | - | `startNewRun(STATE.charId)` |
| `#btn-cancel-quake` | touchstart/pointerdown/click | `cancelWhitebeardQuakeZone()` | Cancela H3 Barbablanca |
| `#btn-confirm-upgrade` | touchstart/click | `SAFE_UPGRADE_MODAL.confirmSelection()` | Aplica mejora elegida |
| Carrusel tarjetas | touchend/click | `launchCharacterFromCard()` | `startNewRun(charId)` |
| Dots carrusel | click | - | Scroll a tarjeta |

### 4.2 Botones Acción (Cluster Derecho) - `bindActionButtons()`
| Botón | Evento | Handler | Notas |
|-------|--------|---------|-------|
| `#btn-attack` | touchstart | `tryNormalAttack()` | `INPUT_TOUCH.attackHeld=true`, `INPUT_TOUCH.attackTouchId` |
| `#btn-dash` | touchstart | `tryDash()` | Si cargas disponibles |
| `#btn-h1` | touchstart | `trySkill(0)` | H1 |
| `#btn-h2` | touchstart | `trySkill(1)` | H2 (Shanks H2 guarda `kkgTouchId` si Luffy PTS) |
| `#btn-h3` | touchstart/touchend | `trySkill(2)` | H3 (Luffy PTS: `kkgTouchId` + hold 150ms para `releaseKingKongGun()`) |

### 4.3 Input Táctil Global (`INPUT_TOUCH`)
```javascript
INPUT_TOUCH = {
  joystick: { active, touchId, originX/Y, currX/Y, dirX/Y, magnitude },
  attackHeld: false, attackTouchId: null
}
```
- **Joystick** (lado izquierdo < 50% ancho): `touchstart` → activa, `touchmove` → actualiza `dirX/Y`, `magnitude` (deadzone 0.14, clamp radius 58), `touchend` → desactiva
- **Ataque** (botón derecho): `touchstart` → `attackHeld=true`, `touchend/cancel` → `attackHeld=false`

### 4.4 Orientación
```javascript
checkOrientation() → if (touchDevice && portrait) overlay.visible else ocultar
window.addEventListener('resize/orientationchange', checkOrientation)
setTimeout(checkOrientation, 100/500) // fallbacks
```

### 4.5 Haptics & Audio Unlock
- `triggerHaptic(pattern)` → `navigator.vibrate(pattern)` si `STATE.settings.vibration`
- `AUDIO.unlock()` en primera interacción (touch/mousedown/pointerdown) → resume AudioContext

---

## 5. MECÁNICAS DE LOS LEGENDARIOS (v1.9f)

### 5.1 SHANKS (Straw Hat) - Legendario 1.5x
**Stats base:** HP 100, DMG 18, SPD 6.0, ARM 6, Dash 1.5s

**Combo Básico (5 cortes):** 0.25s ventana, 110px alcance, 0.7x dmg, 1 stack sangrado/corte. Corte 5: arco eléctrico 300px, 1.8x, push 100px, 2 stacks + hitstop 0.08s + shake 5px.

**H1 - Conqueror's Haki** (CD 10s): Círculo 220px, stun escalado por Haki (1.0s@0 → 4.2s@100), 360°, consume Haki.

**H2 - Divine Departure** (CD 10s, auto-cadena):
- **1 pulso = 5 cortes secuenciales** cada 180ms
- Cada corte: dash 320px hacia enemigo más cercano (piercing con `hitSet`), 0.8x dmg, 1 sangrado, i-frames 0.1s
- Corte 5/5: **ensanchado ×2.5** (ancho 100px), 2.5x dmg, registra posición **primer enemigo impactado**
- **Trigger**: 0.3s tras impacto → crea círculo Haki en posición registrada

**H3 - Future Sight** (CD 18s): 5s inmunidad total, esquivas MISS, +30% velocidad movimiento, afterimages al moverse (0.35s fade, 55% chance)

**Círculo Haki (H2 finisher):**
- Delay 0.3s → aparece en pos. primer impacto (radio 140px)
- Duración 2s, 22 ticks (~0.09s), 0.35× dmg/tick, sin sangrado extra
- Visual: aura difusa gradiente radial (sin borde), 10 cortes rojos + 10 negros rotando, hitstop 0.015s/tick
- Explosión final (210px): doble onda, 48 partículas, 16 chispas radiales, shake 8/0.25s, destello pantalla
- **Reglas**: Sin impacto → sin círculo; 2+ enemigos → solo primero genera círculo; círculo fijo (no persigue); limpieza en game over/victory/restart/muerte Shanks

**Pasiva Haki:** Gana 10 Haki/kill, al 100% → círculo permanente visible alrededor del jugador (solo al 100%, eliminado tier 50-99%)

**Recursos:** `shanksHaki` (0-100), `shanksChainStep` (1-5), `shanksChainTimer` (1.2s ventana), `futureSightTimer`, `shanksChainStartX/Y`, `shanksChainDestX/Y`, `shanksChainCutAngle`, `shanksChainTravelDist`, `shanksH2PendingCircles[]` (array círculos pendientes con delay/duration/ticks)

---

### 5.2 LUFFY PTS (Post Time Skip) - Legendario 1.5x
**Stats base:** HP 130, DMG 17, SPD 6.0, ARM 8, Dash 1.8s (200px)

**Combo Básico (4 golpes):**
1. **Jet Pistol 1** (160px, 0.9x) - CD 0.35s (0.28s G2) + 0.15s recuperación
2. **Jet Pistol 2** (160px, 0.9x) - mismo CD
3. **Jet Gatling** - 4 sub-golpes en 1.0s (0.80s G2), 0.9x c/u (3.6x total), auto-aim por sub-golpe (radio 220px, cono ±120°)
4. **Jet Bazooka** - Finisher 120px, 3x, push 80px, hitstop 0.08s, shake 7px
   - **CD post-combo: 1.0s PLANO** (no afecta Gear 2nd)
   - Dirección fija tras auto-aim inicial

**Auto-aim (todos los golpes):** `findNearestEnemyInCone(radius=220, baseAngle, halfAngle=120°)`
- Jet Pistol 1/2: re-aim al iniciar cada golpe
- Gatling: re-aim entre sub-golpes (retargeting)
- Bazooka: fija dirección tras auto-aim inicial

**H1 - Red Hawk Gatling** (CD 12s): 15 golpes en 1.2s (0.08s c/u), 0.20x c/u (3.0x total), tracking dinámico 250px, finisher 300px 5.5x + burn

**H2 - Gear 2nd** (CD 18s): Duración escalada (6s base + floor(G2/25)), ×1.4 dmg global, +25% vel ataque, +1 dash, escudo Haki 25% reducción daño, botón muestra "ACTIVE", reactivación bloqueada

**H3 - King Kong Gun** (CD 18s):
- Carga: hold/tap H3 → `isChargingKKG=true`, `kkgChargeTimer` (máx 2.5s auto-fire)
- Daño escalado: 1.0× → 8.0× (2.5s), +1.4× si Gear 2 activo
- Área 300px, stun 2.0s, push 180px, burn, shake 8/0.25s
- **Ininterrumpible en G2**: escudo Haki bloquea cancelación por daño
- Aislamiento táctil `kkgTouchId` (umbral 150ms) evita cancelación accidental

**Gear 2nd (0.80× multiplicador tiempo):** Aplica a Jet Pistol 1/2, Gatling ventana (1.0s→0.80s), Bazooka animación. **NO** al CD post-combo 1.0s.

**Recursos:** `luffyG2` (0-100, +25/kill), `gear2ndTimer`, `gear2ndDuration`, `isChargingKKG`, `kkgChargeTimer`, `kkgTouchId`, `kkgTouchStartTime`, `kkgMouseHeld`, `ptsGatlingHitsLeft/TotalHits/TickTimer/Type/Angle`

---

### 5.3 BARBABLANCA - Legendario 1.5x
**Stats base:** HP 160, DMG 17, SPD 4.0, ARM 10, Dash 2.5s (100px)

**Combo Básico (3 golpes, ventana 0.9s):**
1. **Seaquake** (Golpe 1): Grieta irregular gris 200×60px, 1.5× dmg, stun 0.8s, sin shake. **Visual v1.9e**: grieta irregular gris (núcleo `#263238`, bordes `#78909C`, partículas grises), hitbox intacto
2. **Naginata Rasetsu** (Golpe 2): Abanico 3 cortes (0°, -30°, +30°) a 150px, 0.6× c/u + 1 sangrado, cadencia 0.12s
3. **Barrido Haki** (Golpe 3): **v1.9e** Semicírculo 240° (era 180°), alcance 240px (era 180px), 2.0× dmg, push 80px, stun 0.5s, 2 sangrados, shake 5px, hitstop 0.06s. Constantes: `WB_HAKI_SWEEP_ANGLE=240°`, `WB_HAKI_SWEEP_RANGE=240`

**H1 - Seaquake** (CD 10s): Línea 350×100px, 3× dmg, stun 1.2s, shake 8px. **Visual v1.9e**: misma grieta gris irregular (350px, ancho 100), hitbox/stats intactos

**H2 - Island Shaking / Salto Sísmico** (2 cargas, CD 2.2s):
- Anticipación 0.15s (scale 0.85), vuelo 0.4s (scale 1.0→1.4), i-frames 0.55s
- Aterrizaje: fisura 120px, 2.0×, stun 0.8s, push 100px, shake 7/0.20s

**H3 - Island Shaking / Zona Sísmica** (CD 20s, cancelable):
- Duración 6-11s (según energía), radio 250px, escudo 50% dmg, lentitud 40%
- Botón `#btn-cancel-quake` visible → `cancelWhitebeardQuakeZone()` → inicia CD 20s
- Ataque básico en zona: terremoto 250px 1.5× + sangrado (CD interno 1.0s)
- CD 20s **solo inicia al terminar/cancelar** naturalmente

**Recursos:** `whitebeardEnergy` (0-100, +8/kill), `wbJumpCharges` (2), `wbJumpCdTimer`, `quakeZoneTimer`, `quakeZoneDuration`, `wbQuakeAttackCd`, `wbRasetsuCutsLeft/Timmer/Angle`, `wbJumpCharges/Phase/Timer/Scale`, `wbIsJumping`, `wbJumpStartX/Y/TargetX/Y`, `wbQuakeAttackCd`

---

## 6. SISTEMAS DE OLEADAS Y MEJORAS

### 6.1 Oleadas y Escalado
- **5 oleadas**, oleada 5 = Boss Alvida (3 fases: 100%→60%→30% HP)
- `getWaveComposition(w)`: Marines básicos, tiradores, escuderos, oficiales, bomberos, Alvida
- Spawn rate base: oleada 1 = 0.48s, oleada 5 = 0.28s, 1.5× tasa base
- Escala stats: `1 + 0.2*(wave-1)` HP, `1 + 0.1*(wave-1)` daño (básicos), escalados por tipo
- Spawn queue con delay variable, `waveSpawnTimer`, `waveEnemiesRemaining`

### 6.2 Boss Alvida (Oleada 5)
- **Fase 1** (100-60%): Melee + boomerang, telegraph slide
- **Fase 2** (60-30%): + dash melee, + disparos múltiples
- **Fase 3** (<30%): + zona lenta, + invulnerabilidad temporal, + spawns adds
- **Regla Sanji**: `en.isFemale=true` → ataque normal = 0 dmg + "¡No pateo damas! ♥", habilidades SÍ dañan

### 6.3 Sistema de Mejoras (Modal Seguro 3 Capas)
**Entre oleadas** (excepto oleada 5):
1. `STATE.screen='upgrades'` → `SAFE_UPGRADE_MODAL.open(choices)` (3 opciones aleatorias)
2. **Capa 1 - Bloqueo inicial** (0.40s `enterTimer`): overlay `.hud-modal-locked`, botones deshabilitados
3. **Capa 2 - Liberación tarjetas**: `fingerReleaseBuffer=0.30s` tras último toque → `unlocked=true`, animación `upgradeCardEnter` + `flash-ready`
4. **Capa 3 - Confirmación**: Tap tarjeta → `selected`, `dimmed` otras, botón `#btn-confirm-upgrade` visible → `confirmSelection()` → `applyConfirmedUpgrade(upg)` → cierra modal → `startWave(wave+1)`

**Pool Mejoras (9 opciones):**
| ID | Categoría | Efecto |
|----|-----------|--------|
| `off_norm` | Ofensiva | +22% dmg básico |
| `off_skill` | Ofensiva | +25% dmg habilidades |
| `off_crit` | Ofensiva | +18% crit (×1.5, Luffy PTS ×2.0) |
| `def_hp` | Defensiva | +35 maxHP +50 heal instant |
| `def_armor` | Defensiva | +10 ARM +4 HP/s regen |
| `mov_dash` | Movilidad | +1 carga dash, -20% CD dash |
| `mov_slow` | Movilidad | +12% SPD + estela lenta dash |
| `hab_h1cd` | Habilidad | -25% CD H1 + burn 5/s |
| `hab_h23` | Habilidad | H2 atraviesa escudos, H3 +30% área |
| `uti_berry` | Utilidad | +2 berries/enemigo + revela siguiente oleada |

**Sinergias:** Luffy (Gatling 15 hits + burn) con `off_skill` + `hab_h1cd`

---

## 7. VARIABLES/FUNCIONES CLAVE PARA RECONSTRUCCIÓN

### 7.1 Variables Críticas de Estado
```javascript
// Global
STATE.screen, STATE.charId, STATE.wave, STATE.mods, STATE.player

// Player crítico
p.x, p.y, p.hp, p.maxHp, p.baseDamage, p.facingAngle
p.attackCooldown, p.attackCooldownMax, p.comboStep, p.comboResetTimer
p.skillCds[3], p.skillMaxCds[3], p.dashCharges, p.maxDashCharges, p.dashCdTimer
p.invulnTimer, p.superArmorTimer, p.isDashing, p.dashTimer

// Legendarios
p.shanksHaki, p.shanksChainStep, p.shanksChainTimer, p.futureSightTimer
p.shanksChainStartX, p.shanksChainStartY, p.shanksChainDestX, p.shanksChainDestY, p.shanksChainCutAngle, p.shanksChainTravelDist
p.shanksH2PendingCircles[] // {x,y,delayTimer,durationTimer,maxDuration,radius,ticksLeft,tickTimer,tickInterval,damageMult,bleedPerTick,explosionRadiusBonus,explosionDamageMult,hasExploded,active}
p.luffyG2, p.gear2ndTimer, p.isChargingKKG, p.kkgChargeTimer, p.kkgTouchId, p.kkgTouchStartTime, p.kkgMouseHeld
p.ptsGatlingHitsLeft, p.ptsGatlingTotalHits, p.ptsGatlingTickTimer, p.ptsGatlingType, p.ptsGatlingAngle
p.whitebeardEnergy, p.wbJumpCharges, p.wbJumpCdTimer, p.quakeZoneTimer, p.quakeZoneDuration, p.wbJumpCharges, p.wbJumpCdTimer, p.wbIsJumping, p.wbJumpPhase, p.wbJumpTimer, p.wbJumpScale, p.wbRasetsuCutsLeft, p.wbRasetsuTimer, p.wbRasetsuAngle, p.wbQuakeAttackCd
p.roomTimer, p.roomRadius, p.scrap, p.kidRepelWindowTimer, p.punkRottenTimer, p.damnedPunkTimer
p.ensanamientoTimer, p.killerFrenzyTimer, p.killerHeartbeatTimer
```

### 7.2 Funciones Críticas a Reimplementar
```javascript
// Core
gameLoop(timestamp), update(dt), render(), renderCharacterPreviews(timeMs)
switchScreen(screenName), startNewRun(charId), startWave(w), spawnNextEnemyFromQueue()
update(dt) // con todos los bloques por personaje
render(), drawPlayer(), drawEnemy(en), drawSlashEffect(ef), renderCharacterPreviews()

// Input
bindActionButtons(), tryNormalAttack(), tryDash(), trySkill(idx)
checkOrientation(), dismissOrientation(), handleStartGame()

// Combate
trySkill(idx) // switch por charId -> idx
tryNormalAttack() // combo por charId
calculatePlayerDamage(baseMult, isSkill, forceCrit)
damageEnemy(en, amount, opts), damageEnemiesInCone/Line/Circle
applyBleed(en, stacks), applyKillerBleed, registerRobinHit

// Habilidades legendarias
updatePTSGatling(dt), updateShanksChainUI(), cancelWhitebeardQuakeZone()
releaseKingKongGun(), updateKidDamnedPunk(), updateLuffyGatling(), etc.

// IA
updateMarineAI(), updateAlvidaAI(), spawnNextEnemyFromQueue()

// UI/HUD
updateCooldownUI(), updatePlayerHUD(), updateCooldownUI() (legendarios)
switchScreen(), animateStatBars(), updatePlayerHUD(), updateCooldownUI()

// Utilidades
normalizeAngle(a), pointToSegmentDist(), findNearestEnemy(maxDist), findNearestEnemyInCone(maxDist, baseAngle, halfAngle)
spawnParticle(), spawnFloatingText(), triggerScreenShake(), triggerHaptic()
```

### 7.3 Renderizado de Efectos (`drawSlashEffect`)
Tipos: `ring`, `arc`, `arc_cross`, `arc_left`, `stretch`, `line`, `wb_fissure_wide`, `wb_haki_sweep`, `wb_fissure_ring`, `wb_seaquake_crack`, `massive_seaquake`, `shanks_electric_arc`, `shanks_h2_haki_circle`, `shanks_h2_haki_explosion`, `black_haki_ball`, `divine_x`, `kkg_impact`, `radical_beam`, `coup_de_vent`, `mil_fleur`, `gigantesco_mano`, `sanzen_final`, `expanding_red_arc`, `fissure_line`, `electric_slash`, `marine_saber_arc`

---

## 8. CSS/HTML CLAVES PARA RECONSTRUCCIÓN
- `.screen-modal` / `.screen-modal.active` (display:none/flex)
- `.action-cluster` + `#btn-attack` (100px), `#btn-dash` (74px), `.btn-skill` (62px)
- `.btn-3d.on-cooldown` (filter grayscale 0.8 brightness 0.6 + `.cd-overlay` conic-gradient)
- `.btn-skill.skill-locked` (filter grayscale 0.85 brightness 0.45 + `.lock-badge-overlay`)
- `.btn-skill.chain-active` (animación pulseChain)
- `#orientation-overlay.visible` (z-index 9999)
- `#hud-combat.hud-modal-locked` (opacity 0.3 + pointer-events none)
- `.upgrade-card.unlocked/.selected/.dimmed/.flash-ready`
- `.SAFE_UPGRADE_MODAL` 3 capas CSS: `.upgrade-lock-overlay`, `.upgrade-unlock-flash`, `.selected/.dimmed`

---

**Fin del documento.** Esta especificación contiene toda la información necesaria para reconstruir el `index.html` completo funcional v1.9f.