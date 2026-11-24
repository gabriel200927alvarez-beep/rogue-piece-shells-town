import { CONFIG } from '../config';
import type { CharacterModule, CharacterContext } from './types';

function hasLuffyGatlingSynergy(ctx: CharacterContext): boolean {
  return (
    ctx.state.mods.acquiredIds.includes('off_skill') &&
    ctx.state.mods.acquiredIds.includes('hab_h1cd')
  );
}

export const luffyCharacter: CharacterModule = {
  id: 'luffy',
  name: 'LUFFY',
  rarity: 'comun',
  portrait: '👒',
  portraitBg: '#C8102E',
  attackIcon: '👊',
  themeClass: 'theme-luffy',
  color: '#F5C518',
  vestColor: '#C8102E',
  hp: 150,
  damage: 18,
  speed: 4.6,
  armor: 18,
  dashCd: 2.2,
  skills: [
    { name: 'Gatling', icon: '👊', cd: 4.5 },
    { name: 'Bazooka', icon: '💥', cd: 6.0 },
    { name: 'Storm', icon: '🌪️', cd: 9.5 }
  ],
  cardMeta: {
    nameColor: '#F5C518',
    role: 'Tanque / Luchador',
    passiveText: 'Pasiva: -20% daño contundente',
    passiveColor: '#FFD54F',
    stats: { hp: 80, dmg: 65, vel: 66, arm: 74 },
    comboDesc: 'Pistol (110px), Pistol, Ono (onda 100px).',
    skillsDesc: '<b>H1:</b> Ráfaga 180px • <b>H2:</b> 3× empuje • <b>H3:</b> Storm 360° despeja área.'
  },

  createCustomState: () => ({
    gatlingHitsLeft: 0,
    gatlingTickTimer: 0,
    stormTimer: 0,
    stormHitsLeft: 0,
    stormTickTimer: 0,
    stormAimAngle: 0
  }),

  canAttack: (p) => !(p.custom.stormTimer > 0),
  canDash: (p) => !(p.custom.stormTimer > 0),
  canUseSkill: (ctx) => !(ctx.player.custom.stormTimer > 0),

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.comboResetTimer = CONFIG.COMBO_RESET_TIME;
    p.attackCooldown = step === 2 ? 0.34 : 0.21;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    const isThirdHit = step === 2;
    if (isThirdHit) {
      p.momentumTimer = 0.10;
      p.momentumDirX = Math.cos(aimAngle);
      p.momentumDirY = Math.sin(aimAngle);
      p.superArmorTimer = 0.15;
    }

    if (!isThirdHit) {
      audio.playPunch();
      const armOffset = step === 0 ? -8 : 8;
      const perpAngle = aimAngle + Math.PI / 2;
      state.slashEffects.push({
        x: p.x + Math.cos(perpAngle) * armOffset,
        y: p.y + Math.sin(perpAngle) * armOffset,
        angle: aimAngle,
        range: 110,
        color: '#F5C518',
        armColor: '#FFCC80',
        armOffset,
        isRubberArm: true,
        followPlayer: true,
        life: 0.14,
        maxLife: 0.14,
        type: 'stretch'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 110, (20 * Math.PI) / 180, 1.0, 35);
    } else {
      audio.playExplosion(1.2);
      const impactX = p.x + Math.cos(aimAngle) * 65;
      const impactY = p.y + Math.sin(aimAngle) * 65;
      state.slashEffects.push({
        x: impactX,
        y: impactY,
        angle: 0,
        range: 100,
        isCircular: true,
        color: '#F5C518',
        life: 0.24,
        maxLife: 0.24,
        type: 'ring'
      });
      const hitConnected = ctx.damageEnemiesInCircle(impactX, impactY, 100, 1.8, 120);
      if (hitConnected) {
        state.hitstopTimer = CONFIG.HITSTOP_DURATION;
        ctx.triggerScreenShake(4, 0.12);
        ctx.triggerHaptic(10);
      }
    }
  },

  onDash(ctx) {
    const { player: p, audio } = ctx;
    p.customDashDist = CONFIG.DASH_DISTANCE;
    p.invulnTimer = CONFIG.DASH_IFRAMES;
    audio.playPunch();
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const pierceShield = idx === 1 && state.mods.h2PierceShield;

    if (idx === 0) {
      p.custom.gatlingHitsLeft = hasLuffyGatlingSynergy(ctx) ? 15 : 10;
      p.custom.gatlingTickTimer = 0;
    } else if (idx === 1) {
      audio.playExplosion(1.1);
      state.hitstopTimer = CONFIG.HITSTOP_DURATION;
      ctx.triggerScreenShake(6, 0.14);
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 115,
        color: '#F5C518',
        life: 0.22,
        maxLife: 0.22,
        type: 'arc'
      });
      state.enemies.forEach((en) => {
        const dx = en.x - p.x;
        const dy = en.y - p.y;
        if (
          Math.hypot(dx, dy) - en.radius <= 115 &&
          Math.abs(ctx.normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= Math.PI / 3
        ) {
          const { amount, isCrit } = ctx.calculatePlayerDamage(3.0, true);
          ctx.damageEnemy(en, amount, { isCrit, knockback: 320, sourceX: p.x, sourceY: p.y, pierceShield });
        }
      });
    } else if (idx === 2) {
      p.custom.stormTimer = 1.2;
      p.custom.stormHitsLeft = 15;
      p.custom.stormTickTimer = 0;
      p.custom.stormAimAngle = 0;
      state.hitstopTimer = CONFIG.HITSTOP_DURATION;
      audio.playSlash(1.2);
      ctx.spawnFloatingText(p.x, p.y - 38, '🌪️ ¡GOMU GOMU NO STORM!', '#F5C518', 1.2);
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p, audio } = ctx;

    if (p.custom.gatlingHitsLeft > 0) {
      p.custom.gatlingTickTimer -= dt;
      if (p.custom.gatlingTickTimer <= 0) {
        p.custom.gatlingTickTimer = 0.06;
        p.custom.gatlingHitsLeft--;
        audio.playPunch();

        const aimAngle = ctx.getAimAngle();
        p.facingAngle = aimAngle;
        const spreadAngle = aimAngle + (Math.random() - 0.5) * 0.6;

        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: spreadAngle,
          range: 180,
          color: '#F5C518',
          armColor: '#FFCC80',
          isRubberArm: true,
          followPlayer: true,
          life: 0.11,
          maxLife: 0.11,
          type: 'stretch'
        });

        state.enemies.forEach((en) => {
          const dx = en.x - p.x;
          const dy = en.y - p.y;
          if (
            Math.hypot(dx, dy) - en.radius <= 180 &&
            Math.abs(ctx.normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= Math.PI / 3.5
          ) {
            const { amount, isCrit } = ctx.calculatePlayerDamage(0.5, true);
            ctx.damageEnemy(en, amount, {
              isCrit,
              knockback: 18,
              sourceX: p.x,
              sourceY: p.y,
              applyBurn: state.mods.h1Burn
            });
          }
        });
      }
    }

    if (p.custom.stormTimer > 0) {
      p.custom.stormTimer -= dt;
      p.custom.stormTickTimer -= dt;

      if (p.custom.stormHitsLeft > 0 && p.custom.stormTickTimer <= 0) {
        p.custom.stormTickTimer = 0.075;
        p.custom.stormHitsLeft--;
        p.custom.stormAimAngle += 0.85;
        audio.playPunch(1.1);

        const radius = 150 * state.mods.h3AreaMult;
        const punchX = p.x + Math.cos(p.custom.stormAimAngle) * (radius * 0.75);
        const punchY = p.y + Math.sin(p.custom.stormAimAngle) * (radius * 0.75);

        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: p.custom.stormAimAngle,
          range: radius,
          color: '#F5C518',
          armColor: '#FFCC80',
          isRubberArm: true,
          followPlayer: true,
          life: 0.12,
          maxLife: 0.12,
          type: 'stretch'
        });
        ctx.spawnParticle(punchX, punchY, '#FFF59D', 4, 0.25);

        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
            const { amount, isCrit } = ctx.calculatePlayerDamage(0.8, true);
            ctx.damageEnemy(en, amount, { isCrit, knockback: 40, sourceX: p.x, sourceY: p.y });
          }
        });
      }

      if (p.custom.stormTimer <= 0) {
        p.custom.stormTimer = 0;
        p.custom.stormHitsLeft = 0;
        audio.playExplosion(1.0);
      }
    }
  },

  getMoveSpeedMult: (p) => (p.custom.stormTimer > 0 ? 0.30 : 1.0),
  isFacingLocked: (p) => p.custom.stormTimer > 0,

  onBeforePlayerDamage(_ctx, _incomingDmg, isBlunt) {
    if (isBlunt) return { dmgMult: 0.80 };
    return {};
  },

  onUpgradeApplied(ctx) {
    if (hasLuffyGatlingSynergy(ctx)) {
      ctx.spawnFloatingText(ctx.player.x, ctx.player.y - 50, '⚡ SINERGIA: GATLING 15 GOLPES ⚡', '#F5C518', 1.2);
    }
  },

  drawAura({ ctx, state, player: p }) {
    if (p.custom.stormTimer > 0) {
      ctx.strokeStyle = 'rgba(245, 197, 24, 0.5)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 150 * state.mods.h3AreaMult, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  drawBody({ ctx, player: p, t }) {
    const isMoving = Math.hypot(p.vx, p.vy) > 15;
    const swingSpeed = isMoving ? t * 2.6 : t * 1.1;
    const armSwing = Math.sin(swingSpeed) * (isMoving ? 6.5 : 3.0);

    ctx.fillStyle = '#FFCC80';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-4 + armSwing, -26, 12, 8, 4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-4 - armSwing, 18, 12, 8, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#C8102E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F5C518';
    ctx.beginPath();
    ctx.arc(-1, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#C8102E';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(-1, 0, 11.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#FFD54F';
    ctx.beginPath();
    ctx.arc(-1, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
  },

  drawPreview(pctx, t) {
    const armSwing = Math.sin(t * 1.4) * 3.5;
    pctx.fillStyle = '#FFCC80';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.arc(-14, 2 + armSwing, 4.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.beginPath();
    pctx.arc(14, 2 - armSwing, 4.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#C8102E';
    pctx.beginPath();
    pctx.arc(0, 1, 13, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#F5C518';
    pctx.beginPath();
    pctx.ellipse(0, -6, 17, 7, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#E6B400';
    pctx.beginPath();
    pctx.arc(0, -9, 9.5, Math.PI, 0);
    pctx.fill();
    pctx.stroke();

    pctx.strokeStyle = '#C8102E';
    pctx.lineWidth = 2.8;
    pctx.beginPath();
    pctx.moveTo(-9.5, -8.5);
    pctx.lineTo(9.5, -8.5);
    pctx.stroke();
  }
};
