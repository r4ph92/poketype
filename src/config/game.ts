export const gameConfig = {
  guestSessionLifetimeHours: 12,
  trainerName: { minLength: 2, maxLength: 16, maxSubmittedLength: 100 },
  copyConfirmationSeconds: 3,
  account: {
    username: { minLength: 3, maxLength: 20, maxSubmittedLength: 100 },
    password: { minLength: 8, maxLength: 128, maxSubmittedLength: 200 },
    sessionLifetimeHours: 12,
    replayWindowMinutes: 10,
    replayCompletionSeconds: 60,
    passwordHashing: { maxRunning: 2, maxWaiting: 8 },
  },
  // Without live push, racePollIntervalMs keeps a rival's progress under 1 s old during a race (about four snapshot reads a second per tab).
  roomSync: {
    waitingPollIntervalMs: 1000,
    racePollIntervalMs: 250,
    firstPollDelayMs: 0,
    requestTimeoutMs: 1300,
    timeoutBackoffStepMs: 100,
    maxRequestTimeoutMs: 1500,
    clockSampleWindow: 5,
  },
  // While push is live, polling only keeps the clock fresh and catches database-driven changes (room gone, session ended); 1 s keeps those under the 2 s bound.
  push: {
    keepaliveWaitingPollIntervalMs: 1000,
    keepaliveRacePollIntervalMs: 1000,
    publishTimeoutMs: 2000,
    socketActivityTimeoutMs: 10_000,
    socketPongTimeoutMs: 5000,
    clientReleaseDelayMs: 1000,
    maxChannelAuthBodyBytes: 256,
  },
  // minimumPlayers is H6 (provisional: two humans); syncLeadMs lets a polling player see the start before the 3.
  // The speed caps (H3, provisional) are cumulative from the start: far above a child's speed, they only stop a crafted report from jumping ahead.
  race: {
    minimumPlayers: 2,
    countdownSeconds: 3,
    syncLeadMs: 1500,
    progressBatchMs: 250,
    progressRetryMs: 500,
    maxCharactersPerSecond: 20,
    maxKeystrokesPerSecond: 25,
    progressBurstAllowance: 10,
    maxProgressCounter: 2_147_483_647,
    maxProgressBodyBytes: 256,
  },
  // H3 (provisional). minimumElapsedMs keeps a finish inside the burst allowance from dividing by a zero or near-zero time.
  scoring: {
    charactersPerWord: 5,
    minimumElapsedMs: 1000,
  },
} as const;

// Account usernames become the trainer name on sign-up, so the longest displayed name is the larger of the two limits.
export const maxDisplayNameLength = Math.max(gameConfig.trainerName.maxLength, gameConfig.account.username.maxLength);
