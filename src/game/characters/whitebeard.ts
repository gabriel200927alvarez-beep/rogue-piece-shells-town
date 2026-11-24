import { CONFIG } from '../config';
import { drainWhitebeardQuake } from '../rules';
import type { CharacterModule, CharacterContext } from './types';

function cancelWhitebeardQuakeZone(ctx: CharacterContext): void {
  const { player: p, audio } = ctx;
  if (!p || !p.custom.quakeZoneActive) return;
  p.custom.quakeZoneActive = false;
  p.skillCds[2] = p.skillMaxCds[2];
  audio.playExplosion(0.9);
  ctx.spawnFloatingText(p.x, p.y - 48, '🛑 ¡TERREMOTO CANCELADO!', '#FF5252', 1.2);
  const btnCancel = document.getElementById('btn-cancel-quake');
  if (btnCancel) btnCancel.style.display = 'none';
  ctx.updateHUD();
  ctx.updateCooldownUI();
}

export const whitebeardCharacter: CharacterModule = {
  id: 'whitebeard',
  name: 'Barbablanca',
  rarity: 'legendario',
  portrait: '🧔',
  portraitBg: '#37474F',
  attackIcon: '🔱',
  themeClass: 'theme-whitebeard',
  color: '#ECEFF1',
  vestColor: '#37474F',
  hp: 160,
  damage: 17,
  speed: 4.0,
  armor: 10,
  dashCd: 2.5,
  skills: [
    { name: 'Seaquake', icon: '⚡', cd: 10.0 },
    { name: 'Island Shaking', icon: '🔱', cd: 2.2 },
    { name: 'Island Shaking', icon: '🌊', cd: 20.0 }
  ],
  cardMeta: {
    displayName: 'BARBABLANCA',
    nameColor: '#ECEFF1',
    role: 'Hombre Más Fuerte / Devastador Sísmico',
    passiveText: 'Pasiva: Resistencia Sísmica + Gura Gura en Kills',
    passiveColor: '#CFD8DC',
    stats: { hp: 100, dmg: 86, vel: 55, arm: 62 },
    comboDesc: '<b>Murakumogiri:</b> Tajo sísmico (200px), combo sangrado y corte eléctrico (250px).',
    skillsDesc:
      '<b>H1:</b> Seaquake masivo 350px • <b>H2:</b> Island Shaking salto 2 cargas • <b>H3:</b> Island Shaking zona sísmica (escudo 50% y lentitud 40%).'
  },

  createCustomState: () => ({
    whitebeardEnergy: 0,
    wbJumpCharges: 2,
    wbJumpCdTimer: 0,
    wbIsJumping: false,
    wbJumpPhase: '',
    wbJumpTimer: 0,
    wbJumpStartX: 0,
    wbJumpStartY: 0,
    wbJumpTargetX: 0,
    wbJumpTargetY: 0,
    wbJumpScale: 1.0,
    wbRasetsuCutsLeft: 0,
    wbRasetsuTimer: 0,
    wbRasetsuAngle: 0,
    quakeZoneActive: false,
    wbQuakeVisualScale: 0,
    wbCameraZoom: 1.0,
    wbQuakeAttackCd: 0
  }),

  canDash: (p) => !p.custom.quakeZoneActive,

  canUseSkill(ctx, idx) {
    const p = ctx.player;
    if (p.custom.quakeZoneActive && idx < 2) {
      return false;
    }
    if (idx === 1 && ((p.custom.wbJumpCharges || 0) <= 0 || p.custom.wbIsJumping)) {
      return false;
    }
    return true;
  },

  onNormalAttackOverride(ctx) {
    const { state, player: p, audio } = ctx;
    if (!p.custom.quakeZoneActive) return false;
    if ((p.custom.wbQuakeAttackCd || 0) > 0) return true;

    p.custom.wbQuakeAttackCd = 1.0;
    audio.playExplosion(1.4);
    ctx.triggerScreenShake(5, 0.16);
    ctx.triggerHaptic(18);
    state.enemies.forEach((en) => {
      if (en.hp <= 0) return;
      if (Math.hypot(en.x - p.x, en.y - p.y) <= 250 + en.radius) {
        const { amount, isCrit } = ctx.calculatePlayerDamage(1.5, true);
        ctx.damageEnemy(en, amount, {
          isCrit,
          knockback: 30,
          sourceX: p.x,
          sourceY: p.y,
          pierceShield: true
        });
        ctx.applyBleed(en, 1);
        state.slashEffects.push({
          x: en.x,
          y: en.y,
          angle: 0,
          range: 45,
          isCircular: true,
          color: '#FFFFFF',
          life: 0.28,
          maxLife: 0.28,
          type: 'ring'
        });
        for (let k = 0; k < 6; k++) ctx.spawnParticle(en.x, en.y, '#ECEFF1', 4, 0.3);
      }
    });
    ctx.spawnFloatingText(p.x, p.y - 48, '⚡ ¡EARTHQUAKE!', '#FFFFFF', 1.3);
    return true;
  },

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.attackCooldown = step === 2 ? 0.42 : 0.28;
    p.comboResetTimer = 0.90;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    if (step === 2) {
      p.momentumTimer = 0.10;
      p.momentumDirX = Math.cos(aimAngle);
      p.momentumDirY = Math.sin(aimAngle);
      p.superArmorTimer = 0.15;
    }

    if (step === 0) {
      const SEAQUAKE_CRACK_CORE = '#263238';
      const SEAQUAKE_CRACK_EDGE = '#78909C';
      const SEAQUAKE_PARTICLE_LIGHT = '#B0BEC5';
      const SEAQUAKE_PARTICLE_DARK = '#546E7A';
      audio.playExplosion(1.2);
      state.hitstopTimer = 0.06;
      const endX = p.x + Math.cos(aimAngle) * 200;
      const endY = p.y + Math.sin(aimAngle) * 200;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        endX,
        endY,
        angle: aimAngle,
        range: 200,
        width: 60,
        color: SEAQUAKE_CRACK_CORE,
        subColor: SEAQUAKE_CRACK_EDGE,
        life: 0.28,
        maxLife: 0.28,
        type: 'wb_seaquake_crack'
      });
      for (let k = 0; k < 14; k++) {
        const frac = k / 14;
        ctx.spawnParticle(
          p.x + (endX - p.x) * frac + (Math.random() - 0.5) * 16,
          p.y + (endY - p.y) * frac + (Math.random() - 0.5) * 16,
          k % 2 === 0 ? SEAQUAKE_PARTICLE_LIGHT : SEAQUAKE_PARTICLE_DARK,
          5,
          0.35
        );
      }
      ctx.damageEnemiesInLine(p.x, p.y, aimAngle, 200, 30, 1.5, 0, false, 0.8);
    } else if (step === 1) {
      audio.playSlash(1.25);
      state.hitstopTimer = 0.03;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: 150,
        color: '#ECEFF1',
        subColor: '#D50000',
        life: 0.22,
        maxLife: 0.22,
        type: 'arc_cross'
      });
      for (let k = 0; k < 6; k++) {
        ctx.spawnParticle(p.x + Math.cos(aimAngle) * 70, p.y + Math.sin(aimAngle) * 70, '#ECEFF1', 4, 0.25);
      }
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 150, (30 * Math.PI) / 180, 0.6, 20, false, 0, 0, {
        killerBleedStacks: 1
      });
      p.custom.wbRasetsuCutsLeft = 2;
      p.custom.wbRasetsuTimer = 0.12;
      p.custom.wbRasetsuAngle = aimAngle;
    } else {
      const WB_HAKI_SWEEP_ANGLE = (240 * Math.PI) / 180;
      const WB_HAKI_SWEEP_HALF_ANGLE = WB_HAKI_SWEEP_ANGLE / 2;
      const WB_HAKI_SWEEP_RANGE = 240;
      audio.playShing();
      audio.playExplosion(1.3);
      audio.playFwoosh();
      ctx.triggerScreenShake(5, 0.14);
      state.hitstopTimer = 0.06;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: WB_HAKI_SWEEP_RANGE,
        halfAngle: WB_HAKI_SWEEP_HALF_ANGLE,
        color: '#D50000',
        subColor: '#111111',
        life: 0.30,
        maxLife: 0.30,
        type: 'wb_haki_sweep'
      });
      for (let k = 0; k < 18; k++) {
        const a = aimAngle + (Math.random() - 0.5) * WB_HAKI_SWEEP_ANGLE;
        const dist = 50 + Math.random() * (WB_HAKI_SWEEP_RANGE * 0.8);
        ctx.spawnParticle(
          p.x + Math.cos(a) * dist,
          p.y + Math.sin(a) * dist,
          k % 2 === 0 ? '#FF1744' : '#212121',
          5,
          0.32
        );
      }
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, WB_HAKI_SWEEP_RANGE, WB_HAKI_SWEEP_HALF_ANGLE, 2.0, 80, false, 0.5, 0, {
        killerBleedStacks: 2,
        knockback: 80,
        sourceX: p.x,
        sourceY: p.y,
        stun: 0.5
      });
    }
  },

  onDash(ctx) {
    const { player: p, audio } = ctx;
    p.customDashDist = 100;
    p.invulnTimer = 0.20;
    audio.playDash();
    for (let i = 0; i < 8; i++) ctx.spawnParticle(p.x, p.y, '#ECEFF1', 4, 0.3);
  },

  onSkillReactivate(ctx, idx) {
    if (idx === 2 && ctx.player.custom.quakeZoneActive) {
      cancelWhitebeardQuakeZone(ctx);
      return true;
    }
    return false;
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    if (p.custom.quakeZoneActive && idx < 2) return true;

    if (idx === 0) {
      const SEAQUAKE_CRACK_CORE = '#263238';
      const SEAQUAKE_CRACK_EDGE = '#78909C';
      const SEAQUAKE_PARTICLE_LIGHT = '#B0BEC5';
      const SEAQUAKE_PARTICLE_DARK = '#546E7A';
      audio.playExplosion(1.5);
      ctx.triggerScreenShake(8, 0.25);
      state.hitstopTimer = 0.08;
      const endX = p.x + Math.cos(aimAngle) * 350;
      const endY = p.y + Math.sin(aimAngle) * 350;

      state.slashEffects.push({
        x: p.x,
        y: p.y,
        endX,
        endY,
        angle: aimAngle,
        range: 350,
        width: 100,
        color: SEAQUAKE_CRACK_CORE,
        subColor: SEAQUAKE_CRACK_EDGE,
        life: 0.35,
        maxLife: 0.35,
        type: 'wb_seaquake_crack'
      });
      for (let k = 0; k < 20; k++) {
        const frac = k / 20;
        ctx.spawnParticle(
          p.x + (endX - p.x) * frac,
          p.y + (endY - p.y) * frac,
          k % 3 === 0 ? SEAQUAKE_PARTICLE_DARK : SEAQUAKE_PARTICLE_LIGHT,
          6,
          0.4
        );
      }

      ctx.damageEnemiesInLine(p.x, p.y, aimAngle, 350, 50, 3.0, 60, true, 1.2, { pierceShield: true });
      ctx.spawnFloatingText(p.x, p.y - 48, '⚡ ¡SEAQUAKE!', '#FFFFFF', 1.4);
    } else if (idx === 1) {
      if ((p.custom.wbJumpCharges || 0) <= 0 || p.custom.wbIsJumping) return true;
      p.custom.wbJumpCharges--;
      if (p.custom.wbJumpCdTimer <= 0) {
        p.custom.wbJumpCdTimer = 2.2;
      }
      p.skillCds[1] = 0;

      const target = ctx.findNearestEnemy(300);
      let targetX: number;
      let targetY: number;
      if (target) {
        targetX = target.x;
        targetY = target.y;
      } else {
        targetX = p.x + Math.cos(p.facingAngle) * 150;
        targetY = p.y + Math.sin(p.facingAngle) * 150;
      }
      targetX = Math.max(
        CONFIG.ARENA_MARGIN_X + p.radius,
        Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, targetX)
      );
      targetY = Math.max(
        CONFIG.ARENA_MARGIN_Y + p.radius,
        Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, targetY)
      );

      p.custom.wbIsJumping = true;
      p.custom.wbJumpPhase = 'anticipation';
      p.custom.wbJumpTimer = 0.15;
      p.custom.wbJumpStartX = p.x;
      p.custom.wbJumpStartY = p.y;
      p.custom.wbJumpTargetX = targetX;
      p.custom.wbJumpTargetY = targetY;
      p.custom.wbJumpScale = 1.0;
      p.invulnTimer = Math.max(p.invulnTimer, 0.55);

      audio.playFwoosh();
      ctx.spawnFloatingText(p.x, p.y - 42, `⚡ ¡LEAP (${p.custom.wbJumpCharges}/2)!`, '#FFFFFF', 1.0);
      ctx.updateHUD();
      ctx.updateCooldownUI();
      return true;
    } else if (idx === 2) {
      const currentEnergy = p.custom.whitebeardEnergy || 0;
      if (currentEnergy <= 0) {
        ctx.spawnFloatingText(p.x, p.y - 48, '🔒 Sin energía Gura Gura', '#CFD8DC', 1.15);
        return true;
      }

      p.custom.quakeZoneActive = true;
      p.skillCds[2] = 0;

      audio.playExplosion(1.6);
      ctx.triggerScreenShake(8, 0.30);
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2;
        ctx.spawnParticle(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 120, '#FFFFFF', 6, 0.4);
      }
      ctx.spawnFloatingText(p.x, p.y - 54, `🌊 ¡GURA GURA ZONE (${(currentEnergy / 10).toFixed(1)}s)!`, '#FFFFFF', 1.5);
      const btnCancel = document.getElementById('btn-cancel-quake');
      if (btnCancel) btnCancel.style.display = 'block';
      ctx.updateHUD();
      ctx.updateCooldownUI();
      return true;
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p, audio } = ctx;
    if (p.custom.wbIsJumping) {
      p.vx = 0;
      p.vy = 0;
      if (p.custom.wbJumpPhase === 'anticipation') {
        p.custom.wbJumpTimer -= dt;
        p.custom.wbJumpScale = 0.85;
        if (p.custom.wbJumpTimer <= 0) {
          p.custom.wbJumpPhase = 'air';
          p.custom.wbJumpTimer = 0.40;
          audio.playDash();
        }
      } else if (p.custom.wbJumpPhase === 'air') {
        p.custom.wbJumpTimer -= dt;
        const progress = 1.0 - Math.max(0, p.custom.wbJumpTimer / 0.40);
        p.x = p.custom.wbJumpStartX + (p.custom.wbJumpTargetX - p.custom.wbJumpStartX) * progress;
        p.y = p.custom.wbJumpStartY + (p.custom.wbJumpTargetY - p.custom.wbJumpStartY) * progress;
        p.custom.wbJumpScale = 1.0 + Math.sin(progress * Math.PI) * 0.40;
        if (Math.random() < 0.4) ctx.spawnParticle(p.x, p.y, '#ECEFF1', 4.5, 0.25);

        if (p.custom.wbJumpTimer <= 0) {
          p.custom.wbIsJumping = false;
          p.custom.wbJumpScale = 1.0;
          p.landSquashTimer = 0.12;
          p.visualScaleX = 1.18;
          p.visualScaleY = 0.84;
          p.x = p.custom.wbJumpTargetX;
          p.y = p.custom.wbJumpTargetY;
          audio.playExplosion(1.4);
          ctx.triggerScreenShake(7, 0.20);
          state.hitstopTimer = 0.08;

          state.slashEffects.push({
            x: p.x,
            y: p.y,
            angle: 0,
            range: 120,
            isCircular: true,
            color: '#FFFFFF',
            subColor: '#D50000',
            life: 0.35,
            maxLife: 0.35,
            type: 'wb_fissure_ring'
          });
          for (let k = 0; k < 20; k++) {
            const a = (k / 20) * Math.PI * 2;
            ctx.spawnParticle(
              p.x + Math.cos(a) * 50,
              p.y + Math.sin(a) * 50,
              k % 2 === 0 ? '#FFFFFF' : '#D7CCC8',
              6,
              0.4
            );
          }

          state.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            if (Math.hypot(en.x - p.x, en.y - p.y) <= 120 + en.radius) {
              const { amount, isCrit } = ctx.calculatePlayerDamage(2.0, true);
              ctx.damageEnemy(en, amount, {
                isCrit,
                stun: 0.8,
                knockback: 100,
                sourceX: p.x,
                sourceY: p.y,
                pierceShield: true
              });
            }
          });
          ctx.spawnFloatingText(p.x, p.y - 48, '💥 ¡ISLAND SHAKING!', '#FFFFFF', 1.4);
        }
      }
    }

    if (p.custom.wbRasetsuCutsLeft && p.custom.wbRasetsuCutsLeft > 0) {
      p.custom.wbRasetsuTimer -= dt;
      if (p.custom.wbRasetsuTimer <= 0) {
        p.custom.wbRasetsuTimer = 0.12;
        const cutIdx = p.custom.wbRasetsuCutsLeft;
        p.custom.wbRasetsuCutsLeft--;
        const deltaAngle = (cutIdx === 2 ? -30 : 30) * (Math.PI / 180);
        const cutAngle = p.custom.wbRasetsuAngle + deltaAngle;
        audio.playSlash(1.3 + (2 - cutIdx) * 0.1);
        state.hitstopTimer = 0.03;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: cutAngle,
          range: 150,
          color: '#ECEFF1',
          subColor: '#D50000',
          life: 0.22,
          maxLife: 0.22,
          type: 'arc_cross'
        });
        for (let k = 0; k < 6; k++) {
          ctx.spawnParticle(p.x + Math.cos(cutAngle) * 70, p.y + Math.sin(cutAngle) * 70, '#ECEFF1', 4, 0.25);
        }
        ctx.damageEnemiesInCone(p.x, p.y, cutAngle, 150, (30 * Math.PI) / 180, 0.6, 20, false, 0, 0, {
          killerBleedStacks: 1
        });
      }
    }

    if (p.custom.wbJumpCharges < 2) {
      p.custom.wbJumpCdTimer -= dt;
      if (p.custom.wbJumpCdTimer <= 0) {
        p.custom.wbJumpCharges++;
        if (p.custom.wbJumpCharges < 2) {
          p.custom.wbJumpCdTimer = 2.2;
        } else {
          p.custom.wbJumpCdTimer = 0;
        }
        ctx.updateHUD();
      }
    }

    if (p.custom.quakeZoneActive) {
      const drained = drainWhitebeardQuake(p.custom.whitebeardEnergy || 0, dt, 10);
      p.custom.whitebeardEnergy = drained.energy;
      p.custom.wbQuakeVisualScale = Math.min(1, (p.custom.wbQuakeVisualScale || 0) + dt / 0.42);
      p.custom.wbCameraZoom =
        (p.custom.wbCameraZoom ?? 1.0) + (0.90 - (p.custom.wbCameraZoom ?? 1.0)) * Math.min(1, dt * 7.5);
      if (state.shakeTimer <= 0) {
        ctx.triggerScreenShake(2, 0.08);
      }
      ctx.updateHUD();
      if (drained.ended) {
        p.custom.quakeZoneActive = false;
        p.custom.whitebeardEnergy = 0;
        p.skillCds[2] = p.skillMaxCds[2];
        ctx.spawnFloatingText(p.x, p.y - 44, 'Fin de Gura Gura Zone', '#CFD8DC', 1.0);
        const btnCancel = document.getElementById('btn-cancel-quake');
        if (btnCancel) btnCancel.style.display = 'none';
        ctx.updateHUD();
        ctx.updateCooldownUI();
      }
    } else {
      if (p.custom.wbQuakeVisualScale > 0) {
        p.custom.wbQuakeVisualScale = Math.max(0, p.custom.wbQuakeVisualScale - dt / 0.45);
      }
      if (Math.abs((p.custom.wbCameraZoom ?? 1.0) - 1.0) > 0.0005) {
        p.custom.wbCameraZoom =
          (p.custom.wbCameraZoom ?? 1.0) + (1.0 - (p.custom.wbCameraZoom ?? 1.0)) * Math.min(1, dt * 7.0);
      } else {
        p.custom.wbCameraZoom = 1.0;
      }
    }

    if (p.custom.wbQuakeAttackCd > 0) {
      p.custom.wbQuakeAttackCd -= dt;
    }
  },

  isMovementLocked: (p) => Boolean(p.custom.quakeZoneActive || p.custom.wbIsJumping),

  onModifyDamageEnemy: () => ({ ignoreArmorPct: 0.30 }),

  onAfterDamageEnemy(ctx) {
    const p = ctx.player;
    if (p.custom.quakeZoneActive) return;
    p.custom.whitebeardEnergy = Math.max(0, Math.min(100, (p.custom.whitebeardEnergy || 0) + 8));
    ctx.updateHUD();
  },

  onEnemyKilled(ctx, _en, resGain) {
    const p = ctx.player;
    if (p.custom.quakeZoneActive) return;
    p.custom.whitebeardEnergy = Math.max(0, Math.min(100, (p.custom.whitebeardEnergy || 0) + resGain));
    ctx.updateHUD();
  },

  onBeforePlayerDamage(ctx) {
    if (ctx.player.custom.quakeZoneActive) return { dmgMult: 0.50 };
    return {};
  },

  onEnemyTick(p, en) {
    if (p.custom.quakeZoneActive && Math.hypot(en.x - p.x, en.y - p.y) <= 250 + en.radius) {
      return { speedMult: 0.60 };
    }
    return {};
  },

  onCleanupEffects(p) {
    p.custom.quakeZoneActive = false;
    p.custom.wbQuakeVisualScale = 0;
    p.custom.wbCameraZoom = 1.0;
    const btnCancel = document.getElementById('btn-cancel-quake');
    if (btnCancel) btnCancel.style.display = 'none';
  },

  getCameraZoom: (p) => (typeof p.custom.wbCameraZoom === 'number' ? p.custom.wbCameraZoom : 1.0),
  getBodyScale: (p) => p.custom.wbJumpScale || 1.0,

  mountHUD(slotEl, hudCombatEl, ctx) {
    slotEl.innerHTML = `
      <div id="whitebeard-quake-hud" class="char-resource-hud" style="display:flex;">
        <span style="font-size:11px;">⚡</span>
        <div class="res-bar-outer" style="border-color:#ECEFF1; background:#263238;">
          <div id="hud-quake-fill" class="res-bar-fill" style="background: linear-gradient(90deg, #90A4AE, #FFFFFF);"></div>
        </div>
        <span id="hud-quake-text" class="res-text text-outline-sm" style="color:#FFFFFF;">GURA 0/100</span>
        <div id="wb-jump-pips" style="display:flex; gap:3px; margin-left:4px;">
          <div id="wb-jump-pip-0" class="wb-jump-pip ready">🔱</div>
          <div id="wb-jump-pip-1" class="wb-jump-pip ready">🔱</div>
        </div>
      </div>
    `;
    hudCombatEl.innerHTML = `<button id="btn-cancel-quake" class="btn-cancel-quake interactive">CANCEL</button>`;
    const btnCancel = document.getElementById('btn-cancel-quake');
    if (btnCancel) {
      const handleCancelQuake = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        cancelWhitebeardQuakeZone(ctx);
      };
      btnCancel.addEventListener('touchstart', handleCancelQuake, { passive: false });
      btnCancel.addEventListener('pointerdown', handleCancelQuake);
      btnCancel.addEventListener('click', handleCancelQuake);
    }
  },

  updateHUD(p) {
    const container = document.getElementById('whitebeard-quake-hud');
    if (!container) return;
    container.style.display = 'flex';
    const rawVal = p.custom.whitebeardEnergy || 0;
    const val = Math.round(rawVal);
    const fill = document.getElementById('hud-quake-fill');
    const txt = document.getElementById('hud-quake-text');
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, rawVal))}%`;
    if (txt) txt.textContent = `GURA ${val}/100`;

    const charges = p.custom.wbJumpCharges || 0;
    for (let i = 0; i < 2; i++) {
      const pip = document.getElementById(`wb-jump-pip-${i}`);
      if (pip) {
        if (i < charges) pip.classList.add('ready');
        else pip.classList.remove('ready');
      }
    }
  },

  updateButtonsUI(p, helpers) {
    if (p.custom.wbJumpCharges > 0) {
      helpers.setSkillCooldownOverride(1, 0, undefined, true);
    } else if (p.custom.wbJumpCdTimer > 0) {
      helpers.setSkillCooldownOverride(1, p.custom.wbJumpCdTimer, 2.2, false);
    }
    if (p.custom.quakeZoneActive) {
      helpers.setSkillCooldownOverride(2, 0, undefined, true);
    }

    const lblH2 = helpers.getLabel(1);
    if (lblH2) {
      if (p.custom.wbJumpCharges === 0 && p.custom.wbJumpCdTimer > 0) {
        lblH2.textContent = `Jump (${p.custom.wbJumpCdTimer.toFixed(1)}s)`;
      } else if (p.custom.wbJumpCharges < 2 && p.custom.wbJumpCdTimer > 0) {
        lblH2.textContent = `1/2 · ${p.custom.wbJumpCdTimer.toFixed(1)}s`;
      } else {
        lblH2.textContent = `Jump (${p.custom.wbJumpCharges}/2)`;
      }
    }

    const btnCancel = document.getElementById('btn-cancel-quake');
    if (btnCancel) btnCancel.style.display = p.custom.quakeZoneActive ? 'block' : 'none';
    const btnH3 = helpers.getBtn(2);
    const lblH3 = helpers.getLabel(2);
    const cdH3 = helpers.getCdEl(2);

    if (p.custom.quakeZoneActive) {
      helpers.dashBtn?.classList.add('skill-locked');
      helpers.getBtn(0)?.classList.add('skill-locked');
      helpers.getBtn(1)?.classList.add('skill-locked');
      if (btnH3) {
        btnH3.classList.remove('on-cooldown');
        btnH3.classList.remove('skill-locked');
        btnH3.classList.add('chain-active');
      }
      if (cdH3) cdH3.textContent = '';
      if (lblH3) lblH3.textContent = `CANCEL (${((p.custom.whitebeardEnergy || 0) / 10).toFixed(1)}s)`;
    } else {
      helpers.dashBtn?.classList.remove('skill-locked');
      helpers.getBtn(0)?.classList.remove('skill-locked');
      helpers.getBtn(1)?.classList.remove('skill-locked');
      if (btnH3) {
        btnH3.classList.remove('chain-active');
        if ((p.custom.whitebeardEnergy || 0) <= 0 && p.skillCds[2] <= 0) {
          btnH3.classList.add('skill-locked');
        } else {
          btnH3.classList.remove('skill-locked');
        }
      }
      if (lblH3) lblH3.textContent = 'Island Shaking';
    }
  },

  drawWorldBeforePlayer({ ctx, player: p }) {
    if (p.custom.quakeZoneActive || p.custom.wbQuakeVisualScale > 0.005) {
      const t = performance.now() * 0.005;
      const rawScale = Math.max(0, Math.min(1, p.custom.wbQuakeVisualScale || 0));
      const easeScale = 1 - Math.pow(1 - rawScale, 3);
      const radius = 250 * easeScale;
      if (radius > 2) {
        ctx.save();
        const alpha = Math.min(1.0, easeScale * 1.05);
        ctx.globalAlpha = alpha;

        const grad = ctx.createRadialGradient(p.x, p.y, Math.max(2, 10 * easeScale), p.x, p.y, radius);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
        grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.14)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0.35)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();

        for (let w = 1; w <= 3; w++) {
          const waveR = (t * 70 + w * 80) % radius;
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (1 - waveR / radius)})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, waveR, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = (3.5 + Math.sin(t * 8) * 1.5) * Math.max(0.4, easeScale);
        ctx.beginPath();
        const segs = 48;
        for (let s = 0; s <= segs; s++) {
          const ang = (s / segs) * Math.PI * 2;
          const wobble = Math.sin(ang * 12 + t * 4) * 3.5 * easeScale;
          const rx = p.x + Math.cos(ang) * (radius + wobble);
          const ry = p.y + Math.sin(ang) * (radius + wobble);
          if (s === 0) ctx.moveTo(rx, ry);
          else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2 * Math.max(0.5, easeScale);
        for (let f = 0; f < 8; f++) {
          const fAng = (f / 8) * Math.PI * 2 + Math.sin(f + t) * 0.1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          for (let seg = 1; seg <= 4; seg++) {
            const segDist = radius * 0.85 * (seg / 4);
            const perp = Math.sin(seg * 3.7 + f) * 8 * easeScale;
            const nx = p.x + Math.cos(fAng) * segDist - Math.sin(fAng) * perp;
            const ny = p.y + Math.sin(fAng) * segDist + Math.cos(fAng) * perp;
            ctx.lineTo(nx, ny);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  },

  drawAura({ ctx, player: p, t }) {
    if ((p.custom.whitebeardEnergy || 0) >= 100) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 10 + Math.sin(t * 5) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  },

  drawBody({ ctx, player: p }) {
    ctx.fillStyle = '#ECEFF1';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-3, 0, p.radius + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFCC80';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#78909C';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-18, -26);
    ctx.lineTo(26, 26);
    ctx.stroke();
    ctx.strokeStyle = '#FFB300';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(-18, -26, 8, 0, Math.PI * 0.7);
    ctx.stroke();

    ctx.fillStyle = '#37474F';
    ctx.beginPath();
    ctx.arc(0, -3, 13, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.arc(0, -2, 16, 0.25, Math.PI - 0.25);
    ctx.stroke();
  },

  drawPreview(pctx) {
    pctx.fillStyle = '#ECEFF1';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.ellipse(0, 4, 15, 14, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    pctx.fillStyle = '#FFCC80';
    pctx.beginPath();
    pctx.arc(0, 3, 10, 0, Math.PI * 2);
    pctx.fill();

    pctx.strokeStyle = '#78909C';
    pctx.lineWidth = 2.5;
    pctx.beginPath();
    pctx.moveTo(-16, -18);
    pctx.lineTo(-6, 18);
    pctx.stroke();
    pctx.strokeStyle = '#FFB300';
    pctx.lineWidth = 2.8;
    pctx.beginPath();
    pctx.arc(-16, -18, 5, 0, Math.PI * 0.7);
    pctx.stroke();

    pctx.fillStyle = '#37474F';
    pctx.beginPath();
    pctx.arc(0, -6, 9, Math.PI, 0);
    pctx.fill();

    pctx.strokeStyle = '#FFFFFF';
    pctx.lineWidth = 3.0;
    pctx.beginPath();
    pctx.arc(0, -7, 10, 0.2, Math.PI - 0.2);
    pctx.stroke();
  }
};
