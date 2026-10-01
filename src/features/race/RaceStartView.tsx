'use client';

import { RouteScene } from '@/components/world/RouteScene';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import type { RoomId } from '@/domain/room-id';
import type { RaceView, RoomMemberView } from '@/domain/room-view';
import type { ServerClock } from '@/domain/server-clock';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { RaceAnnouncements } from './RaceAnnouncements';
import { RaceCountdown } from './RaceCountdown';
import { RacePassage } from './RacePassage';
import { RaceRoster } from './RaceRoster';
import { racersWithLocalViewer } from './racers';
import { TypingArea } from './TypingArea';
import { useRaceCountdown } from './use-race-countdown';
import { useTypingRace, type TypingRace } from './use-typing-race';

type RaceStartViewProps = { roomId: RoomId; race: RaceView; clock: ServerClock; members: RoomMemberView[]; isReconnecting: boolean };

export function RaceStartView({ roomId, race, clock, members, isReconnecting }: RaceStartViewProps) {
  const t = useTranslations('Room');
  const headingRef = useFocusedHeading(useTranslations('Metadata')('raceTitle'));
  const step = useRaceCountdown(race.startsAt, clock);
  const typing = useTypingRace(roomId, race, step === 'go');
  const canType = step === 'go' && !typing.isFinished;
  const typingAreaRef = useFocusOnceTypingOpens(canType);
  const racers = racersWithLocalViewer(members, viewerProgress(typing, members), typing.characters.length);
  return (
    <>
      <div className="game-columns">
        <div className="grid min-w-0 content-start gap-4">
          <PixelPanel titleId="race-title" level={1} title={t('raceHeading')} headingRef={headingRef} variant="scene">
            <RouteScene label={t('routeName')} members={racers} passageLength={typing.characters.length} youLabel={t('youMarker')} />
          </PixelPanel>
          <RacePassage heading={t('passageHeading')} passage={race.passage} characters={typing.characters} position={typing.state.position} isRejected={typing.state.isRejected}>
            <TypingArea ref={typingAreaRef} label={t('typingLabel')} hint={t(typingHintKey(canType, typing.isFinished))} isEnabled={canType} onType={typing.type} />
          </RacePassage>
        </div>
        <div className="grid content-start gap-4">
          <PixelPanel titleId="race-status" title={t('raceStatus')}>
            <RaceCountdown step={step} />
            <p className="font-pixel text-xl">{t('yourProgress', { percent: Math.floor(typing.state.position / Math.max(1, typing.characters.length) * 100) })}</p>
            <div className="h-4 border-2 border-frame bg-cream-deep" aria-hidden="true"><div className="h-full bg-success" style={{ width: `${typing.state.position / Math.max(1, typing.characters.length) * 100}%` }} /></div>
          </PixelPanel>
          <RaceRoster racers={racers} passageLength={typing.characters.length} isReconnecting={isReconnecting} />
          <PixelPanel titleId="route-preview" title={t('routePreview')}><p>{t('routeHint')}</p></PixelPanel>
        </div>
      </div>
      <RaceAnnouncements racers={racers} passageLength={typing.characters.length} />
    </>
  );
}

// Declared after the heading's focus effect, so a page reloaded mid-race lands in the typing area, not on the heading.
function useFocusOnceTypingOpens(canType: boolean) {
  const typingAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (canType) typingAreaRef.current?.focus();
  }, [canType]);
  return typingAreaRef;
}

function viewerProgress({ state, serverFinishMs }: TypingRace, members: RoomMemberView[]) {
  const snapshotFinishMs = members.find((member) => member.isViewer)?.progress?.finishMs ?? null;
  return { position: state.position, finishMs: serverFinishMs ?? snapshotFinishMs };
}

function typingHintKey(canType: boolean, isFinished: boolean): 'typingHint' | 'typingWaits' | 'typingDone' {
  if (isFinished) return 'typingDone';
  return canType ? 'typingHint' : 'typingWaits';
}
