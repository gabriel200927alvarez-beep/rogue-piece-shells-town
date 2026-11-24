import { CONFIG } from '../config';
import type { CharacterModule } from './types';

export const sanjiCharacter: CharacterModule = {
  id: 'sanji',
  name: 'SANJI',
  rarity: 'comun',
  portrait: '🔥',
  portraitBg: '#1C2833',
  attackIcon: '🦵',
  themeClass: 'theme-sanji',
  color: '#FFA726',
  vestColor: '#1C2833',
  hp: 115,
  damage: 21,
  speed: 6.4,
  armor: 5.5,
  dashCd: 1.7,
  skills: [
    { name: 'Diable', icon: '🔥', cd: 4.5 },
    { name: 'Concasse', icon: '☄️', cd: 6.0 },
    { name: 'Diable Jambe: Barrage', icon: '🔥', cd: 9.5 }
  ],
  cardMeta: {
    nameColor: '#FFA726',
    role: 'DPS Móvil / Evasivo',
    passiveText: 'Pasiva: +15% vel. tras dash',
    passiveColor: '#FFCC80',
    stats: { hp: 61, dmg: 76, vel: 91, arm: 23 },
    comboDesc: 'Recta (95px), Arco (110px), Descendente (onda 110px).',
    skillsDesc: '<b>H1:</b> 8 patadas + fuego • <b>H2:</b> Aturde • <b>H3:</b> Diable Jambe: Barrage (quema).'
  },

  createCustomState: () => ({
    diableHitsLeft: 0,
    diableTickTimer: 0,
    ifritShotsLeft: 0,
    ifritTickTimer: 0,
    ifritCycleIndex: 0
  }),

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.comboResetTimer = CONFIG.COMBO_RESET_TIME;
    p.attackCooldown = step === 2 ? 0.34 : 0.21;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    if (step === 2) {
      p.momentumTimer = 0.10;
      p.momentumDirX = Math.cos(aimAngle);
      p.momentumDirY = Math.sin(aimAngle);
      p.superArmorTimer = 0.15;
    }

    if (step === 0) {
      audio.playKick();
      const rightOffset = aimAngle + Math.PI / 2;
      state.slashEffects.push({
        x: p.x + Math.cos(rightOffset) * 7,
        y: p.y + Math.sin(rightOffset) * 7,
        angle: aimAngle,
        range: 95,
        color: '#FFA726',
        life: 0.14,
        maxLife: 0.14,
        type: 'stretch'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 95, (20 * Math.PI) / 180, 1.0, 30);
    } else if (step === 1) {
      audio.playKick();
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 110,
        color: '#E87722',
        life: 0.16,
        maxLife: 0.16,
        type: 'arc_left'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 110, Math.PI / 4, 1.1, 45);
    } else {
      audio.playExplosion(1.35);
      const impactX = p.x + Math.cos(aimAngle) * 60;
      const impactY = p.y + Math.sin(aimAngle) * 60;
      state.slashEffects.push({
        x: impactX,
        y: impactY,
        angle: 0,
        range: 110,
        isCircular: true,
        color: '#FF7043',
        life: 0.24,
        maxLife: 0.24,
        type: 'ring'
      });
      const hitConnected = ctx.damageEnemiesInCircle(impactX, impactY, 110, 1.6, 40);
      if (hitConnected) {
        state.hitstopTimer = CONFIG.HITSTOP_DURATION;
        ctx.triggerHaptic(10);
      }
    }
  },

  onDash(ctx) {
    const { player: p, audio } = ctx;
    p.customDashDist = CONFIG.DASH_DISTANCE;
    p.invulnTimer = CONFIG.DASH_IFRAMES;
    p.speedBuffTimer = 2.0;
    audio.playKick();
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const pierceShield = idx === 1 && state.mods.h2PierceShield;

    if (idx === 0) {
      p.custom.diableHitsLeft = 8;
      p.custom.diableTickTimer = 0;
    } else if (idx === 1) {
      audio.playExplosion(1.25);
      const targetX = p.x + Math.cos(aimAngle) * 65;
      const targetY = p.y + Math.sin(aimAngle) * 65;
      state.hitstopTimer = CONFIG.HITSTOP_DURATION;
      ctx.triggerScreenShake(6, 0.14);
      state.slashEffects.push({
        x: targetX,
        y: targetY,
        angle: 0,
        range: 85,
        isCircular: true,
        color: '#FFA726',
        life: 0.24,
        maxLife: 0.24,
        type: 'ring'
      });
      state.enemies.forEach((en) => {
        if (Math.hypot(en.x - targetX, en.y - targetY) - en.radius <= 85) {
          const { amount, isCrit } = ctx.calculatePlayerDamage(2.5, true);
          ctx.damageEnemy(en, amount, { isCrit, stun: 1.0, pierceShield });
        }
      });
    } else if (idx === 2) {
      p.custom.ifritShotsLeft = 6;
      p.custom.ifritTickTimer = 0;
      p.custom.ifritCycleIndex = 0;
      ctx.spawnFloatingText(p.x, p.y - 38, '🔥 ¡DIABLE JAMBE: BARRAGE!', '#FF7043', 1.2);
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p, audio } = ctx;

    if (p.custom.diableHitsLeft > 0) {
      p.custom.diableTickTimer -= dt;
      if (p.custom.diableTickTimer <= 0) {
        p.custom.diableTickTimer = 0.055;
        p.custom.diableHitsLeft--;
        const isLast = p.custom.diableHitsLeft === 0;
        audio.playKick();

        const aimAngle = ctx.getAimAngle();
        p.facingAngle = aimAngle;
        const spreadAngle = aimAngle + (Math.random() - 0.5) * (Math.PI / 2);

        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: spreadAngle,
          range: 100,
          color: '#FF5722',
          life: 0.12,
          maxLife: 0.12,
          type: 'stretch'
        });
        ctx.spawnParticle(p.x + Math.cos(spreadAngle) * 60, p.y + Math.sin(spreadAngle) * 60, '#FF9800', 5, 0.35);

        state.enemies.forEach((en) => {
          const dx = en.x - p.x;
          const dy = en.y - p.y;
          if (
            Math.hypot(dx, dy) - en.radius <= 100 &&
            Math.abs(ctx.normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= Math.PI / 4
          ) {
            const { amount, isCrit } = ctx.calculatePlayerDamage(0.4, true);
            ctx.damageEnemy(en, amount, { isCrit, applyBurn: isLast });
          }
        });
      }
    }

    if (p.custom.ifritShotsLeft > 0) {
      p.custom.ifritTickTimer -= dt;
      if (p.custom.ifritTickTimer <= 0) {
        p.custom.ifritTickTimer = 0.18;
        p.custom.ifritShotsLeft--;
        audio.playKick();
        audio.playFwoosh();

        const inRange = state.enemies
          .filter((en) => en.hp > 0 && Math.hypot(en.x - p.x, en.y - p.y) <= 300)
          .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));

        let targetAng = p.facingAngle;
        if (inRange.length > 0) {
          const chosen = inRange[p.custom.ifritCycleIndex % inRange.length];
          p.custom.ifritCycleIndex++;
          targetAng = Math.atan2(chosen.y - p.y, chosen.x - p.x);
          p.facingAngle = targetAng;
        }

        const footX = p.x + Math.cos(targetAng) * 18;
        const footY = p.y + Math.sin(targetAng) * 18;
        ctx.spawnParticle(footX, footY, '#FF5722', 6, 0.35);

        state.projectiles.push({
          fromPlayer: true,
          x: footX,
          y: footY,
          vx: Math.cos(targetAng) * 600,
          vy: Math.sin(targetAng) * 600,
          curveSign: (p.custom.ifritShotsLeft % 2 === 0 ? 1 : -1) * 180,
          traveled: 0,
          maxRange: 300,
          radius: 10,
          dmgMult: 1.5,
          hitIds: [],
          life: 0.55,
          color: '#FF5722',
          type: 'diable_comet'
        });
      }
    }
  },

  onShouldIgnoreTarget(_p, en, isSkill) {
    if (!isSkill && en.isFemale) {
      return { ignore: true, text: '¡No pateo damas! ♥', color: '#FF80AB' };
    }
    return { ignore: false };
  },

  drawBody({ ctx, player: p, cfg }) {
    ctx.fillStyle = cfg.vestColor;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(2, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (p.custom.diableHitsLeft > 0 || p.custom.ifritShotsLeft > 0) {
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(14, 10, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFA726';
      ctx.beginPath();
      ctx.arc(14, 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawPreview(pctx, t, cfg) {
    const kickSwing = Math.sin(t * 1.6) * 3;
    pctx.fillStyle = cfg.vestColor;
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.arc(0, 1, 13, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#FF7043';
    pctx.beginPath();
    pctx.arc(11, 9 + kickSwing, 5.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#FDD835';
    pctx.beginPath();
    pctx.arc(0, -5, 9.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
  }
};
