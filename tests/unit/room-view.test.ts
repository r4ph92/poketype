import { describe, expect, it } from 'vitest';
import { isRaceUnderway, isViewerHost, parseRoomSnapshot, parseSnapshotResponse, type RoomSnapshot } from '../../src/domain/room-view';

const validSnapshot = {
  roomId: '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b',
  code: 'K7M2QX',
  visibility: 'unlisted',
  textSettings: { language: 'en', length: 450, punctuation: true, accents: false, capitals: true, digits: true },
  phase: 'waiting',
  revision: 3,
  members: [
    { memberKey: 'a', trainerName: 'Alex', hasAccount: true, isHost: true, isViewer: false, partner: 'pikachu', profile: { partnerLevel: 12, races: 4, wins: 1, averageWpm: 31.5, accuracy: 0.96 }, progress: null, bot: null },
    { memberKey: 'b', trainerName: 'Zoé', hasAccount: false, isHost: false, isViewer: true, partner: null, profile: null, progress: null, bot: null },
  ],
  race: null,
  lobbyIdle: { idleAt: 1_790_000_300_000, closesAt: 1_790_000_600_000 },
};

const raceRoom = { ...validSnapshot, lobbyIdle: null };

const botMember = { memberKey: 'bot-brock', trainerName: 'Pierre', hasAccount: false, isHost: false, isViewer: false, partner: 'onix', profile: null, progress: null, bot: { character: 'brock', level: 'beginner', seed: null } };

const viewer = { lastSequence: 3, position: 5, keystrokes: 7, rejectedKeystrokes: 2 };
const startedRace = { id: 'c7d1f0a2-4b6e-4f1a-9d3c-2e5b8a7f6d40', startsAt: 1_790_000_000_000, deadlineAt: 1_790_000_180_000, passage: 'Le garçon range ses crayons.', language: 'fr', viewer, results: null, reward: null, coins: null, encounter: null, legendaries: [] };

const racingMembers = [
  { ...validSnapshot.members[0], progress: { position: 12, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 } },
  { ...validSnapshot.members[1], progress: { position: 5, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 } },
];

describe('parseRoomSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    expect(parseRoomSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it('accepts a started race with its start time, passage, viewer counters and every member progress', () => {
    const started = { ...raceRoom, phase: 'countdown', members: racingMembers, race: startedRace };
    expect(parseRoomSnapshot(started)).toEqual(started);
  });

  it('accepts a finished member and a race without viewer counters', () => {
    const finished = [{ ...racingMembers[0], progress: { position: 28, finishMs: 9_400, abandoned: false, inactive: false, lastProgressMs: 0 } }, racingMembers[1]];
    const started = { ...raceRoom, phase: 'countdown', members: finished, race: { ...startedRace, viewer: null } };
    expect(parseRoomSnapshot(started)).toEqual(started);
  });

  it('accepts a bot with its character, level and race seed', () => {
    const withBot = { ...validSnapshot, members: [...validSnapshot.members, botMember] };
    expect(parseRoomSnapshot(withBot)).toEqual(withBot);
    const racingBot = { ...botMember, bot: { ...botMember.bot, seed: 12_345 }, progress: { position: 3, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 900 } };
    const started = { ...raceRoom, phase: 'countdown', members: [...racingMembers, racingBot], race: startedRace };
    expect(parseRoomSnapshot(started)).toEqual(started);
  });

  it.each([
    ['a member without the bot field', { ...validSnapshot.members[1], bot: undefined }],
    ['a bot with an unknown character', { ...botMember, bot: { ...botMember.bot, character: 'gary' } }],
    ['a bot with an unknown level', { ...botMember, bot: { ...botMember.bot, level: 'master' } }],
    ['a bot with a negative seed', { ...botMember, bot: { ...botMember.bot, seed: -1 } }],
    ['a bot whose member key names another character', { ...botMember, memberKey: 'bot-misty' }],
    ['a bot marked as the host', { ...botMember, isHost: true }],
    ['a bot marked as the viewer', { ...botMember, isViewer: true }],
    ['a bot with an account', { ...botMember, hasAccount: true }],
  ])('rejects %s', (_label, member) => {
    expect(parseRoomSnapshot({ ...validSnapshot, members: [validSnapshot.members[0], member] })).toBeNull();
  });

  it('keeps only the known member fields', () => {
    const withExtra = { ...validSnapshot, members: [{ ...validSnapshot.members[0], guestId: 'secret' }] };
    expect(parseRoomSnapshot(withExtra)?.members[0]).toEqual(validSnapshot.members[0]);
  });

  it.each([
    ['null', null],
    ['an array', [validSnapshot]],
    ['a string', 'snapshot'],
    ['an unknown phase', { ...validSnapshot, phase: 'lobby' }],
    ['a malformed room id', { ...validSnapshot, roomId: 'not-a-uuid' }],
    ['a missing room code', { ...validSnapshot, code: undefined }],
    ['a room code with an ambiguous character', { ...validSnapshot, code: 'K7M2Q0' }],
    ['a lower-case room code', { ...validSnapshot, code: 'k7m2qx' }],
    ['an unknown visibility', { ...validSnapshot, visibility: 'private' }],
    ['a revision given as text', { ...validSnapshot, revision: '3' }],
    ['a fractional revision', { ...validSnapshot, revision: 1.5 }],
    ['a zero revision', { ...validSnapshot, revision: 0 }],
    ['members that are not a list', { ...validSnapshot, members: {} }],
    ['a member without a name', { ...validSnapshot, members: [{ memberKey: 'a', isHost: true, isViewer: true, progress: null }] }],
    ['a member with a text host flag', { ...validSnapshot, members: [{ ...validSnapshot.members[0], isHost: 'yes' }] }],
    ['a member without the account flag', { ...validSnapshot, members: [{ memberKey: 'a', trainerName: 'Alex', isHost: true, isViewer: true, progress: null }] }],
    ['a member with a text account flag', { ...validSnapshot, members: [{ ...validSnapshot.members[0], hasAccount: 'no' }] }],
    ['a null member', { ...validSnapshot, members: [null] }],
    ['a member without the partner field', { ...validSnapshot, members: [{ ...validSnapshot.members[0], partner: undefined }] }],
    ['a member with an unknown partner', { ...validSnapshot, members: [{ ...validSnapshot.members[0], partner: 'agumon' }] }],
    ['a member without the profile field', { ...validSnapshot, members: [{ ...validSnapshot.members[0], profile: undefined }] }],
    ['a profile with more wins than races', { ...validSnapshot, members: [{ ...validSnapshot.members[0], profile: { partnerLevel: 5, races: 1, wins: 2, averageWpm: null, accuracy: null } }] }],
    ['a profile accuracy above 100 %', { ...validSnapshot, members: [{ ...validSnapshot.members[0], profile: { partnerLevel: 5, races: 1, wins: 0, averageWpm: 20, accuracy: 1.5 } }] }],
    ['a profile with a negative race count', { ...validSnapshot, members: [{ ...validSnapshot.members[0], profile: { partnerLevel: 5, races: -1, wins: 0, averageWpm: null, accuracy: null } }] }],
    ['a profile average given as text', { ...validSnapshot, members: [{ ...validSnapshot.members[0], profile: { partnerLevel: 5, races: 1, wins: 0, averageWpm: '20', accuracy: null } }] }],
    ['a member with a partner given as a Pokédex number', { ...validSnapshot, members: [{ ...validSnapshot.members[0], partner: 25 }] }],
    ['a missing race field', { ...validSnapshot, race: undefined }],
    ['a race that is not an object', { ...validSnapshot, race: [startedRace] }],
    ['a race start time given as text', { ...validSnapshot, race: { ...startedRace, startsAt: '1790000000000' } }],
    ['a fractional race start time', { ...validSnapshot, race: { ...startedRace, startsAt: 1.5 } }],
    ['a race without a deadline', { ...validSnapshot, race: { ...startedRace, deadlineAt: undefined } }],
    ['a deadline given as text', { ...validSnapshot, race: { ...startedRace, deadlineAt: '1790000180000' } }],
    ['a deadline at the start time', { ...validSnapshot, race: { ...startedRace, deadlineAt: startedRace.startsAt } }],
    ['a race without a passage', { ...validSnapshot, race: { startsAt: startedRace.startsAt } }],
    ['a race with an empty passage', { ...validSnapshot, race: { ...startedRace, passage: '' } }],
    ['a race in an unknown text language', { ...validSnapshot, race: { ...startedRace, language: 'es' } }],
    ['a room without its text settings', { ...validSnapshot, textSettings: undefined }],
    ['text settings with a length off the steps', { ...validSnapshot, textSettings: { ...validSnapshot.textSettings, length: 430 } }],
    ['a race without an id', { ...validSnapshot, race: { ...startedRace, id: '' } }],
    ['a race without the viewer field', { ...validSnapshot, race: { ...startedRace, viewer: undefined } }],
    ['negative viewer counters', { ...validSnapshot, race: { ...startedRace, viewer: { ...viewer, keystrokes: -1 } } }],
    ['a fractional viewer sequence', { ...validSnapshot, race: { ...startedRace, viewer: { ...viewer, lastSequence: 1.5 } } }],
    ['a member without the progress field', { ...validSnapshot, members: [{ memberKey: 'a', trainerName: 'Alex', isHost: true, isViewer: true }] }],
    ['a member progress given as text', { ...validSnapshot, members: [{ ...racingMembers[0], progress: { position: '12', finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 } }] }],
    ['a negative member position', { ...validSnapshot, members: [{ ...racingMembers[0], progress: { position: -1, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0 } }] }],
    ['a member progress without a finish field', { ...validSnapshot, members: [{ ...racingMembers[0], progress: { position: 1 } }] }],
    ['a missing lobby idle field', { ...validSnapshot, lobbyIdle: undefined }],
    ['a waiting room without its idle times', { ...validSnapshot, lobbyIdle: null }],
    ['idle times outside the waiting phase', { ...raceRoom, phase: 'countdown', members: racingMembers, race: startedRace, lobbyIdle: validSnapshot.lobbyIdle }],
    ['an idle time given as text', { ...validSnapshot, lobbyIdle: { ...validSnapshot.lobbyIdle, idleAt: '1790000300000' } }],
    ['a close time that is not after the idle time', { ...validSnapshot, lobbyIdle: { idleAt: 1_790_000_300_000, closesAt: 1_790_000_300_000 } }],
  ])('rejects %s', (_label, json) => {
    expect(parseRoomSnapshot(json)).toBeNull();
  });
});

describe('parseRoomSnapshot with race results', () => {
  const finishedMembers = [
    { ...validSnapshot.members[0], progress: { position: 28, finishMs: 9_400, abandoned: false, inactive: false, lastProgressMs: 0 } },
    { ...validSnapshot.members[1], progress: { position: 28, finishMs: 12_000, abandoned: false, inactive: false, lastProgressMs: 0 } },
  ];
  const zoeResult = { memberKey: 'b', standing: 'ranked', place: 2, grossWpm: 28, score: 18, accuracy: 28 / 30, errors: 2, finishMs: 12_000 };
  const alexResult = { memberKey: 'a', standing: 'ranked', place: 1, grossWpm: 35.7, score: 35.7, accuracy: 1, errors: 0, finishMs: 9_400 };
  const settled = { ...raceRoom, phase: 'results', members: finishedMembers, race: { ...startedRace, results: [alexResult, zoeResult] } };
  const withZoeResult = (changes: object) => ({ ...settled, race: { ...settled.race, results: [alexResult, { ...zoeResult, ...changes }] } });

  it('accepts a racer the time limit stopped, with a null finish time', () => {
    const stopped = withZoeResult({ finishMs: null });
    expect(parseRoomSnapshot(stopped)?.race?.results?.[1]).toEqual({ ...zoeResult, finishMs: null });
  });

  it('accepts a racer who abandoned, with no place or metrics', () => {
    const abandoned = { ...settled, race: { ...settled.race, results: [alexResult, { memberKey: 'b', standing: 'abandoned', errors: 2 }] } };
    expect(parseRoomSnapshot(abandoned)?.race?.results?.[1]).toEqual({ memberKey: 'b', standing: 'abandoned', errors: 2 });
  });

  it('rejects a result row that does not say whether the racer is ranked', () => {
    expect(parseRoomSnapshot(withZoeResult({ standing: undefined }))).toBeNull();
    expect(parseRoomSnapshot(withZoeResult({ standing: 'gone' }))).toBeNull();
  });

  it('accepts a racer removed as inactive, with errors and no place', () => {
    const inactive = { ...settled, race: { ...settled.race, results: [alexResult, { memberKey: 'b', standing: 'inactive', errors: 0 }] } };
    expect(parseRoomSnapshot(inactive)?.race?.results?.[1]).toEqual({ memberKey: 'b', standing: 'inactive', errors: 0 });
  });

  it('accepts settled results in the results phase', () => {
    expect(parseRoomSnapshot(settled)).toEqual(settled);
  });

  it('keeps only the known result fields', () => {
    expect(parseRoomSnapshot(withZoeResult({ guestId: 'secret' }))?.race?.results?.[1]).toEqual(zoeResult);
  });

  it.each([
    ['results outside the results phase', { ...settled, phase: 'countdown' }],
    ['a race without the results field', { ...settled, race: { ...settled.race, results: undefined } }],
    ['results that are not a list', { ...settled, race: { ...settled.race, results: {} } }],
    ['a null result row', { ...settled, race: { ...settled.race, results: [null] } }],
    ['a result for someone who is not a member', withZoeResult({ memberKey: 'nina' })],
    ['a result without a member key', withZoeResult({ memberKey: 7 })],
    ['a place of zero', withZoeResult({ place: 0 })],
    ['a fractional place', withZoeResult({ place: 1.5 })],
    ['a negative WPM', withZoeResult({ grossWpm: -1 })],
    ['an infinite WPM', withZoeResult({ grossWpm: Infinity })],
    ['a WPM given as text', withZoeResult({ grossWpm: '28' })],
    ['a negative score', withZoeResult({ score: -0.5 })],
    ['a missing score', withZoeResult({ score: undefined })],
    ['an accuracy above 1', withZoeResult({ accuracy: 1.01 })],
    ['a negative accuracy', withZoeResult({ accuracy: -0.1 })],
    ['a fractional error count', withZoeResult({ errors: 1.5 })],
    ['a missing finish time', withZoeResult({ finishMs: undefined })],
    ['a finish time given as text', withZoeResult({ finishMs: '12000' })],
  ])('rejects %s', (_label, json) => {
    expect(parseRoomSnapshot(json)).toBeNull();
  });
});

describe('parseSnapshotResponse', () => {
  it('separates the server time from the snapshot', () => {
    expect(parseSnapshotResponse({ ...validSnapshot, serverNow: 1_790_000_000_123 })).toEqual({ snapshot: validSnapshot, serverNow: 1_790_000_000_123 });
  });

  it.each([
    ['a missing server time', validSnapshot],
    ['a server time given as text', { ...validSnapshot, serverNow: '1790000000123' }],
    ['a malformed snapshot', { ...validSnapshot, phase: 'lobby', serverNow: 1_790_000_000_123 }],
  ])('rejects %s', (_label, json) => {
    expect(parseSnapshotResponse(json)).toBeNull();
  });
});

describe('isRaceUnderway', () => {
  const racing = parseRoomSnapshot({ ...raceRoom, phase: 'countdown', members: racingMembers, race: startedRace })!;

  it('is true while a race has at least one member still typing', () => {
    expect(isRaceUnderway(racing)).toBe(true);
  });

  it('is false in a waiting room and once every member has finished', () => {
    const allFinished = racing.members.map((member) => ({ ...member, progress: { position: 28, finishMs: 9_000, abandoned: false, inactive: false, lastProgressMs: 0 } }));
    expect(isRaceUnderway(parseRoomSnapshot(validSnapshot)!)).toBe(false);
    expect(isRaceUnderway({ ...racing, members: allFinished })).toBe(false);
  });

  it('is false once every member has finished or abandoned', () => {
    const [first, second] = racing.members;
    const finishedAndAbandoned = [{ ...first!, progress: { position: 28, finishMs: 9_000, abandoned: false, inactive: false, lastProgressMs: 0 } }, { ...second!, progress: { position: 5, finishMs: null, abandoned: true, inactive: false, lastProgressMs: 0 } }];
    expect(isRaceUnderway({ ...racing, members: finishedAndAbandoned })).toBe(false);
  });

  it('is false once the race has settled, even with a member the time limit stopped', () => {
    expect(isRaceUnderway({ ...racing, phase: 'results' })).toBe(false);
  });
});

describe('parseRoomSnapshot with the viewer XP reward', () => {
  const settledRace = { ...startedRace, results: [{ memberKey: 'a', standing: 'ranked', place: 1, grossWpm: 30, score: 30, accuracy: 1, errors: 0, finishMs: 9_000 }] };
  const reward = { xp: 150, before: { species: 'bulbasaur', level: 15, xp: 150 }, after: { species: 'ivysaur', level: 16, xp: 100 } };
  const settled = (changes: object) => ({ ...raceRoom, phase: 'results', race: { ...settledRace, reward: { ...reward, ...changes } } });

  it('accepts a grant with its Pokémon before and after', () => {
    expect(parseRoomSnapshot(settled({}))?.race?.reward).toEqual(reward);
  });

  it.each([
    ['a race without the reward field', { ...raceRoom, phase: 'results', race: { ...settledRace, reward: undefined } }],
    ['a reward before the results', { ...raceRoom, race: { ...startedRace, reward } }],
    ['a negative XP', settled({ xp: -1 })],
    ['an unknown species', settled({ after: { species: 'agumon', level: 16, xp: 0 } })],
    ['a level above the maximum', settled({ after: { species: 'ivysaur', level: 100, xp: 0 } })],
    ['a level that went down', settled({ after: { species: 'ivysaur', level: 14, xp: 0 } })],
  ])('rejects %s', (_case, snapshot) => {
    expect(parseRoomSnapshot(snapshot)).toBeNull();
  });
});

describe('parseRoomSnapshot with the viewer Poké Dollar payout', () => {
  const settledRace = { ...startedRace, results: [{ memberKey: 'a', standing: 'ranked', place: 1, grossWpm: 30, score: 30, accuracy: 1, errors: 0, finishMs: 9_000 }] };
  const withCoins = (coins: unknown) => ({ ...raceRoom, phase: 'results', race: { ...settledRace, coins } });

  it('accepts a race payout with its badge bonus', () => {
    expect(parseRoomSnapshot(withCoins({ race: 150, badges: 500 }))?.race?.coins).toEqual({ race: 150, badges: 500 });
  });

  it.each([
    ['a race without the coins field', withCoins(undefined)],
    ['coins before the results', { ...raceRoom, race: { ...startedRace, coins: { race: 150, badges: 0 } } }],
    ['a negative payout', withCoins({ race: -5, badges: 0 })],
    ['a fractional bonus', withCoins({ race: 150, badges: 0.5 })],
  ])('rejects %s', (_case, snapshot) => {
    expect(parseRoomSnapshot(snapshot)).toBeNull();
  });
});

describe('isViewerHost', () => {
  const snapshot = parseRoomSnapshot(validSnapshot)!;
  const asViewer = (memberKey: string): RoomSnapshot => ({ ...snapshot, members: snapshot.members.map((member) => ({ ...member, isViewer: member.memberKey === memberKey })) });

  it('is true only when the viewer is the host', () => {
    expect(isViewerHost(asViewer('a'))).toBe(true);
    expect(isViewerHost(asViewer('b'))).toBe(false);
  });
});
