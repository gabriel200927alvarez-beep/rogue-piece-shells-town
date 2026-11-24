import { CONFIG } from './config';
import { CHARACTERS, getCharacterModule } from './characters/index';
import { STATE } from './state';
import { AUDIO } from './audio';
import { CAMERA, triggerScreenShake } from './camera';
import { INPUT_TOUCH, getMoveInput, initInput } from './input';
import { findNearestEnemy, calculatePlayerDamage, spawnParticle, spawnFloatingText } from './physics';
import {
  initEntities, createEnemy, damageEnemy, onEnemyKilled,
  spawnNextEnemyFromQueue, updateMarineAI, updateAlvidaAI, updateProjectiles
} from './entities';
import {
  initAbilities, buildCharacterContext, tryNormalAttack,
  damageEnemiesInCircle, damageEnemiesInLine, tryDash, releaseHoldDash, trySkill, releaseHoldSkill
} from './abilities';
import { initRendering, renderCharacterPreviews, render } from './rendering';
import {
  SAFE_UPGRADE_MODAL, advanceTutorialStep, showUpgradeSelection,
  updatePlayerHUD, updateCharacterHUD, updateWaveHUD,
  updateBossHUD, updateCooldownUI, switchScreen, startNewRun,
  triggerGameOver, triggerVictory, handleStartGame, initUI
} from './ui';

export function updateEffects(dt: number): void {
  for (let i = STATE.afterimages.length - 1; i >= 0; i--) {
    STATE.afterimages[i].life -= dt;
    if (STATE.afterimages[i].life <= 0) STATE.afterimages.splice(i, 1);
  }
  for (let i = STATE.slashEffects.length - 1; i >= 0; i--) {
    STATE.slashEffects[i].life -= dt;
    if (STATE.slashEffects[i].life <= 0) STATE.slashEffects.splice(i, 1);
  }
  for (let i = 0; i < STATE.particles.length; i++) {
    const pt: any = STATE.particles[i];
    if (!pt.active) continue;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.92;
    pt.vy *= 0.92;
    pt.life -= dt;
    if (pt.life <= 0) pt.active = false;
  }
  for (let i = 0; i < STATE.floatingTexts.length; i++) {
    const ft: any = STATE.floatingTexts[i];
    if (!ft.active) continue;
    ft.y += ft.vy * dt;
    ft.vy *= 0.94;
    ft.life -= dt;
    if (ft.life <= 0) ft.active = false;
  }
}

export function update(dt: number): void {
  if (STATE.screen === 'upgrades') {
    SAFE_UPGRADE_MODAL.update(dt);
    return;
  }

  if (STATE.screen !== 'playing') return;

  if (STATE.tutorial.active) {
    STATE.tutorial.timer -= dt;
    if (STATE.tutorial.timer <= 0) {
      advanceTutorialStep();
    }
  }

  if (STATE.hitstopTimer > 0) {
    STATE.hitstopTimer -= dt;
    return;
  }

  if (STATE.shakeTimer > 0) STATE.shakeTimer -= dt;

  const p = STATE.player;
  const charMod = getCharacterModule(STATE.charId);
  const ctx = buildCharacterContext();
  STATE.timeSinceLastCombat += dt;

  if (STATE.mods.outOfCombatRegen > 0 && STATE.timeSinceLastCombat > 3.0 && p.hp < p.maxHp) {
    p.hp = Math.min(p.maxHp, p.hp + STATE.mods.outOfCombatRegen * dt);
    updatePlayerHUD();
  }

  if (p.invulnTimer > 0) p.invulnTimer -= dt;
  if (p.slowTimer > 0) p.slowTimer -= dt;
  if (p.speedBuffTimer > 0) p.speedBuffTimer -= dt;
  if (p.attackCooldown > 0) p.attackCooldown -= dt;
  if (p.attackAnimTimer > 0) p.attackAnimTimer -= dt;
  if (p.skillAnimTimer > 0) p.skillAnimTimer -= dt;
  if (p.superArmorTimer > 0) p.superArmorTimer -= dt;

  charMod.onUpdate?.(ctx, dt);

  if (p.comboResetTimer > 0) {
    p.comboResetTimer -= dt;
    if (p.comboResetTimer <= 0) p.comboStep = 0;
  }

  if (INPUT_TOUCH.attackHeld && p.attackCooldown <= 0 && !p.isDashing && (!charMod.canAttack || charMod.canAttack(p))) {
    tryNormalAttack();
  }

  for (let i = 0; i < 3; i++) {
    if (p.skillCds[i] > 0) p.skillCds[i] = Math.max(0, p.skillCds[i] - dt);
  }
  if (p.dashCharges < p.maxDashCharges) {
    p.dashCdTimer -= dt;
    if (p.dashCdTimer <= 0) {
      p.dashCharges++;
      if (p.dashCharges < p.maxDashCharges) {
        p.dashCdTimer = p.dashCdMax * STATE.mods.dashCdMult;
      }
    }
  }

  if (p.isDashing) {
    p.dashTimer -= dt;
    const dashDist = p.customDashDist || CONFIG.DASH_DISTANCE;
    const dashDur = p.dashDurationMax || CONFIG.DASH_DURATION;
    const dashSpeed = dashDist / dashDur;
    p.x += p.dashDirX * dashSpeed * dt;
    p.y += p.dashDirY * dashSpeed * dt;

    if (charMod.onDashHitEnemy) {
      STATE.enemies.forEach((en) => {
        if (en.hp <= 0 || p.dashHitEnemyIds.includes(en)) return;
        if (Math.hypot(en.x - p.x, en.y - p.y) <= en.radius + p.radius + 14) {
          p.dashHitEnemyIds.push(en);
          charMod.onDashHitEnemy!(ctx, en);
        }
      });
    }

    if (Math.random() < 0.78 && STATE.afterimages.length < 24) {
      STATE.afterimages.push({
        x: p.x, y: p.y, angle: p.facingAngle, radius: p.radius,
        color: charMod.color, life: 0.18, maxLife: 0.18
      });
    }

    if (p.dashTimer <= 0) {
      p.isDashing = false;
      charMod.onDashEnd?.(ctx);
    }
  } else {
    if (p.momentumTimer > 0) {
      p.momentumTimer -= dt;
      const momSpeed = 15 / 0.10;
      p.x += p.momentumDirX * momSpeed * dt;
      p.y += p.momentumDirY * momSpeed * dt;
    }

    let speedMult = charMod.getMoveSpeedMult?.(p) ?? 1.0;
    if (p.speedBuffTimer > 0) speedMult *= 1.15;
    if (p.slowTimer > 0) speedMult *= 0.55;

    if (charMod.isMovementLocked?.(p)) {
      p.vx = 0;
      p.vy = 0;
    } else {
      const mv = getMoveInput();
      p.vx = mv.dirX * mv.magnitude * p.speed * speedMult;
      p.vy = mv.dirY * mv.magnitude * p.speed * speedMult;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (getMoveInput().magnitude > 0.1 && !charMod.isFacingLocked?.(p)) {
      p.facingAngle = Math.atan2(p.vy, p.vx);
    }
  }

  p.visualScaleX += (1.0 - (p.visualScaleX || 1.0)) * Math.min(1, dt * 12);
  p.visualScaleY += (1.0 - (p.visualScaleY || 1.0)) * Math.min(1, dt * 12);
  if (p.landSquashTimer > 0) p.landSquashTimer = Math.max(0, p.landSquashTimer - dt);

  if (!p.isDashing && !charMod.isMovementLocked?.(p)) {
    const moveSpd = Math.hypot(p.vx, p.vy);
    if (moveSpd > 65) {
      p.stepDustTimer = (p.stepDustTimer || 0) - dt;
      if (p.stepDustTimer <= 0) {
        p.stepDustTimer = 0.11;
        spawnParticle(
          p.x - Math.cos(p.facingAngle) * 8 + (Math.random() - 0.5) * 8,
          p.y + p.radius * 0.72,
          '#B0BEC5',
          3.0 + Math.random() * 1.4,
          0.24,
          { alpha: 0.55, vx: -p.vx * 0.18 + (Math.random() - 0.5) * 18, vy: -12 - Math.random() * 16 }
        );
      }
    } else {
      p.stepDustTimer = 0.04;
    }
  }

  p.x = Math.max(CONFIG.ARENA_MARGIN_X + p.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x));
  p.y = Math.max(CONFIG.ARENA_MARGIN_Y + p.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y));

  CAMERA.update();

  const aimMaxRange = charMod.autoAimRange ?? CONFIG.AUTO_AIM_RANGE;
  STATE.targetedEnemy = findNearestEnemy(aimMaxRange);

  if (STATE.waveSpawnQueue.length > 0) {
    STATE.waveSpawnTimer -= dt;
    if (STATE.waveSpawnTimer <= 0) {
      spawnNextEnemyFromQueue();
      STATE.waveSpawnTimer = STATE.wave === 5 ? 0.28 : 0.48;
    }
  }

  for (let i = STATE.traps.length - 1; i >= 0; i--) {
    const tr = STATE.traps[i];
    tr.life -= dt;
    let triggered = false;
    for (let j = 0; j < STATE.enemies.length; j++) {
      const en = STATE.enemies[j];
      if (en.hp > 0 && Math.hypot(en.x - tr.x, en.y - tr.y) <= en.radius + tr.triggerRadius) {
        triggered = true;
        break;
      }
    }
    if (triggered) {
      AUDIO.playExplosion(1.2);
      triggerScreenShake(5, 0.14);
      STATE.slashEffects.push({
        x: tr.x, y: tr.y, angle: 0, range: tr.blastRadius, isCircular: true,
        color: '#FF5722', life: 0.25, maxLife: 0.25, type: 'ring'
      });
      for (let k = 0; k < 12; k++) spawnParticle(tr.x, tr.y, '#FF7043', 5, 0.38);
      damageEnemiesInCircle(tr.x, tr.y, tr.blastRadius, tr.dmgMult, 60, true, tr.stun);
      STATE.traps.splice(i, 1);
      continue;
    }
    if (tr.life <= 0) {
      STATE.traps.splice(i, 1);
    }
  }

  for (let i = STATE.pendingStrikes.length - 1; i >= 0; i--) {
    const st = STATE.pendingStrikes[i];
    st.timer -= dt;
    if (st.timer <= 0) {
      AUDIO.playExplosion(0.75);
      STATE.hitstopTimer = 0.10;
      triggerScreenShake(8, 0.20);
      STATE.slashEffects.push({
        x: st.ox, y: st.oy, angle: st.angle, range: st.length, width: st.width,
        color: '#9C27B0', life: 0.35, maxLife: 0.35, type: 'gigantesco_impact'
      });
      const midX = st.ox + Math.cos(st.angle) * (st.length * 0.5);
      const midY = st.oy + Math.sin(st.angle) * (st.length * 0.5);
      for (let k = 0; k < 16; k++) spawnParticle(midX, midY, '#CE93D8', 6, 0.45);
      damageEnemiesInLine(st.ox, st.oy, st.angle, st.length, st.width / 2, st.dmgMult, 50, true, st.stun);
      STATE.pendingStrikes.splice(i, 1);
    }
  }

  for (let i = STATE.enemies.length - 1; i >= 0; i--) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) {
      STATE.enemies.splice(i, 1);
      continue;
    }

    if (en.flashTimer > 0) en.flashTimer -= dt;
    if (en.hitSquashTimer > 0) en.hitSquashTimer = Math.max(0, en.hitSquashTimer - dt);
    if (en.shieldExposedTimer > 0) en.shieldExposedTimer -= dt;
    if (en.exposedBonusDmgTimer > 0) en.exposedBonusDmgTimer -= dt;
    if (en.rootTimer > 0) en.rootTimer -= dt;
    if (en.armorDebuffTimer > 0) en.armorDebuffTimer -= dt;
    if (en.lawShamblesDebuffTimer > 0) en.lawShamblesDebuffTimer -= dt;

    if (en.magnetPullTimer > 0) {
      en.magnetPullTimer -= dt;
      const pullAng = Math.atan2(p.y - en.y, p.x - en.x);
      en.x += Math.cos(pullAng) * en.magnetPullSpeed * dt;
      en.y += Math.sin(pullAng) * en.magnetPullSpeed * dt;
    }

    if (en.killerBleedStacks > 0 && en.killerBleedTimer > 0) {
      en.killerBleedTimer -= dt;
      en.killerBleedTick -= dt;
      if (en.killerBleedTick <= 0) {
        en.killerBleedTick = 0.5;
        const dotDmg = Math.max(1, Math.round(en.killerBleedStacks * 3 * 0.5));
        en.hp -= dotDmg;
        spawnFloatingText(en.x - 10, en.y - 26, `-${dotDmg} 🩸`, '#FF5252', 0.85);
        if (en.hp <= 0) { onEnemyKilled(en); STATE.enemies.splice(i, 1); continue; }
      }
      if (en.killerBleedTimer <= 0) {
        en.killerBleedStacks = 0;
      }
    }

    if (en.bleedTimer > 0) {
      en.bleedTimer -= dt;
      en.bleedTick -= dt;
      if (en.bleedTick <= 0) {
        en.bleedTick = 0.5;
        const bleedDmg = Math.max(2, Math.round(p.baseDamage * 0.25));
        en.hp -= bleedDmg;
        spawnFloatingText(en.x - 10, en.y - 25, `-${bleedDmg}`, '#FF5252', 0.85);
        if (en.hp <= 0) { onEnemyKilled(en); STATE.enemies.splice(i, 1); continue; }
      }
    }
    if (en.burnTimer > 0) {
      en.burnTimer -= dt;
      en.burnTick -= dt;
      if (en.burnTick <= 0) {
        en.burnTick = 0.5;
        const tickDmg = (en.burnDps || 5) * 0.5;
        en.hp -= tickDmg;
        spawnFloatingText(en.x + 10, en.y - 25, `-${Math.round(tickDmg)} 🔥`, '#FF5252', 0.85);
        if (en.hp <= 0) { onEnemyKilled(en); STATE.enemies.splice(i, 1); continue; }
      }
    }
    if (en.clutchTimer > 0) {
      en.clutchTimer -= dt;
      en.clutchTick -= dt;
      if (en.clutchTick <= 0) {
        en.clutchTick = 0.5;
        en.hp -= 3;
        spawnFloatingText(en.x, en.y - 28, `-3 🌸`, '#FF5252', 0.85);
        if (en.hp <= 0) { onEnemyKilled(en); STATE.enemies.splice(i, 1); continue; }
      }
    }

    if (en.stunTimer > 0) {
      en.stunTimer -= dt;
      continue;
    }

    if (en.rootTimer <= 0) {
      en.x += en.vx * dt;
      en.y += en.vy * dt;
    }
    en.vx *= 0.85;
    en.vy *= 0.85;

    let enemySpeedMult = en.rootTimer > 0 ? 0 : 1.0;
    en.inSmoke = false;
    en.inLawRoom = false;

    if (charMod.onEnemyTick) {
      const eTickRes = charMod.onEnemyTick(p, en, dt);
      if (eTickRes?.speedMult !== undefined) enemySpeedMult *= eTickRes.speedMult;
      if (eTickRes?.inLawRoom) en.inLawRoom = true;
    }

    for (let h = 0; h < STATE.hazards.length; h++) {
      const hz = STATE.hazards[h];
      if (Math.hypot(en.x - hz.x, en.y - hz.y) <= hz.radius + en.radius) {
        if (hz.type === 'player_slow') enemySpeedMult *= 0.55;
        if (hz.type === 'usopp_smoke') {
          enemySpeedMult *= 0.60;
          en.inSmoke = true;
        }
      }
    }

    const dx = p.x - en.x;
    const dy = p.y - en.y;
    const dist = Math.hypot(dx, dy);
    const angleToPlayer = Math.atan2(dy, dx);

    if (en.isBoss) {
      updateAlvidaAI(en, dt, dist, angleToPlayer, enemySpeedMult);
    } else {
      if (en.telegraphTimer <= 0) en.facing = angleToPlayer;
      updateMarineAI(en, dt, dist, angleToPlayer, enemySpeedMult);
    }

    en.x = Math.max(CONFIG.ARENA_MARGIN_X + en.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - en.radius, en.x));
    en.y = Math.max(CONFIG.ARENA_MARGIN_Y + en.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - en.radius, en.y));
  }

  updateProjectiles(dt);

  for (let i = STATE.hazards.length - 1; i >= 0; i--) {
    const hz = STATE.hazards[i];
    hz.life -= dt;
    if (hz.type === 'alvida_slow' && Math.hypot(p.x - hz.x, p.y - hz.y) <= hz.radius + p.radius) {
      p.slowTimer = 0.25;
    } else if (hz.type === 'zoro_crack' && !hz.damaged) {
      hz.damaged = true;
      const r = hz.crackRadius || 70;
      STATE.enemies.forEach((en) => {
        if (en.hp > 0 && Math.hypot(en.x - hz.x, en.y - hz.y) <= r + en.radius) {
          const { amount, isCrit } = calculatePlayerDamage(1.5, false);
          damageEnemy(en, amount, { isCrit });
        }
      });
    }
    if (hz.life <= 0) STATE.hazards.splice(i, 1);
  }

  for (let i = STATE.berriesDrops.length - 1; i >= 0; i--) {
    const b = STATE.berriesDrops[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vx *= 0.9;
    b.vy *= 0.9;

    const d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d < 130) {
      const ang = Math.atan2(p.y - b.y, p.x - b.x);
      b.x += Math.cos(ang) * 340 * dt;
      b.y += Math.sin(ang) * 340 * dt;
    }
    if (d < p.radius + 14) {
      AUDIO.playBerry();
      STATE.berries += b.value;
      STATE.berriesCollectedRun += b.value;
      const berryEl = document.getElementById('hud-berries');
      if (berryEl) berryEl.textContent = String(STATE.berries);
      const box = document.getElementById('hud-berry-box');
      if (box) {
        box.classList.remove('pop');
        void box.offsetWidth;
        box.classList.add('pop');
      }
      STATE.berriesDrops.splice(i, 1);
    }
  }

  updateEffects(dt);
  updateCooldownUI();

  if (STATE.waveSpawnQueue.length === 0 && STATE.enemies.length === 0) {
    if (!STATE.waveClearPending) {
      STATE.waveClearPending = true;
      STATE.waveClearDelayTimer = 0.65;
    } else {
      STATE.waveClearDelayTimer -= dt;
      if (STATE.waveClearDelayTimer <= 0) {
        STATE.waveClearPending = false;
        STATE.waveClearDelayTimer = 0;
        if (STATE.wave >= CONFIG.MAX_WAVES) {
          triggerVictory();
        } else {
          showUpgradeSelection();
        }
      }
    }
  } else {
    STATE.waveClearPending = false;
    STATE.waveClearDelayTimer = 0;
  }
}

let lastTimestamp = 0;
let gameStarted = false;

function gameLoop(timestamp: number): void {
  const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  update(dt);
  if (STATE.screen === 'playing' || STATE.screen === 'upgrades' || STATE.screen === 'pause' || STATE.screen === 'settings') {
    render();
  } else if (STATE.screen === 'select') {
    renderCharacterPreviews(timestamp);
  }

  requestAnimationFrame(gameLoop);
}

export function initGame(): void {
  if (gameStarted) return;
  gameStarted = true;

  initEntities({
    onUpdateBossHUD: (boss) => updateBossHUD(boss),
    onUpdateWaveHUD: () => updateWaveHUD(),
    onUpdatePlayerHUD: () => updatePlayerHUD(),
    onTriggerGameOver: () => triggerGameOver(),
    onDamageEnemiesInCircle: (cx, cy, radius, dmgMult, knockback, isSkill, stunDur) =>
      damageEnemiesInCircle(cx, cy, radius, dmgMult, knockback, isSkill, stunDur)
  });

  initInput({
    onUnlockModalTouchStart: (id) => SAFE_UPGRADE_MODAL.onTouchStart(id),
    onUnlockModalTouchEnd: (id) => SAFE_UPGRADE_MODAL.onTouchEnd(id),
    onAdvanceTutorial: () => advanceTutorialStep(),
    onStartGame: (e) => handleStartGame(e),
    onSwitchScreen: (screen) => switchScreen(screen),
    onAttack: () => tryNormalAttack(),
    onDash: () => tryDash(),
    onReleaseHoldDash: () => releaseHoldDash(),
    onSkill: (idx) => trySkill(idx),
    onReleaseHoldSkill: (idx) => releaseHoldSkill(idx)
  });

  initRendering();

  initAbilities({
    onUpdateHUD: () => updateCharacterHUD(),
    onUpdateCooldownUI: () => updateCooldownUI()
  });

  initUI();

  Object.assign(window, {
    STATE, CHARACTERS, AUDIO, CAMERA,
    startNewRun, switchScreen, createEnemy, damageEnemy,
    tryNormalAttack, trySkill, tryDash, releaseHoldDash, releaseHoldSkill, update, render
  });

  if (new URLSearchParams(window.location.search).get('autostart') === '1') {
    startNewRun('luffy');
  }

  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}
