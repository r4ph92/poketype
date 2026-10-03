'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { PokemonSpecies } from '@/assets/pokemon';
import type { SpriteBox } from './sprite-boxes';
import { frameAnimationName, frameKeyframes, frontArtworkSize, largestFrameOf, scaleToFit, spriteSheetOf, stageSizeOf, stillArtworkDexOf, stillFrame, type FrameSize, type SpriteAction, type SpriteSheet, type StageMode } from './sprite-sheet';
import { useSpriteMotion } from './SpriteMotion';

export type SpriteDirection = 'south' | 'southwest' | 'west' | 'northwest' | 'north' | 'northeast' | 'east' | 'southeast';
const directionRows: Record<SpriteDirection, number> = { south: 0, southwest: 1, west: 2, northwest: 3, north: 4, northeast: 5, east: 6, southeast: 7 };
const decorativeAlt = '';

type Scale = 1 | 2 | 3;
type Props = { species: PokemonSpecies; action?: SpriteAction; direction?: SpriteDirection; scale?: Scale; animated?: boolean; playbackRate?: number; stage?: StageMode; box?: SpriteBox };

// Actual source pixels are clipped, never resampled. The compact stage keeps idle/walk size changes from shifting labels; fit grows it for tall species.
// With a box the stage is that fixed size and the Pokémon is drawn centred at the largest whole-number scale that fits.
export function PokemonSprite({ species, action = 'idle', direction = 'south', scale = 2, animated = false, playbackRate = 1, stage = 'compact', box }: Props) {
  const drawScale = box ? scaleToFit(largestFrameOf(species), box) : scale;
  const sheet = spriteSheetOf(species, action);
  const frame = sheet ?? stillFrame;
  const layout = layoutOf(frame, drawScale, stage, box);
  if (sheet === null) return <StillSprite species={species} action={action} direction={direction} scale={drawScale} layout={layout} centred={box !== undefined} />;
  return (
    <span aria-hidden="true" className="pokemon-stage" data-species={species} data-action={action} data-direction={direction} data-scale={drawScale} style={layout.stage}>
      <span className="pokemon-frame" style={{ width: sheet.width * drawScale, height: sheet.height * drawScale, top: layout.top }}>
        <AnimatedSheet sheet={sheet} direction={direction} scale={drawScale} animated={animated} playbackRate={playbackRate} />
      </span>
    </span>
  );
}

type Layout = { stage: { width: number; height: number }; top: number };

// Compact stages leave room above the feet; fit stages sit the frame on the floor; a box centres it.
function layoutOf(frame: FrameSize, scale: Scale, stage: StageMode, box: SpriteBox | undefined): Layout {
  if (box) return { stage: { width: box.width, height: box.height }, top: (box.height - frame.height * scale) / 2 };
  const size = stageSizeOf(frame, stage);
  return { stage: { width: size.width * scale, height: size.height * scale }, top: (stage === 'fit' ? size.height - frame.height : 8) * scale };
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
function StillSprite({ species, action, direction, scale, layout, centred }: { species: PokemonSpecies; action: SpriteAction; direction: SpriteDirection; scale: Scale; layout: Layout; centred: boolean }) {
  const size = (frontArtworkSize * scale) / 2;
  return (
    <span aria-hidden="true" className="pokemon-stage pokemon-still" data-species={species} data-action={action} data-direction={direction} data-scale={scale} style={{ ...layout.stage, alignItems: centred ? 'center' : undefined }}>
      <Image src={`/assets/sprites/pokemon/front/${stillArtworkDexOf(species)}.png`} alt={decorativeAlt} width={size} height={size} unoptimized loading="eager" draggable={false} className="pixelated max-w-none" style={{ transform: direction.includes('east') ? 'scaleX(-1)' : undefined }} />
    </span>
  );
}
