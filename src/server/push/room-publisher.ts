import 'server-only';
import { after } from 'next/server';
import { revisionEvent, revisionPing, roomChannelName } from '@/domain/room-channel';
import type { RoomId } from '@/domain/room-id';
import { database } from '../db/client';
import { findRoomRevision } from '../rooms/room-snapshot';
import { pushServer } from './push-server';

// Runs after the response, so after the command's commit; a failed publish only costs latency, because polling still catches up.
export function announceRoomChange(roomId: RoomId): void {
  after(() => publishRoomRevision(roomId));
}

async function publishRoomRevision(roomId: RoomId): Promise<void> {
  const pusher = pushServer();
  if (!pusher) return;
  try {
    const revision = await findRoomRevision(database, roomId);
    if (revision !== null) await pusher.trigger(roomChannelName(roomId), revisionEvent, revisionPing(revision));
  } catch (error) {
    console.error('Room revision push failed; members keep polling.', error);
  }
}
