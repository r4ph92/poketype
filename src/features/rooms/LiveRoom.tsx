'use client';

import { useLocale } from 'next-intl';
import { useMemo, useState, type ReactNode } from 'react';
import type { PublicPushConfig } from '@/domain/push-config';
import { isViewerHost, type RaceView, type RoomSnapshot } from '@/domain/room-view';
import { withLocalBotNames } from '@/features/race/bot-names';
import { RaceResultsView } from '@/features/race/RaceResultsView';
import { resolveLocale } from '@/i18n/config';
import type { RaceRewards } from '@/features/race/XpRewardPanel';
import { RaceStartView } from '@/features/race/RaceStartView';
import { HostChangeToast } from './HostChangeToast';
import { LeaveRoomControl } from './LeaveRoomControl';
import { ResultsKickPanel } from './ResultsKickPanel';
import { RoomResultsActions } from './RoomResultsActions';
import { leaveConfirmationFor } from './leave-confirmation';
import { useLiveRoom, type LiveRoom as LiveRoomState } from './live/use-live-room';
import type { CoherentLimits } from '@/domain/coherent-limit';
import { WaitingRoomView } from './WaitingRoomView';

type LiveRoomProps = { initial: RoomSnapshot; pushConfig: PublicPushConfig | null; heading: ReactNode; canCreateRoom: boolean; coherentLimits: CoherentLimits };

export function LiveRoom({ initial, pushConfig, heading, canCreateRoom, coherentLimits }: LiveRoomProps) {
  const { snapshot: liveSnapshot, connection, clock, exit } = useLiveRoom(initial, pushConfig);
  const snapshot = useLocalBotNames(liveSnapshot);
  return <>
    <RoomPhaseView initial={initial} snapshot={snapshot} connection={connection} clock={clock} exit={exit} heading={heading} canCreateRoom={canCreateRoom} coherentLimits={coherentLimits} />
    <HostChangeToast members={snapshot.members} />
  </>;
}

// snapshot carries the trainers' names already localized for bots.
type RoomPhaseViewProps = LiveRoomState & Omit<LiveRoomProps, 'pushConfig'>;

function RoomPhaseView({ initial, snapshot, connection, clock, exit, heading, canCreateRoom, coherentLimits }: RoomPhaseViewProps) {
  const [settledAtLoad] = useState(initial.race?.results ? initial.race.id : null);
  const hasShownRace = useHasShownRace(snapshot);
  const isReconnecting = connection === 'reconnecting';
  const leave = <LeaveRoomControl roomId={snapshot.roomId} confirmation={leaveConfirmationFor(snapshot)} exit={exit} />;
  if (snapshot.race?.results) {
    const actions = <RoomResultsActions snapshot={snapshot} raceId={snapshot.race.id} leave={leave} />;
    const celebrate = snapshot.race.id !== settledAtLoad;
    return <RaceResultsView results={snapshot.race.results} racers={[...snapshot.members, ...snapshot.race.departedRacers]} credit={snapshot.race.credit} missedKeys={snapshot.race.missedKeys} rewards={rewardsOf(snapshot.race)} celebrate={celebrate} actions={actions} hostPanel={isViewerHost(snapshot) && <ResultsKickPanel roomId={snapshot.roomId} members={snapshot.members} />} />;
  }
  if (snapshot.race) {
    return <RaceStartView key={snapshot.race.id} roomId={snapshot.roomId} race={snapshot.race} clock={clock} members={snapshot.members} isReconnecting={isReconnecting} leave={leave} />;
  }
  return <WaitingRoomView snapshot={snapshot} clock={clock} isReconnecting={isReconnecting} isBackFromRace={hasShownRace} canCreateRoom={canCreateRoom} heading={heading} leave={leave} coherentLimits={coherentLimits} />;
}

// Once a race or its results have been on screen, the lobby that follows replaces them and takes the focus.
function useHasShownRace(snapshot: RoomSnapshot): boolean {
  const [hasShownRace, setHasShownRace] = useState(snapshot.race !== null);
  if (snapshot.race !== null && !hasShownRace) setHasShownRace(true);
  return hasShownRace;
}

function useLocalBotNames(snapshot: RoomSnapshot): RoomSnapshot {
  const locale = resolveLocale(useLocale());
  return useMemo(() => ({ ...snapshot, members: withLocalBotNames(snapshot.members, locale) }), [snapshot, locale]);
}

function rewardsOf({ reward, coins, encounter, legendaries }: RaceView): RaceRewards {
  return { xp: reward, coins, encounter, legendaries };
}
