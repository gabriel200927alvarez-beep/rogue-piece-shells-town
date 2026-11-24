import { CONFIG } from '../config';
import {
  calculateDawnWhipRadius,
  drainGigantResource,
  shouldTriggerToonForce
} from '../rules';
import type { CharacterModule, CharacterContext } from './types';

function spawnLaughBubble(ctx: CharacterContext, text = 'HAHAHA!'): void {
  const { player: p, audio } = ctx;
  audio.playToonLaugh();
  if (!Array.isArray(p.custom.g5LaughBubbles)) p.custom.g5LaughBubbles = [];
  p.custom.g5LaughBubbles.push({
    x: p.x + (Math.random() - 0.5) * 24,
    y: p.y - 54,
    text,
    life: 1.45,
    maxLife: 1.45
  });
}

function triggerToonForceBounce(ctx: CharacterContext): void {
  const { player: p, audio } = ctx;
  p.custom.g5BalloonTimer = 0.45;
  p.visualScaleX = 1.45;
  p.visualScaleY = 1.45;
  audio.playBoing();
  ctx.spawnFloatingText(p.x, p.y - 44, 'MISS!', '#FFFFFF', 1.3);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    ctx.spawnParticle(
      p.x + Math.cos(a) * 18,
      p.y + Math.sin(a) * 18,
      k % 2 === 0 ? '#FFFFFF' : '#FFD54F',
      4.5,
      0.32
    );
  }
}

function finishDawnRocket(ctx: CharacterContext): void {
  const { player: p } = ctx;
  if (!p.custom.dawnRocketActive) return;
  p.custom.dawnRocketActive = false;
  p.custom.dawnRocketDecelTimer = 0.35;
  p.custom.dawnRocketDecelMax = 0.35;
  p.dashCharges = 0;
  p.dashCdTimer = p.dashCdMax * ctx.state.mods.dashCdMult;
  ctx.updateCooldownUI();
}

function updateG5Gatling(ctx: CharacterContext, dt: number): void {
  const { state, player: p, audio } = ctx;
  if (!p.custom.g5GatlingHitsLeft || p.custom.g5GatlingHitsLeft <= 0) return;

  p.custom.g5GatlingTimer -= dt;
  if (p.custom.g5GatlingTimer > 0) return;

  const mode = p.custom.g5GatlingMode as 'normal' | 'dawn_gatling';
  const isDawn = mode === 'dawn_gatling';
  p.custom.g5GatlingTimer = isDawn ? 0.055 : 0.065;
  p.custom.g5GatlingHitsLeft--;
  audio.playPunch(isDawn ? 0.85 : 1.15);

  let aimAngle = p.custom.g5GatlingAngle ?? p.facingAngle;
  if (isDawn) {
    const target = ctx.findNearestEnemy(340);
    if (target) {
      const targetAngle = Math.atan2(target.y - p.y, target.x - p.x);
      aimAngle += ctx.normalizeAngle(targetAngle - aimAngle) * 0.55;
      p.custom.g5GatlingAngle = aimAngle;
      p.facingAngle = aimAngle;
    }
  } else {
    const target = ctx.findNearestEnemyInCone(210, aimAngle, (90 * Math.PI) / 180);
    if (target) {
      aimAngle = Math.atan2(target.y - p.y, target.x - p.x);
      p.custom.g5GatlingAngle = aimAngle;
      p.facingAngle = aimAngle;
    }
  }

  const spread = aimAngle + (Math.random() - 0.5) * (isDawn ? 1.1 : 0.55);
  const range = isDawn ? 290 : 175;
  const dmgMult = isDawn ? 0.38 : 0.46;
  const halfAngle = isDawn ? (75 * Math.PI) / 180 : (35 * Math.PI) / 180;
  const armOffset = ((p.custom.g5GatlingHitsLeft % 2 === 0 ? 1 : -1) * (isDawn ? 22 : 10));
  const perp = spread + Math.PI / 2;

  if (isDawn) {
    // Puños gigantes con Haki (doble estela gruesa + brazo goma Haki)
    state.slashEffects.push({
      x: p.x + Math.cos(perp) * armOffset,
      y: p.y + Math.sin(perp) * armOffset,
      angle: spread,
      range,
      color: '#FF1744',
      armColor: '#212121',
      armOffset,
      isRubberArm: true,
      hakiArm: true,
      followPlayer: true,
      life: 0.13,
      maxLife: 0.13,
      type: 'stretch'
    });
    state.slashEffects.push({
      x: p.x + Math.cos(perp) * (armOffset * 0.6),
      y: p.y + Math.sin(perp) * (armOffset * 0.6),
      angle: spread + 0.05,
      range: range * 0.92,
      color: '#FFD54F',
      armColor: '#111111',
      armOffset: armOffset * 0.6,
      isRubberArm: true,
      hakiArm: true,
      followPlayer: true,
      life: 0.11,
      maxLife: 0.11,
      type: 'stretch'
    });
    ctx.spawnParticle(
      p.x + Math.cos(spread) * 140,
      p.y + Math.sin(spread) * 140,
      Math.random() < 0.5 ? '#FF1744' : '#FFD54F',
      6,
      0.26
    );
  } else {
    state.slashEffects.push({
      x: p.x + Math.cos(perp) * armOffset,
      y: p.y + Math.sin(perp) * armOffset,
      angle: spread,
      range,
      color: '#FFD54F',
      armColor: '#FFFFFF',
      armOffset,
      isRubberArm: true,
      hakiArm: false,
      followPlayer: true,
      life: 0.12,
      maxLife: 0.12,
      type: 'stretch'
    });
  }

  ctx.damageEnemiesInCone(p.x, p.y, aimAngle, range, halfAngle, dmgMult, isDawn ? 22 : 16, false, 0, 0, {
    pierceShield: isDawn
  });

  if (isDawn && p.custom.g5GatlingHitsLeft === 0) {
    const impactX = p.x + Math.cos(aimAngle) * 125;
    const impactY = p.y + Math.sin(aimAngle) * 125;
    audio.playExplosion(1.65);
    ctx.triggerScreenShake(12, 0.30);
    state.hitstopTimer = 0.12;
    state.hazards.push({
      x: impactX,
      y: impactY,
      angle: aimAngle,
      range: 280,
      life: 3.0,
      maxLife: 3.0,
      type: 'kkg_fissure'
    });
    state.slashEffects.push({
      x: impactX,
      y: impactY,
      angle: 0,
      range: 280,
      isCircular: true,
      color: '#111111',
      subColor: '#FF1744',
      life: 0.42,
      maxLife: 0.42,
      type: 'kkg_impact'
    });
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      ctx.spawnParticle(
        impactX + Math.cos(a) * 90,
        impactY + Math.sin(a) * 90,
        k % 2 === 0 ? '#FF1744' : '#FFD54F',
        6.5,
        0.46
      );
    }
    ctx.damageEnemiesInCircle(impactX, impactY, 280, 4.8, 180, true, 1.6, {
      pierceShield: true,
      applyBurn: true,
      burnDps: 6
    });
    ctx.spawnFloatingText(impactX, impactY - 44, '🦍 ¡KING KONG GUN!', '#FFD54F', 1.5);
    spawnLaughBubble(ctx, 'HAHAHA! ♪');
  }
}

export const luffyG5Character: CharacterModule = {
  id: 'luffy_g5',
  name: 'Luffy (Gear 5)',
  rarity: 'yonko',
  portrait: '☁️',
  portraitBg: 'linear-gradient(135deg, #FFFFFF 0%, #FFD54F 100%)',
  attackIcon: '👊',
  themeClass: 'theme-luffy_g5',
  color: '#FFFFFF',
  vestColor: '#FFD54F',
  hp: 120,
  damage: 16,
  speed: 6.2,
  armor: 8,
  dashCd: 3.0,
  autoAimRange: 340,
  skills: [
    { name: 'Dawn Whip', icon: '🌪️', cd: 9.0 },
    { name: 'Kaminari', icon: '⚡', cd: 10.0 },
    { name: 'Gigant', icon: '🦾', cd: 20.0 }
  ],
  cardMeta: {
    displayName: 'LUFFY (GEAR 5)',
    zarparName: 'LUFFY (G5)',
    nameColor: '#FFFFFF',
    role: 'Dios de la Risa / Toon Force Puro',
    passiveText: 'Pasiva: Toon Force (2% Rebote) + Salto Constante',
    passiveColor: '#FFD54F',
    stats: { hp: 96, dmg: 98, vel: 85, arm: 58 },
    comboDesc:
      '<b>Normal:</b> Dawn Cymbal, Gatling ×2, Haki y Salto Gigante • <b>Gigant:</b> Cymbal, Haki, King Kong Gun, Atracción y Drums of Liberation.',
    skillsDesc:
      '<b>Dash:</b> Dawn Rocket (mantén hasta 3s) • <b>H1:</b> Dawn Whip / Dawn Gatling • <b>H2:</b> Kaminari / Bajrang Gun • <b>H3:</b> Gigant (10s).'
  },

  createCustomState: () => ({
    g5GigantEnergy: 0,
    gigantActive: false,
    gigantBuildTimer: 0,
    gigantArmorBonus: 0,
    g5CameraZoom: 1.0,
    g5HopTimer: 0,
    g5HopScale: 1.0,
    g5LaughTimer: 6.0,
    g5LaughBubbles: [] as any[],
    g5BalloonTimer: 0,

    // Dash: Dawn Rocket
    dawnRocketActive: false,
    dawnRocketTimer: 0,
    dawnRocketDecelTimer: 0,
    dawnRocketDecelMax: 0.35,
    dawnRocketDirX: 1,
    dawnRocketDirY: 0,
    dawnRocketSoundTimer: 0,
    dawnRocketHitCooldowns: new Map<any, number>(),

    // Combo Gatling & Finisher Jump
    g5GatlingHitsLeft: 0,
    g5GatlingTimer: 0,
    g5GatlingMode: 'normal',
    g5GatlingAngle: 0,
    g5JumpActive: false,
    g5JumpPhase: '',
    g5JumpTimer: 0,
    g5JumpStartX: 0,
    g5JumpStartY: 0,
    g5JumpTargetX: 0,
    g5JumpTargetY: 0,
    g5JumpScale: 1.0,

    // H1: Dawn Whip (Tornado)
    dawnWhipActive: false,
    dawnWhipTimer: 0,
    dawnWhipDuration: 3.0,
    dawnWhipTickTimer: 0,
    dawnWhipOutroTimer: 0,
    dawnWhipOutroX: 0,
    dawnWhipOutroY: 0,

    // H2: Kaminari & Bajrang Gun
    kaminariBolts: [] as any[],
    electricWaves: [] as any[],
    bajrangStrikes: [] as any[],
    bajrangCraters: [] as any[],
    groundLifts: [] as any[]
  }),

  supportsHoldDash: () => true,
  isHoldDashActive: (p) => Boolean(p.custom.dawnRocketActive),
  onHoldDashRelease(ctx) {
    finishDawnRocket(ctx);
  },

  canAttack: (p) => !p.custom.g5JumpActive && !p.custom.dawnRocketActive,
  canDash: (p) => !p.custom.g5JumpActive && !p.custom.dawnWhipActive,
  canUseSkill(ctx, idx) {
    const p = ctx.player;
    if (p.custom.g5JumpActive) return false;
    if (idx === 2 && p.custom.gigantActive) return false;
    return true;
  },

  isMovementLocked: (p) => Boolean(p.custom.g5JumpActive),

  getMoveSpeedMult(p) {
    if (p.custom.dawnWhipActive) {
      const dur = p.custom.dawnWhipDuration || 3.0;
      const progress = 1 - Math.max(0, p.custom.dawnWhipTimer / dur);
      // Transición suave hasta duplicar la velocidad cuando el tornado es grande
      const ramp = Math.min(1, progress / 0.40);
      return 1.0 + ramp * 1.0;
    }
    return 1.0;
  },

  getBodySpin(p) {
    if (p.custom.dawnWhipActive) {
      return (performance.now() * 0.028) % (Math.PI * 2);
    }
    return 0;
  },

  getCameraZoom: (p) => (typeof p.custom.g5CameraZoom === 'number' ? p.custom.g5CameraZoom : 1.0),

  getBodyScale(p) {
    const balloon = p.custom.g5BalloonTimer > 0
      ? 1.0 + Math.sin((p.custom.g5BalloonTimer / 0.45) * Math.PI) * 0.55
      : 1.0;
    if (p.custom.g5JumpActive) {
      return (p.custom.g5JumpScale || 1.0) * balloon;
    }
    return (p.custom.g5HopScale || 1.0) * balloon;
  },

  onDash(ctx, aimFallback) {
    const { player: p, audio } = ctx;
    if (p.custom.dawnRocketActive) return true;
    const mv = ctx.getMoveInput();
    const dx = mv.magnitude > 0.1 ? mv.dirX : aimFallback.dirX;
    const dy = mv.magnitude > 0.1 ? mv.dirY : aimFallback.dirY;
    p.custom.dawnRocketActive = true;
    p.custom.dawnRocketTimer = 0;
    p.custom.dawnRocketDecelTimer = 0;
    p.custom.dawnRocketDirX = dx;
    p.custom.dawnRocketDirY = dy;
    p.custom.dawnRocketSoundTimer = 0.12;
    p.custom.dawnRocketHitCooldowns = new Map();
    p.dashCharges = 0;
    p.dashCdTimer = p.dashCdMax * ctx.state.mods.dashCdMult;
    p.invulnTimer = Math.max(p.invulnTimer, 0.25);
    audio.playDawnRocket(false);
    ctx.spawnFloatingText(p.x, p.y - 44, '💨 ¡DAWN ROCKET!', '#40C4FF', 1.15);
    ctx.updateCooldownUI();
    return true;
  },

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const isGigant = Boolean(p.custom.gigantActive);
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 5;
    p.comboResetTimer = 1.05;
    p.attackAnimTimer = 0.22;

    if (!isGigant) {
      // COMBO NORMAL (5 golpes)
      if (step === 0) {
        // 1. Dawn Cymbal: levanta el suelo frente a él (sin terremoto)
        p.attackCooldown = 0.30;
        p.attackCooldownMax = 0.30;
        audio.playKick();
        const len = 190;
        p.custom.groundLifts.push({
          x: p.x,
          y: p.y,
          angle: aimAngle,
          length: len,
          width: 64,
          life: 0.34,
          maxLife: 0.34
        });
        for (let k = 0; k < 10; k++) {
          const frac = (k + 1) / 10;
          ctx.spawnParticle(
            p.x + Math.cos(aimAngle) * len * frac + (Math.random() - 0.5) * 18,
            p.y + Math.sin(aimAngle) * len * frac + (Math.random() - 0.5) * 18,
            k % 2 === 0 ? '#D7CCC8' : '#8D6E63',
            5.5,
            0.34
          );
        }
        ctx.damageEnemiesInLine(p.x, p.y, aimAngle, len, 32, 1.25, 45, false, 0);
      } else if (step === 1 || step === 2) {
        // 2 & 3. Gatling de 3 golpes rápidos
        p.attackCooldown = 0.34;
        p.attackCooldownMax = 0.34;
        p.custom.g5GatlingMode = 'normal';
        p.custom.g5GatlingHitsLeft = 2; // 1 inmediato + 2 en ticks = 3 golpes
        p.custom.g5GatlingTimer = 0.065;
        p.custom.g5GatlingAngle = aimAngle;
        audio.playPunch(1.15);
        const perp = aimAngle + Math.PI / 2;
        state.slashEffects.push({
          x: p.x + Math.cos(perp) * 10,
          y: p.y + Math.sin(perp) * 10,
          angle: aimAngle,
          range: 175,
          color: '#FFD54F',
          armColor: '#FFFFFF',
          armOffset: 10,
          isRubberArm: true,
          followPlayer: true,
          life: 0.12,
          maxLife: 0.12,
          type: 'stretch'
        });
        ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 175, (35 * Math.PI) / 180, 0.46, 16);
      } else if (step === 3) {
        // 4. Barrido de Haki negro con rojo (similar al finisher de Barbablanca)
        p.attackCooldown = 0.36;
        p.attackCooldownMax = 0.36;
        const halfAng = (120 * Math.PI) / 180;
        audio.playShing();
        audio.playFwoosh();
        ctx.triggerScreenShake(5, 0.14);
        state.hitstopTimer = 0.05;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: aimAngle,
          range: 230,
          halfAngle: halfAng,
          color: '#D50000',
          subColor: '#111111',
          life: 0.28,
          maxLife: 0.28,
          type: 'wb_haki_sweep'
        });
        for (let k = 0; k < 14; k++) {
          const a = aimAngle + (Math.random() - 0.5) * halfAng * 2;
          const d = 50 + Math.random() * 170;
          ctx.spawnParticle(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, k % 2 === 0 ? '#FF1744' : '#212121', 5, 0.30);
        }
        ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 230, halfAng, 1.7, 75, false, 0, 0, {
          stun: 0.4,
          pierceShield: true
        });
      } else {
        // 5. Finisher: se hace gigante por un momento y salta sobre el target (efecto salto de Barbablanca)
        p.attackCooldown = 0.52;
        p.attackCooldownMax = 0.52;
        const target = ctx.findNearestEnemy(320);
        let tx = target ? target.x : p.x + Math.cos(aimAngle) * 140;
        let ty = target ? target.y : p.y + Math.sin(aimAngle) * 140;
        tx = Math.max(CONFIG.ARENA_MARGIN_X + p.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, tx));
        ty = Math.max(CONFIG.ARENA_MARGIN_Y + p.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, ty));

        p.custom.g5JumpActive = true;
        p.custom.g5JumpPhase = 'anticipation';
        p.custom.g5JumpTimer = 0.12;
        p.custom.g5JumpStartX = p.x;
        p.custom.g5JumpStartY = p.y;
        p.custom.g5JumpTargetX = tx;
        p.custom.g5JumpTargetY = ty;
        p.custom.g5JumpScale = 1.45;
        p.invulnTimer = Math.max(p.invulnTimer, 0.55);
        audio.playFwoosh();
      }
    } else {
      // COMBO EN GIGANT (5 golpes)
      if (step === 0) {
        // 1. Levantar el suelo (versión más grande)
        p.attackCooldown = 0.34;
        p.attackCooldownMax = 0.34;
        audio.playExplosion(1.1);
        const len = 270;
        p.custom.groundLifts.push({
          x: p.x,
          y: p.y,
          angle: aimAngle,
          length: len,
          width: 96,
          life: 0.38,
          maxLife: 0.38
        });
        for (let k = 0; k < 16; k++) {
          const frac = (k + 1) / 16;
          ctx.spawnParticle(
            p.x + Math.cos(aimAngle) * len * frac + (Math.random() - 0.5) * 32,
            p.y + Math.sin(aimAngle) * len * frac + (Math.random() - 0.5) * 32,
            k % 2 === 0 ? '#ECEFF1' : '#8D6E63',
            6.5,
            0.38
          );
        }
        ctx.damageEnemiesInLine(p.x, p.y, aimAngle, len, 48, 1.6, 75, false, 0.4);
      } else if (step === 1) {
        // 2. Barrido de Haki
        p.attackCooldown = 0.34;
        p.attackCooldownMax = 0.34;
        const halfAng = (120 * Math.PI) / 180;
        audio.playShing();
        audio.playExplosion(1.2);
        ctx.triggerScreenShake(6, 0.16);
        state.hitstopTimer = 0.05;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: aimAngle,
          range: 290,
          halfAngle: halfAng,
          color: '#D50000',
          subColor: '#111111',
          life: 0.30,
          maxLife: 0.30,
          type: 'wb_haki_sweep'
        });
        ctx.damageEnemiesInCone(p.x, p.y, aimAngle, 290, halfAng, 1.85, 95, false, 0, 0, {
          stun: 0.5,
          pierceShield: true
        });
      } else if (step === 2) {
        // 3. King Kong Gun
        p.attackCooldown = 0.42;
        p.attackCooldownMax = 0.42;
        const impactX = p.x + Math.cos(aimAngle) * 110;
        const impactY = p.y + Math.sin(aimAngle) * 110;
        audio.playExplosion(1.65);
        ctx.triggerScreenShake(10, 0.25);
        state.hitstopTimer = 0.10;
        state.hazards.push({
          x: impactX,
          y: impactY,
          angle: aimAngle,
          range: 250,
          life: 2.5,
          maxLife: 2.5,
          type: 'kkg_fissure'
        });
        state.slashEffects.push({
          x: impactX,
          y: impactY,
          angle: 0,
          range: 250,
          isCircular: true,
          color: '#111111',
          subColor: '#FF1744',
          life: 0.40,
          maxLife: 0.40,
          type: 'kkg_impact'
        });
        ctx.damageEnemiesInCircle(impactX, impactY, 250, 2.6, 150, false, 1.2, {
          pierceShield: true,
          applyBurn: true,
          burnDps: 5
        });
        ctx.spawnFloatingText(impactX, impactY - 40, '🦍 ¡KING KONG GUN!', '#FFD54F', 1.35);
      } else if (step === 3) {
        // 4. Atracción hacia sí mismo (versión más grande, mecánica de Kid)
        p.attackCooldown = 0.34;
        p.attackCooldownMax = 0.34;
        audio.playMagneticPull();
        const radius = 340;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: radius,
          isCircular: true,
          color: '#FFD54F',
          life: 0.34,
          maxLife: 0.34,
          type: 'magnetic_pull'
        });
        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          const d = Math.hypot(en.x - p.x, en.y - p.y);
          if (d - en.radius <= radius) {
            const { amount, isCrit } = ctx.calculatePlayerDamage(1.4, false);
            ctx.damageEnemy(en, amount, { isCrit });
            if (!en.isBoss) {
              en.magnetPullTimer = 0.35;
              en.magnetPullSpeed = Math.min(220, Math.max(0, d - 42)) / 0.35;
            }
            for (let k = 0; k < 4; k++) ctx.spawnParticle(en.x, en.y, '#FFFFFF', 4.5, 0.28);
          }
        });
      } else {
        // 5. Risa (Drums of Liberation): Mismo efecto exacto que Conqueror's Haki de Shanks pero más grande + risa
        p.attackCooldown = 0.50;
        p.attackCooldownMax = 0.50;
        audio.playExplosion(1.45);
        audio.playShing();
        ctx.triggerScreenShake(8, 0.24);
        state.hitstopTimer = 0.09;
        const circleRadius = 320;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: circleRadius,
          isCircular: true,
          color: '#FF1744',
          subColor: '#FFD54F',
          life: 0.42,
          maxLife: 0.42,
          type: 'shanks_haki_burst'
        });
        for (let k = 0; k < 32; k++) {
          const a = (k / 32) * Math.PI * 2;
          const r = 60 + Math.random() * (circleRadius - 60);
          ctx.spawnParticle(
            p.x + Math.cos(a) * r,
            p.y + Math.sin(a) * r,
            k % 2 === 0 ? '#FF1744' : '#FFD54F',
            6,
            0.38
          );
        }
        ctx.damageEnemiesInCircle(p.x, p.y, circleRadius, 2.8, 75, false, 3.5, {
          pierceShield: true
        });
        spawnLaughBubble(ctx, 'HAHAHA! 🥁');
        ctx.spawnFloatingText(p.x, p.y - 52, '🥁 ¡DRUMS OF LIBERATION!', '#FFD54F', 1.45);
      }
    }
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const isGigant = Boolean(p.custom.gigantActive);

    if (idx === 0) {
      if (isGigant) {
        // H1 en Gigant: Dawn Gatling (trackea enemigo, puños gigantes con Haki, finisher King Kong Gun + risa)
        p.custom.g5GatlingMode = 'dawn_gatling';
        p.custom.g5GatlingHitsLeft = 18;
        p.custom.g5GatlingTimer = 0.055;
        p.custom.g5GatlingAngle = aimAngle;
        audio.playRoar();
        ctx.spawnFloatingText(p.x, p.y - 52, '👊 ¡DAWN GATLING!', '#FFD54F', 1.4);
        p.skillCds[0] = 5.5 * state.mods.h1CdMult;
        return true;
      }

      // H1 Normal: Dawn Whip (Tornado 3s, crece exponencialmente, atrae, DPS masivo, 2× vel cuando es grande, explosión final)
      p.custom.dawnWhipActive = true;
      p.custom.dawnWhipDuration = 3.0;
      p.custom.dawnWhipTimer = 3.0;
      p.custom.dawnWhipTickTimer = 0.08;
      p.custom.dawnWhipOutroTimer = 0;
      audio.playFwoosh();
      ctx.spawnFloatingText(p.x, p.y - 50, '🌪️ ¡DAWN WHIP!', '#FFFFFF', 1.35);
      return false;
    } else if (idx === 1) {
      if (isGigant) {
        // H2 en Gigant: Bajrang Gun sobre objetivo targeteado
        const target = state.targetedEnemy || ctx.findNearestEnemy(480);
        const bx = target ? target.x : p.x + Math.cos(aimAngle) * 180;
        const by = target ? target.y : p.y + Math.sin(aimAngle) * 180;
        p.custom.bajrangStrikes.push({
          x: bx,
          y: by,
          timer: 0.46,
          maxTimer: 0.46,
          radius: 280
        });
        audio.playRoar();
        ctx.spawnFloatingText(p.x, p.y - 56, '🦍 ¡BAJRANG GUN!', '#FF1744', 1.5);
        p.skillCds[1] = 6.5;
        return true;
      }

      // H2 Normal: Kaminari (agarra un rayo azul/blanco luminoso y lo lanza al objetivo)
      const target = state.targetedEnemy || ctx.findNearestEnemy(480);
      const tx = target ? target.x : p.x + Math.cos(aimAngle) * 240;
      const ty = target ? target.y : p.y + Math.sin(aimAngle) * 240;
      p.custom.kaminariBolts.push({
        phase: 'hold',
        timer: 0.22,
        maxHold: 0.22,
        flightMax: 0.16,
        startX: p.x,
        startY: p.y,
        targetX: tx,
        targetY: ty,
        targetRef: target || null
      });
      audio.playLaserCharge();
      ctx.spawnFloatingText(p.x, p.y - 48, '⚡ ¡KAMINARI!', '#40C4FF', 1.35);
      return false;
    } else if (idx === 2) {
      // H3: Gigant (transformación 10s con medidor al máximo, CD 20s al terminar)
      if (p.custom.gigantActive) return true;
      const currentEnergy = p.custom.g5GigantEnergy || 0;
      if (currentEnergy <= 0) {
        ctx.spawnFloatingText(p.x, p.y - 48, '🔒 Sin energía Gigant', '#FFD54F', 1.15);
        return true;
      }

      p.custom.gigantActive = true;
      p.custom.gigantBuildTimer = 0.25;
      p.custom.gigantArmorBonus = p.armor; // ×2 armadura
      p.armor += p.custom.gigantArmorBonus;
      p.skillCds[0] = 0;
      p.skillCds[1] = 0;
      p.skillCds[2] = 0;

      audio.playRoar();
      audio.playExplosion(1.4);
      ctx.triggerScreenShake(9, 0.28);
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: 0,
        range: 135,
        isCircular: true,
        color: '#FFD54F',
        life: 0.36,
        maxLife: 0.36,
        type: 'ring'
      });
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        ctx.spawnParticle(p.x + Math.cos(a) * 60, p.y + Math.sin(a) * 60, k % 2 === 0 ? '#FFFFFF' : '#FFD54F', 6.5, 0.45);
      }
      ctx.spawnFloatingText(p.x, p.y - 56, `🦾 ¡GIGANT! (${(currentEnergy / 10).toFixed(1)}s)`, '#FFD54F', 1.55);
      spawnLaughBubble(ctx, 'HAHAHA!');
      ctx.updateHUD();
      ctx.updateCooldownUI();
      return true;
    }
  },

  onUpdate(ctx, dt) {
    const { state, player: p, audio } = ctx;

    // 1. Animación de salto constante (estilo salto rítmico de Barbablanca)
    if (!p.custom.g5JumpActive && !p.custom.dawnRocketActive && !p.custom.dawnWhipActive) {
      const cycleDur = 0.56;
      const prevTimer = p.custom.g5HopTimer || 0;
      const nextTimer = (prevTimer + dt) % cycleDur;
      if (nextTimer < prevTimer) {
        p.landSquashTimer = 0.08;
        p.visualScaleX = 1.12;
        p.visualScaleY = 0.88;
      }
      p.custom.g5HopTimer = nextTimer;
      const hopPhase = nextTimer / cycleDur;
      p.custom.g5HopScale = 1.0 + Math.sin(hopPhase * Math.PI) * 0.22;
    } else {
      p.custom.g5HopScale = 1.0;
    }

    if (p.custom.g5BalloonTimer > 0) {
      p.custom.g5BalloonTimer = Math.max(0, p.custom.g5BalloonTimer - dt);
    }

    // 2. Cada 6 segundos: cajita de texto flotante "HAHAHA!"
    p.custom.g5LaughTimer -= dt;
    if (p.custom.g5LaughTimer <= 0) {
      p.custom.g5LaughTimer = 6.0;
      spawnLaughBubble(ctx, 'HAHAHA!');
    }
    if (Array.isArray(p.custom.g5LaughBubbles)) {
      for (let i = p.custom.g5LaughBubbles.length - 1; i >= 0; i--) {
        const b = p.custom.g5LaughBubbles[i];
        b.life -= dt;
        b.y -= 22 * dt;
        if (b.life <= 0) p.custom.g5LaughBubbles.splice(i, 1);
      }
    }

    // 3. Dash "Dawn Rocket" (hasta 3s mantenido + frenado suave + CD 3s al terminar)
    if (p.custom.dawnRocketActive) {
      p.custom.dawnRocketTimer += dt;
      p.dashCharges = 0;
      p.dashCdTimer = p.dashCdMax * state.mods.dashCdMult;
      p.invulnTimer = Math.max(p.invulnTimer, 0.12);

      const mv = ctx.getMoveInput();
      if (mv.magnitude > 0.1) {
        p.custom.dawnRocketDirX = mv.dirX;
        p.custom.dawnRocketDirY = mv.dirY;
        p.facingAngle = Math.atan2(mv.dirY, mv.dirX);
      }
      const sprintSpeed = p.speed * 2.65;
      p.x += p.custom.dawnRocketDirX * sprintSpeed * dt;
      p.y += p.custom.dawnRocketDirY * sprintSpeed * dt;

      // Estela azul + afterimages
      if (Math.random() < 0.85) {
        ctx.spawnParticle(
          p.x - p.custom.dawnRocketDirX * 16 + (Math.random() - 0.5) * 14,
          p.y - p.custom.dawnRocketDirY * 16 + (Math.random() - 0.5) * 14,
          Math.random() < 0.5 ? '#00E5FF' : '#80D8FF',
          5.5,
          0.32,
          { vx: -p.custom.dawnRocketDirX * 90, vy: -p.custom.dawnRocketDirY * 90 }
        );
      }
      if (Math.random() < 0.72 && state.afterimages.length < 24) {
        state.afterimages.push({
          x: p.x,
          y: p.y,
          angle: p.facingAngle,
          radius: p.radius * (p.custom.gigantActive ? 1.45 : 1.0),
          color: '#29B6F6',
          life: 0.22,
          maxLife: 0.22
        });
      }

      p.custom.dawnRocketSoundTimer -= dt;
      if (p.custom.dawnRocketSoundTimer <= 0) {
        p.custom.dawnRocketSoundTimer = 0.14;
        audio.playDawnRocket(true);
      }

      // Hitbox empuja enemigos
      const hitMap: Map<any, number> = p.custom.dawnRocketHitCooldowns;
      const nowMs = performance.now();
      const hitboxR = p.radius * (p.custom.gigantActive ? 1.5 : 1.0) + 18;
      state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        const lastHit = hitMap.get(en) || 0;
        if (nowMs - lastHit < 280) return;
        if (Math.hypot(en.x - p.x, en.y - p.y) <= en.radius + hitboxR) {
          hitMap.set(en, nowMs);
          const { amount, isCrit } = ctx.calculatePlayerDamage(0.65, false);
          ctx.damageEnemy(en, amount, {
            isCrit,
            knockback: 230,
            sourceX: p.x,
            sourceY: p.y
          });
          ctx.spawnParticle(en.x, en.y, '#40C4FF', 5.5, 0.28);
        }
      });

      if (p.custom.dawnRocketTimer >= 3.0) {
        finishDawnRocket(ctx);
      }
    } else if (p.custom.dawnRocketDecelTimer > 0) {
      // Transición suave entre correr y dejar de correr
      p.custom.dawnRocketDecelTimer = Math.max(0, p.custom.dawnRocketDecelTimer - dt);
      const frac = p.custom.dawnRocketDecelTimer / (p.custom.dawnRocketDecelMax || 0.35);
      const slideSpeed = p.speed * 1.9 * (frac * frac);
      p.x += p.custom.dawnRocketDirX * slideSpeed * dt;
      p.y += p.custom.dawnRocketDirY * slideSpeed * dt;
      if (Math.random() < 0.55) {
        ctx.spawnParticle(p.x, p.y + p.radius * 0.6, '#80D8FF', 3.5, 0.22);
      }
    }

    // 4. Combo Finisher Salto Gigante (estilo salto de Barbablanca)
    if (p.custom.g5JumpActive) {
      p.vx = 0;
      p.vy = 0;
      if (p.custom.g5JumpPhase === 'anticipation') {
        p.custom.g5JumpTimer -= dt;
        p.custom.g5JumpScale = 1.25;
        if (p.custom.g5JumpTimer <= 0) {
          p.custom.g5JumpPhase = 'air';
          p.custom.g5JumpTimer = 0.36;
          audio.playDash();
        }
      } else if (p.custom.g5JumpPhase === 'air') {
        p.custom.g5JumpTimer -= dt;
        const progress = 1.0 - Math.max(0, p.custom.g5JumpTimer / 0.36);
        p.x = p.custom.g5JumpStartX + (p.custom.g5JumpTargetX - p.custom.g5JumpStartX) * progress;
        p.y = p.custom.g5JumpStartY + (p.custom.g5JumpTargetY - p.custom.g5JumpStartY) * progress;
        p.custom.g5JumpScale = 1.7 + Math.sin(progress * Math.PI) * 0.55;
        if (Math.random() < 0.45) ctx.spawnParticle(p.x, p.y, '#FFFFFF', 5, 0.25);

        if (p.custom.g5JumpTimer <= 0) {
          p.custom.g5JumpActive = false;
          p.custom.g5JumpScale = 1.0;
          p.landSquashTimer = 0.12;
          p.visualScaleX = 1.18;
          p.visualScaleY = 0.84;
          p.x = p.custom.g5JumpTargetX;
          p.y = p.custom.g5JumpTargetY;

          audio.playExplosion(1.4);
          ctx.triggerScreenShake(7, 0.20);
          state.hitstopTimer = 0.08;
          state.slashEffects.push({
            x: p.x,
            y: p.y,
            angle: 0,
            range: 130,
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
              p.x + Math.cos(a) * 52,
              p.y + Math.sin(a) * 52,
              k % 2 === 0 ? '#FFFFFF' : '#FFD54F',
              6,
              0.4
            );
          }
          ctx.damageEnemiesInCircle(p.x, p.y, 130, 2.2, 100, false, 0.8, {
            pierceShield: true
          });
          ctx.spawnFloatingText(p.x, p.y - 48, '💥 ¡DAWN STAMP!', '#FFFFFF', 1.4);
        }
      }
    }

    // 5. Gatling (combo normal + Dawn Gatling en Gigant)
    updateG5Gatling(ctx, dt);

    // 6. H1 Normal: Dawn Whip (Tornado)
    if (p.custom.dawnWhipActive) {
      const dur = p.custom.dawnWhipDuration || 3.0;
      p.custom.dawnWhipTimer -= dt;
      const progress = Math.min(1, 1 - Math.max(0, p.custom.dawnWhipTimer) / dur);
      const radius = calculateDawnWhipRadius(progress, 55, 250);

      // Atracción hacia el centro (mecánica de Kid)
      state.enemies.forEach((en) => {
        if (en.hp <= 0 || en.isBoss) return;
        const d = Math.hypot(en.x - p.x, en.y - p.y);
        if (d <= radius + 85 && d > 22) {
          en.magnetPullTimer = 0.08;
          en.magnetPullSpeed = Math.min(250, d * 1.8);
        }
      });

      // Ticks continuos de DPS masivo
      p.custom.dawnWhipTickTimer -= dt;
      if (p.custom.dawnWhipTickTimer <= 0) {
        p.custom.dawnWhipTickTimer = 0.15;
        ctx.damageEnemiesInCircle(p.x, p.y, radius, 0.55, 10, true, 0, {
          pierceShield: true
        });
        if (Math.random() < 0.7) {
          const a = Math.random() * Math.PI * 2;
          ctx.spawnParticle(
            p.x + Math.cos(a) * radius * 0.65,
            p.y + Math.sin(a) * radius * 0.65,
            Math.random() < 0.5 ? '#FFFFFF' : '#80D8FF',
            5,
            0.25
          );
        }
      }

      if (p.custom.dawnWhipTimer <= 0) {
        p.custom.dawnWhipActive = false;
        p.custom.dawnWhipOutroTimer = 0.30;
        p.custom.dawnWhipOutroX = p.x;
        p.custom.dawnWhipOutroY = p.y;
        audio.playExplosion(1.45);
        ctx.triggerScreenShake(9, 0.26);
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: 270,
          isCircular: true,
          color: '#FFFFFF',
          life: 0.34,
          maxLife: 0.34,
          type: 'ring'
        });
        for (let k = 0; k < 24; k++) {
          const a = (k / 24) * Math.PI * 2;
          ctx.spawnParticle(p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 90, k % 2 === 0 ? '#FFFFFF' : '#FFD54F', 6, 0.42);
        }
        ctx.damageEnemiesInCircle(p.x, p.y, 270, 2.2, 320, true, 1.5, {
          pierceShield: true
        });
        ctx.spawnFloatingText(p.x, p.y - 54, '🌪️ ¡DAWN WHIP FINALE!', '#FFD54F', 1.45);
      }
    }
    if (p.custom.dawnWhipOutroTimer > 0) {
      p.custom.dawnWhipOutroTimer = Math.max(0, p.custom.dawnWhipOutroTimer - dt);
    }

    // 7. H2 Normal: Kaminari (proyectil de rayo + onda expansiva)
    for (let i = p.custom.kaminariBolts.length - 1; i >= 0; i--) {
      const kb = p.custom.kaminariBolts[i];
      kb.timer -= dt;
      if (kb.phase === 'hold') {
        if (kb.targetRef && kb.targetRef.hp > 0) {
          kb.targetX = kb.targetRef.x;
          kb.targetY = kb.targetRef.y;
        }
        kb.startX = p.x;
        kb.startY = p.y;
        p.facingAngle = Math.atan2(kb.targetY - p.y, kb.targetX - p.x);
        if (kb.timer <= 0) {
          kb.phase = 'fly';
          kb.timer = kb.flightMax;
          audio.playFwoosh();
        }
      } else {
        if (kb.timer <= 0) {
          // Impacto de Kaminari
          const ix = kb.targetX;
          const iy = kb.targetY;
          audio.playThunder();
          ctx.triggerScreenShake(10, 0.28);
          state.hitstopTimer = 0.08;

          p.custom.electricWaves.push({
            x: ix,
            y: iy,
            range: 240,
            life: 0.40,
            maxLife: 0.40
          });
          for (let k = 0; k < 22; k++) {
            const a = (k / 22) * Math.PI * 2;
            ctx.spawnParticle(
              ix + Math.cos(a) * 55,
              iy + Math.sin(a) * 55,
              k % 2 === 0 ? '#00E5FF' : '#FFFFFF',
              6,
              0.38
            );
          }

          state.enemies.forEach((en) => {
            if (en.hp <= 0) return;
            if (Math.hypot(en.x - ix, en.y - iy) <= 185 + en.radius) {
              const { amount, isCrit } = ctx.calculatePlayerDamage(3.0, true);
              ctx.damageEnemy(en, amount, {
                isCrit,
                knockback: 165,
                sourceX: ix,
                sourceY: iy,
                stun: 0.8,
                pierceShield: true
              });
              // Electrocución por chunks discretos de vida
              if (en.hp > 0) {
                en.g5ElectrocuteChunks = 3;
                en.g5ElectrocuteTimer = 0.65;
                en.g5ElectrocuteDmg = Math.max(10, Math.round(p.baseDamage * 1.15));
              }
            }
          });
          p.custom.kaminariBolts.splice(i, 1);
        }
      }
    }

    // Chunks discretos de electrocución (no DPS gradual)
    for (let i = 0; i < state.enemies.length; i++) {
      const en = state.enemies[i];
      if (en.hp <= 0 || !en.g5ElectrocuteChunks || en.g5ElectrocuteChunks <= 0) continue;
      en.g5ElectrocuteTimer -= dt;
      if (en.g5ElectrocuteTimer <= 0) {
        en.g5ElectrocuteChunks--;
        en.g5ElectrocuteTimer = 0.65;
        audio.playThunder();
        for (let k = 0; k < 7; k++) {
          ctx.spawnParticle(en.x, en.y, k % 2 === 0 ? '#00E5FF' : '#FFFFFF', 4.5, 0.28);
        }
        ctx.damageEnemy(en, en.g5ElectrocuteDmg || 12, {
          pierceShield: true
        });
        ctx.spawnFloatingText(en.x, en.y - 38, '⚡ ¡ZAP!', '#00E5FF', 1.0);
      }
    }

    for (let i = p.custom.electricWaves.length - 1; i >= 0; i--) {
      p.custom.electricWaves[i].life -= dt;
      if (p.custom.electricWaves[i].life <= 0) p.custom.electricWaves.splice(i, 1);
    }

    // 8. H2 en Gigant: Bajrang Gun & Cráter
    for (let i = p.custom.bajrangStrikes.length - 1; i >= 0; i--) {
      const bs = p.custom.bajrangStrikes[i];
      bs.timer -= dt;
      if (bs.timer <= 0) {
        audio.playExplosion(1.9);
        ctx.triggerScreenShake(16, 0.45);
        state.hitstopTimer = 0.16;

        p.custom.bajrangCraters.push({
          x: bs.x,
          y: bs.y,
          radius: bs.radius * 0.92,
          life: 4.5,
          maxLife: 4.5
        });
        state.slashEffects.push({
          x: bs.x,
          y: bs.y,
          angle: 0,
          range: bs.radius,
          isCircular: true,
          color: '#111111',
          subColor: '#FF1744',
          life: 0.48,
          maxLife: 0.48,
          type: 'kkg_impact'
        });
        for (let k = 0; k < 36; k++) {
          const a = (k / 36) * Math.PI * 2;
          ctx.spawnParticle(
            bs.x + Math.cos(a) * 100,
            bs.y + Math.sin(a) * 100,
            k % 3 === 0 ? '#FF1744' : k % 3 === 1 ? '#FF9100' : '#212121',
            7.5,
            0.52
          );
        }
        ctx.damageEnemiesInCircle(bs.x, bs.y, bs.radius, 6.5, 260, true, 2.2, {
          pierceShield: true,
          applyBurn: true,
          burnDps: 10
        });
        ctx.spawnFloatingText(bs.x, bs.y - 54, '👊 ¡BAJRANG GUN!', '#FF1744', 1.6);
        p.custom.bajrangStrikes.splice(i, 1);
      }
    }

    for (let i = p.custom.bajrangCraters.length - 1; i >= 0; i--) {
      p.custom.bajrangCraters[i].life -= dt;
      if (p.custom.bajrangCraters[i].life <= 0) p.custom.bajrangCraters.splice(i, 1);
    }

    for (let i = p.custom.groundLifts.length - 1; i >= 0; i--) {
      p.custom.groundLifts[i].life -= dt;
      if (p.custom.groundLifts[i].life <= 0) p.custom.groundLifts.splice(i, 1);
    }

    // 9. H3: Gigant (10s a 10/s, ×2 armadura, ×1.5 dmg base, CD 20s al terminar)
    if (p.custom.gigantBuildTimer > 0) p.custom.gigantBuildTimer -= dt;
    if (p.custom.gigantActive) {
      const drained = drainGigantResource(p.custom.g5GigantEnergy || 0, dt, 10);
      p.custom.g5GigantEnergy = drained.energy;
      p.custom.g5CameraZoom =
        (p.custom.g5CameraZoom ?? 1.0) + (0.86 - (p.custom.g5CameraZoom ?? 1.0)) * Math.min(1, dt * 6.5);
      ctx.updateHUD();

      if (drained.ended) {
        p.custom.gigantActive = false;
        p.custom.g5GigantEnergy = 0;
        p.armor = Math.max(0, p.armor - (p.custom.gigantArmorBonus || 0));
        p.custom.gigantArmorBonus = 0;
        p.skillCds[2] = p.skillMaxCds[2]; // 20s cooldown
        ctx.spawnFloatingText(p.x, p.y - 46, 'Fin de Gigant', '#CFD8DC', 1.05);
        ctx.updateHUD();
        ctx.updateCooldownUI();
      }
    } else {
      if (Math.abs((p.custom.g5CameraZoom ?? 1.0) - 1.0) > 0.0005) {
        p.custom.g5CameraZoom =
          (p.custom.g5CameraZoom ?? 1.0) + (1.0 - (p.custom.g5CameraZoom ?? 1.0)) * Math.min(1, dt * 7.0);
      } else {
        p.custom.g5CameraZoom = 1.0;
      }
    }
  },

  onCalculateDamage(p) {
    return {
      dmgMult: p.custom.gigantActive ? 1.5 : 1.0
    };
  },

  onEnemyKilled(ctx, _en, resGain) {
    const p = ctx.player;
    if (p.custom.gigantActive) return;
    p.custom.g5GigantEnergy = Math.max(0, Math.min(100, (p.custom.g5GigantEnergy || 0) + resGain));
    ctx.updateHUD();
  },

  onCheckEnemyProjectileHit(ctx, pr) {
    // 2% Toon Force en proyectiles enemigos: rebota sin dañar a Luffy
    if (shouldTriggerToonForce(Math.random())) {
      triggerToonForceBounce(ctx);
      ctx.state.projectiles.push({
        fromPlayer: true,
        x: pr.x,
        y: pr.y,
        vx: -pr.vx * 1.45,
        vy: -pr.vy * 1.45,
        radius: pr.radius + 2,
        damage: pr.damage,
        reflectedFlatDamage: Math.max(18, Math.round((pr.damage || 10) * 1.8)),
        life: 1.8,
        maxLife: 1.8,
        hitIds: [],
        color: '#FFFFFF',
        type: 'bullet'
      });
      return true;
    }
    return false;
  },

  onBeforePlayerDamage(ctx, _incomingDmg, _isBlunt, _attacker, isProjectile) {
    // Para ataques cuerpo a cuerpo (proyectiles ya pasaron por onCheckEnemyProjectileHit)
    if (!isProjectile && shouldTriggerToonForce(Math.random())) {
      triggerToonForceBounce(ctx);
      return { cancelled: true };
    }
    return {};
  },

  onCleanupEffects(p) {
    if (p.custom.gigantActive && p.custom.gigantArmorBonus) {
      p.armor = Math.max(0, p.armor - p.custom.gigantArmorBonus);
    }
    p.custom.gigantActive = false;
    p.custom.gigantArmorBonus = 0;
    p.custom.g5CameraZoom = 1.0;
    p.custom.dawnRocketActive = false;
    p.custom.dawnRocketDecelTimer = 0;
    p.custom.dawnWhipActive = false;
    p.custom.g5JumpActive = false;
    p.custom.g5GatlingHitsLeft = 0;
    p.custom.kaminariBolts = [];
    p.custom.electricWaves = [];
    p.custom.bajrangStrikes = [];
    p.custom.bajrangCraters = [];
    p.custom.groundLifts = [];
    p.custom.g5LaughBubbles = [];
  },

  mountHUD(slotEl) {
    slotEl.innerHTML = `
      <div id="luffyg5-gigant-hud" class="char-resource-hud" style="display:flex;">
        <span style="font-size:11px;">☁️</span>
        <div class="res-bar-outer" style="border-color:#FFD54F; background:#1F1600;">
          <div id="hud-gigant-fill" class="res-bar-fill" style="background: linear-gradient(90deg, #FFFFFF, #FFD54F);"></div>
        </div>
        <span id="hud-gigant-text" class="res-text text-outline-sm" style="color:#FFD54F;">GIGANT 0/100</span>
      </div>
    `;
  },

  updateHUD(p) {
    const container = document.getElementById('luffyg5-gigant-hud');
    if (!container) return;
    container.style.display = 'flex';
    const rawVal = p.custom.g5GigantEnergy || 0;
    const val = Math.round(rawVal);
    const fill = document.getElementById('hud-gigant-fill');
    const txt = document.getElementById('hud-gigant-text');
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, rawVal))}%`;
    if (txt) txt.textContent = `GIGANT ${val}/100`;
  },

  updateButtonsUI(p, helpers) {
    const isGigant = Boolean(p.custom.gigantActive);

    const iconH1 = helpers.getIcon(0);
    const lblH1 = helpers.getLabel(0);
    if (iconH1 && lblH1) {
      if (isGigant) {
        iconH1.textContent = '👊';
        lblH1.textContent = 'Dawn Gatling';
      } else {
        iconH1.textContent = '🌪️';
        lblH1.textContent = p.custom.dawnWhipActive
          ? `Whip (${p.custom.dawnWhipTimer.toFixed(1)}s)`
          : 'Dawn Whip';
      }
    }

    const iconH2 = helpers.getIcon(1);
    const lblH2 = helpers.getLabel(1);
    if (iconH2 && lblH2) {
      if (isGigant) {
        iconH2.textContent = '🦍';
        lblH2.textContent = 'Bajrang Gun';
      } else {
        iconH2.textContent = '⚡';
        lblH2.textContent = 'Kaminari';
      }
    }

    const btnH3 = helpers.getBtn(2);
    const lblH3 = helpers.getLabel(2);
    const cdH3 = helpers.getCdEl(2);
    if (btnH3 && lblH3) {
      if (isGigant) {
        btnH3.classList.add('skill-locked');
        btnH3.classList.remove('chain-active');
        lblH3.textContent = `GIGANT (${((p.custom.g5GigantEnergy || 0) / 10).toFixed(1)}s)`;
        if (cdH3) cdH3.textContent = 'ACTIVO';
      } else if ((p.custom.g5GigantEnergy || 0) <= 0 && p.skillCds[2] <= 0) {
        btnH3.classList.add('skill-locked');
        btnH3.classList.remove('chain-active');
        lblH3.textContent = 'Gigant';
      } else {
        btnH3.classList.remove('skill-locked');
        btnH3.classList.remove('chain-active');
        lblH3.textContent = 'Gigant';
      }
    }
  },

  drawWorldBeforePlayer({ ctx, player: p, t }) {
    // 1. Cráteres de Bajrang Gun
    if (Array.isArray(p.custom.bajrangCraters)) {
      p.custom.bajrangCraters.forEach((cr: any) => {
        const alpha = Math.min(1, cr.life / 1.0);
        ctx.save();
        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(cr.x, cr.y, cr.radius * 0.12, cr.x, cr.y, cr.radius);
        grad.addColorStop(0, 'rgba(20, 14, 14, 0.82)');
        grad.addColorStop(0.65, 'rgba(62, 39, 35, 0.55)');
        grad.addColorStop(1, 'rgba(255, 23, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cr.x, cr.y, cr.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 3;
        for (let r = 0; r < 10; r++) {
          const a = (r / 10) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(cr.x + Math.cos(a) * 18, cr.y + Math.sin(a) * 18);
          ctx.lineTo(cr.x + Math.cos(a + 0.14) * cr.radius * 0.55, cr.y + Math.sin(a + 0.14) * cr.radius * 0.55);
          ctx.lineTo(cr.x + Math.cos(a - 0.08) * cr.radius * 0.92, cr.y + Math.sin(a - 0.08) * cr.radius * 0.92);
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    // 2. Dawn Cymbal (suelo levantado sin terremoto)
    if (Array.isArray(p.custom.groundLifts)) {
      p.custom.groundLifts.forEach((gl: any) => {
        const prog = 1 - gl.life / gl.maxLife;
        const alpha = Math.min(1, (gl.life / gl.maxLife) * 1.4);
        const liftH = Math.sin(Math.min(1, prog * 1.6) * Math.PI) * 18;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(gl.x, gl.y);
        ctx.rotate(gl.angle);
        // Sombra debajo del trozo de suelo levantado
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.roundRect(14, -gl.width * 0.48, gl.length * 0.92, gl.width * 0.96, 10);
        ctx.fill();
        // Losa de tierra/piedra levantada hacia arriba (-Y visual en pantalla)
        ctx.translate(0, -liftH);
        ctx.fillStyle = '#8D6E63';
        ctx.strokeStyle = '#3E2723';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(16, -gl.width * 0.42);
        ctx.lineTo(gl.length * 0.55, -gl.width * 0.52);
        ctx.lineTo(gl.length, -gl.width * 0.34);
        ctx.lineTo(gl.length * 0.96, gl.width * 0.34);
        ctx.lineTo(gl.length * 0.50, gl.width * 0.50);
        ctx.lineTo(16, gl.width * 0.40);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#D7CCC8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(28, -gl.width * 0.15);
        ctx.lineTo(gl.length * 0.82, -gl.width * 0.08);
        ctx.moveTo(45, gl.width * 0.18);
        ctx.lineTo(gl.length * 0.72, gl.width * 0.22);
        ctx.stroke();
        ctx.restore();
      });
    }

    // 3. Tornado Dawn Whip (crece exponencialmente + transición inicio/fin)
    if (p.custom.dawnWhipActive || p.custom.dawnWhipOutroTimer > 0) {
      const dur = p.custom.dawnWhipDuration || 3.0;
      const isOutro = !p.custom.dawnWhipActive;
      const cx = isOutro ? p.custom.dawnWhipOutroX : p.x;
      const cy = isOutro ? p.custom.dawnWhipOutroY : p.y;
      const progress = isOutro ? 1.0 : Math.min(1, 1 - Math.max(0, p.custom.dawnWhipTimer) / dur);
      const easeIn = isOutro ? 1.0 : Math.min(1, progress / 0.10);
      const fadeOut = isOutro ? p.custom.dawnWhipOutroTimer / 0.30 : 1.0;
      const r = calculateDawnWhipRadius(progress, 55, 250) * easeIn * (isOutro ? 1.0 + (1 - fadeOut) * 0.25 : 1.0);

      ctx.save();
      ctx.globalAlpha = fadeOut * 0.9;
      const grad = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      grad.addColorStop(0.55, 'rgba(128, 216, 255, 0.24)');
      grad.addColorStop(0.88, 'rgba(255, 213, 79, 0.28)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      for (let ring = 0; ring < 4; ring++) {
        const ringR = r * (0.32 + ring * 0.22);
        const startA = t * (4 + ring * 1.4) + ring * 1.5;
        ctx.strokeStyle = ring % 2 === 0 ? '#FFFFFF' : '#FFD54F';
        ctx.lineWidth = (4.5 - ring * 0.6) * fadeOut;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, cy, ringR, startA, startA + Math.PI * 1.35);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. Ondas expansivas de Kaminari
    if (Array.isArray(p.custom.electricWaves)) {
      p.custom.electricWaves.forEach((ew: any) => {
        const prog = 1 - ew.life / ew.maxLife;
        const alpha = Math.max(0, ew.life / ew.maxLife);
        const curR = ew.range * (0.2 + prog * 0.8);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#00E5FF';
        ctx.lineWidth = 8 * alpha;
        ctx.beginPath();
        for (let s = 0; s <= 24; s++) {
          const a = (s / 24) * Math.PI * 2;
          const jitter = s % 2 === 0 ? 10 : -8;
          const px = ew.x + Math.cos(a) * (curR + jitter * alpha);
          const py = ew.y + Math.sin(a) * (curR + jitter * alpha);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3 * alpha;
        ctx.stroke();
        ctx.restore();
      });
    }
  },

  drawWorldAfterPlayer({ ctx, player: p, t }) {
    // 1. Rayos Kaminari (azul con blanco luminoso)
    if (Array.isArray(p.custom.kaminariBolts)) {
      p.custom.kaminariBolts.forEach((kb: any) => {
        ctx.save();
        let bx = kb.startX;
        let by = kb.startY;
        let ang = Math.atan2(kb.targetY - kb.startY, kb.targetX - kb.startX);
        if (kb.phase === 'hold') {
          bx = p.x + Math.cos(ang - 0.5) * 26;
          by = p.y + Math.sin(ang - 0.5) * 26 - 16;
        } else {
          const prog = 1 - Math.max(0, kb.timer / kb.flightMax);
          bx = kb.startX + (kb.targetX - kb.startX) * prog;
          by = kb.startY + (kb.targetY - kb.startY) * prog;
        }
        ctx.translate(bx, by);
        ctx.rotate(ang);
        ctx.shadowColor = '#00E5FF';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#00E5FF';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(-42, -9);
        ctx.lineTo(-4, -14);
        ctx.lineTo(-10, -2);
        ctx.lineTo(48, 0);
        ctx.lineTo(4, 15);
        ctx.lineTo(10, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
    }

    // 2. Bajrang Gun (puño gigante de Haki masivo descendiendo sobre objetivo)
    if (Array.isArray(p.custom.bajrangStrikes)) {
      p.custom.bajrangStrikes.forEach((bs: any) => {
        const prog = 1 - Math.max(0, bs.timer / bs.maxTimer);
        const dropY = bs.y - (1 - prog * prog) * 320;
        ctx.save();
        // Sombra creciente en el suelo
        ctx.fillStyle = `rgba(0, 0, 0, ${0.25 + prog * 0.45})`;
        ctx.beginPath();
        ctx.arc(bs.x, bs.y, bs.radius * (0.35 + prog * 0.65), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Puño gigante de Haki + nubes blancas
        ctx.translate(bs.x, dropY);
        ctx.fillStyle = '#141418';
        ctx.strokeStyle = '#FF1744';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, 92, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Nudillos de Haki
        ctx.fillStyle = '#2B2B32';
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.arc(k * 34, 48, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        // Vapor blanco alrededor de la muñeca
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        for (let c = 0; c < 6; c++) {
          const ca = (c / 6) * Math.PI * 2 + t * 2;
          ctx.beginPath();
          ctx.arc(Math.cos(ca) * 76, -42 + Math.sin(ca) * 18, 22, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    }

    // 3. Cajitas de texto flotante ("HAHAHA!") cada 6s o en risas
    if (Array.isArray(p.custom.g5LaughBubbles)) {
      p.custom.g5LaughBubbles.forEach((b: any) => {
        const alpha = Math.min(1, (b.life / b.maxLife) * 1.5);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(b.x, b.y);
        ctx.font = '900 15px system-ui, sans-serif';
        const w = ctx.measureText(b.text).width + 20;
        const h = 26;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 8);
        ctx.fill();
        ctx.stroke();
        // Piquito de cómic
        ctx.beginPath();
        ctx.moveTo(-6, h / 2 - 1);
        ctx.lineTo(0, h / 2 + 7);
        ctx.lineTo(6, h / 2 - 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#D50000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.text, 0, 1);
        ctx.restore();
      });
    }
  },

  drawAura({ ctx, player: p, t }) {
    const isGigant = Boolean(p.custom.gigantActive);
    const baseR = p.radius * (isGigant ? 1.48 : 1.0);
    const pulse = Math.sin(t * 4.5) * 3.5;

    // Aura blanca/dorada pulsante de Gear 5
    const grad = ctx.createRadialGradient(0, 0, baseR * 0.4, 0, 0, baseR + 18 + pulse);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
    grad.addColorStop(0.6, 'rgba(255, 224, 130, 0.28)');
    grad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, baseR + 18 + pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = isGigant ? 4 : 2.8;
    ctx.beginPath();
    ctx.arc(0, 0, baseR + 9 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.85)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, baseR + 14 - pulse * 0.6, t * 0.8, t * 0.8 + Math.PI * 1.4);
    ctx.stroke();

    // Estela azul cartoon cuando corre en Dawn Rocket
    if (p.custom.dawnRocketActive || p.custom.dawnRocketDecelTimer > 0) {
      ctx.strokeStyle = '#00E5FF';
      ctx.lineWidth = 4;
      for (let w = -1; w <= 1; w++) {
        ctx.beginPath();
        ctx.moveTo(-baseR - 8, w * 9);
        ctx.lineTo(-baseR - 26 - Math.sin(t * 14 + w) * 8, w * 11);
        ctx.stroke();
      }
    }
  },

  drawBody({ ctx, player: p, t }) {
    const isGigant = Boolean(p.custom.gigantActive);
    const buildRatio = p.custom.gigantBuildTimer > 0 ? 1 - p.custom.gigantBuildTimer / 0.25 : 1.0;
    const scaleFactor = isGigant ? 1.0 + 0.5 * buildRatio : 1.0; // Escala Punk Rotten de Kid (1.5×)

    ctx.save();
    ctx.scale(scaleFactor, scaleFactor);

    // Rueditas cómicas al correr en Dawn Rocket
    if (p.custom.dawnRocketActive || p.custom.dawnRocketDecelTimer > 0) {
      ctx.strokeStyle = '#40C4FF';
      ctx.lineWidth = 3;
      for (let side = -1; side <= 1; side += 2) {
        ctx.beginPath();
        ctx.arc(-6, side * 12, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-6, side * 12);
        ctx.lineTo(-6 + Math.cos(t * 24) * 8, side * 12 + Math.sin(t * 24) * 8);
        ctx.stroke();
      }
    }

    // Hagoromo (bufanda de nube blanca flotando alrededor)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#B0BEC5';
    ctx.lineWidth = 2;
    for (let c = 0; c < 6; c++) {
      const ang = (c / 6) * Math.PI * 2 + t * 0.9;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * (p.radius + 3), Math.sin(ang) * (p.radius + 3), 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Cuerpo blanco Gear 5
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Faja dorada / púrpura
    ctx.strokeStyle = '#CE93D8';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius - 3, Math.PI * 0.65, Math.PI * 1.35);
    ctx.stroke();

    // Rostro blanco + sonrisa caricaturesca
    ctx.fillStyle = '#FAFAFA';
    ctx.beginPath();
    ctx.arc(2, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Pelo blanco esponjoso estilo nube Nika
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    for (let h = 0; h < 5; h++) {
      const ha = -Math.PI * 0.85 + (h / 4) * Math.PI * 0.9;
      ctx.beginPath();
      ctx.arc(Math.cos(ha) * 10 - 2, Math.sin(ha) * 10, 6.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Ojos blancos con pupilas rojas
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(6, -3.5, 3.0, 0, Math.PI * 2);
    ctx.arc(6, 3.5, 3.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FF1744';
    ctx.beginPath();
    ctx.arc(6.8, -3.5, 1.5, 0, Math.PI * 2);
    ctx.arc(6.8, 3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  drawPreview(pctx, t) {
    // Aura blanca/dorada pulsante
    const auraR = 19 + Math.sin(t * 2.5) * 2.2;
    const auraGrad = pctx.createRadialGradient(0, 0, 5, 0, 0, auraR);
    auraGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
    auraGrad.addColorStop(0.65, 'rgba(255, 215, 0, 0.35)');
    auraGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    pctx.fillStyle = auraGrad;
    pctx.beginPath();
    pctx.arc(0, 0, auraR, 0, Math.PI * 2);
    pctx.fill();

    // Bufanda nube Hagoromo
    pctx.fillStyle = '#FFFFFF';
    pctx.strokeStyle = '#90A4AE';
    pctx.lineWidth = 1.4;
    for (let c = 0; c < 6; c++) {
      const a = (c / 6) * Math.PI * 2 + t * 0.7;
      pctx.beginPath();
      pctx.arc(Math.cos(a) * 13, 1 + Math.sin(a) * 10, 4.5, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
    }

    // Cuerpo blanco
    pctx.fillStyle = '#FFFFFF';
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.ellipse(0, 3, 11, 12, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    // Pelo nube blanco
    pctx.fillStyle = '#FFFFFF';
    [-7, -3, 2, 7].forEach((hx, idx) => {
      pctx.beginPath();
      pctx.arc(hx, -9 - (idx === 1 || idx === 2 ? 2 : 0), 5, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();
    });

    // Cabeza
    pctx.fillStyle = '#FFFFFF';
    pctx.beginPath();
    pctx.arc(0, -3, 8.5, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();

    // Ojos con pupilas rojas
    pctx.fillStyle = '#FF1744';
    pctx.beginPath();
    pctx.arc(-3, -4, 1.8, 0, Math.PI * 2);
    pctx.arc(3, -4, 1.8, 0, Math.PI * 2);
    pctx.fill();

    // Sonrisa cómica
    pctx.strokeStyle = '#000000';
    pctx.lineWidth = 1.6;
    pctx.beginPath();
    pctx.arc(0, -1, 4.5, 0.15, Math.PI - 0.15);
    pctx.stroke();

    // Mini risa cómica pulsante
    if (Math.sin(t * 1.6) > -0.2) {
      pctx.fillStyle = '#FFD54F';
      pctx.strokeStyle = '#000000';
      pctx.lineWidth = 2;
      pctx.font = '900 8px system-ui, sans-serif';
      pctx.textAlign = 'center';
      pctx.strokeText('HAHA!', 12, -16 + Math.sin(t * 3) * 1.5);
      pctx.fillText('HAHA!', 12, -16 + Math.sin(t * 3) * 1.5);
    }
  }
};
