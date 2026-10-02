import type { AbandonedResultRow, RaceResultRow, RankedResultRow, RoomMemberView } from '@/domain/room-view';

type WithMember = { trainerName: string; isViewer: boolean };

export type RankedTableRow = RankedResultRow & WithMember;

export type AbandonedTableRow = AbandonedResultRow & WithMember;

export type ResultsTableRow = RankedTableRow | AbandonedTableRow;

// Tied racers share a place (#30 styles ties); name then member key keep their order identical on every page and refresh.
// Racers who abandoned come after every ranked racer.
export function resultsTableRows(results: readonly RaceResultRow[], members: readonly RoomMemberView[]): ResultsTableRow[] {
  return results.flatMap((result) => withMember(result, members) ?? []).sort(byStanding);
}

export function isRanked(row: ResultsTableRow): row is RankedTableRow {
  return !row.abandoned;
}

function withMember(result: RaceResultRow, members: readonly RoomMemberView[]): ResultsTableRow | null {
  const member = members.find((candidate) => candidate.memberKey === result.memberKey);
  return member ? { ...result, trainerName: member.trainerName, isViewer: member.isViewer } : null;
}

// Code-point order rather than localeCompare, so the server render and the browser agree whatever their locale.
function byStanding(first: ResultsTableRow, second: ResultsTableRow): number {
  return placeOf(first) - placeOf(second) || compareText(first.trainerName, second.trainerName) || compareText(first.memberKey, second.memberKey);
}

function placeOf(row: ResultsTableRow): number {
  return isRanked(row) ? row.place : Number.POSITIVE_INFINITY;
}

function compareText(first: string, second: string): number {
  if (first === second) return 0;
  return first < second ? -1 : 1;
}
