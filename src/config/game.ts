export const gameConfig = {
  // Dates are shown in this zone whatever the server's own (the project follows Quebec usage).
  displayTimeZone: 'America/Toronto',
  guestSessionLifetimeHours: 12,
  formFieldMaxLength: 2048,
  trainerName: { minLength: 3, maxLength: 20, maxSubmittedLength: 100 },
  copyConfirmationSeconds: 3,
  account: {
    username: { minLength: 3, maxLength: 20, maxSubmittedLength: 100 },
    password: { minLength: 8, maxLength: 128, maxSubmittedLength: 200 },
    sessionLifetimeHours: 12,
    replayWindowMinutes: 10,
    replayCompletionSeconds: 60,
    passwordHashing: { maxRunning: 2, maxWaiting: 8 },
    loginThrottle: { maxFailures: 5, windowMinutes: 5, lockMinutes: 5 },
    oauth: { flowLifetimeMinutes: 10, providerTimeoutMs: 10_000, maxUsernameSuffix: 999, signInAttempts: 3 },
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
  // minimumPlayers is H6 (changed 2026-10-02: two racers, bots included); syncLeadMs lets a polling player see the start before the 3.
  // The speed caps (H3, provisional) are cumulative from the start: far above a child's speed, they only stop a crafted report from jumping ahead.
  // timeLimit is the host's maximum duration (CONF-01, #33), counted from "Partez !" so the countdown never eats typing time: none, or minSeconds to
  // maxSeconds in stepSeconds, defaultSeconds for a new room. A race without a limit still ends at safetyCeilingSeconds (H4), shown to nobody.
  // leaderBarSize is how many leaders the bar above the map shows; the viewer is added when outside them.
  // The host may remove a racer from the race once they have had no accepted progress report for inactiveAfterSeconds.
  // A race ends on its own once none of the humans still racing has had an accepted progress report for idleEndAfterSeconds (JEU-4, H4, provisional); bots never count.
  // Presence (COURSE-08, #26): a racer the server has not heard from (no snapshot read, no report) for disconnectedAfterMs shows as disconnected,
  // and for abandonAfterDisconnectMs counts as having abandoned at their progress. A racer's last-seen time is written at most once per presenceTouchMs.
  race: {
    minimumPlayers: 2,
    minimumHumanPlayers: 1,
    timeLimit: { minSeconds: 30, maxSeconds: 10 * 60, stepSeconds: 30, defaultSeconds: 5 * 60, safetyCeilingSeconds: 30 * 60 },
    inactiveAfterSeconds: 60,
    idleEndAfterSeconds: 3 * 60,
    countdownSeconds: 3,
    syncLeadMs: 1500,
    progressBatchMs: 250,
    progressRetryMs: 500,
    maxCharactersPerSecond: 20,
    maxKeystrokesPerSecond: 25,
    progressBurstAllowance: 10,
    maxProgressCounter: 2_147_483_647,
    maxProgressBodyBytes: 1024,
    leaderBarSize: 3,
    disconnectedAfterMs: 5_000,
    abandonAfterDisconnectMs: 30_000,
    presenceTouchMs: 1_000,
  },
  // capacity is the host's seat limit per room (SALLE-05, CONF-11), bots included, checked under the room lock on every join; a new room opens at its default.
  // Placement tries at most placementCandidates rooms, then offers a new room; the public list refreshes every refreshIntervalMs (rooms appear or vanish within 2 s) and shows at most listLimit rooms.
  // A waiting room with no join or leave for idleAfterMs is hidden from the list and placement; at closeAfterMs it closes (JEU-4).
  // codeGenerationAttempts bounds the retries when a new room code is already taken; codeThrottle locks a session after maxFailures unknown codes within windowMinutes.
  // memberPresence (SALLE-08, #76): a member whose page reached the server within connectedWithinMs is connected and may take over as host;
  // a member's own snapshot reads write their last-seen time at most once per touchEveryMs, the host's once per hostTouchEveryMs (#44), so a host
  // silent for hostAwayAfterMs is shown as away within 5 s; a host silent for connectedWithinMs hands the role over.
  rooms: {
    capacity: { minimum: 2, maximum: 30, default: 30 },
    placementCandidates: 10,
    idleAfterMs: 5 * 60_000,
    closeAfterMs: 10 * 60_000,
    codeGenerationAttempts: 5,
    maxSubmittedCodeLength: 32,
    maxVisibilityBodyBytes: 64,
    maxHostRoleBodyBytes: 64,
    maxTimeLimitBodyBytes: 64,
    maxCapacityBodyBytes: 64,
    maxSettingsBodyBytes: 512,
    maxRemovalBodyBytes: 128,
    maxMemberKeyLength: 64,
    maxBotBodyBytes: 64,
    // Personal invitation links one room may hold (SALLE-04); the create request carries an empty JSON object.
    maxInvitations: 64,
    maxInvitationBodyBytes: 16,
    codeThrottle: { maxFailures: 10, windowMinutes: 1, lockMinutes: 1 },
    memberPresence: { connectedWithinMs: 30_000, touchEveryMs: 5_000, hostTouchEveryMs: 1_000, hostAwayAfterMs: 3_500 },
  },
  publicRooms: {
    refreshIntervalMs: 1000,
    requestTimeoutMs: 1300,
    listLimit: 50,
    // A results room leaves the list this long after its race ended; a running race leaves it at its deadline.
    resultsListedForMs: 10 * 60_000,
  },
  // The race text the server draws from the word lists (TXT-1 to TXT-3). wordCount is the number of words the text holds (CONF-04), whole numbers from min to max;
  // a sentence holds sentenceWords words. The chances are per word: a comma after it, an apostrophe joining it (l'arbre, tree's),
  // a number in its place (the same at every level, so the digits switch always shows numbers), a capital on it when punctuation is off; questionChance is per sentence. Numbers run from 1 to maxNumber.
  // The lobby waits settingsSendDelayMs after the host's last change (a slider drag) before sending the settings.
  text: {
    wordCount: { min: 10, max: 150, default: 40 },
    wordCountPresets: { short: 20, medium: 40, long: 100 },
    defaultOptions: { punctuation: true, accents: true, capitals: true, digits: false },
    // Random text with picked characters (CONF-07, #35): each required character appears at least includedCharacterMinimum times; a word holding one
    // still missing is drawn with includedWordChance; a text is drawn again up to textAttempts times (also when it misses its complexity level); fewer than minimumWords left is no text.
    includedCharacterMinimum: 3,
    includedWordChance: 0.5,
    textAttempts: 60,
    minimumWords: 20,
    sentenceWords: { min: 4, max: 9 },
    capitalWordChance: 0.15,
    digitChance: 0.18,
    maxNumber: 999,
    // Text complexity (CONF-05, #152), explained in docs/text-complexity.md. A text sits at the hardest level any criterion reaches: up to the easy ceiling
    // it is easy, up to the medium ceiling medium, above it hard. Word length differs by language because French words are longer.
    // Random text draws only the words of the level's frequency-rank range and letter length, with the level's chances per word for a comma, an apostrophe
    // and per sentence for a question mark (the host's punctuation and digits switches still decide whether they appear), and is drawn again until it measures at that level.
    complexity: {
      ceilings: {
        averageWordLength: { fr: { easy: 4.7, medium: 5.5 }, en: { easy: 4.2, medium: 4.9 } },
        averageRank: { easy: 400, medium: 470 },
        punctuationShare: { easy: 0.06, medium: 0.09 },
      },
      levels: {
        easy: { rank: { from: 0, to: 400 }, wordLength: { min: 2, max: 6 }, commaChance: 0.03, apostropheChance: 0.03, questionChance: 0.1 },
        medium: { rank: { from: 200, to: 700 }, wordLength: { min: 3, max: 7 }, commaChance: 0.06, apostropheChance: 0.06, questionChance: 0.2 },
        hard: { rank: { from: 300, to: 1000 }, wordLength: { min: 5, max: 10 }, commaChance: 0.15, apostropheChance: 0.15, questionChance: 0.3 },
      },
    },
    settingsSendDelayMs: 300,
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
  // docs/PROGRESSION.md "Evolution": level evolutions keep their original level; evolutions the games trigger by friendship, by knowing a move
  // or at a place happen at these levels instead. Babies never evolve by level.
  evolution: {
    friendshipLevel: 30,
    moveLevel: 33,
    locationLevel: 30,
  },
  // docs/PROGRESSION.md: a race pays raceCoins in Poké Dollars with the same formula as the XP; each badge earned adds badgeCoins once.
  // A purchase buys 1 to maxPurchaseQuantity of one item; prices are in Poké Dollars and only the server reads them.
  // An evolution-item is what the games hold during a trade or a level-up (Metal Coat, Razor Claw…); here it is used from the collection like a stone.
  economy: {
    raceCoins: { base: 100, beatEveryoneBonus: 100 },
    badgeCoins: 500,
    maxPurchaseQuantity: 99,
    shopItems: [
      { id: 'poke-ball', kind: 'ball', price: 5 },
      { id: 'pc-box', kind: 'box', price: 200 },
      { id: 'fire-stone', kind: 'stone', price: 1500 },
      { id: 'water-stone', kind: 'stone', price: 1500 },
      { id: 'thunder-stone', kind: 'stone', price: 1500 },
      { id: 'leaf-stone', kind: 'stone', price: 1500 },
      { id: 'moon-stone', kind: 'stone', price: 1500 },
      { id: 'sun-stone', kind: 'stone', price: 1500 },
      { id: 'shiny-stone', kind: 'stone', price: 1500 },
      { id: 'dusk-stone', kind: 'stone', price: 1500 },
      { id: 'dawn-stone', kind: 'stone', price: 1500 },
      { id: 'metal-coat', kind: 'evolution-item', price: 1500 },
      { id: 'kings-rock', kind: 'evolution-item', price: 1500 },
      { id: 'dragon-scale', kind: 'evolution-item', price: 1500 },
      { id: 'up-grade', kind: 'evolution-item', price: 1500 },
      { id: 'dubious-disc', kind: 'evolution-item', price: 1500 },
      { id: 'protector', kind: 'evolution-item', price: 1500 },
      { id: 'electirizer', kind: 'evolution-item', price: 1500 },
      { id: 'magmarizer', kind: 'evolution-item', price: 1500 },
      { id: 'reaper-cloth', kind: 'evolution-item', price: 1500 },
      { id: 'razor-claw', kind: 'evolution-item', price: 1500 },
      { id: 'razor-fang', kind: 'evolution-item', price: 1500 },
      { id: 'oval-stone', kind: 'evolution-item', price: 1500 },
      { id: 'deep-sea-tooth', kind: 'evolution-item', price: 1500 },
      { id: 'deep-sea-scale', kind: 'evolution-item', price: 1500 },
      { id: 'prism-scale', kind: 'evolution-item', price: 1500 },
    ],
  },
  // docs/PROGRESSION.md "Wild encounters": the top guaranteedPlaces of a race always meet a wild Pokémon, every other ranked racer with otherRacerChance.
  // A wild Pokémon is a base form drawn by tierWeights, then uniformly in its tier, at a level from minLevel to maxLevel. Each throw spends one Poké Ball
  // and catches with its tier's catchRates; after maxThrows misses it flees, after legendaryThrows for the legendary tier (Johto to Unova legendaries).
  // A trainer keeps at most maxWaiting encounters; extra ones are dropped.
  encounters: {
    guaranteedPlaces: 3,
    otherRacerChance: 0.1,
    tierWeights: { common: 60, uncommon: 30, rare: 10, legendary: 1 },
    catchRates: { common: 0.7, uncommon: 0.45, rare: 0.2, legendary: 0.5 },
    minLevel: 1,
    maxLevel: 5,
    maxThrows: 3,
    legendaryThrows: 1,
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
  // The race history page (HIST-01, #48): races per page, and how many page links show on each side of the current page.
  raceHistory: {
    pageSize: 20,
    pageLinkWindow: 2,
  },
  // Missed keys (RES-03, #74): one progress report names at most maxPositionsPerReport wrong keystrokes; a racer's counts hold at most
  // maxCharacters distinct characters; the results list the listedCount most missed characters and the heat map
  // shades a key in one of `shades` steps, the darkest for the most missed key.
  missedKeys: {
    shades: 3,
    maxPositionsPerReport: 100,
    maxCharacters: 64,
    listedCount: 5,
  },
  // WPM during the race (RES-03, RES-05, #147): the server samples each racer's accepted correct characters every sampleMs of the race,
  // stored one per index, so a change needs a new column for races already stored. The chart's time axis ends on a multiple of
  // timeAxisStepSeconds; the live results give up loading it after requestTimeoutMs.
  wpmTimeline: {
    sampleMs: 1000,
    timeAxisStepSeconds: 10,
    requestTimeoutMs: 5000,
  },
  // The profile page (AUTH-06, #51): the chart plots at most chartRaces of the latest ranked races, needs minimumChartRaces of them,
  // and rounds its WPM axis up to a multiple of wpmAxisStep.
  profile: {
    chartRaces: 50,
    minimumChartRaces: 2,
    wpmAxisStep: 10,
  },
  // Catch-up bonuses (BONUS-01, #77): the rule is in src/domain/catch-up-bonus.ts and docs/EXIGENCES.md.
  catchUpBonuses: {
    checkpointPercents: [25, 50, 75],
    trailingGapPoints: 25,
    maxPerRacer: 3,
    removedWords: 3,
    addedWords: 3,
    // Relative odds of each kind a trailing racer draws; "+3 mots" and "Brouillard" fall back to "-3 mots" when the leader has already finished.
    kindWeights: { 'remove-words': 1, 'add-words': 1, fog: 1 },
    // "Brouillard" blurs the leader's next words, from the award on the server clock.
    fogMs: 4000,
    foggedWords: 5,
    announcementMs: 5000,
    maxBodyBytes: 64,
  },
  // Computer racers the host adds in the lobby (H6, changed 2026-10-02; BOT-01 to BOT-05, #153), explained in docs/bots.md. Per level: wpmRange is the
  // brief's net WPM range (max null: no ceiling), targetWpm the net speed its racers average in "Correction obligatoire", errorRate the share of wrong keystrokes.
  // paceVariation spreads one bot's whole race and keystrokeJitter each keystroke, as ± fractions. Bursts and slow stretches alternate, each lasting phaseMs and
  // changing the speed by speedSwing; in a slow stretch the bot may hesitate before a word (slowWordChance) for that many keystrokes' time; a word of longWord.minLetters letters or more is typed
  // longWord.slowdown times slower per character; in blocked mode a mistake costs correctionKeystrokes keystrokes' time before the right key.
  // calibration is the text shape assumed to set the keystroke time so a level averages targetWpm. displayTickMs is how often a race view moves the bots.
  bots: {
    levels: {
      noob: { wpmRange: { min: 10, max: 20 }, targetWpm: 14, errorRate: 0.12 },
      novice: { wpmRange: { min: 20, max: 35 }, targetWpm: 25, errorRate: 0.08 },
      intermediate: { wpmRange: { min: 35, max: 60 }, targetWpm: 46, errorRate: 0.05 },
      expert: { wpmRange: { min: 70, max: 100 }, targetWpm: 75, errorRate: 0.02 },
      impossible: { wpmRange: { min: 140, max: null }, targetWpm: 165, errorRate: 0.005 },
    },
    paceVariation: 0.06,
    keystrokeJitter: 0.25,
    rhythm: { phaseMs: { min: 4000, max: 6000 }, speedSwing: { min: 0.35, max: 0.45 } },
    hesitation: { slowWordChance: 0.3, keystrokes: { min: 3, max: 8 } },
    longWord: { minLetters: 8, slowdown: 1.4 },
    correctionKeystrokes: { min: 1, max: 3 },
    calibration: { charactersPerWord: 6, longWordCharacterShare: 0.2 },
    displayTickMs: 250,
  },
  // The generated avatar is an odd square grid mirrored left to right; its seed holds one bit per cell of the left half and the middle column, then a palette index.
  avatar: { gridSize: 7, paletteCount: 8 },
} as const;

// Account usernames become the trainer name on sign-up, so the longest displayed name is the larger of the two limits.
export const maxDisplayNameLength = Math.max(gameConfig.trainerName.maxLength, gameConfig.account.username.maxLength);
