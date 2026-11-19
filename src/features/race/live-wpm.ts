import { measureRacer } from '@/domain/race-results';
import type { Racer } from './racers';

export type LiveWpmClock = { elapsedMs: number | null; viewerCorrectCharacters: number };

// The Annex A net WPM as the results compute it. A rival's snapshot carries no keystroke counters, so its accepted position stands for the correct characters.
// A finisher is measured on their own finish time, so the number stops moving once they cross the line.
export function liveWpmOf(racer: Racer, { elapsedMs, viewerCorrectCharacters }: LiveWpmClock): number | null {
  if (racer.isAbandoned || racer.isInactive) return null;
  const racerElapsedMs = racer.progress.finishMs ?? elapsedMs;
  if (racerElapsedMs === null || racerElapsedMs <= 0) return null;
  const typedCharacters = racer.isViewer ? viewerCorrectCharacters : racer.progress.position;
  return measureRacer({ typedCharacters, keystrokes: typedCharacters, rejectedKeystrokes: 0, elapsedMs: racerElapsedMs }).grossWpm;
}
