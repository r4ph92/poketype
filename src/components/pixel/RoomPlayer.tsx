import type { ReactNode } from 'react';
import { ProgressBadge } from './ProgressBadge';
import type { PokemonSpecies } from '@/assets/pokemon';
import { PokemonSprite } from './PokemonSprite';

type RoomPlayerLabels = { hostBadge: string; you: string; bot: string };

type RoomPlayerRole = { isHost: boolean; isViewer: boolean; isBot: boolean };

type RoomPlayerProps = { partner: PokemonSpecies | null; name: string; role: RoomPlayerRole; labels: RoomPlayerLabels; status?: ReactNode };

const rowClass = {
  viewer: 'border-2 border-frame bg-gold text-on-gold',
  other: 'border-2 border-transparent',
} as const;

export function RoomPlayer({ partner, name, role: { isHost, isViewer, isBot }, labels, status }: RoomPlayerProps) {
  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-2 p-2 ${rowClass[isViewer ? 'viewer' : 'other']}`}>
      {partner && <PokemonSprite species={partner} scale={1} animated={false} />}
      <span className="min-w-0 flex-1 basis-32 wrap-anywhere">{name}</span>
      <span className="flex shrink-0 flex-wrap gap-2">
        {isBot && <ProgressBadge>{labels.bot}</ProgressBadge>}
        {isHost && <ProgressBadge variant="host">{labels.hostBadge}</ProgressBadge>}
        {isViewer && <ProgressBadge variant="you">{labels.you}</ProgressBadge>}
      </span>
      {status && <span className="ms-auto flex shrink-0 flex-wrap items-center gap-2">{status}</span>}
    </li>
  );
}
