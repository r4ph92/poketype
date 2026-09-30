export const roomPhases = ['waiting', 'countdown', 'racing', 'results', 'closed'] as const;

export type RoomPhase = (typeof roomPhases)[number];

export function isRoomPhase(value: unknown): value is RoomPhase {
  return roomPhases.some((phase) => phase === value);
}

export type OpenRoomPhase = Exclude<RoomPhase, 'closed'>;

export function isRoomOpen(phase: RoomPhase | null): phase is OpenRoomPhase {
  return phase !== null && phase !== 'closed';
}

export function acceptsNewMembers(phase: RoomPhase): boolean {
  return phase === 'waiting';
}
