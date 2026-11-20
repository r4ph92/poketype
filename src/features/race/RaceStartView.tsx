'use client';

import { RouteScene } from '@/components/world/RouteScene';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DialogueBox } from '@/components/pixel/DialogueBox';
import { ProgressBadge } from '@/components/pixel/ProgressBadge';
import type { RoomId } from '@/domain/room-id';
import { isViewerSpectator, racersOf, type RacerProgress, type RaceView, type RoomMemberView } from '@/domain/room-view';
import type { ServerClock } from '@/domain/server-clock';
import { useFocusedHeading } from '@/features/rooms/use-focused-heading';
import { AbandonRaceControl } from './AbandonRaceControl';
import { RaceAnnouncements } from './RaceAnnouncements';
import { RaceDeviceNotice } from './RaceDeviceNotice';
import { RaceLeaderBar } from './RaceLeaderBar';
import { RacePassage } from './RacePassage';
import { RaceProgressStats } from './RaceProgressStats';
import { RaceRoster } from './RaceRoster';
import { RaceStatusPanel } from './RaceStatusPanel';
import { withBotProgressAt } from './bot-racers';
import { CatchUpBonusBanner } from './CatchUpBonusBanner';
import { announcedBonuses, foggingBonus, leaderNoticeBonus, trackBadges } from './race-bonus-announcements';
import { memberText } from '@/domain/catch-up-bonus-view';
import { countersOf } from '@/domain/typing-progress';
import { viewerPlace } from './race-leaders';
import { notStartedProgress, racersWithLocalViewer, type Racer } from './racers';
import { TypingArea } from './TypingArea';
import { useRaceCountdown } from './use-race-countdown';
import { useRaceTime } from './use-race-time';
import { useRaceRemaining } from './use-race-remaining';
import { useRemovableRacers } from './use-removable-racers';
import { useTypingRace, type TypingRace } from './use-typing-race';

type RaceStartViewProps = { roomId: RoomId; race: RaceView; clock: ServerClock; members: RoomMemberView[]; isReconnecting: boolean; leave: ReactNode };

type TypingHintKey = 'typingHint' | 'typingWaits' | 'typingDone' | 'typingTimeUp' | 'typingAbandoned' | 'typingInactive';

type TypingStatus = { canType: boolean; isFinished: boolean; isTimeUp: boolean; isAbandoned: boolean; isInactive: boolean };

export function RaceStartView({ roomId, race, clock, members: roomMembers, isReconnecting, leave }: RaceStartViewProps) {
  const t = useTranslations('Room');
  const members = racersOf(roomMembers);
  const isSpectating = isViewerSpectator({ members: roomMembers });
  const [hasAbandoned, setHasAbandoned] = useState(false);
  const headingRef = useFocusedHeading(useTranslations('Metadata')('raceTitle'));
  const step = useRaceCountdown(race.startsAt, clock);
  const remainingSeconds = useRaceRemaining(race.deadlineAt, clock);
  const isTimeUp = remainingSeconds === 0;
  const { isAbandoned, isInactive } = viewerExit(members, hasAbandoned);
  const isOut = isAbandoned || isInactive;
  const viewerText = memberText(race.passage, race.bonuses, viewerKeyOf(members));
  const typing = useTypingRace(roomId, race, viewerText, step === 'go' && !isTimeUp && !isOut && !isSpectating);
  const canType = step === 'go' && !isTimeUp && !isOut && !isSpectating && !typing.isFinished;
  const typingAreaRef = useFocusOnceTypingOpens(canType);
  const raceTimeMs = useRaceTime(race, clock);
  const racers = racersWithLocalViewer(withBotProgressAt(members, race, raceTimeMs), viewerProgress(typing, members, isAbandoned), race);
  const bonuses = announcedBonuses(race.bonuses, raceTimeMs);
  const hinderedBy = leaderNoticeBonus(race.bonuses, viewerKeyOf(members), raceTimeMs);
  const isFogged = foggingBonus(race.bonuses, viewerKeyOf(members), raceTimeMs) !== undefined;
  const removableKeys = useRemovableRacers(members, race.startsAt, clock, roomMembers.some((member) => member.isHost && member.isViewer));
  const roster = <RaceRoster roomId={roomId} racers={racers} clock={{ elapsedMs: raceElapsedMs(race, raceTimeMs), viewerCorrectCharacters: countersOf(typing.state).correctCharacters }} isReconnecting={isReconnecting} removableKeys={removableKeys} announcedBonuses={trackBadges(race.bonuses, raceTimeMs)} />;
  return (
    <>
      <div className="race-layout">
        <RaceStage headingRef={headingRef} racers={racers} passageLength={typing.characters.length} roster={roster} isSpectating={isSpectating} />
        <div className="race-main">
          {isSpectating ? <SpectatorNote /> : <RacePassage heading={t('passageHeading')} passage={viewerText} language={race.language} characters={typing.characters} position={typing.state.position} mistakes={typing.state.mistakes} isRejected={typing.state.isRejected} isFogged={isFogged}
            stats={<RaceProgressStats step={step} remainingSeconds={race.timeLimitSeconds === null ? null : remainingSeconds} counters={countersOf(typing.state)} elapsedMs={viewerElapsedMs(typing, race, raceTimeMs)} passageLength={typing.characters.length} viewerPlace={viewerPlace(racers)} />}>
            <TypingArea ref={typingAreaRef} label={t('typingLabel')} badge={<ProgressBadge>{t(race.errorMode === 'free' ? 'errorModeFree' : 'errorModeBlocked')}</ProgressBadge>} hint={t(typingHintKey({ canType, isFinished: typing.isFinished, isTimeUp, isAbandoned, isInactive }))} isEnabled={canType} onType={typing.type} />
          </RacePassage>}
          {isAbandoned && <DialogueBox live="status"><p>{t(isAbandonedOffline(members) ? 'disconnectedAbandonBanner' : 'abandonedBanner')}</p></DialogueBox>}
          {isInactive && !isAbandoned && <DialogueBox live="status"><p>{t('inactiveBanner')}</p></DialogueBox>}
        </div>
        <div className="race-side">
          <RaceStatusPanel step={step} />
          <RaceExitControls roomId={roomId} canAbandon={!isSpectating && !isOut && !typing.isFinished && !isTimeUp} onAbandoned={() => setHasAbandoned(true)}>{leave}</RaceExitControls>
        </div>
      </div>
      <RaceAnnouncements racers={racers} announcedBonuses={bonuses} hinderedBy={hinderedBy} />
      <CatchUpBonusBanner bonus={bonuses.get(viewerKeyOf(members))} hinderedBy={hinderedBy} />
    </>
  );
}

type RaceStageProps = { headingRef: RefObject<HTMLHeadingElement | null>; racers: Racer[]; passageLength: number; roster: ReactNode; isSpectating: boolean };

// The host who only watches has no typing area: the race is theirs to follow, so the page says so where the text would be (COURSE-05).
function SpectatorNote() {
  const t = useTranslations('HostRole');
  return <DialogueBox live="status"><p>{t('watching')}</p></DialogueBox>;
}

// The race heading and the leader bar sit beside a short map and the roster of every racer, so the passage fits below them on a 720px-high screen.
function RaceStage({ headingRef, racers, passageLength, roster, isSpectating }: RaceStageProps) {
  const t = useTranslations('Room');
  return (
    <section aria-labelledby="race-title" className="race-stage pixel-frame pixel-notch p-3">
      <div className="grid min-w-0 content-start gap-3">
        <h1 id="race-title" ref={headingRef} tabIndex={-1} className="min-w-0 border-b-2 border-slate pb-2 font-pixel text-xl font-bold wrap-anywhere">{t('raceHeading')}</h1>
        <RaceLeaderBar racers={racers} />
      </div>
      <RaceDeviceNotice />
      <RouteScene label={t('routeName')} members={isSpectating ? racers : racers.filter((racer) => racer.isViewer)} passageLength={passageLength} youLabel={t('youMarker')} />
      <div className="race-stage-roster">{roster}</div>
    </section>
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

function viewerKeyOf(members: RoomMemberView[]): string {
  return members.find((member) => member.isViewer)?.memberKey ?? '';
}

// hasAbandoned covers the moment between the viewer's own abandon and the snapshot that confirms it.
function viewerExit(members: RoomMemberView[], hasAbandoned: boolean): Pick<TypingStatus, 'isAbandoned' | 'isInactive'> {
  const progress = members.find((member) => member.isViewer)?.progress;
  return { isAbandoned: progress?.abandoned === true || hasAbandoned, isInactive: progress?.inactive === true };
}

// The viewer's connection was lost for 30 s or more, so the server counted them as abandoned (COURSE-08).
function isAbandonedOffline(members: RoomMemberView[]): boolean {
  return members.find((member) => member.isViewer)?.progress?.abandonedOffline === true;
}

function viewerProgress({ state, serverFinishMs }: TypingRace, members: RoomMemberView[], isAbandoned: boolean): RacerProgress {
  const snapshot = members.find((member) => member.isViewer)?.progress;
  const finishMs = serverFinishMs ?? snapshot?.finishMs ?? null;
  return { ...(snapshot ?? notStartedProgress), position: state.position, finishMs, abandoned: isAbandoned, inactive: snapshot?.inactive === true, disconnected: false };
}

// The viewer's live WPM uses the same clock as the results: the server's finish time once known, else the race time, never past the deadline.
function viewerElapsedMs({ serverFinishMs }: TypingRace, race: RaceView, raceTimeMs: number | null): number | null {
  return serverFinishMs ?? raceElapsedMs(race, raceTimeMs);
}

function raceElapsedMs({ startsAt, deadlineAt }: RaceView, raceTimeMs: number | null): number | null {
  return raceTimeMs === null ? null : Math.min(raceTimeMs, deadlineAt - startsAt);
}

function typingHintKey({ canType, isFinished, isTimeUp, isAbandoned, isInactive }: TypingStatus): TypingHintKey {
  if (isAbandoned) return 'typingAbandoned';
  if (isInactive) return 'typingInactive';
  if (isFinished) return 'typingDone';
  if (isTimeUp) return 'typingTimeUp';
  return canType ? 'typingHint' : 'typingWaits';
}
