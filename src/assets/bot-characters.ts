import type { PokemonSpecies } from './pokemon';

// The five bot levels, slowest first; their speeds and error rates live in gameConfig.bots.levels.
export const botLevels = ['noob', 'novice', 'intermediate', 'expert', 'impossible'] as const;

export type BotLevel = (typeof botLevels)[number];

type BotCharacterEntry = { id: string; level: BotLevel; name: { fr: string; en: string }; pokemon: PokemonSpecies };

// Official French and English names, Generations 1 to 5, each with a signature Pokémon. Its Pokémon is only drawn: species never change a bot's speed.
// noob: 1st and 2nd gym leaders; novice: 3rd and 4th; intermediate: 5th and 6th; expert: 7th and 8th plus villain-team admins;
// impossible: villain-team bosses with their legendary. Giovanni, Kanto's 8th leader, races as a boss only.
export const botCharacters = [
  { id: 'brock', level: 'noob', name: { fr: 'Pierre', en: 'Brock' }, pokemon: 'onix' },
  { id: 'misty', level: 'noob', name: { fr: 'Ondine', en: 'Misty' }, pokemon: 'starmie' },
  { id: 'falkner', level: 'noob', name: { fr: 'Albert', en: 'Falkner' }, pokemon: 'pidgeotto' },
  { id: 'bugsy', level: 'noob', name: { fr: 'Hector', en: 'Bugsy' }, pokemon: 'scyther' },
  { id: 'roxanne', level: 'noob', name: { fr: 'Roxanne', en: 'Roxanne' }, pokemon: 'nosepass' },
  { id: 'brawly', level: 'noob', name: { fr: 'Bastien', en: 'Brawly' }, pokemon: 'makuhita' },
  { id: 'roark', level: 'noob', name: { fr: 'Pierrick', en: 'Roark' }, pokemon: 'cranidos' },
  { id: 'gardenia', level: 'noob', name: { fr: 'Flo', en: 'Gardenia' }, pokemon: 'roserade' },
  { id: 'cilan', level: 'noob', name: { fr: 'Rachid', en: 'Cilan' }, pokemon: 'pansage' },
  { id: 'chili', level: 'noob', name: { fr: 'Armando', en: 'Chili' }, pokemon: 'pansear' },
  { id: 'cress', level: 'noob', name: { fr: 'Noa', en: 'Cress' }, pokemon: 'panpour' },
  { id: 'lenora', level: 'noob', name: { fr: 'Aloé', en: 'Lenora' }, pokemon: 'watchog' },
  { id: 'lt-surge', level: 'novice', name: { fr: 'Major Bob', en: 'Lt. Surge' }, pokemon: 'raichu' },
  { id: 'erika', level: 'novice', name: { fr: 'Érika', en: 'Erika' }, pokemon: 'vileplume' },
  { id: 'whitney', level: 'novice', name: { fr: 'Blanche', en: 'Whitney' }, pokemon: 'miltank' },
  { id: 'morty', level: 'novice', name: { fr: 'Mortimer', en: 'Morty' }, pokemon: 'gengar' },
  { id: 'wattson', level: 'novice', name: { fr: 'Voltère', en: 'Wattson' }, pokemon: 'manectric' },
  { id: 'flannery', level: 'novice', name: { fr: 'Adriane', en: 'Flannery' }, pokemon: 'torkoal' },
  { id: 'maylene', level: 'novice', name: { fr: 'Mélina', en: 'Maylene' }, pokemon: 'lucario' },
  { id: 'crasher-wake', level: 'novice', name: { fr: 'Lovis', en: 'Crasher Wake' }, pokemon: 'floatzel' },
  { id: 'burgh', level: 'novice', name: { fr: 'Artie', en: 'Burgh' }, pokemon: 'leavanny' },
  { id: 'elesa', level: 'novice', name: { fr: 'Inezia', en: 'Elesa' }, pokemon: 'zebstrika' },
  { id: 'koga', level: 'intermediate', name: { fr: 'Koga', en: 'Koga' }, pokemon: 'weezing' },
  { id: 'sabrina', level: 'intermediate', name: { fr: 'Morgane', en: 'Sabrina' }, pokemon: 'alakazam' },
  { id: 'chuck', level: 'intermediate', name: { fr: 'Chuck', en: 'Chuck' }, pokemon: 'poliwrath' },
  { id: 'jasmine', level: 'intermediate', name: { fr: 'Jasmine', en: 'Jasmine' }, pokemon: 'steelix' },
  { id: 'norman', level: 'intermediate', name: { fr: 'Norman', en: 'Norman' }, pokemon: 'slaking' },
  { id: 'winona', level: 'intermediate', name: { fr: 'Alizée', en: 'Winona' }, pokemon: 'altaria' },
  { id: 'fantina', level: 'intermediate', name: { fr: 'Kiméra', en: 'Fantina' }, pokemon: 'mismagius' },
  { id: 'byron', level: 'intermediate', name: { fr: 'Charles', en: 'Byron' }, pokemon: 'bastiodon' },
  { id: 'clay', level: 'intermediate', name: { fr: 'Bardane', en: 'Clay' }, pokemon: 'excadrill' },
  { id: 'skyla', level: 'intermediate', name: { fr: 'Carolina', en: 'Skyla' }, pokemon: 'swanna' },
  { id: 'blaine', level: 'expert', name: { fr: 'Auguste', en: 'Blaine' }, pokemon: 'arcanine' },
  { id: 'pryce', level: 'expert', name: { fr: 'Frédo', en: 'Pryce' }, pokemon: 'piloswine' },
  { id: 'clair', level: 'expert', name: { fr: 'Sandra', en: 'Clair' }, pokemon: 'kingdra' },
  { id: 'tate-and-liza', level: 'expert', name: { fr: 'Lévy & Tatia', en: 'Tate & Liza' }, pokemon: 'lunatone' },
  { id: 'wallace', level: 'expert', name: { fr: 'Marc', en: 'Wallace' }, pokemon: 'milotic' },
  { id: 'candice', level: 'expert', name: { fr: 'Gladys', en: 'Candice' }, pokemon: 'froslass' },
  { id: 'volkner', level: 'expert', name: { fr: 'Tanguy', en: 'Volkner' }, pokemon: 'luxray' },
  { id: 'brycen', level: 'expert', name: { fr: 'Zhu', en: 'Brycen' }, pokemon: 'beartic' },
  { id: 'drayden', level: 'expert', name: { fr: 'Watson', en: 'Drayden' }, pokemon: 'haxorus' },
  { id: 'archer', level: 'expert', name: { fr: 'Amos', en: 'Archer' }, pokemon: 'houndoom' },
  { id: 'ariana', level: 'expert', name: { fr: 'Ariane', en: 'Ariana' }, pokemon: 'arbok' },
  { id: 'tabitha', level: 'expert', name: { fr: 'Kelvin', en: 'Tabitha' }, pokemon: 'camerupt' },
  { id: 'mars', level: 'expert', name: { fr: 'Mars', en: 'Mars' }, pokemon: 'purugly' },
  { id: 'jupiter', level: 'expert', name: { fr: 'Jupiter', en: 'Jupiter' }, pokemon: 'skuntank' },
  { id: 'saturn', level: 'expert', name: { fr: 'Saturne', en: 'Saturn' }, pokemon: 'toxicroak' },
  { id: 'giovanni', level: 'impossible', name: { fr: 'Giovanni', en: 'Giovanni' }, pokemon: 'mewtwo' },
  { id: 'maxie', level: 'impossible', name: { fr: 'Max', en: 'Maxie' }, pokemon: 'groudon' },
  { id: 'archie', level: 'impossible', name: { fr: 'Arthur', en: 'Archie' }, pokemon: 'kyogre' },
  { id: 'cyrus', level: 'impossible', name: { fr: 'Hélio', en: 'Cyrus' }, pokemon: 'dialga' },
  { id: 'ghetsis', level: 'impossible', name: { fr: 'Ghetis', en: 'Ghetsis' }, pokemon: 'kyurem' },
  { id: 'n', level: 'impossible', name: { fr: 'N', en: 'N' }, pokemon: 'zekrom' },
] as const satisfies readonly BotCharacterEntry[];

export type BotCharacter = (typeof botCharacters)[number];

export type BotCharacterId = BotCharacter['id'];

export function isBotLevel(value: unknown): value is BotLevel {
  return botLevels.some((level) => level === value);
}

export function isBotCharacterId(value: unknown): value is BotCharacterId {
  return botCharacters.some((character) => character.id === value);
}

export function botCharacterOf(id: BotCharacterId): BotCharacter {
  return botCharacters.find((character) => character.id === id)!;
}

export function charactersOfLevel(level: BotLevel): BotCharacter[] {
  return botCharacters.filter((character) => character.level === level);
}
