import type { RoomId } from '@/domain/room-id';
import type { RoomVisibility } from '@/domain/room-visibility';

// The server reads the host from the session cookie and checks the role itself.
export async function requestVisibility(roomId: RoomId, visibility: RoomVisibility): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/visibility`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visibility }),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
