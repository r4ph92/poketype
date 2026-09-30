export const gameConfig = {
  guestSessionLifetimeHours: 12,
  trainerName: { minLength: 2, maxLength: 16, maxSubmittedLength: 100 },
  copyConfirmationSeconds: 3,
  roomSync: { waitingPollIntervalMs: 1000, requestTimeoutMs: 1000 },
} as const;
