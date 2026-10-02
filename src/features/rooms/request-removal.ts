import type { RoomId } from '@/domain/room-id';

// The server reads the host from the session cookie and checks the role and the removal rules itself.
export async function requestRemoval(roomId: RoomId, memberKey: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/remove`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberKey }),
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
