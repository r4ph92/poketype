import { describe, expect, it } from 'vitest';
import { measureRacer } from '../../src/domain/race-results';
import { liveWpmOf } from '../../src/features/race/live-wpm';
import type { Racer } from '../../src/features/race/racers';

function racerAt(position: number, isViewer: boolean): Racer {
  const progress = { position, correctCharacters: 90, finishMs: 20_000, abandoned: false, inactive: false, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
  return { memberKey: 'zoe', trainerName: 'Zoé', hasAccount: false, isHost: false, isViewer, partner: null, profile: null, bot: null, avatarSeed: null, progress, textLength: 100, isFinished: true, isAbandoned: false, isInactive: false };
}

// Free error mode: Zoé finished with her cursor at 100 but kept 10 mistakes, so 90 characters are correct.
describe('live WPM of a racer who kept mistakes in free mode', () => {
  const cursor = 100;
  const correctCharacters = 90;
  const settledNetWpm = measureRacer({ typedCharacters: correctCharacters, keystrokes: cursor, rejectedKeystrokes: 0, elapsedMs: 20_000 }).grossWpm;

  it('reads the same WPM to herself and to a rival watching her', () => {
    const ownView = liveWpmOf(racerAt(cursor, true), { elapsedMs: 30_000, viewerCorrectCharacters: correctCharacters });
    const rivalView = liveWpmOf(racerAt(cursor, false), { elapsedMs: 30_000, viewerCorrectCharacters: 0 });
    expect(rivalView).toBe(ownView);
  });

  it('shows a rival the net WPM the results will settle, not the raw cursor speed', () => {
    expect(liveWpmOf(racerAt(cursor, false), { elapsedMs: 30_000, viewerCorrectCharacters: 0 })).toBe(settledNetWpm);
  });
});
