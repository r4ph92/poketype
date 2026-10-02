// public rooms are listed and offered by "Faire une course"; unlisted rooms are reached only by their code or link.
export const roomVisibilities = ['public', 'unlisted'] as const;

export type RoomVisibility = (typeof roomVisibilities)[number];

export const defaultRoomVisibility: RoomVisibility = 'public';

export function isRoomVisibility(value: unknown): value is RoomVisibility {
  return roomVisibilities.some((visibility) => visibility === value);
}
