import type { RoomId } from '@/domain/room-id';

export type RoomCommand = 'leave' | 'abandon' | 'start' | 'prepare';

export const networkFailureStatus = 0;

// The server reads the player from the session cookie, so the request carries no body worth naming anyone.
export async function postRoomCommandForStatus(roomId: RoomId, command: RoomCommand): Promise<number> {
  try {
    const response = await fetch(`/api/rooms/${roomId}/${command}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      cache: 'no-store',
    });
    return response.status;
  } catch {
    return networkFailureStatus;
  }
}

export async function postRoomCommand(roomId: RoomId, command: RoomCommand): Promise<boolean> {
  const status = await postRoomCommandForStatus(roomId, command);
  return status >= 200 && status < 300;
}
