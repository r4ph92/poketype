import type { GuestId } from '@/domain/guest-id';
import type { RaceResultRow } from '@/domain/room-view';
import type { CurrentRace, RaceParticipantRow } from './race-rows';

// Results are read from the rows frozen at settlement, never recomputed, so every refresh shows the same table.
export function toRaceResults(race: CurrentRace, participants: readonly RaceParticipantRow[], memberKeys: ReadonlyMap<GuestId, string>): RaceResultRow[] | null {
  if (race.endedAt === null) return null;
  return participants.flatMap((participant) => toResultRow(participant, race, memberKeys) ?? []);
}

function toResultRow(participant: RaceParticipantRow, race: CurrentRace, memberKeys: ReadonlyMap<GuestId, string>): RaceResultRow | null {
  const memberKey = memberKeys.get(participant.guestId);
  const { place, grossWpm, score, accuracy, finishedAt, rejectedKeystrokes } = participant;
  if (memberKey === undefined || place === null || grossWpm === null || score === null || accuracy === null || finishedAt === null) return null;
  return { memberKey, place, grossWpm, score, accuracy, errors: rejectedKeystrokes, finishMs: finishedAt.getTime() - race.startsAt.getTime() };
}
