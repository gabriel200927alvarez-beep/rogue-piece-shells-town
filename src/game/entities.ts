// ============================================================================
// 5. ENTIDADES, ENEMIGOS, JEFE ALVIDA, OLEADAS, PROYECTILES E IA ENEMIGA
// ============================================================================

import { CONFIG } from './config';
import { STATE } from './state';
import { AUDIO, triggerHaptic } from './audio';
import { triggerScreenShake } from './camera';
import {
  normalizeAngle,
  calculatePlayerDamage,
  spawnParticle,
  spawnFloatingText
} from './physics';

export interface EntitiesCallbacks {
  onGainLegendResource: (charId: 'shanks' | 'whitebeard' | 'luffy_pts', amount: number) => void;
  onUpdateBossHUD: (boss: any) => void;
  onUpdateWaveHUD: () => void;
  onUpdateShanksChainUI: () => void;
  onUpdatePlayerHUD: () => void;
  onTriggerGameOver: () => void;
  onDamageEnemiesInCircle: (
    cx: number,
    cy: number,
    radius: number,
    dmgMult: number,
    knockback: number,
    isSkill?: boolean,
    stunDur?: number
  ) => boolean;
}

let entitiesCallbacks: EntitiesCallbacks = {
  onGainLegendResource: () => {},
  onUpdateBossHUD: () => {},
  onUpdateWaveHUD: () => {},
  onUpdateShanksChainUI: () => {},
  onUpdatePlayerHUD: () => {},
  onTriggerGameOver: () => {},
  onDamageEnemiesInCircle: () => false
};

export function initEntities(callbacks: EntitiesCallbacks): void {
  entitiesCallbacks = callbacks;
}

export function createEnemy(type: string, wave: number, x: number, y: number): any {
  const wScale = wave - 1;
  const baseStatuses = {
    vx: 0,
    vy: 0,
    facing: Math.PI,
    flashTimer: 0,
    stunTimer: 0,
    rootTimer: 0,
    bleedTimer: 0,
    bleedTick: 0,
    burnTimer: 0,
    burnTick: 0,
    burnDps: 5,
    clutchTimer: 0,
    clutchTick: 0,
    inSmoke: false,
    inLawRoom: false,
    armorDebuffTimer: 0,
    lawShamblesDebuffTimer: 0,
    magnetPullTimer: 0,
    magnetPullSpeed: 0,
    killerBleedStacks: 0,
    killerBleedTimer: 0,
    killerBleedTick: 0,
    hitSquashTimer: 0,
    hitSquashMax: 0.12,
    hitAngle: 0,
    isFemale: false,
    isBoss: false
  };

  if (type === 'basic') {
    return {
      ...baseStatuses,
      type,
      name: 'Recluta',
      x,
      y,
      radius: 18,
      hp: Math.round(35 * (1 + 0.2 * wScale)),
      maxHp: Math.round(35 * (1 + 0.2 * wScale)),
      damage: 8 * (1 + 0.1 * wScale) * 0.85,
      armor: 0,
      speed: 125,
      attackRange: 44,
      attackCd: 1.6,
      attackTimer: 0.7,
      telegraphTimer: 0,
      telegraphDuration: 0.4,
      telegraphAngle: Math.PI,
      isBlunt: false,
      berries: 1
    };
  } else if (type === 'shooter') {
    return {
      ...baseStatuses,
      type,
      name: 'Tirador',
      x,
      y,
      radius: 17,
      hp: Math.round(25 * (1 + 0.2 * wScale)),
      maxHp: Math.round(25 * (1 + 0.2 * wScale)),
      damage: 6 * (1 + 0.1 * wScale) * 0.85,
      armor: 0,
      speed: 95,
      attackRange: 270,
      attackCd: 2.0,
      attackTimer: 1.2,
      telegraphTimer: 0,
      telegraphDuration: 0.4,
      telegraphAngle: Math.PI,
      isBlunt: false,
      berries: 2
    };
  } else if (type === 'shield') {
    return {
      ...baseStatuses,
      type,
      name: 'Escudero',
      x,
      y,
      radius: 20,
      hp: Math.round(80 * (1 + 0.25 * wScale)),
      maxHp: Math.round(80 * (1 + 0.25 * wScale)),
      damage: 10 * (1 + 0.1 * wScale) * 0.85,
      armor: 12,
      speed: 75,
      attackRange: 40,
      attackCd: 2.2,
      attackTimer: 1.0,
      telegraphTimer: 0,
      telegraphDuration: 0.4,
      telegraphAngle: Math.PI,
      hasShield: true,
      shieldHp: 80,
      shieldBroken: false,
      shieldExposedTimer: 0,
      exposedBonusDmgTimer: 0,
      isBlunt: true,
      berries: 2
    };
  } else if (type === 'officer') {
    return {
      ...baseStatuses,
      type,
      name: 'Oficial',
      x,
      y,
      radius: 23,
      hp: Math.round(120 * (1 + 0.3 * wScale)),
      maxHp: Math.round(120 * (1 + 0.3 * wScale)),
      damage: 15 * (1 + 0.15 * wScale) * 0.85,
      armor: 25,
      speed: 90,
      attackRange: 55,
      attackCd: 3.0,
      attackTimer: 1.4,
      telegraphTimer: 0,
      telegraphDuration: 0.4,
      telegraphAngle: Math.PI,
      isBlunt: true,
      berries: 3
    };
  } else if (type === 'alvida') {
    return {
      ...baseStatuses,
      type: 'alvida',
      name: 'ALVIDA',
      isBoss: true,
      isFemale: true,
      x,
      y,
      radius: 36,
      hp: 600,
      maxHp: 600,
      damage: 22,
      boomerangDamage: 18,
      slideDamage: 13,
      armor: 30,
      speed: 105,
      phase: 1,
      phase2Reinforced: false,
      aiState: 'idle',
      stateTimer: 1.0,
      telegraphType: 'melee',
      telegraphAngle: Math.PI,
      telegraphMaxTimer: 0.60,
      isBlunt: true,
      berries: 25
    };
  }
  return null;
}

export function breakEscuderoShield(en: any): void {
  en.hasShield = false;
  en.shieldBroken = true;
  en.stunTimer = 1.0;
  en.exposedBonusDmgTimer = 2.0;
  AUDIO.playExplosion(1.3);
  spawnFloatingText(en.x, en.y - 44, '💥 ¡ESCUDO ROTO!', '#4FC3F7', 1.15);
  for (let k = 0; k < 14; k++) {
    spawnParticle(en.x, en.y, '#29B6F6', 6, 0.45);
  }
}

export function onBossPhaseChange(boss: any, label: string): void {
  triggerScreenShake(8, 0.35);
  triggerHaptic([60, 40, 60]);
  spawnFloatingText(boss.x, boss.y - 55, label, '#FF5252', 1.35);
  const bossHud = document.getElementById('boss-hud');
  if (bossHud) {
    bossHud.classList.remove('boss-pulse');
    void bossHud.offsetWidth;
    bossHud.classList.add('boss-pulse');
  }

  for (let i = 0; i < 20; i++) {
    spawnParticle(boss.x, boss.y, '#C8102E', 7, 0.55);
  }
}

export function onEnemyKilled(en: any): void {
  STATE.killsRun++;
  STATE.waveEnemiesRemaining = Math.max(0, STATE.waveEnemiesRemaining - 1);
  entitiesCallbacks.onUpdateWaveHUD();

  // Recursos de Legendarios al matar enemigos (se mantienen entre oleadas)
  let resGain = 8;
  if (en.isBoss || en.type === 'alvida') resGain = 30;
  else if (en.type === 'officer') resGain = 15;
  else if (en.type === 'shield') resGain = 12;
  else if (en.type === 'shooter') resGain = 6;
  else resGain = 8;

  if (STATE.charId === 'shanks') {
    entitiesCallbacks.onGainLegendResource('shanks', resGain);
  } else if (STATE.charId === 'whitebeard') {
    entitiesCallbacks.onGainLegendResource('whitebeard', resGain);
  } else if (STATE.charId === 'luffy_pts') {
    entitiesCallbacks.onGainLegendResource('luffy_pts', resGain);
  }

  for (let i = 0; i < 12; i++) {
    spawnParticle(en.x, en.y, en.isBoss ? '#F5C518' : '#E0E0E0', 5, 0.4);
  }

  const totalBerries = en.berries + STATE.mods.bonusBerries;
  for (let b = 0; b < totalBerries; b++) {
    STATE.berriesDrops.push({
      x: en.x + (Math.random() - 0.5) * 24,
      y: en.y + (Math.random() - 0.5) * 24,
      vx: (Math.random() - 0.5) * 90,
      vy: (Math.random() - 0.5) * 90,
      value: 1
    });
  }
}

export function damageEnemy(en: any, rawDamage: number, opts: Record<string, any> = {}): void {
  if (en.hp <= 0) return;

  const hitAng = Math.atan2(
    en.y - (opts.sourceY ?? STATE.player.y),
    en.x - (opts.sourceX ?? STATE.player.x)
  );
  let finalDmg = rawDamage;

  // Mitigación de armadura enemiga con soporte para penetración de Law/Killer
  let effectiveArmor = en.armor || 0;
  if (en.armorDebuffTimer > 0) effectiveArmor *= 0.80;
  let ignorePct = opts.ignoreArmorPct || 0;
  if (STATE.charId === 'law' && ignorePct < 1.0) {
    ignorePct = Math.max(ignorePct, 0.20); // Pasiva Ope Ope no Mi: ignora 20% armadura
  } else if (STATE.charId === 'whitebeard' && ignorePct < 1.0) {
    ignorePct = Math.max(ignorePct, 0.30); // Pasiva Gura Gura no Mi: ignora 30% armadura
  }
  effectiveArmor *= 1 - Math.min(1, ignorePct);
  if (effectiveArmor > 0) {
    finalDmg = Math.max(1, Math.round(finalDmg * (100 / (100 + effectiveArmor))));
  }

  // Killer Frenzy: penetra todos los escudos
  const bypassShield =
    opts.pierceShield || (STATE.charId === 'killer' && STATE.player.killerFrenzyTimer > 0);

  if (en.type === 'shield' && en.hasShield && !en.shieldBroken && !bypassShield) {
    const isExposed = en.shieldExposedTimer > 0;
    const angleFromEnemyToPlayer = Math.atan2(STATE.player.y - en.y, STATE.player.x - en.x);
    const isFront = Math.abs(normalizeAngle(angleFromEnemyToPlayer - en.facing)) < Math.PI * 0.45;

    if (!isExposed && isFront) {
      if (opts.isNormalAttack) {
        en.shieldHp -= finalDmg;
        en.flashTimer = 0.08;
        en.hitSquashTimer = 0.09;
        en.hitSquashMax = 0.09;
        en.hitAngle = hitAng;
        for (let s = 0; s < 3; s++) {
          const sAng = hitAng + Math.PI + (Math.random() - 0.5) * 1.4;
          const sSpd = 140 + Math.random() * 140;
          spawnParticle(
            en.x + Math.cos(en.facing) * en.radius,
            en.y + Math.sin(en.facing) * en.radius,
            '#90CAF9',
            3.5,
            0.2,
            {
              shape: 'spark',
              vx: Math.cos(sAng) * sSpd,
              vy: Math.sin(sAng) * sSpd
            }
          );
        }
        spawnFloatingText(
          en.x,
          en.y - 36,
          `🛡️ Escudo (${Math.max(0, Math.ceil(en.shieldHp))})`,
          '#90CAF9',
          0.8
        );
        if (en.shieldHp <= 0) {
          breakEscuderoShield(en);
        }
        return;
      }
      finalDmg = Math.max(1, Math.round(finalDmg * 0.5));
      spawnFloatingText(en.x, en.y - 36, '🛡️ -50%', '#90CAF9', 0.8);
    }
  }

  // Shambles de Law: enemigos inmovilizados por Shambles reciben 1.5x daño de Law
  if (STATE.charId === 'law' && en.lawShamblesDebuffTimer > 0) {
    finalDmg = Math.round(finalDmg * 1.5);
  }

  // Pasiva de Shanks: Enemigos aturdidos reciben +20% daño de Shanks
  if (STATE.charId === 'shanks' && en.stunTimer > 0) {
    finalDmg = Math.round(finalDmg * 1.20);
  }

  if (en.exposedBonusDmgTimer > 0) {
    finalDmg = Math.round(finalDmg * 1.5);
  }

  en.hp -= finalDmg;
  en.flashTimer = 0.08;
  en.hitSquashTimer = 0.12;
  en.hitSquashMax = 0.12;
  en.hitAngle = hitAng;

  if (STATE.charId === 'shanks') {
    entitiesCallbacks.onGainLegendResource('shanks', 10);
  } else if (STATE.charId === 'whitebeard') {
    entitiesCallbacks.onGainLegendResource('whitebeard', 8);
  }
  AUDIO.playHit();

  spawnFloatingText(
    en.x + (Math.random() - 0.5) * 16,
    en.y - en.radius - 8,
    opts.isCrit ? `${finalDmg}!` : `${finalDmg}`,
    opts.isCrit ? '#F5C518' : '#FFFFFF',
    opts.isCrit ? 1.25 : 1.0,
    { isCrit: Boolean(opts.isCrit) }
  );

  const pCount = STATE.enemies.length > 8 ? 4 : 6;
  const sparkColor = opts.isCrit ? '#F5C518' : '#FFE082';
  for (let i = 0; i < pCount; i++) {
    const sAng = hitAng + (Math.random() - 0.5) * 1.65;
    const sSpd = 150 + Math.random() * 190;
    spawnParticle(en.x, en.y, i === 0 ? '#FFFFFF' : sparkColor, opts.isCrit ? 4.5 : 3.5, 0.22, {
      shape: 'spark',
      vx: Math.cos(sAng) * sSpd,
      vy: Math.sin(sAng) * sSpd
    });
  }
  if (STATE.slashEffects.length < 75) {
    STATE.slashEffects.push({
      x: en.x - Math.cos(hitAng) * (en.radius * 0.45),
      y: en.y - Math.sin(hitAng) * (en.radius * 0.45),
      angle: hitAng,
      range: opts.isCrit ? 26 : 19,
      color: opts.isCrit ? '#F5C518' : '#FFFFFF',
      life: 0.11,
      maxLife: 0.11,
      type: 'impact_flare'
    });
  }

  if (opts.knockback && !en.isBoss) {
    const ang = Math.atan2(
      en.y - (opts.sourceY ?? STATE.player.y),
      en.x - (opts.sourceX ?? STATE.player.x)
    );
    en.vx += Math.cos(ang) * opts.knockback * 3.5;
    en.vy += Math.sin(ang) * opts.knockback * 3.5;
  }

  if (opts.armorDebuffTimer) {
    en.armorDebuffTimer = Math.max(en.armorDebuffTimer || 0, opts.armorDebuffTimer);
  }

  if (opts.stun && !en.isBoss) {
    en.stunTimer = Math.max(en.stunTimer, opts.stun);
    spawnFloatingText(en.x, en.y - 42, '💫 ATURDIDO', '#FFEB3B', 0.85);
  }
  if (opts.root) {
    en.rootTimer = Math.max(en.rootTimer, opts.root);
    spawnFloatingText(en.x, en.y - 42, '🌸 INMOVILIZADO', '#CE93D8', 0.85);
  }
  if (opts.clutchDot) {
    en.clutchTimer = opts.clutchDot;
    en.clutchTick = 0.5;
  }
  if (opts.applyBleed) {
    en.bleedTimer = 3.0;
    en.bleedTick = 0.5;
  }
  if (opts.applyBurn) {
    en.burnTimer = 3.0;
    en.burnTick = 0.5;
    en.burnDps = opts.burnDps || 5;
  }

  if (en.isBoss) {
    entitiesCallbacks.onUpdateBossHUD(en);
    const hpRatio = en.hp / en.maxHp;
    if (en.phase === 1 && hpRatio <= 0.60) {
      en.phase = 2;
      onBossPhaseChange(en, '¡FASE 2: MAZA BOOMERANG!');

      if (!en.phase2Reinforced) {
        en.phase2Reinforced = true;
        spawnFloatingText(en.x, en.y - 82, '«¡No me dejéis sola, inútiles!»', '#FFD54F', 1.05);
        STATE.enemies.push(createEnemy('basic', STATE.wave, en.x - 55, en.y + 40));
        STATE.enemies.push(createEnemy('basic', STATE.wave, en.x + 55, en.y + 40));
        STATE.waveEnemiesRemaining += 2;
        entitiesCallbacks.onUpdateWaveHUD();
      }
    } else if (en.phase === 2 && hpRatio <= 0.30) {
      en.phase = 3;
      onBossPhaseChange(en, '¡FASE 3: FURIA DESLIZANTE!');
    }
  }

  if (en.hp <= 0) {
    onEnemyKilled(en);
  }
}

export function damagePlayer(incomingDmg: number, isBlunt = false, attacker: any = null): void {
  const p = STATE.player;
  if (p.invulnTimer > 0 || STATE.screen !== 'playing') return;

  // Shanks: Future Sight (H3) - Inmunidad total y esquiva lateral
  if (STATE.charId === 'shanks' && p.futureSightTimer > 0) {
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
    STATE.afterimages.push({ x: origX, y: origY, color: '#FF1744', life: 0.20, maxLife: 0.20 });
    spawnFloatingText(p.x, p.y - 34, 'MISS', '#FF1744', 1.15);
    AUDIO.playDash();
    return;
  }

  // Shanks: si recibe daño mientras ejecuta la cadena de H2, la cadena se rompe
  if (STATE.charId === 'shanks' && p.shanksChainStep > 0) {
    p.shanksChainStep = 0;
    p.shanksChainTimer = 0;
    p.skillCds[1] = p.skillMaxCds[1]; // Inicia CD 10s inmediatamente
    spawnFloatingText(p.x, p.y - 48, '💔 CHAIN BROKEN', '#FF5252', 1.25);
    entitiesCallbacks.onUpdateShanksChainUI();
  }

  // Luffy PTS: Interrupción de carga King Kong Gun fuera de Gear 2nd
  if (STATE.charId === 'luffy_pts' && p.isChargingKKG) {
    if (p.gear2ndTimer > 0) {
      // Durante Gear 2nd: la carga NO se interrumpe (escudo de Haki activo)
      spawnFloatingText(p.x, p.y - 42, '🛡️ UNSTOPPABLE HAKI!', '#FF1744', 1.15);
    } else {
      // Fuera de Gear 2nd: la carga se interrumpe al recibir daño
      p.isChargingKKG = false;
      p.kkgChargeTimer = 0;
      p.skillCds[2] = p.skillMaxCds[2]; // Entra en CD
      spawnFloatingText(p.x, p.y - 48, '💔 KKG CANCELLED', '#FF5252', 1.25);
    }
  }

  if (attacker && attacker.inSmoke && Math.random() < 0.50) {
    spawnFloatingText(p.x, p.y - 34, '💨 ¡FALLO!', '#CFD8DC', 0.9);
    return;
  }

  STATE.timeSinceLastCombat = 0;
  let dmg = incomingDmg;

  if (STATE.charId === 'luffy' && isBlunt) {
    dmg *= 0.80;
  }

  // Barbablanca en H3 (Gura Gura Zone): mitiga el 50% del daño recibido
  if (STATE.charId === 'whitebeard' && p.quakeZoneTimer > 0) {
    dmg *= 0.50;
  }

  // Luffy PTS en Gear 2nd (H2): escudo que reduce el 25% del daño recibido
  if (STATE.charId === 'luffy_pts' && p.gear2ndTimer > 0) {
    dmg *= 0.75;
  }

  dmg = Math.max(1, Math.round(dmg * (100 / (100 + p.armor))));

  p.hp = Math.max(0, p.hp - dmg);
  if (p.superArmorTimer <= 0) {
    p.invulnTimer = 0.45;
  } else {
    p.invulnTimer = 0.20;
  }
  AUDIO.playBossHit();

  spawnFloatingText(p.x, p.y - 32, `-${dmg}`, '#FF5252', 1.15);
  triggerScreenShake(5, 0.14);
  triggerHaptic(40);
  entitiesCallbacks.onUpdatePlayerHUD();

  if (p.hp <= 0) {
    entitiesCallbacks.onTriggerGameOver();
  }
}

export function getWaveComposition(w: number): string[] {
  if (w === 5) {
    return ['basic', 'shooter', 'shield', 'officer', 'basic', 'shooter', 'alvida'];
  }
  const total = Math.round((3 + 2 * w) * 1.5);
  const list: string[] = [];
  for (let i = 0; i < total; i++) {
    if (w === 1) {
      list.push(i % 4 === 3 ? 'shooter' : 'basic');
    } else if (w === 2) {
      if (i % 5 === 0) list.push('shield');
      else if (i % 3 === 0) list.push('shooter');
      else list.push('basic');
    } else if (w === 3) {
      if (i % 5 === 0) list.push('officer');
      else if (i % 3 === 0) list.push('shield');
      else if (i % 2 === 0) list.push('shooter');
      else list.push('basic');
    } else {
      if (i % 4 === 0) list.push('officer');
      else if (i % 4 === 1) list.push('shield');
      else if (i % 4 === 2) list.push('shooter');
      else list.push('basic');
    }
  }
  return list;
}

export function startWave(w: number): void {
  STATE.wave = w;
  const comp = getWaveComposition(w);
  STATE.waveSpawnQueue = [...comp];
  STATE.waveTotalEnemies = comp.length;
  STATE.waveEnemiesRemaining = comp.length;
  STATE.waveSpawnTimer = 0.25;
  STATE.waveClearPending = false;
  STATE.waveClearDelayTimer = 0;

  const bossHud = document.getElementById('boss-hud');
  const bossHpFill = document.getElementById('boss-hp-fill');
  if (w === 5) {
    if (bossHud) bossHud.style.display = 'flex';
    if (bossHpFill) bossHpFill.style.width = '100%';
  } else {
    if (bossHud) bossHud.style.display = 'none';
  }

  entitiesCallbacks.onUpdateWaveHUD();
  spawnFloatingText(
    STATE.player.x,
    STATE.player.y - 70,
    w === 5 ? '¡ALVIDA TE ESPERA EN EL CENTRO!' : `OLEADA ${w}`,
    '#F5C518',
    1.45
  );
}

export function spawnNextEnemyFromQueue(): void {
  if (STATE.waveSpawnQueue.length === 0) return;
  const type = STATE.waveSpawnQueue.shift();

  if (type === 'alvida') {
    const bx = CONFIG.WORLD_WIDTH / 2;
    const by = CONFIG.WORLD_HEIGHT / 2;
    STATE.enemies.push(createEnemy('alvida', STATE.wave, bx, by));
    return;
  }

  const p = STATE.player;
  const angle = Math.random() * Math.PI * 2;
  const dist = 420 + Math.random() * 180;
  const x = Math.max(
    CONFIG.ARENA_MARGIN_X + 30,
    Math.min(CONFIG.WORLD_WIDTH - CONFIG.ARENA_MARGIN_X - 30, p.x + Math.cos(angle) * dist)
  );
  const y = Math.max(
    CONFIG.ARENA_MARGIN_Y + 30,
    Math.min(CONFIG.WORLD_HEIGHT - CONFIG.ARENA_MARGIN_Y - 30, p.y + Math.sin(angle) * dist)
  );

  STATE.enemies.push(createEnemy(type, STATE.wave, x, y));
}

export function executeMeleeMarineStrike(
  en: any,
  angle: number,
  range: number,
  halfAngle: number,
  isBlunt: boolean
): void {
  const p = STATE.player;
  en.flashTimer = 0.10;
  AUDIO.playSlash(0.8);

  STATE.slashEffects.push({
    x: en.x,
    y: en.y,
    angle: angle,
    range: range,
    halfAngle: halfAngle,
    color: '#FFFFFF',
    life: 0.15,
    maxLife: 0.15,
    type: 'marine_saber_arc'
  });

  if (
    Math.hypot(p.x - en.x, p.y - en.y) - p.radius <= range &&
    Math.abs(normalizeAngle(Math.atan2(p.y - en.y, p.x - en.x) - angle)) <= halfAngle
  ) {
    damagePlayer(en.damage, isBlunt, en);
  }
}

export function updateMarineAI(
  en: any,
  dt: number,
  dist: number,
  angleToPlayer: number,
  speedMult: number
): void {
  const p = STATE.player;
  const roomAtkSlow = en.inLawRoom ? 0.70 : 1.0;

  if (en.telegraphTimer > 0) {
    en.telegraphTimer -= dt * roomAtkSlow;
    if (en.telegraphTimer <= 0) {
      if (en.type === 'shooter') {
        AUDIO.playPunch(1.3);
        STATE.projectiles.push({
          fromPlayer: false,
          owner: en,
          x: en.x + Math.cos(en.telegraphAngle) * 18,
          y: en.y + Math.sin(en.telegraphAngle) * 18,
          vx: Math.cos(en.telegraphAngle) * 320,
          vy: Math.sin(en.telegraphAngle) * 320,
          radius: 5,
          damage: en.damage,
          life: 2.2,
          color: '#FFD54F',
          type: 'bullet'
        });
      } else {
        if (en.type === 'shield') {
          en.shieldExposedTimer = 1.2;
        }
        const halfAng = en.type === 'officer' ? Math.PI / 3 : Math.PI / 3.5;
        executeMeleeMarineStrike(en, en.telegraphAngle, en.attackRange, halfAng, en.isBlunt);
      }
    }
    return;
  }

  if (en.type === 'shooter') {
    if (dist > 280) {
      en.x += Math.cos(angleToPlayer) * en.speed * speedMult * dt;
      en.y += Math.sin(angleToPlayer) * en.speed * speedMult * dt;
    } else if (dist < 180) {
      en.x -= Math.cos(angleToPlayer) * en.speed * 0.8 * speedMult * dt;
      en.y -= Math.sin(angleToPlayer) * en.speed * 0.8 * speedMult * dt;
    }
    en.attackTimer -= dt * roomAtkSlow;
    if (en.attackTimer <= 0 && dist <= 320) {
      en.attackTimer = en.attackCd;
      en.telegraphDuration = 0.4;
      en.telegraphTimer = 0.4;
      en.telegraphAngle = angleToPlayer;
    }
  } else {
    if (dist > en.attackRange - 6) {
      en.x += Math.cos(angleToPlayer) * en.speed * speedMult * dt;
      en.y += Math.sin(angleToPlayer) * en.speed * speedMult * dt;
    }
    en.attackTimer -= dt * roomAtkSlow;
    if (en.attackTimer <= 0 && dist <= en.attackRange + p.radius + 8) {
      en.attackTimer = en.attackCd;
      en.telegraphDuration = 0.4;
      en.telegraphTimer = 0.4;
      en.telegraphAngle = angleToPlayer;
    }
  }
}

export function updateAlvidaAI(
  boss: any,
  dt: number,
  dist: number,
  angleToPlayer: number,
  speedMult = 1.0
): void {
  const p = STATE.player;
  const roomSlow = boss.inLawRoom ? 0.70 : 1.0;
  const atkSpeedMult = (boss.phase === 3 ? 1.30 : 1.0) * roomSlow;
  boss.stateTimer -= dt * atkSpeedMult;

  if (boss.aiState === 'idle') {
    boss.facing = angleToPlayer;
    if (dist > 80) {
      boss.x += Math.cos(angleToPlayer) * boss.speed * speedMult * dt;
      boss.y += Math.sin(angleToPlayer) * boss.speed * speedMult * dt;
    }
    if (boss.stateTimer <= 0) {
      boss.aiState = 'telegraph';
      boss.stateTimer = 0.60;
      boss.telegraphMaxTimer = 0.60;
      boss.telegraphAngle = angleToPlayer;

      if (boss.phase === 1) {
        boss.telegraphType = 'melee';
      } else if (boss.phase === 2) {
        boss.telegraphType = Math.random() < 0.55 ? 'boomerang' : 'slide';
      } else {
        const r = Math.random();
        boss.telegraphType = r < 0.4 ? 'slide' : r < 0.75 ? 'boomerang' : 'melee';
      }
    }
  } else if (boss.aiState === 'telegraph') {
    if (boss.stateTimer <= 0) {
      boss.aiState = 'attack';
      boss.flashTimer = 0.10;

      if (boss.telegraphType === 'melee') {
        AUDIO.playBossHit();
        triggerScreenShake(6, 0.15);
        STATE.slashEffects.push({
          x: boss.x,
          y: boss.y,
          angle: boss.telegraphAngle,
          range: 70,
          halfAngle: Math.PI / 2.2,
          color: '#FFA726',
          life: 0.22,
          maxLife: 0.22,
          type: 'arc'
        });
        if (
          Math.hypot(p.x - boss.x, p.y - boss.y) - p.radius <= 70 &&
          Math.abs(normalizeAngle(Math.atan2(p.y - boss.y, p.x - boss.x) - boss.telegraphAngle)) <=
            Math.PI / 2.2
        ) {
          damagePlayer(boss.damage, true, boss);
        }
        boss.stateTimer = 0.45;
      } else if (boss.telegraphType === 'boomerang') {
        AUDIO.playSlash(1.2);
        STATE.projectiles.push({
          fromPlayer: false,
          x: boss.x + Math.cos(boss.telegraphAngle) * 40,
          y: boss.y + Math.sin(boss.telegraphAngle) * 40,
          vx: Math.cos(boss.telegraphAngle) * 430,
          vy: Math.sin(boss.telegraphAngle) * 430,
          radius: 24,
          damage: boss.boomerangDamage,
          life: 2.4,
          maxLife: 2.4,
          owner: boss,
          returning: false,
          type: 'mace_boomerang'
        });
        boss.stateTimer = 0.75;
      } else if (boss.telegraphType === 'slide') {
        AUDIO.playBossHit();
        boss.slideDirX = Math.cos(boss.telegraphAngle);
        boss.slideDirY = Math.sin(boss.telegraphAngle);
        boss.stateTimer = 0.35;
      }
    }
  } else if (boss.aiState === 'attack') {
    if (boss.telegraphType === 'slide') {
      boss.x += boss.slideDirX * 480 * speedMult * dt;
      boss.y += boss.slideDirY * 480 * speedMult * dt;

      if (boss.phase === 3 && Math.random() < 0.45) {
        STATE.hazards.push({
          x: boss.x,
          y: boss.y,
          radius: 42,
          life: 3.5,
          type: 'alvida_slow'
        });
      }

      if (Math.hypot(p.x - boss.x, p.y - boss.y) <= boss.radius + p.radius) {
        damagePlayer(boss.slideDamage, true, boss);
        p.x += boss.slideDirX * 45;
        p.y += boss.slideDirY * 45;
      }
    }
    if (boss.stateTimer <= 0) {
      boss.aiState = 'reposition';
      boss.stateTimer = boss.phase === 3 ? 0.5 : 0.7;
    }
  } else if (boss.aiState === 'reposition') {
    const perpAngle = angleToPlayer + Math.PI / 2;
    boss.x += Math.cos(perpAngle) * boss.speed * 0.9 * speedMult * dt;
    boss.y += Math.sin(perpAngle) * boss.speed * 0.9 * speedMult * dt;
    if (boss.stateTimer <= 0) {
      boss.aiState = 'idle';
      boss.stateTimer = boss.phase === 3 ? 1.85 : 2.25;
    }
  }
}

export function detonateUsoppBomb(x: number, y: number, dmgMult: number): void {
  AUDIO.playExplosion(1.3);
  STATE.slashEffects.push({
    x,
    y,
    angle: 0,
    range: 40,
    isCircular: true,
    color: '#FF7043',
    life: 0.22,
    maxLife: 0.22,
    type: 'ring'
  });
  for (let k = 0; k < 10; k++) spawnParticle(x, y, '#FF9800', 4.5, 0.32);
  entitiesCallbacks.onDamageEnemiesInCircle(x, y, 40, dmgMult, 50, false);
}

export function updateProjectiles(dt: number): void {
  const p = STATE.player;
  for (let i = STATE.projectiles.length - 1; i >= 0; i--) {
    const pr = STATE.projectiles[i];
    pr.life -= dt;

    // ROOM de Trafalgar Law: Ralentiza progresivamente y detiene proyectiles enemigos dentro de la esfera
    let projSpeedMult = 1.0;
    if (!pr.fromPlayer && STATE.charId === 'law' && p.roomTimer > 0) {
      if (Math.hypot(pr.x - p.x, pr.y - p.y) <= p.roomRadius + pr.radius) {
        pr.roomStallTimer = (pr.roomStallTimer || 0) + dt;
        projSpeedMult = Math.max(0.03, 1 - pr.roomStallTimer * 1.6);
        if (pr.roomStallTimer >= 1.0) {
          spawnParticle(pr.x, pr.y, '#80DEEA', 3.5, 0.25);
          STATE.projectiles.splice(i, 1);
          continue;
        }
      }
    }

    if (pr.type === 'mace_boomerang' && pr.owner) {
      if (Math.random() < 0.7) spawnParticle(pr.x, pr.y, '#FF1744', 5, 0.25);
      if (!pr.returning && pr.life < pr.maxLife * 0.55) {
        pr.returning = true;
      }
      if (pr.returning && !pr.reflectedByLuffy) {
        const ang = Math.atan2(pr.owner.y - pr.y, pr.owner.x - pr.x);
        pr.vx = Math.cos(ang) * 460;
        pr.vy = Math.sin(ang) * 460;
        if (Math.hypot(pr.owner.x - pr.x, pr.owner.y - pr.y) < 35) {
          STATE.projectiles.splice(i, 1);
          continue;
        }
      }
    }

    if (pr.type === 'diable_comet' && pr.curveSign) {
      const perpX = -pr.vy / 600;
      const perpY = pr.vx / 600;
      pr.vx += perpX * pr.curveSign * dt;
      pr.vy += perpY * pr.curveSign * dt;
      if (Math.random() < 0.8) {
        spawnParticle(pr.x, pr.y, Math.random() < 0.5 ? '#FF5722' : '#FFA726', 4.5, 0.28);
      }
    }

    if (pr.type === 'firebird_star') {
      if (Math.random() < 0.85) spawnParticle(pr.x, pr.y, '#FF5722', 5, 0.30);
    }

    if (pr.type === 'usopp_bomb') {
      spawnParticle(pr.x, pr.y, '#FFF59D', 2.5, 0.14);
    }

    if (
      pr.type === 'zoro_air_cut' ||
      pr.type === 'pound_ho_x' ||
      pr.type === 'firebird_star' ||
      pr.type === 'diable_comet' ||
      pr.type === 'mace_boomerang' ||
      pr.type === 'usopp_pellet' ||
      pr.type === 'bullet'
    ) {
      if (!pr.trail) pr.trail = [];
      pr.trail.push({ x: pr.x, y: pr.y });
      if (pr.trail.length > 6) pr.trail.shift();
    }

    const stepX = pr.vx * projSpeedMult * dt;
    const stepY = pr.vy * projSpeedMult * dt;
    pr.x += stepX;
    pr.y += stepY;

    if (pr.maxRange !== undefined) {
      pr.traveled = (pr.traveled || 0) + Math.hypot(stepX, stepY);
      if (pr.traveled >= pr.maxRange) {
        if (pr.type === 'usopp_bomb') {
          detonateUsoppBomb(pr.x, pr.y, pr.dmgMult);
        }
        STATE.projectiles.splice(i, 1);
        continue;
      }
    }

    if (pr.type === 'pound_ho_x') {
      pr.rotation += 14 * dt;
      if (Math.random() < 0.6) spawnParticle(pr.x, pr.y, '#A5D6A7', 4, 0.35);
    }

    if (pr.type === 'zoro_air_cut') {
      pr.traveled += Math.hypot(stepX, stepY);
      if (pr.traveled >= pr.maxDist && !pr.spawnedCrack) {
        pr.spawnedCrack = true;
        STATE.hazards.push({
          x: pr.x,
          y: pr.y,
          radius: pr.crackRadius || 70,
          crackRadius: pr.crackRadius || 70,
          life: 0.4,
          type: 'zoro_crack',
          damaged: false
        });
        STATE.projectiles.splice(i, 1);
        continue;
      }
    }

    if (pr.fromPlayer) {
      for (let j = 0; j < STATE.enemies.length; j++) {
        const en = STATE.enemies[j];
        if (en.hp <= 0 || pr.hitIds.includes(en)) continue;
        if (Math.hypot(en.x - pr.x, en.y - pr.y) <= en.radius + pr.radius) {
          pr.hitIds.push(en);
          if (pr.reflectedFlatDamage) {
            damageEnemy(en, pr.reflectedFlatDamage, { isCrit: true });
          } else if (pr.type === 'diable_comet') {
            AUDIO.playFireCrackle();
            for (let k = 0; k < 8; k++) {
              spawnParticle(en.x, en.y, k % 2 === 0 ? '#FF5722' : '#FFA726', 5, 0.35);
            }
            const { amount, isCrit } = calculatePlayerDamage(pr.dmgMult, true);
            damageEnemy(en, amount, { isCrit, applyBurn: true, burnDps: 5 });
          } else if (pr.type === 'firebird_star') {
            AUDIO.playExplosion(1.3);
            const { amount, isCrit } = calculatePlayerDamage(pr.dmgMult, true);
            damageEnemy(en, amount, { isCrit, applyBurn: true, burnDps: 5 });
          } else if (pr.type === 'usopp_bomb') {
            detonateUsoppBomb(pr.x, pr.y, pr.dmgMult);
          } else {
            const isNorm = pr.type === 'zoro_air_cut' || pr.type === 'usopp_pellet';
            const { amount, isCrit } = calculatePlayerDamage(pr.dmgMult, !isNorm);
            damageEnemy(en, amount, {
              isCrit,
              pierceShield: pr.pierceShield,
              isNormalAttack: isNorm
            });
          }

          if (pr.type === 'zoro_air_cut' && !pr.spawnedCrack) {
            pr.spawnedCrack = true;
            STATE.hazards.push({
              x: pr.x,
              y: pr.y,
              radius: pr.crackRadius || 70,
              crackRadius: pr.crackRadius || 70,
              life: 0.4,
              type: 'zoro_crack',
              damaged: false
            });
          }

          if (pr.maxHits && pr.hitIds.length >= pr.maxHits) {
            STATE.projectiles.splice(i, 1);
            break;
          }
        }
      }
    } else {
      if (Math.hypot(p.x - pr.x, p.y - pr.y) <= p.radius + pr.radius) {
        // Shanks: Pasiva de cortar balas con ataque básico (Parry, ventana ~0.2s)
        if (STATE.charId === 'shanks') {
          const isParrying =
            p.attackAnimTimer > 0 ||
            performance.now() - (p.lastAttackAttemptTime || 0) <= 200;
          if (isParrying) {
            for (let k = 0; k < 8; k++) spawnParticle(pr.x, pr.y, '#FF1744', 4.5, 0.25);
            STATE.slashEffects.push({
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
            spawnFloatingText(pr.x, pr.y - 28, 'CUT!', '#FF1744', 1.25);
            AUDIO.playMetalClank();
            AUDIO.playShing();
            STATE.projectiles.splice(i, 1);
            continue;
          }
        }

        if (STATE.charId === 'shanks' && p.futureSightTimer > 0) {
          // Future Sight: los proyectiles enemigos se desintegran al contacto
          for (let k = 0; k < 6; k++) spawnParticle(pr.x, pr.y, '#FF1744', 3.5, 0.25);
          spawnFloatingText(p.x, p.y - 32, 'MISS', '#FF1744', 1.0);
          AUDIO.playEtherealSwish();
          STATE.projectiles.splice(i, 1);
          continue;
        }
        damagePlayer(pr.damage, pr.type === 'mace_boomerang', pr.owner);
        if (pr.type !== 'mace_boomerang') {
          STATE.projectiles.splice(i, 1);
          continue;
        }
      }
    }

    if (pr.life <= 0) STATE.projectiles.splice(i, 1);
  }
}
