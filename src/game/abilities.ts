// ============================================================================
// 4. PLAYER & ABILITIES: Despachador Modular de Personajes y Helpers Compartidos
// ============================================================================

import { CONFIG } from './config';
import { STATE } from './state';
import { AUDIO, triggerHaptic } from './audio';
import { triggerScreenShake } from './camera';
import { INPUT_TOUCH, getMoveInput } from './input';
import {
  normalizeAngle,
  pointToSegmentDist,
  findNearestEnemy,
  findNearestEnemyInCone,
  getAimAngle,
  calculatePlayerDamage,
  spawnParticle,
  spawnFloatingText
} from './physics';
import { damageEnemy } from './entities';
import { getCharacterModule } from './characters/index';
import type { CharacterContext, DamageEnemyOpts } from './characters/types';

export interface AbilitiesCallbacks {
  onUpdateHUD: () => void;
  onUpdateCooldownUI: () => void;
}

let abilitiesCallbacks: AbilitiesCallbacks = {
  onUpdateHUD: () => {},
  onUpdateCooldownUI: () => {}
};

export function initAbilities(callbacks: AbilitiesCallbacks): void {
  abilitiesCallbacks = callbacks;
}

// Sistema de Sangrado compartido (Killer, Shanks y Barbablanca)
export function applyBleed(en: any, stacksToAdd = 1): void {
  if (!en || en.hp <= 0 || stacksToAdd <= 0) return;

  en.killerBleedStacks = (en.killerBleedStacks || 0) + stacksToAdd;
  en.killerBleedTimer = 4.0;
  if (!en.killerBleedTick || en.killerBleedTick <= 0) {
    en.killerBleedTick = 0.5;
  }

  AUDIO.playBloodShlip();
  for (let k = 0; k < 4; k++) {
    spawnParticle(en.x, en.y, '#D32F2F', 4, 0.35);
  }

  if (en.killerBleedStacks >= 5) {
    en.killerBleedStacks = 0;
    en.killerBleedTimer = 0;
    const { amount } = calculatePlayerDamage(5.0, true, false);
    AUDIO.playExplosion(1.35);
    triggerScreenShake(5, 0.14);
    STATE.slashEffects.push({
      x: en.x, y: en.y, angle: 0, range: 54, isCircular: true,
      color: '#FF1744', life: 0.25, maxLife: 0.25, type: 'ring'
    });
    for (let k = 0; k < 12; k++) {
      spawnParticle(en.x, en.y, '#FF1744', 5.5, 0.45);
    }
    spawnFloatingText(en.x, en.y - 48, '🩸 ¡DESGARRO 5×!', '#FF1744', 1.3);
    const charMod = getCharacterModule(STATE.charId);
    const pierceOpt = charMod.pierceShieldOnBleedRupture;
    const pierce = typeof pierceOpt === 'function' ? pierceOpt(STATE.player) : (pierceOpt ?? true);
    damageEnemy(en, amount, { isCrit: true, pierceShield: pierce });
  } else {
    spawnFloatingText(en.x, en.y - 36, `🩸 ${en.killerBleedStacks}/5`, '#FF5252', 0.9);
  }
}

export function applyKillerBleed(en: any, stacksToAdd = 1): void {
  applyBleed(en, stacksToAdd);
}

export function damageEnemiesInCone(
  ox: number,
  oy: number,
  aimAngle: number,
  range: number,
  halfAngle: number,
  dmgMult: number,
  knockback: number,
  canBleed = false,
  rootChance = 0,
  rootDur = 0,
  extraOpts: DamageEnemyOpts = {}
): boolean {
  let hitAny = false;
  const charMod = getCharacterModule(STATE.charId);
  const p = STATE.player;

  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    const dx = en.x - ox;
    const dy = en.y - oy;
    if (Math.hypot(dx, dy) - en.radius <= range) {
      if (Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= halfAngle) {
        const ignoreRes = charMod.onShouldIgnoreTarget?.(p, en, false);
        if (ignoreRes?.ignore) {
          if (ignoreRes.text) {
            spawnFloatingText(en.x, en.y - 30, ignoreRes.text, ignoreRes.color || '#FF80AB', 0.9);
          }
          continue;
        }
        const { amount, isCrit } = calculatePlayerDamage(dmgMult, false);
        const applyRoot = rootChance > 0 && Math.random() < rootChance;
        damageEnemy(en, amount, {
          isCrit,
          knockback,
          sourceX: ox,
          sourceY: oy,
          isNormalAttack: true,
          applyBleed: canBleed && Math.random() < 0.10,
          root: applyRoot ? rootDur : 0,
          ...extraOpts
        });
        if (extraOpts.killerBleedStacks) {
          applyBleed(en, extraOpts.killerBleedStacks);
        }
        hitAny = true;
      }
    }
  }
  return hitAny;
}

export function damageEnemiesInCircle(
  cx: number,
  cy: number,
  radius: number,
  dmgMult: number,
  knockback: number,
  isSkill = false,
  stunDur = 0,
  extraOpts: DamageEnemyOpts = {}
): boolean {
  let hitAny = false;
  const charMod = getCharacterModule(STATE.charId);
  const p = STATE.player;

  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    if (Math.hypot(en.x - cx, en.y - cy) - en.radius <= radius) {
      const ignoreRes = charMod.onShouldIgnoreTarget?.(p, en, isSkill);
      if (ignoreRes?.ignore) {
        if (ignoreRes.text) {
          spawnFloatingText(en.x, en.y - 30, ignoreRes.text, ignoreRes.color || '#FF80AB', 0.9);
        }
        continue;
      }
      const { amount, isCrit } = calculatePlayerDamage(dmgMult, isSkill);
      damageEnemy(en, amount, {
        isCrit,
        knockback,
        sourceX: cx,
        sourceY: cy,
        isNormalAttack: !isSkill,
        stun: stunDur,
        ...extraOpts
      });
      if (extraOpts.killerBleedStacks) {
        applyBleed(en, extraOpts.killerBleedStacks);
      }
      hitAny = true;
    }
  }
  return hitAny;
}

export function damageEnemiesInLine(
  ox: number,
  oy: number,
  angle: number,
  length: number,
  halfWidth: number,
  dmgMult: number,
  knockback: number,
  isSkill = true,
  stunDur = 0,
  extraOpts: DamageEnemyOpts = {}
): boolean {
  const endX = ox + Math.cos(angle) * length;
  const endY = oy + Math.sin(angle) * length;
  let hitAny = false;
  const hitSet = extraOpts.hitSet;
  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    if (hitSet && hitSet.has(en)) continue;
    if (pointToSegmentDist(en.x, en.y, ox, oy, endX, endY) <= en.radius + halfWidth) {
      const { amount, isCrit } = calculatePlayerDamage(dmgMult, isSkill);
      damageEnemy(en, amount, {
        isCrit,
        knockback,
        sourceX: ox,
        sourceY: oy,
        isNormalAttack: !isSkill,
        stun: stunDur,
        ...extraOpts
      });
      if (hitSet) hitSet.add(en);
      if (extraOpts.killerBleedStacks) {
        applyBleed(en, extraOpts.killerBleedStacks);
      }
      hitAny = true;
    }
  }
  return hitAny;
}

export function buildCharacterContext(): CharacterContext {
  return {
    state: STATE,
    player: STATE.player,
    audio: AUDIO,
    triggerHaptic,
    triggerScreenShake,
    calculatePlayerDamage,
    findNearestEnemy,
    findNearestEnemyInCone,
    getAimAngle,
    getMoveInput,
    normalizeAngle,
    pointToSegmentDist,
    spawnParticle,
    spawnFloatingText,
    damageEnemy,
    damageEnemiesInCone,
    damageEnemiesInCircle,
    damageEnemiesInLine,
    applyBleed,
    updateHUD: () => abilitiesCallbacks.onUpdateHUD(),
    updateCooldownUI: () => abilitiesCallbacks.onUpdateCooldownUI()
  };
}

export function tryNormalAttack(): void {
  const p = STATE.player;
  const charMod = getCharacterModule(STATE.charId);
  p.lastAttackAttemptTime = performance.now();
  if (p.attackCooldown > 0 || p.isDashing) return;
  if (charMod.canAttack && !charMod.canAttack(p)) return;

  const aimAngle = getAimAngle();
  p.facingAngle = aimAngle;
  STATE.timeSinceLastCombat = 0;

  const ctx = buildCharacterContext();
  if (charMod.onNormalAttackOverride?.(ctx, aimAngle)) return;
  charMod.onAttack(ctx, aimAngle);
}

export function tryDash(): void {
  const p = STATE.player;
  const charMod = getCharacterModule(STATE.charId);
  if (p.dashCharges <= 0 || p.isDashing) return;
  if (charMod.canDash && !charMod.canDash(p)) return;

  p.dashCharges--;
  if (p.dashCdTimer <= 0) {
    p.dashCdTimer = p.dashCdMax * STATE.mods.dashCdMult;
  }
  p.dashDurationMax = CONFIG.DASH_DURATION;
  p.dashHitEnemyIds = [];

  let dirX = Math.cos(p.facingAngle);
  let dirY = Math.sin(p.facingAngle);
  if (INPUT_TOUCH.joystick.magnitude > 0.1) {
    dirX = INPUT_TOUCH.joystick.dirX;
    dirY = INPUT_TOUCH.joystick.dirY;
  } else {
    const target = findNearestEnemy(400);
    if (target) {
      const ang = Math.atan2(target.y - p.y, target.x - p.x);
      dirX = Math.cos(ang);
      dirY = Math.sin(ang);
    }
  }
  p.dashDirX = dirX;
  p.dashDirY = dirY;
  p.facingAngle = Math.atan2(dirY, dirX);

  const ctx = buildCharacterContext();
  const customTeleport = charMod.onDash?.(ctx, { dirX, dirY });
  if (customTeleport === true) return;

  p.isDashing = true;
  p.dashTimer = p.dashDurationMax;
  p.visualScaleX = 1.22;
  p.visualScaleY = 0.82;

  if (STATE.mods.dashSlowTrail) {
    STATE.hazards.push({
      x: p.x, y: p.y, radius: 55, life: 3.0, type: 'player_slow'
    });
  }
}

export function trySkill(idx: number): void {
  const p = STATE.player;
  const charMod = getCharacterModule(STATE.charId);
  const ctx = buildCharacterContext();

  if (charMod.onSkillReactivate?.(ctx, idx)) return;
  if (p.skillCds[idx] > 0) return;
  if (charMod.canUseSkill && !charMod.canUseSkill(ctx, idx)) return;

  const aimAngle = getAimAngle();
  p.facingAngle = aimAngle;
  STATE.timeSinceLastCombat = 0;

  const deferredCd = charMod.onSkill(ctx, idx, aimAngle);
  if (!deferredCd) {
    p.skillCds[idx] = p.skillMaxCds[idx] * (idx === 0 ? STATE.mods.h1CdMult : 1);
  }
  p.skillAnimTimer = 0.25;
  p.activeSkillIndex = idx;
}

export function releaseHoldSkill(idx: number): void {
  const charMod = getCharacterModule(STATE.charId);
  if (!charMod.onHoldSkillRelease) return;
  charMod.onHoldSkillRelease(buildCharacterContext(), idx);
}

export function releaseHoldDash(): void {
  const charMod = getCharacterModule(STATE.charId);
  if (!charMod.onHoldDashRelease) return;
  charMod.onHoldDashRelease(buildCharacterContext());
}
