import type { CharacterConfig, CharacterSkillDef } from '../config';
import type { GameState } from '../state';
import type { AUDIO } from '../audio';
import type { SpawnParticleOpts, SpawnFloatingTextOpts } from '../physics';

export interface CharacterCardMeta {
  displayName?: string;
  nameColor: string;
  role: string;
  passiveText: string;
  passiveColor: string;
  stats: {
    hp: number;
    dmg: number;
    vel: number;
    arm: number;
  };
  comboDesc: string;
  skillsDesc: string;
  zarparName?: string;
}

export interface DamageEnemyOpts {
  isCrit?: boolean;
  knockback?: number;
  sourceX?: number;
  sourceY?: number;
  isNormalAttack?: boolean;
  stun?: number;
  root?: number;
  clutchDot?: number;
  applyBleed?: boolean;
  applyBurn?: boolean;
  burnDps?: number;
  ignoreArmorPct?: number;
  armorDebuffTimer?: number;
  pierceShield?: boolean;
  killerBleedStacks?: number;
  hitSet?: Set<any>;
  [key: string]: any;
}

export interface CharacterContext {
  state: GameState;
  player: GameState['player'];
  audio: typeof AUDIO;
  triggerHaptic: (pattern: number | number[]) => void;
  triggerScreenShake: (intensity: number, duration: number) => void;
  calculatePlayerDamage: (
    baseMult: number,
    isSkill?: boolean,
    forceCrit?: boolean
  ) => { amount: number; isCrit: boolean };
  findNearestEnemy: (maxDist?: number) => any;
  findNearestEnemyInCone: (maxDist: number, baseAngle: number, halfAngle: number) => any;
  getAimAngle: () => number;
  getMoveInput: () => { dirX: number; dirY: number; magnitude: number };
  normalizeAngle: (a: number) => number;
  pointToSegmentDist: (
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ) => number;
  spawnParticle: (
    x: number,
    y: number,
    color: string,
    size?: number,
    life?: number,
    opts?: SpawnParticleOpts
  ) => void;
  spawnFloatingText: (
    x: number,
    y: number,
    text: string,
    color?: string,
    scale?: number,
    opts?: SpawnFloatingTextOpts
  ) => void;
  damageEnemy: (en: any, rawDamage: number, opts?: DamageEnemyOpts) => void;
  damageEnemiesInCone: (
    ox: number,
    oy: number,
    aimAngle: number,
    range: number,
    halfAngle: number,
    dmgMult: number,
    knockback: number,
    canBleed?: boolean,
    rootChance?: number,
    rootDur?: number,
    extraOpts?: DamageEnemyOpts
  ) => boolean;
  damageEnemiesInCircle: (
    cx: number,
    cy: number,
    radius: number,
    dmgMult: number,
    knockback: number,
    isSkill?: boolean,
    stunDur?: number,
    extraOpts?: DamageEnemyOpts
  ) => boolean;
  damageEnemiesInLine: (
    ox: number,
    oy: number,
    angle: number,
    length: number,
    halfWidth: number,
    dmgMult: number,
    knockback: number,
    isSkill?: boolean,
    stunDur?: number,
    extraOpts?: DamageEnemyOpts
  ) => boolean;
  applyBleed: (en: any, stacksToAdd?: number) => void;
  updateHUD: () => void;
  updateCooldownUI: () => void;
}

export interface CharacterRenderContext {
  ctx: CanvasRenderingContext2D;
  state: GameState;
  player: GameState['player'];
  cfg: CharacterConfig;
  t: number;
}

export interface ButtonUIHelpers {
  setSkillCooldownOverride: (idx: number, rem: number | null, maxCd?: number, isSpecialReady?: boolean) => void;
  getBtn: (idx: number) => HTMLElement | null;
  getIcon: (idx: number) => HTMLElement | null;
  getLabel: (idx: number) => HTMLElement | null;
  getCdEl: (idx: number) => HTMLElement | null;
  dashBtn: HTMLElement | null;
}

export interface CharacterModule extends CharacterConfig {
  id: string;
  name: string;
  rarity: string;
  portrait: string;
  portraitBg: string;
  attackIcon: string;
  themeClass: string;
  color: string;
  vestColor: string;
  hp: number;
  damage: number;
  speed: number;
  armor: number;
  dashCd: number;
  skills: CharacterSkillDef[];
  initialDashCharges?: number;
  autoAimRange?: number;
  cardMeta: CharacterCardMeta;

  createCustomState: () => Record<string, any>;

  // Combat & Action lifecycle
  canAttack?: (p: GameState['player']) => boolean;
  canDash?: (p: GameState['player']) => boolean;
  canUseSkill?: (ctx: CharacterContext, idx: number) => boolean;
  onNormalAttackOverride?: (ctx: CharacterContext, aimAngle: number) => boolean;
  onAttack: (ctx: CharacterContext, aimAngle: number) => void;
  /** Return true if the character performed a custom instant dash/teleport (skipping standard slide). */
  onDash?: (ctx: CharacterContext, aimFallback: { dirX: number; dirY: number }) => boolean | void;
  onDashHitEnemy?: (ctx: CharacterContext, en: any) => void;
  onDashEnd?: (ctx: CharacterContext) => void;
  /** Return true if pressing an active skill button handled a toggle/cancel/release before CD checks. */
  onSkillReactivate?: (ctx: CharacterContext, idx: number) => boolean;
  /** Return true to defer cooldown manually inside onSkill; otherwise generic CD starts automatically. */
  onSkill: (ctx: CharacterContext, idx: number, aimAngle: number) => boolean | void;

  // Hold-to-charge skills (e.g. King Kong Gun) & hold-dash (e.g. Dawn Rocket)
  supportsHoldSkill?: (idx: number) => boolean;
  isHoldSkillActive?: (p: GameState['player'], idx?: number) => boolean;
  onHoldSkillRelease?: (ctx: CharacterContext, idx: number) => void;
  supportsHoldDash?: () => boolean;
  isHoldDashActive?: (p: GameState['player']) => boolean;
  onHoldDashRelease?: (ctx: CharacterContext) => void;

  // Frame updates & movement modifiers
  onUpdate?: (ctx: CharacterContext, dt: number) => void;
  isMovementLocked?: (p: GameState['player']) => boolean;
  isFacingLocked?: (p: GameState['player']) => boolean;
  getMoveSpeedMult?: (p: GameState['player']) => number;

  // Passive & Damage hooks
  onCalculateDamage?: (
    p: GameState['player'],
    isSkill: boolean
  ) => { dmgMult?: number; extraCritChance?: number; critMult?: number };
  onShouldIgnoreTarget?: (
    p: GameState['player'],
    en: any,
    isSkill: boolean
  ) => { ignore: boolean; text?: string; color?: string };
  onModifyDamageEnemy?: (
    p: GameState['player'],
    en: any,
    opts: DamageEnemyOpts
  ) => { ignoreArmorPct?: number; pierceShield?: boolean; dmgMult?: number };
  onAfterDamageEnemy?: (ctx: CharacterContext, en: any, opts: DamageEnemyOpts) => void;
  onEnemyKilled?: (ctx: CharacterContext, en: any, resGain: number) => void;
  onBeforePlayerDamage?: (
    ctx: CharacterContext,
    incomingDmg: number,
    isBlunt: boolean,
    attacker: any,
    isProjectile?: boolean
  ) => { cancelled?: boolean; dmgMult?: number };
  onEnemyTick?: (
    p: GameState['player'],
    en: any,
    dt: number
  ) => { speedMult?: number; inLawRoom?: boolean };
  onProjectileTick?: (
    ctx: CharacterContext,
    pr: any,
    dt: number
  ) => { speedMult?: number; remove?: boolean };
  onCheckEnemyProjectileHit?: (ctx: CharacterContext, pr: any) => boolean;
  onUpgradeApplied?: (ctx: CharacterContext) => void;
  onCleanupEffects?: (p: GameState['player']) => void;
  pierceShieldOnBleedRupture?: boolean | ((p: GameState['player']) => boolean);

  // Rendering hooks
  getCameraZoom?: (p: GameState['player']) => number;
  getBodyScale?: (p: GameState['player']) => number;
  getBodySpin?: (p: GameState['player']) => number;
  drawWorldBeforePlayer?: (rc: CharacterRenderContext) => void;
  drawWorldAfterPlayer?: (rc: CharacterRenderContext) => void;
  drawAura?: (rc: CharacterRenderContext) => void;
  drawBody: (rc: CharacterRenderContext) => void;
  drawPreview: (pctx: CanvasRenderingContext2D, t: number, cfg: CharacterConfig) => void;

  // Dynamic HUD hooks
  mountHUD?: (slotEl: HTMLElement, hudCombatEl: HTMLElement, ctx: CharacterContext) => void;
  updateHUD?: (p: GameState['player']) => void;
  updateButtonsUI?: (p: GameState['player'], helpers: ButtonUIHelpers) => void;
  isAttackCooldownVisible?: (p: GameState['player']) => boolean;
}
