import type { PollingEnvironment } from './polling-room-subscription';
import { RoomPoller } from './room-poller';
import type { ConnectRoomPush } from './room-push';
import type { SubscribeToRoom } from './room-subscription';

// Push only hints that the room changed; the member-gated snapshot stays the single source of truth, fetched by the same poller.
export function createPushedSubscription(environment: PollingEnvironment, connectRoomPush: ConnectRoomPush): SubscribeToRoom {
  return (roomId, fromRevision, subscriber) => {
    const poller = new RoomPoller(environment, { roomId, fromRevision }, subscriber);
    const stopPolling = poller.start();
    const disconnect = connectRoomPush(roomId, {
      onLiveChange: (isLive) => poller.setPushLive(isLive),
      onRevision: (revision) => poller.notePing(revision),
    });
    return () => {
      disconnect();
      stopPolling();
    };
  };
}
