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

export type FrameSize = { width: number; height: number };

// The front artwork of a species without sheets is drawn at half its 96 px size, like the animated sheets.
export const frontArtworkSize = 96;
const stillFrame: FrameSize = { width: frontArtworkSize / 2, height: frontArtworkSize / 2 };

// The compact stage keeps labels from shifting when idle and walk frames differ; giants outgrow it.
export const compactStage: FrameSize = { width: 40, height: 32 };

export type StageMode = 'compact' | 'fit' | 'largest';

export function frameOf(species: PokemonSpecies, action: SpriteAction): FrameSize {
  return spriteSheetOf(species, action) ?? stillFrame;
}

// The biggest frame any species draws in any action, derived from the sprite data so a new species never needs a new number.
export const largestFrame: FrameSize = Object.keys(pokemonSprites).reduce<FrameSize>((largest, name) => {
  const species = name as PokemonSpecies;
  const frames = [frameOf(species, 'idle'), frameOf(species, 'walk')];
  return frames.reduce((best, frame) => ({ width: Math.max(best.width, frame.width), height: Math.max(best.height, frame.height) }), largest);
}, stillFrame);

// Stage size in sprite pixels. compact: a fixed box; fit: grows to hold this frame; largest: holds the biggest frame of the catalogue.
export function stageSizeOf(frame: FrameSize, mode: StageMode): FrameSize {
  if (mode === 'largest') return largestFrame;
  if (mode === 'fit') return { width: Math.max(compactStage.width, frame.width), height: Math.max(compactStage.height, frame.height) };
  return compactStage;
}

// Same as integerScaleToFit for the bigger of a species' idle and walk frames, so switching action never outgrows the box.
export function scaleForSpecies(species: PokemonSpecies, box: FrameSize, preferred: 1 | 2 | 3): 1 | 2 | 3 {
  const [idle, walk] = [frameOf(species, 'idle'), frameOf(species, 'walk')];
  return integerScaleToFit({ width: Math.max(idle.width, walk.width), height: Math.max(idle.height, walk.height) }, box, preferred);
}

// The largest whole-number scale, at most preferred, that keeps the frame inside a box; never below 1, never a fraction.
export function integerScaleToFit(frame: FrameSize, box: FrameSize, preferred: 1 | 2 | 3): 1 | 2 | 3 {
  const scales = [3, 2, 1] as const;
  return scales.find((scale) => scale <= preferred && frame.width * scale <= box.width && frame.height * scale <= box.height) ?? 1;
}
