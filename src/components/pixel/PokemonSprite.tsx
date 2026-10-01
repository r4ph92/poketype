'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { pokemonArtwork, type PokemonSpecies } from '@/assets/pokemon';
import { useSpriteMotion } from './SpriteMotion';

export type SpriteDirection = 'south' | 'southwest' | 'west' | 'northwest' | 'north' | 'northeast' | 'east' | 'southeast';
const directionRows: Record<SpriteDirection, number> = { south: 0, southwest: 1, west: 2, northwest: 3, north: 4, northeast: 5, east: 6, southeast: 7 };
const decorativeAlt = '';

type Props = { species: PokemonSpecies; action?: 'idle' | 'walk'; direction?: SpriteDirection; scale?: 1 | 2 | 3; animated?: boolean; playbackRate?: number; sizeToFrame?: boolean };
// Actual source pixels are clipped, never resampled. A fixed stage prevents idle/walk size changes from shifting labels.
export function PokemonSprite({ species, action = 'idle', direction = 'south', scale = 2, animated = false, playbackRate = 1, sizeToFrame = false }: Props) {
  const motion = useSpriteMotion();
  const sheet = pokemonArtwork[species][action];
  const style = {
    '--sprite-frame-width': `${sheet.width * scale}px`,
    top: -directionRows[direction] * sheet.height * scale,
    width: sheet.sheetWidth * scale,
    height: sheet.sheetHeight * scale,
    animationName: `sprite-${species}-${action}`,
    animationDuration: `${sheet.durations.reduce((sum: number, duration: number) => sum + duration, 0) / 60 / Math.max(0.5, Math.min(2.5, playbackRate))}s`,
    animationPlayState: motion && animated ? 'running' : 'paused',
  } as CSSProperties;
  return (
    <span aria-hidden="true" className="pokemon-stage" data-species={species} data-action={action} data-direction={direction} style={{ width: (sizeToFrame ? Math.max(40, sheet.width) : 40) * scale, height: (sizeToFrame ? Math.max(32, sheet.height) : 32) * scale }}>
      <span className="pokemon-frame" style={{ width: sheet.width * scale, height: sheet.height * scale, top: sizeToFrame ? 0 : 8 * scale }}>
        <Image key={sheet.src} src={sheet.src} alt={decorativeAlt} width={sheet.sheetWidth * scale} height={sheet.sheetHeight * scale} unoptimized loading="eager" draggable={false} className="pokemon-sheet" style={style} />
      </span>
    </span>
  );
}
