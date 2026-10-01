export const gameConfig = {
  guestSessionLifetimeHours: 12,
  trainerName: { minLength: 2, maxLength: 16, maxSubmittedLength: 100 },
  copyConfirmationSeconds: 3,
  roomSync: { waitingPollIntervalMs: 1000, requestTimeoutMs: 1300, timeoutBackoffStepMs: 100, maxRequestTimeoutMs: 1500 },
  // minimumPlayers is H6 (provisional: two humans); syncLeadMs lets a polling player see the start before the 3.
  race: { minimumPlayers: 2, countdownSeconds: 3, syncLeadMs: 1500 },
} as const;
