export const roomPhases = ['waiting', 'closed'] as const;

export type RoomPhase = (typeof roomPhases)[number];
