// The body of a 403 snapshot answer to a player whom preparing the next race removed for abandoning; a plain 403 has no body.
export const removedAfterAbandon = { reason: 'abandoned' } as const;

export function isRemovedAfterAbandon(json: unknown): boolean {
  return typeof json === 'object' && json !== null && (json as { reason?: unknown }).reason === removedAfterAbandon.reason;
}
