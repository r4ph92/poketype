import type { RoomId } from '@/domain/room-id';
import type { Unsubscribe } from './room-subscription';

export type RoomPushListener = {
  onLiveChange: (isLive: boolean) => void;
  onRevision: (revision: number) => void;
};

export type ConnectRoomPush = (roomId: RoomId, listener: RoomPushListener) => Unsubscribe;
