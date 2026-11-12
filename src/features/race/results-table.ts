import type { RaceResultRow, RankedResultRow, ResultRacer, UnrankedResultRow } from '@/domain/room-view';

type WithRacer = Pick<ResultRacer, 'trainerName' | 'isViewer' | 'partner' | 'bot'>;

export type RankedTableRow = RankedResultRow & WithRacer;

export type UnrankedTableRow = UnrankedResultRow & WithRacer;

export type ResultsTableRow = RankedTableRow | UnrankedTableRow;

// Tied racers share a place (#30 styles ties); name then member key keep their order identical on every page and refresh.
// In a race settled before #136, racers who abandoned or were removed as inactive have no place and come after every ranked racer.
export function resultsTableRows(results: readonly RaceResultRow[], racers: readonly ResultRacer[]): ResultsTableRow[] {
  return results.flatMap((result) => withRacer(result, racers) ?? []).sort(byStanding);
}

export function isRanked(row: ResultsTableRow): row is RankedTableRow {
  return row.standing === 'ranked';
}

// The three statuses of the brief: a racer removed as inactive counts as an abandoner.
export type ResultStatus = 'finished' | 'timedOut' | 'abandoned';

export function statusOf(row: ResultsTableRow): ResultStatus {
  if (!isRanked(row) || row.outcome === 'inactive') return 'abandoned';
  return row.outcome;
}

// Why the viewer left the race, if they did: their own abandonment or the host's removal.
export function viewerExitOf(rows: readonly ResultsTableRow[]): 'abandoned' | 'inactive' | null {
  const row = rows.find((candidate) => candidate.isViewer);
  if (!row) return null;
  const exit = isRanked(row) ? row.outcome : row.standing;
  return exit === 'abandoned' || exit === 'inactive' ? exit : null;
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
