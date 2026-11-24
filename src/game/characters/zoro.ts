import { CONFIG } from '../config';
import type { CharacterModule, CharacterContext } from './types';

function executeSanzenCut(ctx: CharacterContext, stepIdx: number, areaMult = 1.0): void {
  const { state, player: p, audio } = ctx;
  const ang = p.custom.sanzenAngle;
  const range = 200 * areaMult;
  const dmgMults = [2.0, 3.0, 5.0];
  const halfAngles = [Math.PI / 4, Math.PI / 4, (60 * Math.PI) / 180];
  const mult = dmgMults[stepIdx] || 2.0;
  const halfAng = halfAngles[stepIdx] || Math.PI / 4;

  audio.playSlash(1.0 + stepIdx * 0.35);

  state.slashEffects.push({
    x: p.x,
    y: p.y,
    angle: ang,
    range,
    halfAngle: halfAng,
    color: stepIdx === 2 ? '#FFFFFF' : '#66BB6A',
    life: stepIdx === 2 ? 0.32 : 0.2,
    maxLife: stepIdx === 2 ? 0.32 : 0.2,
    type: stepIdx === 2 ? 'sanzen_final' : 'arc'
  });

  state.enemies.forEach((en) => {
    if (en.hp <= 0) return;
    const dx = en.x - p.x;
    const dy = en.y - p.y;
    if (Math.hypot(dx, dy) - en.radius <= range) {
      if (Math.abs(ctx.normalizeAngle(Math.atan2(dy, dx) - ang)) <= halfAng) {
        const { amount, isCrit } = ctx.calculatePlayerDamage(mult, true);
        ctx.damageEnemy(en, amount, { isCrit, knockback: 50, sourceX: p.x, sourceY: p.y, applyBleed: true });
      }
    }
  });

  if (stepIdx === 2) {
    state.hitstopTimer = 0.10;
    ctx.triggerScreenShake(6, 0.18);
    audio.playExplosion(0.85);
    const endX = p.x + Math.cos(ang) * range;
    const endY = p.y + Math.sin(ang) * range;
    state.hazards.push({
      x: p.x,
      y: p.y,
      endX,
      endY,
      radius: 24,
      life: 0.5,
      type: 'zoro_crack_line'
    });
  }
}

export const zoroCharacter: CharacterModule = {
  id: 'zoro',
  name: 'ZORO',
  rarity: 'comun',
  portrait: '⚔️',
  portraitBg: '#1B5E20',
  attackIcon: '🗡️',
  themeClass: 'theme-zoro',
  color: '#66BB6A',
  vestColor: '#1B5E20',
  hp: 130,
  damage: 22.5,
  speed: 5.0,
  armor: 9,
  dashCd: 2.0,
  skills: [
    { name: 'Oni Giri', icon: '❌', cd: 4.5 },
    { name: 'Pound Ho', icon: '🌪️', cd: 6.0 },
    { name: 'Sanzen', icon: '⚔️', cd: 9.5 }
  ],
  cardMeta: {
    nameColor: '#66BB6A',
    role: 'DPS Área / Ejecutor',
    passiveText: 'Pasiva: 10% prob. sangrado',
    passiveColor: '#A5D6A7',
    stats: { hp: 69, dmg: 82, vel: 71, arm: 37 },
    comboDesc: 'Tajo (90px), Tajo X, Corte Aéreo (160px + grieta).',
    skillsDesc: '<b>H1:</b> 3 cortes • <b>H2:</b> Hélice X • <b>H3:</b> Sanzen Sekai cono 2×/3×/5×.'
  },

  createCustomState: () => ({
    sanzenStep: 0,
    sanzenTimer: 0,
    sanzenAngle: 0
  }),

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
      audio.playSlash(1.0);
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 90,
        color: '#66BB6A',
        life: 0.16,
        maxLife: 0.16,
        type: step === 0 ? 'arc' : 'arc_cross'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 90, Math.PI / 4, 1.0, 30, true);
    } else {
      audio.playSlash(1.25);
      state.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 20,
        y: p.y + Math.sin(aimAngle) * 20,
        vx: Math.cos(aimAngle) * 520,
        vy: Math.sin(aimAngle) * 520,
        traveled: 0,
        maxDist: 160,
        crackRadius: 70,
        radius: 24,
        dmgMult: 1.5,
        pierce: true,
        hitIds: [],
        life: 0.45,
        color: '#A5D6A7',
        type: 'zoro_air_cut',
        spawnedCrack: false
      });
      state.hitstopTimer = CONFIG.HITSTOP_DURATION;
      ctx.triggerHaptic(10);
    }
  },

  onDash(ctx) {
    const { state, player: p, audio } = ctx;
    p.customDashDist = CONFIG.DASH_DISTANCE;
    p.invulnTimer = CONFIG.DASH_IFRAMES;
    audio.playSlash(1.0);

    const endX = p.x + p.dashDirX * CONFIG.DASH_DISTANCE;
    const endY = p.y + p.dashDirY * CONFIG.DASH_DISTANCE;
    state.slashEffects.push({
      x: p.x,
      y: p.y,
      endX,
      endY,
      angle: p.facingAngle,
      range: CONFIG.DASH_DISTANCE,
      color: '#66BB6A',
      life: 0.2,
      maxLife: 0.2,
      type: 'line'
    });
    state.enemies.forEach((en) => {
      if (ctx.pointToSegmentDist(en.x, en.y, p.x, p.y, endX, endY) <= en.radius + 28) {
        const { amount, isCrit } = ctx.calculatePlayerDamage(0.8, true);
        ctx.damageEnemy(en, amount, { isCrit, applyBleed: Math.random() < 0.15 });
      }
    });
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const applyBurnFromMod = idx === 0 && state.mods.h1Burn;
    const pierceShield = idx === 1 && state.mods.h2PierceShield;
    const areaMult = idx === 2 ? state.mods.h3AreaMult : 1.0;

    if (idx === 0) {
      audio.playSlash(1.1);
      const dashDist = 130;
      const endX = Math.max(
        CONFIG.ARENA_MARGIN_X,
        Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X, p.x + Math.cos(aimAngle) * dashDist)
      );
      const endY = Math.max(
        CONFIG.ARENA_MARGIN_Y,
        Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y, p.y + Math.sin(aimAngle) * dashDist)
      );
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        endX,
        endY,
        angle: aimAngle,
        range: dashDist,
        color: '#66BB6A',
        life: 0.24,
        maxLife: 0.24,
        type: 'onigiri'
      });
      state.enemies.forEach((en) => {
        if (ctx.pointToSegmentDist(en.x, en.y, p.x, p.y, endX, endY) <= en.radius + 42) {
          const { amount, isCrit } = ctx.calculatePlayerDamage(3.6, true);
          ctx.damageEnemy(en, amount, {
            isCrit,
            applyBurn: applyBurnFromMod,
            applyBleed: Math.random() < 0.25
          });
        }
      });
      p.x = endX;
      p.y = endY;
    } else if (idx === 1) {
      audio.playSlash(1.0);
      ctx.triggerScreenShake(5, 0.12);
      state.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 25,
        y: p.y + Math.sin(aimAngle) * 25,
        vx: Math.cos(aimAngle) * 620,
        vy: Math.sin(aimAngle) * 620,
        radius: 28,
        rotation: aimAngle,
        dmgMult: 2.0,
        maxHits: 3,
        hitIds: [],
        pierceShield,
        life: 1.1,
        color: '#66BB6A',
        type: 'pound_ho_x'
      });
    } else if (idx === 2) {
      p.custom.sanzenStep = 0;
      p.custom.sanzenTimer = 0;
      p.custom.sanzenAngle = aimAngle;
      ctx.spawnFloatingText(p.x, p.y - 38, '⚔️ ¡SANZEN SEKAI!', '#66BB6A', 1.25);
      executeSanzenCut(ctx, 0, areaMult);
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p } = ctx;
    if (p.custom.sanzenStep > 0 && p.custom.sanzenStep < 3) {
      p.custom.sanzenTimer -= dt;
      if (p.custom.sanzenTimer <= 0) {
        executeSanzenCut(ctx, p.custom.sanzenStep, state.mods.h3AreaMult);
        p.custom.sanzenStep++;
        p.custom.sanzenTimer = 0.15;
        if (p.custom.sanzenStep >= 3) p.custom.sanzenStep = 0;
      }
    }
  },

  drawBody({ ctx, player: p, cfg, t }) {
    const isMoving = Math.hypot(p.vx, p.vy) > 15;
    const swingSpeed = isMoving ? t * 2.6 : t * 1.1;
    const armSwing = Math.sin(swingSpeed) * (isMoving ? 6.5 : 3.0);

    ctx.fillStyle = '#FFCC80';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-2 + armSwing * 0.7, -25, 11, 7, 3.5);
    ctx.roundRect(-2 - armSwing * 0.7, 18, 11, 7, 3.5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = cfg.vestColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2E7D32';
    ctx.beginPath();
    ctx.arc(2, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(24, 18);
    ctx.moveTo(-14, -14);
    ctx.lineTo(24, -18);
    ctx.stroke();
  },

  drawPreview(pctx, t, cfg) {
    const swordBob = Math.sin(t * 1.3) * 2;
    pctx.fillStyle = '#FFCC80';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.arc(-13, 2 - swordBob, 4, 0, Math.PI * 2);
    pctx.arc(13, 2 + swordBob, 4, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = cfg.vestColor;
    pctx.beginPath();
    pctx.arc(0, 1, 13, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.strokeStyle = '#E0E0E0';
    pctx.lineWidth = 2.5;
    pctx.beginPath();
    pctx.moveTo(-18, 9 + swordBob);
    pctx.lineTo(18, -7 - swordBob);
    pctx.moveTo(-18, -7 + swordBob);
    pctx.lineTo(18, 9 - swordBob);
    pctx.stroke();

    pctx.fillStyle = '#2E7D32';
    pctx.beginPath();
    pctx.arc(0, -5, 9.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
  }
};
