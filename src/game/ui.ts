import { CONFIG, RAREZAS, UPGRADE_POOL, TUTORIAL_STEPS } from './config';
import { STATE } from './state';
import { AUDIO, triggerHaptic } from './audio';
import { CAMERA } from './camera';
import { INPUT_TOUCH, clearAllHeldInputs } from './input';
import { startWave } from './entities';
import { buildCharacterContext } from './abilities';
import { CHARACTERS, CHARACTER_LIST, getCharacterModule } from './characters/index';
import type { ButtonUIHelpers } from './characters/types';
import { prerenderBackground } from './rendering';

// Sistema de Protección de 3 Capas para el Modal de Mejoras
export const SAFE_UPGRADE_MODAL = {
  activeTouches: new Set<any>(),
  isOpen: false,
  unlocked: false,
  enterTimer: 0,
  fingerReleaseBuffer: 0,
  selectedIndex: -1,
  choices: [] as any[],

  onTouchStart(id: any) {
    this.activeTouches.add(id);
    if (this.isOpen && !this.unlocked) {
      this.fingerReleaseBuffer = 0.30;
    }
  },

  onTouchEnd(id: any) {
    this.activeTouches.delete(id);
    if (this.isOpen && !this.unlocked && this.activeTouches.size === 0) {
      this.fingerReleaseBuffer = 0.30;
    }
  },

  open(choices: any[]) {
    this.isOpen = true;
    this.unlocked = false;
    this.enterTimer = 0.40;
    this.fingerReleaseBuffer = this.activeTouches.size > 0 ? 0.30 : 0.0;
    this.selectedIndex = -1;
    this.choices = choices;

    INPUT_TOUCH.attackHeld = false;
    INPUT_TOUCH.attackTouchId = null;
    INPUT_TOUCH.joystick.active = false;
    INPUT_TOUCH.joystick.magnitude = 0;

    document.getElementById('hud-combat')?.classList.add('hud-modal-locked');
    const btnConfirm = document.getElementById('btn-confirm-upgrade');
    btnConfirm?.classList.remove('visible');
  },

  close() {
    this.isOpen = false;
    this.unlocked = false;
    this.selectedIndex = -1;
    document.getElementById('hud-combat')?.classList.remove('hud-modal-locked');
    document.getElementById('btn-confirm-upgrade')?.classList.remove('visible');
  },

  update(dt: number) {
    if (!this.isOpen || this.unlocked) return;

    if (this.enterTimer > 0) {
      this.enterTimer = Math.max(0, this.enterTimer - dt);
    }

    if (this.activeTouches.size > 0) {
      this.fingerReleaseBuffer = 0.30;
    } else if (this.fingerReleaseBuffer > 0) {
      this.fingerReleaseBuffer = Math.max(0, this.fingerReleaseBuffer - dt);
    }

    if (this.enterTimer <= 0 && this.activeTouches.size === 0 && this.fingerReleaseBuffer <= 0) {
      this.unlockCards();
    }
  },

  unlockCards() {
    this.unlocked = true;
    const cards = document.querySelectorAll('#upgrade-cards-container .upgrade-card');
    cards.forEach(c => {
      c.classList.add('unlocked', 'flash-ready');
    });
  },

  handleCardTap(index: number) {
    if (!this.isOpen || !this.unlocked) return;
    AUDIO.playUIClick();
    triggerHaptic(12);
    this.selectedIndex = index;

    const cards = document.querySelectorAll('#upgrade-cards-container .upgrade-card');
    cards.forEach((c, idx) => {
      c.classList.toggle('selected', idx === index);
      c.classList.toggle('dimmed', idx !== index);
    });

    const btnConfirm = document.getElementById('btn-confirm-upgrade');
    btnConfirm?.classList.add('visible');
  },

  confirmSelection() {
    if (!this.isOpen || !this.unlocked || this.selectedIndex < 0) return;
    const chosen = this.choices[this.selectedIndex];
    this.close();
    if (chosen) {
      applyConfirmedUpgrade(chosen);
    }
  }
};

export function startTutorialIfFirstTime(): void {
  if (STATE.tutorial.shown) return;
  STATE.tutorial.shown = true;
  STATE.tutorial.active = true;
  STATE.tutorial.step = 0;
  showTutorialStep(0);
}

export function showTutorialStep(idx: number): void {
  const el = document.getElementById('tutorial-tooltip');
  if (!el) return;
  if (idx >= TUTORIAL_STEPS.length) {
    STATE.tutorial.active = false;
    el.style.display = 'none';
    return;
  }
  const st = TUTORIAL_STEPS[idx];
  el.textContent = st.text;
  el.style.left = st.left;
  el.style.right = st.right;
  el.style.bottom = st.bottom;
  el.style.display = 'block';
  STATE.tutorial.timer = 3.5;
}

export function advanceTutorialStep(): void {
  if (!STATE.tutorial.active) return;
  STATE.tutorial.step++;
  showTutorialStep(STATE.tutorial.step);
}

// ==========================================================================
// 6. UPGRADES: Modal Seguro
// ==========================================================================

export function showUpgradeSelection(): void {
  STATE.screen = 'upgrades';
  document.body.dataset.state = 'upgrades';
  const container = document.getElementById('upgrade-cards-container');
  if (!container) return;
  container.innerHTML = '';

  const shuffled = [...UPGRADE_POOL].sort(() => Math.random() - 0.5);
  const choices = shuffled.slice(0, 3);

  SAFE_UPGRADE_MODAL.open(choices);

  choices.forEach((upg, index) => {
    const card = document.createElement('div');
    card.className = 'upgrade-card entering';
    card.style.borderColor = upg.catColor;
    card.innerHTML = `
      <div class="upgrade-lock-overlay"></div>
      <div class="upgrade-lock-icon">🔒</div>
      <div class="upgrade-unlock-flash"></div>
      <span class="upg-cat-badge" style="background:${upg.catColor}">${upg.cat}</span>
      <div class="upg-icon">${upg.icon}</div>
      <div>
        <div class="upg-name">${upg.name}</div>
        <div class="upg-desc">${upg.desc}</div>
      </div>
    `;

    const onTapCard = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      SAFE_UPGRADE_MODAL.handleCardTap(index);
    };
    card.addEventListener('touchstart', onTapCard, { passive: false });
    card.addEventListener('click', onTapCard);
    container.appendChild(card);
  });

  const previewEl = document.getElementById('next-wave-preview');
  if (previewEl) {
    if (STATE.mods.scoutNextWave) {
      const nextW = STATE.wave + 1;
      previewEl.style.display = 'block';
      previewEl.textContent = nextW === 5
        ? '🔭 Vigía: ¡La Capitana Alvida y su guardia élite te esperan!'
        : `🔭 Vigía: Oleada ${nextW} tendrá ${Math.round((3 + 2 * nextW) * 1.5)} Marines variados.`;
    } else {
      previewEl.style.display = 'none';
    }
  }

  document.getElementById('screen-upgrades')?.classList.add('active');
}

export function applyConfirmedUpgrade(upg: any): void {
  AUDIO.playUpgrade();
  upg.apply(STATE);
  STATE.mods.acquiredIds.push(upg.id);
  updatePlayerHUD();

  document.getElementById('screen-upgrades')?.classList.remove('active');
  STATE.screen = 'playing';

  getCharacterModule(STATE.charId).onUpgradeApplied?.(buildCharacterContext());

  startWave(STATE.wave + 1);
}

export function animateStatBars(): void {
  document.querySelectorAll('.stat-fill').forEach(bar => {
    const el = bar as HTMLElement;
    el.style.width = '0%';
    requestAnimationFrame(() => {
      el.style.width = el.getAttribute('data-stat-w') || '0%';
    });
  });
}

export function updatePlayerHUD(): void {
  const p = STATE.player;
  const ratio = Math.max(0, p.hp / p.maxHp);
  const fill = document.getElementById('hud-hp-fill');
  if (fill) {
    fill.style.width = `${ratio * 100}%`;
    if (ratio > 0.5) fill.style.backgroundColor = '#4CAF50';
    else if (ratio > 0.25) fill.style.backgroundColor = '#FFC107';
    else fill.style.backgroundColor = '#F44336';
  }

  const hpText = document.getElementById('hud-hp-text');
  if (hpText) hpText.textContent = `${Math.ceil(p.hp)}/${p.maxHp}`;
}

export function updateCharacterHUD(): void {
  const charMod = getCharacterModule(STATE.charId);
  charMod.updateHUD?.(STATE.player);
}

export function updateWaveHUD(): void {
  const waveEl = document.getElementById('hud-wave-text');
  const enemiesEl = document.getElementById('hud-enemies-text');
  if (waveEl) waveEl.textContent = `OLEADA ${STATE.wave} / ${CONFIG.MAX_WAVES}`;
  if (enemiesEl) {
    enemiesEl.textContent =
      STATE.wave === 5 ? '¡Derrota a la Capitana Alvida!' : `Enemigos restantes: ${STATE.waveEnemiesRemaining}`;
  }
}

export function updateBossHUD(boss: any): void {
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const fill = document.getElementById('boss-hp-fill');
  if (fill) fill.style.width = `${ratio * 100}%`;
}

export function updateCooldownUI(): void {
  const p = STATE.player;
  const charMod = getCharacterModule(STATE.charId);

  const btnAttack = document.getElementById('btn-attack');
  const cdAttack = document.getElementById('cd-attack');
  if (btnAttack && cdAttack) {
    if (charMod.isAttackCooldownVisible?.(p)) {
      btnAttack.classList.add('on-cooldown');
      const deg = Math.round((p.attackCooldown / (p.attackCooldownMax || 0.6)) * 360);
      cdAttack.style.background = `conic-gradient(rgba(0,0,0,0.65) 0deg, rgba(0,0,0,0.65) ${deg}deg, transparent ${deg}deg)`;
      cdAttack.textContent = p.attackCooldown.toFixed(1);
    } else {
      btnAttack.classList.remove('on-cooldown');
      cdAttack.textContent = '';
    }
  }

  const renderSkillCooldown = (
    idx: number,
    rem: number,
    maxCd: number,
    isSpecialReady: boolean
  ): void => {
    const btn = document.getElementById(`btn-h${idx + 1}`);
    const cdEl = document.getElementById(`cd-h${idx + 1}`);
    if (!btn || !cdEl) return;

    if (rem > 0 && !isSpecialReady) {
      btn.classList.add('on-cooldown');
      const deg = Math.round((rem / Math.max(0.01, maxCd)) * 360);
      cdEl.style.background = `conic-gradient(rgba(0,0,0,0.75) 0deg, rgba(0,0,0,0.75) ${deg}deg, transparent ${deg}deg)`;
      cdEl.textContent = rem.toFixed(1);
    } else {
      btn.classList.remove('on-cooldown');
      cdEl.textContent = '';
    }
  };

  for (let i = 0; i < 3; i++) {
    const defaultMaxCd = p.skillMaxCds[i] * (i === 0 ? STATE.mods.h1CdMult : 1);
    renderSkillCooldown(i, p.skillCds[i], defaultMaxCd, false);
  }

  const helpers: ButtonUIHelpers = {
    setSkillCooldownOverride: (idx, rem, maxCd, isSpecialReady) => {
      const defaultMaxCd = p.skillMaxCds[idx] * (idx === 0 ? STATE.mods.h1CdMult : 1);
      renderSkillCooldown(
        idx,
        rem ?? p.skillCds[idx],
        maxCd ?? defaultMaxCd,
        Boolean(isSpecialReady)
      );
    },
    getBtn: (idx) => document.getElementById(`btn-h${idx + 1}`),
    getIcon: (idx) => document.getElementById(`icon-h${idx + 1}`),
    getLabel: (idx) => document.getElementById(`lbl-h${idx + 1}`),
    getCdEl: (idx) => document.getElementById(`cd-h${idx + 1}`),
    dashBtn: document.getElementById('btn-dash')
  };
  charMod.updateButtonsUI?.(p, helpers);

  const btnDash = document.getElementById('btn-dash');
  const cdDash = document.getElementById('cd-dash');
  const badge = document.getElementById('dash-charges-badge');
  if (badge) {
    if (p.maxDashCharges > 1) {
      badge.style.display = 'flex';
      badge.textContent = String(p.dashCharges);
    } else {
      badge.style.display = 'none';
    }
  }

  if (btnDash && cdDash) {
    const holdDashActive = Boolean(charMod.isHoldDashActive?.(p));
    if (holdDashActive) {
      btnDash.classList.remove('on-cooldown');
      btnDash.classList.add('chain-active');
      cdDash.style.background = '';
      cdDash.textContent = '';
    } else if (p.dashCharges === 0 && p.dashCdTimer > 0) {
      btnDash.classList.remove('chain-active');
      btnDash.classList.add('on-cooldown');
      const maxD = p.dashCdMax * STATE.mods.dashCdMult;
      const deg = Math.round((p.dashCdTimer / maxD) * 360);
      cdDash.style.background = `conic-gradient(rgba(0,0,0,0.75) 0deg, rgba(0,0,0,0.75) ${deg}deg, transparent ${deg}deg)`;
      cdDash.textContent = p.dashCdTimer.toFixed(1);
    } else {
      btnDash.classList.remove('chain-active');
      btnDash.classList.remove('on-cooldown');
      cdDash.style.background = '';
      cdDash.textContent = '';
    }
  }
}

// ==========================================================================
// CONTROL DE FLUJO DE PANTALLAS, CARROUSEL DE 12 PERSONAJES Y MULTIPLICADOR
// ==========================================================================
export function switchScreen(screenName: string): void {
  STATE.screen = screenName;
  document.body.dataset.state = screenName;
  clearAllHeldInputs();
  if (screenName === 'playing' && document.activeElement && typeof (document.activeElement as HTMLElement).blur === 'function') {
    (document.activeElement as HTMLElement).blur();
  }
  document.querySelectorAll('.screen-modal').forEach(m => m.classList.remove('active'));
  const hudCombat = document.getElementById('hud-combat');
  if (hudCombat) hudCombat.style.display = (screenName === 'playing' || screenName === 'upgrades') ? 'block' : 'none';

  const target = document.getElementById('screen-' + screenName);
  if (target) target.classList.add('active');
  else if (screenName !== 'playing') console.warn('Screen not found:', 'screen-' + screenName);

  if (screenName === 'select') animateStatBars();
}

export function startNewRun(charId: string): void {
  AUDIO.unlock();
  getCharacterModule(STATE.charId).onCleanupEffects?.(STATE.player);

  STATE.charId = charId;
  const cfg = getCharacterModule(charId);
  const rar = RAREZAS[cfg.rarity] || RAREZAS.comun;
  const mult = rar.multiplicadorStats;

  const effectiveHp = Math.round(cfg.hp * mult);
  const effectiveDamage = Number((cfg.damage * mult).toFixed(2));
  const effectiveArmor = Number((cfg.armor * mult).toFixed(2));

  STATE.wave = 1;
  STATE.berries = 0;
  STATE.berriesCollectedRun = 0;
  STATE.killsRun = 0;
  STATE.hitstopTimer = 0;
  STATE.shakeTimer = 0;
  STATE.timeSinceLastCombat = 0;
  STATE.waveClearPending = false;
  STATE.waveClearDelayTimer = 0;

  STATE.mods = {
    acquiredIds: [],
    normalDmgPct: 0,
    skillDmgPct: 0,
    critChance: 0.05,
    outOfCombatRegen: 0,
    dashCdMult: 1.0,
    dashSlowTrail: false,
    h1CdMult: 1.0,
    h1Burn: false,
    h2PierceShield: false,
    h3AreaMult: 1.0,
    bonusBerries: 0,
    scoutNextWave: false
  };

  const p = STATE.player;
  p.x = CONFIG.WORLD_WIDTH / 2;
  p.y = CONFIG.WORLD_HEIGHT / 2;
  p.vx = 0; p.vy = 0;
  p.facingAngle = 0;
  p.hp = effectiveHp;
  p.maxHp = effectiveHp;
  p.baseDamage = effectiveDamage;
  p.speed = cfg.speed * 52;
  p.armor = effectiveArmor;
  p.invulnTimer = 0; p.slowTimer = 0; p.speedBuffTimer = 0;
  p.comboStep = 0; p.comboResetTimer = 0;
  p.attackCooldown = 0; p.attackCooldownMax = 0.21; p.attackAnimTimer = 0;
  p.momentumTimer = 0; p.superArmorTimer = 0;

  const initialDashCharges = cfg.initialDashCharges ?? 1;
  p.dashCdMax = cfg.dashCd;
  p.dashCdTimer = 0;
  p.dashCharges = initialDashCharges;
  p.maxDashCharges = initialDashCharges;
  p.isDashing = false;
  p.dashDurationMax = CONFIG.DASH_DURATION;
  p.dashHitEnemyIds = [];

  p.skillCds = [0, 0, 0];
  p.skillMaxCds = cfg.skills.map((s) => s.cd);
  p.visualScaleX = 1.0;
  p.visualScaleY = 1.0;
  p.landSquashTimer = 0;
  p.stepDustTimer = 0;
  p.custom = cfg.createCustomState();

  const frenzyVig = document.getElementById('frenzy-vignette');
  if (frenzyVig) frenzyVig.style.display = 'none';

  for (let i = 1; i <= 3; i++) {
    const btn = document.getElementById(`btn-h${i}`);
    const cdEl = document.getElementById(`cd-h${i}`);
    if (btn) btn.classList.remove('on-cooldown', 'skill-locked', 'chain-active', 'kid-repel-phase');
    if (cdEl) { cdEl.textContent = ''; cdEl.style.background = ''; }
  }
  const btnAttack = document.getElementById('btn-attack');
  const cdAttack = document.getElementById('cd-attack');
  if (btnAttack) btnAttack.classList.remove('on-cooldown');
  if (cdAttack) { cdAttack.textContent = ''; cdAttack.style.background = ''; }
  const btnDash = document.getElementById('btn-dash');
  const cdDash = document.getElementById('cd-dash');
  if (btnDash) btnDash.classList.remove('on-cooldown', 'skill-locked');
  if (cdDash) { cdDash.textContent = ''; cdDash.style.background = ''; }

  CAMERA.resetToPlayer();

  STATE.enemies = [];
  STATE.projectiles = [];
  STATE.berriesDrops = [];
  STATE.hazards = [];
  STATE.traps = [];
  STATE.pendingStrikes = [];
  STATE.afterimages = [];
  STATE.slashEffects = [];

  prerenderBackground(false);

  const portraitEl = document.getElementById('hud-portrait');
  if (portraitEl) {
    portraitEl.textContent = cfg.portrait;
    portraitEl.style.background = cfg.portraitBg || '#2A2A30';
  }
  const charNameEl = document.getElementById('hud-char-name');
  if (charNameEl) charNameEl.textContent = cfg.name;
  const hudRarity = document.getElementById('hud-rarity-badge');
  if (hudRarity) {
    hudRarity.textContent = rar.nombre;
    hudRarity.className = `hud-rarity-pill ${cfg.rarity} text-outline-sm`;
    if (cfg.rarity === 'legendario' || cfg.rarity === 'yonko') {
      hudRarity.style.backgroundColor = '';
      hudRarity.style.borderColor = '';
    } else {
      hudRarity.style.backgroundColor = rar.color;
      hudRarity.style.borderColor = rar.borde;
    }
  }

  const hudBerries = document.getElementById('hud-berries');
  if (hudBerries) hudBerries.textContent = '0';
  const iconAttack = document.getElementById('icon-attack');
  if (iconAttack) iconAttack.textContent = cfg.attackIcon;

  const cluster = document.getElementById('action-cluster');
  if (cluster) cluster.className = `action-cluster ${cfg.themeClass}`;
  cfg.skills.forEach((sk, idx) => {
    const iconEl = document.getElementById(`icon-h${idx + 1}`);
    const lblEl = document.getElementById(`lbl-h${idx + 1}`);
    if (iconEl) iconEl.textContent = sk.icon;
    if (lblEl) lblEl.textContent = sk.name;
  });

  const hudSlot = document.getElementById('char-hud-slot');
  const hudExtra = document.getElementById('char-hud-extra');
  if (hudSlot) hudSlot.innerHTML = '';
  if (hudExtra) hudExtra.innerHTML = '';
  if (hudSlot && hudExtra) {
    cfg.mountHUD?.(hudSlot, hudExtra, buildCharacterContext());
  }

  SAFE_UPGRADE_MODAL.close();
  updatePlayerHUD();
  updateCharacterHUD();
  updateCooldownUI();
  switchScreen('playing');
  startWave(1);
  startTutorialIfFirstTime();
}

export function triggerGameOver(): void {
  AUDIO.playDefeat();
  SAFE_UPGRADE_MODAL.close();
  getCharacterModule(STATE.charId).onCleanupEffects?.(STATE.player);
  const frenzyVig = document.getElementById('frenzy-vignette');
  if (frenzyVig) frenzyVig.style.display = 'none';
  const infoEl = document.getElementById('gameover-info');
  if (infoEl) {
    infoEl.textContent =
      `Oleada alcanzada: ${STATE.wave}/${CONFIG.MAX_WAVES} • Enemigos derrotados: ${STATE.killsRun} • Berries: ${STATE.berriesCollectedRun}`;
  }
  switchScreen('gameover');
}

export function triggerVictory(): void {
  AUDIO.playVictory();
  SAFE_UPGRADE_MODAL.close();
  getCharacterModule(STATE.charId).onCleanupEffects?.(STATE.player);
  const frenzyVig = document.getElementById('frenzy-vignette');
  if (frenzyVig) frenzyVig.style.display = 'none';
  STATE.permBonusDmg += 0.05;
  prerenderBackground(true);
  const victoryInfo = document.getElementById('victory-info');
  if (victoryInfo) {
    victoryInfo.textContent =
      `¡Alvida ha sido derrotada! Enemigos: ${STATE.killsRun} • Berries: ${STATE.berriesCollectedRun}`;
  }
  const victoryReward = document.getElementById('victory-reward-text');
  if (victoryReward) {
    victoryReward.textContent =
      `+5% Daño Base Permanente (Total: +${Math.round(STATE.permBonusDmg * 100)}%) • Siguiente ruta: Orange Town (Buggy)`;
  }
  switchScreen('victory');
}

let startTriggered = false;
export function handleStartGame(e?: Event): void {
  if (e) e.preventDefault();
  if (startTriggered) return;
  startTriggered = true;
  AUDIO.unlock();
  AUDIO.playUIClick();
  triggerHaptic(15);
  try {
    switchScreen('select');
  } catch (_err) {
    document.querySelectorAll('.screen-modal').forEach(m => m.classList.remove('active'));
    const sel = document.getElementById('screen-select');
    if (sel) sel.classList.add('active');
  }
  setTimeout(() => { startTriggered = false; }, 200);
}

function renderCharacterSelectCards(): void {
  const carouselEl = document.getElementById('char-carousel');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!carouselEl || !dotsContainer) return;

  carouselEl.innerHTML = '';
  dotsContainer.innerHTML = '';

  CHARACTER_LIST.forEach((mod, idx) => {
    const rar = RAREZAS[mod.rarity] || RAREZAS.comun;
    const displayName = mod.cardMeta.displayName || mod.name;
    const zarparName = mod.cardMeta.zarparName || displayName;
    const comboHtml = mod.cardMeta.comboDesc.startsWith('<b>')
      ? mod.cardMeta.comboDesc
      : `<b>Combo:</b> ${mod.cardMeta.comboDesc}`;

    const card = document.createElement('div');
    card.className = `char-card rarity-${mod.rarity}${idx === 0 ? ' expanded' : ''}`;
    card.setAttribute('data-char', mod.id);
    card.setAttribute('data-index', String(idx));

    const pillsHtml = mod.skills
      .map((sk) => `<div class="skill-pill">${sk.icon} ${sk.name}</div>`)
      .join('');

    card.innerHTML = `
      <span class="rarity-badge ${mod.rarity} text-outline-sm">${rar.nombre}</span>
      <div class="char-card-body">
        <div class="char-card-top">
          <canvas id="preview-${mod.id}" class="char-preview-canvas" width="52" height="52"></canvas>
          <div>
            <div style="font-weight: 900; font-size: 15px; color: ${mod.cardMeta.nameColor};" class="text-outline-sm">${displayName}</div>
            <div style="font-size: 10px; color: #F4E4C1; font-weight: 700;">${mod.cardMeta.role}</div>
            <div style="font-size: 9px; color: ${mod.cardMeta.passiveColor};">${mod.cardMeta.passiveText}</div>
          </div>
        </div>
        <div class="stat-bars">
          <div class="stat-row"><span class="stat-label">❤️ HP</span><div class="stat-track"><div class="stat-fill" data-stat-w="${mod.cardMeta.stats.hp}%" style="background:#4CAF50;"></div></div></div>
          <div class="stat-row"><span class="stat-label">⚔️ DMG</span><div class="stat-track"><div class="stat-fill" data-stat-w="${mod.cardMeta.stats.dmg}%" style="background:#F44336;"></div></div></div>
          <div class="stat-row"><span class="stat-label">👟 VEL</span><div class="stat-track"><div class="stat-fill" data-stat-w="${mod.cardMeta.stats.vel}%" style="background:#29B6F6;"></div></div></div>
          <div class="stat-row"><span class="stat-label">🛡️ ARM</span><div class="stat-track"><div class="stat-fill" data-stat-w="${mod.cardMeta.stats.arm}%" style="background:#90A4AE;"></div></div></div>
        </div>
        <div class="skill-pills">${pillsHtml}</div>
        <div class="char-details-box">
          ${comboHtml}<br>
          ${mod.cardMeta.skillsDesc}
        </div>
      </div>
      <div class="btn-3d btn-gold btn-zarpar text-outline-sm">¡ZARPAR CON ${zarparName}!</div>
    `;
    carouselEl.appendChild(card);

    const dot = document.createElement('div');
    dot.className = `carousel-dot${idx === 0 ? ' active' : ''}`;
    dot.setAttribute('data-dot', String(idx));
    dotsContainer.appendChild(dot);
  });
}

let uiInitialized = false;

export function initUI(): void {
  if (uiInitialized) return;
  uiInitialized = true;

  renderCharacterSelectCards();

  let orientationDismissed = false;
  function checkOrientation() {
    if (orientationDismissed) return;
    const overlay = document.getElementById('orientation-overlay');
    if (!overlay) return;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isTouchDevice && isPortrait) {
      overlay.classList.add('visible');
    } else {
      overlay.classList.remove('visible');
    }
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', () => {
    orientationDismissed = false;
    checkOrientation();
  });
  checkOrientation();
  setTimeout(checkOrientation, 100);
  setTimeout(checkOrientation, 500);

  const btnForceLandscape = document.getElementById('btn-force-landscape');
  const dismissOrientation = (e?: Event) => {
    if (e) e.preventDefault();
    orientationDismissed = true;
    const overlay = document.getElementById('orientation-overlay');
    if (overlay) overlay.classList.remove('visible');
    AUDIO.unlock();
  };
  if (btnForceLandscape) {
    btnForceLandscape.addEventListener('touchstart', dismissOrientation, { passive: false });
    btnForceLandscape.addEventListener('click', dismissOrientation);
  }

  const btnStartGame = document.getElementById('btn-start-game');
  if (btnStartGame) {
    btnStartGame.addEventListener('touchstart', handleStartGame, { passive: false });
    btnStartGame.addEventListener('click', handleStartGame);
  }

  const carouselEl = document.getElementById('char-carousel');
  const dotsEls = document.querySelectorAll('#carousel-dots .carousel-dot');
  const charCards = document.querySelectorAll('#char-carousel .char-card');

  function updateCarouselActiveDot() {
    if (!carouselEl) return;
    const center = carouselEl.scrollLeft + carouselEl.clientWidth / 2;
    let closestIdx = 0;
    let minDiff = Infinity;
    charCards.forEach((card, idx) => {
      const el = card as HTMLElement;
      const cardCenter = el.offsetLeft + el.offsetWidth / 2;
      const diff = Math.abs(center - cardCenter);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    dotsEls.forEach((d, idx) => {
      d.classList.toggle('active', idx === closestIdx);
    });
    charCards.forEach((c, idx) => {
      c.classList.toggle('expanded', idx === closestIdx);
    });
  }

  if (carouselEl) {
    carouselEl.addEventListener('scroll', updateCarouselActiveDot, { passive: true });
  }

  dotsEls.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      AUDIO.unlock();
      AUDIO.playUIClick();
      const targetCard = charCards[idx];
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  });

  let cardTouchStartX = 0;
  let cardTouchStartY = 0;
  let isLaunchingChar = false;

  function launchCharacterFromCard(card: Element, charId: string) {
    if (isLaunchingChar) return;
    isLaunchingChar = true;
    AUDIO.unlock();
    AUDIO.playUIClick();
    triggerHaptic(20);
    card.classList.add('selected-flash');
    setTimeout(() => {
      card.classList.remove('selected-flash');
      isLaunchingChar = false;
      startNewRun(charId);
    }, 140);
  }

  charCards.forEach((card) => {
    const charId = card.getAttribute('data-char') || 'luffy';
    const zarparBtn = card.querySelector('.btn-zarpar');

    card.addEventListener('touchstart', (e: Event) => {
      const te = e as TouchEvent;
      if (te.touches.length > 0) {
        cardTouchStartX = te.touches[0].clientX;
        cardTouchStartY = te.touches[0].clientY;
      }
    }, { passive: true });

    card.addEventListener('touchend', (e: Event) => {
      const te = e as TouchEvent;
      if (te.changedTouches.length === 0) return;
      const dx = Math.abs(te.changedTouches[0].clientX - cardTouchStartX);
      const dy = Math.abs(te.changedTouches[0].clientY - cardTouchStartY);
      if (dx < 14 && dy < 14) {
        const target = te.target as Element | null;
        if (target && (target.closest('.btn-zarpar') || !target.closest('.char-details-box'))) {
          te.preventDefault();
          launchCharacterFromCard(card, charId);
        }
      }
    }, { passive: false });

    if (zarparBtn) {
      zarparBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        launchCharacterFromCard(card, charId);
      });
    }

    card.addEventListener('click', (e) => {
      const target = e.target as Element | null;
      if (target && target.closest('.char-details-box')) return;
      launchCharacterFromCard(card, charId);
    });
  });

  const btnConfirmUpg = document.getElementById('btn-confirm-upgrade');
  if (btnConfirmUpg) {
    btnConfirmUpg.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      SAFE_UPGRADE_MODAL.confirmSelection();
    }, { passive: false });
    btnConfirmUpg.addEventListener('click', (e) => {
      e.stopPropagation();
      SAFE_UPGRADE_MODAL.confirmSelection();
    });
  }

  const openPauseModal = (e?: Event) => {
    if (e) e.preventDefault();
    if (STATE.screen !== 'playing') return;
    AUDIO.playUIClick();
    const pauseStats = document.getElementById('pause-stats');
    if (pauseStats) {
      pauseStats.textContent =
        `Pirata: ${CHARACTERS[STATE.charId].name} • Oleada: ${STATE.wave}/${CONFIG.MAX_WAVES} • Mejoras: ${STATE.mods.acquiredIds.length}`;
    }
    switchScreen('pause');
  };
  document.getElementById('btn-pause')?.addEventListener('touchstart', openPauseModal, { passive: false });
  document.getElementById('btn-pause')?.addEventListener('click', openPauseModal);

  const openSettingsModal = (e?: Event) => {
    if (e) e.preventDefault();
    if (STATE.screen !== 'playing') return;
    AUDIO.playUIClick();
    const restartBox = document.getElementById('restart-confirm-box');
    if (restartBox) restartBox.style.display = 'none';
    switchScreen('settings');
  };
  document.getElementById('btn-settings')?.addEventListener('touchstart', openSettingsModal, { passive: false });
  document.getElementById('btn-settings')?.addEventListener('click', openSettingsModal);

  document.getElementById('slider-sfx')?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    STATE.settings.sfxVolume = val / 100;
    const lbl = document.getElementById('lbl-sfx-vol');
    if (lbl) lbl.textContent = `${val}%`;
  });
  document.getElementById('slider-music')?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    STATE.settings.musicVolume = val / 100;
    const lbl = document.getElementById('lbl-music-vol');
    if (lbl) lbl.textContent = `${val}%`;
  });
  document.getElementById('btn-toggle-vibe')?.addEventListener('click', (e) => {
    STATE.settings.vibration = !STATE.settings.vibration;
    const target = e.target as HTMLElement;
    target.textContent = STATE.settings.vibration ? 'ACTIVADA' : 'DESACTIVADA';
    AUDIO.playUIClick();
  });
  document.getElementById('btn-open-restart')?.addEventListener('click', () => {
    AUDIO.playUIClick();
    const restartBox = document.getElementById('restart-confirm-box');
    if (restartBox) restartBox.style.display = 'block';
  });
  document.getElementById('btn-cancel-restart')?.addEventListener('click', () => {
    AUDIO.playUIClick();
    const restartBox = document.getElementById('restart-confirm-box');
    if (restartBox) restartBox.style.display = 'none';
  });
  document.getElementById('btn-confirm-restart')?.addEventListener('click', () => {
    AUDIO.playUIClick();
    startNewRun(STATE.charId);
  });
  document.getElementById('btn-close-settings')?.addEventListener('click', () => {
    AUDIO.playUIClick();
    switchScreen('playing');
  });

  document.getElementById('btn-resume')?.addEventListener('click', () => { AUDIO.playUIClick(); switchScreen('playing'); });
  document.getElementById('btn-quit')?.addEventListener('click', () => { AUDIO.playUIClick(); switchScreen('menu'); });
  document.getElementById('btn-retry')?.addEventListener('click', () => { AUDIO.playUIClick(); switchScreen('select'); });
  document.getElementById('btn-play-again')?.addEventListener('click', () => { AUDIO.playUIClick(); switchScreen('select'); });
}
