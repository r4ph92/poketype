import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import type { ServerTimeSample } from '@/domain/server-clock';

export type RoomConnection = 'live' | 'reconnecting';

// onServerTime gets one sample per answered request, changed or not, so the clock keeps refining while the room stays the same.
export type RoomSubscriber = {
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onServerTime: (sample: ServerTimeSample) => void;
  onConnectionChange: (connection: RoomConnection) => void;
  onGone: () => void;
  onSessionEnded: () => void;
  onNoLongerMember: () => void;
};

export type Unsubscribe = () => void;

// The one boundary live room updates go through.
export type SubscribeToRoom = (roomId: RoomId, fromRevision: number, subscriber: RoomSubscriber) => Unsubscribe;
