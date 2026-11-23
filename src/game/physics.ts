// ============================================================================
// 4. FÍSICA, GEOMETRÍA, AUTO-AIM, CÁLCULO DE DAÑO Y POOLS DE PARTÍCULAS/TEXTO
// ============================================================================

import { CONFIG } from './config';
import { STATE } from './state';
import { INPUT_TOUCH } from './input';

export interface SpawnParticleOpts {
  vx?: number;
  vy?: number;
  alpha?: number;
  shape?: 'circle' | 'spark';
}

export interface SpawnFloatingTextOpts {
  isCrit?: boolean;
}

export function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function pointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export function findNearestEnemy(maxDist: number = CONFIG.AUTO_AIM_RANGE): any {
  let nearest: any = null;
  let minDist = maxDist;
  const p = STATE.player;
  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    const d = Math.hypot(en.x - p.x, en.y - p.y);
    if (d <= minDist) {
      minDist = d;
      nearest = en;
    }
  }
  return nearest;
}

// Busca el enemigo vivo más cercano dentro de un radio y cono frontal (±halfAngle radianes respecto a baseAngle)
// Usado para auto-aim por golpe en Luffy PTS (radio 220px, cono ±120° = 2.094 rad)
export function findNearestEnemyInCone(maxDist: number, baseAngle: number, halfAngle: number): any {
  let nearest: any = null;
  let minDist = maxDist;
  const p = STATE.player;
  for (let i = 0; i < STATE.enemies.length; i++) {
    const en = STATE.enemies[i];
    if (en.hp <= 0) continue;
    const dx = en.x - p.x;
    const dy = en.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d <= minDist) {
      const angleToEnemy = Math.atan2(dy, dx);
      const diff = normalizeAngle(angleToEnemy - baseAngle);
      if (Math.abs(diff) <= halfAngle) {
        minDist = d;
        nearest = en;
      }
    }
  }
  return nearest;
}

export function getAimAngle(): number {
  const p = STATE.player;
  const aimMaxRange = STATE.charId === 'usopp' ? 340 : CONFIG.AUTO_AIM_RANGE;
  const target = findNearestEnemy(aimMaxRange);
  STATE.targetedEnemy = target;
  if (target) {
    return Math.atan2(target.y - p.y, target.x - p.x);
  }
  if (INPUT_TOUCH.joystick.magnitude > 0.1) {
    return Math.atan2(INPUT_TOUCH.joystick.dirY, INPUT_TOUCH.joystick.dirX);
  }
  return p.facingAngle;
}

export function calculatePlayerDamage(
  baseMult: number,
  isSkill = false,
  forceCrit = false
): { amount: number; isCrit: boolean } {
  const p = STATE.player;
  const bonusPct = (isSkill ? STATE.mods.skillDmgPct : STATE.mods.normalDmgPct) + STATE.permBonusDmg;
  let dmg = p.baseDamage * baseMult * (1 + bonusPct);

  // Pasiva ROOM de Law: +20% daño SÓLO mientras ROOM está activo
  if (STATE.charId === 'law' && p.roomTimer > 0) {
    dmg *= 1.20;
  }

  // Transformación Punk Rotten de Kid: +30% daño en ataques normales
  if (STATE.charId === 'kid' && p.punkRottenTimer > 0 && !isSkill) {
    dmg *= 1.30;
  }

  // Transformación Killer Frenzy: +100% daño en TODOS los ataques
  if (STATE.charId === 'killer' && p.killerFrenzyTimer > 0) {
    dmg *= 2.0;
  }

  // Buff Luffy PTS Gear 2nd: x1.4 a TODO el daño
  if (STATE.charId === 'luffy_pts' && p.gear2ndTimer > 0) {
    dmg *= 1.4;
  }

  const effectiveCritChance = STATE.mods.critChance + (STATE.charId === 'luffy_pts' ? 0.15 : 0);
  const isCrit = forceCrit || (Math.random() < effectiveCritChance);
  if (isCrit) dmg *= (STATE.charId === 'luffy_pts' ? 2.0 : 1.5);
  return { amount: Math.round(dmg), isCrit };
}

export function spawnParticle(
  x: number,
  y: number,
  color: string,
  size = 4,
  life = 0.35,
  opts: SpawnParticleOpts = {}
): void {
  for (let i = 0; i < STATE.particles.length; i++) {
    const pt = STATE.particles[i];
    if (!pt.active) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 180;
      pt.active = true;
      pt.x = x;
      pt.y = y;
      pt.vx = opts.vx != null ? opts.vx : Math.cos(ang) * spd;
      pt.vy = opts.vy != null ? opts.vy : Math.sin(ang) * spd;
      pt.color = color;
      pt.size = size;
      pt.life = life;
      pt.maxLife = life;
      pt.alpha = opts.alpha != null ? opts.alpha : 1.0;
      pt.shape = opts.shape || 'circle';
      return;
    }
  }
}

export function spawnFloatingText(
  x: number,
  y: number,
  text: string,
  color = '#FFF',
  scale = 1.0,
  opts: SpawnFloatingTextOpts = {}
): void {
  for (let i = 0; i < STATE.floatingTexts.length; i++) {
    const ft = STATE.floatingTexts[i];
    if (!ft.active) {
      ft.active = true;
      ft.x = x;
      ft.y = y;
      ft.vy = -55;
      ft.text = text;
      ft.color = color;
      ft.scale = scale;
      ft.life = 0.65;
      ft.maxLife = 0.65;
      ft.isCrit = Boolean(opts.isCrit);
      ft.tiltAngle = ft.isCrit ? (Math.random() - 0.5) * 0.24 : 0;
      return;
    }
  }
}
