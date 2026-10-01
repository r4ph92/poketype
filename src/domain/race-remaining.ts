// The timer shows whole seconds rounded up, so it reads 0:00 only once the deadline has passed on the server clock.
export function remainingSecondsAt(deadlineAt: number, serverNow: number): number {
  return Math.max(0, Math.ceil((deadlineAt - serverNow) / 1000));
}

export function msUntilNextRemainingChange(deadlineAt: number, serverNow: number): number | null {
  const remainingMs = deadlineAt - serverNow;
  if (remainingMs <= 0) return null;
  return remainingMs - (Math.ceil(remainingMs / 1000) - 1) * 1000;
}

// Minutes and zero-padded seconds, like a game clock: 180 → "3:00".
export function formatRemainingTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
