import type { PokemonSpecies } from '@/assets/pokemon';
import { gameConfig } from '@/config/game';
import { isCount, isJsonObject } from './json-guards';
import { isPokemonSpecies } from './pokemon-catalog';
import { encounterStatuses, type EncounterStatus } from './wild-encounter';

// The wild Pokémon a race put in the viewer's queue, with its status now: waiting until the viewer throws a ball at it or lets it go.
export type RaceEncounter = { species: PokemonSpecies; level: number; status: EncounterStatus };

// A legendary the race earned the viewer; isWaiting while a full PC keeps it out of the collection.
export type LegendaryArrival = { species: PokemonSpecies; isWaiting: boolean };

// undefined means malformed, so a snapshot without the field is rejected rather than read as "no encounter".
export function parseRaceEncounter(value: unknown): RaceEncounter | null | undefined {
  if (value === null) return null;
  if (!isJsonObject(value) || !isPokemonSpecies(value.species) || !isWildLevel(value.level) || !isEncounterStatus(value.status)) return undefined;
  return { species: value.species, level: value.level, status: value.status };
}

export function parseLegendaryArrivals(value: unknown): LegendaryArrival[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const arrivals = value.map(parseLegendaryArrival);
  return arrivals.every((arrival) => arrival !== null) ? arrivals : undefined;
}

function parseLegendaryArrival(value: unknown): LegendaryArrival | null {
  if (!isJsonObject(value) || !isPokemonSpecies(value.species) || typeof value.isWaiting !== 'boolean') return null;
  return { species: value.species, isWaiting: value.isWaiting };
}

function isWildLevel(value: unknown): value is number {
  return isCount(value) && value >= gameConfig.encounters.minLevel && value <= gameConfig.encounters.maxLevel;
}

function isEncounterStatus(value: unknown): value is EncounterStatus {
  return typeof value === 'string' && (encounterStatuses as readonly string[]).includes(value);
}
