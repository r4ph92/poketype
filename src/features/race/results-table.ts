import type { RaceResultRow, RankedResultRow, ResultRacer, UnrankedResultRow } from '@/domain/room-view';

type WithRacer = Pick<ResultRacer, 'trainerName' | 'isViewer' | 'partner' | 'bot'>;

export type RankedTableRow = RankedResultRow & WithRacer;

export type UnrankedTableRow = UnrankedResultRow & WithRacer;

export type ResultsTableRow = RankedTableRow | UnrankedTableRow;

// Tied racers share a place (#30 styles ties); name then member key keep their order identical on every page and refresh.
// Racers who abandoned or were removed as inactive come after every ranked racer.
export function resultsTableRows(results: readonly RaceResultRow[], racers: readonly ResultRacer[]): ResultsTableRow[] {
  return results.flatMap((result) => withRacer(result, racers) ?? []).sort(byStanding);
}

export function isRanked(row: ResultsTableRow): row is RankedTableRow {
  return row.standing === 'ranked';
}

function withRacer(result: RaceResultRow, racers: readonly ResultRacer[]): ResultsTableRow | null {
  const racer = racers.find((candidate) => candidate.memberKey === result.memberKey);
  return racer ? { ...result, trainerName: racer.trainerName, isViewer: racer.isViewer, partner: racer.partner, bot: racer.bot } : null;
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
