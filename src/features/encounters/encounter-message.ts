import type { PokedexDex } from '@/assets/pokedex';
import type { ThrowResult } from '@/domain/encounter-throw';

export type EncounterNotice = { kind: 'throw'; result: ThrowResult } | { kind: 'let-go'; dex: PokedexDex };

// What the panel last told the trainer; attempt makes a repeated message announce again.
export type EncounterMessage = EncounterNotice & { attempt: number };
