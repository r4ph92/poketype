import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fr from '../../../messages/fr.json';
import { uniqueName } from './guests';
import { installRaceHarness, timer, typingArea } from './race';
import { newGuestPage, openRoomAsNewGuest, playerRows, roomPagePath, startRaceInDatabase } from './rooms';

export type TwoPlayerRace = { alexPage: Page; zoePage: Page; roomId: string; alex: string; zoe: string };

const raceOpensWithinMs = 8_000;

// Both browsers are real members; the race uses the fixed test passage so the typing is known in advance.
export async function startTwoPlayerRace(browser: Browser, page: Page, prepareZoe?: (context: BrowserContext) => Promise<void>): Promise<TwoPlayerRace> {
  const alex = uniqueName('Alex ');
  const zoe = uniqueName('Zoé ');
  await installRaceHarness(page.context());
  const roomId = await openRoomAsNewGuest(page, alex);
  const zoePage = await newGuestPage(browser, zoe, async (context) => {
    await installRaceHarness(context);
    await prepareZoe?.(context);
  });
  await zoePage.goto(roomPagePath(roomId));
  await expect(playerRows(page)).toHaveCount(2);
  await startRaceInDatabase(roomId, 2_500);
  for (const shown of [page, zoePage]) {
    await expect(timer(shown)).toHaveText(fr.Room.go, { timeout: raceOpensWithinMs });
    await expect(typingArea(shown)).toBeEditable();
  }
  return { alexPage: page, zoePage, roomId, alex, zoe };
}

export function racerRow(page: Page, trainerName: string) {
  return playerRows(page).filter({ hasText: trainerName });
}

export function percentText(percent: number): string {
  return fr.Room.progressPercent.replace('{percent}', String(percent));
}
