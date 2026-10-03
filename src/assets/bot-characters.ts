import type { PokemonSpecies } from './pokemon';

// The five bot levels, slowest first; their speeds and error rates live in gameConfig.bots.levels.
export const botLevels = ['beginner', 'easy', 'medium', 'hard', 'expert'] as const;

export type BotLevel = (typeof botLevels)[number];

type BotCharacterEntry = { id: string; level: BotLevel; name: { fr: string; en: string }; pokemon: PokemonSpecies };

// Official French and English names, Generations 1 to 5, each with a signature Pokémon. Its Pokémon is only drawn: species never change a bot's speed.
// beginner: 1st and 2nd gym leaders; easy: 3rd and 4th; medium: 5th and 6th; hard: 7th and 8th plus villain-team admins;
// expert: villain-team bosses with their legendary. Giovanni, Kanto's 8th leader, races as an expert boss only.
export const botCharacters = [
  { id: 'brock', level: 'beginner', name: { fr: 'Pierre', en: 'Brock' }, pokemon: 'onix' },
  { id: 'misty', level: 'beginner', name: { fr: 'Ondine', en: 'Misty' }, pokemon: 'starmie' },
  { id: 'falkner', level: 'beginner', name: { fr: 'Albert', en: 'Falkner' }, pokemon: 'pidgeotto' },
  { id: 'bugsy', level: 'beginner', name: { fr: 'Hector', en: 'Bugsy' }, pokemon: 'scyther' },
  { id: 'roxanne', level: 'beginner', name: { fr: 'Roxanne', en: 'Roxanne' }, pokemon: 'nosepass' },
  { id: 'brawly', level: 'beginner', name: { fr: 'Bastien', en: 'Brawly' }, pokemon: 'makuhita' },
  { id: 'roark', level: 'beginner', name: { fr: 'Pierrick', en: 'Roark' }, pokemon: 'cranidos' },
  { id: 'gardenia', level: 'beginner', name: { fr: 'Flo', en: 'Gardenia' }, pokemon: 'roserade' },
  { id: 'cilan', level: 'beginner', name: { fr: 'Rachid', en: 'Cilan' }, pokemon: 'pansage' },
  { id: 'chili', level: 'beginner', name: { fr: 'Armando', en: 'Chili' }, pokemon: 'pansear' },
  { id: 'cress', level: 'beginner', name: { fr: 'Noa', en: 'Cress' }, pokemon: 'panpour' },
  { id: 'lenora', level: 'beginner', name: { fr: 'Aloé', en: 'Lenora' }, pokemon: 'watchog' },
  { id: 'lt-surge', level: 'easy', name: { fr: 'Major Bob', en: 'Lt. Surge' }, pokemon: 'raichu' },
  { id: 'erika', level: 'easy', name: { fr: 'Érika', en: 'Erika' }, pokemon: 'vileplume' },
  { id: 'whitney', level: 'easy', name: { fr: 'Blanche', en: 'Whitney' }, pokemon: 'miltank' },
  { id: 'morty', level: 'easy', name: { fr: 'Mortimer', en: 'Morty' }, pokemon: 'gengar' },
  { id: 'wattson', level: 'easy', name: { fr: 'Voltère', en: 'Wattson' }, pokemon: 'manectric' },
  { id: 'flannery', level: 'easy', name: { fr: 'Adriane', en: 'Flannery' }, pokemon: 'torkoal' },
  { id: 'maylene', level: 'easy', name: { fr: 'Mélina', en: 'Maylene' }, pokemon: 'lucario' },
  { id: 'crasher-wake', level: 'easy', name: { fr: 'Lovis', en: 'Crasher Wake' }, pokemon: 'floatzel' },
  { id: 'burgh', level: 'easy', name: { fr: 'Artie', en: 'Burgh' }, pokemon: 'leavanny' },
  { id: 'elesa', level: 'easy', name: { fr: 'Inezia', en: 'Elesa' }, pokemon: 'zebstrika' },
  { id: 'koga', level: 'medium', name: { fr: 'Koga', en: 'Koga' }, pokemon: 'weezing' },
  { id: 'sabrina', level: 'medium', name: { fr: 'Morgane', en: 'Sabrina' }, pokemon: 'alakazam' },
  { id: 'chuck', level: 'medium', name: { fr: 'Chuck', en: 'Chuck' }, pokemon: 'poliwrath' },
  { id: 'jasmine', level: 'medium', name: { fr: 'Jasmine', en: 'Jasmine' }, pokemon: 'steelix' },
  { id: 'norman', level: 'medium', name: { fr: 'Norman', en: 'Norman' }, pokemon: 'slaking' },
  { id: 'winona', level: 'medium', name: { fr: 'Alizée', en: 'Winona' }, pokemon: 'altaria' },
  { id: 'fantina', level: 'medium', name: { fr: 'Kiméra', en: 'Fantina' }, pokemon: 'mismagius' },
  { id: 'byron', level: 'medium', name: { fr: 'Charles', en: 'Byron' }, pokemon: 'bastiodon' },
  { id: 'clay', level: 'medium', name: { fr: 'Bardane', en: 'Clay' }, pokemon: 'excadrill' },
  { id: 'skyla', level: 'medium', name: { fr: 'Carolina', en: 'Skyla' }, pokemon: 'swanna' },
  { id: 'blaine', level: 'hard', name: { fr: 'Auguste', en: 'Blaine' }, pokemon: 'arcanine' },
  { id: 'pryce', level: 'hard', name: { fr: 'Frédo', en: 'Pryce' }, pokemon: 'piloswine' },
  { id: 'clair', level: 'hard', name: { fr: 'Sandra', en: 'Clair' }, pokemon: 'kingdra' },
  { id: 'tate-and-liza', level: 'hard', name: { fr: 'Lévy & Tatia', en: 'Tate & Liza' }, pokemon: 'lunatone' },
  { id: 'wallace', level: 'hard', name: { fr: 'Marc', en: 'Wallace' }, pokemon: 'milotic' },
  { id: 'candice', level: 'hard', name: { fr: 'Gladys', en: 'Candice' }, pokemon: 'froslass' },
  { id: 'volkner', level: 'hard', name: { fr: 'Tanguy', en: 'Volkner' }, pokemon: 'luxray' },
  { id: 'brycen', level: 'hard', name: { fr: 'Zhu', en: 'Brycen' }, pokemon: 'beartic' },
  { id: 'drayden', level: 'hard', name: { fr: 'Watson', en: 'Drayden' }, pokemon: 'haxorus' },
  { id: 'archer', level: 'hard', name: { fr: 'Amos', en: 'Archer' }, pokemon: 'houndoom' },
  { id: 'ariana', level: 'hard', name: { fr: 'Ariane', en: 'Ariana' }, pokemon: 'arbok' },
  { id: 'tabitha', level: 'hard', name: { fr: 'Kelvin', en: 'Tabitha' }, pokemon: 'camerupt' },
  { id: 'mars', level: 'hard', name: { fr: 'Mars', en: 'Mars' }, pokemon: 'purugly' },
  { id: 'jupiter', level: 'hard', name: { fr: 'Jupiter', en: 'Jupiter' }, pokemon: 'skuntank' },
  { id: 'saturn', level: 'hard', name: { fr: 'Saturne', en: 'Saturn' }, pokemon: 'toxicroak' },
  { id: 'giovanni', level: 'expert', name: { fr: 'Giovanni', en: 'Giovanni' }, pokemon: 'mewtwo' },
  { id: 'maxie', level: 'expert', name: { fr: 'Max', en: 'Maxie' }, pokemon: 'groudon' },
  { id: 'archie', level: 'expert', name: { fr: 'Arthur', en: 'Archie' }, pokemon: 'kyogre' },
  { id: 'cyrus', level: 'expert', name: { fr: 'Hélio', en: 'Cyrus' }, pokemon: 'dialga' },
  { id: 'ghetsis', level: 'expert', name: { fr: 'Ghetis', en: 'Ghetsis' }, pokemon: 'kyurem' },
  { id: 'n', level: 'expert', name: { fr: 'N', en: 'N' }, pokemon: 'zekrom' },
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
