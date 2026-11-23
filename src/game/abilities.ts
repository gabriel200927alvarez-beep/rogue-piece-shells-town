// ============================================================================
// 4. PLAYER & ABILITIES: 12 Piratas
// ============================================================================

import { CONFIG } from './config';
import { STATE } from './state';
import { AUDIO, triggerHaptic } from './audio';
import { triggerScreenShake } from './camera';
import { INPUT_TOUCH } from './input';
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

export interface AbilitiesCallbacks {
  onUpdateFrankyColaHUD: () => void;
  onUpdateKidScrapHUD: () => void;
  onUpdateKidH1PhaseUI: () => void;
  onUpdateShanksHakiHUD: () => void;
  onUpdateWhitebeardQuakeHUD: () => void;
  onUpdateLuffyG2HUD: () => void;
  onUpdateCooldownUI: () => void;
}

let abilitiesCallbacks: AbilitiesCallbacks = {
  onUpdateFrankyColaHUD: () => {},
  onUpdateKidScrapHUD: () => {},
  onUpdateKidH1PhaseUI: () => {},
  onUpdateShanksHakiHUD: () => {},
  onUpdateWhitebeardQuakeHUD: () => {},
  onUpdateLuffyG2HUD: () => {},
  onUpdateCooldownUI: () => {}
};

export function initAbilities(callbacks: AbilitiesCallbacks): void {
  abilitiesCallbacks = callbacks;
}

export function hasLuffyGatlingSynergy(): boolean {
  return STATE.charId === 'luffy' &&
    STATE.mods.acquiredIds.includes('off_skill') &&
    STATE.mods.acquiredIds.includes('hab_h1cd');
}

export function addFrankyCola(amount = 5): void {
  if (STATE.charId !== 'franky') return;
  const p = STATE.player;
  p.cola = Math.min(p.maxCola, p.cola + amount);
  abilitiesCallbacks.onUpdateFrankyColaHUD();
}

// Pasiva de Kid (C6): Chatarra (+1 por enemigo atraído o empujado; cada 10 reduce 2s CD H1 y H2)
export function addKidScrap(amount = 1): void {
  if (STATE.charId !== 'kid') return;
  const p = STATE.player;
  p.scrap = Math.min(p.maxScrap, p.scrap + amount);
  if (p.scrap >= 10) {
    p.scrap -= 10;
    p.skillCds[0] = Math.max(0, p.skillCds[0] - 2.0);
    p.skillCds[1] = Math.max(0, p.skillCds[1] - 2.0);
    AUDIO.playMetalClank();
    spawnFloatingText(p.x, p.y - 44, '🧲 ¡CHATARRA! -2s CD', '#FFD54F', 1.15);
  }
  abilitiesCallbacks.onUpdateKidScrapHUD();
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
    const pierce = STATE.charId === 'killer' ? (STATE.player.killerFrenzyTimer > 0) : true;
    damageEnemy(en, amount, { isCrit: true, pierceShield: pierce });
  } else {
    spawnFloatingText(en.x, en.y - 36, `🩸 ${en.killerBleedStacks}/5`, '#FF5252', 0.9);
  }
}

export function applyKillerBleed(en: any, stacksToAdd = 1): void {
  applyBleed(en, stacksToAdd);
}

export function registerRobinHit(en: any): void {
  if (STATE.charId !== 'robin' || !en || en.hp <= 0) return;
  const p = STATE.player;
  if (p.robinRootReady) {
    p.robinRootReady = false;
    en.rootTimer = Math.max(en.rootTimer || 0, 0.5);
    spawnFloatingText(en.x, en.y - 38, '🌸 ROOT (0.5s)', '#CE93D8', 0.85);
  }
  p.robinHitCounter++;
  if (p.robinHitCounter >= 5) {
    p.robinHitCounter = 0;
    p.robinRootReady = true;
    spawnFloatingText(p.x, p.y - 38, '🌸 Hana Ready!', '#E1BEE7', 0.8);
  }
}

export function tryNormalAttack(): void {
  const p = STATE.player;
  p.lastAttackAttemptTime = performance.now(); // Marca temporal para Parry pasivo de Shanks
  if (p.attackCooldown > 0 || p.isDashing || p.stormTimer > 0) return;

  const aimAngle = getAimAngle();
  p.facingAngle = aimAngle;
  STATE.timeSinceLastCombat = 0;

  // Luffy PTS no realiza ataques básicos mientras carga King Kong Gun
  if (STATE.charId === 'luffy_pts' && p.isChargingKKG) return;

  // Barbablanca en H3 (Gura Gura Zone): el botón de ataque básico activa un terremoto general
  if (STATE.charId === 'whitebeard' && p.quakeZoneTimer > 0) {
    if ((p.wbQuakeAttackCd || 0) > 0) return;
    p.wbQuakeAttackCd = 1.0;
    AUDIO.playExplosion(1.4);
    triggerScreenShake(5, 0.16);
    triggerHaptic(18);
    STATE.enemies.forEach(en => {
      if (en.hp <= 0) return;
      if (Math.hypot(en.x - p.x, en.y - p.y) <= 250 + en.radius) {
        const { amount, isCrit } = calculatePlayerDamage(1.5, true);
        damageEnemy(en, amount, { isCrit, knockback: 30, sourceX: p.x, sourceY: p.y, pierceShield: true });
        applyBleed(en, 1);
        STATE.slashEffects.push({
          x: en.x, y: en.y, angle: 0, range: 45, isCircular: true,
          color: '#FFFFFF', life: 0.28, maxLife: 0.28, type: 'ring'
        });
        for (let k = 0; k < 6; k++) spawnParticle(en.x, en.y, '#ECEFF1', 4, 0.3);
      }
    });
    spawnFloatingText(p.x, p.y - 48, '⚡ ¡EARTHQUAKE!', '#FFFFFF', 1.3);
    return;
  }

  const maxCombo = (STATE.charId === 'killer' || STATE.charId === 'shanks') ? 5 : (STATE.charId === 'luffy_pts' ? 4 : 3);
  const step = p.comboStep;
  p.comboStep = (p.comboStep + 1) % maxCombo;
  p.comboResetTimer = CONFIG.COMBO_RESET_TIME;

  // Cooldown y ventana de combo específicos por personaje
  if (STATE.charId === 'usopp') {
    p.attackCooldown = 2.0;
    p.comboResetTimer = 2.55;
  } else if (STATE.charId === 'franky') {
    p.attackCooldown = 0.50;
    p.comboResetTimer = 0.90;
  } else if (STATE.charId === 'kid') {
    p.attackCooldown = 0.50;
    p.comboResetTimer = 0.90;
  } else if (STATE.charId === 'law') {
    p.attackCooldown = step === 2 ? 0.36 : 0.25;
    p.comboResetTimer = 0.80;
  } else if (STATE.charId === 'killer') {
    const atkSpdMult = p.ensanamientoTimer > 0 ? 1.15 : 1.0;
    p.attackCooldown = (step === 4 ? 0.20 : 0.11) / atkSpdMult;
    p.comboResetTimer = 0.32;
  } else if (STATE.charId === 'shanks') {
    // Shanks v1.9b: Combo de 5 cortes rápidos, ventana 0.25s
    p.attackCooldown = (step === 4 ? 0.22 : 0.10);
    p.comboResetTimer = 0.25;
  } else if (STATE.charId === 'whitebeard') {
    // Barbablanca v1.9b: Combo de 3 golpes, ventana 0.9s
    p.attackCooldown = (step === 2 ? 0.42 : 0.28);
    p.comboResetTimer = 0.90;
  } else if (STATE.charId === 'luffy_pts') {
    // Luffy PTS: Jet Pistol 1-2 (0.35s base, x0.80 con G2), Jet Sweep (0.40s base, x0.80 con G2), Jet Bazooka (CD post-combo 1.0s PLANO)
    const g2Mult = (p.gear2ndTimer > 0 ? 0.80 : 1.0);
    if (step === 2) {
      // Jet Sweep (Golpe 3): barrido largo con arco amplio y empuje
      p.attackCooldown = 0.40 * g2Mult;
      p.comboResetTimer = 0.70;
    } else if (step === 3) {
      // Jet Bazooka (Finisher): CD post-combo 1.0s PLANO (no afecta Gear 2nd)
      p.attackCooldown = 1.0;
      p.comboResetTimer = 0.70;
    } else {
      // Jet Pistol 1 y 2: 0.35s base (0.28s con G2)
      p.attackCooldown = 0.35 * g2Mult;
      p.comboResetTimer = 0.65;
    }
  } else {
    p.attackCooldown = step === 2 ? 0.34 : 0.21;
  }
  p.attackCooldownMax = p.attackCooldown;
  p.attackAnimTimer = 0.22;

  const isThirdHit = step === 2;
  if (isThirdHit && !['usopp', 'robin', 'killer'].includes(STATE.charId)) {
    p.momentumTimer = 0.10;
    p.momentumDirX = Math.cos(aimAngle);
    p.momentumDirY = Math.sin(aimAngle);
    p.superArmorTimer = 0.15;
  }

  let hitConnected = false;

  if (STATE.charId === 'luffy') {
    if (!isThirdHit) {
      AUDIO.playPunch();
      const armOffset = step === 0 ? -8 : 8;
      const perpAngle = aimAngle + Math.PI / 2;
      STATE.slashEffects.push({
        x: p.x + Math.cos(perpAngle) * armOffset,
        y: p.y + Math.sin(perpAngle) * armOffset,
        angle: aimAngle, range: 110,
        color: '#F5C518', armColor: '#FFCC80', armOffset,
        isRubberArm: true, followPlayer: true,
        life: 0.14, maxLife: 0.14, type: 'stretch'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 110, (20 * Math.PI) / 180, 1.0, 35);
    } else {
      AUDIO.playExplosion(1.2);
      const impactX = p.x + Math.cos(aimAngle) * 65;
      const impactY = p.y + Math.sin(aimAngle) * 65;
      STATE.slashEffects.push({
        x: impactX, y: impactY, angle: 0, range: 100, isCircular: true,
        color: '#F5C518', life: 0.24, maxLife: 0.24, type: 'ring'
      });
      hitConnected = damageEnemiesInCircle(impactX, impactY, 100, 1.8, 120);
      if (hitConnected) {
        STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
        triggerScreenShake(4, 0.12);
        triggerHaptic(10);
      }
    }
  } else if (STATE.charId === 'zoro') {
    if (!isThirdHit) {
      AUDIO.playSlash(1.0);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 90,
        color: '#66BB6A', life: 0.16, maxLife: 0.16,
        type: step === 0 ? 'arc' : 'arc_cross'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 90, Math.PI / 4, 1.0, 30, true);
    } else {
      AUDIO.playSlash(1.25);
      STATE.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 20,
        y: p.y + Math.sin(aimAngle) * 20,
        vx: Math.cos(aimAngle) * 520,
        vy: Math.sin(aimAngle) * 520,
        traveled: 0, maxDist: 160, crackRadius: 70, radius: 24,
        dmgMult: 1.5, pierce: true, hitIds: [], life: 0.45,
        color: '#A5D6A7', type: 'zoro_air_cut', spawnedCrack: false
      });
      STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
      triggerHaptic(10);
    }
  } else if (STATE.charId === 'sanji') {
    if (step === 0) {
      AUDIO.playKick();
      const rightOffset = aimAngle + Math.PI / 2;
      STATE.slashEffects.push({
        x: p.x + Math.cos(rightOffset) * 7,
        y: p.y + Math.sin(rightOffset) * 7,
        angle: aimAngle, range: 95, color: '#FFA726', life: 0.14, maxLife: 0.14, type: 'stretch'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 95, (20 * Math.PI) / 180, 1.0, 30);
    } else if (step === 1) {
      AUDIO.playKick();
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 110,
        color: '#E87722', life: 0.16, maxLife: 0.16, type: 'arc_left'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 110, Math.PI / 4, 1.1, 45);
    } else {
      AUDIO.playExplosion(1.35);
      const impactX = p.x + Math.cos(aimAngle) * 60;
      const impactY = p.y + Math.sin(aimAngle) * 60;
      STATE.slashEffects.push({
        x: impactX, y: impactY, angle: 0, range: 110, isCircular: true,
        color: '#FF7043', life: 0.24, maxLife: 0.24, type: 'ring'
      });
      hitConnected = damageEnemiesInCircle(impactX, impactY, 110, 1.6, 40);
      if (hitConnected) {
        STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
        triggerHaptic(10);
      }
    }
  } else if (STATE.charId === 'usopp') {
    AUDIO.playSlingshot();
    if (step === 0) {
      spawnUsoppPellet(p.x, p.y, aimAngle, 280, 1.0, false);
    } else if (step === 1) {
      spawnUsoppPellet(p.x, p.y, aimAngle, 280, 1.0, false);
      p.usoppDoubleShotTimer = 0.08;
      p.usoppDoubleShotAngle = aimAngle;
    } else {
      STATE.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 18,
        y: p.y + Math.sin(aimAngle) * 18,
        vx: Math.cos(aimAngle) * 900,
        vy: Math.sin(aimAngle) * 900,
        traveled: 0, maxRange: 260,
        radius: 10, dmgMult: 1.5,
        maxHits: 2,
        hitIds: [], life: 0.5,
        color: '#FF7043', type: 'usopp_bomb'
      });
    }
  } else if (STATE.charId === 'franky') {
    if (step === 0) {
      AUDIO.playPunch(0.75);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 85,
        color: '#00BCD4', life: 0.2, maxLife: 0.2, type: 'arc'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 85, Math.PI / 3.0, 1.2, 95);
      if (hitConnected) { STATE.hitstopTimer = 0.07; triggerHaptic(12); }
    } else if (step === 1) {
      AUDIO.playMetalClank();
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 85,
        color: '#90A4AE', life: 0.22, maxLife: 0.22, type: 'arc_left'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 85, Math.PI / 2.8, 1.2, 115);
      if (hitConnected) { STATE.hitstopTimer = 0.07; triggerHaptic(14); }
    } else {
      AUDIO.playMetalClank();
      AUDIO.playExplosion(1.1);
      p.strongRightTimer = 0.40;
      p.strongRightAngle = aimAngle;
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 120,
        color: '#00E5FF', life: 0.35, maxLife: 0.35, type: 'strong_right_chain'
      });
      hitConnected = damageEnemiesInLine(p.x, p.y, aimAngle, 120, 28, 2.0, 165, false);
      if (hitConnected) {
        STATE.hitstopTimer = 0.07;
        triggerScreenShake(5, 0.14);
        triggerHaptic(16);
      }
    }
  } else if (STATE.charId === 'robin') {
    AUDIO.playEtherealSwish();
    if (step === 0) {
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 100, count: 1,
        color: '#9C27B0', life: 0.22, maxLife: 0.22, type: 'robin_hands'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 100, Math.PI / 6, 1.0, 20);
    } else if (step === 1) {
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 100, count: 2,
        color: '#AB47BC', life: 0.24, maxLife: 0.24, type: 'robin_hands'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 100, Math.PI / 5, 1.0, 25);
    } else {
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 110, count: 4,
        color: '#CE93D8', life: 0.28, maxLife: 0.28, type: 'robin_hands'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 110, Math.PI / 4, 1.5, 30, false, 0.30, 0.8);
      if (hitConnected) {
        STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
        triggerHaptic(10);
      }
    }
  } else if (STATE.charId === 'law') {
    // TRAFALGAR LAW: Alcance normal 85/85/95 px; ampliado a 130/130/145 px SÓLO con ROOM activo
    const inRoom = p.roomTimer > 0;
    const r1 = inRoom ? 130 : 85;
    const r2 = inRoom ? 130 : 85;
    const r3 = inRoom ? 145 : 95;
    AUDIO.playSlash(step === 2 ? 1.25 : 1.0);
    if (step === 0) {
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: r1,
        color: inRoom ? '#26C6DA' : '#B2EBF2', life: 0.16, maxLife: 0.16, type: 'arc'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, r1, Math.PI / 4, 1.0, 25, false, 0, 0, { ignoreArmorPct: 0.20 });
    } else if (step === 1) {
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: r2,
        color: inRoom ? '#80DEEA' : '#CFD8DC', life: 0.16, maxLife: 0.16, type: 'arc_left'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, r2, Math.PI / 3.5, 1.0, 25, false, 0, 0, { ignoreArmorPct: 0.20 });
    } else {
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: r3,
        color: inRoom ? '#E0F7FA' : '#ECEFF1', life: 0.22, maxLife: 0.22, type: 'arc_cross'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, r3, Math.PI / 3.2, 1.5, 40, false, 0, 0, {
        ignoreArmorPct: 0.20,
        armorDebuffTimer: 3.0
      });
      if (hitConnected) {
        STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
        triggerHaptic(12);
      }
    }
  } else if (STATE.charId === 'kid') {
    // EUSTASS KID: 2 Golpes rectos + 1 Barrido a ras de suelo (120°, empuja 60/100 px, aturde 0.5s)
    const isRotten = p.punkRottenTimer > 0;
    const straightRange = isRotten ? 120 : 85;
    const sweepRange = isRotten ? 150 : 100;
    const sweepPush = isRotten ? 260 : 165;

    if (step === 0) {
      AUDIO.playPunch(0.75);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: straightRange,
        color: '#FF7043', life: 0.18, maxLife: 0.18, type: 'stretch'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, straightRange, (26 * Math.PI) / 180, 1.2, 30);
      if (hitConnected) { STATE.hitstopTimer = 0.07; triggerHaptic(14); }
    } else if (step === 1) {
      AUDIO.playMetalClank();
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: straightRange,
        color: '#D32F2F', life: 0.18, maxLife: 0.18, type: 'stretch'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, straightRange, (28 * Math.PI) / 180, 1.2, 35);
      if (hitConnected) { STATE.hitstopTimer = 0.07; triggerHaptic(14); }
    } else {
      AUDIO.playMetalClank();
      AUDIO.playSlash(1.25);
      const halfAng = (60 * Math.PI) / 180;
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: sweepRange, halfAngle: halfAng,
        color: '#FFC107', life: 0.26, maxLife: 0.26, type: 'kid_ground_sweep'
      });
      for (let k = 0; k < 10; k++) {
        const a = aimAngle + (Math.random() - 0.5) * halfAng * 1.8;
        const d = 30 + Math.random() * (sweepRange * 0.85);
        spawnParticle(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, k % 2 === 0 ? '#FFC107' : '#BDBDBD', 4.5, 0.35);
      }
      let sweptCount = 0;
      STATE.enemies.forEach(en => {
        if (en.hp <= 0) return;
        const dx = en.x - p.x, dy = en.y - p.y;
        if (Math.hypot(dx, dy) - en.radius <= sweepRange && Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= halfAng) {
          sweptCount++;
          const { amount, isCrit } = calculatePlayerDamage(1.8, false);
          damageEnemy(en, amount, {
            isCrit,
            knockback: sweepPush,
            sourceX: p.x,
            sourceY: p.y,
            stun: 0.5
          });
        }
      });
      if (sweptCount > 0) {
        addKidScrap(sweptCount);
        STATE.hitstopTimer = 0.07;
        triggerScreenShake(5, 0.14);
        triggerHaptic(18);
      }
    }
  } else if (STATE.charId === 'killer') {
    // KILLER: Combo de 5 golpes rápidos con aplicación de Sangrado
    const isFrenzy = p.killerFrenzyTimer > 0;
    const isEnsanamiento = p.ensanamientoTimer > 0;
    const bleedStacksPerHit = (isFrenzy || isEnsanamiento) ? 1 : 0;

    if (step < 4) {
      AUDIO.playSlash(1.25);
      const range = step === 3 ? 90 : 85;
      const halfAng = step === 3 ? Math.PI * 0.85 : Math.PI / 3.5;
      const slashType = step === 0 ? 'arc' : (step === 1 ? 'arc_left' : (step === 2 ? 'arc_cross' : 'ring'));
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: range, isCircular: step === 3,
        color: (isFrenzy || isEnsanamiento) ? '#FF1744' : '#9FA8DA', life: 0.12, maxLife: 0.12, type: slashType
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, range, halfAng, 0.6, 12, false, 0, 0, {
        pierceShield: isFrenzy,
        killerBleedStacks: bleedStacksPerHit
      });
      if (hitConnected) {
        STATE.hitstopTimer = 0.03;
      }
    } else {
      AUDIO.playShing();
      AUDIO.playSlash(1.45);
      const halfAng = (30 * Math.PI) / 180;
      const fifthBleedStacks = isFrenzy ? 3 : (isEnsanamiento ? 2 : 1);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 100, halfAngle: halfAng,
        color: isFrenzy ? '#FF1744' : '#FFFFFF', life: 0.22, maxLife: 0.22, type: 'sonic_wave_cone'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 100, halfAng, 1.5, 45, false, 0, 0, {
        ignoreArmorPct: 0.30,
        pierceShield: isFrenzy,
        killerBleedStacks: fifthBleedStacks
      });
      if (hitConnected) {
        STATE.hitstopTimer = 0.03;
        triggerScreenShake(4, 0.10);
        triggerHaptic(12);
      }
    }
  } else if (STATE.charId === 'shanks') {
    // SHANKS v1.9b: Combo de 5 cortes rápidos con Gryphon (0.25 s ventana).
    // Golpes 1-4: alcance 110 px, 0.7x daño, 1 stack sangrado, hit-stop 0.03s.
    // Golpe 5 (Remate): ARCO ROJO ELÉCTRICO colosal 300 px (ancho x2), empuja 100 px, 1.8x daño + 2 stacks sangrado, hit-stop 0.08s, shake 5 px.
    if (step < 4) {
      AUDIO.playSlash(1.3 + step * 0.08);
      STATE.hitstopTimer = 0.03;
      const arcType = step % 2 === 0 ? 'arc' : 'arc_cross';
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 110,
        color: '#FF1744', life: 0.15, maxLife: 0.15, type: arcType
      });
      for (let k = 0; k < 5; k++) {
        spawnParticle(p.x + Math.cos(aimAngle) * 40, p.y + Math.sin(aimAngle) * 40, '#FF1744', 3.5, 0.22);
      }
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 110, (60 * Math.PI) / 180, 0.7, 15, false, 0, 0, {
        killerBleedStacks: 1
      });
    } else {
      // Remate 5: Arco rojo eléctrico colosal 300 px (ancho x2) con electricidad roja/negra y empuje 100 px
      AUDIO.playShing();
      AUDIO.playExplosion(1.3);
      AUDIO.playFireCrackle();
      STATE.hitstopTimer = 0.08;
      triggerScreenShake(5, 0.16);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 300, width: 140,
        color: '#FF1744', subColor: '#111111', life: 0.32, maxLife: 0.32, type: 'shanks_electric_arc'
      });
      for (let k = 0; k < 22; k++) {
        const a = aimAngle + (Math.random() - 0.5) * 1.2;
        const dist = 60 + Math.random() * 210;
        spawnParticle(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, k % 2 === 0 ? '#FF1744' : '#FF5252', 5.5, 0.35);
      }
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 300, (90 * Math.PI) / 180, 1.8, 100, false, 0, 0, {
        killerBleedStacks: 2, knockback: 100, sourceX: p.x, sourceY: p.y
      });
    }
  } else if (STATE.charId === 'whitebeard') {
    // BARBABLANCA v1.9b: Combo de 3 golpes con Naginata (ventana 0.9 s).
    // Golpe 1 (Seaquake): grieta ancha blanca con detalles rojos y partículas de roca (200 x 60 px, 1.5x daño, stun 0.8s, sin shake).
    // Golpe 2 (Naginata Rasetsu): abanico de 3 cortes largos (0°, -30°, +30° a 150 px, cadencia 0.12s, 0.6x + 1 stack sangrado c/u).
    // Golpe 3 (Barrido rojo con Haki): abanico 240° / 240 px (v1.9e: era 180°/180px), 2.0x daño, empuja 80 px, aturde 0.5s, 2 stacks sangrado, shake 5 px, hit-stop 0.06s.
    if (step === 0) {
      // Golpe 1 (Seaquake): grieta irregular gris en el suelo (200 x 60 px hitbox, 1.5x daño, stun 0.8s, sin shake)
      // v1.9e: visual rediseñado a grieta gris irregular (roca partida), hitbox y stats INTACTOS
      const SEAQUAKE_CRACK_CORE = '#263238';      // gris oscuro casi negro (profundidad)
      const SEAQUAKE_CRACK_EDGE = '#78909C';      // gris medio (bordes)
      const SEAQUAKE_PARTICLE_LIGHT = '#B0BEC5';  // partículas claras
      const SEAQUAKE_PARTICLE_DARK = '#546E7A';   // partículas oscuras
      AUDIO.playExplosion(1.2);
      STATE.hitstopTimer = 0.06;
      const endX = p.x + Math.cos(aimAngle) * 200;
      const endY = p.y + Math.sin(aimAngle) * 200;
      STATE.slashEffects.push({
        x: p.x, y: p.y, endX, endY, angle: aimAngle, range: 200, width: 60,
        color: SEAQUAKE_CRACK_CORE, subColor: SEAQUAKE_CRACK_EDGE, life: 0.28, maxLife: 0.28, type: 'wb_seaquake_crack'
      });
      for (let k = 0; k < 14; k++) {
        const frac = k / 14;
        spawnParticle(p.x + (endX - p.x) * frac + (Math.random() - 0.5) * 16, p.y + (endY - p.y) * frac + (Math.random() - 0.5) * 16, k % 2 === 0 ? SEAQUAKE_PARTICLE_LIGHT : SEAQUAKE_PARTICLE_DARK, 5, 0.35);
      }
      hitConnected = damageEnemiesInLine(p.x, p.y, aimAngle, 200, 30, 1.5, 0, false, 0.8);
    } else if (step === 1) {
      // Golpe 2: Corte 1 frontal (0°) inmediato; programa cortes 2 (-30°) y 3 (+30°) a 0.12s
      AUDIO.playSlash(1.25);
      STATE.hitstopTimer = 0.03;
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 150,
        color: '#ECEFF1', subColor: '#D50000', life: 0.22, maxLife: 0.22, type: 'arc_cross'
      });
      for (let k = 0; k < 6; k++) spawnParticle(p.x + Math.cos(aimAngle) * 70, p.y + Math.sin(aimAngle) * 70, '#ECEFF1', 4, 0.25);
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, 150, (30 * Math.PI) / 180, 0.6, 20, false, 0, 0, {
        killerBleedStacks: 1
      });
      // Programar los siguientes 2 cortes del abanico
      p.wbRasetsuCutsLeft = 2;
      p.wbRasetsuTimer = 0.12;
      p.wbRasetsuAngle = aimAngle;
    } else {
      // Golpe 3: Barrido amplio en abanico 240° (240 px) con Haki rojo carmesí / negro
      // v1.9e: arco ampliado de 180° a 240° (+30° c/lado) y alcance de 180px a 240px
      // Stats intactos: 2.0x daño, empuje 80px, stun 0.5s, 2 stacks sangrado, shake 5px, hit-stop 0.06s
      // Si en playtest se siente excesivo, bajar arco a 200° sin tocar alcance (ajustar WB_HAKI_SWEEP_ANGLE y WB_HAKI_SWEEP_RANGE)
      const WB_HAKI_SWEEP_ANGLE = (240 * Math.PI) / 180; // 240° = 4π/3 rad
      const WB_HAKI_SWEEP_HALF_ANGLE = WB_HAKI_SWEEP_ANGLE / 2;
      const WB_HAKI_SWEEP_RANGE = 240; // alcance 240px (era 180px)
      AUDIO.playShing();
      AUDIO.playExplosion(1.3);
      AUDIO.playFwoosh();
      triggerScreenShake(5, 0.14);
      STATE.hitstopTimer = 0.06;
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: WB_HAKI_SWEEP_RANGE, halfAngle: WB_HAKI_SWEEP_HALF_ANGLE,
        color: '#D50000', subColor: '#111111', life: 0.30, maxLife: 0.30, type: 'wb_haki_sweep'
      });
      for (let k = 0; k < 18; k++) {
        const a = aimAngle + (Math.random() - 0.5) * WB_HAKI_SWEEP_ANGLE;
        const dist = 50 + Math.random() * (WB_HAKI_SWEEP_RANGE * 0.8);
        spawnParticle(p.x + Math.cos(a) * dist, p.y + Math.sin(a) * dist, k % 2 === 0 ? '#FF1744' : '#212121', 5, 0.32);
      }
      hitConnected = damageEnemiesInCone(p.x, p.y, aimAngle, WB_HAKI_SWEEP_RANGE, WB_HAKI_SWEEP_HALF_ANGLE, 2.0, 80, false, 0.5, 0, {
        killerBleedStacks: 2, knockback: 80, sourceX: p.x, sourceY: p.y, stun: 0.5
      });
    }
  } else if (STATE.charId === 'luffy_pts') {
    // LUFFY (POST TIME SKIP): Combo de 4 golpes (Jet Pistol 1, Jet Pistol 2, Jet Sweep, Jet Bazooka).
    const LUFFY_PTS_AIM_RANGE = 220;
    const LUFFY_PTS_AIM_HALF_ANGLE = (120 * Math.PI) / 180; // ±120°

    if (step === 0 || step === 1) {
      // Golpes 1 y 2: Jet Pistol (recto 160 px, 0.35s, auto-aim)
      const aimTarget = findNearestEnemyInCone(LUFFY_PTS_AIM_RANGE, aimAngle, LUFFY_PTS_AIM_HALF_ANGLE);
      const finalAimAngle = aimTarget ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x) : aimAngle;
      p.facingAngle = finalAimAngle;

      AUDIO.playPunch();
      STATE.hitstopTimer = 0.04;
      const armOffset = step === 0 ? -10 : 10;
      const perpAngle = finalAimAngle + Math.PI / 2;
      STATE.slashEffects.push({
        x: p.x + Math.cos(perpAngle) * armOffset,
        y: p.y + Math.sin(perpAngle) * armOffset,
        angle: finalAimAngle, range: 160,
        color: '#E53935', armColor: '#FFCC80', armOffset,
        isRubberArm: true, hakiArm: true, followPlayer: true,
        life: 0.16, maxLife: 0.16, type: 'stretch'
      });
      hitConnected = damageEnemiesInCone(p.x, p.y, finalAimAngle, 160, (25 * Math.PI) / 180, 0.9, 35);
    } else if (step === 2) {
      // Golpe 3: Jet Sweep (barrido largo 200 px, arco amplio 140°, empuje 95 px, auto-aim)
      const aimTarget = findNearestEnemyInCone(LUFFY_PTS_AIM_RANGE, aimAngle, LUFFY_PTS_AIM_HALF_ANGLE);
      const finalAimAngle = aimTarget ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x) : aimAngle;
      p.facingAngle = finalAimAngle;

      AUDIO.playSlash(1.15);
      AUDIO.playPunch();
      triggerScreenShake(4, 0.12);
      STATE.hitstopTimer = 0.05;
      const sweepHalfAngle = (70 * Math.PI) / 180; // 140° arco amplio
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: finalAimAngle, range: 200, halfAngle: sweepHalfAngle,
        color: '#FF1744', life: 0.24, maxLife: 0.24, type: 'arc_cross'
      });
      for (let k = -4; k <= 4; k++) {
        const a = finalAimAngle + (k / 4) * sweepHalfAngle;
        spawnParticle(p.x + Math.cos(a) * 145, p.y + Math.sin(a) * 145, k % 2 === 0 ? '#FF1744' : '#212121', 4.5, 0.28);
      }
      hitConnected = damageEnemiesInCone(p.x, p.y, finalAimAngle, 200, sweepHalfAngle, 1.6, 95);
    } else {
      // Golpe 4: Jet Bazooka (Finisher: busca target amplio justo al ejecutar tras Jet Sweep, fija dirección y alcanza al enemigo empujado)
      const BAZOOKA_AIM_RANGE = 360;
      const BAZOOKA_AIM_HALF_ANGLE = (150 * Math.PI) / 180;
      const aimTarget = findNearestEnemyInCone(BAZOOKA_AIM_RANGE, aimAngle, BAZOOKA_AIM_HALF_ANGLE) || findNearestEnemy(BAZOOKA_AIM_RANGE);
      const finalAimAngle = aimTarget ? Math.atan2(aimTarget.y - p.y, aimTarget.x - p.x) : aimAngle;
      p.facingAngle = finalAimAngle;

      AUDIO.playExplosion(1.3);
      triggerScreenShake(7, 0.18);
      STATE.hitstopTimer = 0.08;
      const targetDist = aimTarget ? Math.hypot(aimTarget.x - p.x, aimTarget.y - p.y) : 95;
      const impactDist = aimTarget ? Math.min(155, Math.max(85, targetDist * 0.75)) : 95;
      const impactX = p.x + Math.cos(finalAimAngle) * impactDist;
      const impactY = p.y + Math.sin(finalAimAngle) * impactDist;
      const perpAngle = finalAimAngle + Math.PI / 2;
      [-10, 10].forEach(armOffset => {
        STATE.slashEffects.push({
          x: p.x + Math.cos(perpAngle) * armOffset,
          y: p.y + Math.sin(perpAngle) * armOffset,
          angle: finalAimAngle, range: impactDist,
          color: '#FF5722', armColor: '#FFCC80', armOffset,
          isRubberArm: true, hakiArm: true, followPlayer: true,
          life: 0.15, maxLife: 0.15, type: 'stretch'
        });
      });
      STATE.slashEffects.push({
        x: impactX, y: impactY, angle: finalAimAngle, range: 130, isCircular: true,
        color: '#212121', subColor: '#FF5722', life: 0.30, maxLife: 0.30, type: 'red_hawk_explosion'
      });
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const c = k % 3 === 0 ? '#FFEB3B' : (k % 3 === 1 ? '#FF5722' : '#212121');
        spawnParticle(impactX + Math.cos(a) * 42, impactY + Math.sin(a) * 42, c, 5.0, 0.36);
      }
      hitConnected = damageEnemiesInCircle(impactX, impactY, 130, 3.0, 85, false, 0, {
        knockback: 85, sourceX: p.x, sourceY: p.y, pierceShield: true
      });
      spawnFloatingText(impactX, impactY - 38, '🔥 ¡JET BAZOOKA!', '#FF5722', 1.3);
    }
  }
}

export function spawnUsoppPellet(
  ox: number,
  oy: number,
  angle: number,
  range: number,
  dmgMult: number,
  isSecondaryVisual = false
): void {
  STATE.projectiles.push({
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
  extraOpts: Record<string, any> = {}
): boolean {
  let hitAny = false;
  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    const dx = en.x - ox, dy = en.y - oy;
    if (Math.hypot(dx, dy) - en.radius <= range) {
      if (Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= halfAngle) {
        if (STATE.charId === 'sanji' && en.isFemale) {
          spawnFloatingText(en.x, en.y - 30, '¡No pateo damas! ♥', '#FF80AB', 0.9);
          continue;
        }
        const { amount, isCrit } = calculatePlayerDamage(dmgMult, false);
        const applyRoot = rootChance > 0 && Math.random() < rootChance;
        damageEnemy(en, amount, {
          isCrit, knockback, sourceX: ox, sourceY: oy,
          isNormalAttack: true,
          applyBleed: canBleed && Math.random() < 0.10,
          root: applyRoot ? rootDur : 0,
          ...extraOpts
        });
        if (extraOpts.killerBleedStacks) {
          applyBleed(en, extraOpts.killerBleedStacks);
        }
        addFrankyCola(5);
        registerRobinHit(en);
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
  extraOpts: Record<string, any> = {}
): boolean {
  let hitAny = false;
  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    if (Math.hypot(en.x - cx, en.y - cy) - en.radius <= radius) {
      if (!isSkill && STATE.charId === 'sanji' && en.isFemale) {
        spawnFloatingText(en.x, en.y - 30, '¡No pateo damas! ♥', '#FF80AB', 0.9);
        continue;
      }
      const { amount, isCrit } = calculatePlayerDamage(dmgMult, isSkill);
      damageEnemy(en, amount, { isCrit, knockback, sourceX: cx, sourceY: cy, isNormalAttack: !isSkill, stun: stunDur, ...extraOpts });
      if (extraOpts.killerBleedStacks) {
        applyKillerBleed(en, extraOpts.killerBleedStacks);
      }
      if (!isSkill) addFrankyCola(5);
      registerRobinHit(en);
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
  extraOpts: Record<string, any> = {}
): boolean {
  const endX = ox + Math.cos(angle) * length;
  const endY = oy + Math.sin(angle) * length;
  let hitAny = false;
  // Support for hitSet to avoid multi-hitting same enemy in a single attack (e.g., Shanks H2 piercing)
  const hitSet = extraOpts.hitSet as Set<any> | undefined;
  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    if (hitSet && hitSet.has(en)) continue;
    if (pointToSegmentDist(en.x, en.y, ox, oy, endX, endY) <= en.radius + halfWidth) {
      const { amount, isCrit } = calculatePlayerDamage(dmgMult, isSkill);
      damageEnemy(en, amount, { isCrit, knockback, sourceX: ox, sourceY: oy, isNormalAttack: !isSkill, stun: stunDur, ...extraOpts });
      if (hitSet) hitSet.add(en);
      if (extraOpts.killerBleedStacks) {
        applyBleed(en, extraOpts.killerBleedStacks);
      }
      if (!isSkill) addFrankyCola(5);
      registerRobinHit(en);
      hitAny = true;
    }
  }
  return hitAny;
}

export function tryDash(): void {
  const p = STATE.player;
  if (p.dashCharges <= 0 || p.isDashing || p.stormTimer > 0) return;
  if (STATE.charId === 'whitebeard' && p.quakeZoneTimer > 0) return; // Bloqueo de Dash en Island Shaking H3
  if (STATE.charId === 'luffy_pts' && p.isChargingKKG) return; // Bloqueo de Dash mientras carga King Kong Gun

  p.dashCharges--;
  if (p.dashCdTimer <= 0) {
    p.dashCdTimer = p.dashCdMax * STATE.mods.dashCdMult;
  }
  p.dashDurationMax = CONFIG.DASH_DURATION;
  p.dashHitEnemyIds = [];

  // LAW: Teletransporte 220 px base (240 px si se inicia dentro del ROOM)
  if (STATE.charId === 'law') {
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
    p.facingAngle = Math.atan2(dirY, dirX);
    const teleportDist = p.roomTimer > 0 ? 240 : 220;
    const startX = p.x, startY = p.y;
    const destX = Math.max(CONFIG.ARENA_MARGIN_X + p.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x + dirX * teleportDist));
    const destY = Math.max(CONFIG.ARENA_MARGIN_Y + p.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y + dirY * teleportDist));

    STATE.slashEffects.push({
      x: startX, y: startY, angle: 0, range: 38,
      color: '#FFFFFF', life: 0.24, maxLife: 0.24, type: 'shambles_cut'
    });
    STATE.slashEffects.push({
      x: destX, y: destY, angle: 0, range: 48, isCircular: true,
      color: '#26C6DA', life: 0.24, maxLife: 0.24, type: 'ring'
    });

    p.x = destX;
    p.y = destY;
    p.invulnTimer = 0.15;
    AUDIO.playTeleport();

    if (STATE.mods.dashSlowTrail) {
      STATE.hazards.push({ x: startX, y: startY, radius: 55, life: 3.0, type: 'player_slow' });
    }
    return;
  }

  if (STATE.charId === 'usopp') {
    const nearest = findNearestEnemy(450);
    if (nearest) {
      const awayAngle = Math.atan2(p.y - nearest.y, p.x - nearest.x);
      p.dashDirX = Math.cos(awayAngle);
      p.dashDirY = Math.sin(awayAngle);
      p.facingAngle = Math.atan2(nearest.y - p.y, nearest.x - p.x);
    } else if (INPUT_TOUCH.joystick.magnitude > 0.1) {
      p.dashDirX = -INPUT_TOUCH.joystick.dirX;
      p.dashDirY = -INPUT_TOUCH.joystick.dirY;
    } else {
      p.dashDirX = -Math.cos(p.facingAngle);
      p.dashDirY = -Math.sin(p.facingAngle);
    }
    p.customDashDist = 150;
    p.invulnTimer = 0.15;
    AUDIO.playDash();
    for (let i = 0; i < 6; i++) spawnParticle(p.x, p.y, '#D7CCC8', 4, 0.3);
  } else {
    if (INPUT_TOUCH.joystick.magnitude > 0.1) {
      p.dashDirX = INPUT_TOUCH.joystick.dirX;
      p.dashDirY = INPUT_TOUCH.joystick.dirY;
    } else {
      const target = findNearestEnemy(400);
      if (target) {
        const ang = Math.atan2(target.y - p.y, target.x - p.x);
        p.dashDirX = Math.cos(ang);
        p.dashDirY = Math.sin(ang);
      } else {
        p.dashDirX = Math.cos(p.facingAngle);
        p.dashDirY = Math.sin(p.facingAngle);
      }
    }
    p.facingAngle = Math.atan2(p.dashDirY, p.dashDirX);

    if (STATE.charId === 'franky') {
      p.customDashDist = 100;
      p.invulnTimer = 0.20;
      AUDIO.playDash();
      AUDIO.playMetalClank();
      for (let i = 0; i < 8; i++) spawnParticle(p.x, p.y, '#FFD54F', 4, 0.3);
    } else if (STATE.charId === 'kid') {
      p.customDashDist = p.punkRottenTimer > 0 ? 80 : 130;
      p.invulnTimer = 0.20;
      AUDIO.playDash();
      AUDIO.playMetalClank();
      for (let i = 0; i < 8; i++) spawnParticle(p.x, p.y, i % 2 === 0 ? '#D32F2F' : '#FFC107', 4.5, 0.3);
    } else if (STATE.charId === 'killer') {
      p.customDashDist = 170;
      p.dashDurationMax = 0.25;
      p.invulnTimer = 0.15;
      AUDIO.playDash();
      AUDIO.playSlash(1.3);
      const endX = p.x + p.dashDirX * 170;
      const endY = p.y + p.dashDirY * 170;
      STATE.slashEffects.push({
        x: p.x, y: p.y, endX, endY, angle: p.facingAngle,
        range: 170, color: '#FF5252', life: 0.25, maxLife: 0.25, type: 'line'
      });
    } else if (STATE.charId === 'robin') {
      p.customDashDist = 160;
      p.invulnTimer = 0.15;
      AUDIO.playDash();
      AUDIO.playEtherealSwish();
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: p.facingAngle + Math.PI, range: 45, count: 2,
        color: '#CE93D8', life: 0.22, maxLife: 0.22, type: 'robin_hands'
      });
    } else if (STATE.charId === 'shanks') {
      p.customDashDist = 180;
      p.invulnTimer = 0.15;
      AUDIO.playDash();
      AUDIO.playShing();
      for (let i = 0; i < 8; i++) spawnParticle(p.x, p.y, '#FF1744', 4.5, 0.3);
      STATE.slashEffects.push({
        x: p.x, y: p.y, endX: p.x + p.dashDirX * 180, endY: p.y + p.dashDirY * 180,
        angle: p.facingAngle, range: 180, color: '#FF1744', life: 0.20, maxLife: 0.20, type: 'line'
      });
    } else if (STATE.charId === 'whitebeard') {
      // Barbablanca: más lento y pesado, dash 100 px, i-frames 0.2s, sin shake
      p.customDashDist = 100;
      p.invulnTimer = 0.20;
      AUDIO.playDash();
      for (let i = 0; i < 8; i++) spawnParticle(p.x, p.y, '#ECEFF1', 4, 0.3);
    } else if (STATE.charId === 'luffy_pts') {
      p.customDashDist = 200;
      p.invulnTimer = 0.15;
      AUDIO.playDash();
      AUDIO.playFwoosh();
      for (let i = 0; i < 10; i++) spawnParticle(p.x, p.y, i % 2 === 0 ? '#FF1744' : '#ECEFF1', 4.5, 0.35);
      STATE.slashEffects.push({
        x: p.x, y: p.y, endX: p.x + p.dashDirX * 200, endY: p.y + p.dashDirY * 200,
        angle: p.facingAngle, range: 200, color: '#FF1744', life: 0.22, maxLife: 0.22, type: 'line'
      });
    } else {
      p.customDashDist = CONFIG.DASH_DISTANCE;
      p.invulnTimer = CONFIG.DASH_IFRAMES;
    }
  }

  p.isDashing = true;
  p.dashTimer = p.dashDurationMax;
  p.visualScaleX = 1.22;
  p.visualScaleY = 0.82;

  if (STATE.charId === 'sanji') {
    p.speedBuffTimer = 2.0;
    AUDIO.playKick();
  } else if (STATE.charId === 'zoro') {
    AUDIO.playSlash(1.0);
  } else if (STATE.charId === 'luffy') {
    AUDIO.playPunch();
  }

  if (STATE.mods.dashSlowTrail) {
    STATE.hazards.push({
      x: p.x, y: p.y, radius: 55, life: 3.0, type: 'player_slow'
    });
  }

  if (STATE.charId === 'zoro') {
    const endX = p.x + p.dashDirX * CONFIG.DASH_DISTANCE;
    const endY = p.y + p.dashDirY * CONFIG.DASH_DISTANCE;
    STATE.slashEffects.push({
      x: p.x, y: p.y, endX, endY, angle: p.facingAngle,
      range: CONFIG.DASH_DISTANCE, color: '#66BB6A', life: 0.2, maxLife: 0.2, type: 'line'
    });
    STATE.enemies.forEach(en => {
      if (pointToSegmentDist(en.x, en.y, p.x, p.y, endX, endY) <= en.radius + 28) {
        const { amount, isCrit } = calculatePlayerDamage(0.8, true);
        damageEnemy(en, amount, { isCrit, applyBleed: Math.random() < 0.15 });
      }
    });
  }
}

export function trySkill(idx: number): void {
  const p = STATE.player;

  // Barbablanca H3: Si Island Shaking ya está activo, re-pulsar H3 cancela la habilidad de inmediato
  if (STATE.charId === 'whitebeard' && idx === 2 && p.quakeZoneTimer > 0) {
    cancelWhitebeardQuakeZone();
    return;
  }

  // Luffy PTS H3: Si King Kong Gun ya está cargando, re-pulsar H3 dispara el ataque
  if (STATE.charId === 'luffy_pts' && idx === 2 && p.isChargingKKG) {
    releaseKingKongGun();
    return;
  }

  // Luffy PTS: Bloqueo de otras habilidades mientras carga King Kong Gun
  if (STATE.charId === 'luffy_pts' && p.isChargingKKG && idx !== 2) {
    return;
  }

  // Law H2 (Shambles) requiere que ROOM esté activo
  if (STATE.charId === 'law' && idx === 1 && p.roomTimer <= 0) {
    AUDIO.playMetalClank();
    spawnFloatingText(p.x, p.y - 42, '🔒 Requiere ROOM', '#80DEEA', 0.95);
    return;
  }

  // H3 de Kid (Damned Punk) bloqueada fuera de Punk Rotten
  if (STATE.charId === 'kid' && idx === 2 && p.punkRottenTimer <= 0) {
    AUDIO.playMetalClank();
    spawnFloatingText(p.x, p.y - 42, '🔒 Requiere Punk Rotten', '#FF8A80', 0.95);
    return;
  }

  if (p.skillCds[idx] > 0 || p.isDashing || p.stormTimer > 0) return;

  const aimAngle = getAimAngle();
  p.facingAngle = aimAngle;
  STATE.timeSinceLastCombat = 0;

  // Gestión especial de CD: habilidades con activación diferida, cargas o cadena
  const isKidAttractPhase1 = (STATE.charId === 'kid' && idx === 0 && p.kidRepelWindowTimer <= 0);
  const isKidRepelPhase2   = (STATE.charId === 'kid' && idx === 0 && p.kidRepelWindowTimer > 0);
  const isLuffyPTSG2       = (STATE.charId === 'luffy_pts' && idx === 1);
  const isLuffyPTSKKG      = (STATE.charId === 'luffy_pts' && idx === 2);
  const isWhitebeardJump   = (STATE.charId === 'whitebeard' && idx === 1);
  const isWhitebeardQuake  = (STATE.charId === 'whitebeard' && idx === 2);
  const isShanksChain      = (STATE.charId === 'shanks' && idx === 1);

  if (!isKidAttractPhase1 && !isLuffyPTSG2 && !isLuffyPTSKKG && !isWhitebeardJump && !isWhitebeardQuake && !isShanksChain) {
    let cd = p.skillMaxCds[idx];
    if (idx === 0) cd *= STATE.mods.h1CdMult;
    p.skillCds[idx] = cd;
  }

  p.skillAnimTimer = 0.28;
  p.activeSkillIndex = idx;

  triggerHaptic([15, 30, 15]);

  const char = STATE.charId;
  const applyBurnFromMod = (idx === 0 && STATE.mods.h1Burn);
  const pierceShield = (idx === 1 && STATE.mods.h2PierceShield);
  const areaMult = (idx === 2) ? STATE.mods.h3AreaMult : 1.0;

  let frankyColaMult = 1.0;
  if (char === 'franky' && p.cola >= p.maxCola) {
    frankyColaMult = 1.30;
    p.cola = 0;
    abilitiesCallbacks.onUpdateFrankyColaHUD();
    spawnFloatingText(p.x, p.y - 44, '🥤 ¡SUPER COLA +30%!', '#00E5FF', 1.2);
  }

  if (char === 'luffy') {
    if (idx === 0) {
      p.gatlingHitsLeft = hasLuffyGatlingSynergy() ? 15 : 10;
      p.gatlingTickTimer = 0;
    } else if (idx === 1) {
      AUDIO.playExplosion(1.1);
      STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
      triggerScreenShake(6, 0.14);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: 115, color: '#F5C518', life: 0.22, maxLife: 0.22, type: 'arc'
      });
      STATE.enemies.forEach(en => {
        const dx = en.x - p.x, dy = en.y - p.y;
        if (Math.hypot(dx, dy) - en.radius <= 115 && Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= Math.PI / 3) {
          const { amount, isCrit } = calculatePlayerDamage(3.0, true);
          damageEnemy(en, amount, { isCrit, knockback: 320, sourceX: p.x, sourceY: p.y, pierceShield });
        }
      });
    } else if (idx === 2) {
      p.stormTimer = 1.2;
      p.stormHitsLeft = 15;
      p.stormTickTimer = 0;
      p.stormAimAngle = 0;
      STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
      AUDIO.playSlash(1.2);
      spawnFloatingText(p.x, p.y - 38, '🌪️ ¡GOMU GOMU NO STORM!', '#F5C518', 1.2);
    }
  } else if (char === 'zoro') {
    if (idx === 0) {
      AUDIO.playSlash(1.1);
      const dashDist = 130;
      const endX = Math.max(CONFIG.ARENA_MARGIN_X, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X, p.x + Math.cos(aimAngle) * dashDist));
      const endY = Math.max(CONFIG.ARENA_MARGIN_Y, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y, p.y + Math.sin(aimAngle) * dashDist));
      STATE.slashEffects.push({
        x: p.x, y: p.y, endX, endY, angle: aimAngle, range: dashDist, color: '#66BB6A', life: 0.24, maxLife: 0.24, type: 'onigiri'
      });
      STATE.enemies.forEach(en => {
        if (pointToSegmentDist(en.x, en.y, p.x, p.y, endX, endY) <= en.radius + 42) {
          const { amount, isCrit } = calculatePlayerDamage(3.6, true);
          damageEnemy(en, amount, { isCrit, applyBurn: applyBurnFromMod, applyBleed: Math.random() < 0.25 });
        }
      });
      p.x = endX;
      p.y = endY;
    } else if (idx === 1) {
      AUDIO.playSlash(1.0);
      triggerScreenShake(5, 0.12);
      STATE.projectiles.push({
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
        pierceShield: pierceShield,
        life: 1.1,
        color: '#66BB6A',
        type: 'pound_ho_x'
      });
    } else if (idx === 2) {
      p.sanzenStep = 0;
      p.sanzenTimer = 0;
      p.sanzenAngle = aimAngle;
      spawnFloatingText(p.x, p.y - 38, '⚔️ ¡SANZEN SEKAI!', '#66BB6A', 1.25);
      executeSanzenCut(0, areaMult);
    }
  } else if (char === 'sanji') {
    if (idx === 0) {
      p.diableHitsLeft = 8;
      p.diableTickTimer = 0;
    } else if (idx === 1) {
      AUDIO.playExplosion(1.25);
      const targetX = p.x + Math.cos(aimAngle) * 65;
      const targetY = p.y + Math.sin(aimAngle) * 65;
      STATE.hitstopTimer = CONFIG.HITSTOP_DURATION;
      triggerScreenShake(6, 0.14);
      STATE.slashEffects.push({
        x: targetX, y: targetY, angle: 0, range: 85, isCircular: true, color: '#FFA726', life: 0.24, maxLife: 0.24, type: 'ring'
      });
      STATE.enemies.forEach(en => {
        if (Math.hypot(en.x - targetX, en.y - targetY) - en.radius <= 85) {
          const { amount, isCrit } = calculatePlayerDamage(2.5, true);
          damageEnemy(en, amount, { isCrit, stun: 1.0, pierceShield });
        }
      });
    } else if (idx === 2) {
      p.ifritShotsLeft = 6;
      p.ifritTickTimer = 0;
      p.ifritCycleIndex = 0;
      spawnFloatingText(p.x, p.y - 38, '🔥 ¡DIABLE JAMBE: BARRAGE!', '#FF7043', 1.2);
    }
  } else if (char === 'usopp') {
    if (idx === 0) {
      AUDIO.playSlash(1.15);
      AUDIO.playFwoosh();
      STATE.projectiles.push({
        fromPlayer: true,
        x: p.x + Math.cos(aimAngle) * 20,
        y: p.y + Math.sin(aimAngle) * 20,
        vx: Math.cos(aimAngle) * 760,
        vy: Math.sin(aimAngle) * 760,
        traveled: 0, maxRange: 320,
        radius: 18,
        dmgMult: 2.0,
        maxHits: 3,
        hitIds: [],
        life: 0.65,
        color: '#FF5722',
        type: 'firebird_star'
      });
    } else if (idx === 1) {
      AUDIO.playSmokePoof();
      const sx = Math.max(CONFIG.ARENA_MARGIN_X + 40, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - 40, p.x + Math.cos(aimAngle) * 80));
      const sy = Math.max(CONFIG.ARENA_MARGIN_Y + 40, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - 40, p.y + Math.sin(aimAngle) * 80));
      STATE.hazards.push({
        x: sx, y: sy, radius: 120, life: 2.0, maxLife: 2.0, type: 'usopp_smoke'
      });
      for (let k = 0; k < 14; k++) spawnParticle(sx, sy, '#B0BEC5', 8, 0.7);
    } else if (idx === 2) {
      AUDIO.playTrapClick();
      const trapRadius = 80 * areaMult;
      for (let t = 0; t < 3; t++) {
        const ang = aimAngle + (t * (Math.PI * 2)) / 3;
        const tx = Math.max(CONFIG.ARENA_MARGIN_X + 20, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - 20, p.x + Math.cos(ang) * trapRadius));
        const ty = Math.max(CONFIG.ARENA_MARGIN_Y + 20, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - 20, p.y + Math.sin(ang) * trapRadius));
        STATE.traps.push({
          x: tx, y: ty,
          triggerRadius: 24,
          blastRadius: 60 * areaMult,
          dmgMult: 3.0,
          stun: 0.5,
          life: 8.0
        });
      }
      spawnFloatingText(p.x, p.y - 36, '💣 ¡TRAMPAS LEDGER!', '#FF5252', 1.1);
    }
  } else if (char === 'franky') {
    if (idx === 0) {
      AUDIO.playLaserCharge();
      p.radicalChargeTimer = 0.20;
      p.radicalChargeAngle = aimAngle;
      p.radicalColaMult = frankyColaMult;
      spawnFloatingText(p.x, p.y - 38, '⚡ ¡RADICAL BEAM!', '#00E5FF', 1.15);
    } else if (idx === 1) {
      AUDIO.playExplosion(0.8);
      STATE.hitstopTimer = 0.07;
      triggerScreenShake(6, 0.16);
      const hx = p.x + Math.cos(aimAngle) * 60;
      const hy = p.y + Math.sin(aimAngle) * 60;
      STATE.slashEffects.push({
        x: hx, y: hy, angle: 0, range: 140, isCircular: true,
        color: '#E0E0E0', life: 0.28, maxLife: 0.28, type: 'ring'
      });
      for (let k = 0; k < 14; k++) spawnParticle(hx, hy, '#CFD8DC', 6, 0.4);
      damageEnemiesInCircle(hx, hy, 140, 2.0 * frankyColaMult, 125, true, 0.8);
    } else if (idx === 2) {
      AUDIO.playExplosion(0.95);
      triggerScreenShake(7, 0.24);
      const range = 310 * areaMult;
      const halfAng = Math.PI / 3.1;
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: aimAngle, range: range, halfAngle: halfAng,
        color: '#E0F7FA', life: 0.34, maxLife: 0.34, type: 'coup_de_vent'
      });
      for (let k = 0; k < 18; k++) {
        const a = aimAngle + (Math.random() - 0.5) * halfAng * 1.8;
        const d = 40 + Math.random() * (range * 0.85);
        spawnParticle(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, '#84FFFF', 5, 0.38);
      }
      STATE.enemies.forEach(en => {
        if (en.hp <= 0) return;
        const dx = en.x - p.x, dy = en.y - p.y;
        if (Math.hypot(dx, dy) - en.radius <= range && Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= halfAng) {
          const { amount, isCrit } = calculatePlayerDamage(1.65 * frankyColaMult, true);
          damageEnemy(en, amount, { isCrit, knockback: 240, sourceX: p.x, sourceY: p.y });
          registerRobinHit(en);
        }
      });
      spawnFloatingText(p.x, p.y - 38, '🌪️ ¡COUP DE VENT!', '#84FFFF', 1.25);
    }
  } else if (char === 'robin') {
    if (idx === 0) {
      AUDIO.playEtherealSwish();
      const target = findNearestEnemy(200);
      if (target) {
        const { amount, isCrit } = calculatePlayerDamage(1.5, true);
        damageEnemy(target, amount, { isCrit, root: 3.0, clutchDot: 3.0, applyBurn: applyBurnFromMod });
        registerRobinHit(target);
        STATE.slashEffects.push({
          x: target.x, y: target.y, angle: 0, range: 40, count: 4,
          color: '#9C27B0', life: 0.35, maxLife: 0.35, type: 'robin_clutch'
        });
        spawnFloatingText(target.x, target.y - 42, '👐 ¡CLUTCH!', '#CE93D8', 1.15);
      } else {
        const fx = p.x + Math.cos(aimAngle) * 120;
        const fy = p.y + Math.sin(aimAngle) * 120;
        STATE.slashEffects.push({
          x: fx, y: fy, angle: 0, range: 45, count: 4,
          color: '#9C27B0', life: 0.3, maxLife: 0.3, type: 'robin_clutch'
        });
      }
    } else if (idx === 1) {
      AUDIO.playEtherealSwish();
      triggerScreenShake(4, 0.14);
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: 0, range: 150, count: 20,
        color: '#BA68C8', life: 0.38, maxLife: 0.38, type: 'mil_fleur'
      });
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        const r = 40 + Math.random() * 110;
        spawnParticle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, '#E1BEE7', 5, 0.4);
      }
      STATE.enemies.forEach(en => {
        if (en.hp <= 0) return;
        if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= 150) {
          const { amount, isCrit } = calculatePlayerDamage(2.0, true);
          damageEnemy(en, amount, { isCrit, pierceShield });
          registerRobinHit(en);
        }
      });
    } else if (idx === 2) {
      AUDIO.playEtherealSwish();
      const length = 250 * areaMult;
      const width = 80 * areaMult;
      STATE.pendingStrikes.push({
        timer: 0.30,
        maxTimer: 0.30,
        ox: p.x,
        oy: p.y,
        angle: aimAngle,
        length: length,
        width: width,
        dmgMult: 3.5,
        stun: 1.5,
        type: 'gigantesco_mano'
      });
      spawnFloatingText(p.x, p.y - 38, '巨 ¡GIGANTESCO MANO!', '#E1BEE7', 1.2);
    }
  } else if (char === 'law') {
    // TRAFALGAR LAW
    if (idx === 0) {
      // H1 — ROOM (180 px radio, 6 s duración, frena y detiene proyectiles enemigos)
      AUDIO.playEtherealSwish();
      AUDIO.playTeleport();
      p.roomTimer = 6.0;
      p.roomDurationMax = 6.0;
      p.roomRadius = 180;
      p.roomFadeTimer = 0;
      spawnFloatingText(p.x, p.y - 44, '🌐 ¡ROOM!', '#26C6DA', 1.3);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2;
        spawnParticle(p.x + Math.cos(a) * 180, p.y + Math.sin(a) * 180, '#80DEEA', 5, 0.45);
      }
      if (applyBurnFromMod) {
        STATE.enemies.forEach(en => {
          if (en.hp > 0 && Math.hypot(en.x - p.x, en.y - p.y) <= p.roomRadius + en.radius) {
            en.burnTimer = 3.0; en.burnTick = 0.5; en.burnDps = 5;
          }
        });
      }
    } else if (idx === 1) {
      // H2 — Shambles: SÓLO usable mientras ROOM está activo; inmoviliza (root) 4 s dentro del ROOM + reciben 1.5x daño de Law
      if (p.roomTimer <= 0) return;
      AUDIO.playTeleport();
      AUDIO.playShing();
      const radius = p.roomRadius;
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: 0, range: radius, isCircular: true,
        color: '#26C6DA', life: 0.35, maxLife: 0.35, type: 'ring'
      });
      let affected = 0;
      STATE.enemies.forEach(en => {
        if (en.hp <= 0) return;
        if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
          affected++;
          en.rootTimer = Math.max(en.rootTimer || 0, 4.0);
          en.lawShamblesDebuffTimer = 4.0;
          STATE.slashEffects.push({
            x: en.x, y: en.y, angle: 0, range: en.radius + 14,
            color: '#80DEEA', life: 0.35, maxLife: 0.35, type: 'shambles_cut'
          });
          for (let k = 0; k < 6; k++) spawnParticle(en.x, en.y, '#26C6DA', 4.5, 0.4);
          spawnFloatingText(en.x, en.y - 42, '🌀 SHAMBLES (4s)', '#80DEEA', 0.95);
        }
      });
      spawnFloatingText(p.x, p.y - 46, affected > 0 ? `🌀 ¡SHAMBLES! (${affected})` : '🌀 ¡SHAMBLES!', '#26C6DA', 1.25);
    } else if (idx === 2) {
      // H3 — Gamma Knife
      AUDIO.playLaserCharge();
      AUDIO.playExplosion(1.15);
      if (p.roomTimer > 0) {
        const radius = p.roomRadius * areaMult;
        STATE.hitstopTimer = 0.10;
        triggerScreenShake(8, 0.22);
        STATE.slashEffects.push({
          x: p.x, y: p.y, angle: 0, range: radius, isCircular: true,
          color: '#E040FB', life: 0.36, maxLife: 0.36, type: 'gamma_room_burst'
        });
        for (let k = 0; k < 22; k++) {
          const a = (k / 22) * Math.PI * 2;
          const r = 30 + Math.random() * (radius * 0.85);
          spawnParticle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, k % 2 === 0 ? '#E040FB' : '#FFFFFF', 6, 0.45);
        }
        STATE.enemies.forEach(en => {
          if (en.hp <= 0) return;
          if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
            const { amount, isCrit } = calculatePlayerDamage(3.5, true);
            damageEnemy(en, amount, {
              isCrit,
              ignoreArmorPct: 1.0,
              stun: 0.8
            });
          }
        });
        spawnFloatingText(p.x, p.y - 46, '⚡ ¡GAMMA KNIFE!', '#E040FB', 1.35);
      } else {
        const radius = 80 * areaMult;
        STATE.slashEffects.push({
          x: p.x, y: p.y, angle: 0, range: radius, isCircular: true,
          color: '#BA68C8', life: 0.25, maxLife: 0.25, type: 'ring'
        });
        damageEnemiesInCircle(p.x, p.y, radius, 2.0, 35, true, 0, { ignoreArmorPct: 0.20 });
      }
    }
  } else if (char === 'kid') {
    // EUSTASS KID
    if (idx === 0) {
      if (isKidAttractPhase1) {
        AUDIO.playMagneticPull();
        AUDIO.playMetalClank();
        const radius = 250;
        STATE.slashEffects.push({
          x: p.x, y: p.y, angle: 0, range: radius, isCircular: true,
          color: '#D32F2F', life: 0.32, maxLife: 0.32, type: 'magnetic_pull'
        });
        let pulledCount = 0;
        STATE.enemies.forEach(en => {
          if (en.hp <= 0) return;
          const d = Math.hypot(en.x - p.x, en.y - p.y);
          if (d - en.radius <= radius) {
            pulledCount++;
            const { amount, isCrit } = calculatePlayerDamage(1.0, true);
            damageEnemy(en, amount, { isCrit, applyBurn: applyBurnFromMod });
            if (!en.isBoss) {
              en.magnetPullTimer = 0.30;
              en.magnetPullSpeed = Math.min(120, Math.max(0, d - 34)) / 0.30;
            }
            for (let k = 0; k < 5; k++) spawnParticle(en.x, en.y, '#FFC107', 4, 0.3);
          }
        });
        if (pulledCount > 0) addKidScrap(pulledCount);

        p.kidRepelWindowTimer = 3.0;
        abilitiesCallbacks.onUpdateKidH1PhaseUI();
        spawnFloatingText(p.x, p.y - 42, '🧲 ¡ATTRACT! (Repel listo)', '#FF5252', 1.15);
      } else if (isKidRepelPhase2) {
        p.kidRepelWindowTimer = 0;
        abilitiesCallbacks.onUpdateKidH1PhaseUI();
        AUDIO.playFwoosh();
        AUDIO.playExplosion(0.95);
        triggerScreenShake(6, 0.20);
        const radius = 200;
        STATE.slashEffects.push({
          x: p.x, y: p.y, angle: 0, range: radius, isCircular: true,
          color: '#FFC107', life: 0.32, maxLife: 0.32, type: 'ring'
        });
        for (let k = 0; k < 20; k++) {
          const a = (k / 20) * Math.PI * 2;
          spawnParticle(p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 40, k % 2 === 0 ? '#D32F2F' : '#FFC107', 5.5, 0.4);
        }
        let repelledCount = 0;
        STATE.enemies.forEach(en => {
          if (en.hp <= 0) return;
          if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
            repelledCount++;
            const { amount, isCrit } = calculatePlayerDamage(1.5, true);
            damageEnemy(en, amount, {
              isCrit,
              knockback: 315,
              sourceX: p.x,
              sourceY: p.y,
              stun: 0.5
            });
          }
        });
        if (repelledCount > 0) addKidScrap(repelledCount);
        spawnFloatingText(p.x, p.y - 42, '💥 ¡REPEL!', '#FFD54F', 1.25);
      }
    } else if (idx === 1) {
      // H2 — PUNK ROTTEN
      AUDIO.playMetalClank();
      AUDIO.playRoar();
      triggerScreenShake(6, 0.22);
      p.punkRottenTimer = 8.0;
      p.punkRottenDurationMax = 8.0;
      p.punkRottenBuildTimer = 0.25;

      p.punkRottenPrevMaxCharges = p.maxDashCharges;
      p.punkRottenPrevDashCdMax = p.dashCdMax;
      p.armor += 20;
      p.maxDashCharges = 1;
      p.dashCharges = Math.min(1, p.dashCharges);
      p.dashCdMax = 4.0;

      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: 0, range: 95, isCircular: true,
        color: '#FFC107', life: 0.35, maxLife: 0.35, type: 'ring'
      });
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2;
        spawnParticle(p.x + Math.cos(a) * 55, p.y + Math.sin(a) * 55, k % 2 === 0 ? '#757575' : '#D32F2F', 6, 0.45);
      }
      spawnFloatingText(p.x, p.y - 48, '🤖 ¡PUNK ROTTEN!', '#FFC107', 1.35);
      abilitiesCallbacks.onUpdateKidScrapHUD();
    } else if (idx === 2) {
      // H3 — DAMNED PUNK: Cañón electromagnético potenciado durante 2 s (6 ticks de 1.75x + quemadura 4/s 3s)
      AUDIO.playLaserCharge();
      triggerScreenShake(5, 0.25);
      p.damnedPunkTimer = 2.0;
      p.damnedPunkTickTimer = 0;
      p.damnedPunkTicksLeft = 6;
      p.damnedPunkTarget = findNearestEnemy(460);
      p.damnedPunkAngle = p.damnedPunkTarget
        ? Math.atan2(p.damnedPunkTarget.y - p.y, p.damnedPunkTarget.x - p.x)
        : aimAngle;
      spawnFloatingText(p.x, p.y - 52, '⚡ ¡DAMNED PUNK!', '#FF5252', 1.35);
    }
  } else if (char === 'killer') {
    // KILLER
    const isFrenzy = p.killerFrenzyTimer > 0;
    if (idx === 0) {
      AUDIO.playShing();
      AUDIO.playSlash(1.3);
      const dashDist = 100;
      const startX = p.x, startY = p.y;
      const endX = Math.max(CONFIG.ARENA_MARGIN_X + p.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x + Math.cos(aimAngle) * dashDist));
      const endY = Math.max(CONFIG.ARENA_MARGIN_Y + p.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y + Math.sin(aimAngle) * dashDist));

      STATE.slashEffects.push({
        x: startX, y: startY, endX, endY, angle: aimAngle, range: dashDist,
        color: '#FF5252', life: 0.22, maxLife: 0.22, type: 'onigiri'
      });
      STATE.slashEffects.push({
        x: endX, y: endY, angle: 0, range: 60, isCircular: true,
        color: '#FFFFFF', life: 0.22, maxLife: 0.22, type: 'ring'
      });

      p.x = endX;
      p.y = endY;
      p.invulnTimer = Math.max(p.invulnTimer, 0.12);

      damageEnemiesInCircle(endX, endY, 60, 1.2, 20, true, 0, {
        pierceShield: isFrenzy,
        killerBleedStacks: 2
      });
    } else if (idx === 1) {
      // H2 — Bloodlust: Buff de 4 s (ataques normales aplican 1 stack sangrado, 5to golpe aplica 2, +15% vel ataque)
      AUDIO.playShing();
      AUDIO.playRoar();
      AUDIO.playHeartbeat();
      p.ensanamientoTimer = 4.0;
      p.killerHeartbeatTimer = 0.65;
      for (let k = 0; k < 14; k++) spawnParticle(p.x, p.y, '#FF1744', 5, 0.45);
      spawnFloatingText(p.x, p.y - 44, '🩸 ¡BLOODLUST!', '#FF5252', 1.25);
    } else if (idx === 2) {
      // H3 — Killer Frenzy
      AUDIO.playRoar();
      AUDIO.playShing();
      AUDIO.playHeartbeat();
      triggerScreenShake(6, 0.22);
      if (p.killerFrenzyTimer <= 0) {
        p.armor += 15;
      }
      p.killerFrenzyTimer = 6.0;
      p.killerHeartbeatTimer = 0.42;
      const frenzyEl = document.getElementById('frenzy-vignette');
      if (frenzyEl) frenzyEl.style.display = 'block';
      for (let k = 0; k < 22; k++) spawnParticle(p.x, p.y, '#D50000', 6, 0.55);
      spawnFloatingText(p.x, p.y - 48, '👹 ¡KILLER FRENZY!', '#FF1744', 1.35);
    }
  } else if (char === 'shanks') {
    // SHANKS v1.9b: H1 Conqueror's Haki (círculo 360°), H2 Divine Departure (dash-corte dinámico), H3 Future Sight (+30% vel)
    if (idx === 0) {
      // H1: Conqueror's Haki - Estallido circular 360° de radio 220 px. Stun base 3.0s escalando hasta 4.2s con Haki.
      const haki = p.shanksHaki || 0;
      let dmgMult = 1.5;
      let stunDur = 3.0; // Stun base 3.0s
      if (haki >= 100) {
        dmgMult = 3.2;
        stunDur = 4.2;
        p.shanksHaki = 0; // Consume todo el Haki
        abilitiesCallbacks.onUpdateShanksHakiHUD();
        spawnFloatingText(p.x, p.y - 52, '👑 ¡CONQUEROR MAX HAKI (3.2× / 4.2s)!', '#FF1744', 1.5);
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

      AUDIO.playExplosion(1.4);
      AUDIO.playShing();
      triggerScreenShake(6, 0.20);
      STATE.hitstopTimer = 0.08;
      const circleRadius = 220 * areaMult;

      // Círculo rojo vibrante que se expande con ondas concéntricas
      STATE.slashEffects.push({
        x: p.x, y: p.y, angle: 0, range: circleRadius, isCircular: true,
        color: '#FF1744', subColor: '#D50000', life: 0.38, maxLife: 0.38, type: 'shanks_haki_burst'
      });
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const r = 50 + Math.random() * (circleRadius - 50);
        spawnParticle(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, k % 2 === 0 ? '#FF1744' : '#D50000', 5.5, 0.35);
      }

      // Afecta en 360° a todos los enemigos dentro del radio
      STATE.enemies.forEach(en => {
        if (en.hp <= 0) return;
        const d = Math.hypot(en.x - p.x, en.y - p.y);
        if (d - en.radius <= circleRadius) {
          const { amount, isCrit } = calculatePlayerDamage(dmgMult, true);
          damageEnemy(en, amount, {
            isCrit, stun: stunDur, knockback: 65, sourceX: p.x, sourceY: p.y, pierceShield: true
          });
        }
      });
      p.skillCds[0] = p.skillMaxCds[0]; // CD 10s
      spawnFloatingText(p.x, p.y - 48, `👑 ¡CONQUEROR'S HAKI! (${stunDur.toFixed(1)}s)`, '#FF1744', 1.4);

    } else if (idx === 1) {
      // H2: Divine Departure - 5 TOQUES ENCADENADOS (ventana 1.2s, re-apuntado por toque, 320px piercing)
      const nextStep = (p.shanksChainStep || 0) + 1; // 1..5
      const stepMults = [1.0, 1.2, 1.4, 1.6, 2.5];
      const dmgMult = stepMults[nextStep - 1] || 1.0;

      const target = findNearestEnemy(320);
      const cutAngle = target ? Math.atan2(target.y - p.y, target.x - p.x) : p.facingAngle;

      const travelDist = 320;
      const startX = p.x, startY = p.y;
      const destX = Math.max(CONFIG.ARENA_MARGIN_X + p.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, p.x + Math.cos(cutAngle) * travelDist));
      const destY = Math.max(CONFIG.ARENA_MARGIN_Y + p.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, p.y + Math.sin(cutAngle) * travelDist));

      p.x = destX;
      p.y = destY;
      p.facingAngle = cutAngle;
      p.invulnTimer = Math.max(p.invulnTimer, 0.10);

      STATE.afterimages.push({ x: startX, y: startY, color: '#FF1744', life: 0.18, maxLife: 0.18 });
      STATE.afterimages.push({ x: (startX + destX) / 2, y: (startY + destY) / 2, color: '#FF1744', life: 0.15, maxLife: 0.15 });

      const hitSet = new Set<any>();

      if (nextStep < 5) {
        p.shanksChainStep = nextStep;
        p.shanksChainTimer = 1.2; // ventana de 1.2s para el siguiente toque
        p.skillCds[1] = 0;
        AUDIO.playSlash(1.35 + (nextStep - 1) * 0.12);
        AUDIO.playDash();
        STATE.hitstopTimer = 0.04;

        STATE.slashEffects.push({
          x: startX, y: startY, endX: destX, endY: destY, angle: cutAngle,
          range: 320, width: 10 + (nextStep - 1) * 3, color: '#FF1744', life: 0.20, maxLife: 0.20, type: 'line'
        });
        for (let k = 0; k < 6; k++) spawnParticle(destX, destY, '#FF1744', 4, 0.25);

        damageEnemiesInLine(startX, startY, cutAngle, travelDist, 20, dmgMult, 25, true, 0, { pierceShield: true, hitSet });
        updateShanksChainUI();
        spawnFloatingText(p.x, p.y - 46, `🗡️ CHAIN (${nextStep}/5)`, '#FF5252', 1.15);
      } else {
        // Toque 5/5 FINAL: daño 2.5x, visual ensanchado ×2.5 (width 100), mismo Haki Burst Circle
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

        STATE.slashEffects.push({
          x: startX, y: startY, endX: destX, endY: destY, angle: cutAngle,
          range: 320, width: 100, color: '#FF1744', subColor: '#111111', life: 0.28, maxLife: 0.28, type: 'line'
        });
        for (let k = 0; k < 10; k++) spawnParticle(destX, destY, '#FF1744', 5.5, 0.3);

        let firstHitRecorded = false;
        STATE.enemies.forEach(en => {
          if (en.hp <= 0) return;
          if (pointToSegmentDist(en.x, en.y, startX, startY, destX, destY) <= en.radius + 50) {
            if (!firstHitRecorded) {
              firstHitPos = { x: en.x, y: en.y };
              firstHitRecorded = true;
            }
            hitCount++;
            const { amount, isCrit } = calculatePlayerDamage(dmgMult, true);
            damageEnemy(en, amount, { isCrit, knockback: 25, sourceX: startX, sourceY: startY, pierceShield: true });
            applyBleed(en, 2);
          }
        });

        if (firstHitPos) {
          const hitPos = firstHitPos as { x: number; y: number };
          STATE.enemies.forEach(en => {
            if (en.hp <= 0) return;
            if (Math.hypot(en.x - hitPos.x, en.y - hitPos.y) < 10) {
              applyBleed(en, 2);
            }
          });
        }

        p.shanksChainStep = 0;
        p.shanksChainTimer = 0;
        p.skillCds[1] = p.skillMaxCds[1];
        AUDIO.playShing();
        AUDIO.playExplosion(1.4);
        triggerScreenShake(6, 0.22);
        STATE.hitstopTimer = 0.08;

        if (firstHitPos && hitCount > 0) {
          const hitPos = firstHitPos as { x: number; y: number };
          p.shanksH2PendingCircles.push({
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
          spawnFloatingText(hitPos.x, hitPos.y - 40, '🗡️ ¡DIVINE DEPARTURE!', '#FF1744', 1.3);
        } else {
          spawnFloatingText(p.x, p.y - 46, '💔 SIN IMPACTO', '#FF5252', 1.15);
        }
        updateShanksChainUI();
      }

    } else if (idx === 2) {
      // H3: Future Sight - 5s de inmunidad total, esquivas MISS y +30% velocidad de movimiento
      p.futureSightTimer = 5.0;
      p.skillCds[2] = p.skillMaxCds[2]; // CD 18s
      AUDIO.playEtherealSwish();
      AUDIO.playShing();
      triggerScreenShake(3, 0.12);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        spawnParticle(p.x + Math.cos(a) * 35, p.y + Math.sin(a) * 35, '#FF1744', 5, 0.35);
      }
      spawnFloatingText(p.x, p.y - 50, '👁️ ¡FUTURE SIGHT (+30% VEL)!', '#FF1744', 1.45);
    }

  } else if (char === 'whitebeard') {
    // BARBABLANCA v1.9b: H1 Seaquake (masivo), H2 Island Shaking (salto real 2 cargas), H3 Island Shaking (zona sísmica cancelable)
    if (p.quakeZoneTimer > 0 && idx < 2) {
      // Bloqueo total de H1 y H2 mientras Island Shaking está activo
      return;
    }

    if (idx === 0) {
      // H1: Seaquake (masivo) - Línea 350 x 100 px, 3x daño, aturde 1.2s, shake 8px, CD 10s
      // v1.9e: visual rediseñado a grieta gris irregular (roca partida), hitbox y stats INTACTOS
      const SEAQUAKE_CRACK_CORE = '#263238';      // gris oscuro casi negro (profundidad)
      const SEAQUAKE_CRACK_EDGE = '#78909C';      // gris medio (bordes)
      const SEAQUAKE_PARTICLE_LIGHT = '#B0BEC5';  // partículas claras
      const SEAQUAKE_PARTICLE_DARK = '#546E7A';   // partículas oscuras
      AUDIO.playExplosion(1.5);
      triggerScreenShake(8, 0.25);
      STATE.hitstopTimer = 0.08;
      const endX = p.x + Math.cos(aimAngle) * 350;
      const endY = p.y + Math.sin(aimAngle) * 350;

      STATE.slashEffects.push({
        x: p.x, y: p.y, endX, endY, angle: aimAngle, range: 350, width: 100,
        color: SEAQUAKE_CRACK_CORE, subColor: SEAQUAKE_CRACK_EDGE, life: 0.35, maxLife: 0.35, type: 'wb_seaquake_crack'
      });
      for (let k = 0; k < 20; k++) {
        const frac = k / 20;
        spawnParticle(p.x + (endX - p.x) * frac, p.y + (endY - p.y) * frac, k % 3 === 0 ? SEAQUAKE_PARTICLE_DARK : SEAQUAKE_PARTICLE_LIGHT, 6, 0.4);
      }

      damageEnemiesInLine(p.x, p.y, aimAngle, 350, 50, 3.0, 60, true, 1.2, { pierceShield: true });
      p.skillCds[0] = p.skillMaxCds[0]; // CD 10s
      spawnFloatingText(p.x, p.y - 48, '⚡ ¡SEAQUAKE!', '#FFFFFF', 1.4);

    } else if (idx === 1) {
      // H2: Island Shaking (Salto Sísmico real: 2 cargas, 0.15s anticipación, 0.4s aire, sprite 1.4x, i-frames 0.55s)
      if ((p.wbJumpCharges || 0) <= 0 || p.wbIsJumping) return;
      p.wbJumpCharges--;
      if (p.wbJumpCdTimer <= 0) {
        p.wbJumpCdTimer = 2.2;
      }
      p.skillCds[1] = 0;

      const target = findNearestEnemy(300);
      let targetX: number, targetY: number;
      if (target) {
        targetX = target.x;
        targetY = target.y;
      } else {
        targetX = p.x + Math.cos(p.facingAngle) * 150;
        targetY = p.y + Math.sin(p.facingAngle) * 150;
      }
      targetX = Math.max(CONFIG.ARENA_MARGIN_X + p.radius, Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - p.radius, targetX));
      targetY = Math.max(CONFIG.ARENA_MARGIN_Y + p.radius, Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - p.radius, targetY));

      // Inicia la animación de salto real con desplazamiento e i-frames
      p.wbIsJumping = true;
      p.wbJumpPhase = 'anticipation';
      p.wbJumpTimer = 0.15;
      p.wbJumpStartX = p.x;
      p.wbJumpStartY = p.y;
      p.wbJumpTargetX = targetX;
      p.wbJumpTargetY = targetY;
      p.wbJumpScale = 1.0;
      p.invulnTimer = Math.max(p.invulnTimer, 0.55); // i-frames durante todo el salto

      AUDIO.playFwoosh();
      spawnFloatingText(p.x, p.y - 42, `⚡ ¡LEAP (${p.wbJumpCharges}/2)!`, '#FFFFFF', 1.0);
      abilitiesCallbacks.onUpdateWhitebeardQuakeHUD();
      abilitiesCallbacks.onUpdateCooldownUI();

    } else if (idx === 2) {
      // H3: Island Shaking (Gura Gura Zona Sísmica Masiva 250 px - Cancelable)
      if (p.quakeZoneTimer > 0) {
        cancelWhitebeardQuakeZone();
        return;
      }

      const dur = 6.0 + Math.floor((p.whitebeardEnergy || 0) / 20); // 6s a 11s
      p.quakeZoneTimer = dur;
      p.quakeZoneDuration = dur;
      p.skillCds[2] = 0; // El enfriamiento de 20s solo empieza al terminar o cancelarse la zona

      AUDIO.playExplosion(1.6);
      triggerScreenShake(8, 0.30);
      for (let k = 0; k < 30; k++) {
        const a = (k / 30) * Math.PI * 2;
        spawnParticle(p.x + Math.cos(a) * 120, p.y + Math.sin(a) * 120, '#FFFFFF', 6, 0.4);
      }
      spawnFloatingText(p.x, p.y - 54, `🌊 ¡GURA GURA ZONE (${dur}s)!`, '#FFFFFF', 1.5);
      const btnCancel = document.getElementById('btn-cancel-quake');
      if (btnCancel) btnCancel.style.display = 'block';
      abilitiesCallbacks.onUpdateCooldownUI();
    }

  } else if (char === 'luffy_pts') {
    // LUFFY PTS v1.9b: H1 Red Hawk Gatling (140°, 15 golpes en 1.2s, targeteo dinámico), H2 Gear 2nd (bloqueo re-activación), H3 King Kong Gun (ininterrumpible en G2)
    if (idx === 0) {
      // H1: Red Hawk Gatling - 15 golpes en 1.2s en cono 140° con targeteo dinámico + finisher colosal en área de 300 px (5.5x)
      p.ptsGatlingHitsLeft = 15;
      p.ptsGatlingTotalHits = 15;
      p.ptsGatlingTickTimer = 0.08; // 15 golpes en 1.2s
      p.ptsGatlingType = 'red_hawk_gatling';
      p.ptsGatlingAngle = aimAngle;
      p.skillCds[0] = p.skillMaxCds[0]; // CD 12s

      AUDIO.playFireCrackle();
      AUDIO.playPunch();
      spawnFloatingText(p.x, p.y - 48, '🔥 ¡RED HAWK GATLING (140°)!', '#FF3D00', 1.35);

    } else if (idx === 1) {
      // H2: Gear 2nd - Bloqueo de re-activación mientras está activo
      if (p.gear2ndTimer > 0) return; // No se puede volver a pulsar mientras está activo

      const dur = 6.0 + Math.floor((p.luffyG2 || 0) / 25);
      p.gear2ndTimer = dur;
      p.gear2ndDuration = dur;
      p.maxDashCharges = 3;
      p.dashCharges = Math.min(3, p.dashCharges + 1);
      p.dashCdMax = 1.2;
      p.skillCds[1] = 0; // El CD solo empieza al terminar el buff

      AUDIO.playFwoosh();
      triggerScreenShake(3, 0.12);
      for (let k = 0; k < 15; k++) {
        spawnParticle(p.x, p.y, '#ECEFF1', 4, 0.35);
      }
      spawnFloatingText(p.x, p.y - 50, `💨 ¡GEAR 2ND (${dur}s)!`, '#FF1744', 1.4);
      abilitiesCallbacks.onUpdateCooldownUI();

    } else if (idx === 2) {
      // H3: King Kong Gun - Inicia la carga al pulsar / sostener H3
      if (p.isChargingKKG) return;
      p.isChargingKKG = true;
      p.kkgChargeTimer = 0;
      p.skillCds[2] = 0; // El enfriamiento de 18s se aplica al disparar
      AUDIO.playFwoosh();
      const unstoppableText = p.gear2ndTimer > 0 ? '🦍 ¡KKG UNSTOPPABLE HAKI!' : '🦍 Cargando King Kong Gun...';
      spawnFloatingText(p.x, p.y - 48, unstoppableText, '#FFD54F', 1.1);
      abilitiesCallbacks.onUpdateCooldownUI();
    }
  }
}

export function executeSanzenCut(stepIdx: number, areaMult = 1.0): void {
  const p = STATE.player;
  const ang = p.sanzenAngle;
  const range = 200 * areaMult;
  const dmgMults = [2.0, 3.0, 5.0];
  const halfAngles = [Math.PI / 4, Math.PI / 4, (60 * Math.PI) / 180];
  const mult = dmgMults[stepIdx] || 2.0;
  const halfAng = halfAngles[stepIdx] || Math.PI / 4;

  AUDIO.playSlash(1.0 + stepIdx * 0.35);

  STATE.slashEffects.push({
    x: p.x, y: p.y, angle: ang, range: range, halfAngle: halfAng,
    color: stepIdx === 2 ? '#FFFFFF' : '#66BB6A',
    life: stepIdx === 2 ? 0.32 : 0.2,
    maxLife: stepIdx === 2 ? 0.32 : 0.2,
    type: stepIdx === 2 ? 'sanzen_final' : 'arc'
  });

  STATE.enemies.forEach(en => {
    if (en.hp <= 0) return;
    const dx = en.x - p.x, dy = en.y - p.y;
    if (Math.hypot(dx, dy) - en.radius <= range) {
      if (Math.abs(normalizeAngle(Math.atan2(dy, dx) - ang)) <= halfAng) {
        const { amount, isCrit } = calculatePlayerDamage(mult, true);
        damageEnemy(en, amount, { isCrit, knockback: 50, sourceX: p.x, sourceY: p.y, applyBleed: true });
      }
    }
  });

  if (stepIdx === 2) {
    STATE.hitstopTimer = 0.10;
    triggerScreenShake(6, 0.18);
    AUDIO.playExplosion(0.85);
    const endX = p.x + Math.cos(ang) * range;
    const endY = p.y + Math.sin(ang) * range;
    STATE.hazards.push({
      x: p.x, y: p.y, endX, endY, radius: 24, life: 0.5, type: 'zoro_crack_line'
    });
  }
}

export function updateLuffyStorm(dt: number): void {
  const p = STATE.player;
  if (p.stormTimer <= 0) return;

  p.stormTimer -= dt;
  p.stormTickTimer -= dt;

  if (p.stormHitsLeft > 0 && p.stormTickTimer <= 0) {
    p.stormTickTimer = 0.075;
    p.stormHitsLeft--;
    p.stormAimAngle += 0.85;
    AUDIO.playPunch(1.1);

    const radius = 150 * STATE.mods.h3AreaMult;
    const punchX = p.x + Math.cos(p.stormAimAngle) * (radius * 0.75);
    const punchY = p.y + Math.sin(p.stormAimAngle) * (radius * 0.75);

    STATE.slashEffects.push({
      x: p.x, y: p.y, angle: p.stormAimAngle, range: radius,
      color: '#F5C518', armColor: '#FFCC80', isRubberArm: true, followPlayer: true,
      life: 0.12, maxLife: 0.12, type: 'stretch'
    });
    spawnParticle(punchX, punchY, '#FFF59D', 4, 0.25);

    STATE.enemies.forEach(en => {
      if (en.hp <= 0) return;
      if (Math.hypot(en.x - p.x, en.y - p.y) - en.radius <= radius) {
        const { amount, isCrit } = calculatePlayerDamage(0.8, true);
        damageEnemy(en, amount, { isCrit, knockback: 40, sourceX: p.x, sourceY: p.y });
      }
    });
  }

  if (p.stormTimer <= 0) {
    p.stormTimer = 0;
    p.stormHitsLeft = 0;
    AUDIO.playExplosion(1.0);
  }
}

export function updateSanjiIfritBarrage(dt: number): void {
  const p = STATE.player;
  if (p.ifritShotsLeft <= 0) return;

  p.ifritTickTimer -= dt;
  if (p.ifritTickTimer <= 0) {
    p.ifritTickTimer = 0.18;
    p.ifritShotsLeft--;
    AUDIO.playKick();
    AUDIO.playFwoosh();

    const inRange = STATE.enemies
      .filter(en => en.hp > 0 && Math.hypot(en.x - p.x, en.y - p.y) <= 300)
      .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));

    let targetAng = p.facingAngle;
    if (inRange.length > 0) {
      const chosen = inRange[p.ifritCycleIndex % inRange.length];
      p.ifritCycleIndex++;
      targetAng = Math.atan2(chosen.y - p.y, chosen.x - p.x);
      p.facingAngle = targetAng;
    }

    const footX = p.x + Math.cos(targetAng) * 18;
    const footY = p.y + Math.sin(targetAng) * 18;
    spawnParticle(footX, footY, '#FF5722', 6, 0.35);

    STATE.projectiles.push({
      fromPlayer: true,
      x: footX,
      y: footY,
      vx: Math.cos(targetAng) * 600,
      vy: Math.sin(targetAng) * 600,
      curveSign: (p.ifritShotsLeft % 2 === 0 ? 1 : -1) * 180,
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

// Actualización de Damned Punk de Kid: Cañón electromagnético potenciado (6 ticks de 1.75x daño + leve screen shake constante)
export function updateKidDamnedPunk(dt: number): void {
  const p = STATE.player;
  if (p.damnedPunkTimer <= 0) return;

  p.damnedPunkTimer -= dt;
  p.damnedPunkTickTimer -= dt;
  triggerScreenShake(2.8, 0.08);

  if (!p.damnedPunkTarget || p.damnedPunkTarget.hp <= 0) {
    p.damnedPunkTarget = findNearestEnemy(480);
  }

  if (p.damnedPunkTarget && p.damnedPunkTarget.hp > 0) {
    p.damnedPunkAngle = Math.atan2(p.damnedPunkTarget.y - p.y, p.damnedPunkTarget.x - p.x);
    p.facingAngle = p.damnedPunkAngle;
  }

  if (p.damnedPunkTicksLeft > 0 && p.damnedPunkTickTimer <= 0) {
    p.damnedPunkTickTimer = 0.33;
    p.damnedPunkTicksLeft--;
    const isLastTick = p.damnedPunkTicksLeft === 0;
    AUDIO.playLaserCharge();
    triggerScreenShake(3.5, 0.10);

    const beamLen = 460;
    const endX = p.x + Math.cos(p.damnedPunkAngle) * beamLen;
    const endY = p.y + Math.sin(p.damnedPunkAngle) * beamLen;

    STATE.enemies.forEach(en => {
      if (en.hp <= 0) return;
      if (pointToSegmentDist(en.x, en.y, p.x, p.y, endX, endY) <= en.radius + 16) {
        const { amount, isCrit } = calculatePlayerDamage(1.75, true);
        damageEnemy(en, amount, {
          isCrit,
          pierceShield: true,
          applyBurn: isLastTick,
          burnDps: 4
        });
        spawnParticle(en.x, en.y, '#FFC107', 5, 0.3);
      }
    });
    if (isLastTick) AUDIO.playFireCrackle();
  }

  if (p.damnedPunkTimer <= 0) {
    p.damnedPunkTimer = 0;
    p.damnedPunkTicksLeft = 0;
    p.damnedPunkTarget = null;
  }
}

export function updateLuffyGatling(dt: number): void {
  const p = STATE.player;
  if (p.gatlingHitsLeft <= 0) return;

  p.gatlingTickTimer -= dt;
  if (p.gatlingTickTimer <= 0) {
    p.gatlingTickTimer = 0.06;
    p.gatlingHitsLeft--;
    AUDIO.playPunch();

    const aimAngle = getAimAngle();
    p.facingAngle = aimAngle;
    const spreadAngle = aimAngle + (Math.random() - 0.5) * 0.6;

    STATE.slashEffects.push({
      x: p.x, y: p.y, angle: spreadAngle, range: 180, color: '#F5C518',
      armColor: '#FFCC80', isRubberArm: true, followPlayer: true,
      life: 0.11, maxLife: 0.11, type: 'stretch'
    });

    STATE.enemies.forEach(en => {
      const dx = en.x - p.x, dy = en.y - p.y;
      if (Math.hypot(dx, dy) - en.radius <= 180 && Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= Math.PI / 3.5) {
        const { amount, isCrit } = calculatePlayerDamage(0.5, true);
        damageEnemy(en, amount, { isCrit, knockback: 18, sourceX: p.x, sourceY: p.y, applyBurn: STATE.mods.h1Burn });
      }
    });
  }
}

export function updateSanjiDiable(dt: number): void {
  const p = STATE.player;
  if (p.diableHitsLeft <= 0) return;

  p.diableTickTimer -= dt;
  if (p.diableTickTimer <= 0) {
    p.diableTickTimer = 0.055;
    p.diableHitsLeft--;
    const isLast = p.diableHitsLeft === 0;
    AUDIO.playKick();

    const aimAngle = getAimAngle();
    p.facingAngle = aimAngle;
    const spreadAngle = aimAngle + (Math.random() - 0.5) * (Math.PI / 2);

    STATE.slashEffects.push({
      x: p.x, y: p.y, angle: spreadAngle, range: 100, color: '#FF5722', life: 0.12, maxLife: 0.12, type: 'stretch'
    });
    spawnParticle(p.x + Math.cos(spreadAngle) * 60, p.y + Math.sin(spreadAngle) * 60, '#FF9800', 5, 0.35);

    STATE.enemies.forEach(en => {
      const dx = en.x - p.x, dy = en.y - p.y;
      if (Math.hypot(dx, dy) - en.radius <= 100 && Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= Math.PI / 4) {
        const { amount, isCrit } = calculatePlayerDamage(0.4, true);
        damageEnemy(en, amount, { isCrit, applyBurn: isLast });
      }
    });
  }
}

// ==========================================================================
// SISTEMA DE HABILIDADES V1.9: King Kong Gun, Red Hawk Gatling y Cadena de Shanks
// ==========================================================================
// Cancelación manual de Island Shaking H3 de Barbablanca
export function cancelWhitebeardQuakeZone(): void {
  const p = STATE.player;
  if (!p || STATE.charId !== 'whitebeard' || p.quakeZoneTimer <= 0) return;
  p.quakeZoneTimer = 0;
  p.quakeZoneDuration = 0;
  p.skillCds[2] = p.skillMaxCds[2]; // CD 20s inicia de inmediato al cancelar
  AUDIO.playExplosion(0.9);
  spawnFloatingText(p.x, p.y - 48, '🛑 ¡TERREMOTO CANCELADO!', '#FF5252', 1.2);
  const btnCancel = document.getElementById('btn-cancel-quake');
  if (btnCancel) btnCancel.style.display = 'none';
  abilitiesCallbacks.onUpdateCooldownUI();
}

export function releaseKingKongGun(): void {
  const p = STATE.player;
  if (!p.isChargingKKG) return;
  p.isChargingKKG = false;
  const charge = Math.min(2.5, p.kkgChargeTimer);
  p.kkgChargeTimer = 0;
  p.skillCds[2] = p.skillMaxCds[2]; // CD 18s inicia al lanzar el golpe

  // Daño +50%: 0s -> 4.5x; 1s -> 6.75x; 2s -> 9.0x; 2.5s -> 12.0x
  let dmgMult = 4.5;
  if (charge <= 1.0) {
    dmgMult = 4.5 + (charge / 1.0) * (6.75 - 4.5);
  } else if (charge <= 2.0) {
    dmgMult = 6.75 + ((charge - 1.0) / 1.0) * (9.0 - 6.75);
  } else {
    dmgMult = 9.0 + ((charge - 2.0) / 0.5) * (12.0 - 9.0);
  }

  const aimAngle = p.facingAngle;
  const impactX = p.x + Math.cos(aimAngle) * 90;
  const impactY = p.y + Math.sin(aimAngle) * 90;

  AUDIO.playExplosion(1.7);
  triggerScreenShake(12, 0.35); // Screen shake 12 px
  STATE.hitstopTimer = 0.15;   // Hit-stop 0.15 s

  // Grieta en el suelo durante 3s (área 300 px)
  STATE.hazards.push({
    x: impactX, y: impactY, angle: aimAngle, range: 300,
    life: 3.0, maxLife: 3.0, type: 'kkg_fissure'
  });

  // Impacto de pelota negra gigante con electricidad roja/negra
  STATE.slashEffects.push({
    x: impactX, y: impactY, angle: 0, range: 300, isCircular: true,
    color: '#111111', subColor: '#FF1744', life: 0.45, maxLife: 0.45, type: 'kkg_impact'
  });

  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    spawnParticle(impactX + Math.cos(a) * 95, impactY + Math.sin(a) * 95, k % 2 === 0 ? '#FF1744' : '#212121', 7.0, 0.50);
  }

  // Área 300 px (radio 1.5x)
  STATE.enemies.forEach(en => {
    if (en.hp <= 0) return;
    if (Math.hypot(en.x - impactX, en.y - impactY) <= 300 + en.radius) {
      const { amount, isCrit } = calculatePlayerDamage(dmgMult, true);
      damageEnemy(en, amount, {
        isCrit, stun: 2.0, knockback: 180, sourceX: impactX, sourceY: impactY,
        pierceShield: true, applyBurn: true, burnDps: 5
      });
    }
  });

  const chargePct = Math.round((charge / 2.5) * 100);
  spawnFloatingText(p.x, p.y - 56, `🦍 ¡KING KONG GUN (${dmgMult.toFixed(1)}×)! (${chargePct}%)`, '#FF1744', 1.5);
}

export function updatePTSGatling(dt: number): void {
  const p = STATE.player;
  if (!p.ptsGatlingHitsLeft || p.ptsGatlingHitsLeft <= 0) return;

  p.ptsGatlingTickTimer -= dt;
  if (p.ptsGatlingTickTimer <= 0) {
    const isRedHawk = p.ptsGatlingType === 'red_hawk_gatling';
    const g2Mult = (p.gear2ndTimer > 0 ? 0.80 : 1.0);
    p.ptsGatlingTickTimer = isRedHawk ? 0.08 : (0.25 * g2Mult); // Jet Gatling v1.9d: 4 golpes en 1.0s (0.80s con G2)
    p.ptsGatlingHitsLeft--;
    AUDIO.playPunch();

    let aimAngle = p.ptsGatlingAngle;
    const LUFFY_PTS_AIM_RANGE = 220;
    const LUFFY_PTS_AIM_HALF_ANGLE = (120 * Math.PI) / 180; // ±120°

    if (isRedHawk) {
      // Targeteo dinámico continuo (Red Hawk): sigue al enemigo más cercano vivo en 250 px
      const target = findNearestEnemy(250);
      if (target) {
        const targetAngle = Math.atan2(target.y - p.y, target.x - p.x);
        const diff = normalizeAngle(targetAngle - aimAngle);
        aimAngle += diff * 0.45; // Giro sutil hacia el target
        p.ptsGatlingAngle = aimAngle;
        p.facingAngle = aimAngle;
      }
    } else {
      // Jet Gatling v1.9d: Auto-aim por sub-golpe con retargeting
      // En cada sub-golpe, buscar enemigo vivo en radio 220px y cono ±120°
      const target = findNearestEnemyInCone(LUFFY_PTS_AIM_RANGE, aimAngle, LUFFY_PTS_AIM_HALF_ANGLE);
      if (target) {
        aimAngle = Math.atan2(target.y - p.y, target.x - p.x);
        p.ptsGatlingAngle = aimAngle;
        p.facingAngle = aimAngle;
      }
      // Si no hay objetivo, mantener dirección actual (joystick/facing)
    }

    const spread = aimAngle + (Math.random() - 0.5) * (isRedHawk ? 1.2 : 0.55);
    const range = isRedHawk ? 220 : 180;
    // Jet Gatling v1.9d: 0.9x por sub-golpe (4 golpes = 3.6x total ≈ 4x Jet Pistol). Red Hawk mantiene 0.20x (15 golpes = 3.0x).
    const dmgMult = isRedHawk ? 0.20 : 0.90;
    const coneHalfAngle = isRedHawk ? (70 * Math.PI) / 180 : (Math.PI / 6); // 140° vs 60°

    STATE.slashEffects.push({
      x: p.x, y: p.y, angle: spread, range: range,
      color: isRedHawk ? '#D50000' : '#212121', armColor: '#FFCC80',
      isRubberArm: true, hakiArm: true, isRedHawk, followPlayer: true,
      life: 0.12, maxLife: 0.12, type: 'stretch'
    });
    if (isRedHawk) {
      spawnParticle(p.x + Math.cos(spread) * 80, p.y + Math.sin(spread) * 80, Math.random() < 0.5 ? '#FF1744' : '#FF9100', 4.5, 0.25);
    }

    STATE.enemies.forEach(en => {
      if (en.hp <= 0) return;
      const dx = en.x - p.x, dy = en.y - p.y;
      if (Math.hypot(dx, dy) - en.radius <= range && Math.abs(normalizeAngle(Math.atan2(dy, dx) - aimAngle)) <= coneHalfAngle) {
        const { amount, isCrit } = calculatePlayerDamage(dmgMult, isRedHawk);
        damageEnemy(en, amount, {
          isCrit, knockback: 15, sourceX: p.x, sourceY: p.y,
          applyBurn: isRedHawk, burnDps: 5, pierceShield: isRedHawk
        });
      }
    });

    // Remate automático de Red Hawk Gatling al vaciarse los golpes (Área 300 px, 5.5x daño, empuje 150 px, shake 10 px, hit-stop 0.12s)
    if (p.ptsGatlingHitsLeft === 0 && isRedHawk) {
      const impactX = p.x + Math.cos(aimAngle) * 110;
      const impactY = p.y + Math.sin(aimAngle) * 110;
      AUDIO.playExplosion(1.5);
      triggerScreenShake(10, 0.25);
      STATE.hitstopTimer = 0.12;
      STATE.slashEffects.push({
        x: impactX, y: impactY, angle: aimAngle, range: 300, isCircular: true,
        color: '#212121', subColor: '#FF5722', life: 0.38, maxLife: 0.38, type: 'red_hawk_explosion'
      });
      for (let k = 0; k < 28; k++) {
        const a = (k / 28) * Math.PI * 2;
        const c = k % 3 === 0 ? '#FFEB3B' : (k % 3 === 1 ? '#FF5722' : '#212121');
        spawnParticle(impactX + Math.cos(a) * 85, impactY + Math.sin(a) * 85, c, 6.2, 0.48);
      }
      STATE.enemies.forEach(en => {
        if (en.hp <= 0) return;
        if (Math.hypot(en.x - impactX, en.y - impactY) <= 300 + en.radius) {
          const { amount, isCrit } = calculatePlayerDamage(5.5, true);
          damageEnemy(en, amount, {
            isCrit, knockback: 150, sourceX: impactX, sourceY: impactY, pierceShield: true, applyBurn: true, burnDps: 5
          });
        }
      });
      spawnFloatingText(impactX, impactY - 44, '🔥 ¡RED HAWK FINISHER (300px)!', '#FF5722', 1.45);
    }
  }
}

export function updateShanksChainUI(): void {
  if (STATE.charId !== 'shanks') return;
  const p = STATE.player;
  const btn = document.getElementById('btn-h2');
  const lbl = document.getElementById('lbl-h2');
  const icon = document.getElementById('icon-h2');
  if (!btn || !lbl || !icon) return;
  if (p.shanksChainStep && p.shanksChainStep > 0) {
    btn.classList.add('chain-active');
    lbl.textContent = `CHAIN (${p.shanksChainStep}/5)`;
    icon.textContent = '⚡';
  } else {
    btn.classList.remove('chain-active');
    lbl.textContent = 'Divine Departure';
    icon.textContent = '🗡️';
  }
}

export function addShanksHaki(amt = 10): void {
  if (STATE.charId !== 'shanks') return;
  const p = STATE.player;
  p.shanksHaki = Math.max(0, Math.min(100, (p.shanksHaki || 0) + amt));
  abilitiesCallbacks.onUpdateShanksHakiHUD();
}

export function addWhitebeardEnergy(amt = 8): void {
  if (STATE.charId !== 'whitebeard') return;
  const p = STATE.player;
  p.whitebeardEnergy = Math.max(0, Math.min(100, (p.whitebeardEnergy || 0) + amt));
  abilitiesCallbacks.onUpdateWhitebeardQuakeHUD();
}

export function addLuffyG2(amt: number): void {
  if (STATE.charId !== 'luffy_pts') return;
  const p = STATE.player;
  p.luffyG2 = Math.max(0, Math.min(100, (p.luffyG2 || 0) + amt));
  abilitiesCallbacks.onUpdateLuffyG2HUD();
}
