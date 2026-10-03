'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { PokemonSpecies } from '@/assets/pokemon';
import { frameAnimationName, frameKeyframes, frontArtworkSize, spriteSheetOf, stageSizeOf, stillArtworkDexOf, type FrameSize, type SpriteAction, type SpriteSheet, type StageMode } from './sprite-sheet';
import { useSpriteMotion } from './SpriteMotion';

export type SpriteDirection = 'south' | 'southwest' | 'west' | 'northwest' | 'north' | 'northeast' | 'east' | 'southeast';
const directionRows: Record<SpriteDirection, number> = { south: 0, southwest: 1, west: 2, northwest: 3, north: 4, northeast: 5, east: 6, southeast: 7 };
const decorativeAlt = '';

type Scale = 1 | 2 | 3;
type Props = { species: PokemonSpecies; action?: SpriteAction; direction?: SpriteDirection; scale?: Scale; animated?: boolean; playbackRate?: number; stage?: StageMode };

// Actual source pixels are clipped, never resampled. The compact stage keeps idle/walk size changes from shifting labels; fit and largest grow it for tall species.
export function PokemonSprite({ species, action = 'idle', direction = 'south', scale = 2, animated = false, playbackRate = 1, stage = 'compact' }: Props) {
  const sheet = spriteSheetOf(species, action);
  if (sheet === null) return <StillSprite species={species} action={action} direction={direction} scale={scale} stage={stage} />;
  const box = stageSizeOf(sheet, stage);
  return (
    <span aria-hidden="true" className="pokemon-stage" data-species={species} data-action={action} data-direction={direction} style={stageStyle(box, scale)}>
      <span className="pokemon-frame" style={{ width: sheet.width * scale, height: sheet.height * scale, top: frameTop(sheet, box, stage) * scale }}>
        <AnimatedSheet sheet={sheet} direction={direction} scale={scale} animated={animated} playbackRate={playbackRate} />
      </span>
    </span>
  );
}

function stageStyle(box: FrameSize, scale: Scale): CSSProperties {
  return { width: box.width * scale, height: box.height * scale };
}

// Compact stages leave room above the feet; fit stages sit the frame on the floor; the largest stage centres it.
function frameTop(frame: FrameSize, box: FrameSize, stage: StageMode): number {
  if (stage === 'largest') return (box.height - frame.height) / 2;
  if (stage === 'fit') return box.height - frame.height;
  return 8;
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
function StillSprite({ species, action, direction, scale, stage }: { species: PokemonSpecies; action: SpriteAction; direction: SpriteDirection; scale: Scale; stage: StageMode }) {
  const size = (frontArtworkSize * scale) / 2;
  const box = stageSizeOf({ width: frontArtworkSize / 2, height: frontArtworkSize / 2 }, stage);
  const alignment = stage === 'largest' ? 'center' : undefined;
  return (
    <span aria-hidden="true" className="pokemon-stage pokemon-still" data-species={species} data-action={action} data-direction={direction} style={{ ...stageStyle(box, scale), alignItems: alignment }}>
      <Image src={`/assets/sprites/pokemon/front/${stillArtworkDexOf(species)}.png`} alt={decorativeAlt} width={size} height={size} unoptimized loading="eager" draggable={false} className="pixelated max-w-none" style={{ transform: direction.includes('east') ? 'scaleX(-1)' : undefined }} />
    </span>
  );
}
