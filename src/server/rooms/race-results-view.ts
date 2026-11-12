import type { GuestId } from '@/domain/guest-id';
import type { RaceResultRow } from '@/domain/room-view';
import { finishTimeMs, participantOutcome, type CurrentRace, type RaceParticipantRow } from './race-rows';

// Results are read from the rows frozen at settlement, never recomputed, so every refresh shows the same table.
// A racer who never finished keeps a null finish time. Every racer has a place since #136; in an older race an abandoner or a racer removed as inactive has none.
export function toRaceResults(race: CurrentRace, participants: readonly RaceParticipantRow[], memberKeys: ReadonlyMap<GuestId, string>): RaceResultRow[] | null {
  if (race.endedAt === null) return null;
  return participants.flatMap((participant) => toResultRow(participant, race, memberKeys) ?? []);
}

function toResultRow(participant: RaceParticipantRow, race: CurrentRace, memberKeys: ReadonlyMap<GuestId, string>): RaceResultRow | null {
  const memberKey = memberKeys.get(participant.guestId);
  const { place, grossWpm, rawWpm, score, accuracy, finishedAt, rejectedKeystrokes, abandonedAt, inactiveAt } = participant;
  if (memberKey === undefined) return null;
  if (place !== null && grossWpm !== null && score !== null && accuracy !== null) {
    const outcome = participantOutcome(participant);
    return { memberKey, standing: 'ranked', outcome, place, grossWpm, rawWpm, score, accuracy, errors: rejectedKeystrokes, finishMs: finishTimeMs(finishedAt, race.startsAt) };
  }
  if (abandonedAt !== null) return { memberKey, standing: 'abandoned', errors: rejectedKeystrokes };
  if (inactiveAt !== null) return { memberKey, standing: 'inactive', errors: rejectedKeystrokes };
  return null;
}
