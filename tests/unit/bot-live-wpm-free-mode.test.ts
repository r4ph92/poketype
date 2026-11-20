import { describe, expect, it } from 'vitest';
import { botProgressAt } from '../../src/domain/bot-race';
import { measureRacer } from '../../src/domain/race-results';
import type { RoomMemberView } from '../../src/domain/room-view';
import { withBotProgressAt } from '../../src/features/race/bot-racers';
import { liveWpmOf } from '../../src/features/race/live-wpm';
import type { Racer } from '../../src/features/race/racers';
import { raceText } from './support/bot-races';

const progress = { position: 0, finishMs: null, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
const brock: RoomMemberView = { memberKey: 'bot-brock', trainerName: 'Pierre', avatarSeed: null, hasAccount: false, isHost: false, isSpectator: false, isViewer: false, partner: 'onix', profile: null, progress, bot: { character: 'brock', level: 'noob', seed: 77 } };
const passage = raceText(3);
const longEnoughMs = 60 * 60_000;

describe('a bot racing in "Libre"', () => {
  it('shows rivals the net WPM its results will settle, not the speed of a cursor that kept its mistakes', () => {
    const [moved] = withBotProgressAt([brock], { passage, bonuses: [], errorMode: 'free' }, longEnoughMs);
    const racer = { ...moved!, textLength: Array.from(passage).length, isFinished: true, isAbandoned: false, isInactive: false } as Racer;
    const settled = botProgressAt({ level: 'noob', seed: 77 }, { text: passage, errorMode: 'free' }, longEnoughMs);
    expect(settled.rejectedKeystrokes).toBeGreaterThan(0);
    const settledNetWpm = measureRacer({ typedCharacters: settled.correctCharacters, keystrokes: settled.keystrokes, rejectedKeystrokes: settled.rejectedKeystrokes, elapsedMs: settled.finishMs! }).grossWpm;
    expect(liveWpmOf(racer, { elapsedMs: longEnoughMs, viewerCorrectCharacters: 0 })).toBe(settledNetWpm);
  });
});
