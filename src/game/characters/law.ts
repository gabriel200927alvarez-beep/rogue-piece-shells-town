import { CONFIG } from '../config';
import { STATE } from '../state';
import type { CharacterModule } from './types';

export const lawCharacter: CharacterModule = {
  id: 'law',
  name: 'TRAFALGAR LAW',
  rarity: 'epico',
  portrait: '🌐',
  portraitBg: '#1A1A1A',
  attackIcon: '🗡️',
  themeClass: 'theme-law',
  color: '#26C6DA',
  vestColor: '#1A1A1A',
  hp: 100,
  damage: 14,
  speed: 6.0,
  armor: 6,
  dashCd: 2.0,
  skills: [
    { name: 'ROOM', icon: '🌐', cd: 10.0 },
    { name: 'Shambles', icon: '🌀', cd: 12.0 },
    { name: 'Gamma Knife', icon: '⚡', cd: 14.0 }
  ],
  cardMeta: {
    nameColor: '#4DD0E1',
    role: 'Control ROOM / Burst',
    passiveText: 'Pasiva: Ignora 20% armadura',
    passiveColor: '#E1BEE7',
    stats: { hp: 67, dmg: 64, vel: 86, arm: 31 },
    comboDesc: 'Nodachi 85/85/95px (130/130/145px y +20% daño dentro de ROOM).',
    skillsDesc: '<b>H1:</b> ROOM frena balas • <b>H2:</b> Shambles (solo en ROOM) • <b>H3:</b> Gamma 3.5×.'
  },

  createCustomState: () => ({
    roomTimer: 0,
    roomDurationMax: 6.0,
    roomRadius: 180,
    roomFadeTimer: 0,
    roomFadeMax: 0.45,
    roomFadeX: 0,
    roomFadeY: 0
  }),

  canUseSkill(ctx, idx) {
    const p = ctx.player;
    if (idx === 1 && p.custom.roomTimer <= 0) {
      ctx.audio.playMetalClank();
      ctx.spawnFloatingText(p.x, p.y - 42, '🔒 Requiere ROOM', '#80DEEA', 0.95);
      return false;
    }
    return true;
  },

  onAttack(ctx, aimAngle) {
    const { state, player: p, audio } = ctx;
    const step = p.comboStep;
    p.comboStep = (p.comboStep + 1) % 3;
    p.comboResetTimer = 0.80;
    p.attackCooldown = step === 2 ? 0.36 : 0.25;
    p.attackCooldownMax = p.attackCooldown;
    p.attackAnimTimer = 0.22;

    if (step === 2) {
      p.momentumTimer = 0.10;
      p.momentumDirX = Math.cos(aimAngle);
      p.momentumDirY = Math.sin(aimAngle);
      p.superArmorTimer = 0.15;
    }

    const inRoom = p.custom.roomTimer > 0;
    const r1 = inRoom ? 130 : 85;
    const r2 = inRoom ? 130 : 85;
    const r3 = inRoom ? 145 : 95;
    audio.playSlash(step === 2 ? 1.25 : 1.0);

    if (step === 0) {
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: r1,
        color: inRoom ? '#26C6DA' : '#B2EBF2',
        life: 0.16,
        maxLife: 0.16,
        type: 'arc'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, r1, Math.PI / 4, 1.0, 25, false, 0, 0, {
        ignoreArmorPct: 0.20
      });
    } else if (step === 1) {
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: r2,
        color: inRoom ? '#80DEEA' : '#CFD8DC',
        life: 0.16,
        maxLife: 0.16,
        type: 'arc_left'
      });
      ctx.damageEnemiesInCone(p.x, p.y, aimAngle, r2, Math.PI / 3.5, 1.0, 25, false, 0, 0, {
        ignoreArmorPct: 0.20
      });
    } else {
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: aimAngle,
        range: r3,
        color: inRoom ? '#E0F7FA' : '#ECEFF1',
        life: 0.22,
        maxLife: 0.22,
        type: 'arc_cross'
      });
      const hitConnected = ctx.damageEnemiesInCone(p.x, p.y, aimAngle, r3, Math.PI / 3.2, 1.5, 40, false, 0, 0, {
        ignoreArmorPct: 0.20,
        armorDebuffTimer: 3.0
      });
      if (hitConnected) {
        state.hitstopTimer = CONFIG.HITSTOP_DURATION;
        ctx.triggerHaptic(12);
      }
    }
  },

  onDash(ctx) {
    const { state, player: p, audio } = ctx;
    const mv = ctx.getMoveInput();
    let dirX = Math.cos(p.facingAngle);
    let dirY = Math.sin(p.facingAngle);
    if (mv.magnitude > 0.1) {
      dirX = mv.dirX;
      dirY = mv.dirY;
    } else {
      const target = ctx.findNearestEnemy(400);
      if (target) {
        const ang = Math.atan2(target.y - p.y, target.x - p.x);
        dirX = Math.cos(ang);
        dirY = Math.sin(ang);
      }
    }
    p.facingAngle = Math.atan2(dirY, dirX);
    const teleportDist = p.custom.roomTimer > 0 ? 240 : 220;
    const startX = p.x;
    const startY = p.y;
    const destX = Math.max(
      CONFIG.ARENA_MARGIN_X + p.radius,
      Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x + dirX * teleportDist)
    );
    const destY = Math.max(
      CONFIG.ARENA_MARGIN_Y + p.radius,
      Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y + dirY * teleportDist)
    );

    state.slashEffects.push({
      x: startX,
      y: startY,
      angle: 0,
      range: 38,
      color: '#FFFFFF',
      life: 0.24,
      maxLife: 0.24,
      type: 'shambles_cut'
    });
    state.slashEffects.push({
      x: destX,
      y: destY,
      angle: 0,
      range: 48,
      isCircular: true,
      color: '#26C6DA',
      life: 0.24,
      maxLife: 0.24,
      type: 'ring'
    });

    p.x = destX;
    p.y = destY;
    p.invulnTimer = 0.15;
    audio.playTeleport();

    if (state.mods.dashSlowTrail) {
      state.hazards.push({ x: startX, y: startY, radius: 55, life: 3.0, type: 'player_slow' });
    }
    return true;
  },

  onSkill(ctx, idx) {
    const { state, player: p, audio } = ctx;
    const applyBurnFromMod = idx === 0 && state.mods.h1Burn;
    const areaMult = idx === 2 ? state.mods.h3AreaMult : 1.0;

    if (idx === 0) {
      audio.playEtherealSwish();
      audio.playTeleport();
      p.custom.roomTimer = 6.0;
      p.custom.roomDurationMax = 6.0;
      p.custom.roomRadius = 180;
      p.custom.roomFadeTimer = 0;
      ctx.spawnFloatingText(p.x, p.y - 44, '🌐 ¡ROOM!', '#26C6DA', 1.3);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        ctx.spawnParticle(p.x + Math.cos(a) * 180, p.y + Math.sin(a) * 180, '#80DEEA', 5, 0.45);
      }
      if (applyBurnFromMod) {
        state.enemies.forEach((en) => {
          if (en.hp > 0 && Math.hypot(en.x - p.x, en.y - p.y) <= p.custom.roomRadius + en.radius) {
            en.burnTimer = 3.0;
            en.burnTick = 0.5;
            en.burnDps = 5;
          }
        });
      }
    } else if (idx === 1) {
      if (p.custom.roomTimer <= 0) return;
      audio.playTeleport();
      audio.playShing();
      const radius = p.custom.roomRadius;
      state.slashEffects.push({
        x: p.x,
        y: p.y,
        angle: 0,
        range: radius,
        isCircular: true,
        color: '#26C6DA',
        life: 0.35,
        maxLife: 0.35,
        type: 'ring'
      });
      let affected = 0;
      state.enemies.forEach((en) => {
        if (en.hp <= 0) return;
        if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
          affected++;
          en.rootTimer = Math.max(en.rootTimer || 0, 4.0);
          en.lawShamblesDebuffTimer = 4.0;
          state.slashEffects.push({
            x: en.x,
            y: en.y,
            angle: 0,
            range: en.radius + 14,
            color: '#80DEEA',
            life: 0.35,
            maxLife: 0.35,
            type: 'shambles_cut'
          });
          for (let k = 0; k < 6; k++) ctx.spawnParticle(en.x, en.y, '#26C6DA', 4.5, 0.4);
          ctx.spawnFloatingText(en.x, en.y - 42, '🌀 SHAMBLES (4s)', '#80DEEA', 0.95);
        }
      });
      ctx.spawnFloatingText(
        p.x,
        p.y - 46,
        affected > 0 ? `🌀 ¡SHAMBLES! (${affected})` : '🌀 ¡SHAMBLES!',
        '#26C6DA',
        1.25
      );
    } else if (idx === 2) {
      audio.playLaserCharge();
      audio.playExplosion(1.15);
      if (p.custom.roomTimer > 0) {
        const radius = p.custom.roomRadius * areaMult;
        state.hitstopTimer = 0.10;
        ctx.triggerScreenShake(8, 0.22);
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: radius,
          isCircular: true,
          color: '#E040FB',
          life: 0.36,
          maxLife: 0.36,
          type: 'gamma_room_burst'
        });
        for (let k = 0; k < 22; k++) {
          const a = (k / 22) * Math.PI * 2;
          const r = 30 + Math.random() * (radius * 0.85);
          ctx.spawnParticle(
            p.x + Math.cos(a) * r,
            p.y + Math.sin(a) * r,
            k % 2 === 0 ? '#E040FB' : '#FFFFFF',
            6,
            0.45
          );
        }
        state.enemies.forEach((en) => {
          if (en.hp <= 0) return;
          if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
            const { amount, isCrit } = ctx.calculatePlayerDamage(3.5, true);
            ctx.damageEnemy(en, amount, {
              isCrit,
              ignoreArmorPct: 1.0,
              stun: 0.8
            });
          }
        });
        ctx.spawnFloatingText(p.x, p.y - 46, '⚡ ¡GAMMA KNIFE!', '#E040FB', 1.35);
      } else {
        const radius = 80 * areaMult;
        state.slashEffects.push({
          x: p.x,
          y: p.y,
          angle: 0,
          range: radius,
          isCircular: true,
          color: '#BA68C8',
          life: 0.25,
          maxLife: 0.25,
          type: 'ring'
        });
        ctx.damageEnemiesInCircle(p.x, p.y, radius, 2.0, 35, true, 0, { ignoreArmorPct: 0.20 });
      }
    }
  },

  onUpdate(ctx, dt) {
    const { player: p, audio } = ctx;
    if (p.custom.roomTimer > 0) {
      p.custom.roomTimer = Math.max(0, p.custom.roomTimer - dt);
      if (p.custom.roomTimer <= 0) {
        p.custom.roomFadeTimer = p.custom.roomFadeMax || 0.45;
        p.custom.roomFadeX = p.x;
        p.custom.roomFadeY = p.y;
        audio.playTeleport();
        for (let k = 0; k < 14; k++) {
          const a = (k / 14) * Math.PI * 2;
          ctx.spawnParticle(
            p.x + Math.cos(a) * p.custom.roomRadius,
            p.y + Math.sin(a) * p.custom.roomRadius,
            '#80DEEA',
            4.5,
            0.35
          );
        }
      }
    } else if (p.custom.roomFadeTimer > 0) {
      p.custom.roomFadeTimer = Math.max(0, p.custom.roomFadeTimer - dt);
    }
    ctx.updateHUD();
  },

  onCalculateDamage(p) {
    if (p.custom.roomTimer > 0) return { dmgMult: 1.20 };
    return {};
  },

  onModifyDamageEnemy(_p, en) {
    return {
      ignoreArmorPct: 0.20,
      dmgMult: en.lawShamblesDebuffTimer > 0 ? 1.5 : 1.0
    };
  },

  onEnemyTick(p, en) {
    if (p.custom.roomTimer > 0) {
      if (Math.hypot(en.x - p.x, en.y - p.y) <= p.custom.roomRadius + en.radius) {
        return { speedMult: 0.70, inLawRoom: true };
      }
    }
    return {};
  },

  onProjectileTick(ctx, pr, dt) {
    const p = ctx.player;
    if (!pr.fromPlayer && p.custom.roomTimer > 0) {
      if (Math.hypot(pr.x - p.x, pr.y - p.y) <= p.custom.roomRadius + pr.radius) {
        pr.roomStallTimer = (pr.roomStallTimer || 0) + dt;
        const speedMult = Math.max(0.03, 1 - pr.roomStallTimer * 1.6);
        if (pr.roomStallTimer >= 1.0) {
          ctx.spawnParticle(pr.x, pr.y, '#80DEEA', 3.5, 0.25);
          return { speedMult, remove: true };
        }
        return { speedMult };
      }
    }
    return {};
  },

  mountHUD(slotEl) {
    slotEl.innerHTML = `
      <div id="law-room-hud" class="char-resource-hud" style="display:flex;">
        <span style="font-size:11px;">🌐</span>
        <div class="res-bar-outer">
          <div id="hud-room-fill" class="res-bar-fill"></div>
        </div>
        <span id="hud-room-text" class="res-text text-outline-sm">LISTO</span>
      </div>
    `;
  },

  updateHUD(p) {
    const container = document.getElementById('law-room-hud');
    const btnH2 = document.getElementById('btn-h2');
    if (!container || !btnH2) return;
    container.style.display = 'flex';
    const fill = document.getElementById('hud-room-fill');
    const txt = document.getElementById('hud-room-text');
    if (!fill || !txt) return;

    if (p.custom.roomTimer > 0) {
      container.classList.remove('room-inactive');
      container.classList.add('room-active');
      fill.style.width = `${(p.custom.roomTimer / p.custom.roomDurationMax) * 100}%`;
      txt.textContent = `ROOM ${p.custom.roomTimer.toFixed(1)}s`;
      btnH2.classList.remove('skill-locked');
    } else if (p.skillCds[0] > 0) {
      container.classList.remove('room-active');
      container.classList.add('room-inactive');
      const maxCd = p.skillMaxCds[0] * STATE.mods.h1CdMult;
      fill.style.width = `${Math.max(0, (1 - p.skillCds[0] / maxCd) * 100)}%`;
      txt.textContent = `CD ${p.skillCds[0].toFixed(1)}s`;
      btnH2.classList.add('skill-locked');
    } else {
      container.classList.remove('room-active', 'room-inactive');
      fill.style.width = '100%';
      txt.textContent = 'ROOM LISTO';
      btnH2.classList.add('skill-locked');
    }
  },

  drawWorldBeforePlayer({ ctx, player: p }) {
    if (p.custom.roomTimer > 0 || p.custom.roomFadeTimer > 0) {
      const t = performance.now() * 0.006;
      const isFading = p.custom.roomTimer <= 0 && p.custom.roomFadeTimer > 0;
      const fadeRatio = isFading ? Math.max(0, p.custom.roomFadeTimer / (p.custom.roomFadeMax || 0.45)) : 1.0;
      const cx = isFading ? p.custom.roomFadeX : p.x;
      const cy = isFading ? p.custom.roomFadeY : p.y;
      const castScale = isFading
        ? 1.0 + (1 - fadeRatio) * 0.05
        : Math.min(1.0, 0.72 + ((p.custom.roomDurationMax - p.custom.roomTimer) / 0.16) * 0.28);
      const r = p.custom.roomRadius * castScale;
      const alpha = isFading ? Math.pow(fadeRatio, 1.15) : 1.0;

      ctx.save();
      ctx.globalAlpha = alpha;
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
      grad.addColorStop(0, 'rgba(38, 198, 218, 0.06)');
      grad.addColorStop(0.85, 'rgba(38, 198, 218, 0.24)');
      grad.addColorStop(1, 'rgba(128, 222, 234, 0.45)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#80DEEA';
      ctx.lineWidth = isFading ? 2.5 + fadeRatio * 1.5 : 3.5;
      ctx.beginPath();
      const segs = 48;
      const wobbleFreq = isFading ? 16 : 8;
      const wobbleAmp = isFading ? 2.5 + (1 - fadeRatio) * 8.5 : 2.5;
      for (let s = 0; s <= segs; s++) {
        const ang = (s / segs) * Math.PI * 2;
        const wobble = Math.sin(ang * wobbleFreq + t * (isFading ? 3.5 : 1)) * wobbleAmp;
        const rx = cx + Math.cos(ang) * (r + wobble);
        const ry = cy + Math.sin(ang) * (r + wobble);
        if (s === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();

      if (isFading) {
        ctx.strokeStyle = `rgba(224, 247, 250, ${0.75 * fadeRatio})`;
        ctx.lineWidth = 2;
        for (let slice = -2; slice <= 2; slice++) {
          const sy = cy + slice * (r * 0.28);
          const halfW = Math.sqrt(Math.max(0, r * r - (sy - cy) * (sy - cy))) * 0.88;
          const shift = Math.sin(t * 9 + slice * 2.1) * (1 - fadeRatio) * 26;
          ctx.beginPath();
          ctx.moveTo(cx - halfW + shift, sy);
          ctx.lineTo(cx + halfW + shift, sy);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },

  drawBody({ ctx, player: p }) {
    const nodachiAngle = p.attackAnimTimer > 0 ? Math.sin(p.attackAnimTimer * 25) * 0.9 : 0.25;
    ctx.fillStyle = '#1A1A1A';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FDD835';
    ctx.beginPath();
    ctx.arc(2, -13, 5, 0, Math.PI * 2);
    ctx.arc(2, 13, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(nodachiAngle);
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-16, 14);
    ctx.lineTo(28, 18);
    ctx.stroke();
    ctx.strokeStyle = '#9C27B0';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-16, 14);
    ctx.lineTo(-4, 15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#F5F5F5';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(2, 0, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#1A1A1A';
    ctx.beginPath();
    ctx.arc(-2, -6, 2.2, 0, Math.PI * 2);
    ctx.arc(6, 5, 2.2, 0, Math.PI * 2);
    ctx.arc(-3, 5, 2.0, 0, Math.PI * 2);
    ctx.arc(7, -4, 2.0, 0, Math.PI * 2);
    ctx.fill();
  },

  drawPreview(pctx) {
    pctx.fillStyle = '#1A1A1A';
    pctx.strokeStyle = '#000';
    pctx.lineWidth = 2;
    pctx.beginPath();
    pctx.roundRect(-11, -8, 22, 22, 6);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#FDD835';
    pctx.fillRect(-11, 6, 22, 6);
    pctx.strokeStyle = '#E0E0E0';
    pctx.lineWidth = 3;
    pctx.beginPath();
    pctx.moveTo(-14, 12);
    pctx.lineTo(18, -14);
    pctx.stroke();
    pctx.fillStyle = '#F5F5F5';
    pctx.beginPath();
    pctx.ellipse(0, -10, 12, 8, 0, 0, Math.PI * 2);
    pctx.fill();
    pctx.stroke();
    pctx.fillStyle = '#1A1A1A';
    pctx.beginPath();
    pctx.arc(-5, -10, 2, 0, Math.PI * 2);
    pctx.arc(4, -11, 2, 0, Math.PI * 2);
    pctx.arc(0, -8, 1.8, 0, Math.PI * 2);
    pctx.fill();
  }
};
