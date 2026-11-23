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
