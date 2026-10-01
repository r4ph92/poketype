import type { RoomId } from '@/domain/room-id';

export type RoomCommand = 'leave' | 'abandon';

// The server reads the player from the session cookie, so the request carries no body worth naming anyone.
export async function postRoomCommand(roomId: RoomId, command: RoomCommand): Promise<boolean> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });
    return response.ok;
  } catch {
    return false;
  }
}
