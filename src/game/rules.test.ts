import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateConquerorStunDuration,
  calculateKingKongGunMultiplier,
  calculateWaveEnemyMultipliers,
  scaleCharacterStats,
} from './rules';

test('scaleCharacterStats applies rarity multipliers accurately', () => {
  const luffyPts = scaleCharacterStats({ hp: 130, damage: 17, armor: 8 }, 'legendario');
  assert.equal(luffyPts.hp, 195);
  assert.equal(luffyPts.damage, 25.5);
  assert.equal(luffyPts.armor, 12);

  const yonko = scaleCharacterStats({ hp: 100, damage: 20, armor: 10 }, 'yonko');
  assert.deepEqual(yonko, { hp: 200, damage: 40, armor: 20 });
});

test('calculateKingKongGunMultiplier scales from 1.0x to 8.0x and applies Gear 2nd 1.4x', () => {
  assert.equal(calculateKingKongGunMultiplier(0, false), 1.0);
  assert.equal(calculateKingKongGunMultiplier(2.5, false), 8.0);
  assert.equal(calculateKingKongGunMultiplier(2.5, true), 11.2);
  assert.equal(calculateKingKongGunMultiplier(5.0, false), 8.0);
});

test('calculateWaveEnemyMultipliers ramps wave HP, damage, and boss spawn rate', () => {
  assert.deepEqual(calculateWaveEnemyMultipliers(1), {
    hpMult: 1.0,
    dmgMult: 1.0,
    spawnIntervalSec: 0.48,
  });
  assert.deepEqual(calculateWaveEnemyMultipliers(5), {
    hpMult: 1.8,
    dmgMult: 1.4,
    spawnIntervalSec: 0.28,
  });
});

test('calculateConquerorStunDuration scales from 1.0s to 4.2s with Haki', () => {
  assert.equal(calculateConquerorStunDuration(0), 1.0);
  assert.equal(calculateConquerorStunDuration(50), 2.6);
  assert.equal(calculateConquerorStunDuration(100), 4.2);
});
