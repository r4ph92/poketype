import { gameConfig } from '@/config/game';

// Epoch milliseconds on the server clock: at idleAt the room leaves the public list, at closesAt it closes.
export type LobbyIdle = { idleAt: number; closesAt: number };

const { idleAfterMs, closeAfterMs } = gameConfig.rooms;

export function lobbyIdleOf(lastActivityAt: Date): LobbyIdle {
  const activityMs = lastActivityAt.getTime();
  return { idleAt: activityMs + idleAfterMs, closesAt: activityMs + closeAfterMs };
}

export function isLobbyIdleAt({ idleAt }: LobbyIdle, serverNow: number): boolean {
  return serverNow >= idleAt;
}

export function isLobbyClosingAt({ closesAt }: LobbyIdle, serverNow: number): boolean {
  return serverNow >= closesAt;
}

export function idleThresholdAt(now: Date): Date {
  return new Date(now.getTime() - idleAfterMs);
}
