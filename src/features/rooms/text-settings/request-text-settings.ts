import type { RoomId } from '@/domain/room-id';
import type { TextSettings } from '@/domain/text-settings';

// The server reads the host from the session cookie and checks the role and every value itself.
export async function requestTextSettings(roomId: RoomId, settings: TextSettings): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
