import { describe, expect, it } from 'vitest';
import { measureRacer } from '../../src/domain/race-results';
import { liveWpmOf } from '../../src/features/race/live-wpm';
import type { Racer } from '../../src/features/race/racers';

type RacerSetup = { position?: number; finishMs?: number | null; abandoned?: boolean; inactive?: boolean; isViewer?: boolean };

function racer({ position = 0, finishMs = null, abandoned = false, inactive = false, isViewer = false }: RacerSetup): Racer {
  const progress = { position, finishMs, abandoned, inactive, lastProgressMs: 0, disconnected: false, abandonedOffline: false, lastSeenMs: 0 };
  return { memberKey: 'k', trainerName: 'Zoe', hasAccount: false, isHost: false, isViewer, partner: null, profile: null, bot: null, avatarSeed: null, progress, isFinished: finishMs !== null, isAbandoned: abandoned, isInactive: inactive };
}

const clock = { elapsedMs: 30_000, viewerCorrectCharacters: 0 };

describe('liveWpmOf', () => {
  it('reads a rival at the Annex A net WPM: accepted characters over five, per minute', () => {
    expect(liveWpmOf(racer({ position: 50 }), clock)).toBe(20);
  });

  it('matches the results formula for the same counters', () => {
    const expected = measureRacer({ typedCharacters: 77, keystrokes: 77, rejectedKeystrokes: 0, elapsedMs: 41_000 }).grossWpm;
    expect(liveWpmOf(racer({ position: 77 }), { elapsedMs: 41_000, viewerCorrectCharacters: 0 })).toBe(expected);
  });

  it('counts only the correct characters of the viewer, not the cursor', () => {
    expect(liveWpmOf(racer({ position: 50, isViewer: true }), { elapsedMs: 30_000, viewerCorrectCharacters: 40 })).toBe(16);
  });

  it('measures a finisher on their own finish time', () => {
    expect(liveWpmOf(racer({ position: 100, finishMs: 20_000 }), clock)).toBe(60);
  });

  it('has no value before the race clock runs or for a racer who left', () => {
    expect(liveWpmOf(racer({ position: 5 }), { elapsedMs: null, viewerCorrectCharacters: 0 })).toBeNull();
    expect(liveWpmOf(racer({ position: 5 }), { elapsedMs: -1_000, viewerCorrectCharacters: 0 })).toBeNull();
    expect(liveWpmOf(racer({ position: 50, abandoned: true }), clock)).toBeNull();
    expect(liveWpmOf(racer({ position: 50, inactive: true }), clock)).toBeNull();
  });
});
