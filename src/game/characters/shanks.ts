import { CONFIG } from '../config';
import type { CharacterModule, CharacterContext } from './types';

function updateShanksChainButtonUI(p: CharacterContext['player']): void {
  const btn = document.getElementById('btn-h2');
  const lbl = document.getElementById('lbl-h2');
  const icon = document.getElementById('icon-h2');
  if (!btn || !lbl || !icon) return;
  if (p.custom.shanksChainStep && p.custom.shanksChainStep > 0) {
    btn.classList.add('chain-active');
    lbl.textContent = `CHAIN (${p.custom.shanksChainStep}/5)`;
    icon.textContent = '⚡';
  } else {
    btn.classList.remove('chain-active');
    lbl.textContent = 'Divine Departure';
    icon.textContent = '🗡️';
  }
}

export const shanksCharacter: CharacterModule = {
  id: 'shanks',
  name: 'Shanks (Straw Hat)',
  rarity: 'legendario',
  portrait: '🗡️',
  portraitBg: '#B71C1C',
  attackIcon: '⚔️',
  themeClass: 'theme-shanks',
  color: '#FF1744',
  vestColor: '#B71C1C',
  hp: 100,
  damage: 18,
  speed: 6.0,
  armor: 6,
  dashCd: 1.5,
  skills: [
    { name: "Conqueror's Haki", icon: '👑', cd: 10.0 },
    { name: 'Divine Departure', icon: '🗡️', cd: 10.0 },
    { name: 'Future Sight', icon: '👁️', cd: 18.0 }
  ],
  cardMeta: {
    displayName: 'SHANKS',
    nameColor: '#FF5252',
    role: 'Emperador / Haki Supremo',
    passiveText: 'Pasiva: 5-Hit Bleed Combo + Haki en Kills',
    passiveColor: '#FF8A80',
    stats: { hp: 80, dmg: 88, vel: 80, arm: 37 },
    comboDesc: '<b>Gryphon Combo:</b> 5 cortes rápidos con sangrado y remate de arco rojo (180px).',
    skillsDesc:
      "<b>H1:</b> Conqueror's Haki aturde hasta 4s según Haki • <b>H2:</b> Divine Departure cadena de 5 toques (1.0×→2.5× + Círculo Haki) • <b>H3:</b> Future Sight 5s de esquiva e inmunidad."
  },

  createCustomState: () => ({
    shanksHaki: 0,
    shanksChainStep: 0,
    shanksChainTimer: 0,
    shanksH2PendingCircles: [] as any[],
    futureSightTimer: 0
  }),

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 5;
    p.attackCooldown = step === 4 ? 0.22 : 0.10;
    p.comboResetTimer = 0.25;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    if (step < 4) {
      audio.playSlash(1.3 + step * 0.08);
      state.hitstopTimer = 0.03;
      const arcType = step % 2 === 0 ? 'arc' : 'arc_cross';
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 110,
        color: '#FF1744',
        life: 0.15,
        maxLife: 0.15,
        type: arcType
      });
      for (let k = 0; k < 5; k++) {
        ctx.spawnParticle(p.x + Math.cos(aimAngle) * 40, p.y + Math.sin(aimAngle) * 40, '#FF1744', 3.5, 0.22);
      }
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 110, (60 * Math.PI) / 180, 0.7, 15, false, 0, 0, {
        killerBleedStacks: 1
      });
    } else {
      audio.playShing();
      audio.playExplosion(1.3);
      audio.playFireCrackle();
      state.hitstopTimer = 0.08;
      ctx.triggerScreenShake(5, 0.16);
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 300,
        width: 140,
        color: '#FF1744',
        subColor: '#111111',
        life: 0.32,
        maxLife: 0.32,
        type: 'shanks_electric_arc'
      });
      for (let k = 0; k < 22; k++) {
        const a = aimAngle + (Math.random() - 0.5) * 1.2;
        const dist = 60 + Math.random() * 210;
        ctx.spawnParticle(
          p.x + Math.cos(a) * dist,
          p.y + Math.sin(a) * dist,
          k % 2 === 0 ? '#FF1744' : '#FF5252',
          5.5,
          0.35
        );
      }
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 300, (90 * Math.PI) / 180, 1.8, 100, false, 0, 0, {
        killerBleedStacks: 2,
        knockback: 100,
        sourceX: p.x,
        sourceY: p.y
      });
    }
  },

  onDash(ctx) {
    const { state, player: p, audio } = ctx;
    p.customDashDist = 180;
    p.invulnTimer = 0.15;
    audio.playDash();
    audio.playShing();
    for (let i = 0; i < 8; i++) ctx.spawnParticle(p.x, p.y, '#FF1744', 4.5, 0.3);
    state.slashEffects.push({
      x: p.x,
      y: p.y,
      endX: p.x + p.dashDirX * 180,
      endY: p.y + p.dashDirY * 180,
      angle: p.facingAngle,
      range: 180,
      color: '#FF1744',
      life: 0.20,
      maxLife: 0.20,
      type: 'line'
    });
  },

  onSkill(ctx, idx) {
    const { state, player: p, audio } = ctx;
    const areaMult = idx === 2 ? state.mods.h3AreaMult : 1.0;

    if (idx === 0) {
      const haki = p.custom.shanksHaki || 0;
      let dmgMult = 1.5;
      let stunDur = 3.0;
      if (haki >= 100) {
        dmgMult = 3.2;
        stunDur = 4.2;
        p.custom.shanksHaki = 0;
        ctx.updateHUD();
        ctx.spawnFloatingText(p.x, p.y - 52, '👑 ¡CONQUEROR MAX HAKI (3.2× / 4.2s)!', '#FF1744', 1.5);
      } else if (haki >= 75) {
        dmgMult = 2.6;
        stunDur = 3.9;
      } else if (haki >= 50) {
        dmgMult = 2.2;
        stunDur = 3.6;
      } else if (haki >= 25) {
        dmgMult = 1.8;
        stunDur = 3.3;
      }

      audio.playExplosion(1.4);
      audio.playShing();
      ctx.triggerScreenShake(6, 0.20);
      state.hitstopTimer = 0.08;
      const circleRadius = 220 * areaMult;

      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: 0,
        range: circleRadius,
        isCircular: true,
        color: '#FF1744',
        subColor: '#D50000',
        life: 0.38,
        maxLife: 0.38,
        type: 'shanks_haki_burst'
      });
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const r = 50 + Math.random() * (circleRadius - 50);
        ctx.spawnParticle(
          p.x + Math.cos(a) * r,
          p.y + Math.sin(a) * r,
          k % 2 === 0 ? '#FF1744' : '#D50000',
          5.5,
          0.35
        );
      }

      state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        const d = Math.hypot(en.x - p.x, en.y - p.y);
        if (d - en.radius <= circleRadius) {
          const { amount, isCrit } = ctx.calculatePlayerDamage(dmgMult, true);
          ctx.damageEnemy(en, amount, {
            isCrit,
            stun: stunDur,
            knockback: 65,
            sourceX: p.x,
            sourceY: p.y,
            pierceShield: true
          });
        }
      });
      ctx.spawnFloatingText(p.x, p.y - 48, `👑 ¡CONQUEROR'S HAKI! (${stunDur.toFixed(1)}s)`, '#FF1744', 1.4);
    } else if (idx === 1) {
      const nextStep = (p.custom.shanksChainStep || 0) + 1;
      const stepMults = [1.0, 1.2, 1.4, 1.6, 2.5];
      const dmgMult = stepMults[nextStep - 1] || 1.0;

      const target = ctx.findNearestEnemy(320);
      const cutAngle = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facingAngle;

      const travelDist = 320;
      const startX = p.x;
      const startY = p.y;
      const destX = Math.max(
        CONFIG.ARENA_MARGIN_X + p.radius,
        Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x + Math.cos(cutAngle) * travelDist)
      );
      const destY = Math.max(
        CONFIG.ARENA_MARGIN_Y + p.radius,
        Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y + Math.sin(cutAngle) * travelDist)
      );

      p.x = destX;
      p.y = destY;
      p.facingAngle = cutAngle;
      p.invulnTimer = Math.max(p.invulnTimer, 0.10);

      state.afterimages.push({ x: startX, y: startY, color: '#FF1744', life: 0.18, maxLife: 0.18 });
      state.afterimages.push({
        x: (startX + destX) / 2,
        y: (startY + destY) / 2,
        color: '#FF1744',
        life: 0.15,
        maxLife: 0.15
      });

      const hitSet = new Set<any>();

      if (nextStep < 5) {
        p.custom.shanksChainStep = nextStep;
        p.custom.shanksChainTimer = 1.2;
        p.skillCds[1] = 0;
        audio.playSlash(1.35 + (nextStep - 1) * 0.12);
        audio.playDash();
        state.hitstopTimer = 0.04;

        state.slashEffects.push({
          x: startX,
          y: startY,
          endX: destX,
          endY: destY,
          angle: cutAngle,
          range: 320,
          width: 10 + (nextStep - 1) * 3,
          color: '#FF1744',
          life: 0.20,
          maxLife: 0.20,
          type: 'line'
        });
        for (let k = 0; k < 6; k++) ctx.spawnParticle(destX, destY, '#FF1744', 4, 0.25);

        ctx.damageEnemiesInLine(startX, startY, cutAngle, travelDist, 20, dmgMult, 25, true, 0, {
          pierceShield: true,
          hitSet
        });
        updateShanksChainButtonUI(p);
        ctx.spawnFloatingText(p.x, p.y - 46, `🗡️ CHAIN (${nextStep}/5)`, '#FF5252', 1.15);
        return true; // defer cooldown while chain active
      } else {
        const SHANKS_H2_CIRCLE_DELAY = 0.3;
        const SHANKS_H2_CIRCLE_DURATION = 2.0;
        const SHANKS_H2_CIRCLE_RADIUS = 140;
        const SHANKS_H2_CIRCLE_TICKS = 22;
        const SHANKS_H2_CIRCLE_TICK_DMG = 0.35;
        const SHANKS_H2_CIRCLE_BLEED_PER_TICK = 0;
        const SHANKS_H2_EXPLOSION_RADIUS_BONUS = 70;
        const SHANKS_H2_EXPLOSION_DMG = 0.60;

        let firstHitPos: { x: number; y: number } | null = null;
        let hitCount = 0;

        state.slashEffects.push({
          x: startX,
          y: startY,
          endX: destX,
          endY: destY,
          angle: cutAngle,
          range: 320,
          width: 100,
          color: '#FF1744',
          subColor: '#111111',
          life: 0.28,
          maxLife: 0.28,
          type: 'line'
        });
        for (let k = 0; k < 10; k++) ctx.spawnParticle(destX, destY, '#FF1744', 5.5, 0.3);

        let firstHitRecorded = false;
        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          if (ctx.pointToSegmentDist(en.x, en.y, startX, startY, destX, destY) <= en.radius + 50) {
            if (!firstHitRecorded) {
              firstHitPos = { x: en.x, y: en.y };
              firstHitRecorded = true;
            }
            hitCount++;
            const { amount, isCrit } = ctx.calculatePlayerDamage(dmgMult, true);
            ctx.damageEnemy(en, amount, {
              isCrit,
              knockback: 25,
              sourceX: startX,
              sourceY: startY,
              pierceShield: true
            });
            ctx.applyBleed(en, 2);
          }
        });

        if (firstHitPos) {
          const hitPos = firstHitPos as { x: number; y: number };
          state.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            if (Math.hypot(en.x - hitPos.x, en.y - hitPos.y) < 10) {
              ctx.applyBleed(en, 2);
            }
          });
        }

        p.custom.shanksChainStep = 0;
        p.custom.shanksChainTimer = 0;
        p.skillCds[1] = p.skillMaxCds[1];
        audio.playShing();
        audio.playExplosion(1.4);
        ctx.triggerScreenShake(6, 0.22);
        state.hitstopTimer = 0.08;

        if (firstHitPos && hitCount > 0) {
          const hitPos = firstHitPos as { x: number; y: number };
          p.custom.shanksH2PendingCircles.push({
            x: hitPos.x,
            y: hitPos.y,
            delayTimer: SHANKS_H2_CIRCLE_DELAY,
            durationTimer: 0,
            maxDuration: SHANKS_H2_CIRCLE_DURATION,
            radius: SHANKS_H2_CIRCLE_RADIUS,
            ticksLeft: SHANKS_H2_CIRCLE_TICKS,
            tickTimer: 0,
            tickInterval: SHANKS_H2_CIRCLE_DURATION / SHANKS_H2_CIRCLE_TICKS,
            damageMult: SHANKS_H2_CIRCLE_TICK_DMG,
            bleedPerTick: SHANKS_H2_CIRCLE_BLEED_PER_TICK,
            explosionRadiusBonus: SHANKS_H2_EXPLOSION_RADIUS_BONUS,
            explosionDamageMult: SHANKS_H2_EXPLOSION_DMG,
            hasExploded: false,
            active: false
          });
          ctx.spawnFloatingText(hitPos.x, hitPos.y - 40, '🗡️ ¡DIVINE DEPARTURE!', '#FF1744', 1.3);
        } else {
          ctx.spawnFloatingText(p.x, p.y - 46, '💔 SIN IMPACTO', '#FF5252', 1.15);
        }
        updateShanksChainButtonUI(p);
      }
    } else if (idx === 2) {
      p.custom.futureSightTimer = 5.0;
      audio.playEtherealSwish();
      audio.playShing();
      ctx.triggerScreenShake(3, 0.12);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        ctx.spawnParticle(p.x + Math.cos(a) * 35, p.y + Math.sin(a) * 35, '#FF1744', 5, 0.35);
      }
      ctx.spawnFloatingText(p.x, p.y - 50, '👁️ ¡FUTURE SIGHT (+30% VEL)!', '#FF1744', 1.45);
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p, audio } = ctx;
    if (p.custom.futureSightTimer > 0) {
      p.custom.futureSightTimer -= dt;
      if (Math.random() < 0.4) ctx.spawnParticle(p.x, p.y, '#FF1744', 3.5, 0.25);
      const isMoving = ctx.getMoveInput().magnitude > 0.1 || p.isDashing;
      if (isMoving && Math.random() < 0.55) {
        state.afterimages.push({ x: p.x, y: p.y, color: '#FF1744', life: 0.35, maxLife: 0.35 });
        if (Math.random() < 0.3) ctx.spawnParticle(p.x, p.y, '#FF5252', 3, 0.2);
      }
    }
    if (p.custom.shanksChainStep > 0) {
      p.custom.shanksChainTimer -= dt;
      if (p.custom.shanksChainTimer <= 0) {
        p.custom.shanksChainStep = 0;
        p.custom.shanksChainTimer = 0;
        p.skillCds[1] = p.skillMaxCds[1];
        ctx.spawnFloatingText(p.x, p.y - 46, 'Cadena expirada', '#CFD8DC', 0.95);
        updateShanksChainButtonUI(p);
      }
    }

    const circles = p.custom.shanksH2PendingCircles;
    if (circles && circles.length > 0) {
      for (let i = circles.length - 1; i >= 0; i--) {
        const circle = circles[i];

        if (!circle.active) {
          circle.delayTimer -= dt;
          if (circle.delayTimer <= 0) {
            circle.active = true;
            circle.durationTimer = circle.maxDuration;
            state.slashEffects.push({
              x: circle.x,
              y: circle.y,
              angle: 0,
              range: circle.radius,
              isCircular: true,
              color: '#FF1744',
              subColor: '#D50000',
              life: circle.maxDuration,
              maxLife: circle.maxDuration,
              type: 'shanks_h2_haki_circle'
            });
            for (let k = 0; k < 12; k++) {
              const a = (k / 12) * Math.PI * 2;
              ctx.spawnParticle(
                circle.x + Math.cos(a) * circle.radius * 0.8,
                circle.y + Math.sin(a) * circle.radius * 0.8,
                '#FF1744',
                5,
                0.3
              );
            }
            audio.playShing();
            ctx.spawnFloatingText(circle.x, circle.y - 50, '🗡️ ¡HAKI CIRCLE!', '#FF1744', 1.2);
          }
          continue;
        }

        circle.durationTimer -= dt;
        circle.tickTimer -= dt;

        if (circle.tickTimer <= 0 && circle.ticksLeft > 0) {
          circle.tickTimer = circle.tickInterval;
          circle.ticksLeft--;
          state.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            const d = Math.hypot(en.x - circle.x, en.y - circle.y);
            if (d - en.radius <= circle.radius) {
              const { amount, isCrit } = ctx.calculatePlayerDamage(circle.damageMult, true);
              ctx.damageEnemy(en, amount, {
                isCrit,
                knockback: 10,
                sourceX: circle.x,
                sourceY: circle.y,
                pierceShield: true
              });
              if (circle.bleedPerTick > 0) ctx.applyBleed(en, circle.bleedPerTick);
            }
          });
          state.hitstopTimer = Math.max(state.hitstopTimer, 0.015);
          const numResidualCuts = 6;
          for (let c = 0; c < numResidualCuts; c++) {
            const angle = (c / numResidualCuts) * Math.PI * 2 + Math.random() * 0.3;
            const len = circle.radius * (0.4 + Math.random() * 0.5);
            const startR = circle.radius * 0.15;
            state.slashEffects.push({
              x: circle.x + Math.cos(angle) * startR,
              y: circle.y + Math.sin(angle) * startR,
              endX: circle.x + Math.cos(angle) * len,
              endY: circle.y + Math.sin(angle) * len,
              angle,
              range: len,
              color: Math.random() < 0.6 ? '#FF1744' : '#111111',
              life: 0.12,
              maxLife: 0.12,
              type: 'line'
            });
          }
          for (let k = 0; k < 8; k++) {
            const a = Math.random() * Math.PI * 2;
            const r = Math.random() * circle.radius;
            const colorChoice = Math.random();
            const color = colorChoice < 0.45 ? '#FF1744' : colorChoice < 0.8 ? '#111111' : '#FFFFFF';
            ctx.spawnParticle(circle.x + Math.cos(a) * r, circle.y + Math.sin(a) * r, color, 4.5, 0.25);
          }
          state.slashEffects.push({
            x: circle.x,
            y: circle.y,
            angle: 0,
            range: circle.radius * 0.35,
            isCircular: true,
            color: '#FF1744',
            subColor: '#FFFFFF',
            life: 0.06,
            maxLife: 0.06,
            type: 'ring'
          });
        }

        if (circle.durationTimer <= 0 && !circle.hasExploded) {
          circle.hasExploded = true;
          const explosionRadius = circle.radius + circle.explosionRadiusBonus;
          state.slashEffects.push({
            x: circle.x,
            y: circle.y,
            angle: 0,
            range: explosionRadius,
            isCircular: true,
            color: '#FF1744',
            subColor: '#D50000',
            life: 0.45,
            maxLife: 0.45,
            type: 'shanks_h2_haki_explosion'
          });
          state.slashEffects.push({
            x: circle.x,
            y: circle.y,
            angle: 0,
            range: explosionRadius * 0.6,
            isCircular: true,
            color: '#FFFFFF',
            subColor: '#FF1744',
            life: 0.3,
            maxLife: 0.3,
            type: 'shanks_h2_haki_explosion'
          });
          for (let k = 0; k < 48; k++) {
            const a = (k / 48) * Math.PI * 2;
            const baseR = explosionRadius * (0.5 + Math.random() * 0.5);
            const colorChoice = Math.random();
            const color =
              colorChoice < 0.35 ? '#FF1744' : colorChoice < 0.6 ? '#111111' : colorChoice < 0.85 ? '#FFFFFF' : '#FF9100';
            const size = 5 + Math.random() * 4;
            ctx.spawnParticle(
              circle.x + Math.cos(a) * baseR,
              circle.y + Math.sin(a) * baseR,
              color,
              size,
              0.5 + Math.random() * 0.3
            );
          }
          for (let s = 0; s < 16; s++) {
            const a = (s / 16) * Math.PI * 2;
            const len = explosionRadius * 1.2;
            state.slashEffects.push({
              x: circle.x,
              y: circle.y,
              endX: circle.x + Math.cos(a) * len,
              endY: circle.y + Math.sin(a) * len,
              angle: a,
              range: len,
              color: s % 2 === 0 ? '#FF1744' : '#FF9100',
              life: 0.25,
              maxLife: 0.25,
              type: 'line'
            });
          }
          audio.playExplosion(1.5);
          ctx.triggerScreenShake(8, 0.25);
          state.slashEffects.push({
            x: circle.x,
            y: circle.y,
            angle: 0,
            range: explosionRadius * 1.5,
            isCircular: true,
            color: '#FFFFFF',
            subColor: '#FF1744',
            life: 0.18,
            maxLife: 0.18,
            type: 'ring'
          });
          state.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            const d = Math.hypot(en.x - circle.x, en.y - circle.y);
            if (d - en.radius <= explosionRadius) {
              const { amount, isCrit } = ctx.calculatePlayerDamage(circle.explosionDamageMult, true);
              ctx.damageEnemy(en, amount, {
                isCrit,
                knockback: 50,
                sourceX: circle.x,
                sourceY: circle.y,
                pierceShield: true
              });
            }
          });
          ctx.spawnFloatingText(circle.x, circle.y - 40, '💥 ¡Haki Burst!', '#FF1744', 1.25);
        }

        if (circle.hasExploded) {
          circles.splice(i, 1);
        }
      }
    }
  },

  getMoveSpeedMult: (p) => (p.custom.futureSightTimer > 0 ? 1.30 : 1.0),

  onModifyDamageEnemy(_p, en) {
    if (en.stunTimer > 0) return { dmgMult: 1.20 };
    return {};
  },

  onAfterDamageEnemy(ctx) {
    const p = ctx.player;
    p.custom.shanksHaki = Math.max(0, Math.min(100, (p.custom.shanksHaki || 0) + 10));
    ctx.updateHUD();
  },

  onEnemyKilled(ctx, _en, resGain) {
    const p = ctx.player;
    p.custom.shanksHaki = Math.max(0, Math.min(100, (p.custom.shanksHaki || 0) + resGain));
    ctx.updateHUD();
  },

  onCheckEnemyProjectileHit(ctx, pr) {
    const { state, player: p, audio } = ctx;
    const isParrying = p.attackAnimTimer > 0 || performance.now() - (p.lastAttackAttemptTime || 0) <= 200;
    if (isParrying) {
      for (let k = 0; k < 8; k++) ctx.spawnParticle(pr.x, pr.y, '#FF1744', 4.5, 0.25);
      state.slashEffects.push({
        x: pr.x,
        y: pr.y,
        angle: 0,
        range: 35,
        isCircular: true,
        color: '#FF1744',
        life: 0.15,
        maxLife: 0.15,
        type: 'ring'
      });
      ctx.spawnFloatingText(pr.x, pr.y - 28, 'CUT!', '#FF1744', 1.25);
      audio.playMetalClank();
      audio.playShing();
      return true;
    }

    if (p.custom.futureSightTimer > 0) {
      for (let k = 0; k < 6; k++) ctx.spawnParticle(pr.x, pr.y, '#FF1744', 3.5, 0.25);
      ctx.spawnFloatingText(p.x, p.y - 32, 'MISS', '#FF1744', 1.0);
      audio.playEtherealSwish();
      return true;
    }

    return false;
  },

  onBeforePlayerDamage(ctx) {
    const { state, player: p, audio } = ctx;
    if (p.custom.futureSightTimer > 0) {
      const dodgeAngle = p.facingAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const origX = p.x;
      const origY = p.y;
      p.x += Math.cos(dodgeAngle) * 15;
      p.y += Math.sin(dodgeAngle) * 15;
      p.x = Math.max(
        CONFIG.ARENA_MARGIN_X + p.radius,
        Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x)
      );
      p.y = Math.max(
        CONFIG.ARENA_MARGIN_Y + p.radius,
        Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y)
      );
      state.afterimages.push({ x: origX, y: origY, color: '#FF1744', life: 0.20, maxLife: 0.20 });
      ctx.spawnFloatingText(p.x, p.y - 34, 'MISS', '#FF1744', 1.15);
      audio.playDash();
      return { cancelled: true };
    }

    if (p.custom.shanksChainStep > 0) {
      p.custom.shanksChainStep = 0;
      p.custom.shanksChainTimer = 0;
      p.skillCds[1] = p.skillMaxCds[1];
      ctx.spawnFloatingText(p.x, p.y - 48, '💔 CHAIN BROKEN', '#FF5252', 1.25);
      updateShanksChainButtonUI(p);
    }

    return {};
  },

  onCleanupEffects(p) {
    if (p.custom.shanksH2PendingCircles) {
      p.custom.shanksH2PendingCircles = [];
    }
  },

  mountHUD(slotEl) {
    slotEl.innerHTML = `
      <div id="shanks-haki-hud" class="char-resource-hud" style="display:flex;">
        <span style="font-size:11px;">👑</span>
        <div class="res-bar-outer" style="border-color:#FF1744; background:#2A0000;">
          <div id="hud-shanks-fill" class="res-bar-fill" style="background: linear-gradient(90deg, #B71C1C, #FF1744);"></div>
        </div>
        <span id="hud-shanks-text" class="res-text text-outline-sm" style="color:#FF5252;">HAKI 0/100</span>
      </div>
    `;
  },

  updateHUD(p) {
    const container = document.getElementById('shanks-haki-hud');
    if (!container) return;
    container.style.display = 'flex';
    const val = p.custom.shanksHaki || 0;
    const fill = document.getElementById('hud-shanks-fill');
    const txt = document.getElementById('hud-shanks-text');
    if (fill) fill.style.width = `${val}%`;
    if (txt) txt.textContent = `HAKI ${val}/100`;
  },

  updateButtonsUI(p, helpers) {
    if (p.custom.shanksChainStep > 0) {
      helpers.setSkillCooldownOverride(1, 0, undefined, true);
    }
    updateShanksChainButtonUI(p);
  },

  drawAura({ ctx, player: p, t }) {
    const val = p.custom.shanksHaki || 0;
    if (val >= 100) {
      ctx.strokeStyle = '#D50000';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 10 + Math.sin(t * 6) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#FF1744';
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const ang = t * 4 + (k * Math.PI) / 2;
        const r1 = p.radius + 6;
        const r2 = p.radius + 14 + Math.sin(t * 8 + k) * 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
        ctx.lineTo(Math.cos(ang + 0.2) * r2, Math.sin(ang + 0.2) * r2);
        ctx.stroke();
      }
    }
  },

  drawBody({ ctx, player: p, t }) {
    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(-2, 0, p.radius + 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#F5F5F5';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#E0E0E0';
    ctx.beginPath();
    ctx.moveTo(-10, -p.radius * 0.7);
    ctx.lineTo(-18, -p.radius * 0.2 + Math.sin(t * 2) * 2);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(12, 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#9E9E9E';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(12, 14);
    ctx.lineTo(26, 18);
    ctx.stroke();
    ctx.strokeStyle = '#FFB300';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 11);
    ctx.lineTo(14, 17);
    ctx.stroke();

    ctx.fillStyle = '#D32F2F';
    ctx.beginPath();
    ctx.arc(-2, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FBC02D';
    ctx.strokeStyle = '#7A5600';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-1, 0, 18, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#B71C1C';
    ctx.fillRect(-10, -3, 18, 3.5);
    ctx.fillStyle = '#FBC02D';
    ctx.beginPath();
    ctx.arc(-1, -1, 10, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
  },

  drawPreview(pctx, t) {
    pctx.fillStyle = '#5D4037';
    pctx.beginPath();
    pctx.ellipse(0, 3, 13, 14, 0, 0, Math.PI * 2);
    pctx.fill();

    pctx.fillStyle = '#F5F5F5';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 1.8;
    pctx.beginPath();
    pctx.ellipse(0, 2, 9, 11, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#E0E0E0';
    pctx.beginPath();
    pctx.moveTo(-9, -2);
    pctx.lineTo(-14, 4 + Math.sin(t * 2) * 2);
    pctx.lineTo(-8, 6);
    pctx.closePath();
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#FFCC80';
    pctx.beginPath();
    pctx.arc(10, 4, 3.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.strokeStyle = '#9E9E9E';
    pctx.lineWidth = 2.5;
    pctx.beginPath();
    pctx.moveTo(10, 4);
    pctx.lineTo(16, -6);
    pctx.stroke();
    pctx.strokeStyle = '#FFB300';
    pctx.lineWidth = 2.8;
    pctx.beginPath();
    pctx.moveTo(8, 2);
    pctx.lineTo(12, 6);
    pctx.stroke();

    pctx.fillStyle = '#D32F2F';
    pctx.beginPath();
    pctx.arc(0, -6, 9, 0, Math.PI * 2);
    pctx.fill();

    pctx.fillStyle = '#FBC02D';
    pctx.strokeStyle = '#7A5600';
    pctx.lineWidth = 1.2;
    pctx.beginPath();
    pctx.ellipse(0, -9, 14, 6, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#B71C1C';
    pctx.fillRect(-8, -12, 16, 2.5);
    pctx.fillStyle = '#FBC02D';
    pctx.beginPath();
    pctx.arc(0, -11, 7, Math.PI, 0);
    pctx.fill();
    pctx.stroke();
  }
};
