import type { RoomId } from '@/domain/room-id';
import type { RoomSnapshot } from '@/domain/room-view';
import type { ServerTimeSample } from '@/domain/server-clock';

export type RoomConnection = 'live' | 'reconnecting';

// idle: the room closed for inactivity; closed: the host closed it or it no longer exists;
// removed: the host prepared the next race and the viewer, who abandoned the last one, is no longer in the room;
// removed-by-host: the host removed the viewer from the waiting room.
export type RoomGoneReason = 'closed' | 'idle' | 'removed' | 'removed-by-host';

// onServerTime gets one sample per answered request, changed or not, so the clock keeps refining while the room stays the same.
export type RoomSubscriber = {
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onServerTime: (sample: ServerTimeSample) => void;
  onConnectionChange: (connection: RoomConnection) => void;
  onGone: (reason: RoomGoneReason) => void;
  onSessionEnded: () => void;
  onNoLongerMember: () => void;
};

export type Unsubscribe = () => void;

// The one boundary live room updates go through.
export type SubscribeToRoom = (roomId: RoomId, fromRevision: number, subscriber: RoomSubscriber) => Unsubscribe;
