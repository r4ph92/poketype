'use client';

import { RouteScene } from '@/components/world/RouteScene';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PixelPanel } from '@/components/pixel/PixelPanel';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import type { RoomId } from '@/domain/room-id';
import type { RacerProgress, RaceView, RoomMemberView } from '@/domain/room-view';
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
import { useRemovableRacers } from './use-removable-racers';
import { useTypingRace, type TypingRace } from './use-typing-race';

type RaceStartViewProps = { roomId: RoomId; race: RaceView; clock: ServerClock; members: RoomMemberView[]; isReconnecting: boolean; leave: ReactNode };

type TypingHintKey = 'typingHint' | 'typingWaits' | 'typingDone' | 'typingTimeUp' | 'typingAbandoned' | 'typingInactive';

type TypingStatus = { canType: boolean; isFinished: boolean; isTimeUp: boolean; isAbandoned: boolean; isInactive: boolean };

export function RaceStartView({ roomId, race, clock, members, isReconnecting, leave }: RaceStartViewProps) {
  const t = useTranslations('Room');
  const [hasAbandoned, setHasAbandoned] = useState(false);
  const headingRef = useFocusedHeading(useTranslations('Metadata')('raceTitle'));
  const step = useRaceCountdown(race.startsAt, clock);
  const remainingSeconds = useRaceRemaining(race.deadlineAt, clock);
  const isTimeUp = remainingSeconds === 0;
  const { isAbandoned, isInactive } = viewerExit(members, hasAbandoned);
  const isOut = isAbandoned || isInactive;
  const typing = useTypingRace(roomId, race, step === 'go' && !isTimeUp && !isOut);
  const canType = step === 'go' && !isTimeUp && !isOut && !typing.isFinished;
  const typingAreaRef = useFocusOnceTypingOpens(canType);
  const racers = racersWithLocalViewer(members, viewerProgress(typing, members, isAbandoned), typing.characters.length);
  const removableKeys = useRemovableRacers(members, race.startsAt, clock, members.some((member) => member.isHost && member.isViewer));
  return (
    <>
      <div className="game-columns">
        <div className="grid min-w-0 content-start gap-4">
          <PixelPanel titleId="race-title" level={1} title={t('raceHeading')} headingRef={headingRef} variant="scene">
            <RaceLeaderBar racers={racers} passageLength={typing.characters.length} />
            <RouteScene label={t('routeName')} members={racers.filter((racer) => racer.isViewer)} passageLength={typing.characters.length} youLabel={t('youMarker')} />
          </PixelPanel>
          <RacePassage heading={t('passageHeading')} passage={race.passage} language={race.language} characters={typing.characters} position={typing.state.position} isRejected={typing.state.isRejected}>
            <TypingArea ref={typingAreaRef} label={t('typingLabel')} hint={t(typingHintKey({ canType, isFinished: typing.isFinished, isTimeUp, isAbandoned, isInactive }))} isEnabled={canType} onType={typing.type} />
          </RacePassage>
          {isAbandoned && <DialogueBox live="status"><p>{t('abandonedBanner')}</p></DialogueBox>}
          {isInactive && !isAbandoned && <DialogueBox live="status"><p>{t('inactiveBanner')}</p></DialogueBox>}
        </div>
        <div className="grid content-start gap-4">
          <RaceStatusPanel step={step} remainingSeconds={remainingSeconds} position={typing.state.position} passageLength={typing.characters.length} />
          <RaceExitControls roomId={roomId} canAbandon={!isOut && !typing.isFinished && !isTimeUp} onAbandoned={() => setHasAbandoned(true)}>{leave}</RaceExitControls>
          <RaceRoster roomId={roomId} racers={racers} passageLength={typing.characters.length} isReconnecting={isReconnecting} removableKeys={removableKeys} />
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

// hasAbandoned covers the moment between the viewer's own abandon and the snapshot that confirms it.
function viewerExit(members: RoomMemberView[], hasAbandoned: boolean): Pick<TypingStatus, 'isAbandoned' | 'isInactive'> {
  const progress = members.find((member) => member.isViewer)?.progress;
  return { isAbandoned: progress?.abandoned === true || hasAbandoned, isInactive: progress?.inactive === true };
}

function viewerProgress({ state, serverFinishMs }: TypingRace, members: RoomMemberView[], isAbandoned: boolean): RacerProgress {
  const snapshot = members.find((member) => member.isViewer)?.progress;
  const finishMs = serverFinishMs ?? snapshot?.finishMs ?? null;
  return { position: state.position, finishMs, abandoned: isAbandoned, inactive: snapshot?.inactive === true, lastProgressMs: snapshot?.lastProgressMs ?? 0 };
}

function typingHintKey({ canType, isFinished, isTimeUp, isAbandoned, isInactive }: TypingStatus): TypingHintKey {
  if (isAbandoned) return 'typingAbandoned';
  if (isInactive) return 'typingInactive';
  if (isFinished) return 'typingDone';
  if (isTimeUp) return 'typingTimeUp';
  return canType ? 'typingHint' : 'typingWaits';
}
