import { describe, expect, it } from 'vitest';
import { measureRacer } from '../../src/domain/race-results';
import { timelinePoints } from '../../src/domain/wpm-timeline';

// Both screens format WPM as a whole number, like formatWholeNumber.
const wholeNumber = new Intl.NumberFormat('fr', { maximumFractionDigits: 0 });

describe('the WPM chart ends on the results WPM', () => {
  it('shows the same whole WPM in the data table as in the results table when the frozen WPM ends in .45 to .49', () => {
    const stop = { stopMs: 8883, correctCharacters: 64 };
    const { grossWpm } = measureRacer({ typedCharacters: 64, keystrokes: 64, rejectedKeystrokes: 0, elapsedMs: stop.stopMs });
    const finalPoint = timelinePoints([], stop).at(-1)!;

    expect(wholeNumber.format(finalPoint.wpm)).toBe(wholeNumber.format(grossWpm));
  });
});
