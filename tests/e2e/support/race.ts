import type { BrowserContext, Page } from '@playwright/test';

export type TimerChange = { text: string; at: number };

type RaceHarnessWindow = Window & { timerChanges: TimerChange[]; trueEpochNow: () => number };

// Shifts only the wall clock, like a computer set to the wrong time; performance.now keeps running, so timers and polling behave normally.
// page.clock is not used because it also fakes timers and performance.now.
export async function installRaceHarness(context: BrowserContext, wallClockSkewMs = 0): Promise<void> {
  await context.addInitScript((skewMs: number) => {
    const harness = window as unknown as RaceHarnessWindow;
    const trueTimeOrigin = performance.timeOrigin;
    harness.trueEpochNow = () => trueTimeOrigin + performance.now();
    harness.timerChanges = [];
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
    new MutationObserver(recordTimerChange).observe(document, { subtree: true, childList: true, characterData: true });
  }, wallClockSkewMs);
}

export async function readTimerChanges(page: Page): Promise<TimerChange[]> {
  return page.evaluate(() => (window as unknown as RaceHarnessWindow).timerChanges);
}

export async function readWallClockSkew(page: Page): Promise<number> {
  return (await page.evaluate(() => Date.now())) - Date.now();
}

export function firstChangeTo(changes: TimerChange[], text: string): TimerChange | undefined {
  return changes.find((change) => change.text === text);
}

export const timer = (page: Page) => page.getByRole('timer');

export const editableElements = 'input:not([type=hidden]), textarea, select, [contenteditable]:not([contenteditable=false]), [role=textbox]';
