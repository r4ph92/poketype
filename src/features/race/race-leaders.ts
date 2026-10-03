import type { Racer } from './racers';

export type Leader = { racer: Racer; place: number };

const standingOrder = { finished: 0, racing: 1, out: 2 } as const;

// The top racers plus the viewer when outside them. Ties keep the roster's join order, since the sort is stable.
export function leadersWithViewer(racers: readonly Racer[], leaderCount: number): Leader[] {
  const ranked = rankRacers(racers).map((racer, index) => ({ racer, place: index + 1 }));
  const leaders = ranked.slice(0, leaderCount);
  const viewer = ranked.find(({ racer }) => racer.isViewer);
  return viewer && !leaders.includes(viewer) ? [...leaders, viewer] : leaders;
}

// Finishers by finish order, then racers by how far they are in the text, then those who abandoned or were removed as inactive.
export function rankRacers(racers: readonly Racer[]): Racer[] {
  return [...racers].sort((first, second) => standingOf(first) - standingOf(second) || compareWithinStanding(first, second));
}

function standingOf(racer: Racer): number {
  if (racer.isAbandoned || racer.isInactive) return standingOrder.out;
  return racer.isFinished ? standingOrder.finished : standingOrder.racing;
}

function compareWithinStanding(first: Racer, second: Racer): number {
  if (first.isFinished && second.isFinished) return finishOrder(first) - finishOrder(second);
  return second.progress.position - first.progress.position;
}

// A racer who just typed the last character locally has no server finish time yet, so they come after the timed finishers.
function finishOrder(racer: Racer): number {
  return racer.progress.finishMs ?? Number.POSITIVE_INFINITY;
}
