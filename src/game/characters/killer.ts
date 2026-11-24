import { CONFIG } from '../config';
import { STATE } from '../state';
import type { CharacterModule } from './types';

export const killerCharacter: CharacterModule = {
  id: 'killer',
  name: 'KILLER',
  rarity: 'epico',
  portrait: '🎭',
  portraitBg: '#7F0000',
  attackIcon: '⚔️',
  themeClass: 'theme-killer',
  color: '#FF5252',
  vestColor: '#1A237E',
  hp: 95,
  damage: 8,
  speed: 7.0,
  armor: 5,
  dashCd: 1.8,
  initialDashCharges: 2,
  skills: [
    { name: 'Sonic Scythe', icon: '🌀', cd: 1.5 },
    { name: 'Bloodlust', icon: '🩸', cd: 10.0 },
    { name: 'Killer Frenzy', icon: '👹', cd: 20.0 }
  ],
  cardMeta: {
    nameColor: '#FF8A80',
    role: 'DPS Sangrado / Frenesí',
    passiveText: 'Pasiva: Sangrado 5 stacks = Desgarro 5×',
    passiveColor: '#FFCDD2',
    stats: { hp: 63, dmg: 37, vel: 100, arm: 26 },
    comboDesc: '<b>Dash:</b> 2 cargas voltereta + sangrado. <b>Combo 5:</b> Onda sangra.',
    skillsDesc: '<b>H1:</b> Corte 1.5s (+2 stacks) • <b>H2:</b> Bloodlust • <b>H3:</b> Frenzy 2× dmg + rompe escudo.'
  },

  createCustomState: () => ({
    ensanamientoTimer: 0,
    killerFrenzyTimer: 0,
    killerHeartbeatTimer: 0
  }),

  pierceShieldOnBleedRupture: (p) => p.custom.killerFrenzyTimer > 0,

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 5;

    const atkSpdMult = p.custom.ensanamientoTimer > 0 ? 1.15 : 1.0;
    p.attackCooldown = (step === 4 ? 0.20 : 0.11) / atkSpdMult;
    p.comboResetTimer = 0.32;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    const isFrenzy = p.custom.killerFrenzyTimer > 0;
    const isEnsanamiento = p.custom.ensanamientoTimer > 0;
    const bleedStacksPerHit = isFrenzy || isEnsanamiento ? 1 : 0;

    if (step < 4) {
      audio.playSlash(1.25);
      const range = step === 3 ? 90 : 85;
      const halfAng = step === 3 ? Math.PI * 0.85 : Math.PI / 3.5;
      const slashType = step === 0 ? 'arc' : step === 1 ? 'arc_left' : step === 2 ? 'arc_cross' : 'ring';
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range,
        isCircular: step === 3,
        color: isFrenzy || isEnsanamiento ? '#FF1744' : '#9FA8DA',
        life: 0.12,
        maxLife: 0.12,
        type: slashType
      });
      const hitConnected = ctx.damageEnemiesInCone(p.x, p.y, aimAngle, range, halfAng, 0.6, 12, false, 0, 0, {
        pierceShield: isFrenzy,
        killerBleedStacks: bleedStacksPerHit
      });
      if (hitConnected) {
        state.hitstopTimer = 0.03;
      }
    } else {
      audio.playShing();
      audio.playSlash(1.45);
      const halfAng = (30 * Math.PI) / 180;
      const fifthBleedStacks = isFrenzy ? 3 : isEnsanamiento ? 2 : 1;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 100,
        halfAngle: halfAng,
        color: isFrenzy ? '#FF1744' : '#FFFFFF',
        life: 0.22,
        maxLife: 0.22,
        type: 'sonic_wave_cone'
      });
      const hitConnected = ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 100, halfAng, 1.5, 45, false, 0, 0, {
        ignoreArmorPct: 0.30,
        pierceShield: isFrenzy,
        killerBleedStacks: fifthBleedStacks
      });
      if (hitConnected) {
        state.hitstopTimer = 0.03;
        ctx.triggerScreenShake(4, 0.10);
        ctx.triggerHaptic(12);
      }
    }
  },

  onDash(ctx) {
    const { state, player: p, audio } = ctx;
    p.customDashDist = 170;
    p.dashDurationMax = 0.25;
    p.invulnTimer = 0.15;
    audio.playDash();
    audio.playSlash(1.3);
    const endX = p.x + p.dashDirX * 170;
    const endY = p.y + p.dashDirY * 170;
    state.slashEffects.push({
      x: p.x,
      y: p.y,
      endX,
      endY,
      angle: p.facingAngle,
      range: 170,
      color: '#FF5252',
      life: 0.25,
      maxLife: 0.25,
      type: 'line'
    });
  },

  onDashHitEnemy(ctx, en) {
    const p = ctx.player;
    const { amount, isCrit } = ctx.calculatePlayerDamage(0.8, true);
    ctx.damageEnemy(en, amount, { isCrit, pierceShield: p.custom.killerFrenzyTimer > 0 });
    ctx.applyBleed(en, 1);
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const isFrenzy = p.custom.killerFrenzyTimer > 0;

    if (idx === 0) {
      audio.playShing();
      audio.playSlash(1.3);
      const dashDist = 100;
      const startX = p.x;
      const startY = p.y;
      const endX = Math.max(
        CONFIG.ARENA_MARGIN_X + p.radius,
        Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x + Math.cos(aimAngle) * dashDist)
      );
      const endY = Math.max(
        CONFIG.ARENA_MARGIN_Y + p.radius,
        Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y + Math.sin(aimAngle) * dashDist)
      );

      state.slashEffects.push({
        x: startX,
        y: startY,
        endX,
        endY,
        angle: aimAngle,
        range: dashDist,
        color: '#FF5252',
        life: 0.22,
        maxLife: 0.22,
        type: 'onigiri'
      });
      state.slashEffects.push({
        x: endX,
        y: endY,
        angle: 0,
        range: 60,
        isCircular: true,
        color: '#FFFFFF',
        life: 0.22,
        maxLife: 0.22,
        type: 'ring'
      });

      p.x = endX;
      p.y = endY;
      p.invulnTimer = Math.max(p.invulnTimer, 0.12);

      ctx.damageEnemiesInCircle(endX, endY, 60, 1.2, 20, true, 0, {
        pierceShield: isFrenzy,
        killerBleedStacks: 2
      });
    } else if (idx === 1) {
      audio.playShing();
      audio.playRoar();
      audio.playHeartbeat();
      p.custom.ensanamientoTimer = 4.0;
      p.custom.killerHeartbeatTimer = 0.65;
      for (let k = 0; k < 14; k++) ctx.spawnParticle(p.x, p.y, '#FF1744', 5, 0.45);
      ctx.spawnFloatingText(p.x, p.y - 44, '🩸 ¡BLOODLUST!', '#FF5252', 1.25);
    } else if (idx === 2) {
      audio.playRoar();
      audio.playShing();
      audio.playHeartbeat();
      ctx.triggerScreenShake(6, 0.22);
      if (p.custom.killerFrenzyTimer <= 0) {
        p.armor += 15;
      }
      p.custom.killerFrenzyTimer = 6.0;
      p.custom.killerHeartbeatTimer = 0.42;
      const frenzyEl = document.getElementById('frenzy-vignette');
      if (frenzyEl) frenzyEl.style.display = 'block';
      for (let k = 0; k < 22; k++) ctx.spawnParticle(p.x, p.y, '#D50000', 6, 0.55);
      ctx.spawnFloatingText(p.x, p.y - 48, '👹 ¡KILLER FRENZY!', '#FF1744', 1.35);
    }
  },

  onUpdate(ctx, dt) {
    const { player: p, audio } = ctx;
    if (p.custom.ensanamientoTimer > 0) {
      p.custom.ensanamientoTimer = Math.max(0, p.custom.ensanamientoTimer - dt);
      if (Math.random() < 0.45) ctx.spawnParticle(p.x, p.y, '#FF1744', 3.5, 0.25);
    }
    if (p.custom.killerFrenzyTimer > 0) {
      p.custom.killerFrenzyTimer -= dt;
      p.custom.killerHeartbeatTimer -= dt;
      if (p.custom.killerHeartbeatTimer <= 0) {
        p.custom.killerHeartbeatTimer = 0.55;
        audio.playHeartbeat();
      }
      if (Math.random() < 0.7) ctx.spawnParticle(p.x, p.y, '#D50000', 4.5, 0.3);
      if (p.custom.killerFrenzyTimer <= 0) {
        p.custom.killerFrenzyTimer = 0;
        p.armor = Math.max(0, p.armor - 15);
        const vig = document.getElementById('frenzy-vignette');
        if (vig) vig.style.display = 'none';
        audio.playExhale();
        ctx.spawnFloatingText(p.x, p.y - 42, 'Fin de Frenzy', '#CFD8DC', 0.95);
      }
    }
    ctx.updateHUD();
  },

  getMoveSpeedMult: (p) => (p.custom.killerFrenzyTimer > 0 ? 1.10 : 1.0),

  onCalculateDamage(p) {
    if (p.custom.killerFrenzyTimer > 0) return { dmgMult: 2.0 };
    return {};
  },

  onModifyDamageEnemy(p) {
    if (p.custom.killerFrenzyTimer > 0) return { pierceShield: true };
    return {};
  },

  onCleanupEffects() {
    const frenzyVig = document.getElementById('frenzy-vignette');
    if (frenzyVig) frenzyVig.style.display = 'none';
  },

  getBodySpin(p) {
    if (p.isDashing) {
      const progress = 1 - p.dashTimer / (p.dashDurationMax || 0.25);
      return progress * Math.PI * 2;
    }
    return 0;
  },

  mountHUD(slotEl) {
    slotEl.innerHTML = `
      <div id="killer-dash-hud" class="char-resource-hud" style="display:flex;">
        <span style="font-size:10px; font-weight:900; color:#FFCDD2;" class="text-outline-sm">DASH:</span>
        <div id="killer-dash-pip-0" class="killer-dash-pip ready">
          <span>💨</span>
          <div id="killer-dash-fill-0" class="killer-dash-pip-fill"></div>
        </div>
        <div id="killer-dash-pip-1" class="killer-dash-pip ready">
          <span>💨</span>
          <div id="killer-dash-fill-1" class="killer-dash-pip-fill"></div>
        </div>
        <span id="hud-killer-state-text" class="res-text text-outline-sm" style="color:#FF8A80;"></span>
      </div>
    `;
  },

  updateHUD(p) {
    const container = document.getElementById('killer-dash-hud');
    if (!container) return;
    container.style.display = 'flex';
    const maxD = p.dashCdMax * STATE.mods.dashCdMult;

    for (let i = 0; i < 2; i++) {
      const pip = document.getElementById(`killer-dash-pip-${i}`);
      const fill = document.getElementById(`killer-dash-fill-${i}`);
      if (!pip || !fill) continue;

      if (i < p.dashCharges) {
        pip.classList.add('ready');
        fill.style.background = 'transparent';
      } else if (i === p.dashCharges && p.dashCdTimer > 0) {
        pip.classList.remove('ready');
        const deg = Math.round((p.dashCdTimer / maxD) * 360);
        fill.style.background = `conic-gradient(rgba(0,0,0,0.8) 0deg, rgba(0,0,0,0.8) ${deg}deg, rgba(79,195,247,0.45) ${deg}deg)`;
      } else {
        pip.classList.remove('ready');
        fill.style.background = 'rgba(0,0,0,0.8)';
      }
    }

    const stateTxt = document.getElementById('hud-killer-state-text');
    if (stateTxt) {
      if (p.custom.killerFrenzyTimer > 0) {
        stateTxt.textContent = `👹 FRENZY ${p.custom.killerFrenzyTimer.toFixed(1)}s`;
      } else if (p.custom.ensanamientoTimer > 0) {
        stateTxt.textContent = `🩸 BLOODLUST ${p.custom.ensanamientoTimer.toFixed(1)}s`;
      } else {
        stateTxt.textContent = '';
      }
    }
  },

  drawAura({ ctx, player: p, t }) {
    if (p.custom.killerFrenzyTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 9 + Math.sin(t * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.custom.ensanamientoTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 82, 82, 0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  drawBody({ ctx, player: p, t }) {
    const isFrenzy = p.custom.killerFrenzyTimer > 0;
    const spin = isFrenzy ? t * 7.5 : t * 1.4;
    ctx.fillStyle = isFrenzy ? '#B71C1C' : '#1A237E';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(-3, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isFrenzy ? '#FFCDD2' : '#ECEFF1';
    ctx.beginPath();
    ctx.arc(4, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(Math.sin(spin) * 0.45);
    ctx.strokeStyle = isFrenzy ? '#FF1744' : '#E0E0E0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(12, -16, 10, -Math.PI * 0.4, Math.PI * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(12, 16, 10, -Math.PI * 0.5, Math.PI * 0.4);
    ctx.stroke();
    ctx.restore();
  },

  drawPreview(pctx, t) {
    const spin = Math.sin(t * 2.2) * 0.35;
    pctx.fillStyle = '#1A237E';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.ellipse(0, 3, 10, 12, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#FFD54F';
    pctx.beginPath();
    pctx.arc(0, -6, 12, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#ECEFF1';
    pctx.beginPath();
    pctx.arc(0, -6, 7.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.strokeStyle = '#1976D2';
    pctx.lineWidth = 1.5;
    pctx.beginPath();
    pctx.moveTo(-5, -8);
    pctx.lineTo(5, -4);
    pctx.moveTo(5, -8);
    pctx.lineTo(-5, -4);
    pctx.stroke();
    pctx.save();
    pctx.rotate(spin);
    pctx.strokeStyle = '#CFD8DC';
    pctx.lineWidth = 2.5;
    pctx.beginPath();
    pctx.arc(-15, 2, 7, -Math.PI * 0.5, Math.PI * 0.5);
    pctx.arc(15, 2, 7, Math.PI * 0.5, Math.PI * 1.5);
    pctx.stroke();
    pctx.restore();
  }
};
