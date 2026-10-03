'use client';

import type { RoomMemberView } from '@/domain/room-view';
import { routeDirection, routePosition } from '@/domain/route-position';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { scaleForSpecies } from '@/components/pixel/sprite-sheet';
import { TrainerAvatar } from '@/components/pixel/TrainerAvatar';
import { useRouteMotion } from './use-route-motion';

// Big species race at scale 1, so no racer is taller or wider than the largest frame.
const racerSpriteBox = { width: 96, height: 96 };

// Racers sharing the route stand this many pixels apart, so the scene reserves it beside the art.
export const racerStaggerPixels = 22;

type Props = { member: RoomMemberView; index: number; passageLength: number; youLabel?: string; mode: 'race' | 'lobby' | 'camp' };
export function RouteRacer({ member, index, passageLength, youLabel, mode }: Props) {
  const target = Math.min(1, Math.max(0, (member.progress?.position ?? 0) / Math.max(1, passageLength)));
  const { progress, walking, playbackRate } = useRouteMotion(target, passageLength);
  const point = mode === 'race' ? routePosition(progress) : { x: 180 + (index % 3) * 200, y: 245 + Math.floor(index / 3) * 90 };
  const direction = mode === 'race' && target < 1 ? routeDirection(progress) : 'south';
  return (
    <div data-racer={member.memberKey} data-playback-rate={playbackRate} data-viewer={member.isViewer || undefined} className="route-player" style={{ left: `${point.x / 8}%`, top: `${point.y / 4.4}%`, marginLeft: mode === 'race' ? (index % 3 - 1) * racerStaggerPixels : 0 }}>
      <span data-viewer={member.isViewer || undefined} className={`route-name ${member.isViewer ? 'bg-gold' : 'bg-cream'}`}>{member.isViewer ? youLabel ?? member.trainerName : member.trainerName}</span>
      <div className="route-companions">
        {mode === 'lobby' && <TrainerAvatar />}
        {mode === 'race' && <OverworldTrainer avatar={member.trainerAvatar ?? defaultTrainerAvatar} scale={2} facing={direction === 'east' ? 'east' : 'south'} />}
        {member.partner && <PokemonSprite species={member.partner} scale={scaleForSpecies(member.partner, racerSpriteBox, 2)} stage="fit" direction={direction} action={walking ? 'walk' : 'idle'} animated={mode === 'race' && walking} playbackRate={playbackRate} />}
      </div>
    </div>
  );
}
