import { CONFIG } from '../config';
import type { CharacterModule } from './types';

export const robinCharacter: CharacterModule = {
  id: 'robin',
  name: 'NICO ROBIN',
  rarity: 'raro',
  portrait: '🌸',
  portraitBg: '#6A1B9A',
  attackIcon: '👐',
  themeClass: 'theme-robin',
  color: '#CE93D8',
  vestColor: '#6A1B9A',
  hp: 100,
  damage: 20,
  speed: 5.4,
  armor: 11,
  dashCd: 2.0,
  skills: [
    { name: 'Clutch', icon: '👐', cd: 5.0 },
    { name: 'MilFleur', icon: '🌸', cd: 6.5 },
    { name: 'Mano', icon: '巨', cd: 10.0 }
  ],
  cardMeta: {
    nameColor: '#CE93D8',
    role: 'Control de Masas',
    passiveText: 'Pasiva: Cada 5 golpes → Root 0.5s',
    passiveColor: '#E1BEE7',
    stats: { hp: 59, dmg: 80, vel: 77, arm: 50 },
    comboDesc: '1 brazo, 2 en cruz, 4 brazos (110px 1.5× + 30% root).',
    skillsDesc: '<b>H1:</b> Root 3s • <b>H2:</b> 20 brazos área • <b>H3:</b> Mano gigante 3.5×.'
  },

  createCustomState: () => ({
    robinHitCounter: 0,
    robinRootReady: false
  }),

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.comboResetTimer = CONFIG.COMBO_RESET_TIME;
    p.attackCooldown = step === 2 ? 0.34 : 0.21;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    audio.playEtherealSwish();
    if (step === 0) {
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 100,
        count: 1,
        color: '#9C27B0',
        life: 0.22,
        maxLife: 0.22,
        type: 'robin_hands'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 100, Math.PI / 6, 1.0, 20);
    } else if (step === 1) {
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 100,
        count: 2,
        color: '#AB47BC',
        life: 0.24,
        maxLife: 0.24,
        type: 'robin_hands'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 100, Math.PI / 5, 1.0, 25);
    } else {
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 110,
        count: 4,
        color: '#CE93D8',
        life: 0.28,
        maxLife: 0.28,
        type: 'robin_hands'
      });
      const hitConnected = ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 110, Math.PI / 4, 1.5, 30, false, 0.30, 0.8);
      if (hitConnected) {
        state.hitstopTimer = CONFIG.HITSTOP_DURATION;
        ctx.triggerHaptic(10);
      }
    }
  },

  onDash(ctx) {
    const { state, player: p, audio } = ctx;
    p.customDashDist = 160;
    p.invulnTimer = 0.15;
    audio.playDash();
    audio.playEtherealSwish();
    state.slashEffects.push({
      x: p.x,
      y: p.y,
      angle: p.facingAngle + Math.PI,
      range: 45,
      count: 2,
      color: '#CE93D8',
      life: 0.22,
      maxLife: 0.22,
      type: 'robin_hands'
    });
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const applyBurnFromMod = idx === 0 && state.mods.h1Burn;
    const pierceShield = idx === 1 && state.mods.h2PierceShield;
    const areaMult = idx === 2 ? state.mods.h3AreaMult : 1.0;

    if (idx === 0) {
      audio.playEtherealSwish();
      const target = ctx.findNearestEnemy(200);
      if (target) {
        const { amount, isCrit } = ctx.calculatePlayerDamage(1.5, true);
        ctx.damageEnemy(target, amount, { isCrit, root: 3.0, clutchDot: 3.0, applyBurn: applyBurnFromMod });
        state.slashEffects.push({
          x: target.x,
          y: target.y,
          angle: 0,
          range: 40,
          count: 4,
          color: '#9C27B0',
          life: 0.35,
          maxLife: 0.35,
          type: 'robin_clutch'
        });
        ctx.spawnFloatingText(target.x, target.y - 42, '👐 ¡CLUTCH!', '#CE93D8', 1.15);
      } else {
        const fx = p.x + Math.cos(aimAngle) * 120;
        const fy = p.y + Math.sin(aimAngle) * 120;
        state.slashEffects.push({
          x: fx,
          y: fy,
          angle: 0,
          range: 45,
          count: 4,
          color: '#9C27B0',
          life: 0.3,
          maxLife: 0.3,
          type: 'robin_clutch'
        });
      }
    } else if (idx === 1) {
      audio.playEtherealSwish();
      ctx.triggerScreenShake(4, 0.14);
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: 0,
        range: 150,
        count: 20,
        color: '#BA68C8',
        life: 0.38,
        maxLife: 0.38,
        type: 'mil_fleur'
      });
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        const r = 40 + Math.random() * 110;
        ctx.spawnParticle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, '#E1BEE7', 5, 0.4);
      }
      state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= 150) {
          const { amount, isCrit } = ctx.calculatePlayerDamage(2.0, true);
          ctx.damageEnemy(en, amount, { isCrit, pierceShield });
        }
      });
    } else if (idx === 2) {
      audio.playEtherealSwish();
      const length = 250 * areaMult;
      const width = 80 * areaMult;
      state.pendingStrikes.push({
        timer: 0.30,
        maxTimer: 0.30,
        ox: p.x,
        oy: p.y,
        angle: aimAngle,
        length,
        width,
        dmgMult: 3.5,
        stun: 1.5,
        type: 'gigantesco_mano'
      });
      ctx.spawnFloatingText(p.x, p.y - 38, '巨 ¡GIGANTESCO MANO!', '#E1BEE7', 1.2);
    }
  },

  onAfterDamageEnemy(ctx, en) {
    if (!en || en.hp <= 0) return;
    const p = ctx.player;
    if (p.custom.robinRootReady) {
      p.custom.robinRootReady = false;
      en.rootTimer = Math.max(en.rootTimer || 0, 0.5);
      ctx.spawnFloatingText(en.x, en.y - 38, '🌸 ROOT (0.5s)', '#CE93D8', 0.85);
    }
    p.custom.robinHitCounter++;
    if (p.custom.robinHitCounter >= 5) {
      p.custom.robinHitCounter = 0;
      p.custom.robinRootReady = true;
      ctx.spawnFloatingText(p.x, p.y - 38, '🌸 Hana Ready!', '#E1BEE7', 0.8);
    }
  },

  drawBody({ ctx, t }) {
    ctx.fillStyle = '#7B1FA2';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1976D2';
    ctx.fillRect(-4, -14, 8, 28);

    const hairSway = Math.sin(t * 0.9) * 1.5;
    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(-2, hairSway * 0.4, 11, 0, Math.PI * 2);
    ctx.fill();
  },

  drawPreview(pctx) {
    pctx.fillStyle = '#7B1FA2';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.ellipse(0, 2, 9.5, 15, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#1976D2';
    pctx.fillRect(-7, -2, 14, 5);
    pctx.fillStyle = '#1A1A1A';
    pctx.beginPath();
    pctx.arc(0, -9, 8.5, 0, Math.PI * 2);
    pctx.fill();
  }
};
