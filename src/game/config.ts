// ============================================================================
// 1. CONFIGURACIÓN GLOBAL, RAREZAS, PERSONAJES, POOL DE MEJORAS Y TUTORIAL
// ============================================================================

import type { GameState } from './state';

export const CONFIG = {
  WIDTH: 1280,
  HEIGHT: 720,
  WORLD_WIDTH: 2560,
  WORLD_HEIGHT: 1440,
  ARENA_MARGIN_X: 90,
  ARENA_MARGIN_Y: 85,
  MAX_WAVES: 5,
  JOYSTICK_RADIUS: 58,
  JOYSTICK_KNOB_RADIUS: 24,
  JOYSTICK_DEADZONE: 0.14,
  AUTO_AIM_RANGE: 230,
  COMBO_RESET_TIME: 0.65,
  DASH_DISTANCE: 165,
  DASH_DURATION: 0.16,
  DASH_IFRAMES: 0.22,
  HITSTOP_DURATION: 0.045,
  CAM_DEADZONE_W: 256,
  CAM_DEADZONE_H: 144,
  CAM_LERP: 0.14
} as const;

export interface RarityInfo {
  nombre: string;
  color: string;
  borde: string;
  multiplicadorStats: number;
  orden: number;
}

export const RAREZAS: Record<string, RarityInfo> = {
  comun:      { nombre: 'COMÚN',      color: '#757575', borde: '#BDBDBD', multiplicadorStats: 1.0,  orden: 1 },
  raro:       { nombre: 'RARO',       color: '#1976D2', borde: '#90CAF9', multiplicadorStats: 1.1,  orden: 2 },
  epico:      { nombre: 'ÉPICO',      color: '#9C27B0', borde: '#4A148C', multiplicadorStats: 1.25, orden: 3 },
  legendario: { nombre: 'LEGENDARIO', color: '#FFB300', borde: '#E65100', multiplicadorStats: 1.5,  orden: 4 },
  yonko:      { nombre: 'YONKO',      color: '#D32F2F', borde: '#8B0000', multiplicadorStats: 2.0,  orden: 5 }
};

export interface CharacterSkillDef {
  name: string;
  icon: string;
  cd: number;
}

export interface CharacterConfig {
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
}

export const CHARACTERS: Record<string, CharacterConfig> = {
  luffy: {
    id: 'luffy',
    name: 'LUFFY',
    rarity: 'comun',
    portrait: '👒',
    portraitBg: '#C8102E',
    attackIcon: '👊',
    themeClass: 'theme-luffy',
    color: '#F5C518',
    vestColor: '#C8102E',
    hp: 150,
    damage: 18,
    speed: 4.6,
    armor: 18,
    dashCd: 2.2,
    skills: [
      { name: 'Gatling', icon: '👊', cd: 4.5 },
      { name: 'Bazooka', icon: '💥', cd: 6.0 },
      { name: 'Storm',   icon: '🌪️', cd: 9.5 }
    ]
  },
  zoro: {
    id: 'zoro',
    name: 'ZORO',
    rarity: 'comun',
    portrait: '⚔️',
    portraitBg: '#1B5E20',
    attackIcon: '🗡️',
    themeClass: 'theme-zoro',
    color: '#66BB6A',
    vestColor: '#1B5E20',
    hp: 130,
    damage: 22.5,
    speed: 5.0,
    armor: 9,
    dashCd: 2.0,
    skills: [
      { name: 'Oni Giri', icon: '❌', cd: 4.5 },
      { name: 'Pound Ho', icon: '🌪️', cd: 6.0 },
      { name: 'Sanzen',   icon: '⚔️', cd: 9.5 }
    ]
  },
  sanji: {
    id: 'sanji',
    name: 'SANJI',
    rarity: 'comun',
    portrait: '🔥',
    portraitBg: '#1C2833',
    attackIcon: '🦵',
    themeClass: 'theme-sanji',
    color: '#FFA726',
    vestColor: '#1C2833',
    hp: 115,
    damage: 21,
    speed: 6.4,
    armor: 5.5,
    dashCd: 1.7,
    skills: [
      { name: 'Diable',   icon: '🔥', cd: 4.5 },
      { name: 'Concasse', icon: '☄️', cd: 6.0 },
      { name: 'Diable Jambe: Barrage', icon: '🔥', cd: 9.5 }
    ]
  },
  usopp: {
    id: 'usopp',
    name: 'USOPP',
    rarity: 'raro',
    portrait: '🎯',
    portraitBg: '#558B2F',
    attackIcon: '🪨',
    themeClass: 'theme-usopp',
    color: '#8BC34A',
    vestColor: '#558B2F',
    hp: 88,
    damage: 25,
    speed: 5.4,
    armor: 8,
    dashCd: 2.1,
    skills: [
      { name: 'Firebird', icon: '🔥', cd: 4.8 },
      { name: 'Smoke',    icon: '💨', cd: 6.5 },
      { name: 'Ledger',   icon: '💣', cd: 9.0 }
    ]
  },
  franky: {
    id: 'franky',
    name: 'FRANKY',
    rarity: 'raro',
    portrait: '🤖',
    portraitBg: '#00838F',
    attackIcon: '🦾',
    themeClass: 'theme-franky',
    color: '#00E5FF',
    vestColor: '#00838F',
    hp: 160,
    damage: 21.5,
    speed: 4.1,
    armor: 22,
    dashCd: 2.5,
    skills: [
      { name: 'Radical',  icon: '⚡', cd: 5.2 },
      { name: 'Hammer',   icon: '🔨', cd: 6.2 },
      { name: 'CoupVent', icon: '🌪️', cd: 9.5 }
    ]
  },
  robin: {
    id: 'robin',
    name: 'NICO ROBIN',
    rarity: 'raro',
    portrait: '🌸',
    portraitBg: '#6A1B9A',
    attackIcon: '👐',
    themeClass: 'theme-robin',
    color: '#CE93D8',
    vestColor: '#6A1B9A',
    hp: 100,
    damage: 20,
    speed: 5.4,
    armor: 11,
    dashCd: 2.0,
    skills: [
      { name: 'Clutch',   icon: '👐', cd: 5.0 },
      { name: 'MilFleur', icon: '🌸', cd: 6.5 },
      { name: 'Mano',     icon: '巨', cd: 10.0 }
    ]
  },
  law: {
    id: 'law',
    name: 'TRAFALGAR LAW',
    rarity: 'epico',
    portrait: '🌐',
    portraitBg: '#1A1A1A',
    attackIcon: '🗡️',
    themeClass: 'theme-law',
    color: '#26C6DA',
    vestColor: '#1A1A1A',
    hp: 100,
    damage: 14,
    speed: 6.0,
    armor: 6,
    dashCd: 2.0,
    skills: [
      { name: 'ROOM',        icon: '🌐', cd: 10.0 },
      { name: 'Shambles',    icon: '🌀', cd: 12.0 },
      { name: 'Gamma Knife', icon: '⚡', cd: 14.0 }
    ]
  },
  kid: {
    id: 'kid',
    name: 'EUSTASS KID',
    rarity: 'epico',
    portrait: '🦾',
    portraitBg: '#795548',
    attackIcon: '🦾',
    themeClass: 'theme-kid',
    color: '#D32F2F',
    vestColor: '#795548',
    hp: 150,
    damage: 12,
    speed: 4.5,
    armor: 12,
    dashCd: 2.5,
    skills: [
      { name: 'Attract',     icon: '🧲', cd: 9.0 },
      { name: 'Punk Rotten', icon: '🤖', cd: 18.0 },
      { name: 'Damned Punk', icon: '⚡', cd: 14.0 }
    ]
  },
  killer: {
    id: 'killer',
    name: 'KILLER',
    rarity: 'epico',
    portrait: '🎭',
    portraitBg: '#7F0000',
    attackIcon: '⚔️',
    themeClass: 'theme-killer',
    color: '#FF5252',
    vestColor: '#1A237E',
    hp: 95,
    damage: 8,
    speed: 7.0,
    armor: 5,
    dashCd: 1.8,
    skills: [
      { name: 'Sonic Scythe',  icon: '🌀', cd: 1.5 },
      { name: 'Bloodlust',     icon: '🩸', cd: 10.0 },
      { name: 'Killer Frenzy', icon: '👹', cd: 20.0 }
    ]
  },
  shanks: {
    id: 'shanks',
    name: 'Shanks (Straw Hat)',
    rarity: 'legendario',
    portrait: '🗡️',
    portraitBg: '#B71C1C',
    attackIcon: '⚔️',
    themeClass: 'theme-shanks',
    color: '#FF1744',
    vestColor: '#B71C1C',
    hp: 100,
    damage: 18,
    speed: 6.0,
    armor: 6,
    dashCd: 1.5,
    skills: [
      { name: "Conqueror's Haki", icon: '👑', cd: 10.0 },
      { name: 'Divine Departure', icon: '🗡️', cd: 10.0 },
      { name: 'Future Sight',     icon: '👁️', cd: 18.0 }
    ]
  },
  whitebeard: {
    id: 'whitebeard',
    name: 'Barbablanca',
    rarity: 'legendario',
    portrait: '🧔',
    portraitBg: '#37474F',
    attackIcon: '🔱',
    themeClass: 'theme-whitebeard',
    color: '#ECEFF1',
    vestColor: '#37474F',
    hp: 160,
    damage: 17,
    speed: 4.0,
    armor: 10,
    dashCd: 2.5,
    skills: [
      { name: 'Seaquake',       icon: '⚡', cd: 10.0 },
      { name: 'Island Shaking', icon: '🔱', cd: 2.2 },
      { name: 'Island Shaking', icon: '🌊', cd: 20.0 }
    ]
  },
  luffy_pts: {
    id: 'luffy_pts',
    name: 'Luffy (Post Time Skip)',
    rarity: 'legendario',
    portrait: '👒',
    portraitBg: '#D32F2F',
    attackIcon: '👊',
    themeClass: 'theme-luffy_pts',
    color: '#E53935',
    vestColor: '#D32F2F',
    hp: 130,
    damage: 17,
    speed: 6.0,
    armor: 8,
    dashCd: 1.8,
    skills: [
      { name: 'Red Hawk Gatling', icon: '🔥', cd: 12.0 },
      { name: 'Gear 2nd',         icon: '💨', cd: 18.0 },
      { name: 'King Kong Gun',    icon: '🦍', cd: 18.0 }
    ]
  }
};

export interface UpgradeDef {
  id: string;
  cat: string;
  catColor: string;
  icon: string;
  name: string;
  desc: string;
  apply: (st: GameState) => void;
}

export const UPGRADE_POOL: UpgradeDef[] = [
  {
    id: 'off_norm',
    cat: 'Ofensiva',
    catColor: '#D32F2F',
    icon: '⚔️',
    name: 'Puño de Hierro',
    desc: '+22% de daño en ataques básicos.',
    apply: (st) => { st.mods.normalDmgPct += 0.22; }
  },
  {
    id: 'off_skill',
    cat: 'Ofensiva',
    catColor: '#D32F2F',
    icon: '💥',
    name: 'Ambición Pirata',
    desc: '+25% de daño en todas tus habilidades.',
    apply: (st) => { st.mods.skillDmgPct += 0.25; }
  },
  {
    id: 'off_crit',
    cat: 'Ofensiva',
    catColor: '#D32F2F',
    icon: '⚡',
    name: 'Golpe Crítico',
    desc: '+18% de probabilidad de daño crítico (×1.5).',
    apply: (st) => { st.mods.critChance += 0.18; }
  },
  {
    id: 'def_hp',
    cat: 'Defensiva',
    catColor: '#2E7D32',
    icon: '🍖',
    name: 'Banquete de Carne',
    desc: '+35 HP máximos y recupera 50 HP al instante.',
    apply: (st) => {
      st.player.maxHp += 35;
      st.player.hp = Math.min(st.player.maxHp, st.player.hp + 50);
    }
  },
  {
    id: 'def_armor',
    cat: 'Defensiva',
    catColor: '#2E7D32',
    icon: '🛡️',
    name: 'Endurecimiento',
    desc: '+10 Armadura y regeneración fuera de combate (+4 HP/s).',
    apply: (st) => {
      st.player.armor += 10;
      st.mods.outOfCombatRegen += 4;
    }
  },
  {
    id: 'mov_dash',
    cat: 'Movilidad',
    catColor: '#0288D1',
    icon: '💨',
    name: 'Soru Veloz',
    desc: '+1 carga extra de Dash y -20% enfriamiento de Dash.',
    apply: (st) => {
      st.player.maxDashCharges += 1;
      st.player.dashCharges = st.player.maxDashCharges;
      st.mods.dashCdMult *= 0.80;
    }
  },
  {
    id: 'mov_slow',
    cat: 'Movilidad',
    catColor: '#0288D1',
    icon: '❄️',
    name: 'Estela Ralentizante',
    desc: '+12% Velocidad y tu Dash deja una zona que frena enemigos.',
    apply: (st) => {
      st.player.speed *= 1.12;
      st.mods.dashSlowTrail = true;
    }
  },
  {
    id: 'hab_h1cd',
    cat: 'Habilidad',
    catColor: '#F57C00',
    icon: '⏱️',
    name: 'Maestría Técnica',
    desc: '-25% enfriamiento en H1 y aplica quemadura (5/s).',
    apply: (st) => {
      st.mods.h1CdMult *= 0.75;
      st.mods.h1Burn = true;
    }
  },
  {
    id: 'hab_h23',
    cat: 'Habilidad',
    catColor: '#F57C00',
    icon: '🌟',
    name: 'Impacto Devastador',
    desc: 'H2 atraviesa escudos y H3 tiene +30% de área.',
    apply: (st) => {
      st.mods.h2PierceShield = true;
      st.mods.h3AreaMult *= 1.30;
    }
  },
  {
    id: 'uti_berry',
    cat: 'Utilidad',
    catColor: '#7B1FA2',
    icon: '💰',
    name: 'Botín de Navegante',
    desc: '+2 Berries extra por enemigo y revela la siguiente oleada.',
    apply: (st) => {
      st.mods.bonusBerries += 2;
      st.mods.scoutNextWave = true;
    }
  }
];

export const TUTORIAL_STEPS = [
  { text: '🕹️ Desliza el pulgar izquierdo (o usa WASD) para mover a tu pirata.', left: '34px', bottom: '150px', right: 'auto' },
  { text: '👊 Toca o mantén Atacar (Espacio/J) para combos de ataque.', left: 'auto', bottom: '140px', right: '296px' },
  { text: '💨 Usa Dash (Shift/K) para esquivar y ⚡ 1/2/3 para tus habilidades.', left: 'auto', bottom: '268px', right: '20px' }
] as const;
