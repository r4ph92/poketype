import type { RaceResultRow, RoomMemberView } from '@/domain/room-view';

export type ResultsTableRow = RaceResultRow & { trainerName: string; isViewer: boolean };

// Tied racers share a place (#30 styles ties); name then member key keep their order identical on every page and refresh.
export function resultsTableRows(results: readonly RaceResultRow[], members: readonly RoomMemberView[]): ResultsTableRow[] {
  return results.flatMap((result) => withMember(result, members) ?? []).sort(byStanding);
}

function withMember(result: RaceResultRow, members: readonly RoomMemberView[]): ResultsTableRow | null {
  const member = members.find((candidate) => candidate.memberKey === result.memberKey);
  return member ? { ...result, trainerName: member.trainerName, isViewer: member.isViewer } : null;
}

// Code-point order rather than localeCompare, so the server render and the browser agree whatever their locale.
function byStanding(first: ResultsTableRow, second: ResultsTableRow): number {
  return first.place - second.place || compareText(first.trainerName, second.trainerName) || compareText(first.memberKey, second.memberKey);
}

function compareText(first: string, second: string): number {
  if (first === second) return 0;
  return first < second ? -1 : 1;
}
