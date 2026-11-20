import type { ReactNode } from 'react';
import { PlayerAvatar } from '@/components/pixel/PlayerAvatar';
import { PokemonSprite } from '@/components/pixel/PokemonSprite';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import type { Racer } from './racers';

type RaceRosterLabels = { place: string; you: string; bot: string; wpm: string; bonus?: string };

type RaceRosterRowProps = { racer: Racer; labels: RaceRosterLabels; status: ReactNode; action?: ReactNode };

// One line per racer, so thirty fit in a short frame; the "fit" sprite stage grows the row only for a tall Pokémon, so no Pokémon is ever cut off. The viewer's row is marked twice, by its gold background and by the "Toi" badge.
// A bonus badge takes its own line under the name, so however long its label it never covers the WPM or the progress.
export function RaceRosterRow({ racer, labels, status, action }: RaceRosterRowProps) {
  return (
    <li className="race-roster-row" data-roster-member={racer.memberKey} data-viewer={racer.isViewer || undefined} data-bot={racer.bot ? true : undefined}>
      <span className="font-pixel font-bold tabular-nums">{labels.place}</span>
      <span className="race-roster-face"><PlayerAvatar seed={racer.avatarSeed} trainer={racer.trainerAvatar} size="small" /></span>
      <span className="race-roster-avatar">{racer.partner && <PokemonSprite species={racer.partner} scale={1} stage="fit" animated={false} />}</span>
      <span className="race-roster-name">
        <span className="race-roster-trainer" title={racer.trainerName}>{racer.trainerName}</span>
        {racer.bot && <ProgressBadge>{labels.bot}</ProgressBadge>}
        {racer.isViewer && <ProgressBadge variant="you">{labels.you}</ProgressBadge>}
      </span>
      <span className="race-roster-wpm font-bold tabular-nums">{labels.wpm}</span>
      <span className="race-roster-status">{status}{action}</span>
      {labels.bonus && <span data-bonus-badge className="race-roster-bonus whitespace-nowrap"><ProgressBadge variant="bonus">{labels.bonus}</ProgressBadge></span>}
    </li>
  );
}
