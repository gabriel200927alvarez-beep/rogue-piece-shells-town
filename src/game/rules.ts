export type RarityKey = 'comun' | 'raro' | 'epico' | 'legendario' | 'yonko';

export const RARITY_MULTIPLIERS: Record<RarityKey, number> = {
  comun: 1.0,
  raro: 1.1,
  epico: 1.25,
  legendario: 1.5,
  yonko: 2.0,
};

export interface ScaledStats {
  hp: number;
  damage: number;
  armor: number;
}

export function scaleCharacterStats(
  base: { hp: number; damage: number; armor: number },
  rarity: RarityKey,
): ScaledStats {
  const mult = RARITY_MULTIPLIERS[rarity] ?? 1.0;
  return {
    hp: Math.round(base.hp * mult),
    damage: Number((base.damage * mult).toFixed(2)),
    armor: Number((base.armor * mult).toFixed(2)),
  };
}

export function calculateKingKongGunMultiplier(
  chargeSeconds: number,
  gear2ndActive: boolean,
): number {
  const clampedCharge = Math.max(0, Math.min(2.5, chargeSeconds));
  const t = clampedCharge / 2.5;
  const baseMult = 1.0 + t * 7.0; // 1.0x at 0s -> 8.0x at 2.5s
  return Number((gear2ndActive ? baseMult * 1.4 : baseMult).toFixed(2));
}

export function calculateWaveEnemyMultipliers(wave: number): {
  hpMult: number;
  dmgMult: number;
  spawnIntervalSec: number;
} {
  const w = Math.max(1, Math.min(5, Math.floor(wave)));
  return {
    hpMult: Number((1 + 0.2 * (w - 1)).toFixed(2)),
    dmgMult: Number((1 + 0.1 * (w - 1)).toFixed(2)),
    spawnIntervalSec: w === 5 ? 0.28 : 0.48,
  };
}

export function calculateConquerorStunDuration(shanksHaki: number): number {
  const clamped = Math.max(0, Math.min(100, shanksHaki));
  return Number((1.0 + (clamped / 100) * 3.2).toFixed(2)); // 1.0s @ 0 -> 4.2s @ 100
}

export function drainGear2ndResource(
  energy: number,
  dt: number,
  drainPerSec = 10
): { energy: number; active: boolean; ended: boolean } {
  const next = Math.max(0, energy - drainPerSec * dt);
  const ended = next <= 0;
  return {
    energy: Number(next.toFixed(4)),
    active: !ended,
    ended
  };
}

export function drainWhitebeardQuake(
  energy: number,
  dt: number,
  drainPerSec = 10
): { energy: number; active: boolean; ended: boolean } {
  const next = Math.max(0, energy - drainPerSec * dt);
  const ended = next <= 0;
  return {
    energy: Number(next.toFixed(4)),
    active: !ended,
    ended
  };
}

export function calculateLuffyPtsComboCooldown(
  step: number,
  gear2ndActive: boolean
): { attackCooldown: number; comboResetTimer: number } {
  const g2Mult = gear2ndActive ? 0.8 : 1.0;
  if (step === 2) {
    return {
      attackCooldown: Number((0.4 * g2Mult).toFixed(4)),
      comboResetTimer: 0.7
    };
  }
  if (step === 3) {
    return {
      attackCooldown: Number((0.35 * g2Mult).toFixed(4)),
      comboResetTimer: 0.7
    };
  }
  return {
    attackCooldown: Number((0.35 * g2Mult).toFixed(4)),
    comboResetTimer: 0.65
  };
}

export function calculateFrankyCoupDeVentScaling(
  cola: number,
  maxCola = 50
): { colaSpent: number; dmgMult: number; rangeMult: number; angleMult: number } {
  const spent = Math.max(0, Math.min(maxCola, cola));
  const ratio = maxCola > 0 ? spent / maxCola : 0;
  return {
    colaSpent: spent,
    dmgMult: Number((1.0 + ratio * 0.6).toFixed(3)),
    rangeMult: Number((1.0 + ratio * 0.4).toFixed(3)),
    angleMult: Number((1.0 + ratio * 0.25).toFixed(3))
  };
}

export function drainGigantResource(
  energy: number,
  dt: number,
  drainPerSec = 10
): { energy: number; active: boolean; ended: boolean } {
  const next = Math.max(0, energy - drainPerSec * dt);
  const ended = next <= 0;
  return {
    energy: Number(next.toFixed(4)),
    active: !ended,
    ended
  };
}

export function calculateDawnWhipRadius(
  progress: number,
  minR = 55,
  maxR = 250
): number {
  const u = Math.max(0, Math.min(1, progress));
  return Number((minR * Math.pow(maxR / minR, u)).toFixed(2));
}

export function shouldTriggerToonForce(roll: number): boolean {
  return roll >= 0 && roll < 0.02;
}

