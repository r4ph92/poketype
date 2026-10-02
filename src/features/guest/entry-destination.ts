import { roomPath, type RoomId } from '@/domain/room-id';

export const findRaceIntent = 'find-race';

export function destinationAfterEntry(returnRoomId: RoomId | null): string {
  return returnRoomId ? roomPath(returnRoomId) : '/play';
}
