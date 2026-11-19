import type { RoomId } from '@/domain/room-id';

// The server reads the host from the session cookie and checks the role and the value itself.
export async function requestCatchUpBonuses(roomId: RoomId, isEnabled: boolean): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/catch-up-bonuses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: isEnabled }),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
