'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomId } from '@/domain/room-id';
import { RemovePlayerButton } from '@/features/rooms/RemovePlayerButton';
import type { CatchUpBonusView } from '@/domain/catch-up-bonus-view';
import { liveWpmOf, type LiveWpmClock } from './live-wpm';
import { bonusLabelKey } from './race-bonus-announcements';
import { formatWholeNumber, missingValueDash } from './race-number-format';
import { placedRacers } from './race-leaders';
import type { Racer } from './racers';
import { RacerStatus } from './RacerStatus';
import { RaceRosterRow } from './RaceRosterRow';
import { useBotLabel } from '@/features/rooms/bots/bot-label';

type RaceRosterProps = { roomId: RoomId; racers: Racer[]; clock: LiveWpmClock; isReconnecting: boolean; removableKeys: ReadonlySet<string>; announcedBonuses: ReadonlyMap<string, CatchUpBonusView> };

// Every racer on one line in live order, with their WPM; the list scrolls inside its own frame so thirty racers never push the page.
// A racer who just got a catch-up bonus shows its short name on their line, for everyone, for a few seconds (BONUS-03); "Brouillard" shows on the
// line of the leader it blurs. The status region says it in full.
// The host sees "Retirer" only next to a racer who has typed nothing for a minute; the server checks the same rule.
export function RaceRoster({ roomId, racers, clock, isReconnecting, removableKeys, announcedBonuses }: RaceRosterProps) {
  const t = useTranslations('Room');
  const botLabel = useBotLabel();
  const format = useFormatter();
  return (
    <PixelPanel titleId="players-heading" title={t('playersHeading')} meta={t('playerCount', { count: racers.length })} variant="compact">
      {isReconnecting && (
        <DialogueBox tone="error">
          <p>{t('reconnecting')}</p>
        </DialogueBox>
      )}
      <ul className="race-roster" aria-labelledby="players-heading" tabIndex={0}>
        {placedRacers(racers).map(({ racer, place }) => {
          const wpm = liveWpmOf(racer, clock);
          const bonus = announcedBonuses.get(racer.memberKey);
          const labels = { place: t('leaderPlace', { place }), you: t('youMarker'), bot: racer.bot ? botLabel(racer.bot.level) : '', wpm: wpm === null ? missingValueDash : t('racerWpm', { value: formatWholeNumber(format, wpm) }), bonus: bonus && t(bonusLabelKey[bonus.kind]) };
          const status = <RacerStatus progress={racer.progress} isFinished={racer.isFinished} isAbandoned={racer.isAbandoned} isInactive={racer.isInactive} passageLength={racer.textLength} />;
          const action = removableKeys.has(racer.memberKey) && (
            <RemovePlayerButton roomId={roomId} memberKey={racer.memberKey} label={t('removeInactive')} accessibleLabel={t('removeInactiveLabel', { name: racer.trainerName })} failureMessage={t('removeFailed')} />
          );
          return <RaceRosterRow key={racer.memberKey} racer={racer} labels={labels} status={status} action={action} />;
        })}
      </ul>
    </PixelPanel>
  );
}
