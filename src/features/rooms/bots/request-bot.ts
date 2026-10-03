import type { BotLevel } from '@/assets/bot-characters';
import type { RoomId } from '@/domain/room-id';

export type BotRequestOutcome = 'added' | 'level-full' | 'full' | 'failed';

// The server reads the host from the session cookie, checks the role and the free seats, and draws the character itself.
export async function requestBot(roomId: RoomId, level: BotLevel): Promise<BotRequestOutcome> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/bots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level }),
      cache: 'no-store',
    });
    if (response.ok) return 'added';
    return response.status === 409 ? refusalOf(await response.json().catch(() => null)) : 'failed';
  } catch {
    return 'failed';
  }
}

function refusalOf(json: unknown): BotRequestOutcome {
  const result = typeof json === 'object' && json !== null ? (json as { result?: unknown }).result : null;
  return result === 'level-full' || result === 'full' ? result : 'failed';
}
