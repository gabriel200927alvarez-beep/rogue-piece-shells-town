import { calculateLuffyPtsComboCooldown, drainGear2ndResource } from '../rules';
import type { CharacterModule, CharacterContext } from './types';

function releaseKingKongGun(ctx: CharacterContext): void {
  const { state, player: p, audio } = ctx;
  if (!p.custom.isChargingKKG) return;
  p.custom.isChargingKKG = false;
  const charge = Math.min(2.5, p.custom.kkgChargeTimer);
  p.custom.kkgChargeTimer = 0;
  p.skillCds[2] = p.skillMaxCds[2];

  let dmgMult = 4.5;
  if (charge <= 1.0) {
    dmgMult = 4.5 + (charge / 1.0) * (6.75 - 4.5);
  } else if (charge <= 2.0) {
    dmgMult = 6.75 + ((charge - 1.0) / 1.0) * (9.0 - 6.75);
  } else {
    dmgMult = 9.0 + ((charge - 2.0) / 0.5) * (12.0 - 9.0);
  }

  const aimAngle = p.facingAngle;
  const impactX = p.x + Math.cos(aimAngle) * 90;
  const impactY = p.y + Math.sin(aimAngle) * 90;

  audio.playExplosion(1.7);
  ctx.triggerScreenShake(12, 0.35);
  state.hitstopTimer = 0.15;

  state.hazards.push({
    x: impactX,
    y: impactY,
    angle: aimAngle,
    range: 300,
    life: 3.0,
    maxLife: 3.0,
    type: 'kkg_fissure'
  });

  state.slashEffects.push({
    x: impactX,
    y: impactY,
    angle: 0,
    range: 300,
    isCircular: true,
    color: '#111111',
    subColor: '#FF1744',
    life: 0.45,
    maxLife: 0.45,
    type: 'kkg_impact'
  });

  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    ctx.spawnParticle(
      impactX + Math.cos(a) * 95,
      impactY + Math.sin(a) * 95,
      k % 2 === 0 ? '#FF1744' : '#212121',
      7.0,
      0.50
    );
  }

  state.enemies.forEach((en) => {
    if (en.hp <= 0) return;
    if (Math.hypot(en.x - impactX, en.y - impactY) <= 300 + en.radius) {
      const { amount, isCrit } = ctx.calculatePlayerDamage(dmgMult, true);
      ctx.damageEnemy(en, amount, {
        isCrit,
        stun: 2.0,
        knockback: 180,
        sourceX: impactX,
        sourceY: impactY,
        pierceShield: true,
        applyBurn: true,
        burnDps: 5
      });
    }
  });

  const chargePct = Math.round((charge / 2.5) * 100);
  ctx.spawnFloatingText(p.x, p.y - 56, `🦍 ¡KING KONG GUN (${dmgMult.toFixed(1)}×)! (${chargePct}%)`, '#FF1744', 1.5);
}

function updatePTSGatling(ctx: CharacterContext, dt: number): void {
  const { state, player: p, audio } = ctx;
  if (!p.custom.ptsGatlingHitsLeft || p.custom.ptsGatlingHitsLeft <= 0) return;

  p.custom.ptsGatlingTickTimer -= dt;
  if (p.custom.ptsGatlingTickTimer <= 0) {
    const isRedHawk = p.custom.ptsGatlingType === 'red_hawk_gatling';
    const g2Mult = p.custom.gear2ndActive ? 0.80 : 1.0;
    p.custom.ptsGatlingTickTimer = isRedHawk ? 0.08 : 0.25 * g2Mult;
    p.custom.ptsGatlingHitsLeft--;
    audio.playPunch();

    let aimAngle = p.custom.ptsGatlingAngle;
    const LUFFY_PTS_AIM_RANGE = 220;
    const LUFFY_PTS_AIM_HALF_ANGLE = (120 * Math.PI) / 180;

    if (isRedHawk) {
      const target = ctx.findNearestEnemy(250);
      if (target) {
        const targetAngle = Math.atan2(target.y - p.y, target.x - p.x);
        const diff = ctx.normalizeAngle(targetAngle - aimAngle);
        aimAngle += diff * 0.45;
        p.custom.ptsGatlingAngle = aimAngle;
        p.facingAngle = aimAngle;
      }
    } else {
      const target = ctx.findNearestEnemyInCone(LUFFY_PTS_AIM_RANGE, aimAngle, LUFFY_PTS_AIM_HALF_ANGLE);
      if (target) {
        aimAngle = Math.atan2(target.y - p.y, target.x - p.x);
        p.custom.ptsGatlingAngle = aimAngle;
        p.facingAngle = aimAngle;
      }
    }

    const spread = aimAngle + (Math.random() - 0.5) * (isRedHawk ? 1.2 : 0.55);
    const range = isRedHawk ? 220 : 180;
    const dmgMult = isRedHawk ? 0.20 : 0.90;
    const coneHalfAngle = isRedHawk ? (70 * Math.PI) / 180 : Math.PI / 6;

    state.slashEffects.push({
      x: p.x,
      y: p.y,
      angle: spread,
      range,
      color: isRedHawk ? '#D50000' : '#212121',
      armColor: '#FFCC80',
      isRubberArm: true,
      hakiArm: true,
      isRedHawk,
      followPlayer: true,
      life: 0.12,
      maxLife: 0.12,
      type: 'stretch'
    });
    if (isRedHawk) {
      ctx.spawnParticle(
        p.x + Math.cos(spread) * 80,
        p.y + Math.sin(spread) * 80,
        Math.random() < 0.5 ? '#FF1744' : '#FF9100',
        4.5,
        0.25
      );
    }

    state.enemies.forEach((en) => {
      if (en.hp <= 0) return;
      const dx = en.x - p.x;
      const dy = en.y - p.y;
      if (
        Math.hypot(dx, dy) - en.radius <= range &&
        Math.abs(ctx.normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= coneHalfAngle
      ) {
        const { amount, isCrit } = ctx.calculatePlayerDamage(dmgMult, isRedHawk);
        ctx.damageEnemy(en, amount, {
          isCrit,
          knockback: 15,
          sourceX: p.x,
          sourceY: p.y,
          applyBurn: isRedHawk,
          burnDps: 5,
          pierceShield: isRedHawk
        });
      }
    });

    if (p.custom.ptsGatlingHitsLeft === 0 && isRedHawk) {
      const impactX = p.x + Math.cos(aimAngle) * 110;
      const impactY = p.y + Math.sin(aimAngle) * 110;
      audio.playExplosion(1.5);
      ctx.triggerScreenShake(10, 0.25);
      state.hitstopTimer = 0.12;
      state.slashEffects.push({
        x: impactX,
        y: impactY,
        angle: aimAngle,
        range: 300,
        isCircular: true,
        color: '#212121',
        subColor: '#FF5722',
        life: 0.38,
        maxLife: 0.38,
        type: 'red_hawk_explosion'
      });
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const c = k % 3 === 0 ? '#FFEB3B' : k % 3 === 1 ? '#FF5722' : '#212121';
        ctx.spawnParticle(impactX + Math.cos(a) * 85, impactY + Math.sin(a) * 85, c, 6.2, 0.48);
      }
      state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        if (Math.hypot(en.x - impactX, en.y - impactY) <= 300 + en.radius) {
          const { amount, isCrit } = ctx.calculatePlayerDamage(5.5, true);
          ctx.damageEnemy(en, amount, {
            isCrit,
            knockback: 150,
            sourceX: impactX,
            sourceY: impactY,
            pierceShield: true,
            applyBurn: true,
            burnDps: 5
          });
        }
      });
      ctx.spawnFloatingText(impactX, impactY - 44, '🔥 ¡RED HAWK FINISHER (300px)!', '#FF5722', 1.45);
    }
  }
}

export const luffyPtsCharacter: CharacterModule = {
  id: 'luffy_pts',
  name: 'Luffy (Post Time Skip)',
  rarity: 'legendario',
  portrait: '👒',
  portraitBg: '#D32F2F',
  attackIcon: '👊',
  themeClass: 'theme-luffy_pts',
  color: '#E53935',
  vestColor: '#D32F2F',
  hp: 130,
  damage: 17,
  speed: 6.0,
  armor: 8,
  dashCd: 1.8,
  skills: [
    { name: 'Red Hawk Gatling', icon: '🔥', cd: 12.0 },
    { name: 'Gear 2nd', icon: '💨', cd: 18.0 },
    { name: 'King Kong Gun', icon: '🦍', cd: 18.0 }
  ],
  cardMeta: {
    displayName: 'LUFFY (PTS)',
    zarparName: 'LUFFY (PTS)',
    nameColor: '#E53935',
    role: 'Capitán Sombrero de Paja / Busoshoku',
    passiveText: 'Pasiva: Golpes con Haki + Gear 2 en Kills',
    passiveColor: '#FF8A80',
    stats: { hp: 92, dmg: 86, vel: 80, arm: 50 },
    comboDesc: '<b>Busoshoku Combo:</b> Jet Pistol ×2, Jet Sweep (empuje) y Jet Bazooka (mini-Red Hawk).',
    skillsDesc:
      '<b>H1:</b> Red Hawk Gatling 15 golpes + remate • <b>H2:</b> Gear 2nd (+25% vel atk, ×1.4 dmg, +1 dash) • <b>H3:</b> King Kong Gun recargable (hasta 8×).'
  },

  createCustomState: () => ({
    luffyG2: 0,
    gear2ndActive: false,
    isChargingKKG: false,
    kkgChargeTimer: 0,
    ptsGatlingHitsLeft: 0,
    ptsGatlingTotalHits: 0,
    ptsGatlingTickTimer: 0,
    ptsGatlingType: null as string | null,
    ptsGatlingAngle: 0
  }),

  canAttack: (p) => !p.custom.isChargingKKG,
  canDash: (p) => !p.custom.isChargingKKG,

  canUseSkill(ctx, idx) {
    const p = ctx.player;
    if (p.custom.isChargingKKG && idx !== 2) return false;
    if (idx === 1 && p.custom.gear2ndActive) return false;
    return true;
  },

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 4;

    const cdInfo = calculateLuffyPtsComboCooldown(step, Boolean(p.custom.gear2ndActive));
    p.attackCooldown = cdInfo.attackCooldown;
    p.comboResetTimer = cdInfo.comboResetTimer;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    if (step === 2) {
      p.momentumTimer = 0.10;
      p.momentumDirX = Math.cos(aimAngle);
      p.momentumDirY = Math.sin(aimAngle);
      p.superArmorTimer = 0.15;
    }

    const LUFFY_PTS_AIM_RANGE = 220;
    const LUFFY_PTS_AIM_HALF_ANGLE = (120 * Math.PI) / 180;

    if (step === 0 || step === 1) {
      const aimTarget = ctx.findNearestEnemyInCone(LUFFY_PTS_AIM_RANGE, aimAngle, LUFFY_PTS_AIM_HALF_ANGLE);
      const finalAimAngle = aimTarget ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x) : aimAngle;
      p.facingAngle = finalAimAngle;

      audio.playPunch();
      state.hitstopTimer = 0.04;
      const armOffset = step === 0 ? -10 : 10;
      const perpAngle = finalAimAngle + Math.PI / 2;
      state.slashEffects.push({
        x: p.x + Math.cos(perpAngle) * armOffset,
        y: p.y + Math.sin(perpAngle) * armOffset,
        angle: finalAimAngle,
        range: 160,
        color: '#E53935',
        armColor: '#FFCC80',
        armOffset,
        isRubberArm: true,
        hakiArm: true,
        followPlayer: true,
        life: 0.16,
        maxLife: 0.16,
        type: 'stretch'
      });
      ctx.damageEnemiesInCone(p.x, p.y, finalAimAngle, 160, (25 * Math.PI) / 180, 0.9, 35);
    } else if (step === 2) {
      const aimTarget = ctx.findNearestEnemyInCone(LUFFY_PTS_AIM_RANGE, aimAngle, LUFFY_PTS_AIM_HALF_ANGLE);
      const finalAimAngle = aimTarget ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x) : aimAngle;
      p.facingAngle = finalAimAngle;

      audio.playSlash(1.15);
      audio.playPunch();
      ctx.triggerScreenShake(4, 0.12);
      state.hitstopTimer = 0.05;
      const sweepHalfAngle = (70 * Math.PI) / 180;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: finalAimAngle,
        range: 200,
        halfAngle: sweepHalfAngle,
        color: '#FF1744',
        life: 0.24,
        maxLife: 0.24,
        type: 'arc_cross'
      });
      for (let k = -4; k <= 4; k++) {
        const a = finalAimAngle + (k / 4) * sweepHalfAngle;
        ctx.spawnParticle(
          p.x + Math.cos(a) * 145,
          p.y + Math.sin(a) * 145,
          k % 2 === 0 ? '#FF1744' : '#212121',
          4.5,
          0.28
        );
      }
      ctx.damageEnemiesInCone(p.x, p.y, finalAimAngle, 200, sweepHalfAngle, 1.6, 95);
    } else {
      const BAZOOKA_AIM_RANGE = 360;
      const BAZOOKA_AIM_HALF_ANGLE = (150 * Math.PI) / 180;
      const aimTarget =
        ctx.findNearestEnemyInCone(BAZOOKA_AIM_RANGE, aimAngle, BAZOOKA_AIM_HALF_ANGLE) ||
        ctx.findNearestEnemy(BAZOOKA_AIM_RANGE);
      const finalAimAngle = aimTarget ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x) : aimAngle;
      p.facingAngle = finalAimAngle;

      audio.playExplosion(1.3);
      ctx.triggerScreenShake(7, 0.18);
      state.hitstopTimer = 0.08;
      const targetDist = aimTarget ? Math.hypot(aimTarget.x - p.x, aimTarget.y - p.y) : 95;
      const impactDist = aimTarget ? Math.min(155, Math.max(85, targetDist * 0.75)) : 95;
      const impactX = p.x + Math.cos(finalAimAngle) * impactDist;
      const impactY = p.y + Math.sin(finalAimAngle) * impactDist;
      const perpAngle = finalAimAngle + Math.PI / 2;
      [-10, 10].forEach((armOffset) => {
        state.slashEffects.push({
          x: p.x + Math.cos(perpAngle) * armOffset,
          y: p.y + Math.sin(perpAngle) * armOffset,
          angle: finalAimAngle,
          range: impactDist,
          color: '#FF5722',
          armColor: '#FFCC80',
          armOffset,
          isRubberArm: true,
          hakiArm: true,
          followPlayer: true,
          life: 0.15,
          maxLife: 0.15,
          type: 'stretch'
        });
      });
      state.slashEffects.push({
        x: impactX,
        y: impactY,
        angle: finalAimAngle,
        range: 130,
        isCircular: true,
        color: '#212121',
        subColor: '#FF5722',
        life: 0.30,
        maxLife: 0.30,
        type: 'red_hawk_explosion'
      });
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const c = k % 3 === 0 ? '#FFEB3B' : k % 3 === 1 ? '#FF5722' : '#212121';
        ctx.spawnParticle(impactX + Math.cos(a) * 42, impactY + Math.sin(a) * 42, c, 5.0, 0.36);
      }
      ctx.damageEnemiesInCircle(impactX, impactY, 130, 3.0, 85, false, 0, {
        knockback: 85,
        sourceX: p.x,
        sourceY: p.y,
        pierceShield: true
      });
      ctx.spawnFloatingText(impactX, impactY - 38, '🔥 ¡JET BAZOOKA!', '#FF5722', 1.3);
    }
  },

  onDash(ctx) {
    const { player: p, audio } = ctx;
    p.customDashDist = 200;
    p.invulnTimer = 0.15;
    audio.playDash();
    audio.playFwoosh();
    for (let i = 0; i < 10; i++) {
      ctx.spawnParticle(p.x, p.y, i % 2 === 0 ? '#FF1744' : '#ECEFF1', 4.5, 0.35);
    }
  },

  onSkill(ctx, idx, aimAngle) {
    const { player: p, audio } = ctx;
    if (idx === 0) {
      p.custom.ptsGatlingHitsLeft = 15;
      p.custom.ptsGatlingTotalHits = 15;
      p.custom.ptsGatlingTickTimer = 0.08;
      p.custom.ptsGatlingType = 'red_hawk_gatling';
      p.custom.ptsGatlingAngle = aimAngle;

      audio.playFireCrackle();
      audio.playPunch();
      ctx.spawnFloatingText(p.x, p.y - 48, '🔥 ¡RED HAWK GATLING (140°)!', '#FF3D00', 1.35);
    } else if (idx === 1) {
      if (p.custom.gear2ndActive) return true;
      const currentG2 = p.custom.luffyG2 || 0;
      if (currentG2 <= 0) {
        ctx.spawnFloatingText(p.x, p.y - 48, '🔒 Sin energía Gear 2nd', '#FF8A80', 1.15);
        return true;
      }

      p.custom.gear2ndActive = true;
      p.maxDashCharges = 3;
      p.dashCharges = Math.min(3, p.dashCharges + 1);
      p.dashCdMax = 1.2;
      p.skillCds[1] = 0;

      audio.playFwoosh();
      ctx.triggerScreenShake(3, 0.12);
      for (let k = 0; k < 15; k++) ctx.spawnParticle(p.x, p.y, '#ECEFF1', 4, 0.35);
      ctx.spawnFloatingText(p.x, p.y - 50, `💨 ¡GEAR 2ND (${(currentG2 / 10).toFixed(1)}s)!`, '#FF1744', 1.4);
      ctx.updateHUD();
      ctx.updateCooldownUI();
      return true;
    } else if (idx === 2) {
      if (p.custom.isChargingKKG) return true;
      p.custom.isChargingKKG = true;
      p.custom.kkgChargeTimer = 0;
      p.skillCds[2] = 0;
      audio.playFwoosh();
      const unstoppableText = p.custom.gear2ndActive ? '🦍 ¡KKG UNSTOPPABLE HAKI!' : '🦍 Cargando King Kong Gun...';
      ctx.spawnFloatingText(p.x, p.y - 48, unstoppableText, '#FFD54F', 1.1);
      ctx.updateCooldownUI();
      return true;
    }
  },

  supportsHoldSkill: (idx) => idx === 2,
  isHoldSkillActive: (p, idx) => (idx == null || idx === 2) && Boolean(p.custom.isChargingKKG),
  onHoldSkillRelease(ctx, idx) {
    if (idx === 2) releaseKingKongGun(ctx);
  },

  onUpdate(ctx, dt) {
    const p = ctx.player;
    if (p.custom.gear2ndActive) {
      const drained = drainGear2ndResource(p.custom.luffyG2 || 0, dt, 10);
      p.custom.luffyG2 = drained.energy;
      if (Math.random() < 0.85) {
        const steamColor = Math.random() < 0.6 ? '#FFFFFF' : Math.random() < 0.5 ? '#ECEFF1' : '#FFCDD2';
        ctx.spawnParticle(
          p.x + (Math.random() - 0.5) * 20,
          p.y + (Math.random() - 0.5) * 14,
          steamColor,
          5.2 + Math.random() * 1.4,
          0.45,
          {
            alpha: 0.92,
            vx: (Math.random() - 0.5) * 45,
            vy: -38 - Math.random() * 48
          }
        );
      }
      ctx.updateHUD();
      if (drained.ended) {
        p.custom.gear2ndActive = false;
        p.custom.luffyG2 = 0;
        p.maxDashCharges = 2;
        p.dashCharges = Math.min(2, p.dashCharges);
        p.dashCdMax = this.dashCd;
        p.skillCds[1] = p.skillMaxCds[1];
        ctx.spawnFloatingText(p.x, p.y - 44, 'Fin de Gear 2nd', '#CFD8DC', 0.95);
        ctx.updateHUD();
        ctx.updateCooldownUI();
      }
    }

    if (p.custom.isChargingKKG) {
      p.custom.kkgChargeTimer += dt;
      p.vx = 0;
      p.vy = 0;
      if (Math.random() < 0.7) {
        const fx = p.x + Math.cos(p.facingAngle) * 22;
        const fy = p.y + Math.sin(p.facingAngle) * 22;
        ctx.spawnParticle(
          fx + (Math.random() - 0.5) * 14,
          fy + (Math.random() - 0.5) * 14,
          Math.random() < 0.5 ? '#FF1744' : '#111111',
          4,
          0.2
        );
      }
      if (p.custom.kkgChargeTimer >= 2.5) {
        releaseKingKongGun(ctx);
      }
    }

    updatePTSGatling(ctx, dt);
  },

  isMovementLocked: (p) => Boolean(p.custom.isChargingKKG),

  onCalculateDamage(p) {
    return {
      dmgMult: p.custom.gear2ndActive ? 1.4 : 1.0,
      extraCritChance: 0.15,
      critMult: 2.0
    };
  },

  onEnemyKilled(ctx, _en, resGain) {
    const p = ctx.player;
    if (p.custom.gear2ndActive) return;
    p.custom.luffyG2 = Math.max(0, Math.min(100, (p.custom.luffyG2 || 0) + resGain));
    ctx.updateHUD();
  },

  onBeforePlayerDamage(ctx) {
    const p = ctx.player;
    if (p.custom.isChargingKKG) {
      if (p.custom.gear2ndActive) {
        ctx.spawnFloatingText(p.x, p.y - 42, '🛡️ UNSTOPPABLE HAKI!', '#FF1744', 1.15);
      } else {
        p.custom.isChargingKKG = false;
        p.custom.kkgChargeTimer = 0;
        p.skillCds[2] = p.skillMaxCds[2];
        ctx.spawnFloatingText(p.x, p.y - 48, '💔 KKG CANCELLED', '#FF5252', 1.25);
      }
    }
    if (p.custom.gear2ndActive) {
      return { dmgMult: 0.75 };
    }
    return {};
  },

  onCleanupEffects(p) {
    p.custom.gear2ndActive = false;
    p.custom.isChargingKKG = false;
    p.custom.kkgChargeTimer = 0;
    p.custom.ptsGatlingHitsLeft = 0;
  },

  mountHUD(slotEl, _hudCombatEl, ctx) {
    slotEl.innerHTML = `
      <div id="luffypts-g2-hud" class="char-resource-hud" style="display:flex;">
        <span style="font-size:11px;">💨</span>
        <div class="res-bar-outer" style="border-color:#FF1744; background:#2A0000;">
          <div id="hud-g2-fill" class="res-bar-fill" style="background: linear-gradient(90deg, #D50000, #FF5252);"></div>
        </div>
        <span id="hud-g2-text" class="res-text text-outline-sm" style="color:#FF5252;">G2 0/100</span>
      </div>
      <div id="luffypts-gear4-hud" class="char-resource-hud interactive" style="display:flex;cursor:pointer;">
        <div class="gear4-lock-badge text-outline-sm">
          <span>🔒 GEAR 4</span>
        </div>
      </div>
    `;
    const gear4Hud = document.getElementById('luffypts-gear4-hud');
    if (gear4Hud) {
      gear4Hud.addEventListener('click', (e) => {
        e.stopPropagation();
        ctx.audio.playUIClick();
        ctx.triggerHaptic(15);
        ctx.spawnFloatingText(
          ctx.player.x,
          ctx.player.y - 48,
          '🔒 Gear 4 - Bloqueado (Próxima actualización)',
          '#FFD54F',
          1.25
        );
      });
    }
  },

  updateHUD(p) {
    const container = document.getElementById('luffypts-g2-hud');
    if (!container) return;
    container.style.display = 'flex';
    const rawVal = p.custom.luffyG2 || 0;
    const val = Math.round(rawVal);
    const fill = document.getElementById('hud-g2-fill');
    const txt = document.getElementById('hud-g2-text');
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, rawVal))}%`;
    if (txt) txt.textContent = `G2 ${val}/100`;
    const g4 = document.getElementById('luffypts-gear4-hud');
    if (g4) g4.style.display = 'flex';
  },

  isAttackCooldownVisible: () => false,

  updateButtonsUI(p, helpers) {
    if (p.custom.isChargingKKG) {
      helpers.setSkillCooldownOverride(2, 0, undefined, true);
    }
    const btnH2 = helpers.getBtn(1);
    const lblH2 = helpers.getLabel(1);
    const cdH2 = helpers.getCdEl(1);
    if (lblH2 && btnH2) {
      if (p.custom.gear2ndActive) {
        btnH2.classList.add('skill-locked');
        btnH2.classList.remove('chain-active');
        lblH2.textContent = `ACTIVE (${((p.custom.luffyG2 || 0) / 10).toFixed(1)}s)`;
        if (cdH2) cdH2.textContent = 'ACTIVE';
      } else if ((p.custom.luffyG2 || 0) <= 0 && p.skillCds[1] <= 0) {
        btnH2.classList.add('skill-locked');
        btnH2.classList.remove('chain-active');
        lblH2.textContent = 'Gear 2nd';
      } else {
        btnH2.classList.remove('skill-locked');
        btnH2.classList.remove('chain-active');
        lblH2.textContent = 'Gear 2nd';
      }
    }

    const btnH3 = helpers.getBtn(2);
    const lblH3 = helpers.getLabel(2);
    const cdH3 = helpers.getCdEl(2);
    if (lblH3 && btnH3) {
      if (p.custom.isChargingKKG) {
        btnH3.classList.remove('on-cooldown');
        btnH3.classList.add('chain-active');
        if (cdH3) cdH3.textContent = '';
        lblH3.textContent = `KKG (${p.custom.kkgChargeTimer.toFixed(1)}s)`;
      } else {
        btnH3.classList.remove('chain-active');
        lblH3.textContent = 'King Kong Gun';
      }
    }
  },

  drawAura({ ctx, player: p, t }) {
    if (p.custom.gear2ndActive) {
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 6 + Math.sin(t * 8) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (p.custom.isChargingKKG) {
      if (p.custom.gear2ndActive) {
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 15 + Math.sin(t * 8) * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(17, 17, 17, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 15 + Math.sin(t * 8) * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 2.5;
        for (let k = 0; k < 6; k++) {
          const ang = t * 6 + (k * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(ang) * (p.radius + 10), Math.sin(ang) * (p.radius + 10));
          ctx.lineTo(Math.cos(ang + 0.3) * (p.radius + 20), Math.sin(ang + 0.3) * (p.radius + 20));
          ctx.stroke();
        }
      }

      const chargeFrac = Math.min(1.0, p.custom.kkgChargeTimer / 2.5);
      const ballRadius = 8 + chargeFrac * 22;
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(16 + chargeFrac * 10, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  },

  drawBody({ ctx, player: p }) {
    ctx.fillStyle = '#D32F2F';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8D6E63';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-4, -4);
    ctx.lineTo(4, 4);
    ctx.moveTo(4, -4);
    ctx.lineTo(-4, 4);
    ctx.stroke();

    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(-13, 12, 6, 0, Math.PI * 2);
    ctx.arc(13, 12, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(-1, 0, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FBC02D';
    ctx.strokeStyle = '#7A5600';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(-9, -2.5, 16, 3);
    ctx.fillStyle = '#FBC02D';
    ctx.beginPath();
    ctx.arc(-1, -1, 9, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
  },

  drawPreview(pctx) {
    pctx.fillStyle = '#D32F2F';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.ellipse(0, 3, 11, 12, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#FFCC80';
    pctx.beginPath();
    pctx.arc(0, 1, 6, 0, Math.PI * 2);
    pctx.fill();
    pctx.strokeStyle = '#8D6E63';
    pctx.lineWidth = 1.8;
    pctx.beginPath();
    pctx.moveTo(-3, -2);
    pctx.lineTo(3, 4);
    pctx.moveTo(3, -2);
    pctx.lineTo(-3, 4);
    pctx.stroke();

    pctx.fillStyle = '#212121';
    pctx.beginPath();
    pctx.arc(-11, 3, 4, 0, Math.PI * 2);
    pctx.arc(11, 3, 4, 0, Math.PI * 2);
    pctx.fill();

    pctx.fillStyle = '#1A1A1A';
    pctx.beginPath();
    pctx.arc(0, -6, 8.5, 0, Math.PI * 2);
    pctx.fill();

    pctx.fillStyle = '#FBC02D';
    pctx.strokeStyle = '#7A5600';
    pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.ellipse(0, -8, 14, 5.5, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#B71C1C';
    pctx.fillRect(-7, -11, 14, 2.2);
    pctx.fillStyle = '#FBC02D';
    pctx.beginPath();
    pctx.arc(0, -10, 6.5, Math.PI, 0);
    pctx.fill();
    pctx.stroke();
  }
};
