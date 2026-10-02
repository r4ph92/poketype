import type { GuestId } from '@/domain/guest-id';
import type { RaceResultRow } from '@/domain/room-view';
import { finishTimeMs, type CurrentRace, type RaceParticipantRow } from './race-rows';

// Results are read from the rows frozen at settlement, never recomputed, so every refresh shows the same table.
// A racer who never finished keeps a null finish time and is shown as unfinished; one who abandoned has no ranked metrics.
export function toRaceResults(race: CurrentRace, participants: readonly RaceParticipantRow[], memberKeys: ReadonlyMap<GuestId, string>): RaceResultRow[] | null {
  if (race.endedAt === null) return null;
  return participants.flatMap((participant) => toResultRow(participant, race, memberKeys) ?? []);
}

function toResultRow(participant: RaceParticipantRow, race: CurrentRace, memberKeys: ReadonlyMap<GuestId, string>): RaceResultRow | null {
  const memberKey = memberKeys.get(participant.guestId);
  const { place, grossWpm, score, accuracy, finishedAt, rejectedKeystrokes, abandonedAt } = participant;
  if (memberKey === undefined) return null;
  if (abandonedAt !== null) return { memberKey, abandoned: true, errors: rejectedKeystrokes };
  if (place === null || grossWpm === null || score === null || accuracy === null) return null;
  return { memberKey, abandoned: false, place, grossWpm, score, accuracy, errors: rejectedKeystrokes, finishMs: finishTimeMs(finishedAt, race.startsAt) };
}
