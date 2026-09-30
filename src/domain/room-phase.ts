export const roomPhases = ['waiting', 'countdown', 'racing', 'results', 'closed'] as const;

export type RoomPhase = (typeof roomPhases)[number];

export function isRoomPhase(value: unknown): value is RoomPhase {
  return roomPhases.some((phase) => phase === value);
}
