import type Pusher from 'pusher-js';
import type { Channel } from 'pusher-js';
import type { PublicPushConfig } from '@/domain/push-config';
import { parseRevisionPing, revisionEvent, roomChannelName } from '@/domain/room-channel';
import type { RoomId } from '@/domain/room-id';
import type { ConnectRoomPush, RoomPushListener } from './room-push';
import type { Unsubscribe } from './room-subscription';
import { acquirePusher, releasePusher } from './shared-pusher-client';

const subscriptionEvents = ['pusher:subscription_succeeded', 'pusher:subscription_error'];

export function pusherRoomPush(config: PublicPushConfig): ConnectRoomPush {
  return (roomId, listener) => new PusherRoomChannel(config, roomId, listener).open();
}

// Live means connected and subscribed; pusher-js reconnects and resubscribes by itself, and each change is reported so polling can take over or ease off.
class PusherRoomChannel {
  private pusher: Pusher | null = null;
  private channel: Channel | null = null;
  private isLive = false;
  private isClosed = false;

  constructor(
    private readonly config: PublicPushConfig,
    private readonly roomId: RoomId,
    private readonly listener: RoomPushListener,
  ) {}

  open(): Unsubscribe {
    acquirePusher(this.config).then(
      (pusher) => this.attach(pusher),
      () => this.updateLive(),
    );
    return () => this.close();
  }

  private attach(pusher: Pusher): void {
    if (this.isClosed) return;
    this.pusher = pusher;
    this.channel = pusher.subscribe(roomChannelName(this.roomId));
    this.channel.bind(revisionEvent, this.handleRevision);
    subscriptionEvents.forEach((eventName) => this.channel!.bind(eventName, this.updateLive));
    pusher.connection.bind('state_change', this.updateLive);
    this.updateLive();
  }

  private readonly handleRevision = (data: unknown): void => {
    const revision = parseRevisionPing(data);
    if (revision !== null) this.listener.onRevision(revision);
  };

  private readonly updateLive = (): void => {
    const isLive = !this.isClosed && this.pusher?.connection.state === 'connected' && this.channel?.subscribed === true;
    if (isLive === this.isLive) return;
    this.isLive = isLive;
    this.listener.onLiveChange(isLive);
  };

  private close(): void {
    this.isClosed = true;
    this.channel?.unbind(revisionEvent, this.handleRevision);
    subscriptionEvents.forEach((eventName) => this.channel?.unbind(eventName, this.updateLive));
    this.pusher?.connection.unbind('state_change', this.updateLive);
    this.pusher?.unsubscribe(roomChannelName(this.roomId));
    releasePusher();
  }
}
