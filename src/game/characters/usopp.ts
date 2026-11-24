import { CONFIG } from '../config';
import type { CharacterModule, CharacterContext } from './types';

function spawnUsoppPellet(
  ctx: CharacterContext,
  ox: number,
  oy: number,
  angle: number,
  range: number,
  dmgMult: number,
  isSecondaryVisual = false
): void {
  ctx.state.projectiles.push({
    fromPlayer: true,
    x: ox + Math.cos(angle) * 16,
    y: oy + Math.sin(angle) * 16,
    vx: Math.cos(angle) * 900,
    vy: Math.sin(angle) * 900,
    traveled: 0,
    maxRange: range,
    radius: isSecondaryVisual ? 4.5 : 6,
    dmgMult: isSecondaryVisual ? 0.35 : dmgMult,
    maxHits: 2,
    hitIds: [],
    life: 0.45,
    color: '#DAA520',
    type: 'usopp_pellet'
  });
}

export const usoppCharacter: CharacterModule = {
  id: 'usopp',
  name: 'USOPP',
  rarity: 'raro',
  portrait: '🎯',
  portraitBg: '#558B2F',
  attackIcon: '🪨',
  themeClass: 'theme-usopp',
  color: '#8BC34A',
  vestColor: '#558B2F',
  hp: 88,
  damage: 25,
  speed: 5.4,
  armor: 8,
  dashCd: 2.1,
  autoAimRange: 340,
  skills: [
    { name: 'Firebird', icon: '🔥', cd: 4.8 },
    { name: 'Smoke', icon: '💨', cd: 6.5 },
    { name: 'Ledger', icon: '💣', cd: 9.0 }
  ],
  cardMeta: {
    nameColor: '#8BC34A',
    role: 'Francotirador (280px)',
    passiveText: 'Pasiva: Proyectiles perforan +1',
    passiveColor: '#81D4FA',
    stats: { hp: 52, dmg: 100, vel: 77, arm: 36 },
    comboDesc: 'Tirachinas (280px, CD 2.0s), Doble tiro, Bomba (área 40px 1.5×).',
    skillsDesc: '<b>H1:</b> Pájaro fuego • <b>H2:</b> Nube humo • <b>H3:</b> 3 trampas explosivas.'
  },

  createCustomState: () => ({
    usoppDoubleShotTimer: 0,
    usoppDoubleShotAngle: 0
  }),

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.attackCooldown = 2.0;
    p.comboResetTimer = 2.55;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    audio.playSlingshot();
    if (step === 0) {
      spawnUsoppPellet(ctx, p.x, p.y, aimAngle, 280, 1.0, false);
    } else if (step === 1) {
      spawnUsoppPellet(ctx, p.x, p.y, aimAngle, 280, 1.0, false);
      p.custom.usoppDoubleShotTimer = 0.08;
      p.custom.usoppDoubleShotAngle = aimAngle;
    } else {
      state.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 18,
        y: p.y + Math.sin(aimAngle) * 18,
        vx: Math.cos(aimAngle) * 900,
        vy: Math.sin(aimAngle) * 900,
        traveled: 0,
        maxRange: 260,
        radius: 10,
        dmgMult: 1.5,
        maxHits: 2,
        hitIds: [],
        life: 0.5,
        color: '#FF7043',
        type: 'usopp_bomb'
      });
    }
  },

  onDash(ctx) {
    const { player: p, audio } = ctx;
    const mv = ctx.getMoveInput();
    const nearest = ctx.findNearestEnemy(450);
    if (nearest) {
      const awayAngle = Math.atan2(p.y - nearest.y, p.x - nearest.x);
      p.dashDirX = Math.cos(awayAngle);
      p.dashDirY = Math.sin(awayAngle);
      p.facingAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    } else if (mv.magnitude > 0.1) {
      p.dashDirX = -mv.dirX;
      p.dashDirY = -mv.dirY;
    } else {
      p.dashDirX = -Math.cos(p.facingAngle);
      p.dashDirY = -Math.sin(p.facingAngle);
    }
    p.customDashDist = 150;
    p.invulnTimer = 0.15;
    audio.playDash();
    for (let i = 0; i < 6; i++) ctx.spawnParticle(p.x, p.y, '#D7CCC8', 4, 0.3);
  },

  onDashEnd(ctx) {
    for (let i = 0; i < 5; i++) ctx.spawnParticle(ctx.player.x, ctx.player.y, '#D7CCC8', 3.5, 0.25);
  },

  onSkill(ctx, idx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const areaMult = idx === 2 ? state.mods.h3AreaMult : 1.0;

    if (idx === 0) {
      audio.playSlash(1.15);
      audio.playFwoosh();
      state.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 20,
        y: p.y + Math.sin(aimAngle) * 20,
        vx: Math.cos(aimAngle) * 760,
        vy: Math.sin(aimAngle) * 760,
        traveled: 0,
        maxRange: 320,
        radius: 18,
        dmgMult: 2.0,
        maxHits: 3,
        hitIds: [],
        life: 0.65,
        color: '#FF5722',
        type: 'firebird_star'
      });
    } else if (idx === 1) {
      audio.playSmokePoof();
      const sx = Math.max(
        CONFIG.ARENA_MARGIN_X + 40,
        Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - 40, p.x + Math.cos(aimAngle) * 80)
      );
      const sy = Math.max(
        CONFIG.ARENA_MARGIN_Y + 40,
        Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - 40, p.y + Math.sin(aimAngle) * 80)
      );
      state.hazards.push({
        x: sx,
        y: sy,
        radius: 120,
        life: 2.0,
        maxLife: 2.0,
        type: 'usopp_smoke'
      });
      for (let k = 0; k < 14; k++) ctx.spawnParticle(sx, sy, '#B0BEC5', 8, 0.7);
    } else if (idx === 2) {
      audio.playTrapClick();
      const trapRadius = 80 * areaMult;
      for (let t = 0; t < 3; t++) {
        const ang = aimAngle + (t * (Math.PI * 2)) / 3;
        const tx = Math.max(
          CONFIG.ARENA_MARGIN_X + 20,
          Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - 20, p.x + Math.cos(ang) * trapRadius)
        );
        const ty = Math.max(
          CONFIG.ARENA_MARGIN_Y + 20,
          Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - 20, p.y + Math.sin(ang) * trapRadius)
        );
        state.traps.push({
          x: tx,
          y: ty,
          triggerRadius: 24,
          blastRadius: 60 * areaMult,
          dmgMult: 3.0,
          stun: 0.5,
          life: 8.0
        });
      }
      ctx.spawnFloatingText(p.x, p.y - 36, '💣 ¡TRAMPAS LEDGER!', '#FF5252', 1.1);
    }
  },

  onUpdate(ctx, dt) {
    const p = ctx.player;
    if (p.custom.usoppDoubleShotTimer > 0) {
      p.custom.usoppDoubleShotTimer -= dt;
      if (p.custom.usoppDoubleShotTimer <= 0) {
        spawnUsoppPellet(ctx, p.x, p.y, p.custom.usoppDoubleShotAngle, 280, 0.35, true);
      }
    }
  },

  isAttackCooldownVisible: (p) => p.attackCooldown > 0.05,

  drawBody({ ctx, t }) {
    const sway = Math.sin(t) * 0.08;
    ctx.rotate(sway);

    ctx.fillStyle = '#5D4037';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(-10, 0, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6B8E23';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DAA520';
    ctx.fillRect(-4, -14, 6, 28);

    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(22, 0);
    ctx.moveTo(22, 0);
    ctx.lineTo(28, -9);
    ctx.moveTo(22, 0);
    ctx.lineTo(28, 9);
    ctx.stroke();

    ctx.fillStyle = '#FFCC80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(3, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  },

  drawPreview(pctx) {
    pctx.fillStyle = '#6B8E23';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.ellipse(0, 2, 10, 14, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#5D4037';
    pctx.beginPath();
    pctx.ellipse(-5, -8, 13, 6.5, -0.25, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.strokeStyle = '#3E2723';
    pctx.lineWidth = 3;
    pctx.beginPath();
    pctx.moveTo(9, 2);
    pctx.lineTo(17, -5);
    pctx.moveTo(9, 2);
    pctx.lineTo(17, 6);
    pctx.stroke();
  }
};
