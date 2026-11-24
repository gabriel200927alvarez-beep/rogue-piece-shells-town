import { CONFIG } from '../config';
import type { CharacterModule, CharacterContext } from './types';

function addKidScrap(ctx: CharacterContext, amount = 1): void {
  const { player: p, audio } = ctx;
  p.custom.scrap = Math.min(p.custom.maxScrap, p.custom.scrap + amount);
  if (p.custom.scrap >= 10) {
    p.custom.scrap -= 10;
    p.skillCds[0] = Math.max(0, p.skillCds[0] - 2.0);
    p.skillCds[1] = Math.max(0, p.skillCds[1] - 2.0);
    audio.playMetalClank();
    ctx.spawnFloatingText(p.x, p.y - 44, '🧲 ¡CHATARRA! -2s CD', '#FFD54F', 1.15);
  }
  ctx.updateHUD();
}

function updateKidH1PhaseUI(ctx: CharacterContext): void {
  const p = ctx.player;
  const btnH1 = document.getElementById('btn-h1');
  const iconH1 = document.getElementById('icon-h1');
  const lblH1 = document.getElementById('lbl-h1');
  if (!btnH1 || !iconH1 || !lblH1) return;

  if (p.custom.kidRepelWindowTimer > 0) {
    btnH1.classList.add('kid-repel-phase');
    iconH1.textContent = '💥';
    lblH1.textContent = `Repel ${p.custom.kidRepelWindowTimer.toFixed(1)}s`;
  } else {
    btnH1.classList.remove('kid-repel-phase');
    iconH1.textContent = '🧲';
    lblH1.textContent = 'Attract';
  }
}

export const kidCharacter: CharacterModule = {
  id: 'kid',
  name: 'EUSTASS KID',
  rarity: 'epico',
  portrait: '🦾',
  portraitBg: '#795548',
  attackIcon: '🦾',
  themeClass: 'theme-kid',
  color: '#D32F2F',
  vestColor: '#795548',
  hp: 150,
  damage: 12,
  speed: 4.5,
  armor: 12,
  dashCd: 2.5,
  skills: [
    { name: 'Attract', icon: '🧲', cd: 9.0 },
    { name: 'Punk Rotten', icon: '🤖', cd: 18.0 },
    { name: 'Damned Punk', icon: '⚡', cd: 14.0 }
  ],
  cardMeta: {
    nameColor: '#FF5252',
    role: 'Tanque Transformable',
    passiveText: 'Pasiva: Chatarra (-2s CD H1/H2)',
    passiveColor: '#FFD54F',
    stats: { hp: 100, dmg: 55, vel: 64, arm: 62 },
    comboDesc: '2 rectos + Barrido 120° (empuja + aturde).',
    skillsDesc: '<b>H1:</b> Attract → Repel • <b>H2:</b> Punk Rotten 1.5× • <b>H3:</b> Cañón Damned Punk (1.75×/tick).'
  },

  createCustomState: () => ({
    scrap: 0,
    maxScrap: 20,
    kidRepelWindowTimer: 0,
    punkRottenTimer: 0,
    punkRottenDurationMax: 8.0,
    punkRottenBuildTimer: 0,
    punkRottenPrevMaxCharges: 1,
    punkRottenPrevDashCdMax: 2.5,
    damnedPunkTimer: 0,
    damnedPunkTickTimer: 0,
    damnedPunkTicksLeft: 0,
    damnedPunkTarget: null,
    damnedPunkAngle: 0
  }),

  canUseSkill(ctx, idx) {
    const p = ctx.player;
    if (idx === 2 && p.custom.punkRottenTimer <= 0) {
      ctx.audio.playMetalClank();
      ctx.spawnFloatingText(p.x, p.y - 42, '🔒 Requiere Punk Rotten', '#FF8A80', 0.95);
      return false;
    }
    return true;
  },

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.attackCooldown = 0.50;
    p.comboResetTimer = 0.90;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    if (step === 2) {
      p.momentumTimer = 0.10;
      p.momentumDirX = Math.cos(aimAngle);
      p.momentumDirY = Math.sin(aimAngle);
      p.superArmorTimer = 0.15;
    }

    const isRotten = p.custom.punkRottenTimer > 0;
    const straightRange = isRotten ? 120 : 85;
    const sweepRange = isRotten ? 150 : 100;
    const sweepPush = isRotten ? 260 : 165;

    if (step === 0) {
      audio.playPunch(0.75);
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: straightRange,
        color: '#FF7043',
        life: 0.18,
        maxLife: 0.18,
        type: 'stretch'
      });
      const hitConnected = ctx.damageEnemiesInCone(p.x, p.y, aimAngle, straightRange, (26 * Math.PI) / 180, 1.2, 30);
      if (hitConnected) {
        state.hitstopTimer = 0.07;
        ctx.triggerHaptic(14);
      }
    } else if (step === 1) {
      audio.playMetalClank();
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: straightRange,
        color: '#D32F2F',
        life: 0.18,
        maxLife: 0.18,
        type: 'stretch'
      });
      const hitConnected = ctx.damageEnemiesInCone(p.x, p.y, aimAngle, straightRange, (28 * Math.PI) / 180, 1.2, 35);
      if (hitConnected) {
        state.hitstopTimer = 0.07;
        ctx.triggerHaptic(14);
      }
    } else {
      audio.playMetalClank();
      audio.playSlash(1.25);
      const halfAng = (60 * Math.PI) / 180;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: sweepRange,
        halfAngle: halfAng,
        color: '#FFC107',
        life: 0.26,
        maxLife: 0.26,
        type: 'kid_ground_sweep'
      });
      for (let k = 0; k < 10; k++) {
        const a = aimAngle + (Math.random() - 0.5) * halfAng * 1.8;
        const d = 30 + Math.random() * (sweepRange * 0.85);
        ctx.spawnParticle(
          p.x + Math.cos(a) * d,
          p.y + Math.sin(a) * d,
          k % 2 === 0 ? '#FFC107' : '#BDBDBD',
          4.5,
          0.35
        );
      }
      let sweptCount = 0;
      state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        const dx = en.x - p.x;
        const dy = en.y - p.y;
        if (
          Math.hypot(dx, dy) - en.radius <= sweepRange &&
          Math.abs(ctx.normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= halfAng
        ) {
          sweptCount++;
          const { amount, isCrit } = ctx.calculatePlayerDamage(1.8, false);
          ctx.damageEnemy(en, amount, {
            isCrit,
            knockback: sweepPush,
            sourceX: p.x,
            sourceY: p.y,
            stun: 0.5
          });
        }
      });
      if (sweptCount > 0) {
        addKidScrap(ctx, sweptCount);
        state.hitstopTimer = 0.07;
        ctx.triggerScreenShake(5, 0.14);
        ctx.triggerHaptic(18);
      }
    }
  },

  onDash(ctx) {
    const { player: p, audio } = ctx;
    p.customDashDist = p.custom.punkRottenTimer > 0 ? 80 : 130;
    p.invulnTimer = 0.20;
    audio.playDash();
    audio.playMetalClank();
    for (let i = 0; i < 8; i++) {
      ctx.spawnParticle(p.x, p.y, i % 2 === 0 ? '#D32F2F' : '#FFC107', 4.5, 0.3);
    }
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const applyBurnFromMod = idx === 0 && state.mods.h1Burn;

    if (idx === 0) {
      const isKidAttractPhase1 = p.custom.kidRepelWindowTimer <= 0;
      if (isKidAttractPhase1) {
        audio.playMagneticPull();
        audio.playMetalClank();
        const radius = 250;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: radius,
          isCircular: true,
          color: '#D32F2F',
          life: 0.32,
          maxLife: 0.32,
          type: 'magnetic_pull'
        });
        let pulledCount = 0;
        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          const d = Math.hypot(en.x - p.x, en.y - p.y);
          if (d - en.radius <= radius) {
            pulledCount++;
            const { amount, isCrit } = ctx.calculatePlayerDamage(1.0, true);
            ctx.damageEnemy(en, amount, { isCrit, applyBurn: applyBurnFromMod });
            if (!en.isBoss) {
              en.magnetPullTimer = 0.30;
              en.magnetPullSpeed = Math.min(120, Math.max(0, d - 34)) / 0.30;
            }
            for (let k = 0; k < 5; k++) ctx.spawnParticle(en.x, en.y, '#FFC107', 4, 0.3);
          }
        });
        if (pulledCount > 0) addKidScrap(ctx, pulledCount);

        p.custom.kidRepelWindowTimer = 3.0;
        updateKidH1PhaseUI(ctx);
        ctx.spawnFloatingText(p.x, p.y - 42, '🧲 ¡ATTRACT! (Repel listo)', '#FF5252', 1.15);
        return true; // defer CD until Repel or expiry
      } else {
        p.custom.kidRepelWindowTimer = 0;
        updateKidH1PhaseUI(ctx);
        audio.playFwoosh();
        audio.playExplosion(0.95);
        ctx.triggerScreenShake(6, 0.20);
        const radius = 200;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: radius,
          isCircular: true,
          color: '#FFC107',
          life: 0.32,
          maxLife: 0.32,
          type: 'ring'
        });
        for (let k = 0; k < 20; k++) {
          const a = (k / 20) * Math.PI * 2;
          ctx.spawnParticle(
            p.x + Math.cos(a) * 40,
            p.y + Math.sin(a) * 40,
            k % 2 === 0 ? '#D32F2F' : '#FFC107',
            5.5,
            0.4
          );
        }
        let repelledCount = 0;
        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
            repelledCount++;
            const { amount, isCrit } = ctx.calculatePlayerDamage(1.5, true);
            ctx.damageEnemy(en, amount, {
              isCrit,
              knockback: 315,
              sourceX: p.x,
              sourceY: p.y,
              stun: 0.5
            });
          }
        });
        if (repelledCount > 0) addKidScrap(ctx, repelledCount);
        ctx.spawnFloatingText(p.x, p.y - 42, '💥 ¡REPEL!', '#FFD54F', 1.25);
      }
    } else if (idx === 1) {
      audio.playMetalClank();
      audio.playRoar();
      ctx.triggerScreenShake(6, 0.22);
      p.custom.punkRottenTimer = 8.0;
      p.custom.punkRottenDurationMax = 8.0;
      p.custom.punkRottenBuildTimer = 0.25;

      p.custom.punkRottenPrevMaxCharges = p.maxDashCharges;
      p.custom.punkRottenPrevDashCdMax = p.dashCdMax;
      p.armor += 20;
      p.maxDashCharges = 1;
      p.dashCharges = Math.min(1, p.dashCharges);
      p.dashCdMax = 4.0;

      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: 0,
        range: 95,
        isCircular: true,
        color: '#FFC107',
        life: 0.35,
        maxLife: 0.35,
        type: 'ring'
      });
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2;
        ctx.spawnParticle(
          p.x + Math.cos(a) * 55,
          p.y + Math.sin(a) * 55,
          k % 2 === 0 ? '#757575' : '#D32F2F',
          6,
          0.45
        );
      }
      ctx.spawnFloatingText(p.x, p.y - 48, '🤖 ¡PUNK ROTTEN!', '#FFC107', 1.35);
      ctx.updateHUD();
    } else if (idx === 2) {
      audio.playLaserCharge();
      ctx.triggerScreenShake(5, 0.25);
      p.custom.damnedPunkTimer = 2.0;
      p.custom.damnedPunkTickTimer = 0;
      p.custom.damnedPunkTicksLeft = 6;
      p.custom.damnedPunkTarget = ctx.findNearestEnemy(460);
      p.custom.damnedPunkAngle = p.custom.damnedPunkTarget
        ? Math.atan2(p.custom.damnedPunkTarget.y - p.y, p.custom.damnedPunkTarget.x - p.x)
        : aimAngle;
      ctx.spawnFloatingText(p.x, p.y - 52, '⚡ ¡DAMNED PUNK!', '#FF5252', 1.35);
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p, audio } = ctx;
    if (p.custom.punkRottenBuildTimer > 0) p.custom.punkRottenBuildTimer -= dt;

    if (p.custom.kidRepelWindowTimer > 0) {
      p.custom.kidRepelWindowTimer -= dt;
      if (p.custom.kidRepelWindowTimer <= 0) {
        p.custom.kidRepelWindowTimer = 0;
        p.skillCds[0] = p.skillMaxCds[0] * state.mods.h1CdMult;
      }
      updateKidH1PhaseUI(ctx);
    }

    if (p.custom.punkRottenTimer > 0) {
      p.custom.punkRottenTimer -= dt;
      if (p.custom.punkRottenTimer <= 0) {
        p.custom.punkRottenTimer = 0;
        p.armor = Math.max(0, p.armor - 20);
        p.maxDashCharges = p.custom.punkRottenPrevMaxCharges;
        p.dashCdMax = p.custom.punkRottenPrevDashCdMax;
        audio.playMetalClank();
        for (let k = 0; k < 14; k++) ctx.spawnParticle(p.x, p.y, '#9E9E9E', 5, 0.4);
        ctx.spawnFloatingText(p.x, p.y - 44, 'Fin de Punk Rotten', '#CFD8DC', 1.0);
      }
      ctx.updateHUD();
    }

    if (p.custom.damnedPunkTimer > 0) {
      p.custom.damnedPunkTimer -= dt;
      p.custom.damnedPunkTickTimer -= dt;
      ctx.triggerScreenShake(2.8, 0.08);

      if (!p.custom.damnedPunkTarget || p.custom.damnedPunkTarget.hp <= 0) {
        p.custom.damnedPunkTarget = ctx.findNearestEnemy(480);
      }
      if (p.custom.damnedPunkTarget && p.custom.damnedPunkTarget.hp > 0) {
        p.custom.damnedPunkAngle = Math.atan2(
          p.custom.damnedPunkTarget.y - p.y,
          p.custom.damnedPunkTarget.x - p.x
        );
        p.facingAngle = p.custom.damnedPunkAngle;
      }

      if (p.custom.damnedPunkTicksLeft > 0 && p.custom.damnedPunkTickTimer <= 0) {
        p.custom.damnedPunkTickTimer = 0.33;
        p.custom.damnedPunkTicksLeft--;
        const isLastTick = p.custom.damnedPunkTicksLeft === 0;
        audio.playLaserCharge();
        ctx.triggerScreenShake(3.5, 0.10);

        const beamLen = 460;
        const endX = p.x + Math.cos(p.custom.damnedPunkAngle) * beamLen;
        const endY = p.y + Math.sin(p.custom.damnedPunkAngle) * beamLen;

        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          if (ctx.pointToSegmentDist(en.x, en.y, p.x, p.y, endX, endY) <= en.radius + 16) {
            const { amount, isCrit } = ctx.calculatePlayerDamage(1.75, true);
            ctx.damageEnemy(en, amount, {
              isCrit,
              pierceShield: true,
              applyBurn: isLastTick,
              burnDps: 4
            });
            ctx.spawnParticle(en.x, en.y, '#FFC107', 5, 0.3);
          }
        });
        if (isLastTick) audio.playFireCrackle();
      }

      if (p.custom.damnedPunkTimer <= 0) {
        p.custom.damnedPunkTimer = 0;
        p.custom.damnedPunkTicksLeft = 0;
        p.custom.damnedPunkTarget = null;
      }
    }
  },

  isFacingLocked: (p) => p.custom.damnedPunkTimer > 0,
  getMoveSpeedMult: (p) => (p.custom.punkRottenTimer > 0 ? 0.70 : 1.0),

  onCalculateDamage(p, isSkill) {
    if (p.custom.punkRottenTimer > 0 && !isSkill) return { dmgMult: 1.30 };
    return {};
  },

  mountHUD(slotEl) {
    slotEl.innerHTML = `
      <div id="kid-scrap-hud" class="char-resource-hud" style="display:flex;">
        <span id="kid-hud-icon" style="font-size:11px;">🧲</span>
        <div class="res-bar-outer">
          <div id="hud-scrap-fill" class="res-bar-fill"></div>
        </div>
        <span id="hud-scrap-text" class="res-text text-outline-sm">0/20</span>
      </div>
    `;
  },

  updateHUD(p) {
    const container = document.getElementById('kid-scrap-hud');
    const btnH3 = document.getElementById('btn-h3');
    if (!container || !btnH3) return;
    container.style.display = 'flex';
    const iconEl = document.getElementById('kid-hud-icon');
    const fill = document.getElementById('hud-scrap-fill');
    const txt = document.getElementById('hud-scrap-text');
    if (!iconEl || !fill || !txt) return;

    if (p.custom.punkRottenTimer > 0) {
      container.classList.add('punk-rotten-active');
      iconEl.textContent = '🤖';
      fill.style.width = `${(p.custom.punkRottenTimer / p.custom.punkRottenDurationMax) * 100}%`;
      txt.textContent = `ROTTEN ${p.custom.punkRottenTimer.toFixed(1)}s`;
      btnH3.classList.remove('skill-locked');
    } else {
      container.classList.remove('punk-rotten-active');
      iconEl.textContent = '🧲';
      fill.style.width = `${Math.min(100, (p.custom.scrap / p.custom.maxScrap) * 100)}%`;
      txt.textContent = `${p.custom.scrap}/${p.custom.maxScrap}`;
      btnH3.classList.add('skill-locked');
    }
  },

  updateButtonsUI(p, helpers) {
    const btnH1 = helpers.getBtn(0);
    const iconH1 = helpers.getIcon(0);
    const lblH1 = helpers.getLabel(0);
    if (btnH1 && iconH1 && lblH1) {
      if (p.custom.kidRepelWindowTimer > 0) {
        btnH1.classList.add('kid-repel-phase');
        iconH1.textContent = '💥';
        lblH1.textContent = `Repel ${p.custom.kidRepelWindowTimer.toFixed(1)}s`;
      } else {
        btnH1.classList.remove('kid-repel-phase');
        iconH1.textContent = '🧲';
        lblH1.textContent = 'Attract';
      }
    }
  },

  drawWorldAfterPlayer({ ctx, player: p }) {
    if (p.custom.damnedPunkTimer > 0) {
      const beamLen = 460;
      const now = performance.now() * 0.001;
      const pulse = 1 + Math.sin(now * 42) * 0.14;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.custom.damnedPunkAngle);

      const beamGrad = ctx.createLinearGradient(18, 0, 18 + beamLen, 0);
      beamGrad.addColorStop(0, 'rgba(255, 193, 7, 0.85)');
      beamGrad.addColorStop(0.65, 'rgba(211, 47, 47, 0.65)');
      beamGrad.addColorStop(1, 'rgba(211, 47, 47, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(18, -14 * pulse);
      ctx.lineTo(18 + beamLen, -30 * pulse);
      ctx.lineTo(18 + beamLen, 30 * pulse);
      ctx.lineTo(18, 14 * pulse);
      ctx.closePath();
      ctx.fill();

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const segs = 14;
      for (let s = 0; s <= segs; s++) {
        const sx = 18 + (s / segs) * beamLen;
        const sy = Math.sin(s * 1.4 - now * 38) * (5.5 + (s / segs) * 4);
        if (s === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = 'rgba(255, 193, 7, 0.92)';
      ctx.lineWidth = 18 * pulse;
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 7.5;
      ctx.stroke();

      for (let rIdx = 0; rIdx < 3; rIdx++) {
        const u = (now * 2.6 + rIdx / 3) % 1;
        const rx = 28 + u * (beamLen - 40);
        const rr = 14 + u * 16;
        ctx.strokeStyle = `rgba(255, 245, 157, ${(1 - u) * 0.85})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(rx, 0, 5, rr, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(22, 0, 14 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF5252';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
  },

  drawBody({ ctx, player: p, t }) {
    const isRotten = p.custom.punkRottenTimer > 0;
    const scaleFactor = isRotten ? 1.5 : 1.0;

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    ctx.fillStyle = isRotten ? '#616161' : '#5D4037';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-16, -22, 32, 44, 9);
    ctx.fill();
    ctx.stroke();

    if (isRotten) {
      ctx.fillStyle = '#757575';
      ctx.beginPath();
      ctx.arc(10, -20, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(6, -24, 8, 8);
    }

    const armPunchOffset = p.attackAnimTimer > 0 ? 10 : Math.sin(t) * 1.5;
    ctx.save();
    ctx.translate(10 + armPunchOffset, 18);
    ctx.fillStyle = '#757575';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, isRotten ? 16 : 13.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D32F2F';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(Math.cos(t * 4) * 10, Math.sin(t * 4) * 10, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#D32F2F';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(2, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFC107';
    ctx.fillRect(8, -7, 4, 14);

    ctx.restore();
  },

  drawPreview(pctx, t) {
    pctx.fillStyle = '#5D4037';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.roundRect(-13, -8, 22, 22, 6);
    pctx.fill();
    pctx.stroke();
    const armPulse = Math.sin(t * 1.4) * 1.5;
    pctx.fillStyle = '#757575';
    pctx.beginPath();
    pctx.arc(13, 2 + armPulse, 11, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#D32F2F';
    pctx.fillRect(8, -2 + armPulse, 9, 4);
    pctx.fillStyle = '#FFD54F';
    pctx.beginPath();
    pctx.arc(18 + Math.cos(t * 3) * 3, -5 + Math.sin(t * 3) * 3, 2, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#D32F2F';
    pctx.beginPath();
    pctx.moveTo(-10, -8);
    pctx.lineTo(-7, -18);
    pctx.lineTo(-2, -11);
    pctx.lineTo(2, -19);
    pctx.lineTo(6, -11);
    pctx.lineTo(10, -17);
    pctx.lineTo(10, -8);
    pctx.closePath();
    pctx.fill();
    pctx.stroke();
  }
};
