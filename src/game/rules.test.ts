import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateConquerorStunDuration,
  calculateDawnWhipRadius,
  calculateFrankyCoupDeVentScaling,
  calculateKingKongGunMultiplier,
  calculateLuffyPtsComboCooldown,
  calculateWaveEnemyMultipliers,
  drainGear2ndResource,
  drainGigantResource,
  drainWhitebeardQuake,
  scaleCharacterStats,
  shouldTriggerToonForce,
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

test('drainGear2ndResource drains G2 over time and signals end at zero', () => {
  assert.deepEqual(drainGear2ndResource(100, 1.5), {
    energy: 85,
    active: true,
    ended: false,
  });
  assert.deepEqual(drainGear2ndResource(10, 1.0), {
    energy: 0,
    active: false,
    ended: true,
  });
});

test('drainWhitebeardQuake drains Gura energy over time and signals end at zero', () => {
  assert.deepEqual(drainWhitebeardQuake(60, 2.0), {
    energy: 40,
    active: true,
    ended: false,
  });
  assert.deepEqual(drainWhitebeardQuake(5, 1.0), {
    energy: 0,
    active: false,
    ended: true,
  });
});

test('calculateLuffyPtsComboCooldown removes flat 1.0s post-combo cooldown and respects Gear 2nd speed', () => {
  assert.deepEqual(calculateLuffyPtsComboCooldown(3, false), {
    attackCooldown: 0.35,
    comboResetTimer: 0.7,
  });
  assert.deepEqual(calculateLuffyPtsComboCooldown(3, true), {
    attackCooldown: 0.28,
    comboResetTimer: 0.7,
  });
});

test('calculateFrankyCoupDeVentScaling scales damage and area proportionally with current Cola', () => {
  assert.deepEqual(calculateFrankyCoupDeVentScaling(0, 50), {
    colaSpent: 0,
    dmgMult: 1.0,
    rangeMult: 1.0,
    angleMult: 1.0,
  });
  assert.deepEqual(calculateFrankyCoupDeVentScaling(25, 50), {
    colaSpent: 25,
    dmgMult: 1.3,
    rangeMult: 1.2,
    angleMult: 1.125,
  });
  assert.deepEqual(calculateFrankyCoupDeVentScaling(50, 50), {
    colaSpent: 50,
    dmgMult: 1.6,
    rangeMult: 1.4,
    angleMult: 1.25,
  });
});

test('drainGigantResource drains 10/s so 100 energy lasts 10s and ends at zero', () => {
  assert.deepEqual(drainGigantResource(100, 2.5), {
    energy: 75,
    active: true,
    ended: false,
  });
  assert.deepEqual(drainGigantResource(10, 1.0), {
    energy: 0,
    active: false,
    ended: true,
  });
});

test('calculateDawnWhipRadius grows exponentially from minR to maxR', () => {
  const r0 = calculateDawnWhipRadius(0);
  const rMid = calculateDawnWhipRadius(0.5);
  const r1 = calculateDawnWhipRadius(1);
  assert.equal(r0, 55);
  assert.equal(r1, 250);
  assert.ok(rMid - r0 < r1 - rMid, 'exponential growth accelerates over time');
});

test('shouldTriggerToonForce triggers strictly at 2% probability', () => {
  assert.equal(shouldTriggerToonForce(0.0), true);
  assert.equal(shouldTriggerToonForce(0.0199), true);
  assert.equal(shouldTriggerToonForce(0.02), false);
  assert.equal(shouldTriggerToonForce(0.5), false);
});

