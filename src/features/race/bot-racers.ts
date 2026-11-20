import { memberText } from '@/domain/catch-up-bonus-view';
import { botProgressAt } from '@/domain/bot-race';
import type { RaceView, RoomMemberView } from '@/domain/room-view';

type BotRaceTexts = Pick<RaceView, 'passage' | 'bonuses' | 'errorMode'>;

// Moves each bot to where its seed puts it on its own text on the server clock, the computation the server settles with, so bots glide between snapshots.
// Before the clock is known, or for a bot without a race seed, the snapshot's own progress stays.
export function withBotProgressAt(members: readonly RoomMemberView[], race: BotRaceTexts, elapsedMs: number | null): RoomMemberView[] {
  if (elapsedMs === null) return [...members];
  return members.map((member) => {
    if (!member.bot || member.bot.seed === null || member.progress === null) return member;
    const course = { text: memberText(race.passage, race.bonuses, member.memberKey), errorMode: race.errorMode };
    const { position, finishMs } = botProgressAt({ level: member.bot.level, seed: member.bot.seed }, course, Math.max(0, elapsedMs));
    return { ...member, progress: { ...member.progress, position, finishMs } };
  });
}
