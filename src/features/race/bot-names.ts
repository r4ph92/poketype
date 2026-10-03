import { botCharacterOf } from '@/assets/bot-characters';
import type { RoomMemberView } from '@/domain/room-view';
import type { Locale } from '@/i18n/config';

type NamedRacer = Pick<RoomMemberView, 'trainerName' | 'bot'>;

// A bot's official name differs by language (Pierre, Brock), so every view shows it in its own interface language.
export function withLocalBotNames<Racer extends NamedRacer>(racers: readonly Racer[], locale: Locale): Racer[] {
  return racers.map((racer) => (racer.bot ? { ...racer, trainerName: botCharacterOf(racer.bot.character).name[locale] } : racer));
}
