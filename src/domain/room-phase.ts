export const roomPhases = ['waiting', 'countdown', 'racing', 'results', 'closed'] as const;

export type RoomPhase = (typeof roomPhases)[number];

export function isRoomPhase(value: unknown): value is RoomPhase {
  return roomPhases.some((phase) => phase === value);
}

// Stored when a room closes, so its members learn why they were sent home. host-closed: the host closed it from the results screen.
export const roomCloseReasons = ['host-left', 'idle', 'host-closed'] as const;

export type RoomCloseReason = (typeof roomCloseReasons)[number];

export type OpenRoomPhase = Exclude<RoomPhase, 'closed'>;

export function isRoomOpen(phase: RoomPhase | null): phase is OpenRoomPhase {
  return phase !== null && phase !== 'closed';
}

// A room on its results screen takes newcomers for the next race; a race in countdown or running never does.
export function acceptsNewMembers(phase: RoomPhase | null): boolean {
  return phase === 'waiting' || phase === 'results';
}

export function holdsRace(phase: RoomPhase): boolean {
  return phase === 'countdown' || phase === 'racing' || phase === 'results';
}

// Racing is derived from the clock, so a running race is stored as countdown; racing is accepted for rooms that ever hold it.
export function isRaceRunning(phase: RoomPhase): boolean {
  return phase === 'countdown' || phase === 'racing';
}
