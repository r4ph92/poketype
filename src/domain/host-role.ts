// What the host does in the room's races: race like everyone, or only watch and run the room (SALLE-01). Only the host has a choice.
export const hostRoles = ['participant', 'spectator'] as const;

export type HostRole = (typeof hostRoles)[number];

export const defaultHostRole: HostRole = 'participant';

export function isHostRole(value: unknown): value is HostRole {
  return hostRoles.some((role) => role === value);
}

// An absent or unknown value is not worth an error: it opens a racing host, like the quick create buttons that send no choice.
export function parseHostRole(value: unknown): HostRole {
  return isHostRole(value) ? value : defaultHostRole;
}
