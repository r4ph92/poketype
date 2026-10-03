'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { PokemonSpecies } from '@/assets/pokemon';
import { frameAnimationName, frameKeyframes, spriteSheetOf, stillArtworkDexOf, type SpriteAction, type SpriteSheet } from './sprite-sheet';
import { useSpriteMotion } from './SpriteMotion';

export type SpriteDirection = 'south' | 'southwest' | 'west' | 'northwest' | 'north' | 'northeast' | 'east' | 'southeast';
const directionRows: Record<SpriteDirection, number> = { south: 0, southwest: 1, west: 2, northwest: 3, north: 4, northeast: 5, east: 6, southeast: 7 };
const decorativeAlt = '';
const frontArtworkSize = 96;

type Scale = 1 | 2 | 3;
type Props = { species: PokemonSpecies; action?: SpriteAction; direction?: SpriteDirection; scale?: Scale; animated?: boolean; playbackRate?: number; sizeToFrame?: boolean };

// Actual source pixels are clipped, never resampled. A fixed stage prevents idle/walk size changes from shifting labels.
export function PokemonSprite({ species, action = 'idle', direction = 'south', scale = 2, animated = false, playbackRate = 1, sizeToFrame = false }: Props) {
  const sheet = spriteSheetOf(species, action);
  if (sheet === null) return <StillSprite species={species} action={action} direction={direction} scale={scale} />;
  const stage = { width: (sizeToFrame ? Math.max(40, sheet.width) : 40) * scale, height: (sizeToFrame ? Math.max(32, sheet.height) : 32) * scale };
  return (
    <span aria-hidden="true" className="pokemon-stage" data-species={species} data-action={action} data-direction={direction} style={stage}>
      <span className="pokemon-frame" style={{ width: sheet.width * scale, height: sheet.height * scale, top: sizeToFrame ? 0 : 8 * scale }}>
        <AnimatedSheet sheet={sheet} direction={direction} scale={scale} animated={animated} playbackRate={playbackRate} />
      </span>
    </span>
  );
}

type AnimatedSheetProps = { sheet: SpriteSheet; direction: SpriteDirection; scale: Scale; animated: boolean; playbackRate: number };

// React hoists the keyframes into the head once per timing (href dedupes them), so no page ships keyframes for species it never shows.
function AnimatedSheet({ sheet, direction, scale, animated, playbackRate }: AnimatedSheetProps) {
  const motion = useSpriteMotion();
  const animationName = frameAnimationName(sheet.durations);
  const style = {
    '--sprite-frame-width': `${sheet.width * scale}px`,
    top: -directionRows[direction] * sheet.height * scale,
    width: sheet.sheetWidth * scale,
    height: sheet.sheetHeight * scale,
    animationName,
    animationDuration: `${sheet.durations.reduce((sum, duration) => sum + duration, 0) / 60 / Math.max(0.5, Math.min(2.5, playbackRate))}s`,
    animationPlayState: motion && animated ? 'running' : 'paused',
  } as CSSProperties;
  return (
    <>
      <style href={animationName} precedence="default">{frameKeyframes(sheet.durations)}</style>
      <Image key={sheet.src} src={sheet.src} alt={decorativeAlt} width={sheet.sheetWidth * scale} height={sheet.sheetHeight * scale} unoptimized loading="eager" draggable={false} className="pokemon-sheet" style={style} />
    </>
  );
}

// Half the front artwork's size matches the animated sheets; the front artwork faces left, so it is mirrored to face east.
function StillSprite({ species, action, direction, scale }: { species: PokemonSpecies; action: SpriteAction; direction: SpriteDirection; scale: Scale }) {
  const size = (frontArtworkSize * scale) / 2;
  const stage = { width: 40 * scale, height: 32 * scale };
  return (
    <span aria-hidden="true" className="pokemon-stage pokemon-still" data-species={species} data-action={action} data-direction={direction} style={stage}>
      <Image src={`/assets/sprites/pokemon/front/${stillArtworkDexOf(species)}.png`} alt={decorativeAlt} width={size} height={size} unoptimized loading="eager" draggable={false} className="pixelated max-w-none" style={{ transform: direction.includes('east') ? 'scaleX(-1)' : undefined }} />
    </span>
  );
}
