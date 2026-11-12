import type { RoomId } from '@/domain/room-id';
import type { TimeLimit } from '@/domain/time-limit';

// The server reads the host from the session cookie and checks the role and the value itself.
export async function requestTimeLimit(roomId: RoomId, timeLimitSeconds: TimeLimit): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/time-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeLimitSeconds }),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
