'use client';

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
      <PixelPanel titleId="race-title" level={1} title={t('raceHeading')} headingRef={headingRef}>
        <RaceCountdown step={step} />
      </PixelPanel>
      <RacePassage heading={t('passageHeading')} passage={race.passage} characters={typing.characters} position={typing.state.position} isRejected={typing.state.isRejected}>
        <TypingArea ref={typingAreaRef} label={t('typingLabel')} hint={t(typingHintKey(canType, typing.isFinished))} isEnabled={canType} onType={typing.type} />
      </RacePassage>
      <RaceRoster racers={racers} passageLength={typing.characters.length} isReconnecting={isReconnecting} />
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
