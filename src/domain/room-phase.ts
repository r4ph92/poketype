export const roomPhases = ['waiting', 'countdown', 'racing', 'results', 'closed'] as const;

export type RoomPhase = (typeof roomPhases)[number];
