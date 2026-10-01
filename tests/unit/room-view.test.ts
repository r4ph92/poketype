import { describe, expect, it } from 'vitest';
import { isRaceUnderway, isViewerHost, parseRoomSnapshot, parseSnapshotResponse, type RoomSnapshot } from '../../src/domain/room-view';

const validSnapshot = {
  roomId: '0b8f5e4c-2f6a-4d1e-9c3b-7a1d2e3f4a5b',
  phase: 'waiting',
  revision: 3,
  members: [
    { memberKey: 'a', trainerName: 'Alex', isHost: true, isViewer: false, progress: null },
    { memberKey: 'b', trainerName: 'Zoé', isHost: false, isViewer: true, progress: null },
  ],
  race: null,
};

const viewer = { lastSequence: 3, position: 5, keystrokes: 7, rejectedKeystrokes: 2 };
const startedRace = { id: 'c7d1f0a2-4b6e-4f1a-9d3c-2e5b8a7f6d40', startsAt: 1_790_000_000_000, passage: 'Le garçon range ses crayons.', viewer, results: null };

const racingMembers = [
  { ...validSnapshot.members[0], progress: { position: 12, finishMs: null } },
  { ...validSnapshot.members[1], progress: { position: 5, finishMs: null } },
];

describe('parseRoomSnapshot', () => {
  it('accepts a well-formed snapshot', () => {
    expect(parseRoomSnapshot(validSnapshot)).toEqual(validSnapshot);
  });

  it('accepts a started race with its start time, passage, viewer counters and every member progress', () => {
    const started = { ...validSnapshot, phase: 'countdown', members: racingMembers, race: startedRace };
    expect(parseRoomSnapshot(started)).toEqual(started);
  });

  it('accepts a finished member and a race without viewer counters', () => {
    const finished = [{ ...racingMembers[0], progress: { position: 28, finishMs: 9_400 } }, racingMembers[1]];
    const started = { ...validSnapshot, phase: 'countdown', members: finished, race: { ...startedRace, viewer: null } };
    expect(parseRoomSnapshot(started)).toEqual(started);
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
    ['a revision given as text', { ...validSnapshot, revision: '3' }],
    ['a fractional revision', { ...validSnapshot, revision: 1.5 }],
    ['a zero revision', { ...validSnapshot, revision: 0 }],
    ['members that are not a list', { ...validSnapshot, members: {} }],
    ['a member without a name', { ...validSnapshot, members: [{ memberKey: 'a', isHost: true, isViewer: true, progress: null }] }],
    ['a member with a text host flag', { ...validSnapshot, members: [{ ...validSnapshot.members[0], isHost: 'yes' }] }],
    ['a null member', { ...validSnapshot, members: [null] }],
    ['a missing race field', { ...validSnapshot, race: undefined }],
    ['a race that is not an object', { ...validSnapshot, race: [startedRace] }],
    ['a race start time given as text', { ...validSnapshot, race: { ...startedRace, startsAt: '1790000000000' } }],
    ['a fractional race start time', { ...validSnapshot, race: { ...startedRace, startsAt: 1.5 } }],
    ['a race without a passage', { ...validSnapshot, race: { startsAt: startedRace.startsAt } }],
    ['a race with an empty passage', { ...validSnapshot, race: { ...startedRace, passage: '' } }],
    ['a race without an id', { ...validSnapshot, race: { ...startedRace, id: '' } }],
    ['a race without the viewer field', { ...validSnapshot, race: { ...startedRace, viewer: undefined } }],
    ['negative viewer counters', { ...validSnapshot, race: { ...startedRace, viewer: { ...viewer, keystrokes: -1 } } }],
    ['a fractional viewer sequence', { ...validSnapshot, race: { ...startedRace, viewer: { ...viewer, lastSequence: 1.5 } } }],
    ['a member without the progress field', { ...validSnapshot, members: [{ memberKey: 'a', trainerName: 'Alex', isHost: true, isViewer: true }] }],
    ['a member progress given as text', { ...validSnapshot, members: [{ ...racingMembers[0], progress: { position: '12', finishMs: null } }] }],
    ['a negative member position', { ...validSnapshot, members: [{ ...racingMembers[0], progress: { position: -1, finishMs: null } }] }],
    ['a member progress without a finish field', { ...validSnapshot, members: [{ ...racingMembers[0], progress: { position: 1 } }] }],
  ])('rejects %s', (_label, json) => {
    expect(parseRoomSnapshot(json)).toBeNull();
  });
});

describe('parseRoomSnapshot with race results', () => {
  const finishedMembers = [
    { ...validSnapshot.members[0], progress: { position: 28, finishMs: 9_400 } },
    { ...validSnapshot.members[1], progress: { position: 28, finishMs: 12_000 } },
  ];
  const zoeResult = { memberKey: 'b', place: 2, grossWpm: 28, score: 18, accuracy: 28 / 30, errors: 2, finishMs: 12_000 };
  const alexResult = { memberKey: 'a', place: 1, grossWpm: 35.7, score: 35.7, accuracy: 1, errors: 0, finishMs: 9_400 };
  const settled = { ...validSnapshot, phase: 'results', members: finishedMembers, race: { ...startedRace, results: [alexResult, zoeResult] } };
  const withZoeResult = (changes: object) => ({ ...settled, race: { ...settled.race, results: [alexResult, { ...zoeResult, ...changes }] } });

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
    ['a missing finish time', withZoeResult({ finishMs: null })],
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
  const racing = parseRoomSnapshot({ ...validSnapshot, phase: 'countdown', members: racingMembers, race: startedRace })!;

  it('is true while a race has at least one member still typing', () => {
    expect(isRaceUnderway(racing)).toBe(true);
  });

  it('is false in a waiting room and once every member has finished', () => {
    const allFinished = racing.members.map((member) => ({ ...member, progress: { position: 28, finishMs: 9_000 } }));
    expect(isRaceUnderway(parseRoomSnapshot(validSnapshot)!)).toBe(false);
    expect(isRaceUnderway({ ...racing, members: allFinished })).toBe(false);
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
