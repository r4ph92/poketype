import type { BotCharacterId } from '@/assets/bot-characters';
import { botMemberKey } from '@/domain/bot-member';
import type { BotCourse } from '@/domain/bot-race';
import { racerTextIn, type RaceBonusRow } from './race-bonuses';
import type { CurrentRace } from './race-rows';

// What a bot types in a race: its own text as catch-up bonuses left it (words removed for it, words added to it), in the race's error mode.
export function botCourseIn(race: Pick<CurrentRace, 'passage' | 'errorMode'>, bonuses: readonly RaceBonusRow[], character: BotCharacterId): BotCourse {
  return { text: racerTextIn(race, bonuses, botMemberKey(character)), errorMode: race.errorMode };
}
