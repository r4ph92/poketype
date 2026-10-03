import { pokemonSprites, type PokemonSpecies } from '@/assets/pokemon';

export type SpriteAction = 'idle' | 'walk';

// One animated sheet: frames side by side, one row per direction; durations are in 1/60 second.
export type SpriteSheet = { src: string; width: number; height: number; sheetWidth: number; sheetHeight: number; durations: readonly number[] };

type SheetSource = { state?: string; width: number; height: number; durations: readonly number[] };

const directionRows = 8;

const defaultStates: Record<SpriteAction, string> = { idle: 'Idle', walk: 'Walk' };

// null when the species has no animated sheets upstream and is shown with its still front artwork.
export function spriteSheetOf(species: PokemonSpecies, action: SpriteAction): SpriteSheet | null {
  const sheets = pokemonSprites[species];
  if ('still' in sheets) return null;
  const source: SheetSource = sheets[action];
  const state = source.state ?? defaultStates[action];
  return {
    src: `/assets/sprites/pokemon/${species}/${state}-Anim.png`,
    width: source.width,
    height: source.height,
    sheetWidth: source.width * source.durations.length,
    sheetHeight: source.height * directionRows,
    durations: source.durations,
  };
}

// The Pokédex number whose front artwork stands in for a species without sheets.
export function stillArtworkDexOf(species: PokemonSpecies): number | null {
  const sheets = pokemonSprites[species];
  return 'still' in sheets ? sheets.still : null;
}

// Keyframes depend only on the frame timing, so every sheet with the same timing shares one animation.
export function frameAnimationName(durations: readonly number[]): string {
  return `sprite-frames-${durations.join('-')}`;
}

export function frameKeyframes(durations: readonly number[]): string {
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  let elapsed = 0;
  const steps = durations.map((duration, index) => {
    const step = `${((elapsed / total) * 100).toFixed(6)}%{transform:translateX(calc(var(--sprite-frame-width) * -${index}))}`;
    elapsed += duration;
    return step;
  });
  return `@keyframes ${frameAnimationName(durations)}{${steps.join('')}100%{transform:translateX(0)}}`;
}
