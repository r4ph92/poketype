'use client';

import { RouteScene } from '@/components/world/RouteScene';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import type { RoomId } from '@/domain/room-id';
import type { RaceView, RoomMemberView } from '@/domain/room-view';
import type { ServerClock } from '@/domain/server-clock';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { AbandonRaceControl } from './AbandonRaceControl';
import { RaceAnnouncements } from './RaceAnnouncements';
import { RaceLeaderBar } from './RaceLeaderBar';
import { RacePassage } from './RacePassage';
import { RaceRoster } from './RaceRoster';
import { RaceStatusPanel } from './RaceStatusPanel';
import { racersWithLocalViewer } from './racers';
import { TypingArea } from './TypingArea';
import { useRaceCountdown } from './use-race-countdown';
import { useRaceRemaining } from './use-race-remaining';
import { useTypingRace, type TypingRace } from './use-typing-race';

type RaceStartViewProps = { roomId: RoomId; race: RaceView; clock: ServerClock; members: RoomMemberView[]; isReconnecting: boolean; leave: ReactNode };

type TypingHintKey = 'typingHint' | 'typingWaits' | 'typingDone' | 'typingTimeUp' | 'typingAbandoned';

type TypingStatus = { canType: boolean; isFinished: boolean; isTimeUp: boolean; isAbandoned: boolean };

export function RaceStartView({ roomId, race, clock, members, isReconnecting, leave }: RaceStartViewProps) {
  const t = useTranslations('Room');
  const [hasAbandoned, setHasAbandoned] = useState(false);
  const headingRef = useFocusedHeading(useTranslations('Metadata')('raceTitle'));
  const step = useRaceCountdown(race.startsAt, clock);
  const remainingSeconds = useRaceRemaining(race.deadlineAt, clock);
  const isTimeUp = remainingSeconds === 0;
  const isAbandoned = members.find((member) => member.isViewer)?.progress?.abandoned === true || hasAbandoned;
  const typing = useTypingRace(roomId, race, step === 'go' && !isTimeUp && !isAbandoned);
  const canType = step === 'go' && !isTimeUp && !isAbandoned && !typing.isFinished;
  const typingAreaRef = useFocusOnceTypingOpens(canType);
  const racers = racersWithLocalViewer(members, viewerProgress(typing, members, isAbandoned), typing.characters.length);
  return (
    <>
      <div className="game-columns">
        <div className="grid min-w-0 content-start gap-4">
          <PixelPanel titleId="race-title" level={1} title={t('raceHeading')} headingRef={headingRef} variant="scene">
            <RaceLeaderBar racers={racers} passageLength={typing.characters.length} />
            <RouteScene label={t('routeName')} members={racers.filter((racer) => racer.isViewer)} passageLength={typing.characters.length} youLabel={t('youMarker')} />
          </PixelPanel>
          <RacePassage heading={t('passageHeading')} passage={race.passage} language={race.language} characters={typing.characters} position={typing.state.position} isRejected={typing.state.isRejected}>
            <TypingArea ref={typingAreaRef} label={t('typingLabel')} hint={t(typingHintKey({ canType, isFinished: typing.isFinished, isTimeUp, isAbandoned }))} isEnabled={canType} onType={typing.type} />
          </RacePassage>
          {isAbandoned && <DialogueBox live="status"><p>{t('abandonedBanner')}</p></DialogueBox>}
        </div>
        <div className="grid content-start gap-4">
          <RaceStatusPanel step={step} remainingSeconds={remainingSeconds} position={typing.state.position} passageLength={typing.characters.length} />
          <RaceExitControls roomId={roomId} canAbandon={!isAbandoned && !typing.isFinished && !isTimeUp} onAbandoned={() => setHasAbandoned(true)}>{leave}</RaceExitControls>
          <RaceRoster racers={racers} passageLength={typing.characters.length} isReconnecting={isReconnecting} />
          <PixelPanel titleId="route-preview" title={t('routePreview')}><p>{t('routeHint')}</p></PixelPanel>
        </div>
      </div>
      <RaceAnnouncements racers={racers} passageLength={typing.characters.length} />
    </>
  );
}

type RaceExitControlsProps = { roomId: RoomId; canAbandon: boolean; onAbandoned: () => void; children: ReactNode };

function RaceExitControls({ roomId, canAbandon, onAbandoned, children }: RaceExitControlsProps) {
  return (
    <div className="grid gap-3">
      {canAbandon && <AbandonRaceControl roomId={roomId} onAbandoned={onAbandoned} />}
      {children}
    </div>
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

function viewerProgress({ state, serverFinishMs }: TypingRace, members: RoomMemberView[], isAbandoned: boolean) {
  const snapshotFinishMs = members.find((member) => member.isViewer)?.progress?.finishMs ?? null;
  return { position: state.position, finishMs: serverFinishMs ?? snapshotFinishMs, abandoned: isAbandoned };
}

function typingHintKey({ canType, isFinished, isTimeUp, isAbandoned }: TypingStatus): TypingHintKey {
  if (isAbandoned) return 'typingAbandoned';
  if (isFinished) return 'typingDone';
  if (isTimeUp) return 'typingTimeUp';
  return canType ? 'typingHint' : 'typingWaits';
}
