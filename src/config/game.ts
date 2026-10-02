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
    loginThrottle: { maxFailures: 5, windowMinutes: 5, lockMinutes: 5 },
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
  // timeLimitSeconds is the normal maximum duration (H4, provisional default), counted from "Partez !" so the countdown never eats typing time.
  // leaderBarSize is how many leaders the bar above the map shows; the viewer is added when outside them.
  race: {
    minimumPlayers: 2,
    timeLimitSeconds: 180,
    countdownSeconds: 3,
    syncLeadMs: 1500,
    progressBatchMs: 250,
    progressRetryMs: 500,
    maxCharactersPerSecond: 20,
    maxKeystrokesPerSecond: 25,
    progressBurstAllowance: 10,
    maxProgressCounter: 2_147_483_647,
    maxProgressBodyBytes: 256,
    leaderBarSize: 3,
  },
  // capacity is the technical room limit (SAL-3: no product maximum), checked under the room lock on every join.
  // Placement tries at most placementCandidates rooms before creating one; the public list refreshes every refreshIntervalMs (rooms appear or vanish within 2 s) and shows at most listLimit rooms.
  // A waiting room with no join or leave for idleAfterMs is hidden from the list and placement; at closeAfterMs it closes (JEU-4).
  // codeGenerationAttempts bounds the retries when a new room code is already taken; codeThrottle locks a session after maxFailures unknown codes within windowMinutes.
  rooms: {
    capacity: 32,
    placementCandidates: 10,
    idleAfterMs: 5 * 60_000,
    closeAfterMs: 10 * 60_000,
    codeGenerationAttempts: 5,
    maxSubmittedCodeLength: 32,
    maxVisibilityBodyBytes: 64,
    codeThrottle: { maxFailures: 10, windowMinutes: 1, lockMinutes: 1 },
  },
  publicRooms: {
    refreshIntervalMs: 1000,
    requestTimeoutMs: 1300,
    listLimit: 50,
  },
  // H3 (provisional). minimumElapsedMs keeps a finish inside the burst allowance from dividing by a zero or near-zero time.
  scoring: {
    charactersPerWord: 5,
    minimumElapsedMs: 1000,
  },
  // docs/PROGRESSION.md: a Pokémon joins at startingLevel with 0 XP; the next level costs xpToNextLevel.base + xpToNextLevel.perLevel × the current level.
  // A race grants raceXp.base + raceXp.beatEveryoneBonus × racers beaten ÷ (racers − 1), rounded; XP and Poké Dollars count only with rewardMinimumRacers.
  progression: {
    starterDexes: [1, 4, 7],
    startingLevel: 1,
    maxLevel: 99,
    xpToNextLevel: { base: 50, perLevel: 10 },
    rewardMinimumRacers: 2,
    raceXp: { base: 50, beatEveryoneBonus: 100 },
  },
  // docs/PROGRESSION.md: a race pays raceCoins in Poké Dollars with the same formula as the XP; each badge earned adds badgeCoins once.
  // A purchase buys 1 to maxPurchaseQuantity of one item; prices are in Poké Dollars and only the server reads them.
  economy: {
    raceCoins: { base: 100, beatEveryoneBonus: 100 },
    badgeCoins: 500,
    maxPurchaseQuantity: 99,
    shopItems: [
      { id: 'fire-stone', kind: 'stone', price: 1500 },
      { id: 'water-stone', kind: 'stone', price: 1500 },
      { id: 'thunder-stone', kind: 'stone', price: 1500 },
      { id: 'leaf-stone', kind: 'stone', price: 1500 },
      { id: 'moon-stone', kind: 'stone', price: 1500 },
      { id: 'poke-ball', kind: 'ball', price: 5 },
    ],
  },
  // docs/PROGRESSION.md "Wild encounters": the top guaranteedPlaces of a race always meet a wild Pokémon, every other ranked racer with otherRacerChance.
  // A wild Pokémon is a base form drawn by tierWeights, then uniformly in its tier, at a level from minLevel to maxLevel. Each throw spends one Poké Ball
  // and catches with its tier's catchRates; after maxThrows misses it flees. A trainer keeps at most maxWaiting encounters; extra ones are dropped.
  encounters: {
    guaranteedPlaces: 3,
    otherRacerChance: 0.1,
    tierWeights: { common: 60, uncommon: 30, rare: 10 },
    catchRates: { common: 0.7, uncommon: 0.45, rare: 0.2 },
    minLevel: 1,
    maxLevel: 5,
    maxThrows: 3,
    maxWaiting: 10,
  },
  // A trainer starts with startingBoxes PC boxes of boxSlots places each; the shop sells more. A full PC refuses catches and holds earned legendaries.
  storage: {
    boxSlots: 30,
    startingBoxes: 1,
  },
  // One badge per milestone of races finished to the end, granted once at race settlement, in Kanto gym order.
  badges: [
    { id: 'boulder', finishedRaces: 1 },
    { id: 'cascade', finishedRaces: 5 },
    { id: 'thunder', finishedRaces: 10 },
    { id: 'rainbow', finishedRaces: 25 },
    { id: 'soul', finishedRaces: 50 },
    { id: 'marsh', finishedRaces: 75 },
    { id: 'volcano', finishedRaces: 100 },
    { id: 'earth', finishedRaces: 150 },
  ],
  trainerHub: {
    recentRaces: 3,
  },
} as const;

// Account usernames become the trainer name on sign-up, so the longest displayed name is the larger of the two limits.
export const maxDisplayNameLength = Math.max(gameConfig.trainerName.maxLength, gameConfig.account.username.maxLength);
