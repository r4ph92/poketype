'use client';

import type { RoomMemberView } from '@/domain/room-view';
import { racerSpecies } from '@/domain/racer-appearance';
import { routeDirection, routePosition } from '@/domain/route-position';
import { defaultTrainerAvatar } from '@/assets/trainers';
import { OverworldTrainer } from '@/components/pixel/OverworldTrainer';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { TrainerAvatar } from '@/components/pixel/TrainerAvatar';
import { useRouteMotion } from './use-route-motion';

type Props = { member: RoomMemberView; index: number; passageLength: number; youLabel?: string; mode: 'race' | 'lobby' | 'camp' };
export function RouteRacer({ member, index, passageLength, youLabel, mode }: Props) {
  const target = Math.min(1, Math.max(0, (member.progress?.position ?? 0) / Math.max(1, passageLength)));
  const { progress, walking, playbackRate } = useRouteMotion(target, passageLength);
  const point = mode === 'race' ? routePosition(progress) : { x: 180 + (index % 3) * 200, y: 245 + Math.floor(index / 3) * 90 };
  const direction = mode === 'race' && target < 1 ? routeDirection(progress) : 'south';
  return (
    <div data-racer={member.memberKey} data-playback-rate={playbackRate} data-viewer={member.isViewer || undefined} className="route-player" style={{ left: `${point.x / 8}%`, top: `${point.y / 4.4}%`, marginLeft: mode === 'race' ? (index % 3 - 1) * 22 : 0 }}>
      <span data-viewer={member.isViewer || undefined} className={`route-name ${member.isViewer ? 'bg-gold' : 'bg-cream'}`}>{member.isViewer ? youLabel ?? member.trainerName : member.trainerName}</span>
      <div className="route-companions">
        {mode === 'lobby' && <TrainerAvatar />}
        {mode === 'race' && <OverworldTrainer avatar={member.trainerAvatar ?? defaultTrainerAvatar} scale={2} facing={direction === 'east' ? 'east' : 'south'} />}
        <PokemonSprite species={racerSpecies(member.memberKey)} direction={direction} action={walking ? 'walk' : 'idle'} animated={mode === 'race' && walking} playbackRate={playbackRate} />
      </div>
    </div>
  );
}
