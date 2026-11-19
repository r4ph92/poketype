import { describe, expect, it } from 'vitest';
import { judgeProgressReport } from '../../src/domain/progress-report';

// QA #74: each test states the expected behaviour and fails while the defect it proves is present.
describe('QA #74 missed keys defects', () => {
  it('does not refuse a free-mode report the counters allow only because the server counted more keystrokes than the page', () => {
    const previous = { lastSequence: 909, position: 0, correctCharacters: 0, keystrokes: 3, rejectedKeystrokes: 3 };
    const missedPositions = Array.from({ length: 100 }, (_, index) => 49 + index);
    const report = { sequence: 910, position: 149, correctCharacters: 0, keystrokes: 149, rejectedKeystrokes: 149, missedPositions };
    expect(judgeProgressReport({ previous, report, passageLength: 149, elapsedSinceStartMs: 60_000, errorMode: 'free' })).toBe('accepted');
  });
});
