// The body of a 403 snapshot answer to a player who is no longer in the room for a reason their page must show instead of rejoining:
// preparing the next race removed them for abandoning, or the host removed them from the waiting room. A plain 403 has no body.
export const removedAfterAbandon = { reason: 'abandoned' } as const;

export const removedByHost = { reason: 'removed-by-host' } as const;

export function isRemovedAfterAbandon(json: unknown): boolean {
  return reasonOf(json) === removedAfterAbandon.reason;
}

export function isRemovedByHost(json: unknown): boolean {
  return reasonOf(json) === removedByHost.reason;
}

function reasonOf(json: unknown): unknown {
  return typeof json === 'object' && json !== null ? (json as { reason?: unknown }).reason : undefined;
}
