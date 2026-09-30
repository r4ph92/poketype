import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';

export type RoomConnection = 'live' | 'reconnecting';

export type RoomSubscriber = {
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onConnectionChange: (connection: RoomConnection) => void;
  onGone: () => void;
  onSessionEnded: () => void;
};

export type Unsubscribe = () => void;

// The one boundary live room updates go through.
export type SubscribeToRoom = (roomId: RoomId, fromRevision: number, subscriber: RoomSubscriber) => Unsubscribe;
