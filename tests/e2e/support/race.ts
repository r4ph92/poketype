import type { BrowserContext, Page } from '@playwright/test';

export type TimerChange = { text: string; at: number };

export type RosterChange = { rows: string[]; at: number };

type RaceHarnessWindow = Window & { timerChanges: TimerChange[]; rosterChanges: RosterChange[]; typedLengths: number[]; trueEpochNow: () => number };

// Shifts only the wall clock, like a computer set to the wrong time; performance.now keeps running, so timers and polling behave normally.
// page.clock is not used because it also fakes timers and performance.now.
export async function installRaceHarness(context: BrowserContext, wallClockSkewMs = 0): Promise<void> {
  await context.addInitScript((skewMs: number) => {
    const harness = window as unknown as RaceHarnessWindow;
    const trueTimeOrigin = performance.timeOrigin;
    harness.trueEpochNow = () => trueTimeOrigin + performance.now();
    harness.timerChanges = [];
    harness.rosterChanges = [];
    harness.typedLengths = [];
    if (skewMs !== 0) {
      const RealDate = Date;
      window.Date = new Proxy(RealDate, {
        construct: (target, args) => (args.length === 0 ? new target(target.now() + skewMs) : Reflect.construct(target, args)),
        get: (target, property, receiver) => (property === 'now' ? () => target.now() + skewMs : Reflect.get(target, property, receiver)),
      });
      Object.defineProperty(performance, 'timeOrigin', { configurable: true, get: () => trueTimeOrigin + skewMs });
    }
    const recordTimerChange = () => {
      const text = document.querySelector('[role="timer"]')?.textContent ?? null;
      if (text !== null && harness.timerChanges.at(-1)?.text !== text) harness.timerChanges.push({ text, at: harness.trueEpochNow() });
    };
    const recordRosterChange = () => {
      const rows = Array.from(document.querySelectorAll('[aria-labelledby="players-heading"] li'), (row) => row.textContent ?? '');
      if (rows.join('\n') !== harness.rosterChanges.at(-1)?.rows.join('\n')) harness.rosterChanges.push({ rows, at: harness.trueEpochNow() });
    };
    const recordTypedLength = () => {
      const typed = document.querySelector('[data-state="typed"]');
      if (typed && harness.typedLengths.at(-1) !== typed.textContent?.length) harness.typedLengths.push(typed.textContent?.length ?? 0);
    };
    new MutationObserver(() => {
      recordTimerChange();
      recordRosterChange();
      recordTypedLength();
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, wallClockSkewMs);
}

export async function readTimerChanges(page: Page): Promise<TimerChange[]> {
  return page.evaluate(() => (window as unknown as RaceHarnessWindow).timerChanges);
}

export async function readRosterChanges(page: Page): Promise<RosterChange[]> {
  return page.evaluate(() => (window as unknown as RaceHarnessWindow).rosterChanges);
}

export async function readTypedLengths(page: Page): Promise<number[]> {
  return page.evaluate(() => (window as unknown as RaceHarnessWindow).typedLengths);
}

export async function readTrueEpochNow(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as RaceHarnessWindow).trueEpochNow());
}

export async function readWallClockSkew(page: Page): Promise<number> {
  return (await page.evaluate(() => Date.now())) - Date.now();
}

export function firstChangeTo(changes: TimerChange[], text: string): TimerChange | undefined {
  return changes.find((change) => change.text === text);
}

export const timer = (page: Page) => page.getByRole('timer');

export const typingArea = (page: Page) => page.locator('main').getByRole('textbox');

export const passageSegment = (page: Page, state: 'typed' | 'current' | 'rejected' | 'upcoming') => page.locator(`#passage-heading + p [data-state="${state}"]`);

export const editableElements = 'input:not([type=hidden]), textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]';

// Text nodes of the coloured passage are its typed part, the current character and the rest, so any prefix, suffix or character can show.
export function passageFragments(passage: string): string[] {
  const characters = Array.from(passage);
  const cuts = characters.map((_, index) => [characters.slice(0, index).join(''), characters.slice(index).join('')]).flat();
  return [passage, ...cuts, ...characters, '·'].map((fragment) => fragment.trim()).filter((fragment) => fragment.length > 0);
}
