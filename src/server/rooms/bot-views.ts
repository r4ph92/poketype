import { botCharacterOf } from '@/assets/bot-characters';
import { defaultLocale } from '@/i18n/config';
import { botMemberKey } from '@/domain/bot-member';
import { botProgressAt } from '@/domain/bot-race';
import { passageLength } from '@/domain/passage';
import type { RaceResultRow, RacerProgress, ResultRacer, RoomMemberView } from '@/domain/room-view';
import type { RoomBot } from './room-bots';
import { finishTimeMs, type CurrentRace, type RaceBotRow } from './race-rows';

// The race a bot view is read in: its own row, and the moment of the read for a race still running.
export type BotRaceContext = { race: CurrentRace; raceBot: RaceBotRow | undefined; readAt: Date };

type RaceWithBots = { race: CurrentRace; raceBots: readonly RaceBotRow[] };

export function toBotMembers(bots: readonly RoomBot[], raceWithBots: RaceWithBots | null, readAt: Date): RoomMemberView[] {
  return bots.map((bot) => {
    if (!raceWithBots) return toBotMemberView(bot, null);
    const raceBot = raceWithBots.raceBots.find((row) => row.character === bot.character);
    return toBotMemberView(bot, { race: raceWithBots.race, raceBot, readAt });
  });
}

// The view's interface language replaces the French name; the snapshot carries no locale.
export function toBotMemberView(bot: RoomBot, raceContext: BotRaceContext | null): RoomMemberView {
  const character = botCharacterOf(bot.character);
  return {
    memberKey: botMemberKey(bot.character),
    trainerName: character.name[defaultLocale],
    hasAccount: false,
    isHost: false,
    isViewer: false,
    partner: character.pokemon,
    profile: null,
    progress: raceContext ? botRacerProgress(raceContext) : null,
    bot: { character: bot.character, level: bot.level, seed: raceContext?.raceBot?.seed ?? null },
  };
}

// A past race's page names a bot from its race entry, even after the host removed it from the room.
export function toBotResultRacer({ character, level }: RaceBotRow): ResultRacer {
  const { memberKey, trainerName, isViewer, partner, bot } = toBotMemberView({ character, level }, null);
  return { memberKey, trainerName, isViewer, partner, bot };
}

// Settled results are frozen; a running race is computed from the seed at the read, the same way the race view and the settlement compute it.
function botRacerProgress({ race, raceBot, readAt }: BotRaceContext): RacerProgress {
  if (!raceBot) return { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 };
  if (raceBot.place !== null) return settledProgress(race, raceBot);
  const elapsedMs = Math.max(0, readAt.getTime() - race.startsAt.getTime());
  const { position, finishMs } = botProgressAt(raceBot, passageLength(race.passage), elapsedMs);
  return { position, finishMs, abandoned: false, inactive: false, lastProgressMs: finishMs ?? elapsedMs };
}

function settledProgress(race: CurrentRace, raceBot: RaceBotRow): RacerProgress {
  const finishMs = finishTimeMs(raceBot.finishedAt, race.startsAt);
  const endMs = finishTimeMs(race.endedAt, race.startsAt) ?? 0;
  return { position: raceBot.position ?? 0, finishMs, abandoned: false, inactive: false, lastProgressMs: finishMs ?? endMs };
}

export function toBotResultRows(race: CurrentRace, raceBots: readonly RaceBotRow[]): RaceResultRow[] {
  if (race.endedAt === null) return [];
  return raceBots.flatMap((raceBot) => toBotResultRow(race, raceBot) ?? []);
}

function toBotResultRow(race: CurrentRace, raceBot: RaceBotRow): RaceResultRow | null {
  const { place, grossWpm, score, accuracy, rejectedKeystrokes, finishedAt } = raceBot;
  if (place === null || grossWpm === null || score === null || accuracy === null || rejectedKeystrokes === null) return null;
  const memberKey = botMemberKey(raceBot.character);
  return { memberKey, standing: 'ranked', place, grossWpm, score, accuracy, errors: rejectedKeystrokes, finishMs: finishTimeMs(finishedAt, race.startsAt) };
}
