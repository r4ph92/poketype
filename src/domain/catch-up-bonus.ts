import { gameConfig } from '@/config/game';
import type { RandomSource } from './random-source';
import { editedText, editedTextLength, removableWordCount, type TextEdit } from './racer-text';

// "-3 mots" shortens the trailing racer's own text (#77); "+3 mots" lengthens the leader's text (#79). Each award draws its kind on the server.
export const catchUpBonusKinds = ['remove-words', 'add-words'] as const;

export type CatchUpBonusKind = (typeof catchUpBonusKinds)[number];

export type BonusCheckpoint = (typeof gameConfig.catchUpBonuses.checkpointPercents)[number];

export const bonusCheckpoints: readonly BonusCheckpoint[] = gameConfig.catchUpBonuses.checkpointPercents;

// racerKey names a player or a bot; isOut is an abandoner or a racer removed as inactive; edits are what earlier bonuses did to their own text.
export type BonusRacer = { racerKey: string; position: number; isFinished: boolean; isOut: boolean; edits: readonly TextEdit[]; bonusesReceived: number };

type AwardBase = { racerKey: string; checkpoint: BonusCheckpoint };

// racerKey is always the trailing racer who received the bonus; an "add-words" award changes the text of targetKey, the leader, instead.
export type BonusAward = (AwardBase & { kind: 'remove-words'; wordsRemoved: number }) | (AwardBase & { kind: 'add-words'; targetKey: string; addedWords: string });

// The server draws with a secure source and the race's text settings; tests pass fixed draws. words is null when no word can be drawn.
export type BonusDraw = { kind: () => CatchUpBonusKind; words: () => string | null };

export type CheckpointRace = { isEnabled: boolean; passage: string; checkpointsPassed: number; racers: readonly BonusRacer[] };

export type CheckpointOutcome = { checkpointsPassed: number; awards: BonusAward[] };

// A share of the racer's own text, kept as a fraction so a gap of exactly 25 points never counts as more.
type Share = { typed: number; length: number };

type Checkpoint = { passage: string; checkpoint: BonusCheckpoint; leader: BonusRacer | null; draw: BonusDraw };

const { trailingGapPoints, maxPerRacer, removedWords, kindWeights } = gameConfig.catchUpBonuses;

// Each checkpoint the leader has reached is settled in order, on the texts the previous checkpoint left, so one jump past two checkpoints settles both.
export function awardDueBonuses(race: CheckpointRace, draw: BonusDraw): CheckpointOutcome {
  if (!race.isEnabled) return { checkpointsPassed: race.checkpointsPassed, awards: [] };
  let racers = race.racers;
  const awards: BonusAward[] = [];
  let checkpointsPassed = race.checkpointsPassed;
  for (const checkpoint of bonusCheckpoints.slice(checkpointsPassed)) {
    const leader = leaderShare(race.passage, racers);
    if (leader === null || !hasReached(leader, checkpoint)) break;
    const checkpointAwards = awardsAt(racers, { passage: race.passage, checkpoint, leader: lengthenedLeader(race.passage, racers), draw });
    racers = racers.map((racer) => withAwards(racer, checkpointAwards));
    awards.push(...checkpointAwards);
    checkpointsPassed += 1;
  }
  return { checkpointsPassed, awards };
}

// Whether the leader reached the next unsettled checkpoint, so the server prepares a draw only when one is due.
export function hasDueCheckpoint(race: CheckpointRace): boolean {
  const next = bonusCheckpoints[race.checkpointsPassed];
  const leader = leaderShare(race.passage, race.racers);
  return race.isEnabled && next !== undefined && leader !== null && hasReached(leader, next);
}

function trailingRacers(passage: string, racers: readonly BonusRacer[]): BonusRacer[] {
  const stillTyping = racersInRace(racers).filter((racer) => !racer.isFinished);
  const leader = leaderShare(passage, racers);
  const lowest = mostExtreme(stillTyping.map((racer) => shareOf(passage, racer)), lowestFirst);
  if (leader === null || lowest === null) return [];
  return stillTyping.filter((racer) => isTrailing(shareOf(passage, racer), leader, lowest));
}

// Receivers are taken in racer-key order, the order the server reads awards back in, so every view applies the same edits in the same order.
function awardsAt(racers: readonly BonusRacer[], context: Checkpoint): BonusAward[] {
  return trailingRacers(context.passage, racers)
    .filter((racer) => racer.bonusesReceived < maxPerRacer)
    .sort(compareRacerKeys)
    .flatMap((racer) => awardFor(racer, context));
}

// A drawn "+3 mots" that cannot apply (no leader still typing, no word to draw) gives "-3 mots" instead.
function awardFor(racer: BonusRacer, context: Checkpoint): BonusAward[] {
  return addWordsAward(racer, context) ?? removeWordsAward(racer, context);
}

function addWordsAward(racer: BonusRacer, { checkpoint, leader, draw }: Checkpoint): BonusAward[] | null {
  if (leader === null || draw.kind() !== 'add-words') return null;
  const addedWords = draw.words();
  return addedWords === null ? null : [{ racerKey: racer.racerKey, checkpoint, kind: 'add-words', targetKey: leader.racerKey, addedWords }];
}

function removeWordsAward(racer: BonusRacer, { passage, checkpoint }: Checkpoint): BonusAward[] {
  const wordsRemoved = removableWordCount(editedText(passage, racer.edits), racer.position, removedWords);
  return wordsRemoved === 0 ? [] : [{ racerKey: racer.racerKey, checkpoint, kind: 'remove-words', wordsRemoved }];
}

// The one racer whose text "+3 mots" lengthens: the leader still typing, the smallest racer key on a tie. A finished leader has no text left to lengthen.
function lengthenedLeader(passage: string, racers: readonly BonusRacer[]): BonusRacer | null {
  const leader = leaderShare(passage, racers);
  if (leader === null) return null;
  const leaders = racersInRace(racers).filter((racer) => compareShares(shareOf(passage, racer), leader) === 0).sort(compareRacerKeys);
  const first = leaders[0];
  return first && !first.isFinished ? first : null;
}

function withAwards(racer: BonusRacer, awards: readonly BonusAward[]): BonusRacer {
  const received = awards.filter((award) => award.racerKey === racer.racerKey).length;
  const edits = awards.flatMap((award) => (textOwnerOf(award) === racer.racerKey ? [textEditOf(award)] : []));
  if (received === 0 && edits.length === 0) return racer;
  return { ...racer, edits: [...racer.edits, ...edits], bonusesReceived: racer.bonusesReceived + received };
}

// The racer whose own text the award changes.
function textOwnerOf(award: BonusAward): string {
  return award.kind === 'add-words' ? award.targetKey : award.racerKey;
}

function textEditOf(award: BonusAward): TextEdit {
  return award.kind === 'add-words' ? { kind: 'add-words', addedWords: award.addedWords } : { kind: 'remove-words', wordsRemoved: award.wordsRemoved };
}

// Each kind by its weight in the game config.
export function drawBonusKind(random: RandomSource): CatchUpBonusKind {
  const total = catchUpBonusKinds.reduce((sum, kind) => sum + kindWeights[kind], 0);
  let remaining = random() * total;
  return catchUpBonusKinds.find((kind) => (remaining -= kindWeights[kind]) < 0) ?? catchUpBonusKinds[0];
}

export function compareRacerKeys(first: { racerKey: string }, second: { racerKey: string }): number {
  if (first.racerKey === second.racerKey) return 0;
  return first.racerKey < second.racerKey ? -1 : 1;
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
  const length = Math.max(1, editedTextLength(passage, racer.edits));
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
