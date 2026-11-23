// ============================================================================
// 2. ESTADO GLOBAL DEL JUEGO Y POOLS PRE-ASIGNADOS
// ============================================================================

export interface ParticleSlot {
  active: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  color?: string;
  size?: number;
  life?: number;
  maxLife?: number;
  alpha?: number;
  shape?: 'circle' | 'spark';
}

export interface FloatingTextSlot {
  active: boolean;
  x?: number;
  y?: number;
  vy?: number;
  text?: string;
  color?: string;
  scale?: number;
  life?: number;
  maxLife?: number;
  isCrit?: boolean;
  tiltAngle?: number;
}

export interface GameState {
  screen: string;
  charId: string;
  wave: number;
  berries: number;
  berriesCollectedRun: number;
  killsRun: number;
  permBonusDmg: number;
  hitstopTimer: number;
  shakeTimer: number;
  shakeIntensity: number;
  timeSinceLastCombat: number;
  targetedEnemy: any;

  settings: {
    sfxVolume: number;
    musicVolume: number;
    vibration: boolean;
  };

  tutorial: {
    shown: boolean;
    active: boolean;
    step: number;
    timer: number;
  };

  mods: {
    acquiredIds: string[];
    normalDmgPct: number;
    skillDmgPct: number;
    critChance: number;
    outOfCombatRegen: number;
    dashCdMult: number;
    dashSlowTrail: boolean;
    h1CdMult: number;
    h1Burn: boolean;
    h2PierceShield: boolean;
    h3AreaMult: number;
    bonusBerries: number;
    scoutNextWave: boolean;
  };

  player: Record<string, any> & {
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    facingAngle: number;
    hp: number;
    maxHp: number;
    baseDamage: number;
    speed: number;
    armor: number;
    invulnTimer: number;
    slowTimer: number;
    speedBuffTimer: number;
    comboStep: number;
    comboResetTimer: number;
    attackCooldown: number;
    attackCooldownMax: number;
    attackAnimTimer: number;
    skillAnimTimer: number;
    activeSkillIndex: number;
    momentumTimer: number;
    momentumDirX: number;
    momentumDirY: number;
    superArmorTimer: number;
    dashCdMax: number;
    dashCdTimer: number;
    dashCharges: number;
    maxDashCharges: number;
    isDashing: boolean;
    dashTimer: number;
    dashDurationMax: number;
    dashDirX: number;
    dashDirY: number;
    customDashDist: number;
    dashHitEnemyIds: any[];
    skillCds: number[];
    skillMaxCds: number[];
    visualScaleX: number;
    visualScaleY: number;
    landSquashTimer: number;
    stepDustTimer: number;
  };

  waveSpawnQueue: any[];
  waveTotalEnemies: number;
  waveEnemiesRemaining: number;
  waveSpawnTimer: number;
  waveClearPending: boolean;
  waveClearDelayTimer: number;

  enemies: any[];
  projectiles: any[];
  berriesDrops: any[];
  hazards: any[];
  traps: any[];
  pendingStrikes: any[];
  afterimages: any[];
  slashEffects: any[];
  particles: ParticleSlot[];
  floatingTexts: FloatingTextSlot[];
}

export const STATE: GameState = {
  screen: 'menu',
  charId: 'luffy',
  wave: 1,
  berries: 0,
  berriesCollectedRun: 0,
  killsRun: 0,
  permBonusDmg: 0,
  hitstopTimer: 0,
  shakeTimer: 0,
  shakeIntensity: 0,
  timeSinceLastCombat: 0,
  targetedEnemy: null,

  settings: {
    sfxVolume: 0.8,
    musicVolume: 0.55,
    vibration: true
  },

  tutorial: {
    shown: false,
    active: false,
    step: 0,
    timer: 0
  },

  mods: {
    acquiredIds: [],
    normalDmgPct: 0,
    skillDmgPct: 0,
    critChance: 0.05,
    outOfCombatRegen: 0,
    dashCdMult: 1.0,
    dashSlowTrail: false,
    h1CdMult: 1.0,
    h1Burn: false,
    h2PierceShield: false,
    h3AreaMult: 1.0,
    bonusBerries: 0,
    scoutNextWave: false
  },

  player: {
    x: 1280, y: 720, radius: 18,
    vx: 0, vy: 0, facingAngle: 0,
    hp: 150, maxHp: 150,
    baseDamage: 18, speed: 240, armor: 18,
    invulnTimer: 0, slowTimer: 0, speedBuffTimer: 0,
    comboStep: 0, comboResetTimer: 0,
    attackCooldown: 0, attackCooldownMax: 0.21, attackAnimTimer: 0,
    skillAnimTimer: 0, activeSkillIndex: 0,
    momentumTimer: 0, momentumDirX: 0, momentumDirY: 0,
    superArmorTimer: 0,
    dashCdMax: 2.2, dashCdTimer: 0,
    dashCharges: 1, maxDashCharges: 1,
    isDashing: false, dashTimer: 0, dashDurationMax: 0.16,
    dashDirX: 1, dashDirY: 0, customDashDist: 165,
    dashHitEnemyIds: [],
    skillCds: [0, 0, 0], skillMaxCds: [4.5, 6.0, 9.5],
    // Estados específicos de personajes previos
    gatlingHitsLeft: 0, gatlingTickTimer: 0,
    diableHitsLeft: 0, diableTickTimer: 0,
    stormTimer: 0, stormHitsLeft: 0, stormTickTimer: 0, stormAimAngle: 0,
    sanzenStep: 0, sanzenTimer: 0, sanzenAngle: 0,
    ifritShotsLeft: 0, ifritTickTimer: 0, ifritCycleIndex: 0,
    usoppDoubleShotTimer: 0, usoppDoubleShotAngle: 0,
    cola: 0, maxCola: 50,
    strongRightTimer: 0, strongRightAngle: 0,
    radicalChargeTimer: 0, radicalChargeAngle: 0, radicalColaMult: 1.0,
    robinHitCounter: 0, robinRootReady: false,
    // Estados específicos de Law
    roomTimer: 0, roomDurationMax: 6.0, roomRadius: 180,
    roomFadeTimer: 0, roomFadeMax: 0.45, roomFadeX: 0, roomFadeY: 0,
    // Estados específicos de Kid
    scrap: 0, maxScrap: 20,
    kidRepelWindowTimer: 0,
    punkRottenTimer: 0, punkRottenDurationMax: 8.0, punkRottenBuildTimer: 0,
    punkRottenPrevMaxCharges: 1, punkRottenPrevDashCdMax: 2.5,
    damnedPunkTimer: 0, damnedPunkTickTimer: 0, damnedPunkTicksLeft: 0, damnedPunkTarget: null, damnedPunkAngle: 0,
    // Estados específicos de Killer
    ensanamientoTimer: 0,
    killerFrenzyTimer: 0,
    killerHeartbeatTimer: 0,
    // Cargas iniciales de Barbablanca y cadena de Shanks
    wbJumpCharges: 2,
    wbJumpCdTimer: 0,
    wbQuakeVisualScale: 0,
    wbCameraZoom: 1.0,
    shanksChainStep: 0,
    shanksChainTimer: 0,
    // Locomoción e inercia visual (Canvas 2D)
    visualScaleX: 1.0,
    visualScaleY: 1.0,
    landSquashTimer: 0,
    stepDustTimer: 0
  },

  waveSpawnQueue: [],
  waveTotalEnemies: 0,
  waveEnemiesRemaining: 0,
  waveSpawnTimer: 0,
  waveClearPending: false,
  waveClearDelayTimer: 0,

  enemies: [],
  projectiles: [],
  berriesDrops: [],
  hazards: [],
  traps: [],
  pendingStrikes: [],
  afterimages: [],
  slashEffects: [],
  particles: Array.from({ length: 180 }, () => ({ active: false })),
  floatingTexts: Array.from({ length: 55 }, () => ({ active: false }))
};
