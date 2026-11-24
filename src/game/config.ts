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
