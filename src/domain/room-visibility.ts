// public rooms are listed and offered by "Faire une course"; unlisted rooms ("Sur code") are reached by their code or link;
// private rooms admit only their members and the holders of a personal invitation link.
export const roomVisibilities = ['public', 'unlisted', 'private'] as const;

export type RoomVisibility = (typeof roomVisibilities)[number];

export const defaultRoomVisibility: RoomVisibility = 'public';

export function isRoomVisibility(value: unknown): value is RoomVisibility {
  return roomVisibilities.some((visibility) => visibility === value);
}

export function invitesByLink(visibility: RoomVisibility): boolean {
  return visibility !== 'public';
}
