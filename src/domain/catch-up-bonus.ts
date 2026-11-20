import { gameConfig } from '@/config/game';
import { racerText, racerTextLength, removableWordCount } from './racer-text';

// Only "-3 mots" exists (#77); once several kinds exist, each award draws its kind from a seed the start stores with the race.
export const catchUpBonusKinds = ['remove-words'] as const;

export type CatchUpBonusKind = (typeof catchUpBonusKinds)[number];

export type BonusCheckpoint = (typeof gameConfig.catchUpBonuses.checkpointPercents)[number];

export const bonusCheckpoints: readonly BonusCheckpoint[] = gameConfig.catchUpBonuses.checkpointPercents;

// racerKey names a player or a bot; isOut is an abandoner or a racer removed as inactive; wordsRemoved is what earlier bonuses took off their text.
export type BonusRacer = { racerKey: string; position: number; isFinished: boolean; isOut: boolean; wordsRemoved: number; bonusesReceived: number };

export type BonusAward = { racerKey: string; checkpoint: BonusCheckpoint; kind: CatchUpBonusKind; wordsRemoved: number };

export type CheckpointRace = { isEnabled: boolean; passage: string; checkpointsPassed: number; racers: readonly BonusRacer[] };

export type CheckpointOutcome = { checkpointsPassed: number; awards: BonusAward[] };

// A share of the racer's own text, kept as a fraction so a gap of exactly 25 points never counts as more.
type Share = { typed: number; length: number };

const { trailingGapPoints, maxPerRacer, removedWords } = gameConfig.catchUpBonuses;

// Each checkpoint the leader has reached is settled in order, on the texts the previous checkpoint left, so one jump past two checkpoints settles both.
export function awardDueBonuses(race: CheckpointRace): CheckpointOutcome {
  if (!race.isEnabled) return { checkpointsPassed: race.checkpointsPassed, awards: [] };
  let racers = race.racers;
  const awards: BonusAward[] = [];
  let checkpointsPassed = race.checkpointsPassed;
  for (const checkpoint of bonusCheckpoints.slice(checkpointsPassed)) {
    const leader = leaderShare(race.passage, racers);
    if (leader === null || !hasReached(leader, checkpoint)) break;
    const checkpointAwards = awardsAt(race.passage, racers, checkpoint);
    racers = racers.map((racer) => withAward(racer, checkpointAwards));
    awards.push(...checkpointAwards);
    checkpointsPassed += 1;
  }
  return { checkpointsPassed, awards };
}

function trailingRacers(passage: string, racers: readonly BonusRacer[]): BonusRacer[] {
  const stillTyping = racersInRace(racers).filter((racer) => !racer.isFinished);
  const leader = leaderShare(passage, racers);
  const lowest = mostExtreme(stillTyping.map((racer) => shareOf(passage, racer)), lowestFirst);
  if (leader === null || lowest === null) return [];
  return stillTyping.filter((racer) => isTrailing(shareOf(passage, racer), leader, lowest));
}

function awardsAt(passage: string, racers: readonly BonusRacer[], checkpoint: BonusCheckpoint): BonusAward[] {
  return trailingRacers(passage, racers)
    .filter((racer) => racer.bonusesReceived < maxPerRacer)
    .flatMap((racer) => {
      const wordsRemoved = removableWordCount(racerText(passage, racer.wordsRemoved), racer.position, removedWords);
      return wordsRemoved === 0 ? [] : [{ racerKey: racer.racerKey, checkpoint, kind: 'remove-words' as const, wordsRemoved }];
    });
}

function withAward(racer: BonusRacer, awards: readonly BonusAward[]): BonusRacer {
  const award = awards.find((candidate) => candidate.racerKey === racer.racerKey);
  if (!award) return racer;
  return { ...racer, wordsRemoved: racer.wordsRemoved + award.wordsRemoved, bonusesReceived: racer.bonusesReceived + 1 };
}

// The leader is never helped: a racer level with the leader is not trailing, even when everyone is level.
function isTrailing(share: Share, leader: Share, lowest: Share): boolean {
  if (compareShares(share, leader) >= 0) return false;
  return compareShares(share, lowest) === 0 || isMoreThanGapBehind(share, leader);
}

function leaderShare(passage: string, racers: readonly BonusRacer[]): Share | null {
  return mostExtreme(racersInRace(racers).map((racer) => shareOf(passage, racer)), highestFirst);
}

const highestFirst = 1;
const lowestFirst = -1;

function mostExtreme(shares: readonly Share[], direction: number): Share | null {
  return shares.reduce<Share | null>((kept, share) => (kept === null || compareShares(share, kept) * direction > 0 ? share : kept), null);
}

function racersInRace(racers: readonly BonusRacer[]): BonusRacer[] {
  return racers.filter((racer) => !racer.isOut);
}

function shareOf(passage: string, racer: BonusRacer): Share {
  const length = Math.max(1, racerTextLength(passage, racer.wordsRemoved));
  return { typed: racer.isFinished ? length : Math.min(racer.position, length), length };
}

function compareShares(first: Share, second: Share): number {
  return first.typed * second.length - second.typed * first.length;
}

function hasReached(share: Share, checkpoint: BonusCheckpoint): boolean {
  return share.typed * 100 >= checkpoint * share.length;
}

function isMoreThanGapBehind(share: Share, leader: Share): boolean {
  return (leader.typed * share.length - share.typed * leader.length) * 100 > trailingGapPoints * leader.length * share.length;
}
