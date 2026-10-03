import { isBotCharacterId, type BotCharacterId } from '@/assets/bot-characters';

const botKeyPrefix = 'bot-';

// A character races once per room, so its id names the bot there; the prefix keeps it apart from a human's uuid member key.
export function botMemberKey(character: BotCharacterId): string {
  return `${botKeyPrefix}${character}`;
}

export function parseBotMemberKey(memberKey: string): BotCharacterId | null {
  if (!memberKey.startsWith(botKeyPrefix)) return null;
  const character = memberKey.slice(botKeyPrefix.length);
  return isBotCharacterId(character) ? character : null;
}
