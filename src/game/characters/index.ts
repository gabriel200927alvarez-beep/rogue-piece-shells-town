import type { CharacterConfig } from '../config';
import type { CharacterModule } from './types';
import { luffyCharacter } from './luffy';
import { zoroCharacter } from './zoro';
import { sanjiCharacter } from './sanji';
import { usoppCharacter } from './usopp';
import { frankyCharacter } from './franky';
import { robinCharacter } from './robin';
import { lawCharacter } from './law';
import { kidCharacter } from './kid';
import { killerCharacter } from './killer';
import { shanksCharacter } from './shanks';
import { whitebeardCharacter } from './whitebeard';
import { luffyPtsCharacter } from './luffy_pts';
import { luffyG5Character } from './luffy_g5';

export const CHARACTER_LIST: CharacterModule[] = [
  luffyCharacter,
  zoroCharacter,
  sanjiCharacter,
  usoppCharacter,
  frankyCharacter,
  robinCharacter,
  lawCharacter,
  kidCharacter,
  killerCharacter,
  shanksCharacter,
  whitebeardCharacter,
  luffyPtsCharacter,
  luffyG5Character
];

export const CHARACTER_MODULES: Record<string, CharacterModule> = Object.fromEntries(
  CHARACTER_LIST.map((mod) => [mod.id, mod])
);

export const CHARACTERS: Record<string, CharacterConfig> = CHARACTER_MODULES;

export function getCharacterModule(id: string): CharacterModule {
  return CHARACTER_MODULES[id] || luffyCharacter;
}
