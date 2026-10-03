import type { GuestId } from '@/domain/guest-id';
import type { RoomId } from '@/domain/room-id';
import { isRoomOpen } from '@/domain/room-phase';
import { areSameTextSettings, type TextSettings } from '@/domain/text-settings';
import type { Database, DatabaseTransaction } from '../db/types';
import { closeIfIdle, recordLobbyActivity } from './idle-room';
import { bumpRevision, isMember, lockRoom } from './room-rows';
import { findTextSettings, storeTextSettings } from './room-text-settings';

export type ChangeTextSettingsRequest = { roomId: RoomId; guestId: GuestId; settings: TextSettings; changedAt: Date };

export type ChangeTextSettingsResult = 'changed' | 'unchanged' | 'race-started' | 'not-host' | 'not-member' | 'not-found';

// Only the host, only in the waiting room: the next start reads these settings. A change is lobby activity, like a visibility switch.
export async function changeRoomTextSettings(database: Database, request: ChangeTextSettingsRequest): Promise<ChangeTextSettingsResult> {
  const { roomId, guestId, settings, changedAt } = request;
  return database.transaction(async (transaction) => {
    const room = await lockRoom(transaction, roomId);
    if (!room || !isRoomOpen(room.phase)) return 'not-found';
    if (!(await isMember(transaction, roomId, guestId))) return 'not-member';
    if (await closeIfIdle(transaction, room, changedAt)) return 'not-found';
    if (room.hostGuestId !== guestId) return 'not-host';
    if (room.phase !== 'waiting') return 'race-started';
    const current = await findTextSettings(transaction, roomId);
    if (current && areSameTextSettings(current, settings)) return 'unchanged';
    await saveSettings(transaction, request);
    return 'changed';
  });
}

async function saveSettings(transaction: DatabaseTransaction, { roomId, settings, changedAt }: ChangeTextSettingsRequest): Promise<void> {
  await storeTextSettings(transaction, roomId, settings);
  await recordLobbyActivity(transaction, roomId, changedAt);
  await bumpRevision(transaction, roomId);
}
